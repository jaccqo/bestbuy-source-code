Best Buy Scraper Pro (V2.6.0 STABLE)
------------------------------------
High-volume SKU scraper built with Tauri + Vite + Python Sidecar.

QUICK START FOR DEVELOPERS:
1. Requirements: Rust/Cargo, Node.js, and Python 3.11+.
2. Initialize Frontend: 
   - Open terminal in root and run: 'npm install'
3. Initialize Backend:
   - Go to /python-server and run: 'pip install -r requirements.txt'
   - Run 'playwright install chromium'
   -Run 'python best_buy_engine.py
4. Configuration: 
   - Update tauri.conf.json with your Vercel Proxy URL and Public Key.
   - Update your Next.js API with your GUMROAD_PRODUCT_ID.

BUILD AUTOMATION:
- Backend: Run 'setup.bat' in /python-server to compile via Nuitka. 
- Frontend/Tauri: Run 'release.ps1' to bump version and build signed installers.
- Note: Only run 'setup.bat' if you modify Python code. Copy the resulting 
  .exe from /backend_dist to /src-tauri/resources before building Tauri.

HOW TO GENERATE SIGNING KEYS:
1. Terminal: npx tauri signer generate -w ./main.key
2. Env Vars (Required for 'release.ps1'):
   - TAURI_SIGNING_PRIVATE_KEY: (Content of 'main.key')
   - TAURI_SIGNING_PRIVATE_KEY_PASSWORD: (Password used during generation)
3. Config: Copy 'main.key.pub' to tauri.conf.json > plugins > updater > pubkey.

LICENSE SYSTEM & UPDATER PROXY:
- This app uses a "Private Updater Proxy" via Next.js.
- How it works:
  1. App pings your Next.js API (set in tauri.conf.json).
  2. API verifies the Gumroad license key.
  3. If valid, API fetches 'latest.json' from your GitHub Releases.
  4. Returns JSON to app to trigger the update download.

LICENSING:
This purchase grants a non-exclusive developer license. You may modify, build 
upon, and use this code for personal or commercial projects.