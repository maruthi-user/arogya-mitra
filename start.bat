@echo off
rem Starts the app (default http://localhost:3002, next free port if busy) and opens the browser.
cd /d "%~dp0"
node frontend\scripts\dev-server.cjs 3002 --open
