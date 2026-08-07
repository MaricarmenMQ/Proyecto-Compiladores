@echo off
setlocal
cd /d "%~dp0"
where cmake >nul 2>nul
if errorlevel 1 (
  echo ERROR: CMake no esta instalado o no esta en PATH.
  pause
  exit /b 1
)
cmake -S . -B build
if errorlevel 1 goto error
cmake --build build --config Release
if errorlevel 1 goto error
echo.
echo Compilacion completada.
echo Revise build\Release\sam_compilador.exe o build\sam_compilador.exe
pause
exit /b 0
:error
echo.
echo La compilacion fallo. Revise los mensajes anteriores.
pause
exit /b 1
