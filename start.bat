@echo off
echo =========================================
echo    WealthWallet - Personal Finance App
echo =========================================
echo.
echo Starting Flask server...
echo.

cd /d "%~dp0"

echo Checking Python installation...
python --version
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python from https://python.org
    pause
    exit /b 1
)

echo.
echo Installing required packages if needed...
pip install flask flask-cors werkzeug --quiet
if %errorlevel% neq 0 (
    echo Warning: Could not install packages. App may not work properly.
)

echo.
echo Starting WealthWallet server...
echo.
echo Server will be available at:
echo   http://localhost:5000
echo   http://127.0.0.1:5000
echo.
echo Pages you can visit:
echo   http://localhost:5000/          - Home page
echo   http://localhost:5000/auth.html - Login/Register  
echo   http://localhost:5000/app.html  - Dashboard
echo   http://localhost:5000/test.html - System test
echo.
echo Press Ctrl+C to stop the server
echo =========================================
echo.

python app.py

echo.
echo Server stopped.
pause