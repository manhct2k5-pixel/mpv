document.addEventListener('DOMContentLoaded', function() {
    // Kiểm tra trạng thái đăng nhập
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    if (!isLoggedIn || isLoggedIn !== 'true') {
        window.location.href = 'auth.html?tab=login';
        return;
    }

    // Khai báo biến toàn cục
    const API_BASE_URL = window.location.origin.includes('localhost') ? 'http://localhost:5000/api' : '/api';
    let financeChart = null;

    // Hiển thị thông tin người dùng
    const userName = localStorage.getItem('userName');
    const userEmail = localStorage.getItem('userEmail');
    
    if (userName) {
        document.getElementById('userName').textContent = userName;
        document.getElementById('userGreeting').textContent = userName;
    }

    // Hiển thị ngày hiện tại
    const currentDate = new Date();
    const formattedDate = currentDate.toLocaleDateString('vi-VN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    document.getElementById('currentDate').textContent = formattedDate;

    // Xử lý đăng xuất
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            fetch(`${API_BASE_URL}/logout`, {
                method: 'GET',
                credentials: 'include'
            })
            .then(() => {
                localStorage.removeItem('isLoggedIn');
                localStorage.removeItem('userName');
                localStorage.removeItem('userEmail');
                window.location.href = 'index.html';
            })
            .catch(() => {
                localStorage.removeItem('isLoggedIn');
                localStorage.removeItem('userName');
                localStorage.removeItem('userEmail');
                window.location.href = 'index.html';
            });
        });
    }

    // Xử lý toggle sidebar trên mobile
    const sidebarToggle = document.querySelector('.sidebar-toggle');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    document.body.appendChild(overlay);

    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', function() {
            sidebar.classList.toggle('show');
            overlay.classList.toggle('show');
        });
    }

    overlay.addEventListener('click', function() {
        sidebar.classList.remove('show');
        overlay.classList.remove('show');
    });

    // Xử lý modal giao dịch
    const transactionModal = document.getElementById('transactionModal');
    const addTransactionForm = document.getElementById('addTransactionForm');
    const typeButtons = document.querySelectorAll('.type-btn');
    let currentTransactionType = 'income';

    // Xử lý nút thao tác nhanh
    document.querySelectorAll('.action-btn').forEach(button => {
        button.addEventListener('click', function() {
            const action = this.getAttribute('data-action');
            
            if (action === 'add-income' || action === 'add-expense') {
                openTransactionModal(action === 'add-income' ? 'income' : 'expense');
            } else if (action === 'set-budget') {
                window.location.href = 'budgets.html';
            } else if (action === 'add-goal') {
                window.location.href = 'goals.html';
            }
        });
    });

    // Xử lý chuyển đổi loại giao dịch
    typeButtons.forEach(button => {
        button.addEventListener('click', function() {
            typeButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            currentTransactionType = this.getAttribute('data-type');
            updateCategoryOptions(currentTransactionType);
        });
    });

    // Mở modal thêm giao dịch
    function openTransactionModal(type = 'income') {
        // Đặt loại giao dịch
        currentTransactionType = type;
        typeButtons.forEach(btn => {
            btn.classList.remove('active');
            if (btn.getAttribute('data-type') === type) {
                btn.classList.add('active');
            }
        });
        
        updateCategoryOptions(type);
        
        // Đặt ngày và giờ mặc định
        const now = new Date();
        const dateString = now.toISOString().split('T')[0];
        const timeString = now.toTimeString().substring(0, 5);
        
        document.getElementById('transactionDate').value = dateString;
        document.getElementById('transactionTime').value = timeString;
        
        // Hiển thị modal
        transactionModal.classList.add('show');
    }

    // Cập nhật tùy chọn danh mục theo loại giao dịch
    function updateCategoryOptions(type) {
        const categorySelect = document.getElementById('transactionCategory');
        const incomeCategories = categorySelect.querySelector('optgroup[label="Thu nhập"]').querySelectorAll('option');
        const expenseCategories = categorySelect.querySelector('optgroup[label="Chi tiêu"]').querySelectorAll('option');
        
        if (type === 'income') {
            incomeCategories.forEach(opt => opt.style.display = 'block');
            expenseCategories.forEach(opt => opt.style.display = 'none');
        } else {
            incomeCategories.forEach(opt => opt.style.display = 'none');
            expenseCategories.forEach(opt => opt.style.display = 'block');
        }
        
        categorySelect.value = '';
    }

    // Đóng modal
    document.querySelectorAll('.modal-close, [data-dismiss="modal"]').forEach(button => {
        button.addEventListener('click', function() {
            transactionModal.classList.remove('show');
            addTransactionForm.reset();
        });
    });

    // Xử lý submit form thêm giao dịch
    if (addTransactionForm) {
        addTransactionForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const type = currentTransactionType;
            const category = document.getElementById('transactionCategory').value;
            const amount = document.getElementById('transactionAmount').value;
            const date = document.getElementById('transactionDate').value;
            const time = document.getElementById('transactionTime').value;
            const description = document.getElementById('transactionDescription').value;
            
            // Kiểm tra dữ liệu
            if (!category || !amount || !date || !time) {
                showNotification('Vui lòng điền đầy đủ thông tin', 'error');
                return;
            }
            
            // Tạo datetime string
            const datetime = `${date}T${time}:00`;
            
            // Gửi request đến API
            const submitButton = addTransactionForm.querySelector('button[type="submit"]');
            setButtonLoading(submitButton, true);
            
            fetch(`${API_BASE_URL}/transaction`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    type: type,
                    category: category,
                    amount: parseFloat(amount),
                    date: datetime,
                    description: description
                })
            })
            .then(async response => {
                const data = await response.json();
                if (response.ok) {
                    return data;
                } else {
                    throw new Error(data.message || 'Có lỗi xảy ra');
                }
            })
            .then(data => {
                if (data.success) {
                    showNotification('Đã thêm giao dịch thành công!', 'success');
                    addTransactionForm.reset();
                    transactionModal.classList.remove('show');
                    
                    // Làm mới dữ liệu
                    loadOverviewData();
                    loadRecentTransactions();
                    if (financeChart) {
                        loadChartData();
                    }
                }
            })
            .catch(error => {
                showNotification(error.message || 'Lỗi kết nối máy chủ!', 'error');
            })
            .finally(() => {
                setButtonLoading(submitButton, false);
            });
        });
    }

    // Tải dữ liệu tổng quan
    function loadOverviewData() {
        fetch(`${API_BASE_URL}/overview`, {
            method: 'GET',
            credentials: 'include'
        })
        .then(async response => {
            const data = await response.json();
            if (response.ok) {
                return data;
            } else {
                throw new Error(data.message || 'Có lỗi xảy ra');
            }
        })
        .then(data => {
            if (data.success) {
                const overview = data.overview;
                document.getElementById('totalIncome').textContent = formatCurrency(overview.income);
                document.getElementById('totalExpense').textContent = formatCurrency(overview.expense);
                document.getElementById('totalSavings').textContent = formatCurrency(overview.savings);
            }
        })
        .catch(error => {
            console.error('Error loading overview data:', error);
        });
    }

    // Tải giao dịch gần đây
    function loadRecentTransactions() {
        fetch(`${API_BASE_URL}/transactions?limit=5`, {
            method: 'GET',
            credentials: 'include'
        })
        .then(async response => {
            const data = await response.json();
            if (response.ok) {
                return data;
            } else {
                throw new Error(data.message || 'Có lỗi xảy ra');
            }
        })
        .then(data => {
            const transactionsList = document.getElementById('recentTransactions');
            
            if (data.success && data.transactions && data.transactions.length > 0) {
                transactionsList.innerHTML = '';
                
                data.transactions.forEach(transaction => {
                    const transactionItem = createTransactionElement(transaction);
                    transactionsList.appendChild(transactionItem);
                });
            } else {
                transactionsList.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-receipt"></i>
                        <p>Chưa có giao dịch nào</p>
                        <button class="btn btn-outline" id="addFirstTransaction">Thêm giao dịch</button>
                    </div>
                `;
                
                document.getElementById('addFirstTransaction').addEventListener('click', function() {
                    openTransactionModal('expense');
                });
            }
        })
        .catch(error => {
            console.error('Error loading recent transactions:', error);
        });
    }

    // Tạo phần tử HTML cho giao dịch
    function createTransactionElement(transaction) {
        const item = document.createElement('div');
        item.className = 'transaction-item';
        
        const iconClass = getIconClassForCategory(transaction.category);
        const amountClass = transaction.type === 'income' ? 'positive' : 'negative';
        const amountSign = transaction.type === 'income' ? '+' : '-';
        const date = new Date(transaction.date);
        const formattedDate = date.toLocaleDateString('vi-VN');
        
        item.innerHTML = `
            <div class="transaction-info">
                <div class="transaction-icon ${iconClass}">
                    <i class="${getIconForCategory(transaction.category)}"></i>
                </div>
                <div class="transaction-details">
                    <h4>${getCategoryName(transaction.category)}</h4>
                    <p>${formattedDate}</p>
                </div>
            </div>
            <div class="transaction-amount ${amountClass}">
                ${amountSign} ${formatCurrency(transaction.amount)}
            </div>
        `;
        
        return item;
    }

    // Tải dữ liệu biểu đồ
    function loadChartData() {
        const period = document.getElementById('chartPeriod').value;
        
        fetch(`${API_BASE_URL}/analysis`, {
            method: 'GET',
            credentials: 'include'
        })
        .then(async response => {
            const data = await response.json();
            if (response.ok) {
                return data;
            } else {
                throw new Error(data.message || 'Có lỗi xảy ra');
            }
        })
        .then(data => {
            if (data.success) {
                updateChart(data.analysis, period);
            }
        })
        .catch(error => {
            console.error('Error loading chart data:', error);
        });
    }

    // Cập nhật biểu đồ
    function updateChart(analysis, period) {
        const ctx = document.getElementById('financeChart').getContext('2d');
        
        // Xóa biểu đồ cũ nếu tồn tại
        if (financeChart) {
            financeChart.destroy();
        }
        
        // Dữ liệu mẫu - trong thực tế sẽ sử dụng dữ liệu từ API
        const labels = ['Tuần 1', 'Tuần 2', 'Tuần 3', 'Tuần 4'];
        const incomeData = [1500000, 2200000, 1800000, 2500000];
        const expenseData = [800000, 1200000, 900000, 1100000];
        
        financeChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Thu nhập',
                        data: incomeData,
                        backgroundColor: 'rgba(76, 175, 80, 0.7)',
                        borderColor: 'rgba(76, 175, 80, 1)',
                        borderWidth: 1
                    },
                    {
                        label: 'Chi tiêu',
                        data: expenseData,
                        backgroundColor: 'rgba(244, 67, 54, 0.7)',
                        borderColor: 'rgba(244, 67, 54, 1)',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return value.toLocaleString('vi-VN') + ' ₫';
                            }
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + ': ' + context.raw.toLocaleString('vi-VN') + ' ₫';
                            }
                        }
                    }
                }
            }
        });
    }

    // Helper functions
    function formatCurrency(amount) {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    }

    function getIconClassForCategory(category) {
        const iconMap = {
            'salary': 'salary',
            'bonus': 'salary',
            'investment': 'salary',
            'freelance': 'salary',
            'other_income': 'salary',
            'food': 'food',
            'shopping': 'shopping',
            'transport': 'food',
            'entertainment': 'food',
            'utilities': 'food',
            'health': 'food',
            'education': 'food',
            'other_expense': 'food'
        };
        
        return iconMap[category] || 'food';
    }

    function getIconForCategory(category) {
        const iconMap = {
            'salary': 'fas fa-money-check',
            'bonus': 'fas fa-gift',
            'investment': 'fas fa-chart-line',
            'freelance': 'fas fa-laptop',
            'other_income': 'fas fa-money-bill',
            'food': 'fas fa-utensils',
            'shopping': 'fas fa-shopping-bag',
            'transport': 'fas fa-car',
            'entertainment': 'fas fa-film',
            'utilities': 'fas fa-bolt',
            'health': 'fas fa-heart',
            'education': 'fas fa-book',
            'other_expense': 'fas fa-receipt'
        };
        
        return iconMap[category] || 'fas fa-receipt';
    }

    function getCategoryName(category) {
        const nameMap = {
            'salary': 'Lương',
            'bonus': 'Thưởng',
            'investment': 'Đầu tư',
            'freelance': 'Freelance',
            'other_income': 'Thu nhập khác',
            'food': 'Ăn uống',
            'shopping': 'Mua sắm',
            'transport': 'Di chuyển',
            'entertainment': 'Giải trí',
            'utilities': 'Tiện ích',
            'health': 'Sức khỏe',
            'education': 'Giáo dục',
            'other_expense': 'Chi tiêu khác'
        };
        
        return nameMap[category] || category;
    }

    function setButtonLoading(button, isLoading) {
        if (isLoading) {
            button.disabled = true;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang xử lý...';
        } else {
            button.disabled = false;
            button.innerHTML = 'Thêm giao dịch';
        }
    }

    function showNotification(message, type = 'success') {
        // Tạo phần tử thông báo
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
                <span>${message}</span>
            </div>
            <button class="notification-close">
                <i class="fas fa-times"></i>
            </button>
        `;

        document.body.appendChild(notification);
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);

        // Tự động đóng sau 5 giây
        setTimeout(() => {
            closeNotification(notification);
        }, 5000);
        const closeButton = notification.querySelector('.notification-close');
        closeButton.addEventListener('click', () => {
            closeNotification(notification);
        });
    }

    // Hàm đóng thông báo
    function closeNotification(notification) {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }

    // Khởi tạo dashboard
    function initDashboard() {
        loadOverviewData();
        loadRecentTransactions();
        loadChartData();
        
        // Xử lý thay đổi period cho biểu đồ
        document.getElementById('chartPeriod').addEventListener('change', function() {
            loadChartData();
        });
        
        // Xử lý nút thêm giao dịch từ empty state
        document.addEventListener('click', function(e) {
            if (e.target.id === 'addFirstTransaction') {
                openTransactionModal('expense');
            }
        });
    }

    // Khởi chạy dashboard
    initDashboard();
});