@echo off
where npx >nul 2>nul
if %errorlevel%==0 (npx serve .) else (echo Instale Node.js para usar "npx serve .")
pause
