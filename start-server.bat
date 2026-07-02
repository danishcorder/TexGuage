@echo off
echo ========================================
echo TexGauge IQ - Complete System Starter
echo ========================================
echo.
echo This will start:
echo   1. Python Backend (API + WebSocket) on port 8000
echo   2. Frontend HTTP Server on port 8080
echo.
echo Press Ctrl+C to stop all servers
echo ========================================
echo.

cd /d "%~dp0"

:: === BACKEND SETUP ===

echo [1/3] Checking Python installation...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python 3 is required but not found!
    echo Please install Python 3.12+ from https://www.python.org/downloads/
    pause
    exit /b 1
)

echo [2/3] Installing backend dependencies...
cd backend
pip install -r requirements.txt >nul 2>&1
if %errorlevel% neq 0 (
    echo Installing dependencies...
    pip install -r requirements.txt
)
cd ..

echo [3/3] Starting servers...
echo.
echo Backend API:    http://localhost:8000
echo API Docs:       http://localhost:8000/docs
echo Frontend:       http://localhost:8080/pages/carding.html
echo.

:: Start Backend in a new window
start "TexGauge-Backend" cmd /c "cd /d %~dp0 && python backend/run.py"

:: Wait a moment for backend to start
timeout /t 2 /nobreak >nul

:: Start Frontend in a new window
start "TexGauge-Frontend" cmd /c "cd /d %~dp0 && python -m http.server 8080"

echo.
echo Both servers started successfully!
echo.
echo Close this window to stop both servers.
echo (Close the individual server windows to stop them)
echo.
pause