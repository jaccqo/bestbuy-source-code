import os
os.environ["MPLBACKEND"] = "Agg"

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from db import engine, Base, SessionLocal
from models import ScraperSettings
from routers import (
    logs,
    upload,
    scraper,
    settings,
    stats,
    export,
    handle_data_settings,
    meta,
    product_activation,
    forensics
    
)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create tables
Base.metadata.create_all(bind=engine)

# Seed settings
with SessionLocal() as db:
    if not db.query(ScraperSettings).first():
        db.add(ScraperSettings())
        db.commit()

# Register routers
app.include_router(logs)
app.include_router(upload)
app.include_router(scraper)
app.include_router(settings)
app.include_router(stats)
app.include_router(export)
app.include_router(handle_data_settings)
app.include_router(meta)
app.include_router(product_activation)
app.include_router(forensics)