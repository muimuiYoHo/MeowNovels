@echo off
chcp 936 >nul
setlocal
cd /d "%~dp0"
set APP_PLATFORM=android
set JAVA_HOME=D:\ProgramData\jdk-21.0.2
set ANDROID_HOME=D:\ProgramData\A-SDK
set PATH=D:\ProgramData\nodejs;D:\ProgramData\A-SDK\platform-tools;%PATH%

rem Release build for arm64 only, producing a SIGNED apk + aab.
rem
rem Signing lives in:
rem   gen\android\key.properties          (store/key passwords, alias, jks path)
rem   gen\android\app\build.gradle.kts    (signingConfigs -> release buildType)
rem Keep a backup of gen\android\meownovels-release.jks! Losing it means you can
rem never ship an update for the same applicationId again.
rem
rem has_std keeps indexmap 1.9.3 on its std branch wherever RUSTFLAGS reaches;
rem the host-side copy of indexmap is fixed by the [build-dependencies] entry
rem in src-tauri\Cargo.toml. See the comment there for the full story.

set RUSTFLAGS=--cfg has_std

echo [1/2] frontend build
call npm.cmd run build
if errorlevel 1 goto :fail

echo.
echo [2/2] android release build (arm64)
call npm.cmd run tauri -- android build --target aarch64
if errorlevel 1 goto :fail

echo.
echo [MeowNovels] artifacts
echo   APK  src-tauri\gen\android\app\build\outputs\apk\universal\release\
echo   AAB  src-tauri\gen\android\app\build\outputs\bundle\universalRelease\
exit /b 0

:fail
echo.
echo [MeowNovels] FAILED, exit code %ERRORLEVEL%
exit /b 1
