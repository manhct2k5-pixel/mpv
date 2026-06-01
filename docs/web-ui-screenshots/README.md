# Ảnh Chụp Giao Diện Web

Đã chụp 52/52 giao diện ở viewport 1440px.

## Cấu Trúc Thư Mục

- `guest-public/`: Guest / Public - Khách chưa đăng nhập (15 ảnh)
- `customer-buyer/`: Customer / Buyer - Khách hàng (10 ảnh)
- `seller-merchant/`: Seller / Merchant - Người bán (8 ảnh)
- `staff-warehouse/`: Staff / Vận hành - Nhân viên kho/CSKH (8 ảnh)
- `admin-system-admin/`: Admin / System Admin - Quản trị hệ thống (11 ảnh)
- `manifest.json`: dữ liệu route, actor, file ảnh và URL cuối sau khi render.

## Route Động Đã Dùng

- `/san-pham/set-picnic-sage-latte-cuoi-tuan`
- `/lookbook/6`
- `/don-hang/28`
- `/dat-hang-thanh-cong?orderId=28`

## Phân Loại Theo Actor

### Guest / Public - Khách chưa đăng nhập

| Ảnh | Route | Giao diện |
|---|---|---|
| [guest-public/01-trang-chu.png](guest-public/01-trang-chu.png) | `/` | Trang chủ |
| [guest-public/02-danh-sach-san-pham.png](guest-public/02-danh-sach-san-pham.png) | `/san-pham` | Danh sách sản phẩm |
| [guest-public/03-danh-muc-nu.png](guest-public/03-danh-muc-nu.png) | `/nu` | Danh mục Nữ |
| [guest-public/04-danh-muc-nam.png](guest-public/04-danh-muc-nam.png) | `/nam` | Danh mục Nam |
| [guest-public/05-danh-muc-phu-kien.png](guest-public/05-danh-muc-phu-kien.png) | `/phu-kien` | Danh mục Phụ kiện |
| [guest-public/06-sale.png](guest-public/06-sale.png) | `/sale` | Sale |
| [guest-public/07-chi-tiet-san-pham.png](guest-public/07-chi-tiet-san-pham.png) | `/san-pham/set-picnic-sage-latte-cuoi-tuan` | Chi tiết sản phẩm |
| [guest-public/08-lookbook.png](guest-public/08-lookbook.png) | `/lookbook` | Lookbook |
| [guest-public/09-chi-tiet-lookbook.png](guest-public/09-chi-tiet-lookbook.png) | `/lookbook/6` | Chi tiết lookbook |
| [guest-public/10-gioi-thieu.png](guest-public/10-gioi-thieu.png) | `/gioi-thieu` | Giới thiệu |
| [guest-public/11-dang-nhap.png](guest-public/11-dang-nhap.png) | `/login` | Đăng nhập |
| [guest-public/12-dang-ky-khach-hang.png](guest-public/12-dang-ky-khach-hang.png) | `/register` | Đăng ký khách hàng |
| [guest-public/13-dang-ky-khach-hang-alias.png](guest-public/13-dang-ky-khach-hang-alias.png) | `/dang-ky-khach-hang` | Đăng ký khách hàng - alias |
| [guest-public/14-dang-ky-nguoi-ban.png](guest-public/14-dang-ky-nguoi-ban.png) | `/seller/register` | Đăng ký người bán |
| [guest-public/15-dang-ky-nguoi-ban-alias.png](guest-public/15-dang-ky-nguoi-ban-alias.png) | `/dang-ky-nguoi-ban` | Đăng ký người bán - alias |

### Customer / Buyer - Khách hàng

| Ảnh | Route | Giao diện |
|---|---|---|
| [customer-buyer/01-tai-khoan.png](customer-buyer/01-tai-khoan.png) | `/tai-khoan` | Tài khoản khách hàng |
| [customer-buyer/02-so-dia-chi.png](customer-buyer/02-so-dia-chi.png) | `/tai-khoan/dia-chi` | Sổ địa chỉ |
| [customer-buyer/03-gio-hang.png](customer-buyer/03-gio-hang.png) | `/gio-hang` | Giỏ hàng |
| [customer-buyer/04-thanh-toan.png](customer-buyer/04-thanh-toan.png) | `/thanh-toan` | Thanh toán |
| [customer-buyer/05-dat-hang-thanh-cong.png](customer-buyer/05-dat-hang-thanh-cong.png) | `/dat-hang-thanh-cong?orderId=28` | Đặt hàng thành công |
| [customer-buyer/06-don-hang.png](customer-buyer/06-don-hang.png) | `/don-hang` | Đơn hàng của tôi |
| [customer-buyer/07-chi-tiet-don-hang.png](customer-buyer/07-chi-tiet-don-hang.png) | `/don-hang/28` | Chi tiết đơn hàng |
| [customer-buyer/08-yeu-thich.png](customer-buyer/08-yeu-thich.png) | `/yeu-thich` | Yêu thích |
| [customer-buyer/09-ho-tro.png](customer-buyer/09-ho-tro.png) | `/ho-tro` | Hỗ trợ CSKH |
| [customer-buyer/10-yeu-cau-ho-tro.png](customer-buyer/10-yeu-cau-ho-tro.png) | `/ho-tro/yeu-cau` | Yêu cầu hỗ trợ |

### Seller / Merchant - Người bán

| Ảnh | Route | Giao diện |
|---|---|---|
| [seller-merchant/01-seller-workspace.png](seller-merchant/01-seller-workspace.png) | `/seller` | Seller workspace |
| [seller-merchant/02-quan-ly-san-pham.png](seller-merchant/02-quan-ly-san-pham.png) | `/seller/san-pham` | Quản lý sản phẩm |
| [seller-merchant/03-don-hang-seller.png](seller-merchant/03-don-hang-seller.png) | `/seller/don-hang` | Đơn hàng seller |
| [seller-merchant/04-bao-cao-seller.png](seller-merchant/04-bao-cao-seller.png) | `/seller/bao-cao` | Báo cáo seller |
| [seller-merchant/05-ho-so-shop.png](seller-merchant/05-ho-so-shop.png) | `/seller/ho-so` | Hồ sơ shop |
| [seller-merchant/06-danh-gia-seller.png](seller-merchant/06-danh-gia-seller.png) | `/seller/danh-gia` | Đánh giá seller |
| [seller-merchant/07-van-hanh-seller.png](seller-merchant/07-van-hanh-seller.png) | `/seller/van-hanh` | Vận hành seller |
| [seller-merchant/08-tin-nhan-seller.png](seller-merchant/08-tin-nhan-seller.png) | `/seller/tickets` | Tin nhắn seller |

### Staff / Vận hành - Nhân viên kho/CSKH

| Ảnh | Route | Giao diện |
|---|---|---|
| [staff-warehouse/01-staff-dashboard.png](staff-warehouse/01-staff-dashboard.png) | `/staff` | Staff dashboard |
| [staff-warehouse/02-xu-ly-don-hang.png](staff-warehouse/02-xu-ly-don-hang.png) | `/staff/orders` | Xử lý đơn hàng |
| [staff-warehouse/03-qc-dong-goi.png](staff-warehouse/03-qc-dong-goi.png) | `/staff/qc-packing` | QC và đóng gói |
| [staff-warehouse/04-van-don.png](staff-warehouse/04-van-don.png) | `/staff/shipments` | Vận đơn |
| [staff-warehouse/05-ticket-staff.png](staff-warehouse/05-ticket-staff.png) | `/staff/tickets` | Ticket staff |
| [staff-warehouse/06-doi-tra.png](staff-warehouse/06-doi-tra.png) | `/staff/returns` | Đổi trả |
| [staff-warehouse/07-timeline-trang-thai.png](staff-warehouse/07-timeline-trang-thai.png) | `/staff/status` | Timeline trạng thái |
| [staff-warehouse/08-ho-so-staff.png](staff-warehouse/08-ho-so-staff.png) | `/staff/profile` | Hồ sơ staff |

### Admin / System Admin - Quản trị hệ thống

| Ảnh | Route | Giao diện |
|---|---|---|
| [admin-system-admin/01-admin-dashboard.png](admin-system-admin/01-admin-dashboard.png) | `/admin` | Admin dashboard |
| [admin-system-admin/02-quan-ly-users.png](admin-system-admin/02-quan-ly-users.png) | `/admin/users` | Quản lý users |
| [admin-system-admin/03-quan-ly-staff.png](admin-system-admin/03-quan-ly-staff.png) | `/admin/staff` | Quản lý staff |
| [admin-system-admin/04-phan-quyen.png](admin-system-admin/04-phan-quyen.png) | `/admin/permissions` | Phân quyền |
| [admin-system-admin/05-danh-muc-cau-hinh.png](admin-system-admin/05-danh-muc-cau-hinh.png) | `/admin/catalog-config` | Danh mục và cấu hình |
| [admin-system-admin/06-don-hang-admin.png](admin-system-admin/06-don-hang-admin.png) | `/admin/orders` | Đơn hàng admin |
| [admin-system-admin/07-tao-don-thu-cong.png](admin-system-admin/07-tao-don-thu-cong.png) | `/admin/manual-order` | Tạo đơn thủ công |
| [admin-system-admin/08-bao-cao-admin.png](admin-system-admin/08-bao-cao-admin.png) | `/admin/reports` | Báo cáo admin |
| [admin-system-admin/09-hoan-tien.png](admin-system-admin/09-hoan-tien.png) | `/admin/refunds` | Hoàn tiền |
| [admin-system-admin/10-nhat-ky-he-thong.png](admin-system-admin/10-nhat-ky-he-thong.png) | `/admin/logs` | Nhật ký hệ thống |
| [admin-system-admin/11-tai-khoan-admin.png](admin-system-admin/11-tai-khoan-admin.png) | `/admin/account` | Tài khoản admin |

## Route Redirect Không Chụp Riêng

- `/dashboard`
- `/transactions`
- `/budgets`
- `/goals`
- `/investments`
- `/tools`
- `/settings`
- `/seller/control-center`
- `/admin/system`
- `*`
