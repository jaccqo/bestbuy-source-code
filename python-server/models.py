# models.py
from sqlalchemy import Column, Integer, String, Date, DateTime, Float
from db import Base
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Boolean, Index
from sqlalchemy.sql import func
from datetime import datetime

from sqlalchemy import JSON



class UploadedFile(Base):
    __tablename__ = "uploaded_files"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)

    # Server-side stored file path (used in existing logic)
    filepath = Column(String, nullable=False)

    # Local file path from user's machine (Tauri)
    local_filepath = Column(String, nullable=True)

    sku_count = Column(Integer, nullable=False)
    column_count = Column(Integer, nullable=False)
    column_names = Column(String, nullable=False)



class ScraperSettings(Base):
    __tablename__ = "scraper_settings"
    id = Column(Integer, primary_key=True, index=True)
    headless = Column(Integer, default=1)
    resume_sku = Column(Integer, default=1)


class ScraperDailyStat(Base):
    __tablename__ = "scraper_daily_stats"
    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, unique=True, nullable=False)
    succeeded = Column(Integer, default=0)
    failed = Column(Integer, default=0)


class ScraperRun(Base):
    __tablename__ = "scraper_runs"

    id = Column(Integer, primary_key=True, index=True)
    started_at = Column(DateTime, nullable=False)
    finished_at = Column(DateTime)

    status = Column(String, nullable=False)

    succeeded = Column(Integer, default=0)
    failed = Column(Integer, default=0)
    last_processed_sku = Column(String, nullable=True)

    error_message = Column(String)




class ScraperLog(Base):
    __tablename__ = "scraper_logs"
    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime, nullable=False)
    level = Column(String, nullable=False)
    message = Column(String, nullable=False)


class ScrapedItem(Base):
    __tablename__ = "scraped_items"

    id = Column(Integer, primary_key=True, index=True)

    sku = Column(String(100), unique=True, index=True, nullable=False)

    title = Column(String(500), nullable=True)
    price = Column(Float, nullable=True)
    availability = Column(String(50), index=True, nullable=True)

    brand = Column(String(200), index=True, nullable=True)
    model = Column(String(200), nullable=True)
    url = Column(Text, nullable=True)
    image = Column(Text, nullable=True)

    description = Column(Text, nullable=True)
    category = Column(String(300), nullable=True)
    currency = Column(String(3), default="USD", nullable=False)

    # NEW: Nested extra specifications (Dimensions, Warranty, etc.)
    extra_specifications = Column(JSON, nullable=True, default=dict)

    raw_schema = Column(JSON, nullable=True)
    
    
    source_url = Column(Text, nullable=True)

    scraped_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        index=True,
        nullable=False,
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    is_active = Column(Boolean, default=True, nullable=False)

class HandleDataSettings(Base):
    __tablename__ = "handle_data_settings"

    id = Column(Integer, primary_key=True, index=True)

    # all | in_stock | out_of_stock
    filter = Column(String(50), nullable=False, default="all")

    # whether to update original uploaded sheet
    update_original = Column(Boolean, default=False, nullable=False)

    # timestamps (optional but good practice)
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

class LicenseKey(Base):
    __tablename__ = "license_keys"

    id = Column(Integer, primary_key=True, index=True)
    license_key = Column(String(255), unique=True, nullable=False, index=True)
    
    # Optional: track when it was activated
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class ScraperForensics(Base):
    __tablename__ = "scraper_forensics"

    id = Column(Integer, primary_key=True, index=True)
    sku = Column(String(100), index=True, nullable=False)
    title = Column(String(500), nullable=True)
    price = Column(Float, nullable=True)
    brand = Column(String(200), nullable=True)
    
    # "Success" or "Failed"
    status = Column(String(50), nullable=False, index=True)
    
    # Store the error message if it failed (e.g., "404 Not Found", "Proxy Timeout")
    error_details = Column(Text, nullable=True)
    
    source_url = Column(Text, nullable=True)
    scraped_at = Column(DateTime(timezone=True), server_default=func.now())

    # Optional: Link to a specific ScraperRun if you want to group them
    run_id = Column(Integer, index=True, nullable=True)

    
class ScraperQueue(Base):
    __tablename__ = "scraper_queue"

    id = Column(Integer, primary_key=True, index=True)
    sku = Column(String(100), index=True, nullable=False)

    # pending | running | done | failed
    status = Column(String(50), default="pending", index=True)

    run_id = Column(Integer, nullable=True)  # optional: link to ScraperRun

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())