@echo off
chcp 936 >nul
setlocal
cd /d "%~dp0"
set APP_PLATFORM=android
set JAVA_HOME=D:\ProgramData\jdk-21.0.2
set ANDROID_HOME=D:\ProgramData\A-SDK
set PATH=D:\ProgramData\nodejs;D:\ProgramData\A-SDK\platform-tools;%PATH%

echo [MeowNovels] build APK arm64-v8a only
call npm.cmd run tauri -- android build --debug --target aarch64
if errorlevel 1 goto :fail

set SRC=src-tauri\gen\android\app\build\outputs\apk\arm64\debug\app-arm64-debug.apk
if not exist "%SRC%" set SRC=src-tauri\gen\android\app\build\outputs\apk\universal\debug\app-universal-debug.apk
set OUTDIR=%~dp0..\..\dist
if not exist "%OUTDIR%" mkdir "%OUTDIR%"
set DEST=%OUTDIR%\miao-novel-arm64-debug.apk
if exist "%DEST%" del /f /q "%DEST%"
move /y "%SRC%" "%DEST%"
echo.
echo [MeowNovels] APK: %DEST%
explorer /select,"%DEST%"
pause
exit /b 0

:fail
echo [MeowNovels] FAIL %ERRORLEVEL%
pause
exit /b 1