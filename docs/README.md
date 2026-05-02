# Tài Liệu Dự Án

Tài liệu trong thư mục `docs/` đã được cập nhật theo codebase hiện tại: **Frontend React + Backend Spring Boot**.

## 1) Tổng quan hệ thống

- Frontend: `frontend-react` (React 18, Vite, TypeScript, React Query, Zustand).
- Backend: `backend-java` (Spring Boot 3, Spring Security + JWT, JPA, H2/MySQL).
- API base: `/api` (frontend local dùng proxy sang `http://localhost:8080`).

## 2) Tài liệu chính trong thư mục này

- `HUONG_DAN_CAI_DAT_VA_CHAY_WEB.md`: Hướng dẫn cài môi trường và chạy hệ thống từ đầu.
- `FLOW_WEB.md`: Flow sử dụng web theo route, role và các luồng chính.
- `FILES_OVERVIEW.md`: Giải thích cấu trúc thư mục và chức năng từng nhóm file.
- `role-agent-matrix.md`: Bảng ánh xạ vai trò nghiệp vụ, quyền truy cập và route UI.
- `TEST_CASE_WEB_CHI_TIET.md`: Bộ test case manual chi tiết cho public/customer/seller/staff/admin.

## 3) Luồng chạy local nhanh

1. Chạy backend ở `backend-java` (port `8080`).
2. Chạy frontend ở `frontend-react` (port `5173`).
3. Mở `http://localhost:5173`.

Chi tiết lệnh, biến môi trường, tài khoản demo: xem `HUONG_DAN_CAI_DAT_VA_CHAY_WEB.md`.

Nếu chạy trên WSL/Linux, có thể dùng script root:

```bash
./start-wsl.sh
```

## 4) Phân hệ chức năng chính

- Customer/User: xem sản phẩm, giỏ hàng, thanh toán, đơn hàng, wishlist, hỗ trợ.
- Seller: dashboard, sản phẩm, đơn hàng, báo cáo, đánh giá, vận hành/ticket, hồ sơ shop.
- Staff: xử lý đơn, QC/đóng gói, vận đơn, ticket, đổi trả, timeline trạng thái.
- Admin: tổng quan, user/staff, phân quyền, danh mục & cấu hình, đơn hàng, báo cáo, hoàn tiền, logs.

## 5) Tài nguyên kỹ thuật

- Swagger UI: `http://localhost:8080/swagger-ui/index.html`
- Health check: `http://localhost:8080/actuator/health`
- Cấu hình backend: `backend-java/src/main/resources/application.yml`
- Cấu hình Vite/proxy: `frontend-react/vite.config.ts`
- Ảnh sản phẩm local: `frontend-react/public/product-images/` (`42` ảnh `.jpg`, mỗi sản phẩm demo có 1 ảnh chính)
