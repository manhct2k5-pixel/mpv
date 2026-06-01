# Lệnh Chạy Backend Và Frontend

## Cách nhanh nhất trên Windows

Chạy tại thư mục gốc của project:

```bat
cd /d "D:\Test - Copy (1)"
start.bat
```

`start.bat` sẽ tự:
- chạy backend với profile local
- bật `APP_SEED_DEMO_DATA=true`
- chạy frontend bằng Vite

## Chạy kèm AI Stylist qua DS2API

Nếu muốn AI Stylist dùng API trong `ds2api-main`, tạo file cấu hình DS2API trước:

```bat
copy ds2api-main\config.wealthwallet.example.json ds2api-main\config.json
```

Sau đó mở `ds2api-main\config.json`, giữ key `stylist-local-key` hoặc đổi theo ý bạn, rồi điền DeepSeek account/token thật trong phần `accounts`.

Chạy full stack trên Windows:

```bat
cd /d "D:\Test - Copy (1)"
start-ai-stylist.bat
```

Script này chạy:
- DS2API API server ở `http://127.0.0.1:5001`
- backend với profile `local,ds2api`
- frontend ở `http://localhost:5173`

Nếu chạy WSL/Linux:

```bash
cp ds2api-main/config.wealthwallet.example.json ds2api-main/config.json
# sửa ds2api-main/config.json rồi chạy
./start-wsl-ds2api.sh
```

Backend AI Stylist sẽ gọi DS2API qua:

```text
DS2API_BASE_URL=http://127.0.0.1:5001/v1
DS2API_API_KEY=stylist-local-key
STYLE_AI_MODEL=deepseek-v4-flash
```

## Cách chạy trên WSL/Linux

Nếu Windows báo `cmd.exe - Application Error (0xc0000142)` khi chạy `start.bat`, mở terminal WSL tại thư mục gốc project và chạy:

```bash
./start-wsl.sh
```

Script này chạy cả backend và frontend trong cùng terminal. Nhấn `Ctrl+C` để dừng.

Nếu đang ở PowerShell Windows, chạy trực tiếp qua WSL:

```powershell
wsl bash -lc 'cd "/mnt/d/Test - Copy (1)" && ./start-wsl.sh'
```

Nếu script báo port `8080` hoặc `5173` đang được dùng, kiểm tra xem web đã chạy sẵn chưa:

```bash
ss -ltnp
```

Khi app đã chạy, mở `http://localhost:5173`.

## Chạy backend riêng

Mở `cmd` hoặc terminal mới:

```bat
cd /d "D:\Test - Copy (1)\backend-java"
set SPRING_PROFILES_ACTIVE=local
set JWT_SECRET=ww_local_demo_secret_1234567890123456
set JWT_EXPIRATION=86400000
set APP_SEED_DEMO_DATA=true
mvn spring-boot:run
```

Nếu đang đứng ở thư mục gốc project thì có thể chạy:

```bat
cd /d "D:\Test - Copy (1)"
set SPRING_PROFILES_ACTIVE=local
set JWT_SECRET=ww_local_demo_secret_1234567890123456
set JWT_EXPIRATION=86400000
set APP_SEED_DEMO_DATA=true
mvn -f backend-java\pom.xml spring-boot:run
```

## Chạy frontend riêng

Mở `cmd` hoặc terminal mới:

```bat
cd /d "D:\Test - Copy (1)\frontend-react"
npm install
npm run dev
```

Nếu đã có `node_modules` rồi thì chỉ cần:

```bat
cd /d "D:\Test - Copy (1)\frontend-react"
npm run dev
```

## Địa chỉ sau khi chạy

- Frontend: `http://localhost:5173`
- Backend health: `http://localhost:8080/actuator/health`
- API login: `http://localhost:8080/api/login`
- Swagger: `http://localhost:8080/swagger-ui/index.html`

## Tài khoản demo

Khi backend bật `APP_SEED_DEMO_DATA=true`, có thể dùng:

- `user@shopvui.local`
- `seller@shopvui.local`
- `warehouse@shopvui.local`
- `admin@shopvui.local`

Mật khẩu chung:

```text
password
```

## Lưu ý

- Lệnh `mvn spring-boot:run` phải chạy trong `backend-java` hoặc dùng `-f backend-java\pom.xml`
- Nếu backend không lên, kiểm tra Java 17 và Maven đã cài chưa
- Nếu frontend không lên, kiểm tra Node.js đã cài chưa
- Catalog demo hiện có 42 ảnh local trong `frontend-react/public/product-images/`, backend sẽ ưu tiên các ảnh này khi bật `APP_SEED_DEMO_DATA=true`.
- AI Stylist dùng DS2API khi backend chạy profile `ds2api` hoặc có các biến `STYLE_AI_BASE_URL`/`STYLE_AI_API_KEY`.
