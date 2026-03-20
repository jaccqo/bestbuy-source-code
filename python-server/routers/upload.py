# routers/upload.py
import os
import uuid
import json
import pandas as pd
from fastapi import APIRouter, UploadFile, File, HTTPException

from db import SessionLocal
from models import UploadedFile
from utils.logging import write_log
from fastapi import APIRouter, UploadFile, File, Form, HTTPException

from pathlib import Path

router = APIRouter(tags=["upload"])

# Defines the AppData path for your specific app
# This creates: C:\Users\UserName\AppData\Roaming\BestBuyScraperPro\uploads
APPDATA_PATH = Path(os.getenv('APPDATA')) / "BestBuyScraperPro"
UPLOAD_DIR = APPDATA_PATH / "uploads"

# Create the directories if they don't exist
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/upload")
async def upload(file: UploadFile = File(...), local_path: str = Form(None)):
    db = SessionLocal()
    try:
        # Clear previous uploads
        for prev in db.query(UploadedFile).all():
            if os.path.exists(prev.filepath):
                os.remove(prev.filepath)
            db.delete(prev)
        db.commit()

        path = os.path.join(
            UPLOAD_DIR,
            f"{uuid.uuid4()}{os.path.splitext(file.filename)[1]}",
        )

        # Save uploaded file
        with open(path, "wb") as f:
            f.write(await file.read())

        df = pd.read_excel(path)
        df.columns = df.columns.str.upper()

        if "SKU" not in df.columns:
            raise HTTPException(400, "Spreadsheet must contain SKU column")

        record = UploadedFile(
            filename=file.filename,
            filepath=path,
            local_filepath=local_path,  # store client path
            sku_count=df["SKU"].nunique(),
            column_count=len(df.columns),
            column_names=json.dumps(df.columns.tolist()),
        )

        db.add(record)
        db.commit()
        db.refresh(record)

        write_log(db, "SUCCESS", f"Uploaded file {file.filename}")

        return {
            "filename": record.filename,
            "filepath": record.filepath,  # server-side path
            "local_filepath": record.local_filepath,  # client-side path
            "sku_count": record.sku_count,
            "column_count": record.column_count,
            "column_names": json.loads(record.column_names),
        }
    finally:
        db.close()


@router.get("/current-upload")
def get_current_upload():
    db = SessionLocal()
    try:
        current = db.query(UploadedFile).order_by(UploadedFile.id.desc()).first()
        if not current:
            raise HTTPException(404, "No upload found")

        return {
            "filename": current.filename,
            "filepath": current.filepath,
            "local_filepath": current.local_filepath,
            "sku_count": current.sku_count,
            "column_count": current.column_count,
            "column_names": json.loads(current.column_names),
        }
    finally:
        db.close()


@router.delete("/current-upload")
def delete_current_upload():
    db = SessionLocal()
    try:
        current = db.query(UploadedFile).order_by(UploadedFile.id.desc()).first()
        if not current:
            raise HTTPException(404, "No upload to delete")

        if os.path.exists(current.filepath):
            os.remove(current.filepath)

        db.delete(current)
        db.commit()

        write_log(db, "INFO", "Uploaded sheet deleted")

        return {"message": "Upload deleted successfully"}
    finally:
        db.close()
