# 1. Ask for the new version type
$type = Read-Host "Enter version bump type (patch, minor, major) [default: patch]"
if ($type -eq "") { $type = "patch" }

# 2. Update version in package.json and tauri.conf.json
Write-Host "Bumping version..." -ForegroundColor Cyan
npm version $type

# 3. Set the Private Key (Make sure this matches your actual environment variable)
# If it's already in your System Env, you can skip this line.
# $env:TAURI_SIGNING_PRIVATE_KEY = "YOUR_PRIVATE_KEY_STRING_HERE"

# 4. Run the Tauri build
Write-Host "Starting Tauri Build & Signing..." -ForegroundColor Cyan
npm run tauri:build

Write-Host "Done! Check src-tauri/target/release/bundle/nsis/ for your signed files." -ForegroundColor Green