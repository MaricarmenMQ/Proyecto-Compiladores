@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo [ERROR] No se encontro Node.js.
  echo Instala Node.js 18 o superior y vuelve a ejecutar este archivo.
  echo Tambien puedes abrir web\index.html, pero los proveedores de IA no funcionaran sin backend.
  echo.
  pause
  exit /b 1
)

start "SAM-Lang Backend" /D "%~dp0" cmd /k node backend\server.js
timeout /t 2 /nobreak >nul
start "SAM-Lang Studio" "http://127.0.0.1:3000"
