# python-server/routers/scraper.py
import os
os.environ["PLAYWRIGHT_BROWSERS_PATH"] = os.path.join(os.environ.get("LOCALAPPDATA", os.path.expanduser("~\\AppData\\Local")), "ms-playwright")
from fastapi import APIRouter, HTTPException, BackgroundTasks
from datetime import datetime

from db import SessionLocal
from models import ScraperRun, UploadedFile, ScraperForensics, ScraperQueue
from utils.logging import write_log
from scrapers.engine import run_scraper_worker, run_single_sku_worker, active_scrapers # Import the registry
import pandas as pd
from sqlalchemy import func

router = APIRouter(tags=["scraper"])

@router.post("/run-scraper")
def run_scraper(background_tasks: BackgroundTasks):
    db = SessionLocal()
    try:
        # === 1. Check uploaded file ===
        uploaded = db.query(UploadedFile).order_by(UploadedFile.id.desc()).first()
        if not uploaded:
            raise HTTPException(status_code=400, detail="No SKUs file uploaded yet. Please upload a file before starting the scraper.")
        if (uploaded.sku_count or 0) <= 0:
            raise HTTPException(status_code=400, detail="Uploaded file has no SKUs. Please upload a valid file.")

        # === 2. Handle active run (include "preparing") ===
        active_run = db.query(ScraperRun).filter(
            ScraperRun.status.in_(["running", "stopping", "preparing"])
        ).order_by(ScraperRun.started_at.desc()).first()

        if active_run:
            if active_run.status in ("running", "preparing"):
                # Use the stop logic to ensure the browser is signaled
                stop_scraper() 
                return {"run_id": active_run.id, "status": "stopping"}
            elif active_run.status == "stopping":
                return {"run_id": active_run.id, "status": "stopping"}

        # === 3. Create new run in "preparing" state ===
        new_run = ScraperRun(
            started_at=datetime.utcnow(),
            status="preparing",     
            succeeded=0,
            failed=0,              
            last_processed_sku=None,  
        )
        db.add(new_run)
        db.commit()
        db.refresh(new_run)

        write_log(db, "INFO", f"New scraper run started (ID: {new_run.id}) - preparing browser")

        background_tasks.add_task(run_scraper_worker, new_run.id,False)

        return {
            "run_id": new_run.id,
            "status": "preparing",
            "message": "Preparing browser... First run may take 1-2 minutes to download Firefox."
        }

    except HTTPException:
        raise
    except Exception as e:
        write_log(db, "ERROR", f"Failed to start scraper: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to start scraper")
    finally:
        db.close()


@router.get("/scraper-status/{run_id}")
def scraper_status(run_id: str):
    db = SessionLocal()
    try:
        if run_id == "latest":
            run = db.query(ScraperRun).order_by(ScraperRun.id.desc()).first()
            if not run:
                raise HTTPException(status_code=404, detail="No scraper runs found")
            run_id = run.id
        else:
            run_id = int(run_id)

        run = db.query(ScraperRun).get(run_id)
        if not run:
            raise HTTPException(status_code=404, detail="Run not found")

        uploaded = db.query(UploadedFile).order_by(UploadedFile.id.desc()).first()
        if not uploaded:
            raise HTTPException(status_code=404, detail="Uploaded file not found")

        total_skus = uploaded.sku_count or 0

        cumulative = db.query(
            func.coalesce(func.sum(ScraperRun.succeeded), 0).label("total_succeeded"),
            func.coalesce(func.sum(ScraperRun.failed), 0).label("total_failed")
        ).first()

        total_succeeded = int(cumulative.total_succeeded)
        total_failed = int(cumulative.total_failed)
        total_processed = total_succeeded + total_failed
        total_remaining = max(total_skus - total_processed, 0)

        return {
            "status": run.status,
            "succeeded": total_succeeded,
            "failed": total_failed,
            "total": total_remaining,
            "sku_count": total_skus,
            "started_at": run.started_at.isoformat() if run.started_at else None,
            "finished_at": run.finished_at.isoformat() if run.finished_at else None,
            "error": run.error_message,
        }

    except HTTPException:
        raise
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid run_id format")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()


@router.post("/stop")
def stop_scraper():
    """
    Stops active runs, clears the pending queue, and reverts forensics to 'Failed'.
    """
    db = SessionLocal()
    try:
        # 1. Handle Active Scraper Runs
        active_runs = db.query(ScraperRun).filter(
            ScraperRun.status.in_(["preparing", "running"])
        ).all()

        for run in active_runs:
            run.status = "stopping"
            scraper_instance = active_scrapers.get(run.id)
            if scraper_instance:
                scraper_instance.request_cancel()
        
        # 2. CLEAR THE QUEUE: Wipe all pending items so next run starts fresh
        deleted_q_count = db.query(ScraperQueue).delete()
        
        # 3. REVERT FORENSICS: Set UI status back to 'Failed'
        queued_items = db.query(ScraperForensics).filter(
            ScraperForensics.status.in_(["Queued for Retry", "queued", "scraping", "Scraping"])
        ).all()
        
        revert_count = 0
        for item in queued_items:
            if item.status=="scraping" or item.status=="Scraping":
                item.status="cleaning"
            else:
                item.status = "Failed"

            revert_count += 1

        db.commit()
        
        write_log(db, "INFO", f"Stop requested. Cleared {deleted_q_count} queue items and reverted {revert_count} forensics.")

        return {
            "message": "Stop signal sent, queue cleared, and forensics reverted",
            "stopped_count": len(active_runs),
            "reverted_items": revert_count,
            "queue_cleared": deleted_q_count,
            "status": "stopping"
        }

    except Exception as e:
        db.rollback()
        write_log(db, "ERROR", f"Failed to stop scraper: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")
    finally:
        db.close()


@router.post("/force-stop")
def force_stop_scraper():
    """
    Immediately kills runs, wipes queue, and reverts forensic status.
    """
    db = SessionLocal()
    try:
        active_runs = db.query(ScraperRun).filter(
            ScraperRun.status.in_(["preparing", "running", "stopping"])
        ).all()

        now = datetime.utcnow()
        for run in active_runs:
            run.status = "stopped"
            run.finished_at = now
            scraper_instance = active_scrapers.get(run.id)
            if scraper_instance:
                scraper_instance.request_cancel()

        # 1. CLEAR THE QUEUE
        deleted_q_count = db.query(ScraperQueue).delete()

        # 2. REVERT FORENSICS
        queued_items = db.query(ScraperForensics).filter(
            ScraperForensics.status.in_(["Queued for Retry", "queued", "scraping", "Scraping"])
        ).all()
        
        for item in queued_items:
            if item.status=="scraping" or item.status=="Scraping":
                item.status="cleaning"
            else:
                item.status = "Failed"

        db.commit()

        return {
            "message": "Force stop completed, queue wiped, and forensics reverted",
            "forced_count": len(active_runs),
            "queue_cleared": deleted_q_count,
            "status": "stopped"
        }
    except Exception as e:
        db.rollback()
        write_log(db, "ERROR", f"Force stop failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")
    finally:
        db.close()

@router.post("/scrape-single")
def scrape_single_sku(payload: dict, background_tasks: BackgroundTasks):
    db = SessionLocal()
    try:
        sku = payload.get("sku")
        if not sku:
            raise HTTPException(status_code=400, detail="SKU is required")

        write_log(db, "INFO", f"Request received to scrape SKU: {sku}")

        # Check for any active main scraper run
        active_run = db.query(ScraperRun).filter(
            ScraperRun.status.in_(["running", "preparing"])
        ).order_by(ScraperRun.started_at.desc()).first()

        # 1. Update Forensic Status for the UI
        # We find the existing forensic record or create one if this is a brand new SKU
        forensic = db.query(ScraperForensics).filter_by(sku=sku).order_by(ScraperForensics.id.desc()).first()
        
        if active_run:
            # Main scraper is running → enqueue SKU
            queue_item = ScraperQueue(sku=sku, status="pending")
            db.add(queue_item)
            
            if forensic:
                forensic.status = "queued"
            
            db.commit()
            return {
                "status": "queued",
                "run_id": active_run.id,  # So the frontend context can track the existing run
                "sku": sku,
                "message": "Main scraper is running; SKU added to queue."
            }
        

        else:
            # No active scraper → Start a new single run
            single_run = ScraperRun(
                started_at=datetime.utcnow(),
                status="preparing",
                succeeded=0,
                failed=0,
                last_processed_sku=sku,
            )
            db.add(single_run)
            db.commit()
            db.refresh(single_run)

            if forensic:
                # Set to 'Scraping' since the background task is being launched immediately
                forensic.status = "Scraping"
                forensic.run_id = single_run.id # Link it to this specific run
            
            db.commit()

            # Launch the isolated background worker
            background_tasks.add_task(run_single_sku_worker, single_run.id, sku, None)

            return {
                "status": "started",
                "run_id": single_run.id,
                "message": "Starting isolated background scrape."
            }

    except Exception as e:
        db.rollback()
        write_log(db, "ERROR", f"Failed to process single SKU: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()


@router.post("/scrape-failed")
def scrape_failed(background_tasks: BackgroundTasks):
    db = SessionLocal()
    try:
        # 1. Identify Failed Items
        failed_items = db.query(ScraperForensics).filter(
            ScraperForensics.status.ilike("%failed%")
        ).all()

        if not failed_items:
            return {"count": 0, "mode": "idle", "message": "No failed SKUs found", "run_id": None}

        # Extract unique SKUs
        unique_failed_skus = list(set(item.sku for item in failed_items if item.sku))

        # 2. Check for an existing Active Run
        active_run = db.query(ScraperRun).filter(
            ScraperRun.status.in_(["running", "preparing", "scraping"])
        ).first()

        # 3. Clean and Update the Queue
        db.query(ScraperQueue).filter(
            ScraperQueue.sku.in_(unique_failed_skus)
        ).delete(synchronize_session=False)

        for sku_str in unique_failed_skus:
            db.add(ScraperQueue(sku=sku_str, status="pending"))
            db.query(ScraperForensics).filter_by(sku=sku_str).update({"status": "queued"})

        # 4. Handle the Global System State
        run_id_to_return = None
        if not active_run:
            new_run = ScraperRun(
                started_at=datetime.utcnow(),
                status="preparing",
                succeeded=0,
                failed=0
            )
            db.add(new_run)
            db.flush()  # Generate the ID
            run_id_to_return = new_run.id
            mode = "started_main"
            message = f"Initialized engine for {len(unique_failed_skus)} SKUs"
        else:
            run_id_to_return = active_run.id
            mode = "queued"
            message = f"Appended {len(unique_failed_skus)} SKUs to active session"

        db.commit()

        # 5. Trigger Background Worker
        if mode == "started_main":
            background_tasks.add_task(run_scraper_worker, run_id_to_return, True)

        # THE FIX: Return run_id so the frontend Context can pick it up
        return {
            "run_id": run_id_to_return,
            "count": len(unique_failed_skus),
            "mode": mode,
            "status": "running", 
            "message": message
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()