# Hướng Dẫn Cài Môi Trường Và Chạy Web Sau Khi Tải Về

Áp dụng cho codebase hiện tại:
- Frontend: `frontend-react` (Vite + React)
- Backend: `backend-java` (Spring Boot)

Tài liệu flow hệ thống hiện tại:
- `../ARCHITECTURE.md`
- `FLOW_WEB.md`

## 1) Yêu cầu môi trường

- Node.js `>= 20`
- npm `>= 10`
- Java `17`
- Maven `>= 3.9`

Kiểm tra:

```bash
node -v
npm -v
java -version
mvn -v
```

## 2) Chạy nhanh (khuyến nghị)

### Windows

Chạy file ở root:

```bat
start.bat
```

Script sẽ mở 2 terminal:
- Backend ở `http://localhost:8080`
- Frontend ở `http://localhost:5173`

Mặc định script:
- ép backend chạy profile `local` (H2 in-memory)
- tạo `JWT_SECRET` ngẫu nhiên cho phiên chạy local
- bật `APP_SEED_DEMO_DATA=true` để có tài khoản demo + dữ liệu mẫu
- không dùng MySQL
- để frontend gọi API qua Vite proxy `/api`

Sau đó truy cập:
- `http://localhost:5173`

### WSL/Linux

Nếu chạy trên WSL/Linux hoặc gặp lỗi Windows `cmd.exe - Application Error (0xc0000142)` khi mở `start.bat`, chạy script bash ở root:

```bash
./start-wsl.sh
```

Nếu đang đứng trong PowerShell Windows, gọi WSL bằng lệnh:

```powershell
wsl bash -lc 'cd "/mnt/d/Test - Copy (1)" && ./start-wsl.sh'
```

Script này chạy backend và frontend trong cùng terminal:
- Backend ở `http://localhost:8080`
- Frontend ở `http://localhost:5173`

Nhấn `Ctrl+C` trong terminal đó để dừng cả backend và frontend.

Nếu script báo port `8080` hoặc `5173` đang được dùng, nghĩa là backend/frontend đang chạy sẵn hoặc có tiến trình khác chiếm cổng. Khi web đã chạy sẵn, chỉ cần mở `http://localhost:5173`.

## 3) Chạy thủ công (mọi hệ điều hành)
Phải mở 2 terminal, chạy backend và frontend riêng biệt, và song song với nhau.


### Bước 1: chạy backend

```bash
cd backend-java
export JWT_SECRET=mot_secret_dai_it_nhat_32_bytes_cho_local
mvn spring-boot:run
```

Mặc định dùng profile `local` (H2 in-memory), không cần MySQL.

Nếu muốn có tài khoản demo và dữ liệu mẫu khi chạy local:

```bash
export APP_SEED_DEMO_DATA=true
```

### Bước 2: chạy frontend

Mở terminal khác:

```bash
cd frontend-react
npm ci
npm run dev
```

Mở trình duyệt:
- `http://localhost:5173`

## 4) Chạy backend với MySQL (tuỳ chọn)

### Windows (cmd)

```bat
cd backend-java
set JWT_SECRET=mot_secret_dai_it_nhat_32_bytes
set SPRING_PROFILES_ACTIVE=mysql
set MYSQL_HOST=127.0.0.1
set MYSQL_PORT=3306
set MYSQL_DB=wealthwallet
set MYSQL_USER=root
set MYSQL_PASSWORD=your_password
mvn spring-boot:run
```

### macOS/Linux (bash/zsh)

```bash
cd backend-java
export JWT_SECRET=mot_secret_dai_it_nhat_32_bytes
export SPRING_PROFILES_ACTIVE=mysql
export MYSQL_HOST=127.0.0.1
export MYSQL_PORT=3306
export MYSQL_DB=wealthwallet
export MYSQL_USER=root
export MYSQL_PASSWORD=your_password
mvn spring-boot:run
```

## 5) Build production

### Frontend

```bash
cd frontend-react
npm run build
npm run preview
```

### Backend

```bash
cd backend-java
mvn -DskipTests package
java -jar target/wealthwallet-api-0.1.0.jar
```

## 6) Tài khoản demo có sẵn (khi bật `APP_SEED_DEMO_DATA=true`)

Mật khẩu mặc định: `password`

- Admin: `admin@shopvui.local`
- Seller: `seller@shopvui.local`
- Staff (warehouse): `warehouse@shopvui.local`
- User: `user@shopvui.local`

## 7) URL kiểm tra sau khi chạy

- Frontend: `http://localhost:5173`
- Backend health: `http://localhost:8080/actuator/health`
- Swagger: `http://localhost:8080/swagger-ui/index.html`

## 8) Biến môi trường quan trọng

- Backend:
  - `JWT_SECRET`
  - `JWT_EXPIRATION`
  - `APP_SEED_DEMO_DATA` (`true` nếu muốn seed dữ liệu demo khi chạy local)
  - `SPRING_PROFILES_ACTIVE` (`local` hoặc `mysql`)
  - `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_DB`, `MYSQL_USER`, `MYSQL_PASSWORD` (khi dùng MySQL)
- Frontend:
  - `VITE_API_BASE_URL` (mặc định `/api`, không cần set khi local nếu dùng Vite proxy)
  - `VITE_ADMIN_DEMO_MODE` (`true` nếu muốn admin chỉ mô phỏng trên trình duyệt; mặc định là `false`)
  - `VITE_SHOW_DEMO_ACCOUNTS` (`true` nếu muốn hiện các nút điền nhanh tài khoản demo)

## 9) Lỗi thường gặp

### 1. Frontend không gọi được API

- Kiểm tra backend có chạy ở `:8080`.
- Nếu Vite báo `http proxy error` hoặc `ECONNREFUSED` cho `/api/...` thì gần như chắc backend chưa chạy hoặc vừa bị tắt.
- Kiểm tra console network: request phải vào `/api/...`.
- Nếu đổi port backend, sửa proxy trong `frontend-react/vite.config.ts` hoặc đặt `VITE_API_BASE_URL`.

### 2. Bị đá về trang login liên tục

- Token hết hạn hoặc sai -> đăng nhập lại.
- Xoá `localStorage` trình duyệt và thử lại.

### 3. `mvn` hoặc `java` không nhận lệnh

- Cài Java 17 và Maven.
- Kiểm tra `PATH`.

### 4. `npm install` lỗi do phiên bản

- Nâng Node.js lên bản LTS mới (Node 20+).
- Nếu repo có `package-lock.json`, ưu tiên `npm ci` thay cho `npm install`.

### 5. Windows báo `cmd.exe - Application Error (0xc0000142)`

- Đây là lỗi môi trường Windows khi mở `cmd.exe`, không phải lỗi trực tiếp của backend/frontend.
- Có thể chạy web qua WSL bằng `./start-wsl.sh`.
- Nếu muốn sửa Windows, mở PowerShell bằng quyền Administrator rồi chạy:

```powershell
sfc /scannow
DISM /Online /Cleanup-Image /RestoreHealth
sfc /scannow
```

## 10) Checklist xác nhận chạy thành công

1. Mở được `http://localhost:5173`.
2. Đăng nhập bằng tài khoản demo.
3. Vào được module theo role (admin/seller/staff/user).
4. Backend health trả `UP`.

## 11) Ảnh sản phẩm local cho catalog demo

Catalog demo hiện đã có đủ ảnh local:
- `42` ảnh `.jpg`, mỗi sản phẩm có 1 ảnh chính.
- Không còn dùng SVG placeholder cho sản phẩm demo khi bật seed.
- Ảnh nằm trong `frontend-react/public/product-images/`.
- Backend trả ảnh dưới dạng `/product-images/<slug>.jpg`.

Kiểm tra nhanh số ảnh:

```bash
find frontend-react/public/product-images -maxdepth 1 -type f -name '*.jpg' | wc -l
find frontend-react/public/product-images -maxdepth 1 -type f -name '*__*.jpg' | wc -l
```

Kết quả kỳ vọng:
- Dòng 1: `42`
- Dòng 2: `0`

Nếu muốn thay ảnh demo bằng ảnh sản phẩm thật:

1. Chép ảnh vào thư mục:

```bash
frontend-react/public/product-images/
```

2. Đặt tên file theo `slug` sản phẩm:

```text
ao-len-may-kem.jpg
dam-linen-vanilla-suong.jpg
tui-deo-cheo-da-mini-kem.jpg
so-mi-linen-oat-thoang-mat.jpg
```

Quy ước:
- Khuyến nghị hiện tại: 1 ảnh chính cho mỗi sản phẩm, đặt tên `<slug>.jpg`.
- Không dùng ảnh phụ kiểu `<slug>__1.jpg` cho bộ demo chấm điểm, để tránh gallery hiện ảnh thừa hoặc lệch tên sản phẩm.
- Slug tiếng Việt đã được chuẩn hoá dấu, trong đó `đ` đổi thành `d` (ví dụ `Đầm` -> `dam`, `đeo` -> `deo`).

3. Chạy lại backend với seed demo:

```bash
cd backend-java
export APP_SEED_DEMO_DATA=true
export JWT_SECRET=mot_secret_dai_it_nhat_32_bytes_cho_local
mvn spring-boot:run
```

Khi backend khởi động lại, catalog demo sẽ ưu tiên ảnh local trong `frontend-react/public/product-images/` thay cho ảnh demo/ảnh minh hoạ cũ.
