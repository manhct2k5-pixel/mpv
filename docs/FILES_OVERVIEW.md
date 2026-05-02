# Files Overview (Đã cập nhật theo code hiện tại)

## 1) Mục tiêu tài liệu

Tài liệu này mô tả:
- Thư mục nào đang được dùng để chạy hệ thống.
- Chức năng từng nhóm file chính.
- Thành phần nào là legacy/tồn dư để tránh nhầm khi bảo trì.

## 2) Cấu trúc tổng thể ở root

### Nhóm đang dùng chính

- `frontend-react/`: Ứng dụng web chính (React + Vite + TypeScript).
- `backend-java/`: API server chính (Spring Boot + JWT + JPA).
- `docs/`: Tài liệu kỹ thuật và hướng dẫn vận hành.

### Nhóm hỗ trợ

- `start.bat`: Script chạy nhanh backend + frontend trên Windows.
- `start-wsl.sh`: Script chạy nhanh backend + frontend trong WSL/Linux, không phụ thuộc `cmd.exe`.
- `ARCHITECTURE.md`: Tài liệu kiến trúc mức tổng quan.
- `render.yaml`: cấu hình deploy backend lên Render.
- `frontend-react/vercel.json`: cấu hình rewrite SPA khi deploy frontend.

## 3) Backend (`backend-java/`)

### File nền tảng

- `pom.xml`: dependencies và plugin build Maven.
- `src/main/resources/application.yml`: cấu hình profile `local` (H2) và `mysql`.
- `src/main/java/com/wealthwallet/MocMamApplication.java`: entry point Spring Boot.

### Các package chính

- `config/`
  - `SecurityConfig`: phân quyền endpoint, CORS, stateless JWT.
  - `JwtAuthenticationFilter`, `JwtUtils`: xử lý token.
  - `StoreSeedData`: seed dữ liệu demo (user, catalog, order, ticket, return request) khi bật `APP_SEED_DEMO_DATA=true`.
- `controller/`
  - `AuthController`: login/register/user/logout.
  - `AdminController`: API quản trị hệ thống.
  - `Store*Controller`: catalog, order, seller, stylist, message, wishlist, support-ticket, return-request, lookbook.
- `service/`: nghiệp vụ chính theo từng domain.
- `repository/`: tầng truy vấn JPA.
- `domain/entity/`: entity DB.
- `dto/`: request/response models.
- `utils/`: tiện ích phụ trợ.
  - `SlugUtils`: chuẩn hoá slug tiếng Việt, bao gồm chuyển `đ` thành `d`.

## 4) Frontend (`frontend-react/`)

### File nền tảng

- `package.json`: script `dev/build/preview/lint`.
- `vite.config.ts`: cấu hình dev server `5173`, proxy `/api -> :8080`.
- `src/main.tsx`: bootstrap React app.
- `src/App.tsx`: routing chính cho customer/seller/staff/admin.
- `src/index.css`: global styles.
- `public/product-images/`: 42 ảnh sản phẩm local cho catalog demo, mỗi sản phẩm dùng 1 ảnh `<slug>.jpg`.

### Thư mục `src/`

- `components/`
  - `layout/`: layout + route guards cho từng vai trò.
  - `admin/`, `ui/`, `store/`: component dùng lại theo domain.
- `pages/`: màn hình React theo từng vai trò (Storefront, Seller, Staff, Admin...).
- `services/api.ts`: lớp gọi API (axios) + interceptor auth.
- `types/`: type definitions cho app/store/admin.
- `store/`: state management (`auth`, `ui`).
- `constants/`: navigation constants, role constants, business constants.
- `data/`: mock/lightweight UI data.
- `utils/`: helper functions.

## 5) Tài liệu (`docs/`)

- `README.md`: index tài liệu.
- `HUONG_DAN_CAI_DAT_VA_CHAY_WEB.md`: hướng dẫn setup và chạy local.
- `role-agent-matrix.md`: mapping role nghiệp vụ và quyền truy cập.
- `FILES_OVERVIEW.md`: (file hiện tại) mô tả cấu trúc repository.

## 6) Luồng runtime chính

1. Frontend gọi API qua `/api` (proxy Vite khi local).
2. Backend xác thực JWT qua `Authorization: Bearer <token>`.
3. Controller -> Service -> Repository -> DB (H2/MySQL).
4. Frontend render theo role và route guard tương ứng.

## 7) Ghi chú bảo trì

- Khi thêm endpoint mới: cập nhật `controller`, `service`, `repository/dto` tương ứng và bổ sung trong `services/api.ts`.
- Khi đổi role/quyền: cập nhật đồng thời `SecurityConfig`, route guard frontend và `role-agent-matrix.md`.
- Khi thay ảnh sản phẩm demo: thêm hoặc thay file trong `frontend-react/public/product-images/`, đặt tên theo slug, rồi restart backend có `APP_SEED_DEMO_DATA=true` để seed đọc lại ảnh local.
- Các file HTML/JS/Python của stack cũ đã được dọn khỏi root repo; ưu tiên duy nhất là stack React/Spring hiện tại.
