# Product Images

Thư mục này chứa ảnh sản phẩm local để web ưu tiên dùng thay cho ảnh demo/SVG placeholder.

Trạng thái hiện tại:
- Có `42` ảnh `.jpg`, tương ứng 42 sản phẩm demo đang seed.
- Mỗi sản phẩm dùng 1 ảnh chính theo dạng `<slug>.jpg`.
- Không còn ảnh phụ dạng `<slug>__1.jpg` trong bộ demo hiện tại.
- Tổng dung lượng khoảng `5.9 MB`.

Kiểm tra nhanh:

```bash
find frontend-react/public/product-images -maxdepth 1 -type f -name '*.jpg' | wc -l
find frontend-react/public/product-images -maxdepth 1 -type f -name '*__*.jpg' | wc -l
```

Kết quả kỳ vọng:
- `42`
- `0`

Quy tắc đặt tên:
- Khuyến nghị: 1 ảnh chính cho mỗi sản phẩm, đặt tên `<slug>.jpg`.
- Không dùng ảnh phụ kiểu `<slug>__1.jpg` cho bộ demo chấm điểm, để tránh gallery hiện ảnh thừa hoặc lệch tên sản phẩm.
- Backend ưu tiên file local theo slug khi chạy seed demo.

Ví dụ:
- `ao-len-may-kem.jpg`
- `dam-linen-vanilla-suong.jpg`
- `tui-deo-cheo-da-mini-kem.jpg`
- `so-mi-linen-oat-thoang-mat.jpg`

Đuôi hỗ trợ:
- `.jpg`
- `.jpeg`
- `.png`
- `.webp`
- `.avif`

Lưu ý:
- `slug` là slug sản phẩm trong hệ thống, ví dụ `ao-len-may-kem`.
- Slug tiếng Việt được chuẩn hoá dấu, trong đó `đ` đổi thành `d`.
- Sau khi thêm ảnh, chạy lại backend có seed demo để catalog cập nhật ảnh.
- Ảnh trong thư mục này sẽ được trả về dưới dạng đường dẫn `/product-images/<ten-file>`.
