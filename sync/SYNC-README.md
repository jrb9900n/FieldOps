# FieldOps SA Sync — CDP Mode

Connects to your running Chrome browser and pulls SA dispatch data into Supabase automatically.

## One-time setup

### 1. Install dependencies
```cmd
cd sync
npm install
```

### 2. Launch Chrome with debugging enabled
Double-click `START-CHROME-DEBUG.bat` — this opens Chrome with remote debugging on port 9222.

**To run Chrome this way automatically at Windows startup:**
- Press `Win+R`, type `shell:startup`, press Enter
- Copy a shortcut to `START-CHROME-DEBUG.bat` into that folder

> Note: Chrome must already be logged into SA. Once logged in, the session persists.

## Usage

```cmd
cd sync

# Sync a specific date range
node sa-sync-cdp.js --start 7/1/2025 --end 7/31/2025

# Sync today
node sa-sync-cdp.js --today

# Sync yesterday (good for nightly automation)
node sa-sync-cdp.js --yesterday

# Sync a full month
node sa-sync-cdp.js --month 2025-07
```

## Scheduled nightly sync (Task Scheduler)

1. Open **Task Scheduler** → Create Basic Task
2. Name: `FieldOps Nightly Sync`
3. Trigger: Daily, e.g. 2:00 AM
4. Action: Start a program
   - Program: `C:\path\to\fieldops\sync\sync-yesterday.bat`
5. Finish

The bat file appends output to `sync-log.txt` in the sync folder.

## How it works

1. Connects to Chrome on `localhost:9222` (Chrome DevTools Protocol)
2. Finds the SA Dispatch Board tab (or opens it)
3. Injects a `$.ajax` interceptor into the page
4. Triggers SA's native "Load Date Range" action with your target dates
5. Captures the Query response (jobs data)
6. Upserts all jobs to Supabase `sa_jobs` table

No cookies to manage — it uses your existing logged-in Chrome session.
