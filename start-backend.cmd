@echo off
setlocal
rem Run from backend so Maven resolves dependencies and H2 keeps a stable data path.
cd /d "%~dp0backend"
where mvn >nul 2>&1
if errorlevel 1 (
  echo Maven was not found. Install Maven and add its bin directory to PATH.
  exit /b 1
)
call mvn spring-boot:run %*
exit /b %errorlevel%
