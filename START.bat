@echo off
REM Quick Start Script for ScaleUp System
REM This script starts both the Python sentiment server and Node.js backend

echo.
echo ============================================================
echo          ScaleUp - Integrated System Startup
echo ============================================================
echo.

REM Get the directory where this script is located
set SCRIPT_DIR=%~dp0

REM Check if we're in the right directory
if not exist "%SCRIPT_DIR%python-sentiment" (
    echo Error: python-sentiment folder not found!
    echo Make sure this script is in the root directory of ScaleUp
    pause
    exit /b 1
)

REM Start Python server in a new window
echo Starting Python Sentiment Server (port 8000)...
start "ScaleUp - Python Server" cmd /k "cd "%SCRIPT_DIR%python-sentiment" && python -m uvicorn sentiment_server:app --host 127.0.0.1 --port 8000"

timeout /t 2 >nul

REM Start Node.js server in a new window
echo Starting Node.js Backend Server (port 5000)...
start "ScaleUp - Node Backend" cmd /k "cd "%SCRIPT_DIR%" && node index.js"

echo.
echo ============================================================
echo Both servers are starting...
echo.
echo Python Server: http://127.0.0.1:8000
echo Node Server: http://localhost:5000
echo.
echo Press Enter to open the frontend in your browser...
echo ============================================================
echo.
pause

REM Give servers time to start before opening browser
timeout /t 3 >nul

REM Try to open browser
start "" "http://localhost:5000"

echo.
echo Frontend opened in browser!
echo Close this window when you're done.
pause
