@echo off
REM TimeoutClick - Complete Setup and Run Script
REM This script sets up the entire project from scratch and starts the servers

echo ========================================
echo   TimeoutClick - Complete Setup
echo ========================================
echo.

REM Step 1: Check MongoDB
echo [1/6] Checking MongoDB...
sc query MongoDB | find "RUNNING" >nul
if %errorlevel% neq 0 (
    echo   MongoDB is not running. Starting...
    net start MongoDB >nul 2>&1
    if %errorlevel% neq 0 (
        echo   [ERROR] Could not start MongoDB
        echo   Please ensure MongoDB is installed
        pause
        exit /b 1
    )
    echo   [OK] MongoDB started
) else (
    echo   [OK] MongoDB is running
)
echo.

REM Step 2: Install dependencies
echo [2/6] Installing dependencies...
echo   This may take a few minutes...
call npm run install:all >nul 2>&1
if %errorlevel% equ 0 (
    echo   [OK] All dependencies installed
) else (
    echo   [ERROR] Failed to install dependencies
    pause
    exit /b 1
)
echo.

REM Step 3: Check .env file
echo [3/6] Checking environment configuration...
if not exist "backend\.env" (
    echo   [ERROR] .env file not found!
    echo   Please create backend\.env file before running this script
    echo   You can use the .env.example file as template
    pause
    exit /b 1
) else (
    echo   [OK] Environment file found
)
echo.

REM Step 4: Initialize database
echo [4/6] Initializing database...
echo   Creating/updating users...
cd backend
node scripts/seed-users.js >nul 2>&1
cd ..
echo   [OK] Database initialized
echo.

REM Step 5: Stop any existing Node processes
echo [5/6] Cleaning up old processes...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul
echo   [OK] Cleanup complete
echo.

REM Step 6: Start servers
echo [6/6] Starting servers...
echo   Backend will start on port 3000
echo   Frontend will start on port 5000
echo.

start "TimeoutClick Backend" cmd /k "cd backend && node server.js"
timeout /t 3 /nobreak >nul

start "TimeoutClick Frontend" cmd /k "cd frontend && node server.js"
timeout /t 2 /nobreak >nul

REM Verify servers
echo.
echo Verifying servers...
netstat -ano | findstr ":3000.*LISTENING" >nul
if %errorlevel% equ 0 (
    echo   [OK] Backend running on http://localhost:3000
) else (
    echo   [ERROR] Backend not responding
)

netstat -ano | findstr ":5000.*LISTENING" >nul
if %errorlevel% equ 0 (
    echo   [OK] Frontend running on http://localhost:5000
) else (
    echo   [ERROR] Frontend not responding
)

echo.
echo ========================================
echo   SETUP COMPLETE!
echo ========================================
echo.
echo Access your application at:
echo   Frontend: http://localhost:5000
echo   Backend:  http://localhost:3000
echo.
echo Sample users:
echo   - testuser / test123
echo   - andresmimi / password123
echo   - rolipoli / password123
echo.
echo Server windows opened separately.
echo To stop servers, close those windows or press Ctrl+C.
echo.
pause
