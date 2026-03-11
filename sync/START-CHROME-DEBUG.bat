@echo off
REM FieldOps — Launch Chrome with remote debugging enabled
REM Run this ONCE before running the sync script (or at Windows startup)
REM
REM To run at startup: add a shortcut to this file in:
REM   shell:startup  (Win+R, type shell:startup)

set CHROME="C:\Program Files\Google\Chrome\Application\chrome.exe"
set PROFILE=%USERPROFILE%\AppData\Local\Google\Chrome\User Data

echo Starting Chrome with remote debugging on port 9222...
start "" %CHROME% --remote-debugging-port=9222 --user-data-dir="%PROFILE%" https://my.serviceautopilot.com/DispatchBoard.aspx?type=db

echo Chrome launched. You can now run the sync script.
