# Script para verificar usuarios en MongoDB
# Ejecutar: .\check-users.ps1

Write-Host "`n=== TimeoutClick - User Database Check ===" -ForegroundColor Cyan
Write-Host "Connecting to MongoDB..." -ForegroundColor Yellow

# Verificar si MongoDB está corriendo
$mongoProcess = Get-Process -Name mongod -ErrorAction SilentlyContinue
if ($null -eq $mongoProcess) {
    Write-Host "ERROR: MongoDB no está corriendo" -ForegroundColor Red
    Write-Host "Inicia MongoDB primero" -ForegroundColor Yellow
    exit 1
}

Write-Host "MongoDB is running (PID: $($mongoProcess.Id))" -ForegroundColor Green

# Ejecutar consultas de MongoDB
Write-Host "`n--- Counting Users ---" -ForegroundColor Cyan
mongosh timeoutclick --quiet --eval "db.users.countDocuments()" 2>$null

Write-Host "`n--- User List ---" -ForegroundColor Cyan
$query = @"
db.users.find({}, {
    username: 1,
    email: 1,
    'gameStats.gamesPlayed': 1,
    'gameStats.gamesWon': 1,
    isEmailVerified: 1,
    _id: 0
}).forEach(u => {
    const winRate = u.gameStats.gamesPlayed > 0 
        ? ((u.gameStats.gamesWon / u.gameStats.gamesPlayed) * 100).toFixed(1) 
        : 0;
    print(
        u.username.padEnd(15) + ' | ' +
        u.email.padEnd(30) + ' | ' +
        'Games: ' + String(u.gameStats.gamesPlayed).padStart(3) + ' | ' +
        'Wins: ' + String(u.gameStats.gamesWon).padStart(3) + ' | ' +
        'WR: ' + String(winRate).padStart(5) + '%'
    );
});
"@

mongosh timeoutclick --quiet --eval $query 2>$null

Write-Host "`n--- Quick Stats ---" -ForegroundColor Cyan
$statsQuery = @"
const total = db.users.countDocuments();
const verified = db.users.countDocuments({ isEmailVerified: true });
const withGames = db.users.countDocuments({ 'gameStats.gamesPlayed': { `$gt: 0 } });
print('Total Users: ' + total);
print('Verified: ' + verified);
print('With Games: ' + withGames);
"@

mongosh timeoutclick --quiet --eval $statsQuery 2>$null

Write-Host "`n--- Test Credentials ---" -ForegroundColor Yellow
Write-Host "Username/Email: testuser or test@timeoutclick.com" -ForegroundColor White
Write-Host "Password: test123" -ForegroundColor White
Write-Host "`nOther users:" -ForegroundColor White
Write-Host "- andresmimi, rolipoli, isabel, tatsparamo, etc." -ForegroundColor White
Write-Host "- Password for all: password123" -ForegroundColor White

Write-Host "`n=== Done ===" -ForegroundColor Green
