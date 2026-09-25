@echo off
chcp 936 >nul
setlocal
cd /d "%~dp0"
set APP_PLATFORM=android
set JAVA_HOME=D:\ProgramData\jdk-21.0.2
set ANDROID_HOME=D:\ProgramData\A-SDK
set PATH=D:\ProgramData\nodejs;D:\ProgramData\A-SDK\platform-tools;%PATH%

echo [MeowNovels] tauri android build --debug
call npm.cmd run tauri -- android build --debug
if errorlevel 1 goto :fail

set SRC=src-tauri\gen\android\app\build\outputs\apk\universal\debug\app-universal-debug.apk
set OUTDIR=%~dp0..\..\dist
if not exist "%OUTDIR%" mkdir "%OUTDIR%"
set DEST=%OUTDIR%\miao-novel-debug.apk
if exist "%DEST%" del /f /q "%DEST%"
move /y "%SRC%" "%DEST%"
if errorlevel 1 goto :fail

echo.
echo [MeowNovels] APK:
echo   %DEST%
echo.
explorer /select,"%DEST%"
pause
exit /b 0

:fail
echo [MeowNovels] FAIL %ERRORLEVEL%
pause
exit /b 1