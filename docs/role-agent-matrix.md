# Role-Agent Matrix (Cập nhật theo hệ thống hiện tại)

## 1) Runtime roles trong backend

- `USER`
- `SELLER`
- `WAREHOUSE` (staff role hiện hành)
- `ADMIN`

Ghi chú tương thích:

- `STYLES` chỉ còn là role legacy để đọc dữ liệu/token cũ nếu còn tồn tại.
- Luồng hiện tại không tạo mới, không seed demo và không hiển thị `styles` như một role vận hành riêng.

## 2) Mapping nghiệp vụ chuẩn hoá

| Actor nghiệp vụ | Runtime role | Route UI chính | Trách nhiệm |
|---|---|---|---|
| Customer / Buyer | `USER` | `/`, `/gio-hang`, `/thanh-toan`, `/don-hang`, `/ho-tro` | Mua hàng, theo dõi đơn, nhận hỗ trợ |
| Seller / Merchant | `SELLER` | `/seller/*` | Quản lý sản phẩm, xử lý đơn, báo cáo, vận hành |
| Staff / Vận hành | `WAREHOUSE` | `/staff/*` | Xử lý đơn nội bộ, QC, vận đơn, ticket, đổi trả |
| Admin / System admin | `ADMIN` | `/admin/*` | Giám sát hệ thống, user/staff, phân quyền, cấu hình, hoàn tiền |
| Payment Gateway | Không phải account | N/A | Hệ thống ngoài xử lý thanh toán |
| Shipping Carrier | Không phải account | N/A | Hệ thống ngoài xử lý vận chuyển |

## 3) Quy ước role trên UI

- UI chỉ hiển thị `warehouse` như role staff hiện hành.
- Nếu backend còn trả dữ liệu legacy `styles`, UI normalize về `warehouse` để hiển thị và điều hướng.
- Một số màn trong seller workspace vẫn cho phép staff/admin truy cập để phối hợp vận hành.

## 4) Phân quyền API mức cao (theo `SecurityConfig`)

- Public:
  - `POST /api/login`, `POST /api/register`, `POST /api/register/seller`
  - `GET /api/store/categories*`, `GET /api/store/products*`, `GET /api/store/lookbooks*`, `GET /api/store/stylists`
- Admin-only:
  - `/api/admin/**`
- Product management:
  - `POST|PUT|DELETE /api/store/products/**` -> `ADMIN | SELLER | WAREHOUSE`
- Lookbook management:
  - `POST|PUT|DELETE /api/store/lookbooks/**` -> `ADMIN | WAREHOUSE`
- Manual order:
  - `POST /api/store/orders/manual` -> `ADMIN`
- Các endpoint `/api/**` còn lại:
  - yêu cầu authenticated, kiểm soát chi tiết theo service/business rules.

## 5) Lưu ý khi mở rộng role/quyền

1. Cập nhật backend trước (`UserAccount.Role`, `SecurityConfig`, logic service).
2. Đồng bộ frontend route-guard (`AdminRoute`, `StaffRoute`, `SellerRoute`, `CustomerRoute`).
3. Đồng bộ navigation trong layout/sidebar.
4. Cập nhật lại tài liệu này ngay sau khi merge.
