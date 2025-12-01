@echo off
echo Iniciando servidores TimeoutClick...
echo.
echo [1/2] Iniciando Backend en puerto 3000...
start "TimeoutClick Backend" cmd /k "cd backend && node server.js"
timeout /t 3 /nobreak > nul
echo.
echo [2/2] Iniciando Frontend en puerto 5000...
start "TimeoutClick Frontend" cmd /k "cd frontend && node server.js"
echo.
echo ========================================
echo SERVIDORES INICIADOS
echo ========================================
echo Backend:  http://localhost:3000
echo Frontend: http://localhost:5000
echo.
echo Las ventanas de los servidores se abrieron en ventanas separadas.
echo Puedes ver los logs ahi.
echo.
pause
