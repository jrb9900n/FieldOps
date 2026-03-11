@echo off
REM FieldOps — Sync yesterday's jobs
REM Schedule this with Windows Task Scheduler to run nightly
cd /d "%~dp0"
node sa-sync-cdp.js --yesterday >> sync-log.txt 2>&1
