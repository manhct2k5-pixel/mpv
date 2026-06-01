@echo off
setlocal enabledelayedexpansion
title WealthWallet - AI Stylist DS2API

set "ROOT=%~dp0"
set "DS2API_PORT=5001"
if "%DS2API_API_KEY%"=="" set "DS2API_API_KEY=stylist-local-key"
if "%DS2API_ADMIN_KEY%"=="" set "DS2API_ADMIN_KEY=admin"
if "%STYLE_AI_MODEL%"=="" set "STYLE_AI_MODEL=deepseek-v4-flash"

if not exist "%ROOT%ds2api-main\config.json" (
    echo [LOI] Chua co ds2api-main\config.json
    echo       Hay copy ds2api-main\config.wealthwallet.example.json thanh config.json,
    echo       sau do dien DeepSeek account/token cua ban.
    pause & exit /b 1
)

where go >nul 2>&1
if errorlevel 1 (
    echo [LOI] Chua cai Go. DS2API can Go de chay local.
    pause & exit /b 1
)

echo ^>^> Khoi dong DS2API API server tai http://127.0.0.1:%DS2API_PORT% ...
start "DS2API-5001" cmd /k "title DS2API [:5001] && cd /d ""%ROOT%ds2api-main"" && set PORT=%DS2API_PORT% && set DS2API_ADMIN_KEY=%DS2API_ADMIN_KEY% && set DS2API_CONFIG_PATH=config.json && go run ./cmd/ds2api"

echo    Cho DS2API san sang...
set /a RETRY=0
:wait_ds2api
timeout /t 2 /nobreak >nul
set /a RETRY+=1
powershell -NoProfile -Command "try { Invoke-WebRequest -Uri 'http://127.0.0.1:%DS2API_PORT%/healthz' -UseBasicParsing -TimeoutSec 2 | Out-Null; exit 0 } catch { exit 1 }" >nul 2>&1
if errorlevel 1 (
    if !RETRY! lss 45 goto wait_ds2api
    echo [LOI] DS2API khong phan hoi sau 90 giay.
    pause & exit /b 1
)

echo ^>^> Khoi dong Backend voi profile local,ds2api ...
start "WealthWallet-Backend-8080" cmd /k "title WealthWallet - Backend AI Stylist [:8080] && cd /d ""%ROOT%backend-java"" && set SPRING_PROFILES_ACTIVE=local,ds2api && set JWT_SECRET=ww_local_demo_secret_1234567890123456 && set JWT_EXPIRATION=86400000 && set APP_SEED_DEMO_DATA=true && set DS2API_BASE_URL=http://127.0.0.1:%DS2API_PORT%/v1 && set DS2API_API_KEY=%DS2API_API_KEY% && set STYLE_AI_MODEL=%STYLE_AI_MODEL% && set STYLE_AI_ENABLED=true && mvn -q -DskipTests spring-boot:run"

echo    Cho Backend san sang...
set /a RETRY=0
:wait_backend
timeout /t 3 /nobreak >nul
set /a RETRY+=1
powershell -NoProfile -Command "try { Invoke-WebRequest -Uri 'http://localhost:8080/actuator/health' -UseBasicParsing -TimeoutSec 2 | Out-Null; exit 0 } catch { exit 1 }" >nul 2>&1
if errorlevel 1 (
    if !RETRY! lss 50 goto wait_backend
    echo [LOI] Backend khong phan hoi sau 150 giay.
    pause & exit /b 1
)

echo ^>^> Khoi dong Frontend ...
start "WealthWallet-Frontend-5173" cmd /k "title WealthWallet - Frontend [:5173] && cd /d ""%ROOT%frontend-react"" && set VITE_SHOW_DEMO_ACCOUNTS=true && npm run dev"

echo.
echo Da khoi dong AI Stylist stack:
echo   DS2API   : http://127.0.0.1:%DS2API_PORT%
echo   Backend  : http://localhost:8080
echo   Frontend : http://localhost:5173
echo.
start "" "http://localhost:5173"
