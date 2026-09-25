@echo off
chcp 936 >nul
setlocal
cd /d "%~dp0"
set APP_PLATFORM=android
echo [Miao] browser HMR http://localhost:1420
call npm.cmd run dev
pause
endlocal