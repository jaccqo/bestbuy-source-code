import os
import time
import random
import pandas as pd
from datetime import datetime, date
from sqlalchemy.exc import IntegrityError

from db import SessionLocal
from models import (
    ScraperRun,
    UploadedFile,
    ScraperDailyStat,
    ScrapedItem,
    ScraperSettings,
    HandleDataSettings,
    ScraperForensics,
    ScraperQueue
)
from utils.logging import write_log
from utils.ensure_browser import ensure_firefox_installed

from scrapers.async_runner import AsyncRunner
from scrapers.bestbuy import BestBuyScraper
from scrapers.sheet_handler import load_sheet, update_sheet_row
from .globals import active_scrapers

_async_runner = AsyncRunner()


def make_logger(db):
    def _log(level: str, message: str):
        write_log(db, level, message)
    return _log


def normalize_sku(sku: str) -> str:
    return str(sku).strip()


def normalize_text(value):
    return str(value).strip() if value is not None else None


def normalize_price(value):
    try:
        return float(value)
    except Exception:
        return None


def get_resume_sku(db, current_run_id: int) -> str | None:
    prev = (
        db.query(ScraperRun)
        .filter(
            ScraperRun.id != current_run_id,
            ScraperRun.last_processed_sku.isnot(None),
            ScraperRun.status.in_(("success", "stopped")),
        )
        .order_by(ScraperRun.finished_at.desc())
        .first()
    )
    return prev.last_processed_sku if prev else None


def run_scraper_worker(run_id: int, is_retry: bool = False):
    db = SessionLocal()
    run = None
    scraper: BestBuyScraper | None = None
    logger = make_logger(db)

    try:
        run = db.query(ScraperRun).get(run_id)
        if not run:
            return

        run.status = "preparing"
        db.commit()
        write_log(db, "INFO", f"Preparing browser environment (Retry Mode: {is_retry})...")

        if not ensure_firefox_installed(db):
            run.status = "error"
            run.error_message = "Failed to prepare Firefox"
            db.commit()
            return

        run.status = "running"
        db.commit()
        write_log(db, "INFO", "Browser ready — starting scraping")

        # --- Load Settings ---
        scraper_settings = db.query(ScraperSettings).first()
        handle_data = db.query(HandleDataSettings).first()

        headless = bool(scraper_settings.headless) if scraper_settings else True
        resume_enabled = bool(scraper_settings.resume_sku) if scraper_settings else True
        update_original = bool(handle_data.update_original) if handle_data else False

        # Initialize loop variables
        skus_to_scrape = []
        sheet_df, sheet_sku_col, updatable_columns = None, None, None
        uploaded = None
        start_index = 0

        # --- 1. LOAD FILE DATA (SKIP IF IS_RETRY IS TRUE) ---
        if not is_retry:
            uploaded = db.query(UploadedFile).order_by(UploadedFile.id.desc()).first()
            if not uploaded or not os.path.exists(uploaded.filepath):
                raise RuntimeError("Uploaded Excel file not found")

            df = pd.read_excel(uploaded.filepath)
            if df.empty:
                raise RuntimeError("Uploaded Excel is empty")

            sku_column = df.columns[0]
            all_skus = (
                df[sku_column]
                .dropna()
                .astype(str)
                .map(normalize_sku)
                .loc[lambda s: s.str.lower().ne("nan")]
                .tolist()
            )

            # Resume Logic
            resume_from = run.last_processed_sku or (get_resume_sku(db, run.id) if resume_enabled else None)
            start_index = all_skus.index(resume_from) + 1 if resume_from in all_skus else 0
            skus_to_scrape = all_skus[start_index:]

            sheet_df, sheet_sku_col, updatable_columns = load_sheet(
                db=db,
                uploaded=uploaded,
                sku_column=sku_column,
                update_original=update_original,
            )

        # Stats Initialization
        today = date.today()
        daily = db.query(ScraperDailyStat).filter_by(date=today).first()
        if not daily:
            daily = ScraperDailyStat(date=today, succeeded=0, failed=0)
            db.add(daily)
            db.commit()

        # Initialize and Start Scraper Instance
        scraper = BestBuyScraper(headless=headless, logger=logger)
        _async_runner.run(scraper.start())

        MAX_RETRIES = 3

        # --- 2. MAIN FILE LOOP (SKIPPED IF IS_RETRY IS TRUE) ---
        if not is_retry:
            for idx, sku in enumerate(skus_to_scrape, start=start_index + 1):
                db.refresh(run)

                # Global Stop Check
                if run.status in ("stopping", "stopped"):
                    scraper.request_cancel()
                    run.status = "stopped"
                    run.finished_at = datetime.utcnow()
                    db.commit()
                    write_log(db, "INFO", "Scraper stopped by user")
                    return
                
                # --- Forensics Log ---
                forensics_entry = db.query(ScraperForensics).filter_by(sku=sku, run_id=run_id).order_by(ScraperForensics.id.desc()).first()
                if forensics_entry:
                    forensics_entry.status = "Scraping"
                    forensics_entry.scraped_at = datetime.utcnow()
                else:
                    forensics_entry = ScraperForensics(sku=sku, run_id=run_id, status="Scraping", scraped_at=datetime.utcnow())
                    db.add(forensics_entry)
                db.commit()

                attempt = 0
                result = None

                # --- Retry Loop ---
                while attempt < MAX_RETRIES:
                    db.refresh(run)
                    if run.status in ("stopping", "stopped"):
                        scraper.request_cancel()
                        run.status = "stopped"
                        run.finished_at = datetime.utcnow()
                        db.commit()
                        return

                    attempt += 1
                    if attempt > 1:
                        logger("INFO", f"Retry {attempt}/{MAX_RETRIES} for SKU {sku}")

                    try:
                        result = _async_runner.run(scraper.scrape_single_sku(sku))
                        if result and result.get("status") in ["multiple_results_or_not_found", "extraction_failed"]:
                            logger("WARNING", f"SKU {sku} resulted in {result.get('status')}. Stopping retries.")
                            break 
                        if result and result.get("status") == "success":
                            logger("SUCCESS", f"SKU {sku} scraped successfully")
                            break
                    except Exception as e:
                        logger("ERROR", f"Crash scraping SKU {sku} (attempt {attempt}): {e}")

                    time.sleep(1.5)

                # --- Finalize Forensics & Save Results ---
                is_success = result is not None and result.get("status") == "success"
                forensics_entry.status = "Success" if is_success else "Failed"
                forensics_entry.error_details = result.get("error") if result and not is_success else (None if is_success else "Max retries reached")

                if is_success:
                    forensics_entry.title = normalize_text(result.get("title"))
                    forensics_entry.price = normalize_price(result.get("price"))
                    forensics_entry.brand = normalize_text(result.get("brand"))
                    forensics_entry.source_url = normalize_text(result.get("source_url"))

                    normalized = {
                        "sku": normalize_sku(result.get("sku")),
                        "title": normalize_text(result.get("title")),
                        "price": normalize_price(result.get("price")),
                        "availability": normalize_text(result.get("availability")),
                        "brand": normalize_text(result.get("brand")),
                        "model": normalize_text(result.get("model")),
                        "url": normalize_text(result.get("url")),
                        "image": normalize_text(result.get("image")),
                        "source_url": normalize_text(result.get("source_url")),
                        "extra_specifications": result.get("specs", {}),
                        "raw_schema": result.get("raw_schema"),
                    }

                    item = db.query(ScrapedItem).filter_by(sku=normalized["sku"]).first()
                    if item:
                        for k, v in normalized.items(): setattr(item, k, v)
                    else:
                        db.add(ScrapedItem(**normalized))

                    daily.succeeded += 1
                    run.succeeded = (run.succeeded or 0) + 1

                    update_sheet_row(db=db, sheet_df=sheet_df, sheet_sku_col=sheet_sku_col, updatable_columns=updatable_columns, sku=sku, result=normalized)
                else:
                    daily.failed += 1
                    run.failed = (run.failed or 0) + 1

                run.last_processed_sku = sku
                db.commit()

                # Save file periodically
                if sheet_df is not None and uploaded and uploaded.local_filepath:
                    sheet_df.to_excel(uploaded.local_filepath, index=False)

                time.sleep(random.uniform(2.0, 3.0))

                # Quick check for high-priority queue items during main run
                queued = db.query(ScraperQueue).filter_by(status="pending").first()
                if queued:
                    queued.status = "running"
                    db.commit()
                    run_single_sku_worker(run.id, queued.sku, scraper)
                    queued.status = "done"
                    db.commit()

        # --- 3. QUEUE DRAIN (THE "RETRY" ENGINE) ---
        # This handles everything in the ScraperQueue, whether we skipped the main loop or just finished it
        write_log(db, "INFO", "Draining remaining scraper queue...")
        while True:
            db.refresh(run)
            if run.status in ("stopping", "stopped"):
                break

            # Find the next pending item
            queued = db.query(ScraperQueue).filter_by(status="pending").first()
            if not queued:
                break

            try:
                # Mark as running immediately and commit to "lock" it
                queued.status = "running"
                db.commit()
                
                # Process the SKU
                run_single_sku_worker(run.id, queued.sku, scraper)

                # Re-fetch to avoid StaleDataError before marking done
                db.refresh(queued)
                queued.status = "done"
                db.commit()
            except Exception as e:
                db.rollback()
                write_log(db, "ERROR", f"Queue processing failed for SKU: {e}")
                # Prevent infinite loops if a specific row is broken
                break

        # Final Cleanup
        run.status = "success"
        run.finished_at = datetime.utcnow()
        db.commit()

    except Exception as e:
        if run:
            run.status = "error"
            run.error_message = str(e)
            run.finished_at = datetime.utcnow()
            db.commit()
        write_log(db, "ERROR", f"Scraper crashed: {e}")

    finally:
        if scraper:
            try:
                _async_runner.run(scraper.stop())
            except Exception as e:
                write_log(db, "ERROR", f"Graceful stop failed: {e}")
        db.close()


def run_single_sku_worker(run_id: int, sku: str, scraper: BestBuyScraper = None):
    db = SessionLocal()
    local_scraper = False
    
    try:
        run = db.query(ScraperRun).get(run_id)
        if not run:
            return

        # 1. HANDLE SCRAPER INITIALIZATION
        if scraper is None:
            logger = make_logger(db)

            run.status = "preparing"
            db.commit()
            write_log(db, "INFO", f"Preparing browser environment for Single Scrape...")

            if not ensure_firefox_installed(db):
                run.status = "error"
                run.error_message = "Failed to prepare Firefox"
                db.commit()
                return

            run.status = "running"
            db.commit()
            write_log(db, "INFO", "Browser ready — starting scraping")


            scraper_settings = db.query(ScraperSettings).first()
            headless = bool(scraper_settings.headless) if scraper_settings else True
            
            scraper = BestBuyScraper(headless=headless, logger=logger)
            _async_runner.run(scraper.start())
            local_scraper = True 
            active_scrapers[run_id] = scraper

        # 2. DATA SETUP & DEDUPLICATION (The Fix)
        handle_data = db.query(HandleDataSettings).first()
        update_original = bool(handle_data.update_original) if handle_data else False
        uploaded = db.query(UploadedFile).order_by(UploadedFile.id.desc()).first()

        sheet_df, sheet_sku_col, updatable_columns = None, None, None
        if update_original and uploaded:
            sheet_df, sheet_sku_col, updatable_columns = load_sheet(
                db=db, 
                uploaded=uploaded, 
                sku_column=None, 
                update_original=update_original,
            )

        # --- DEDUPLICATION LOGIC ---
        # Find all existing forensics for this SKU
        existing_forensics = db.query(ScraperForensics).filter_by(sku=sku).all()
        
        if len(existing_forensics) > 0:
            # We keep the FIRST one found and delete any others (ghosts)
            forensic = existing_forensics[0]
            if len(existing_forensics) > 1:
                for extra in existing_forensics[1:]:
                    db.delete(extra)
                db.commit()
            
            # Update the existing record to the new Run state
            forensic.run_id = run_id
            forensic.status = "Scraping"
            forensic.error_details = None # Clear old errors
            forensic.scraped_at = datetime.utcnow()
        else:
            # Create fresh if it never existed
            forensic = ScraperForensics(
                sku=sku, 
                run_id=run_id, 
                status="Scraping", 
                scraped_at=datetime.utcnow()
            )
            db.add(forensic)
        
        db.commit()
        print(f"UI Updated: SKU {sku} is now 'Scraping' (Run {run_id})")

        # 3. SCRAPE EXECUTION WITH RETRIES
        MAX_RETRIES = 3
        attempt = 0
        result = None

        while attempt < MAX_RETRIES:
            db.refresh(run)
            
            if run.status in ("stopping", "stopped"):
                scraper.request_cancel()
                write_log(db, "INFO", f"Stop signal acknowledged for SKU {sku}")
                return

            attempt += 1
            if attempt > 1:
                write_log(db, "INFO", f"Retry {attempt}/{MAX_RETRIES} for SKU {sku}")

            try:
                result = _async_runner.run(scraper.scrape_single_sku(sku))
                
                if result and result.get("status") in ["multiple_results_or_not_found", "extraction_failed"]:
                    write_log(db, "WARNING", f"SKU {sku} failed with {result.get('status')}. Skipping retries.")
                    break

                if result and result.get("status") == "success":
                    break

            except Exception as e:
                write_log(db, "ERROR", f"[Single Worker] Crash on SKU {sku} (attempt {attempt}): {e}")

            time.sleep(1.5)

        # 4. PROCESS FINAL RESULTS
        is_success = result is not None and result.get("status") == "success"
        
        # Update Forensics Status
        forensic.status = "Success" if is_success else "Failed"
        forensic.error_details = (
            result.get("error") if (result and not is_success) 
            else (None if is_success else "Max retries reached")
        )

        if is_success:
            # Update forensics meta
            forensic.title = normalize_text(result.get("title"))
            forensic.price = normalize_price(result.get("price"))
            forensic.brand = normalize_text(result.get("brand"))
            forensic.source_url = normalize_text(result.get("source_url"))

            # Update/Create ScrapedItem (The "Long Term" storage)
            normalized = {
                "sku": normalize_sku(result.get("sku")),
                "title": normalize_text(result.get("title")),
                "price": normalize_price(result.get("price")),
                "availability": normalize_text(result.get("availability")),
                "brand": normalize_text(result.get("brand")),
                "model": normalize_text(result.get("model")),
                "url": normalize_text(result.get("url")),
                "image": normalize_text(result.get("image")),
                "source_url": normalize_text(result.get("source_url")),
                "extra_specifications": result.get("specs", {}),
                "raw_schema": result.get("raw_schema"),
            }

            item = db.query(ScrapedItem).filter_by(sku=normalized["sku"]).first()
            if item:
                for k, v in normalized.items():
                    setattr(item, k, v)
            else:
                db.add(ScrapedItem(**normalized))

            # Update Excel Sheet
            if sheet_df is not None:
                update_sheet_row(
                    db=db, 
                    sheet_df=sheet_df, 
                    sheet_sku_col=sheet_sku_col, 
                    updatable_columns=updatable_columns, 
                    sku=sku, 
                    result=normalized
                )
                if uploaded and uploaded.local_filepath:
                    sheet_df.to_excel(uploaded.local_filepath, index=False)
            
            run.succeeded = (run.succeeded or 0) + 1
        else:
            run.failed = (run.failed or 0) + 1

        # Finalize Run Status if standalone
        if local_scraper:
            run.status = "success" if is_success else "error"
            if not is_success:
                run.error_message = forensic.error_details
            run.finished_at = datetime.utcnow()

        db.commit()

    except Exception as e:
        db.rollback()
        write_log(db, "ERROR", f"[Single Worker Critical Crash] {str(e)}")
        if run:
            run.status = "error"
            run.error_message = str(e)
            db.commit()

    finally:
        if local_scraper:
            active_scrapers.pop(run_id, None)
            if scraper:
                try:
                    _async_runner.run(scraper.stop())
                except Exception as e:
                    write_log(db, "ERROR", f"Failed to stop browser: {e}")
        
        db.close()