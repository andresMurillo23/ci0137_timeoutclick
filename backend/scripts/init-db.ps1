# PowerShell script to initialize MongoDB database
Write-Host "Initializing TimeoutClick MongoDB Database..." -ForegroundColor Cyan

$scriptPath = Join-Path $PSScriptRoot "init-db.js"
$mongoUri = "mongodb://localhost:27017/timeoutclick"

Write-Host "Script location: $scriptPath" -ForegroundColor Gray
Write-Host "MongoDB URI: $mongoUri" -ForegroundColor Gray
Write-Host ""

# Try to run mongosh from cmd (where it works)
try {
    Write-Host "Executing initialization script..." -ForegroundColor Yellow
    $result = cmd /c "mongosh $mongoUri $scriptPath 2>&1"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host $result
        Write-Host ""
        Write-Host "Database initialized successfully!" -ForegroundColor Green
    } else {
        Write-Host "Error executing mongosh:" -ForegroundColor Red
        Write-Host $result
        Write-Host ""
        Write-Host "Please make sure:" -ForegroundColor Yellow
        Write-Host "1. MongoDB server is running" -ForegroundColor Yellow
        Write-Host "2. mongosh is in your system PATH" -ForegroundColor Yellow
    }
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Alternative: Run this command manually in cmd:" -ForegroundColor Yellow
    Write-Host "mongosh mongodb://localhost:27017/timeoutclick $scriptPath" -ForegroundColor Cyan
}
