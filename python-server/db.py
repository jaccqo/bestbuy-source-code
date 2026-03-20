import os
from pathlib import Path
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import NullPool

# 1. Define the AppData path for the database
# This ensures data persists in C:\Users\UserName\AppData\Roaming\BestBuyScraperPro\
APPDATA_DIR = Path(os.getenv('APPDATA')) / "BestBuyScraperPro"
os.makedirs(APPDATA_DIR, exist_ok=True)

# 2. Set the absolute path to the SQLite DB file within AppData
DB_PATH = APPDATA_DIR / "app.db"
DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(
    DATABASE_URL,
    connect_args={
        "check_same_thread": False,
        "timeout": 30,  # Wait up to 30 seconds if locked
    },
    poolclass=NullPool,         # No connection pooling for SQLite
    pool_pre_ping=True,
    echo=False,
)

# === Enable WAL mode for high concurrency ===
# WAL mode is vital here so your polling doesn't block the scraper worker
with engine.begin() as conn:
    conn.execute(text("PRAGMA journal_mode=WAL;"))
    conn.execute(text("PRAGMA busy_timeout = 30000;"))
    conn.execute(text("PRAGMA foreign_keys = ON;"))

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    expire_on_commit=False,
)

Base = declarative_base()