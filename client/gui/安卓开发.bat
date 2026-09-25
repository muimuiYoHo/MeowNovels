@echo off
chcp 936 >nul
setlocal
cd /d "%~dp0"
set APP_PLATFORM=android
set JAVA_HOME=D:\ProgramData\jdk-21.0.2
set ANDROID_HOME=D:\ProgramData\A-SDK
set PATH=D:\ProgramData\nodejs;D:\ProgramData\A-SDK\platform-tools;%PATH%

rem WHY VITE IS STARTED MANUALLY HERE:
rem tauri-cli spawns build.beforeDevCommand as a bare executable path with no
rem shell involved, so a multi-word command like "npm run dev" always dies with
rem `failed to run ...`. beforeDevCommand / beforeBuildCommand are therefore left
rem empty on purpose. Run `npm.cmd run build` yourself before `tauri android build`.
rem
rem HOW HOT RELOAD REACHES THE PHONE OVER PLAIN USB:
rem --host 127.0.0.1 rewrites build.devUrl so the app requests its own loopback,
rem and adb reverse tunnels that loopback back to this machine. No WiFi or
rem same-LAN requirement.

adb devices
adb reverse tcp:1420 tcp:1420

echo [MeowNovels] starting Vite dev server...
start /b "" cmd /c "set APP_PLATFORM=android&& npm.cmd run dev"

ping -n 6 127.0.0.1 >nul

echo [MeowNovels] building and installing the Android app...
call npm.cmd run tauri -- android dev --host 127.0.0.1

echo.
echo [MeowNovels] exit code %ERRORLEVEL%
pause
endlocal
