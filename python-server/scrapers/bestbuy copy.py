import asyncio
import os
import json
from typing import Optional, Dict, Callable
import random
import re

from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeout
from bs4 import BeautifulSoup

from curl_cffi.requests import AsyncSession


STORAGE_STATE_PATH = "bestbuy_storage.json"
HOMEPAGE = "https://www.bestbuy.com/?intl=nosplash"

class BestBuyScraper:
    def __init__(
        self,
        headless: bool = True,
        logger: Callable[[str, str], None] | None = None,
    ):
        self.headless = headless
        self.logger = logger or (lambda level, msg: print(f"[{level}] {msg}"))
        self.playwright = None
        self.browser = None
        self.context = None
        self.page = None
        self._cancel_requested = False

    def log(self, level: str, message: str):
        self.logger(level, message)

    def request_cancel(self):
        self._cancel_requested = True

    async def _check_cancel(self):
        if self._cancel_requested:
            self.log("WARNING", "Cancellation requested")
            raise asyncio.CancelledError()

    async def start(self):
        await self._check_cancel()
        print("\n[TRACE] Starting Playwright Engine")
        self.log("INFO", "Starting BestBuy scraper with Firefox")
        self.playwright = await async_playwright().start()

        args = ["--no-sandbox", "--disable-setuid-sandbox"]
        
        if self.headless:
            args.append("--headless=new")

        self.browser = await self.playwright.firefox.launch(
            headless=self.headless,
            args=args,
            # ADD THIS TO SPOOF REAL FIREFOX BEHAVIOR
            firefox_user_prefs={
                "dom.webdriver.enabled": False,
                "useAutomationExtension": False,
                "security.tls.version.min": 3 # Forces modern TLS
            }
        )

        self.context = await self.browser.new_context(
            storage_state=STORAGE_STATE_PATH if os.path.exists(STORAGE_STATE_PATH) else None,
            user_agent=self._random_user_agent(),
            locale="en-US",
            timezone_id="America/New_York",
            viewport={"width": 1366, "height": 768},
            # ADD THESE TWO LINES BELOW:
            ignore_https_errors=True, 
            java_script_enabled=True,
            permissions=["notifications"],
            extra_http_headers={
                "Accept-Language": "en-US,en;q=0.9",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
                "Upgrade-Insecure-Requests": "1"
            },
        )

        self.page = await self.context.new_page()
        print("[TRACE] Browser context created. Preparing homepage...")
        await self._open_homepage_and_prepare()

    def _random_user_agent(self):
        uas = [
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:132.0) Gecko/20100101 Firefox/132.0",
        ]
        return random.choice(uas)

    async def _open_homepage_and_prepare(self):
        await self._check_cancel()
        print("[TRACE 1] Entering _open_homepage_and_prepare")
        
        async def navigate():
            print(f"[TRACE 2] Navigating to {HOMEPAGE}")
            # CHANGED: 'domcontentloaded' is much more stable than 'networkidle'
            return await self.page.goto(HOMEPAGE, wait_until="domcontentloaded", timeout=60000)

        await self._retry_operation(navigate)
        print("[TRACE 3] Homepage reached. Waiting for human delay.")
        await self._human_delay(1.5, 3.0)
        await self._save_cookies()
        print("[TRACE 4] Preparation complete.")

    async def _retry_operation(self, operation: Callable, max_retries: int = 3, backoff: float = 2.0):
        await self._check_cancel()
        for attempt in range(max_retries):
            print(f"[TRACE] Retry Loop: Attempt {attempt+1}")
            try:
                # Critical Fix: Properly await if the operation is a coroutine/lambda
                res = operation()
                if asyncio.iscoroutine(res):
                    return await res
                return res
            except PlaywrightTimeout as e:
                print(f"[DEBUG] Timeout on attempt {attempt+1}")
                if attempt == max_retries - 1: raise
                await self._human_delay(backoff*(attempt+1), backoff*(attempt+1)*1.5)
            except Exception as e:
                print(f"[DEBUG] Error on attempt {attempt+1}: {type(e).__name__}")
                # If browser died, don't retry, just crash gracefully
                if self.browser and not self.browser.is_connected():
                    print("[CRITICAL] Browser disconnected. Aborting.")
                    raise
                if attempt == max_retries - 1: raise
                await self._human_delay(backoff*(attempt+1), backoff*(attempt+1)*1.5)

    async def _human_delay(self, min_sec: float, max_sec: float):
        await self._check_cancel()
        d = random.uniform(min_sec, max_sec)
        print(f"[TRACE] Sleeping {d:.2f}s")
        await asyncio.sleep(d)

    async def _save_cookies(self):
        await self._check_cancel()
        try:
            await self.context.storage_state(path=STORAGE_STATE_PATH)
            self.log("SUCCESS", "Cookies saved")
        except Exception as e:
            print(f"[DEBUG] Cookie save failed: {e}")

    async def _process_html_with_bs4(self, html_content: str) -> Dict:
        soup = BeautifulSoup(html_content, 'html.parser')
        
        # Initialize our data structure
        final_data = {
            "title": None,
            "price": None,
            "brand": None,
            "availability": "Unknown",
            "specs": {},
            "raw_schema": None  # <--- Saving the full JSON here
        }

        # 1. EXTRACT RAW SCHEMA (JSON-LD)
        scripts = soup.find_all("script", type="application/ld+json")
        for script in scripts:
            try:
                # We use script.get_text() instead of .string to be safer
                json_text = script.get_text()
                data = json.loads(json_text)
                
                # Best Buy can wrap the Product in an array or a @graph
                product_json = None
                if isinstance(data, list):
                    product_json = next((item for item in data if item.get("@type") == "Product"), None)
                elif data.get("@type") == "Product":
                    product_json = data
                
                if product_json:
                    final_data["raw_schema"] = product_json # Store the whole thing
                    final_data["title"] = product_json.get("name")
                    final_data["brand"] = product_json.get("brand", {}).get("name") if isinstance(product_json.get("brand"), dict) else product_json.get("brand")
                    
                    # Handle Offers
                    offer = product_json.get("offers", {})
                    if isinstance(offer, list): offer = offer[0]
                    final_data["price"] = float(offer.get("price")) if offer.get("price") else None
                    final_data["availability"] = offer.get("availability")
                    break 
            except Exception as e:
                continue

        # 2. EXTRACT SPECS (Visual Table)
        # This catches things NOT in the schema (like "Color Category" or "Material")
        spec_rows = soup.find_all("div", class_=re.compile("specs-table-row"))
        for row in spec_rows:
            try:
                key_tag = row.find("div", class_=re.compile("specs-table-heading"))
                val_tag = row.find("div", class_=re.compile("specs-table-value"))
                if key_tag and val_tag:
                    final_data["specs"][key_tag.get_text(strip=True)] = val_tag.get_text(strip=True)
            except:
                continue

        return final_data

    async def scrape_single_sku(self, sku: str) -> Dict:
        await self._check_cancel()
        print(f"\n[TRACE] STARTING SKU: {sku}")
        self.log("INFO", f"Scraping SKU: {sku}")

        # 1. Search remains in Playwright to handle the dynamic search bar
        await self._search_sku(sku)
        
        # 2. This function now finds the link AND fetches HTML via curl_cffi
        if not await self._open_single_search_result_or_abort(sku):
            print(f"[TRACE] SKU {sku} - Not found or multiple results.")
            await self._return_to_clean_state()
            return {"sku": sku, "status": "multiple_results_or_not_found"}

        print("[TRACE] HTML Captured. Processing with BeautifulSoup...")
        
        # 3. Process the captured HTML locally
        processed_data = await self._process_html_with_bs4(self.last_fetched_html)

        # 4. Cleanup Playwright session for the next run
        await self._return_to_clean_state()

        if not processed_data.get("title"):
            print("[DEBUG] Data extraction failed (Title missing).")
            return {"sku": sku, "status": "extraction_failed"}

        return {
            "status": "success",
            "sku": sku,
            "title": processed_data["title"],
            "price": processed_data["price"],
            "availability": processed_data["availability"],
            "brand": processed_data["brand"],
            "extra_specifications": processed_data["specs"],
        }

    async def _search_sku(self, sku: str):
        async def do_search():
            print(f"[TRACE] Searching for SKU: {sku}")
            
            # Using the specific data-testid from the HTML you found
            search_selector = "textarea[data-testid='SearchBarExtendable-TestID']"
            
            # 1. Wait for it to exist
            search_bar = self.page.locator(search_selector)
            await search_bar.wait_for(state="visible", timeout=20000)
            
            # 2. Click it first to clear any overlays/focus issues
            await search_bar.click()
            await self._human_delay(0.2, 0.5)
            
            # 3. Clear and Fill
            await search_bar.fill("") # Clear just in case
            await search_bar.fill(sku)
            
            print(f"[TRACE] SKU {sku} filled, pressing Enter")
            
            # 4. Press Enter and wait for the page to pivot
            await search_bar.press("Enter")
            
            # Wait for the URL to change or the product list to appear
            return await self.page.wait_for_load_state("domcontentloaded", timeout=30000)

        await self._retry_operation(do_search)
     
     # Add this to your class __init__ or helper section
    async def _fetch_with_stealth(self, url: str):
        async with AsyncSession() as s:
            # We try Safari first, then Chrome as a fallback
            profiles = ["safari15_5", "chrome110"]
            
            for profile in profiles:
                try:
                    print(f"[TRACE] Fetching with {profile} profile: {url}")
                    
                    response = await s.get(
                        url, 
                        impersonate=profile,
                        timeout=30,
                        # This is where we force the HTTP version to avoid Stream Errors
                        http_version=1, # 1 means HTTP/1.1, 2 means HTTP/2
                        headers={
                            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                            "Accept-Language": "en-US,en;q=0.9",
                            "Upgrade-Insecure-Requests": "1"
                        }
                    )
                    
                    if response.status_code == 200:
                        return response.text
                    
                    print(f"[DEBUG] {profile} returned status {response.status_code}. Trying next...")
                    
                except Exception as e:
                    print(f"[DEBUG] {profile} failed with error: {e}")
                    continue # Move to the next profile (Chrome)
            
            return None
    # Updated function
    async def _open_single_search_result_or_abort(self, sku: str) -> bool:
        await self._check_cancel()
        try:
            # 1. Use Playwright to find the result (it handles the JS search bar well)
            result_selector = "#main-results li.product-list-item"
            await self.page.wait_for_selector(result_selector, timeout=15000)
            
            items = await self.page.locator(result_selector).all()
            if len(items) != 1: return False

            target_link = items[0].locator("a.product-list-item-link").first
            href = await target_link.get_attribute("href")
            
            if not href: return False
            if href.startswith("/"):
                href = f"https://www.bestbuy.com{href}"

            # 2. HANDOVER TO CURL_CFFI
            print(f"[TRACE] Handing over to curl_cffi for {sku}")
            html_content = await self._fetch_with_stealth(href)

            if html_content:
                # 3. Store the HTML in the class so your extractor can use it
                # Instead of using self.page.content(), your extractor should check this:
                self.last_fetched_html = html_content
                self.current_url = href 
                print(f"[SUCCESS] HTML captured for {sku} via Stealth Handover")
                return True
            
            return False

        except Exception as e:
            print(f"[ERROR] Handover failed: {e}")
            return False
        
    async def _get_product_schema(self) -> Optional[dict]:
        try:
            html = await self.page.content()
            soup = BeautifulSoup(html, "html.parser")
            scripts = soup.find_all("script", type="application/ld+json")
            for script in scripts:
                if not script.string: continue
                data = json.loads(script.string.strip())
                items = data if isinstance(data, list) else [data]
                for item in items:
                    if item.get("@type") == "Product": return item
        except:
            pass
        return None

    async def _return_to_clean_state(self):
        print("[TRACE] Returning to clean state (Home)")
        await self.page.goto(HOMEPAGE, wait_until="commit", timeout=30000)

    def _normalize_availability(self, value: Optional[str]) -> str:
        if not value: return "unknown"
        v = value.lower()
        if "instock" in v: return "in_stock"
        if "outofstock" in v: return "out_of_stock"
        return "unknown"

    async def stop(self):
        print("[TRACE] Cleaning up browser...")
        try:
            if self.browser: await self.browser.close()
            if self.playwright: await self.playwright.stop()
        except: pass