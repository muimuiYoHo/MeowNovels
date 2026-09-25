@echo off
chcp 936 >nul
setlocal
cd /d "%~dp0"
set APP_PLATFORM=android
set JAVA_HOME=D:\ProgramData\jdk-21.0.2
set ANDROID_HOME=D:\ProgramData\A-SDK
set PATH=D:\ProgramData\nodejs;D:\ProgramData\A-SDK\platform-tools;%PATH%
set ANDROID_SERIAL=1586783c

echo [MeowNovels] hot reload on 1586783c
call npm.cmd run tauri -- android dev 1586783c
pause
endlocal
