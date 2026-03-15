# 4.2. Mô tả mã nguồn và quy trình xử lý (WealthWallet)

## 1) Giải thích các đoạn mã chính (Controller, Model, View)
**Controller (C)** — nhận request, kiểm tra quyền, gọi service:
- `AuthController` (`/api/login|register|user`): `login()` kiểm tra email/password qua `UserService.login`, trả JWT; `register()` tạo user mới; `me()/update()` lấy/cập nhật hồ sơ.
- `FinanceController`: 
  - `overview()` trả `OverviewResponse` tổng thu/chi/balance.
  - `transactions()` nhận query `page`, `type`, `from/to` → ép kiểu enum, chuẩn hóa thời gian → gọi `TransactionService.list`.
  - `create/update/delete` giao dịch (`/transaction`) thao tác trực tiếp với `TransactionService`.
  - CRUD budgets/goals, list investments, list/đánh dấu notifications.
- `AdminController` (`/api/admin/**`): `users()` map thông tin người dùng kèm thống kê; `flagUser()` gắn/ bỏ cờ `Transaction.Status.FLAGGED` cho user được chọn.
- `ToolController` (`/api/tools/*`): gọi `ToolService` tính lãi kép, tiết kiệm định kỳ, PIT.

**Model (M)** — nghiệp vụ + dữ liệu:
- **Entity** (bảng DB, `domain/entity`): `UserAccount` (role USER/ADMIN, bcrypt password), `Transaction` (type/status, `user_id`), `Budget`, `Goal` (status), `Investment`, `Notification` (type, readFlag). Mọi entity con `@ManyToOne UserAccount`.
- **Repository** (`repository/*`): Spring Data JPA sinh SQL từ tên hàm, ví dụ `findByUserAndOccurredAtBetweenOrderByOccurredAtDesc` lọc giao dịch theo user + khoảng thời gian.
- **Service** (`service/*`):
  - `UserService` hiện thực `UserDetailsService`, mã hóa mật khẩu, sinh JWT (`JwtUtils`), lấy user hiện tại từ `SecurityContext`.
  - `TransactionService` phân trang/lọc, tạo/update/xóa có kiểm tra sở hữu; update đặt lại các field từ request.
  - `BudgetService`, `GoalService`, `InvestmentService`, `NotificationService` CRUD theo user; `NotificationService.markAllRead` set `readFlag=true`.
  - `OverviewService` tính tổng thu/chi, balance, savingsRate, build dữ liệu biểu đồ.
  - `ToolService` các công thức tính lãi, tích lũy, thuế PIT.

**View (V)** — React ở `frontend-react/` (pages/components) gọi API `/api/**` để render bảng giao dịch, ngân sách, mục tiêu, biểu đồ.

## 2) Quy trình xử lý (request → response)
1. Client gửi HTTP JSON (kèm `Authorization: Bearer <JWT>` nếu đã đăng nhập).
2. `JwtAuthenticationFilter` lấy token từ header, `JwtUtils.validateToken` + `getUsernameFromToken` → load `UserDetails` qua `UserService` → gắn vào `SecurityContext`.
3. `SecurityConfig` áp quyền: public (`/api/login`, `/api/register`, OPTIONS, actuator, h2-console), authenticated (`/api/**`), admin (`/api/admin/**`).
4. DispatcherServlet điều phối tới Controller; `@Valid` trên DTO (vd. `TransactionRequest`) kiểm tra input.
5. Service xử lý nghiệp vụ, kiểm tra sở hữu user; Repository JPA đọc/ghi MySQL.
6. Entity/DTO trả về → Jackson serialize JSON → front-end render.

### Ví dụ luồng tạo giao dịch (cụ thể code + vị trí)
- Request: `POST /api/transaction` body `TransactionRequest`.
- Controller: `createTransaction` tại `backend-java/src/main/java/com/wealthwallet/controller/FinanceController.java` (nhận DTO `@Valid`, lấy user hiện tại `userService.getCurrentUser()`).
- Service: `create` tại `backend-java/src/main/java/com/wealthwallet/service/TransactionService.java`:
  - `Transaction.builder()` gán `user`, `description`, `category`, `amount`, `type`, `accountName`, `occurredAt`, mặc định `status=CLEARED`.
  - `transactionRepository.save(transaction)` lưu bảng `ww_transactions` (FK `user_id`).
- Response: JSON giao dịch mới (có `id`).

### Ví dụ luồng đăng nhập (login)
- Request: `POST /api/login` body `{"email":"...","password":"..."}`.
- Controller: `login` tại `backend-java/src/main/java/com/wealthwallet/controller/AuthController.java`.
- Service: `login` tại `backend-java/src/main/java/com/wealthwallet/service/UserService.java`:
  - Tìm user theo email, `passwordEncoder.matches` với `passwordHash`.
  - Nếu hợp lệ → `JwtUtils.generateTokenFromUsername(email)` (file `config/JwtUtils.java`).
- Response: `{ "token": "<jwt>" }`; front-end lưu token và gửi header `Authorization: Bearer <jwt>`.

### Ví dụ thêm/sửa/xóa giao dịch (locations)
- Thêm: `POST /api/transaction` → `FinanceController.createTransaction` → `TransactionService.create` (đường dẫn như trên).
- Sửa: `PUT /api/transaction/{id}` → `FinanceController.updateTransaction` → `TransactionService.update` (file service): `findById`, kiểm tra `user_id`, set `description/category/amount/type/accountName/occurredAt`, save.
- Xóa: `DELETE /api/transaction?id={id}` → `TransactionService.delete` (file service): `findById`, kiểm tra sở hữu, `transactionRepository.deleteById`.

### Ví dụ thêm/sửa/xóa ngân sách (Budget)
- Thêm: `POST /api/budgets` → `FinanceController.createBudget` → `BudgetService.create` tại `service/BudgetService.java` (gán user, set default `spentAmount`/`trend`, save).
- Sửa: `PUT /api/budgets/{id}` → `FinanceController.updateBudget` → `BudgetService.update` (findByIdAndUser, set category/limit/spent/trend, save).
- Xóa: `DELETE /api/budgets/{id}` → `FinanceController.deleteBudget` → `BudgetService.delete` (findByIdAndUser, delete).

### Ví dụ thêm/sửa/xóa mục tiêu (Goal)
- Thêm: `POST /api/goals` → `FinanceController.createGoal` → `GoalService.create` tại `service/GoalService.java` (gán user, default `currentAmount` nếu null, save).
- Sửa: `PUT /api/goals/{id}` → `FinanceController.updateGoal` → `GoalService.update` (findByIdAndUser, set name/target/current/dueDate/status, save).
- Xóa: `DELETE /api/goals/{id}` → `FinanceController.deleteGoal` → `GoalService.delete` (findByIdAndUser, delete).

## 3) Mối liên hệ giữa module và cơ sở dữ liệu
- Bảng ↔ Entity (Hibernate + `data.sql` khởi tạo):
  - `ww_users` ↔ `UserAccount` (role, passwordHash, cấu hình UI).
  - `ww_transactions` ↔ `Transaction` (type, status, occurred_at, FK `user_id`).
  - `ww_budgets` ↔ `Budget`; `ww_goals` ↔ `Goal`; `ww_investments` ↔ `Investment`; `ww_notifications` ↔ `Notification`.
- Quan hệ: User 1–N cho tất cả bảng con qua `user_id`. AdminController cũng thao tác Transaction để FLAG/UNFLAG.
- Repo luôn nhận tham số `UserAccount user` để giới hạn phạm vi dữ liệu theo user đăng nhập (Service kiểm tra trước khi ghi/xóa).

## 4) Cấu hình & dữ liệu mẫu
- `application.yml`: MySQL `jdbc:mysql://localhost:3306/wealthwallet`, `ddl-auto: update`, `spring.sql.init.mode=always` để chạy `data.sql`.
- `data.sql`: dọn bảng, seed 3 user (USER/ADMIN), nhiều giao dịch/budget/goal/investment/notification 6 tháng gần đây; mật khẩu demo đã BCrypt sẵn.

## 5) Thành phần bảo mật
- JWT HS256, secret `jwt.secret` và hạn `jwt.expiration` cấu hình ngoài (mặc định sẵn giá trị dài).
- Stateless session; CORS mở (`*`, GET/POST/PUT/DELETE/PATCH/OPTIONS).
- Password dùng `BCryptPasswordEncoder`.

## 6) Chạy nhanh back-end
1. Bật MySQL, tạo DB `wealthwallet`.
2. `cd backend-java && mvn spring-boot:run` (port 8080). Swagger UI: `http://localhost:8080/swagger-ui.html` (nếu starter bật UI).
