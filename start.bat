@echo off
rem Starts the app on http://localhost:5500 and opens it in the default browser.
cd /d "%~dp0"
start "" http://localhost:5500
node server.js 5500
