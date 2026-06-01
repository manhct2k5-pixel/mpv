@echo off
for /f "tokens=1" %%i in ('wsl hostname -I') do set WSL_IP=%%i

set STYLE_AI_ENABLED=true
set STYLE_AI_API_KEY=stylist-local-key
set STYLE_AI_BASE_URL=http://%WSL_IP%:5001/v1
set STYLE_AI_MODEL=deepseek-v4-flash

echo DS2API URL: %STYLE_AI_BASE_URL%

cd /d "D:\Test - Copy (1)\backend-java"
mvn spring-boot:run -Dspring-boot.run.profiles=ds2api,local
