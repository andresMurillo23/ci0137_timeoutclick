@echo off
echo ========================================
echo     TimeoutClick Server Starter
echo ========================================
echo.
echo [0/3] Deteniendo procesos anteriores de Node.js...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak > nul
echo.
echo [1/3] Iniciando Backend en puerto 3000...
start "TimeoutClick Backend" cmd /k "cd backend && node server.js"
timeout /t 3 /nobreak > nul
echo.
echo [2/3] Iniciando Frontend en puerto 5000...
start "TimeoutClick Frontend" cmd /k "cd frontend && node server.js"
timeout /t 2 /nobreak > nul
echo.
echo [3/3] Verificando puertos...
netstat -ano | findstr ":3000.*LISTENING" > nul
if %errorlevel% equ 0 (
    echo [OK] Backend corriendo en puerto 3000
) else (
    echo [ERROR] Backend no se inicio correctamente
)
netstat -ano | findstr ":5000.*LISTENING" > nul
if %errorlevel% equ 0 (
    echo [OK] Frontend corriendo en puerto 5000
) else (
    echo [ERROR] Frontend no se inicio correctamente
)
echo.
echo ========================================
echo     SERVIDORES INICIADOS
echo ========================================
echo Backend:  http://localhost:3000
echo Frontend: http://localhost:5000
echo.
echo Las ventanas de los servidores se abrieron en ventanas separadas.
echo Puedes ver los logs ahi.
echo Para detener los servidores, cierra las ventanas o presiona Ctrl+C en cada una.
echo.
pause
