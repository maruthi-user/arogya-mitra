@echo off
setlocal
set SPRING_PROFILES_ACTIVE=postgres
set SERVER_PORT=9092
set FRONTEND_URL=http://localhost:3012
set APP_CORS_ORIGINS=http://localhost:3012,http://127.0.0.1:3012
call "%~dp0start-backend.cmd" %*
