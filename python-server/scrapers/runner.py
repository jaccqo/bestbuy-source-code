import random
import time
from datetime import datetime
from sqlalchemy.exc import IntegrityError

from scrapers.scraper_logic import scrape_sku_with_retry
from scrapers.sheet_handler import update_sheet_row
from scrapers.db_ops import upsert_scraped_item
from utils.logging import write_log


def run_loop(
    db,
    run,
    skus,
    daily,
    sheet_df,
    sheet_sku_col,
    updatable_columns,
    headless,
    logger,
):
    for idx, sku in enumerate(skus):
        db.refresh(run)
        if run.status in ("stopping", "stopped"):
            run.status = "stopped"
            run.finished_at = datetime.utcnow()
            db.commit()
            return

        result = scrape_sku_with_retry(
            sku=sku,
            max_retries=3,
            headless=headless,
            should_stop=lambda: run.status in ("stopping", "stopped"),
            logger=logger,
        )

        try:
            if result and all(k in result for k in ("sku", "title", "price")):
                upsert_scraped_item(db, result)
                update_sheet_row(
                    db,
                    sheet_df,
                    sheet_sku_col,
                    updatable_columns,
                    sku,
                    result,
                )

                daily.succeeded += 1
                run.succeeded = (run.succeeded or 0) + 1
            else:
                daily.failed += 1
                run.failed = (run.failed or 0) + 1

            run.last_processed_sku = sku
            db.commit()

        except IntegrityError as e:
            db.rollback()
            write_log(db, "ERROR", f"DB integrity error SKU {sku}: {e}")

        time.sleep(random.uniform(2.0, 3.0))
