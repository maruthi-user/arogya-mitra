@echo off
setlocal
cd /d "%~dp0"
set BACKEND_URL=http://127.0.0.1:9092
call npm.cmd --prefix frontend run dev -- --port 3012
