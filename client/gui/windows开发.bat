@echo off
chcp 936 >nul
setlocal
cd /d "%~dp0"
set APP_PLATFORM=win
echo [MeowNovels] APP_PLATFORM=win
call npm.cmd run tauri dev
pause
endlocal