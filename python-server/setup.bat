@echo off
setlocal ENABLEDELAYEDEXPANSION

echo ==================================================
echo BEST BUY SCRAPER PRO - SMART BUILDER
echo ==================================================

REM --- STEP 1: CHECK FOR PYTHON ---
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python not found! Please install Python and add it to PATH.
    pause
    exit /b 1
)

REM --- STEP 2: SETUP VIRTUAL ENVIRONMENT ---
if not exist "venv" (
    echo [INFO] No virtual environment found. Creating one now...
    python -m venv venv
)
echo [INFO] Activating virtual environment...
call venv\Scripts\activate

REM --- STEP 3: AUTO-INSTALL NUITKA & DEPS ---
echo [INFO] Syncing dependencies (this ensures Nuitka is present)...
python -m pip install --upgrade pip
python -m pip install -r requirements.txt nuitka

REM --- STEP 4: CLEAN OLD BUILDS ---
echo [INFO] Cleaning old build folders...
if exist "dist" rd /s /q "dist"
if exist "best_buy_engine.build" rd /s /q "best_buy_engine.build"
if exist "best_buy_engine.onefile-build" rd /s /q "best_buy_engine.onefile-build"

REM --- STEP 5: SMART NUITKA COMPILE ---
echo [INFO] Starting compilation with UPX and Anti-Bloat...


  python -m nuitka ^
  --standalone ^
  --plugin-enable=upx ^
  --upx-binary="C:\Program Files\upx-5.0.2-win64\upx.exe" ^
  --plugin-enable=anti-bloat ^
  --plugin-enable=playwright ^
  --playwright-include-browser=none ^
  --onefile-no-compression ^
  --nofollow-import-to=matplotlib,scipy,PIL,tkinter,notebook,unittest,pytest,numpy.distutils ^
  --lto=yes ^
  --no-deployment-flag=self-execution ^
  --output-dir=backend_dist ^
  best_buy_engine.py

if %errorlevel% neq 0 (
    echo [ERROR] Compilation failed.
    pause
    exit /b %errorlevel%
)

echo.
echo ==================================================
echo SUCCESS! Your optimized backend is ready.
echo File: .\dist\best_buy_engine.exe
echo ==================================================
echo.
echo NEXT STEPS:
echo 1. Copy dist\best_buy_engine.exe to your Tauri 'resources' or 'bin' folder.
echo 2. Run your .\release.ps1 script to build the signed Tauri app.
echo.
pause
endlocal