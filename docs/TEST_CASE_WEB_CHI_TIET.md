# Bộ Test Case Web Chi Tiết

Tài liệu này tổng hợp bộ test case manual chi tiết cho web hiện tại, bám theo code đang chạy trong:

- Frontend: `frontend-react`
- Backend: `backend-java`
- Router chính: `frontend-react/src/App.tsx`
- API/role hiện hành: `backend-java/src/main/java/com/wealthwallet/controller/*`, `docs/role-agent-matrix.md`

## 1. Mục tiêu

- Kiểm tra các luồng nghiệp vụ chính của hệ thống bán hàng.
- Bao phủ cả luồng public, customer, seller, staff, admin và phân quyền truy cập.
- Hỗ trợ test smoke, SIT, UAT hoặc bàn giao demo.

## 2. Môi trường kiểm thử khuyến nghị

1. Chạy local với dữ liệu demo:

```bash
cd "/mnt/d/Test - Copy (1)"
./start-wsl.sh
```

2. Truy cập:
- Frontend: `http://localhost:5173`
- Backend health: `http://localhost:8080/actuator/health`
- Swagger: `http://localhost:8080/swagger-ui/index.html`

3. Điều kiện dữ liệu:
- Backend bật `APP_SEED_DEMO_DATA=true`
- Đã seed tài khoản mẫu, sản phẩm mẫu, đơn hàng mẫu, ticket mẫu, return request mẫu, voucher mẫu

## 3. Tài khoản và dữ liệu test

### 3.1 Tài khoản demo

Mật khẩu chung: `password`

- Customer: `user@shopvui.local`
- Seller: `seller@shopvui.local`
- Staff: `warehouse@shopvui.local`
- Admin: `admin@shopvui.local`

### 3.2 Dữ liệu demo có thể dùng lại

- Voucher phần trăm: `WELCOME10`
  Điều kiện: đơn tối thiểu `200.000 đ`
- Voucher cố định: `FREESHIP30K`
  Điều kiện: đơn tối thiểu `300.000 đ`
- Có sẵn support ticket demo mã `TK-DEMO-0101` đến `TK-DEMO-0108`
- Có sẵn return request demo mã `RT-DEMO-0101` đến `RT-DEMO-0106`

## 4. Quy ước ưu tiên

- `P1`: luồng sống còn, ảnh hưởng trực tiếp tới mua hàng hoặc quyền truy cập
- `P2`: luồng nghiệp vụ quan trọng nhưng không chặn toàn hệ thống
- `P3`: luồng phụ trợ, tối ưu trải nghiệm hoặc vận hành

## 5. Danh sách test case chi tiết

## A. Public và điều hướng cơ bản

### TC-PUB-01 - Mở trang chủ thành công

- Ưu tiên: `P1`
- Mục tiêu: xác nhận storefront public tải được khi chưa đăng nhập.
- Tiền điều kiện: backend và frontend đang chạy.
- Bước thực hiện:
  1. Mở `http://localhost:5173/` trên trình duyệt mới.
  2. Quan sát banner, menu điều hướng và các block sản phẩm/lookbook.
  3. Cuộn trang và bấm thử vào một sản phẩm nổi bật.
- Kết quả mong đợi:
  1. Trang chủ tải thành công, không bị trắng trang.
  2. Không bị yêu cầu đăng nhập khi chỉ xem public content.
  3. Có thể đi tiếp sang trang chi tiết sản phẩm.

### TC-PUB-02 - Điều hướng theo danh mục và trang chi tiết sản phẩm

- Ưu tiên: `P1`
- Mục tiêu: xác nhận các route public `/san-pham`, `/nu`, `/nam`, `/phu-kien`, `/sale`, `/san-pham/:slug` hoạt động đúng.
- Tiền điều kiện: hệ thống có dữ liệu sản phẩm demo.
- Bước thực hiện:
  1. Mở lần lượt các route `/san-pham`, `/nu`, `/nam`, `/phu-kien`, `/sale`.
  2. Ở mỗi trang, chọn một sản phẩm bất kỳ.
  3. Mở trang chi tiết của sản phẩm đó.
- Kết quả mong đợi:
  1. Danh sách sản phẩm hiển thị đúng theo route.
  2. Trang chi tiết hiển thị tên, giá, ảnh, biến thể, trạng thái tồn kho.
  3. Không có lỗi `404`, `Unauthorized` hoặc lỗi render.

### TC-PUB-03 - Route được bảo vệ phải chuyển tới đăng nhập

- Ưu tiên: `P1`
- Mục tiêu: xác nhận người chưa đăng nhập không vào được route protected.
- Tiền điều kiện: đã logout hoặc dùng cửa sổ ẩn danh.
- Bước thực hiện:
  1. Truy cập trực tiếp `/gio-hang`.
  2. Truy cập trực tiếp `/thanh-toan`.
  3. Truy cập trực tiếp `/don-hang`.
  4. Truy cập trực tiếp `/tai-khoan`.
- Kết quả mong đợi:
  1. Hệ thống không cho dùng nghiệp vụ protected khi chưa có phiên đăng nhập.
  2. Người dùng được điều hướng về màn đăng nhập hoặc thấy thông báo cần đăng nhập.

### TC-PUB-04 - Xem lookbook và trang giới thiệu không cần đăng nhập

- Ưu tiên: `P3`
- Mục tiêu: xác nhận nội dung public ngoài catalog vẫn xem được.
- Tiền điều kiện: không cần đăng nhập.
- Bước thực hiện:
  1. Mở `/lookbook`.
  2. Chọn một lookbook bất kỳ để mở `/lookbook/:id`.
  3. Mở `/gioi-thieu`.
- Kết quả mong đợi:
  1. Danh sách lookbook và trang chi tiết lookbook tải thành công.
  2. Trang giới thiệu hiển thị bình thường.
  3. Không phát sinh yêu cầu xác thực.

### TC-PUB-05 - Khách vãng lai có token cũ vẫn xem được catalog

- Ưu tiên: `P1`
- Mục tiêu: xác nhận route public không bị redirect khi localStorage còn token hết hạn hoặc token sai.
- Tiền điều kiện: trình duyệt có token cũ/sai trong localStorage hoặc đăng xuất chưa sạch phiên.
- Bước thực hiện:
  1. Mở `/san-pham`.
  2. Mở một trang chi tiết `/san-pham/:slug`.
  3. Mở các route danh mục `/nu`, `/nam`, `/phu-kien`, `/sale`.
- Kết quả mong đợi:
  1. Các trang public vẫn hiển thị danh sách hoặc chi tiết sản phẩm.
  2. Token lỗi được xóa hoặc bỏ qua cho route public.
  3. Không bị chuyển về `/login` khi chỉ xem sản phẩm.

## B. Đăng ký và đăng nhập

### TC-AUTH-01 - Đăng ký tài khoản khách thành công

- Ưu tiên: `P1`
- Mục tiêu: tạo mới được tài khoản customer qua `/register`.
- Tiền điều kiện: chưa tồn tại email test.
- Dữ liệu test:
  1. Họ tên: `Test Customer Manual`
  2. Email: `test.customer.manual@example.com`
  3. Mật khẩu: `123456`
- Bước thực hiện:
  1. Mở `/register`.
  2. Nhập đầy đủ họ tên, email, mật khẩu, xác nhận mật khẩu.
  3. Tick đồng ý điều khoản.
  4. Bấm `Tạo tài khoản`.
- Kết quả mong đợi:
  1. Hiển thị thông báo đăng ký thành công.
  2. Hệ thống điều hướng về `/login`.
  3. Có thể dùng chính tài khoản vừa tạo để đăng nhập.

### TC-AUTH-02 - Validate form đăng ký khách

- Ưu tiên: `P1`
- Mục tiêu: xác nhận form đăng ký chặn dữ liệu sai ngay trên UI.
- Tiền điều kiện: mở `/register`.
- Bước thực hiện:
  1. Nhập mật khẩu dưới 6 ký tự rồi bấm submit.
  2. Nhập mật khẩu và xác nhận không khớp rồi bấm submit.
  3. Bỏ trống tick điều khoản rồi bấm submit.
- Kết quả mong đợi:
  1. Trường hợp mật khẩu ngắn hiển thị cảnh báo tối thiểu 6 ký tự.
  2. Trường hợp mật khẩu lệch hiển thị cảnh báo xác nhận chưa khớp.
  3. Trường hợp chưa đồng ý điều khoản thì không gửi request.

### TC-AUTH-03 - Đăng nhập thành công theo từng vai trò

- Ưu tiên: `P1`
- Mục tiêu: xác nhận login đúng và sau đăng nhập trở về trang chủ.
- Tiền điều kiện: đã seed dữ liệu demo.
- Dữ liệu test:
  1. `user@shopvui.local` -> đích `/`
  2. `seller@shopvui.local` -> đích `/`
  3. `warehouse@shopvui.local` -> đích `/`
  4. `admin@shopvui.local` -> đích `/`
- Bước thực hiện:
  1. Mở `/login`.
  2. Đăng nhập lần lượt bằng từng tài khoản demo.
  3. Quan sát URL sau đăng nhập.
- Kết quả mong đợi:
  1. Đăng nhập thành công và lưu phiên.
  2. Mỗi role được điều hướng về trang chủ `/`.
  3. Header hiển thị link workspace phù hợp với role nếu tài khoản có quyền vận hành.
  4. Reload trang vẫn giữ được phiên hợp lệ.

### TC-AUTH-04 - Đăng nhập thất bại với sai mật khẩu

- Ưu tiên: `P1`
- Mục tiêu: xác nhận hệ thống từ chối thông tin đăng nhập sai.
- Tiền điều kiện: tài khoản `user@shopvui.local` tồn tại.
- Bước thực hiện:
  1. Mở `/login`.
  2. Nhập email `user@shopvui.local`.
  3. Nhập mật khẩu sai.
  4. Bấm đăng nhập.
- Kết quả mong đợi:
  1. Hệ thống báo đăng nhập thất bại hoặc sai thông tin.
  2. Không sinh token hợp lệ.
  3. Không được điều hướng vào khu vực sau đăng nhập.

### TC-AUTH-05 - Đăng ký seller thành công với hồ sơ cửa hàng

- Ưu tiên: `P2`
- Mục tiêu: xác nhận luồng đăng ký người bán hoạt động đúng.
- Tiền điều kiện: chưa tồn tại email seller test.
- Bước thực hiện:
  1. Mở `/seller/register`.
  2. Nhập thông tin cửa hàng, họ tên, email, SĐT, mật khẩu, địa chỉ, mô tả.
  3. Kiểm tra ghi chú hồ sơ xác minh trên form.
  4. Tick đồng ý điều khoản và gửi đăng ký.
- Kết quả mong đợi:
  1. Hệ thống chấp nhận hồ sơ đăng ký.
  2. Hiển thị thông báo đang chờ admin duyệt.
  3. Tài khoản chưa tự động có quyền seller nếu admin chưa duyệt.

### TC-AUTH-06 - Quên mật khẩu không còn là nút rỗng

- Ưu tiên: `P3`
- Mục tiêu: xác nhận thao tác quên mật khẩu có phản hồi rõ ràng.
- Tiền điều kiện: mở `/login`.
- Bước thực hiện:
  1. Bấm `Quên mật khẩu?`.
- Kết quả mong đợi:
  1. UI hiển thị thông báo khôi phục mật khẩu chưa được cấu hình trên backend.
  2. Người dùng không bị điều hướng sai hoặc thấy thao tác không phản hồi.

## C. Customer: wishlist, giỏ hàng, checkout, đơn hàng

### TC-CUS-01 - Customer thêm sản phẩm vào wishlist

- Ưu tiên: `P2`
- Mục tiêu: xác nhận tài khoản customer có thể thêm sản phẩm yêu thích.
- Tiền điều kiện: đăng nhập bằng `user@shopvui.local`.
- Bước thực hiện:
  1. Mở một trang chi tiết sản phẩm.
  2. Bấm nút thêm vào wishlist.
  3. Mở `/yeu-thich`.
- Kết quả mong đợi:
  1. Sản phẩm được thêm vào wishlist.
  2. Danh sách `/yeu-thich` hiển thị sản phẩm vừa thêm.
  3. Khi bỏ khỏi wishlist thì danh sách cập nhật lại.

### TC-CUS-02 - Seller hoặc admin không được dùng wishlist

- Ưu tiên: `P2`
- Mục tiêu: xác nhận wishlist chỉ dành cho customer.
- Tiền điều kiện: đăng nhập bằng `seller@shopvui.local` hoặc `admin@shopvui.local`.
- Bước thực hiện:
  1. Mở một trang chi tiết sản phẩm.
  2. Bấm nút wishlist.
- Kết quả mong đợi:
  1. Hệ thống không thêm sản phẩm vào wishlist.
  2. Hiển thị thông báo wishlist chỉ dành cho customer.

### TC-CUS-03 - Thêm sản phẩm vào giỏ hàng thành công

- Ưu tiên: `P1`
- Mục tiêu: xác nhận customer thêm được biến thể hợp lệ vào giỏ.
- Tiền điều kiện: đăng nhập bằng customer, sản phẩm có tồn kho.
- Bước thực hiện:
  1. Mở chi tiết một sản phẩm còn hàng.
  2. Chọn size và màu hợp lệ.
  3. Tăng số lượng trong giới hạn tồn kho.
  4. Bấm `Thêm vào giỏ hàng`.
  5. Mở `/gio-hang`.
- Kết quả mong đợi:
  1. Hiển thị thông báo thêm giỏ thành công.
  2. Giỏ hàng xuất hiện item đúng biến thể và số lượng.
  3. Tổng tiền được tính đúng.

### TC-CUS-04 - Chặn thêm giỏ hàng khi chưa chọn biến thể hoặc hết hàng

- Ưu tiên: `P1`
- Mục tiêu: xác nhận UI chặn thao tác mua sai điều kiện.
- Tiền điều kiện: đăng nhập bằng customer.
- Bước thực hiện:
  1. Mở chi tiết sản phẩm có nhiều biến thể.
  2. Không chọn size/màu và quan sát trạng thái nút `Thêm vào giỏ hàng`.
  3. Chọn một biến thể hết hàng nếu có.
  4. Bấm tăng số lượng vượt tồn kho.
- Kết quả mong đợi:
  1. Nút mua bị vô hiệu hóa hoặc không gửi request thêm giỏ nếu chưa chọn biến thể.
  2. UI hiển thị yêu cầu chọn size/màu.
  3. Với biến thể hết hàng hoặc vượt tồn kho, UI hiển thị lỗi phù hợp và không cho cộng thêm.

### TC-CUS-05 - Cập nhật số lượng và xóa item trong giỏ hàng

- Ưu tiên: `P1`
- Mục tiêu: xác nhận giỏ hàng cho phép sửa số lượng và xóa item.
- Tiền điều kiện: giỏ hàng đã có ít nhất 1 item.
- Bước thực hiện:
  1. Mở `/gio-hang`.
  2. Bấm `+` để tăng số lượng.
  3. Bấm `-` để giảm số lượng.
  4. Bấm icon xóa của một item.
- Kết quả mong đợi:
  1. Số lượng cập nhật ngay trên UI.
  2. Thành tiền dòng và tổng tiền cập nhật đúng.
  3. Item bị xóa thì biến mất khỏi giỏ.

### TC-CUS-06 - Áp dụng voucher hợp lệ

- Ưu tiên: `P1`
- Mục tiêu: xác nhận giỏ hàng áp dụng voucher đúng điều kiện.
- Tiền điều kiện:
  1. Đăng nhập customer.
  2. Giỏ hàng có giá trị tối thiểu `200.000 đ`.
- Dữ liệu test: `WELCOME10`
- Bước thực hiện:
  1. Mở `/gio-hang`.
  2. Nhập voucher `WELCOME10`.
  3. Bấm áp dụng.
- Kết quả mong đợi:
  1. Hệ thống báo áp dụng voucher thành công.
  2. Phần giảm giá hiển thị đúng.
  3. Tổng tiền sau giảm được cập nhật.

### TC-CUS-07 - Từ chối voucher không hợp lệ hoặc chưa đủ điều kiện

- Ưu tiên: `P1`
- Mục tiêu: xác nhận voucher sai không làm hỏng giỏ hàng.
- Tiền điều kiện: đăng nhập customer.
- Dữ liệu test:
  1. Mã sai: `ABC123`
  2. Mã đúng nhưng chưa đủ min order: `FREESHIP30K` khi giỏ < `300.000 đ`
- Bước thực hiện:
  1. Nhập từng mã ở trên vào ô voucher.
  2. Bấm áp dụng.
- Kết quả mong đợi:
  1. Hệ thống hiển thị lỗi phù hợp.
  2. Không xuất hiện giảm giá sai.
  3. Giỏ hàng vẫn giữ nguyên dữ liệu item trước đó.

### TC-CUS-08 - Checkout thành công và lưu địa chỉ dùng cho lần sau

- Ưu tiên: `P1`
- Mục tiêu: xác nhận đặt hàng thành công với thông tin giao hàng hợp lệ.
- Tiền điều kiện:
  1. Đăng nhập customer.
  2. Giỏ hàng có ít nhất 1 sản phẩm.
- Bước thực hiện:
  1. Mở `/thanh-toan`.
  2. Điền đầy đủ họ tên, SĐT, địa chỉ, phường/xã, quận/huyện, thành phố, tỉnh.
  3. Tick tùy chọn lưu địa chỉ cho lần mua sau nếu UI có hiển thị.
  4. Bấm `Đặt hàng`.
- Kết quả mong đợi:
  1. Đơn hàng được tạo thành công.
  2. Hệ thống điều hướng sang `/dat-hang-thanh-cong?orderId=...`.
  3. Giỏ hàng bị làm mới.
  4. Nếu chọn lưu địa chỉ, địa chỉ mới xuất hiện trong sổ địa chỉ.

### TC-CUS-09 - Validate thiếu thông tin giao hàng khi checkout

- Ưu tiên: `P1`
- Mục tiêu: xác nhận checkout chặn dữ liệu giao hàng thiếu bắt buộc.
- Tiền điều kiện: có ít nhất 1 sản phẩm trong giỏ.
- Bước thực hiện:
  1. Mở `/thanh-toan`.
  2. Bỏ trống một hoặc nhiều trường bắt buộc như họ tên, SĐT, địa chỉ, thành phố.
  3. Bấm `Đặt hàng`.
- Kết quả mong đợi:
  1. Hệ thống không tạo đơn.
  2. Hiển thị thông báo yêu cầu nhập đủ trường giao hàng bắt buộc.

### TC-CUS-10 - Kiểm tra trang thành công đơn và danh sách đơn hàng

- Ưu tiên: `P1`
- Mục tiêu: xác nhận đơn vừa tạo hiển thị được trong lịch sử đơn.
- Tiền điều kiện: vừa tạo đơn thành công.
- Bước thực hiện:
  1. Tại trang thành công đơn, ghi nhận mã đơn hoặc order ID.
  2. Mở `/don-hang`.
  3. Chọn đơn vừa tạo để mở `/don-hang/:id`.
- Kết quả mong đợi:
  1. Đơn mới nằm trong danh sách đơn hàng.
  2. Trang chi tiết đơn hiển thị đúng sản phẩm, địa chỉ giao, trạng thái, thanh toán.

### TC-CUS-11 - Khách hàng hủy đơn khi còn trong giai đoạn cho phép

- Ưu tiên: `P1`
- Mục tiêu: xác nhận khách được hủy đơn ở trạng thái `pending`, `processing`, `confirmed`.
- Tiền điều kiện: customer có một đơn ở trạng thái cho phép hủy.
- Bước thực hiện:
  1. Mở chi tiết đơn hàng.
  2. Bấm `Hủy đơn hàng`.
  3. Tải lại trang chi tiết đơn và danh sách đơn.
- Kết quả mong đợi:
  1. Trạng thái đơn chuyển sang `cancelled`.
  2. Nút hủy không còn hiển thị nữa.
  3. Danh sách đơn cập nhật lại đúng trạng thái.

### TC-CUS-12 - Chỉnh sửa địa chỉ giao hàng trước khi đơn hoàn tất

- Ưu tiên: `P2`
- Mục tiêu: xác nhận khách sửa được thông tin giao hàng ở trạng thái còn cho phép.
- Tiền điều kiện: customer có đơn ở `pending`, `processing` hoặc `confirmed`.
- Bước thực hiện:
  1. Mở `/don-hang/:id`.
  2. Bấm `Chỉnh sửa` trong block địa chỉ giao hàng.
  3. Sửa họ tên, SĐT hoặc địa chỉ.
  4. Bấm `Lưu thay đổi`.
- Kết quả mong đợi:
  1. Hiển thị thông báo lưu thành công.
  2. Địa chỉ giao hàng trên đơn hiển thị dữ liệu mới.

### TC-CUS-13 - Gửi đánh giá sản phẩm sau khi đơn đã giao

- Ưu tiên: `P2`
- Mục tiêu: xác nhận customer có thể đánh giá sản phẩm của đơn delivered.
- Tiền điều kiện: customer có đơn ở trạng thái `delivered`.
- Bước thực hiện:
  1. Mở chi tiết đơn đã giao.
  2. Tại một item, chọn số sao.
  3. Nhập nội dung bình luận.
  4. Bấm `Gửi đánh giá`.
- Kết quả mong đợi:
  1. Hệ thống ghi nhận đánh giá thành công.
  2. Item vừa đánh giá hiển thị trạng thái đã gửi đánh giá.

### TC-CUS-14 - Tạo ticket hỗ trợ cho đơn hàng

- Ưu tiên: `P2`
- Mục tiêu: xác nhận customer tạo được support ticket.
- Tiền điều kiện: đăng nhập customer, có ít nhất 1 đơn hàng.
- Bước thực hiện:
  1. Mở `/ho-tro/yeu-cau?tab=tickets`.
  2. Chọn đơn hàng.
  3. Nhập loại vấn đề, mô tả, mức ưu tiên.
  4. Bấm gửi.
- Kết quả mong đợi:
  1. Ticket được tạo thành công.
  2. Danh sách ticket hiển thị bản ghi mới.
  3. Trạng thái ban đầu của ticket phù hợp, thường là `new`.

### TC-CUS-15 - Tạo yêu cầu đổi trả cho đơn delivered hợp lệ

- Ưu tiên: `P1`
- Mục tiêu: xác nhận customer gửi được yêu cầu hoàn trả cho đơn còn trong thời hạn.
- Tiền điều kiện:
  1. Đăng nhập customer.
  2. Có đơn `delivered`.
  3. Đơn chưa bị refund và chưa có return request trước đó.
- Bước thực hiện:
  1. Mở `/ho-tro/yeu-cau?tab=returns`.
  2. Chọn một đơn đủ điều kiện.
  3. Nhập lý do đổi trả.
  4. Upload ảnh minh chứng nếu có.
  5. Bấm gửi yêu cầu.
- Kết quả mong đợi:
  1. Tạo return request thành công.
  2. Danh sách yêu cầu đổi trả xuất hiện bản ghi mới.
  3. Đơn vừa tạo không còn xuất hiện trong danh sách eligible nếu reload lại.

### TC-CUS-16 - Quản lý sổ địa chỉ

- Ưu tiên: `P2`
- Mục tiêu: xác nhận thêm, sửa, đặt mặc định và xóa địa chỉ hoạt động đúng.
- Tiền điều kiện: đăng nhập bằng customer.
- Bước thực hiện:
  1. Mở `/tai-khoan/dia-chi`.
  2. Thêm một địa chỉ mới.
  3. Chỉnh sửa địa chỉ vừa thêm.
  4. Đặt địa chỉ đó làm mặc định.
  5. Xóa địa chỉ vừa tạo nếu không còn cần.
- Kết quả mong đợi:
  1. Danh sách địa chỉ cập nhật sau mỗi thao tác.
  2. Chỉ có một địa chỉ mặc định tại một thời điểm.
  3. Checkout lấy đúng địa chỉ mặc định hoặc địa chỉ được chọn.

### TC-CUS-17 - Đơn mới không tự chuyển giao thành công sau vài giây

- Ưu tiên: `P1`
- Mục tiêu: xác nhận trạng thái giao hàng chỉ đổi khi người có quyền cập nhật, không còn cơ chế demo tự giao 5/10 giây.
- Tiền điều kiện: customer vừa tạo đơn COD hoặc chuyển khoản.
- Bước thực hiện:
  1. Mở trang thành công đơn hoặc `/don-hang/:id`.
  2. Chờ ít nhất 15 giây rồi tải lại trang.
  3. Đăng nhập admin/staff và cập nhật trạng thái theo quy trình nếu cần.
- Kết quả mong đợi:
  1. Đơn không tự chuyển sang `delivered` chỉ vì đã chờ vài giây.
  2. Trạng thái chỉ thay đổi khi admin/seller/staff cập nhật hợp lệ.
  3. Nếu chuyển sang `delivered`, `deliveredAt` được ghi nhận tại thời điểm cập nhật.

## D. Phân quyền và route guard

### TC-ACL-01 - CustomerRoute chỉ cho customer vào luồng hỗ trợ khách

- Ưu tiên: `P1`
- Mục tiêu: xác nhận route customer-only bị chặn với role khác.
- Tiền điều kiện: đăng nhập bằng `seller@shopvui.local` hoặc `admin@shopvui.local`.
- Bước thực hiện:
  1. Truy cập `/ho-tro`.
  2. Truy cập `/ho-tro/yeu-cau`.
- Kết quả mong đợi:
  1. Không render được màn customer support.
  2. Người dùng bị điều hướng về `/tai-khoan` hoặc thấy chặn đúng theo guard.

### TC-ACL-02 - SellerRoute chỉ cho seller/admin/staff vào khu seller

- Ưu tiên: `P1`
- Mục tiêu: xác nhận user thường không vào được seller workspace.
- Tiền điều kiện: đăng nhập bằng `user@shopvui.local`.
- Bước thực hiện:
  1. Truy cập trực tiếp `/seller`.
  2. Truy cập `/seller/san-pham`.
- Kết quả mong đợi:
  1. User thường không vào được seller workspace.
  2. Hệ thống điều hướng về `/`.

### TC-ACL-03 - StaffRoute chỉ cho warehouse/admin vào khu staff

- Ưu tiên: `P1`
- Mục tiêu: xác nhận seller không vào được workspace staff.
- Tiền điều kiện: đăng nhập bằng `seller@shopvui.local`.
- Bước thực hiện:
  1. Truy cập trực tiếp `/staff`.
  2. Truy cập `/staff/returns`.
- Kết quả mong đợi:
  1. Seller không được mở màn staff.
  2. Hệ thống điều hướng theo rule hiện tại về `/seller`.

### TC-ACL-04 - AdminRoute chỉ cho admin vào khu admin

- Ưu tiên: `P1`
- Mục tiêu: xác nhận non-admin không vào được admin workspace.
- Tiền điều kiện: đăng nhập bằng `user@shopvui.local` hoặc `seller@shopvui.local`.
- Bước thực hiện:
  1. Truy cập `/admin`.
  2. Truy cập `/admin/orders`.
  3. Truy cập `/admin/manual-order`.
- Kết quả mong đợi:
  1. Chỉ admin được vào các route trên.
  2. Non-admin bị điều hướng ra ngoài hoặc bị chặn đúng guard.

### TC-ACL-05 - Luồng mua hàng chỉ dành cho customer

- Ưu tiên: `P1`
- Mục tiêu: xác nhận seller/admin không dùng được giỏ hàng, checkout, đơn mua và sổ địa chỉ khách.
- Tiền điều kiện: đăng nhập bằng `seller@shopvui.local` hoặc `admin@shopvui.local`.
- Bước thực hiện:
  1. Truy cập `/gio-hang`.
  2. Truy cập `/thanh-toan`.
  3. Truy cập `/don-hang`.
  4. Truy cập `/tai-khoan/dia-chi`.
- Kết quả mong đợi:
  1. Không gọi được nghiệp vụ mua hàng dành cho khách.
  2. UI hiển thị thông báo chức năng chỉ dành cho tài khoản khách hàng hoặc chặn đúng theo guard.

## E. Seller workspace

### TC-SEL-01 - Seller tạo sản phẩm mới có biến thể

- Ưu tiên: `P1`
- Mục tiêu: xác nhận seller tạo được sản phẩm với ít nhất một biến thể.
- Tiền điều kiện: đăng nhập bằng `seller@shopvui.local`.
- Dữ liệu test:
  1. Tên sản phẩm mới
  2. Danh mục hợp lệ
  3. Giá gốc
  4. Ít nhất 1 biến thể có size và color
- Bước thực hiện:
  1. Mở `/seller/san-pham`.
  2. Chuyển sang chế độ tạo mới nếu đang ở edit.
  3. Nhập thông tin sản phẩm.
  4. Thêm ít nhất 1 biến thể.
  5. Bấm lưu/tạo.
- Kết quả mong đợi:
  1. Tạo sản phẩm thành công.
  2. Sản phẩm mới xuất hiện trong danh sách seller products.
  3. Nếu không có biến thể hợp lệ thì hệ thống báo lỗi và không cho lưu.

### TC-SEL-02 - Seller chỉnh sửa sản phẩm và biến thể

- Ưu tiên: `P1`
- Mục tiêu: xác nhận seller cập nhật được tồn kho, giá và ảnh biến thể.
- Tiền điều kiện: seller đã có ít nhất 1 sản phẩm.
- Bước thực hiện:
  1. Mở `/seller/san-pham`.
  2. Chọn một sản phẩm hiện có.
  3. Sửa tên hoặc giá bán.
  4. Sửa số lượng tồn kho của một biến thể.
  5. Thêm một biến thể mới hoặc xóa một biến thể cũ.
  6. Lưu thay đổi.
- Kết quả mong đợi:
  1. Hệ thống cập nhật sản phẩm thành công.
  2. Dữ liệu mới hiển thị lại khi reload.
  3. Variant bị xóa không còn xuất hiện.

### TC-SEL-03 - Seller theo dõi đơn hàng, lọc và export CSV

- Ưu tiên: `P2`
- Mục tiêu: xác nhận bảng đơn của seller hỗ trợ lọc và xuất dữ liệu.
- Tiền điều kiện: đăng nhập seller, có đơn demo.
- Bước thực hiện:
  1. Mở `/seller/don-hang`.
  2. Lọc theo trạng thái.
  3. Tìm kiếm theo mã đơn.
  4. Đổi sắp xếp theo tổng tiền hoặc thời gian.
  5. Bấm export CSV.
- Kết quả mong đợi:
  1. Danh sách được lọc đúng điều kiện.
  2. File CSV được tải về với dữ liệu đang hiển thị.

### TC-SEL-04 - Seller xác nhận thanh toán chuyển khoản cho đơn hợp lệ

- Ưu tiên: `P1`
- Mục tiêu: xác nhận seller xử lý được đơn bank transfer chưa thanh toán.
- Tiền điều kiện: có đơn seller nhìn thấy với `paymentMethod = bank_transfer`, `paymentStatus = unpaid`.
- Bước thực hiện:
  1. Mở `/seller/don-hang` hoặc chi tiết `/don-hang/:id`.
  2. Chọn đơn chuyển khoản chưa xác nhận.
  3. Bấm `Xác nhận đã thanh toán`.
- Kết quả mong đợi:
  1. `paymentStatus` đổi sang `paid`.
  2. Đơn không còn nằm trong nhóm unpaid transfer.

### TC-SEL-05 - Seller tạo và cập nhật ticket vận hành

- Ưu tiên: `P2`
- Mục tiêu: xác nhận seller tạo được ticket vận hành và đổi trạng thái ticket.
- Tiền điều kiện: đăng nhập seller, có ít nhất 1 đơn.
- Bước thực hiện:
  1. Mở `/seller/van-hanh`.
  2. Nhập mã đơn hoặc order ID hợp lệ.
  3. Nhập loại vấn đề, mô tả và độ ưu tiên.
  4. Gửi ticket.
  5. Tại danh sách ticket, đổi trạng thái ticket sang `processing` hoặc `resolved`.
- Kết quả mong đợi:
  1. Ticket mới được tạo thành công.
  2. Khi đổi trạng thái, danh sách ticket cập nhật lại đúng.

## F. Staff workspace

### TC-STF-01 - Staff xem được bảng xử lý đơn và danh sách ưu tiên

- Ưu tiên: `P2`
- Mục tiêu: xác nhận staff vào được workspace và đọc được danh sách đơn.
- Tiền điều kiện: đăng nhập bằng `warehouse@shopvui.local`.
- Bước thực hiện:
  1. Mở `/staff`.
  2. Mở `/staff/orders`.
  3. Kiểm tra các block đơn chờ xử lý, đơn đóng gói, ticket, return.
- Kết quả mong đợi:
  1. Dashboard và danh sách đơn tải được.
  2. Không bị lỗi phân quyền.

### TC-STF-02 - Staff cập nhật trạng thái đơn theo flow hợp lệ

- Ưu tiên: `P1`
- Mục tiêu: xác nhận staff chỉ đẩy trạng thái theo flow kho hợp lệ.
- Tiền điều kiện: có đơn ở trạng thái `confirmed` hoặc `packing`.
- Bước thực hiện:
  1. Mở chi tiết đơn hoặc màn `/staff/status`.
  2. Với đơn `confirmed`, chuyển sang `packing`.
  3. Với đơn `packing` đã COD hoặc đã paid, chuyển sang `shipped`.
- Kết quả mong đợi:
  1. Trạng thái chuyển thành công theo thứ tự cho phép.
  2. Danh sách đơn cập nhật lại đúng.

### TC-STF-03 - Chặn staff chuyển từ packing sang shipped nếu bank transfer chưa paid

- Ưu tiên: `P1`
- Mục tiêu: xác nhận payment gating hoạt động đúng ở bước giao hàng.
- Tiền điều kiện: có đơn `packing`, `paymentMethod = bank_transfer`, `paymentStatus = unpaid`.
- Bước thực hiện:
  1. Mở chi tiết đơn.
  2. Cố chuyển trạng thái sang `shipped`.
- Kết quả mong đợi:
  1. Hệ thống không cho chuyển sang `shipped`.
  2. Hiển thị cảnh báo cần xác nhận chuyển khoản trước.

### TC-STF-04 - Staff xử lý return request theo từng bước

- Ưu tiên: `P1`
- Mục tiêu: xác nhận luồng xử lý đổi trả đúng transition.
- Tiền điều kiện: đăng nhập staff, có sẵn return request demo.
- Bước thực hiện:
  1. Mở `/staff/returns`.
  2. Chọn một request `pending_verification`.
  3. Cập nhật verdict/note.
  4. Chuyển trạng thái sang `approved` hoặc `pending_admin`.
  5. Với request đã approved, chuyển tiếp sang `collecting`, `received`, `refunded`.
- Kết quả mong đợi:
  1. Chỉ các transition hợp lệ mới được chấp nhận.
  2. Khi cập nhật thành công, trạng thái và ghi chú được lưu lại.

## G. Admin workspace

### TC-ADM-01 - Admin duyệt hoặc từ chối hồ sơ seller

- Ưu tiên: `P1`
- Mục tiêu: xác nhận admin xử lý business request đúng.
- Tiền điều kiện: có business request chờ duyệt.
- Bước thực hiện:
  1. Đăng nhập admin và mở `/admin/users`.
  2. Tại block `Yêu cầu mở gian hàng`, chọn một request.
  3. Thử `Duyệt seller`.
  4. Với request khác, thử `Từ chối`.
- Kết quả mong đợi:
  1. Request được cập nhật đúng trạng thái xử lý.
  2. User được duyệt sẽ có role seller hoặc request bị xóa khỏi danh sách chờ.

### TC-ADM-02 - Admin tìm kiếm user và đổi vai trò

- Ưu tiên: `P1`
- Mục tiêu: xác nhận admin quản lý role tài khoản thành công.
- Tiền điều kiện: đăng nhập admin.
- Bước thực hiện:
  1. Mở `/admin/users`.
  2. Tìm theo email hoặc tên.
  3. Lọc theo role.
  4. Đổi role của một tài khoản phù hợp.
  5. Lưu thay đổi.
- Kết quả mong đợi:
  1. Danh sách user lọc đúng.
  2. Vai trò mới được lưu thành công và phản ánh lại sau reload.

### TC-ADM-03 - Admin khóa và mở khóa tài khoản

- Ưu tiên: `P2`
- Mục tiêu: xác nhận admin gắn cờ/khóa tạm tài khoản và mở lại được.
- Tiền điều kiện: có user trong danh sách `/admin/users`.
- Bước thực hiện:
  1. Tại danh sách user, chọn thao tác khóa hoặc flag.
  2. Kiểm tra thông báo trạng thái.
  3. Sau đó thao tác mở khóa lại.
- Kết quả mong đợi:
  1. Hệ thống lưu thay đổi khóa/mở khóa thành công.
  2. Dữ liệu trên danh sách user và overview được cập nhật.

### TC-ADM-04 - Admin tạo, sửa và bật/tắt danh mục

- Ưu tiên: `P1`
- Mục tiêu: xác nhận admin quản trị category hoạt động đúng.
- Tiền điều kiện: đăng nhập admin.
- Bước thực hiện:
  1. Mở `/admin/catalog-config`.
  2. Tạo một danh mục mới với tên, slug, giới tính, mô tả.
  3. Chỉnh sửa lại danh mục vừa tạo.
  4. Bật/tắt trạng thái active của danh mục.
- Kết quả mong đợi:
  1. Danh mục mới xuất hiện trong bảng.
  2. Chỉnh sửa được lưu lại.
  3. Trạng thái active/hidden đổi đúng và đồng bộ sang store categories.

### TC-ADM-05 - Admin cập nhật cấu hình hệ thống

- Ưu tiên: `P2`
- Mục tiêu: xác nhận admin đổi được email hỗ trợ, số ngày refund, maintenance mode.
- Tiền điều kiện: đăng nhập admin.
- Bước thực hiện:
  1. Mở `/admin/catalog-config`.
  2. Ở phần cấu hình hệ thống, sửa `supportEmail`, `supportPhone`, `maxRefundDays`.
  3. Tick hoặc bỏ tick `maintenanceMode`.
  4. Bấm lưu.
- Kết quả mong đợi:
  1. Hệ thống báo lưu cấu hình thành công.
  2. Dữ liệu mới vẫn còn sau khi reload.

### TC-ADM-06 - Admin giám sát đơn hàng và cập nhật trạng thái

- Ưu tiên: `P1`
- Mục tiêu: xác nhận admin theo dõi và can thiệp đơn trên toàn hệ thống.
- Tiền điều kiện: đăng nhập admin, có dữ liệu đơn demo.
- Bước thực hiện:
  1. Mở `/admin/orders`.
  2. Chuyển qua các tab `Tất cả`, `Chờ xử lý`, `Đang giao`, `Hoàn tiền`.
  3. Tìm kiếm theo mã đơn.
  4. Chọn một đơn và đổi trạng thái.
  5. Với đơn bank transfer unpaid, bấm xác nhận thanh toán.
- Kết quả mong đợi:
  1. Bộ lọc tab và tìm kiếm hoạt động đúng.
  2. Trạng thái đơn đổi thành công.
  3. Payment status cập nhật đúng sau khi confirm payment.

### TC-ADM-07 - Admin xử lý hoàn tiền

- Ưu tiên: `P1`
- Mục tiêu: xác nhận admin duyệt hoặc từ chối yêu cầu refund.
- Tiền điều kiện: đăng nhập admin, có đơn đủ điều kiện xuất hiện trong `/admin/refunds`.
- Bước thực hiện:
  1. Mở `/admin/refunds`.
  2. Lọc trạng thái `pending`.
  3. Chọn một request, nhập lý do xử lý.
  4. Bấm `Duyệt`.
  5. Với request khác, bấm `Từ chối`.
- Kết quả mong đợi:
  1. Khi duyệt, đơn chuyển về trạng thái refund phù hợp và có thông báo thành công.
  2. Khi từ chối, request được chuyển sang nhóm bị từ chối.

## 6. Bộ smoke test ngắn gọn nên chạy trước mỗi buổi demo

1. `TC-PUB-01` - Mở trang chủ thành công
2. `TC-AUTH-03` - Đăng nhập thành công và về trang chủ
3. `TC-CUS-03` - Thêm giỏ hàng thành công
4. `TC-CUS-08` - Checkout thành công
5. `TC-CUS-10` - Kiểm tra danh sách đơn
6. `TC-ACL-04` - AdminRoute chặn đúng
7. `TC-ACL-05` - Luồng mua hàng chỉ dành cho customer
8. `TC-SEL-01` - Seller tạo sản phẩm
9. `TC-STF-04` - Staff xử lý đổi trả
10. `TC-ADM-06` - Admin giám sát và cập nhật đơn

## 7. Ghi chú sử dụng

- Một số test case phụ thuộc dữ liệu seed. Nếu ID đơn hoặc sản phẩm cụ thể thay đổi, có thể thay bằng một bản ghi demo tương đương cùng trạng thái.
- Nếu muốn test API song song với UI, có thể đối chiếu request/response qua Swagger.
- Nếu cần bàn giao cho QA, có thể chuyển tài liệu này sang Excel với các cột: `ID`, `Module`, `Priority`, `Precondition`, `Steps`, `Expected Result`, `Actual Result`, `Status`, `Note`.
