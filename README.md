# WealthWallet - Personal Finance Management System

## 🚀 Khởi động nhanh

### Cách 1: Sử dụng file khởi động (Recommended)
1. Double-click vào file `start.bat`
2. Đợi server khởi động
3. Mở trình duyệt và truy cập http://localhost:5000

### Cách 2: Khởi động thủ công
```bash
# Mở terminal/command prompt tại thư mục project
cd "d:\Năm 3\Test - Copy"

# Cài đặt dependencies
pip install flask flask-cors werkzeug

# Chạy ứng dụng
python app.py
```

## 📱 Truy cập ứng dụng

| URL | Mô tả |
|-----|-------|
| http://localhost:5000 | 🏠 Trang chủ |
| http://localhost:5000/auth.html | 🔐 Đăng nhập/Đăng ký |
| http://localhost:5000/app.html | 📊 Dashboard chính |
| http://localhost:5000/test.html | 🔧 Kiểm tra hệ thống |

## ✨ Tính năng chính

### 🔐 Xác thực người dùng
- [x] Đăng ký tài khoản mới
- [x] Đăng nhập/Đăng xuất
- [x] Session management
- [x] Password hashing (Werkzeug)

### 💰 Quản lý giao dịch
- [x] Thêm thu/chi
- [x] Phân loại theo danh mục
- [x] Lọc theo thời gian
- [x] Xóa giao dịch

### 📊 Ngân sách & Mục tiêu
- [x] Thiết lập ngân sách cho từng danh mục
- [x] Theo dõi chi tiêu
- [x] Đặt mục tiêu tiết kiệm
- [x] Cập nhật tiến độ mục tiêu

### 📈 Phân tích & Báo cáo
- [x] Biểu đồ tài chính (Chart.js)
- [x] Thống kê thu chi
- [x] Phân tích xu hướng
- [x] Dashboard tổng quan

## 🏗️ Cấu trúc project

```
WealthWallet/
├── 📄 index.html          # Trang chủ
├── 🔐 auth.html           # Đăng nhập/Đăng ký  
├── 📊 app.html            # Dashboard chính
├── 🔧 test.html           # Kiểm tra hệ thống
├── 🐍 app.py              # Flask backend
├── 🚀 start.bat           # Script khởi động
├── 📁 styles/             # CSS files
│   ├── main.css           # Trang chủ
│   ├── auth.css           # Đăng nhập
│   └── app.css            # Dashboard
├── 📁 scripts/            # JavaScript files
│   ├── main.js            # Trang chủ  
│   ├── auth.js            # Đăng nhập
│   └── app.js             # Dashboard
└── 📁 data/               # JSON database
    ├── users.json         # Tài khoản người dùng
    ├── transactions.json  # Giao dịch
    ├── budgets.json       # Ngân sách
    └── goals.json         # Mục tiêu tiết kiệm
```

## 🔧 API Endpoints

### Authentication
- `POST /api/register` - Đăng ký tài khoản
- `POST /api/login` - Đăng nhập
- `GET /api/logout` - Đăng xuất
- `GET /api/user` - Thông tin user

### Transactions
- `POST /api/transaction` - Thêm giao dịch
- `GET /api/transactions` - Danh sách giao dịch
- `DELETE /api/transaction/<id>` - Xóa giao dịch

### Dashboard
- `GET /api/overview` - Dữ liệu tổng quan
- `GET /api/analysis` - Dữ liệu phân tích

### Budgets & Goals
- `POST /api/budget` - Thiết lập ngân sách
- `GET /api/budgets` - Danh sách ngân sách
- `POST /api/goal` - Thêm mục tiêu
- `GET /api/goals` - Danh sách mục tiêu
- `PUT /api/goal/<id>` - Cập nhật mục tiêu
- `DELETE /api/goal/<id>` - Xóa mục tiêu

## 📱 Responsive Design

Ứng dụng được thiết kế responsive, hoạt động tốt trên:
- 💻 Desktop (1200px+)
- 📱 Tablet (768px - 1199px)
- 📱 Mobile (< 768px)

## 🛡️ Bảo mật

- ✅ Password được hash bằng Werkzeug
- ✅ Session-based authentication
- ✅ Input validation & sanitization
- ✅ CORS protection

## 🎨 UI/UX Features

- ✨ Modern design với CSS3
- 🌈 Custom CSS variables cho theming
- ⚡ Smooth animations & transitions
- 📊 Interactive charts (Chart.js)
- 🔔 Toast notifications
- 📱 Mobile-first approach

## 🔍 Debugging & Testing

### Kiểm tra hệ thống
Truy cập http://localhost:5000/test.html để:
- ✅ Kiểm tra kết nối API
- ✅ Kiểm tra data files
- ✅ Kiểm tra session management
- ✅ Xem thông tin hệ thống

### Logs & Debug
- Server logs hiển thị trong terminal
- Browser Console để debug JavaScript
- Network tab để kiểm tra API calls

## 🚀 Production Deployment

Để deploy production:

1. **Cài đặt production server**:
```bash
pip install gunicorn
gunicorn --bind 0.0.0.0:5000 app:app
```

2. **Sử dụng reverse proxy** (nginx/apache)

3. **Environment variables**:
```bash
export FLASK_ENV=production
export SECRET_KEY=your-secret-key
```

4. **Database migration** (nếu cần):
   - Chuyển từ JSON sang PostgreSQL/MySQL
   - Implement database migrations

## 🤝 Contributing

1. Fork the project
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Support

Nếu gặp vấn đề:
1. Kiểm tra http://localhost:5000/test.html
2. Xem logs trong terminal
3. Check browser console
4. Create an issue on GitHub

---

**Made with ❤️ for personal finance management**