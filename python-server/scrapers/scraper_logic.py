import time
from typing import Callable
from scrapers.async_runner import AsyncRunner
from scrapers.bestbuy import scrape_sku

_async_runner = AsyncRunner()


def scrape_sku_with_retry(
    sku: str,
    max_retries: int,
    headless: bool,
    should_stop: Callable[[], bool],
    logger,
):
    for attempt in range(1, max_retries + 1):
        if should_stop():
            return None

        try:
            result = _async_runner.run(
                scrape_sku(sku=sku, headless=headless, logger=logger)
            )
            if result:
                return result
        except Exception as e:
            logger("ERROR", f"Scrape crash SKU {sku}: {e}")

        time.sleep(5)

    return None
