@echo off
setlocal enabledelayedexpansion
title Lynko - Fast Standalone APK Compiler

echo ============================================================
echo   Lynko Mobile - Standalone APK Compiler (No-Daemon Mode)
echo ============================================================

set "PROJECT_DIR=%~dp0"
cd /d "%PROJECT_DIR%"

if exist "%LOCALAPPDATA%\Android\Sdk" (
    set "ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk"
    echo [INFO] Detected Android SDK: !ANDROID_HOME!
)

if not defined JAVA_HOME (
    if exist "C:\Program Files\Android\Android Studio\jbr" (
        set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
        set "PATH=%JAVA_HOME%\bin;%PATH%"
        echo [INFO] Detected Java JDK: !JAVA_HOME!
    )
)

echo.
echo [1/3] Prebuilding Native Android Project...
call npx expo prebuild --platform android --no-install
if %errorlevel% neq 0 (
    echo [ERROR] Expo prebuild failed!
    pause
    exit /b %errorlevel%
)

if exist "%PROJECT_DIR%android" (
    echo sdk.dir=!ANDROID_HOME:\=\\!> "%PROJECT_DIR%android\local.properties"
)

echo.
echo [2/3] Compiling Standalone APK (--no-daemon --parallel)...
cd android
call gradlew assembleRelease --no-daemon -x lint -x test
if %errorlevel% neq 0 (
    echo [ERROR] Gradle build failed!
    cd ..
    pause
    exit /b %errorlevel%
)

cd ..

set "OUTPUT_APK=%PROJECT_DIR%android\app\build\outputs\apk\release\app-release.apk"
set "FINAL_APK=%PROJECT_DIR%Lynko.apk"

if exist "%OUTPUT_APK%" (
    copy /y "%OUTPUT_APK%" "%FINAL_APK%" >nul
    echo.
    echo ============================================================
    echo   [SUCCESS] Standalone APK compiled successfully!
    echo   File: %FINAL_APK%
    echo ============================================================
) else (
    echo [ERROR] Could not find compiled APK at: %OUTPUT_APK%
)

pause
