# Best Buy Scraper — Desktop Automation & Data Collection

A desktop product-data collection application built with **Tauri, Rust, React, TypeScript, Vite, Python, FastAPI, and Playwright**.

This repository demonstrates full-stack desktop engineering, browser automation, background data collection, API integration, and operational dashboards. Originally built as a client project; shared as an engineering portfolio example with permission.

## Highlights

- **Desktop app:** Tauri-powered native shell with a React/TypeScript interface using Vite
- **Python automation:** Playwright-based browser interaction and Best Buy product collection flows
- **Backend APIs:** Python service with routes for scraper control, settings, data access, logs, exports, statistics and diagnostics
- **Operational UI:** Dashboard, collection status, logs, configuration, import/export and data review
- **Data processing:** Structured schemas, local persistence, asynchronous scraping workflows and reporting

## Technology stack

| Layer | Technologies |
| --- | --- |
| Desktop | Tauri, Rust |
| Interface | React, TypeScript, Vite, Tailwind CSS |
| Backend | Python, FastAPI, SQLAlchemy |
| Automation | Playwright |
| Data | Local database, structured JSON and CSV workflows |

## Source layout

- `src/` — React dashboard, components, hooks and TypeScript application logic
- `src-tauri/` — Rust desktop shell, Tauri configuration and permissions
- `python-server/` — Python API server, scraping logic, models and routers

## Development

Prerequisites: Node.js, npm, Rust and Tauri system prerequisites, and Python with pip. Browser automation also requires the appropriate Playwright browser installation.

```bash
npm install
python -m venv .venv
# Activate .venv for your system
pip install -r python-server/requirements.txt
python -m playwright install chromium
npm run tauri dev
```

The Python service may need to be launched separately depending on the development environment. This is a **portfolio source release**, not a turnkey production installer; packaging, original licensing services and update distribution were developed for a separate delivery environment.

## Privacy and scope

Runtime browser sessions, stored cookies, local environment variables, and debug data should **never be committed**. Historical commits may contain such files; review or replace repository history before switching visibility to public.

Use this project in compliance with applicable site terms and policies. No credentials, authenticated sessions, or client-specific deployment configuration are distributed intentionally.

## Author

**Jackson** — [GitHub](https://github.com/jaccqo) · [Fiverr](https://www.fiverr.com/jacqol?public_mode=true)
