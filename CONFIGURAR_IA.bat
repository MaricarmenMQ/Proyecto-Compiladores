@echo off
setlocal
cd /d "%~dp0"
echo =====================================================
echo   SAM-LANG STUDIO - CONFIGURACION DE IA MULTIMODELO
echo =====================================================
echo.
echo Se abrira SAM-Lang Studio en http://127.0.0.1:3000
echo Usa el boton "Configurar IA" para conectar Gemini, OpenAI,
echo Claude, DeepSeek, Groq u Ollama.
echo.
call ABRIR_WEB.bat
