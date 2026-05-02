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
