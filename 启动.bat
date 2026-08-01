@echo off
chcp 65001 >nul
echo 🚀 正在启动言语表达训练...
echo.
cd /d "%~dp0"
start "" http://localhost:3000
call npm run dev
pause
