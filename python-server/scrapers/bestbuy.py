import asyncio
import os
import json
from typing import Optional, Dict, Callable,Any
import random
import re

from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeout
from bs4 import BeautifulSoup

from curl_cffi.requests import AsyncSession

from curl_cffi.const import CurlHttpVersion

STORAGE_STATE_PATH = "bestbuy_storage.json"
HOMEPAGE = "https://www.bestbuy.com/?intl=nosplash"

class NoResultsFound(Exception):
    """Raised when the search page indicates no results for a specific SKU."""
    pass

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
                if attempt + 1 > 1:
                    self.log("WARNING", f"Retry Loop: Attempt {attempt + 1}")
                    
                try:
                    # Execution
                    res = operation()
                    if asyncio.iscoroutine(res):
                        return await res
                    return res
                
                # --- NEW: Catch the "No Results" signal and exit early ---
                except NoResultsFound:
                    print(f"[TRACE] No results found for SKU. Aborting retries.")
                    # We return None to indicate that the search finished but produced no data
                    return None 
                # --------------------------------------------------------

                except PlaywrightTimeout as e:
                    print(f"[DEBUG] Timeout on attempt {attempt + 1}")
                    self.log("WARNING", f"Timeout occurred: {str(e)}")
                    if attempt == max_retries - 1:
                        raise
                    await self._human_delay(backoff * (attempt + 1), backoff * (attempt + 1) * 1.5)
                
                except Exception as e:
                    print(f"[DEBUG] Error on attempt {attempt + 1}: {type(e).__name__}")
                    self.log("ERROR", f"An error occurred: {str(e)}")

                    # If browser died, don't retry, just crash gracefully
                    if self.browser and not self.browser.is_connected():
                        print("[CRITICAL] Browser disconnected. Aborting.")
                        self.log("CRITICAL", "Browser disconnected. Aborting.")
                        raise
                    
                    if attempt == max_retries - 1:
                        raise
                    await self._human_delay(backoff * (attempt + 1), backoff * (attempt + 1) * 1.5)

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

    async def _process_html_with_bs4(self, html_content: str, current_url: str) -> Dict[str, Any]:
        soup = BeautifulSoup(html_content, 'html.parser')
        
        # 1. INITIAL LOGGING
        html_len = len(html_content) if html_content else 0
        self.log("INFO", f"Mining content for {current_url} | Size: {html_len} bytes")
        
        final_data = {
            "title": None,
            "price": None,
            "brand": None,
            "availability": "Unknown",
            "specs": {},
            "raw_schema": None,
            "source_url": current_url
        }

        # 2. MINING: JSON-LD (The Primary Truth)
        schema_script = soup.find("script", {"id": "product-schema", "type": "application/ld+json"})
        if schema_script and schema_script.string:
            try:
                data = json.loads(schema_script.string)
                final_data["raw_schema"] = data
                final_data["title"] = data.get("name")
                
                final_data["image"] = data.get("image")
                final_data["url"] = data.get("url")
                final_data["model"] = data.get("model")

                brand = data.get("brand")
                final_data["brand"] = brand.get("name") if isinstance(brand, dict) else brand
                
                offers = data.get("offers", [])
                offer = offers[0] if isinstance(offers, list) else (offers if isinstance(offers, dict) else {})
                final_data["price"] = float(offer.get("price")) if offer.get("price") else None
               
                availability = offer.get("availability", "Unknown")
                if availability:
                    final_data["availability"] = availability.split("/")[-1]

                additional_props = data.get("additionalProperty", [])
                for prop in additional_props:
                    key = prop.get("name")
                    val = prop.get("value")
                    if key and val:
                        final_data["specs"][key] = val
                
                self.log("SUCCESS", f"Mined core data for: {final_data['title']}")
            except Exception as e:
                self.log("ERROR", f"JSON-LD mining failed: {e}")

        # 3. MINING: Rich Apollo State (Deep Spec Mining)
        scripts = soup.find_all("script")
        specs_found = 0
        for script in scripts:
            if script.string and "ApolloSSRDataTransport" in script.string:
                try:
                    start = script.string.find("push(")
                    end = script.string.rfind(")")

                    if start == -1 or end == -1:
                        continue

                    json_str = script.string[start + 5:end]
                    apollo_data = json.loads(json_str)

                    rehydrate = apollo_data.get("rehydrate", {})

                    for key, val in rehydrate.items():
                        data = val.get("data", {})

                        if "productBySkuId" in data:
                            spec_groups = data["productBySkuId"].get("specificationGroups", [])

                            for group in spec_groups:
                                g_name = group.get("name")

                                for spec in group.get("specifications", []):
                                    key_name = f"{g_name} | {spec.get('displayName')}"
                                    val_name = spec.get("value")

                                    if key_name and val_name:
                                        final_data["specs"][key_name] = val_name
                                        specs_found += 1

                except Exception as e:
                    self.log("WARNING", f"Deep mining incomplete: {e}")
        
        self.log("SUCCESS", f"Deep Mining complete. Extracted {specs_found} rich attributes.")
        print(f"Final data [ ] {final_data}")
        return final_data
    

    async def scrape_single_sku(self, sku: str) -> Dict:
        await self._check_cancel()
        print(f"\n[TRACE] STARTING SKU: {sku}")
        self.log("INFO", f"Scraping SKU: {sku}")

        # 1. Search remains in Playwright to handle the dynamic search bar
        await self._search_sku(sku)
        
        # 2. This function now finds the link AND fetches HTML via curl_cffi
        if not await self._open_single_search_result_or_abort(sku):

            msg = f"SKU {sku} failed: not found or multiple results"
            self.log("WARNING", msg)

            await self._return_to_clean_state()

            return {
                "sku": sku,
                "status": "multiple_results_or_not_found"
            }

        print("[TRACE] HTML Captured. Processing with BeautifulSoup...")
        
        # 3. Process the captured HTML locally
        processed_data = await self._process_html_with_bs4(self.last_fetched_html,self.current_url)

        # 4. Cleanup Playwright session for the next run
        await self._return_to_clean_state()

        if not processed_data.get("title"):
            print("[DEBUG] Data extraction failed (Title missing).")
            self.log("WARNING", f"Data extraction failed for SKU {sku} (Title missing)")
            return {"sku": sku, "status": "extraction_failed"}
        
        self.log("SUCCESS", f"Successfully scraped SKU: {sku}")

        return {
            "status": "success",
            "sku": sku,
             **processed_data
        }

    async def _search_sku(self, sku: str):
        async def do_search():
            print(f"[TRACE] Searching for SKU: {sku}")
            
            search_selector = "textarea[data-testid='SearchBarExtendable-TestID']"
            
            # 1. Ensure search bar is ready
            search_bar = self.page.locator(search_selector)
            await search_bar.wait_for(state="visible", timeout=20000)
            
            # 2. Prepare search bar
            await search_bar.click()
            await self._human_delay(0.2, 0.5)
            await search_bar.fill("")
            await search_bar.fill(sku)
            
            print(f"[TRACE] SKU {sku} filled, pressing Enter")
            await search_bar.press("Enter")
            
            # 3. Fast-check for "No Results" page
            # We use a short timeout here to see if the error block pops up
            try:
                # This selector matches the div you provided earlier
                await self.page.wait_for_selector(".no-results-found-block", timeout=5000)
                print(f"[TRACE] SKU {sku} - No results found.")
                raise NoResultsFound()
            except PlaywrightTimeout:
                # If the "No Results" block didn't appear, assume we are on the results page
                pass
            
            # 4. Wait for standard results
            await self.page.wait_for_selector(
                "#main-results li.product-list-item",
                timeout=15000
            )
            self.log("INFO", f"Main results loaded for {sku}")

        # The _retry_operation will now catch the NoResultsFound 
        # exception and exit without retrying.
        await self._retry_operation(do_search)
     

    # ---------------------------------------------------
    # CURL_CFFI STEALTH FETCH
    # ---------------------------------------------------

    async def _fetch_with_stealth(self, url: str):

        profiles = [
            "chrome",        # auto newest Chrome
            "safari",        # latest Safari
            "safari_ios",    # iOS Safari
        ]

        async with AsyncSession(
            timeout=60,
            allow_redirects=True
        ) as session:

            for profile in profiles:
                try:
                    print(f"[TRACE] Fetching with {profile} profile: {url}")

                    response = await session.get(
                        url,
                        impersonate=profile,
                        http_version=CurlHttpVersion.V2_0,
                        headers={
                            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
                            "Accept-Language": "en-US,en;q=0.9",
                            "Upgrade-Insecure-Requests": "1",
                            "Sec-Fetch-Dest": "document",
                            "Sec-Fetch-Mode": "navigate",
                            "Sec-Fetch-Site": "same-origin",
                            "Referer": "https://www.bestbuy.com/",
                        }
                    )

                    if response.status_code == 200:

                        body = response.text or ""
                        body_len = len(body)

                        print(f"[DEBUG] {profile} SUCCESS: 200 | body ~{body_len} bytes")

                        if body_len > 5000:
                            return body
                        else:
                            print("[DEBUG] Response too small, possible bot block")

                    else:
                        print(f"[DEBUG] {profile} returned status {response.status_code}")

                except Exception as e:
                    print(f"[DEBUG] {profile} failed with error: {e}")

            print("[ERROR] All profiles failed")
            return None


    # ---------------------------------------------------
    # PLAYWRIGHT SEARCH -> CURL_CFFI PRODUCT FETCH
    # ---------------------------------------------------

    async def _open_single_search_result_or_abort(self, sku: str) -> bool:

        await self._check_cancel()

        try:

            # Wait for search results
            result_selector = "#main-results li.product-list-item"
            await self.page.wait_for_selector(result_selector, timeout=15000)

            items = await self.page.locator(result_selector).all()

            if len(items) != 1:
                msg = f"SKU {sku} failed: {len(items)} results returned"
                print(f"[TRACE] {msg}")
                self.log("WARNING", msg)
                return False

            target_link = items[0].locator("a.product-list-item-link").first

            href = await target_link.get_attribute("href")

            if not href:
                return False

            if href.startswith("/"):
                href = f"https://www.bestbuy.com{href}"

            # ---------------------------------------------------
            # HANDOVER FROM PLAYWRIGHT -> CURL_CFFI
            # ---------------------------------------------------

            print(f"[TRACE] Handing over to curl_cffi for {sku}")

            html_content = await self._fetch_with_stealth(href)

            if html_content:

                # store html for extractor
                self.last_fetched_html = html_content
                self.current_url = href

                print(f"[SUCCESS] HTML captured for {sku} via Stealth Handover")

                return True

            print(f"[ERROR] curl_cffi failed for {sku}")
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
        self.log("INFO", "Stopping BestBuy scraper and cleaning up resources")
        try:
            if self.browser: await self.browser.close()
            if self.playwright: await self.playwright.stop()
        except: pass