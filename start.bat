@echo off
echo ========================================
echo Starting Lynko App...
echo ========================================

IF NOT EXIST "node_modules\" (
    echo First time running on this computer!
    echo Installing required dependencies... this may take a minute.
    call npm install
)

echo.
echo Starting the development server...
echo ----------------------------------------
call npx expo start -c
pause
