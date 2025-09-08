# 🔧 **Admin Dashboard - WealthWallet**

## 🎯 **Tổng quan**
Admin Dashboard cho phép bạn xem và quản lý tất cả thông tin người dùng, giao dịch và hoạt động của hệ thống WealthWallet.

---

## 🚀 **Cách truy cập Admin Dashboard**

### **Bước 1: Truy cập trang thông tin Admin**
```
http://localhost:5000/admin-info.html
```

### **Bước 2: Truy cập Admin Dashboard**
```
http://localhost:5000/admin.html
```

### **Bước 3: Admin Key (tự động)**
Admin key `wealthwallet-admin-2024` được gửi tự động trong header request.

---

## 👥 **Tài khoản Demo đã tạo**

| Email | Mật khẩu | Vai trò | Dữ liệu |
|-------|----------|---------|----------|
| `admin@wealthwallet.com` | `123456` | Quản trị viên | Đầy đủ |
| `nguyen.van.a@gmail.com` | `123456` | Nhân viên văn phòng | 40+ giao dịch |
| `tran.thi.b@gmail.com` | `123456` | Giáo viên | 30+ giao dịch |
| `le.minh.c@yahoo.com` | `123456` | Kỹ sư phần mềm | 60+ giao dịch |
| `pham.hong.d@hotmail.com` | `123456` | Nhân viên marketing | 25+ giao dịch |
| `hoang.duc.e@gmail.com` | `123456` | Sinh viên | 20+ giao dịch |

---

## 📊 **Tính năng Admin Dashboard**

### **1. Tab Tổng quan**
- **📈 Tổng người dùng**: Số lượng users đã đăng ký
- **💰 Tổng giao dịch**: Tổng số transactions trong hệ thống  
- **💵 Tổng doanh thu**: Tính toán từ tất cả income - expense
- **📊 Hoạt động 7 ngày**: Số giao dịch trong tuần qua

### **2. Tab Người dùng**
- **🔍 Tìm kiếm**: Tìm theo tên hoặc email
- **👤 User Cards**: Hiển thị thông tin tóm tắt từng user
- **📊 Thống kê user**: Số giao dịch, ngân sách, mục tiêu, số dư
- **👁️ Xem chi tiết**: Modal hiển thị đầy đủ thông tin user
- **💾 Xuất dữ liệu**: Download dữ liệu user dạng JSON

### **3. Tab Hoạt động**
- **📈 Theo dõi hoạt động**: Giao dịch gần đây (đang phát triển)
- **📊 Phân tích xu hướng**: Biểu đồ thống kê (tương lai)

---

## 🔌 **API Endpoints Admin**

### **GET /api/admin/stats**
```javascript
// Response
{
  "success": true,
  "stats": {
    "total_users": 6,
    "total_transactions": 245,
    "total_budgets": 28,
    "total_goals": 18,
    "total_income": 125000000,
    "total_expense": 98000000,
    "net_flow": 27000000,
    "recent_activity": 15
  }
}
```

### **GET /api/admin/users**
```javascript
// Response
{
  "success": true,
  "users": [
    {
      "email": "admin@wealthwallet.com",
      "name": "Admin WealthWallet",
      "created_at": "2024-09-27T14:41:46.257642",
      "last_login": "2025-08-19T14:41:46.257691",
      "phone": "0901234567",
      "monthly_income": 20000000,
      "stats": {
        "transactions": 45,
        "budgets": 5,
        "goals": 3,
        "total_income": 25000000,
        "total_expense": 18000000,
        "balance": 7000000
      }
    }
    // ... more users
  ],
  "total_users": 6
}
```

### **GET /api/admin/user/<email>**
```javascript
// Response  
{
  "success": true,
  "user": { /* detailed user info */ },
  "transactions": [ /* last 10 transactions */ ],
  "budgets": [ /* user budgets */ ],
  "goals": [ /* user goals */ ]
}
```

---

## 🛠️ **Cách sử dụng Admin Dashboard**

### **1. Khởi động server**
```bash
cd "d:\Năm 3\Test - Copy"
python app.py
```

### **2. Truy cập trang admin**
- Mở browser: `http://localhost:5000/admin-info.html`
- Click "Truy cập Admin Dashboard"

### **3. Xem thống kê tổng quan**
- Tab "Tổng quan" hiển thị metrics quan trọng
- Theo dõi số lượng users, giao dịch, doanh thu

### **4. Quản lý người dùng**
- Tab "Người dùng" → Danh sách tất cả users
- Tìm kiếm theo tên/email
- Click "Xem chi tiết" để xem thông tin đầy đủ
- Click "Xuất dữ liệu" để download

### **5. Xem chi tiết từng user**
- Modal hiển thị:
  - ✅ Thông tin cá nhân đầy đủ
  - ✅ 10 giao dịch gần nhất
  - ✅ Danh sách ngân sách & mục tiêu
  - ✅ Thống kê tổng quan

---

## 🔐 **Bảo mật Admin**

### **Hiện tại (Demo)**
- Admin key: `wealthwallet-admin-2024` (hardcoded)
- Không có authentication phức tạp
- Chỉ check header `Admin-Key`

### **Production (Khuyến nghị)**
```javascript
// Nên implement:
- JWT authentication cho admin
- Role-based access control
- Rate limiting
- Logging admin activities
- Environment variables cho keys
- HTTPS required
```

---

## 📱 **Mobile Responsive**
- ✅ Desktop: Grid layout đầy đủ
- ✅ Tablet: 2 columns responsive  
- ✅ Mobile: Single column, optimized UI

---

## 🐛 **Troubleshooting**

### **Lỗi "Không có quyền truy cập"**
```
Nguyên nhân: Admin-Key không đúng
Giải pháp: Kiểm tra code gửi header Admin-Key
```

### **Không load được dữ liệu**
```
Nguyên nhân: Flask server chưa chạy
Giải pháp: python app.py
```

### **Modal không hiển thị**
```
Nguyên nhân: JavaScript error
Giải pháp: Mở Developer Tools → Console
```

---

## 🎨 **Customization**

### **Thay đổi Admin Key**
```python
# app.py line 1041
if admin_key != 'your-new-admin-key':
```

### **Thêm field mới**
```python
# app.py - get_all_users()
user_info = {
    'email': email,
    'name': user_data.get('name'),
    'your_new_field': user_data.get('your_field', 'default')
}
```

### **Custom styling**
```css
/* admin.html - <style> section */
.stat-card.custom {
    border-top-color: #your-color;
}
```

---

## 🚀 **Kết luận**

**Admin Dashboard WealthWallet** cung cấp:
- ✅ **Xem tất cả users** với thông tin chi tiết
- ✅ **Thống kê hệ thống** realtime
- ✅ **Quản lý dữ liệu** user hiệu quả
- ✅ **Giao diện responsive** đẹp mắt
- ✅ **API endpoints** đầy đủ

**🎯 Sẵn sàng sử dụng ngay!** Truy cập `http://localhost:5000/admin-info.html` để bắt đầu!