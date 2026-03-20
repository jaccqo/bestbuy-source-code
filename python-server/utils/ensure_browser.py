import os
import sys

# 1. CRITICAL: Force Playwright to look in AppData, NOT the standalone folder.
# This prevents the "Executable doesn't exist at ...MAIN~1.DIS" error.
user_cache_dir = os.path.join(os.environ.get("LOCALAPPDATA", os.path.expanduser("~\\AppData\\Local")), "ms-playwright")
os.environ["PLAYWRIGHT_BROWSERS_PATH"] = user_cache_dir

import requests
import zipfile
import shutil
from utils.logging import write_log

def ensure_firefox_installed(db):
    write_log(db, "INFO", "Checking Playwright Firefox status...")

    # 2. Local import after env var is set
    from playwright.sync_api import sync_playwright
    
    # Check if it already works
    with sync_playwright() as p:
        try:
            # We don't need a custom executable_path because PLAYWRIGHT_BROWSERS_PATH 
            # now points Playwright to the right place.
            browser = p.firefox.launch(headless=True)
            browser.close()
            write_log(db, "SUCCESS", "Playwright Firefox is ready.")
            return True
        except Exception:
            pass

    write_log(db, "WARNING", "Firefox not found — starting manual install...")

    try:
        # Configuration for FF 1463
        url = "https://playwright.azureedge.net/builds/firefox/1463/firefox-win64.zip"
        version_dir = os.path.join(user_cache_dir, "firefox-1463")
        inner_firefox_dir = os.path.join(version_dir, "firefox")
        zip_path = os.path.join(user_cache_dir, "firefox-temp.zip")

        # Create base dir
        os.makedirs(user_cache_dir, exist_ok=True)

        # 3. Download
        write_log(db, "INFO", "Downloading Firefox (~85MB)...")
        response = requests.get(url, stream=True)
        response.raise_for_status()

        total_size = int(response.headers.get('content-length', 0))
        downloaded = 0
        last_notified_percent = -10 # Notify every 10%

        with open(zip_path, "wb") as f:
            for chunk in response.iter_content(chunk_size=1024*1024):
                if chunk:
                    f.write(chunk)
                    downloaded += len(chunk)
                    if total_size > 0:
                        percent = int(downloaded * 100 / total_size)
                        if percent >= last_notified_percent + 10:
                            write_log(db, "INFO", f"Downloaded {percent}%")
                            last_notified_percent = percent

        # 4. Extraction & Structure setup
        write_log(db, "INFO", "Extracting browser files...")
        if os.path.exists(version_dir):
            shutil.rmtree(version_dir)
        os.makedirs(version_dir)

        with zipfile.ZipFile(zip_path) as z:
            z.extractall(version_dir)
        
        os.remove(zip_path)

        # Playwright expects: .../ms-playwright/firefox-1463/firefox/firefox.exe
        if not os.path.exists(inner_firefox_dir):
            os.makedirs(inner_firefox_dir)

        for item in os.listdir(version_dir):
            item_path = os.path.join(version_dir, item)
            if item != "firefox":
                shutil.move(item_path, inner_firefox_dir)

        # 5. The "Magic" Marker Files
        # Playwright won't use the folder unless these two files exist.
        open(os.path.join(version_dir, "DEPENDENCIES_VALIDATED"), 'w').close()
        open(os.path.join(version_dir, "INSTALLATION_COMPLETE"), 'w').close()

        write_log(db, "SUCCESS", "Installation finished. Verifying...")
        
        # Final test launch
        with sync_playwright() as p:
            p.firefox.launch(headless=True).close()
            
        write_log(db, "SUCCESS", "Firefox is now fully operational!")
        return True

    except Exception as e:
        write_log(db, "ERROR", f"Manual install failed: {str(e)}")
        return False