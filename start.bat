@echo off
rem Starts the app (default http://localhost:3000, next free port if busy) and opens the browser.
cd /d "%~dp0"
node server.js 3000 --open
