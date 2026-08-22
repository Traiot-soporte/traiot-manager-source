@echo off
setlocal
cd /d "%~dp0"

set "TRAIOT_NPM=%LOCALAPPDATA%\nvm\v22.11.0\npm.cmd"
if not exist "%TRAIOT_NPM%" set "TRAIOT_NPM=npm.cmd"

echo Iniciando la interfaz de TRAIOT MANAGER...
echo Direccion: http://127.0.0.1:5173
echo Este proceso sirve solamente el frontend; no es el backend de la aplicacion.
echo Para detenerlo, presiona Ctrl+C en esta ventana.

start "" powershell.exe -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 2; Start-Process 'http://127.0.0.1:5173'"
call "%TRAIOT_NPM%" run dev -- --host 127.0.0.1 --port 5173 --strictPort

if errorlevel 1 (
  echo.
  echo No fue posible iniciar la interfaz. Revisa que Node.js y las dependencias esten instalados.
  pause
)
