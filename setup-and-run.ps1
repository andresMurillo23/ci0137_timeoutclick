# TimeoutClick - Complete Setup and Run Script
# This script sets up the entire project from scratch and starts the servers

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  TimeoutClick - Complete Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check MongoDB
Write-Host "[1/6] Checking MongoDB..." -ForegroundColor Yellow
$mongoService = Get-Service -Name MongoDB -ErrorAction SilentlyContinue

if ($null -eq $mongoService) {
    Write-Host "  [ERROR] MongoDB service not found!" -ForegroundColor Red
    Write-Host "  Please install MongoDB from: https://www.mongodb.com/try/download/community" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

if ($mongoService.Status -ne "Running") {
    Write-Host "  MongoDB is not running. Starting..." -ForegroundColor Yellow
    try {
        Start-Service MongoDB
        Start-Sleep -Seconds 2
        Write-Host "  [OK] MongoDB started successfully" -ForegroundColor Green
    } catch {
        Write-Host "  [ERROR] Could not start MongoDB: $_" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
} else {
    Write-Host "  [OK] MongoDB is already running" -ForegroundColor Green
}
Write-Host ""

# Step 2: Install dependencies
Write-Host "[2/6] Installing dependencies..." -ForegroundColor Yellow
Write-Host "  This may take a few minutes..." -ForegroundColor Gray

try {
    npm run install:all 2>&1 | Out-Null
    Write-Host "  [OK] All dependencies installed" -ForegroundColor Green
} catch {
    Write-Host "  [ERROR] Failed to install dependencies: $_" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host ""

# Step 3: Check .env file
Write-Host "[3/6] Checking environment configuration..." -ForegroundColor Yellow
$envFile = "backend\.env"

if (-Not (Test-Path $envFile)) {
    Write-Host "  [ERROR] .env file not found!" -ForegroundColor Red
    Write-Host "  Please create backend\.env file before running this script" -ForegroundColor Red
    Write-Host "  You can use the .env.example file as template" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
} else {
    Write-Host "  [OK] Environment file found" -ForegroundColor Green
}
Write-Host ""

# Step 4: Initialize database
Write-Host "[4/6] Initializing database..." -ForegroundColor Yellow
Write-Host "  Creating/updating users..." -ForegroundColor Gray

try {
    Set-Location backend
    $output = node scripts/seed-users.js 2>&1
    Set-Location ..
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  [OK] Database initialized with sample users" -ForegroundColor Green
    } else {
        Write-Host "  [WARNING] Database initialization completed with warnings" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  [ERROR] Failed to initialize database: $_" -ForegroundColor Red
    Set-Location ..
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host ""

# Step 5: Stop any existing Node processes
Write-Host "[5/6] Cleaning up old processes..." -ForegroundColor Yellow
$nodeProcesses = Get-Process -Name node -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    Write-Host "  Stopping $($nodeProcesses.Count) existing Node.js process(es)..." -ForegroundColor Gray
    Stop-Process -Name node -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    Write-Host "  [OK] Old processes stopped" -ForegroundColor Green
} else {
    Write-Host "  [OK] No old processes found" -ForegroundColor Green
}
Write-Host ""

# Step 6: Start servers
Write-Host "[6/6] Starting servers..." -ForegroundColor Yellow
Write-Host "  Backend will start on port 3000" -ForegroundColor Gray
Write-Host "  Frontend will start on port 5000" -ForegroundColor Gray
Write-Host ""

# Start backend
Start-Process -FilePath "cmd.exe" -ArgumentList "/k", "cd backend && node server.js" -WindowStyle Normal
Start-Sleep -Seconds 3

# Start frontend
Start-Process -FilePath "cmd.exe" -ArgumentList "/k", "cd frontend && node server.js" -WindowStyle Normal
Start-Sleep -Seconds 2

# Verify servers are running
Write-Host ""
Write-Host "Verifying servers..." -ForegroundColor Yellow

$backendRunning = $false
$frontendRunning = $false

# Check backend port
$backendCheck = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if ($backendCheck) {
    Write-Host "  [OK] Backend running on http://localhost:3000" -ForegroundColor Green
    $backendRunning = $true
} else {
    Write-Host "  [ERROR] Backend not responding on port 3000" -ForegroundColor Red
}

# Check frontend port
$frontendCheck = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue
if ($frontendCheck) {
    Write-Host "  [OK] Frontend running on http://localhost:5000" -ForegroundColor Green
    $frontendRunning = $true
} else {
    Write-Host "  [ERROR] Frontend not responding on port 5000" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  SETUP COMPLETE!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if ($backendRunning -and $frontendRunning) {
    Write-Host "Access your application at:" -ForegroundColor Green
    Write-Host "  Frontend: http://localhost:5000" -ForegroundColor White
    Write-Host "  Backend:  http://localhost:3000" -ForegroundColor White
    Write-Host ""
    Write-Host "Sample users:" -ForegroundColor Cyan
    Write-Host "  - testuser / test123" -ForegroundColor White
    Write-Host "  - andresmimi / password123" -ForegroundColor White
    Write-Host "  - rolipoli / password123" -ForegroundColor White
    Write-Host ""
    Write-Host "Server windows opened separately." -ForegroundColor Gray
    Write-Host "To stop servers, close those windows or press Ctrl+C in each." -ForegroundColor Gray
} else {
    Write-Host "Some services failed to start. Check the server windows for errors." -ForegroundColor Yellow
}

Write-Host ""
Read-Host "Press Enter to exit this window"
