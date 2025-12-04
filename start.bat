@echo off
echo ========================================
echo  TimeoutClick - Iniciando Servidores
echo ========================================
echo.

echo [1/2] Iniciando Backend (puerto 3000)...
start "Backend Server" cmd /k "cd backend && node server.js"
timeout /t 3 /nobreak >nul

echo [2/2] Iniciando Frontend (puerto 5000)...
start "Frontend Server" cmd /k "cd frontend && node server.js"
timeout /t 2 /nobreak >nul

echo.
echo ========================================
echo  Servidores Iniciados!
echo ========================================
echo.
echo  Backend:  http://localhost:3000/api/health
echo  Frontend: http://localhost:5000
echo.
echo  Credenciales de prueba:
echo  - Email: test@timeoutclick.com
echo  - Password: test123
echo.
echo Presiona cualquier tecla para abrir el navegador...
pause >nul

start http://localhost:5000/pages/login.html
