@echo off
setlocal enabledelayedexpansion
title WealthWallet - Khoi dong

cls
echo ============================================================
echo   WealthWallet / Moc Mam Boutique  -  Startup v2.1
echo ============================================================
echo.

REM ── [1/4] Kiem tra Java ─────────────────────────────────────
echo [1/4] Kiem tra Java...
java -version >nul 2>&1
if errorlevel 1 (
    echo [LOI] Java khong tim thay.
    echo       Cai Java 17+ tai: https://adoptium.net/
    echo.
    pause & exit /b 1
)
echo [OK] Java san sang.

REM ── [2/4] Kiem tra Maven ────────────────────────────────────
echo [2/4] Kiem tra Maven...
mvn -version >nul 2>&1
if errorlevel 1 (
    echo [LOI] Maven khong tim thay.
    echo       Cai Maven tai: https://maven.apache.org/download.cgi
    echo       Sau do them thu muc bin\ vao bien moi truong PATH.
    echo.
    pause & exit /b 1
)
echo [OK] Maven san sang.

REM ── [3/4] Kiem tra Node.js ──────────────────────────────────
echo [3/4] Kiem tra Node.js...
node -v >nul 2>&1
if errorlevel 1 (
    echo [LOI] Node.js khong tim thay.
    echo       Cai Node.js 18+ tai: https://nodejs.org/
    echo.
    pause & exit /b 1
)
for /f %%v in ('node -v') do set NODE_VER=%%v
echo [OK] Node.js %NODE_VER% san sang.

REM ── [4/4] Kiem tra / cai node_modules ──────────────────────
echo [4/4] Kiem tra node_modules...
if not exist "%~dp0frontend-react\node_modules\rollup" (
    echo      Chua co node_modules hoac bi loi, dang cai lai...
    pushd "%~dp0frontend-react"
    if exist node_modules rmdir /s /q node_modules
    if exist package-lock.json del /f /q package-lock.json
    call npm install --silent
    if errorlevel 1 (
        echo [LOI] npm install that bai. Kiem tra ket noi mang va thu lai.
        popd
        pause & exit /b 1
    )
    popd
    echo [OK] npm packages da cai xong.
) else (
    echo [OK] node_modules da co san.
)

REM ── Khoi dong Backend ────────────────────────────────────────
echo.
echo >> Khoi dong Backend (Spring Boot + H2 + demo data)...
start "WealthWallet-Backend-8080" cmd /k "title WealthWallet - Backend [:8080] && cd /d "%~dp0backend-java" && set SPRING_PROFILES_ACTIVE=local && mvn -q -DskipTests "-Dspring-boot.run.jvmArguments=-Dapp.seed.demo-data=true" spring-boot:run"

REM ── Cho Backend san sang (poll /actuator/health) ─────────────
echo    Cho Backend san sang (co the mat 30-60 giay)...
set /a RETRY=0
:wait_backend
timeout /t 3 /nobreak >nul
set /a RETRY+=1
powershell -NoProfile -Command "try { Invoke-WebRequest -Uri 'http://localhost:8080/actuator/health' -UseBasicParsing -TimeoutSec 2 | Out-Null; exit 0 } catch { exit 1 }" >nul 2>&1
if errorlevel 1 (
    if !RETRY! lss 50 (
        set /a SHOW=!RETRY! %% 5
        if !SHOW!==0 (
            set /a SECS=!RETRY! * 3
            echo    ... dang cho (!SECS!s)
        )
        goto wait_backend
    )
    echo [LOI] Backend khong phan hoi sau 150 giay.
    echo       Mo cua so "WealthWallet-Backend-8080" de xem loi.
    pause & exit /b 1
)
echo [OK] Backend dang chay tai http://localhost:8080

REM ── Khoi dong Frontend ───────────────────────────────────────
echo >> Khoi dong Frontend (Vite dev server)...
start "WealthWallet-Frontend-5173" cmd /k "title WealthWallet - Frontend [:5173] && cd /d "%~dp0frontend-react" && set VITE_SHOW_DEMO_ACCOUNTS=true && npm run dev"

REM ── Cho Frontend san sang roi mo browser ────────────────────
echo    Cho Frontend san sang...
set /a RETRY=0
:wait_frontend
timeout /t 2 /nobreak >nul
set /a RETRY+=1
powershell -NoProfile -Command "try { Invoke-WebRequest -Uri 'http://localhost:5173' -UseBasicParsing -TimeoutSec 2 | Out-Null; exit 0 } catch { exit 1 }" >nul 2>&1
if errorlevel 1 (
    if !RETRY! lss 20 goto wait_frontend
    echo [WARN] Frontend chua phan hoi - thu mo thu cong: http://localhost:5173
) else (
    echo [OK] Frontend dang chay tai http://localhost:5173
)

echo >> Mo trinh duyet...
start "" "http://localhost:5173"

REM ── Tong ket ─────────────────────────────────────────────────
echo.
echo ============================================================
echo   He thong da khoi dong thanh cong!
echo.
echo   Frontend : http://localhost:5173
echo   Backend  : http://localhost:8080
echo   Swagger  : http://localhost:8080/swagger-ui/index.html
echo   H2 DB    : http://localhost:8080/h2-console
echo.
echo   Tai khoan demo (mat khau deu la:  password ):
echo     user@shopvui.local       - Khach hang thuong
echo     vip@shopvui.local        - Khach hang VIP
echo     buyer@shopvui.local      - Khach hang moi
echo     seller@shopvui.local     - Nguoi ban hang
echo     warehouse@shopvui.local  - Nhan vien kho
echo     admin@shopvui.local      - Quan tri vien
echo.
echo   Dong cua so nay khong anh huong den cac server.
echo ============================================================
echo.
pause
endlocal
