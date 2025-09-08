// WealthWallet Single Page Application
class WealthWalletApp {
    constructor() {
        // Use same-origin over http(s), fallback to localhost in file://
        const isHttpOrigin = /^https?:\/\//i.test(window.location.origin);
        const fromConfig = (typeof window !== 'undefined' && window.API_BASE_URL) ? window.API_BASE_URL : null;
        this.API_BASE_URL = fromConfig || (isHttpOrigin ? '/api' : 'http://localhost:5000/api');
        this.currentSection = 'dashboard';
        this.charts = {};
        this.userData = null;
        
        this.init();
    }

    async init() {
        // Kiểm tra authentication
        if (!this.checkAuth()) {
            window.location.href = 'auth.html?tab=login';
            return;
        }

        // Setup event listeners
        this.setupEventListeners();
        
        // Load user data
        await this.loadUserData();
        
        // Initialize UI
        this.initializeUI();
        
        // Load dashboard data
        await this.loadDashboardData();
        
        // Hide loading screen
        this.hideLoading();
    }

    checkAuth() {
        const isLoggedIn = localStorage.getItem('isLoggedIn');
        const userEmail = localStorage.getItem('userEmail');
        return isLoggedIn === 'true' && userEmail;
    }

    setupEventListeners() {
        // Sidebar toggle
        document.getElementById('sidebarToggle').addEventListener('click', () => {
            this.toggleSidebar();
        });

        // Navigation items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const section = item.dataset.section;
                this.showSection(section);
            });
        });

        // User profile dropdown
        document.getElementById('userInfo').addEventListener('click', () => {
            this.toggleUserDropdown();
        });

        // Notifications
        document.getElementById('notificationBtn').addEventListener('click', () => {
            this.toggleNotifications();
        });

        // Logout functionality (improved)
        document.getElementById('logoutBtn').addEventListener('click', (e) => {
            e.preventDefault();
            this.showLogoutModal();
        });

        document.getElementById('confirmLogout').addEventListener('click', () => {
            this.logout();
        });

        document.getElementById('cancelLogout').addEventListener('click', () => {
            this.hideLogoutModal();
        });

        // Modal close functionality
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                modal.classList.remove('active');
            });
        });

        // Chart period filters
        document.querySelectorAll('.chart-controls .btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const period = e.target.dataset.period;
                if (period) {
                    this.updateChartPeriod(period, e.target);
                }
            });
        });

        // Profile edit functionality
        document.getElementById('editProfileBtn').addEventListener('click', () => {
            this.toggleProfileEdit();
        });

        // Close dropdowns when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.user-profile')) {
                document.getElementById('userProfile').classList.remove('active');
            }
            if (!e.target.closest('.notifications')) {
                document.getElementById('notificationBtn').parentElement.classList.remove('active');
            }
        });

        // Responsive handling
        window.addEventListener('resize', () => {
            this.handleResize();
        });
    }

    async loadUserData() {
        try {
            const response = await fetch(`${this.API_BASE_URL}/user`, {
                credentials: 'include'
            });
            
            if (response.ok) {
                this.userData = await response.json();
                this.displayUserInfo();
            }
        } catch (error) {
            console.error('Error loading user data:', error);
        }
    }

    displayUserInfo() {
        if (this.userData) {
            // Header user info
            document.getElementById('userName').textContent = this.userData.name || 'Người dùng';
            document.getElementById('userEmail').textContent = this.userData.email || '';
            document.getElementById('userGreeting').textContent = this.userData.name || 'Người dùng';
            
            // Profile section
            document.getElementById('profileName').value = this.userData.name || '';
            document.getElementById('profileEmail').value = this.userData.email || '';
            document.getElementById('profilePhone').value = this.userData.phone || '';
            document.getElementById('profileIncome').value = this.userData.monthly_income || '';
            document.getElementById('profileSavingsTarget').value = this.userData.savings_target || '';
            
            // Avatar
            const avatarUrl = this.userData.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=40&h=40&fit=crop&crop=face';
            document.getElementById('userAvatar').src = avatarUrl;
            document.getElementById('profileAvatar').src = avatarUrl.replace('w=40&h=40', 'w=120&h=120');
        }
    }

    initializeUI() {
        // Set current date
        const currentDate = new Date();
        const formattedDate = currentDate.toLocaleDateString('vi-VN', {
            weekday: 'long',
            year: 'numeric',
            month: 'long', 
            day: 'numeric'
        });
        document.getElementById('currentDate').textContent = formattedDate;

        // Initialize charts
        this.initializeCharts();
    }

    async loadDashboardData() {
        try {
            // Load overview data
            const overviewResponse = await fetch(`${this.API_BASE_URL}/overview`, {
                credentials: 'include'
            });
            
            if (overviewResponse.ok) {
                const overviewData = await overviewResponse.json();
                this.updateFinancialOverview(overviewData);
            }

            // Load analysis data for charts
            const analysisResponse = await fetch(`${this.API_BASE_URL}/analysis`, {
                credentials: 'include'
            });
            
            if (analysisResponse.ok) {
                const analysisData = await analysisResponse.json();
                this.updateCharts(analysisData);
            }

            // Load notifications
            await this.loadNotifications();

        } catch (error) {
            console.error('Error loading dashboard data:', error);
        }
    }

    updateFinancialOverview(data) {
        // Format currency
        const formatCurrency = (amount) => {
            return new Intl.NumberFormat('vi-VN', {
                style: 'currency',
                currency: 'VND'
            }).format(amount);
        };

        document.getElementById('totalIncome').textContent = formatCurrency(data.totalIncome || 0);
        document.getElementById('totalExpense').textContent = formatCurrency(data.totalExpense || 0);
        document.getElementById('currentBalance').textContent = formatCurrency((data.totalIncome || 0) - (data.totalExpense || 0));

        // Update change indicators
        document.getElementById('incomeChange').textContent = `${data.incomeChange || 0}%`;
        document.getElementById('expenseChange').textContent = `${data.expenseChange || 0}%`;
        document.getElementById('balanceChange').textContent = `${data.balanceChange || 0}%`;

        // Update change colors
        this.updateChangeColor('incomeChange', data.incomeChange);
        this.updateChangeColor('expenseChange', data.expenseChange);
        this.updateChangeColor('balanceChange', data.balanceChange);
    }

    updateChangeColor(elementId, value) {
        const element = document.getElementById(elementId);
        element.classList.remove('positive', 'negative');
        if (value > 0) {
            element.classList.add('positive');
        } else if (value < 0) {
            element.classList.add('negative');
        }
    }

    initializeCharts() {
        // Finance Chart
        const financeCtx = document.getElementById('financeChart').getContext('2d');
        this.charts.finance = new Chart(financeCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Thu nhập',
                    data: [],
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4
                }, {
                    label: 'Chi tiêu',
                    data: [],
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return new Intl.NumberFormat('vi-VN', {
                                    style: 'currency',
                                    currency: 'VND',
                                    notation: 'compact'
                                }).format(value);
                            }
                        }
                    }
                }
            }
        });

        // Category Chart
        const categoryCtx = document.getElementById('categoryChart').getContext('2d');
        this.charts.category = new Chart(categoryCtx, {
            type: 'doughnut',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: [
                        '#4f46e5', '#10b981', '#f59e0b', '#ef4444',
                        '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    updateCharts(data) {
        // Update finance chart
        if (data.monthlyData) {
            this.charts.finance.data.labels = data.monthlyData.labels || [];
            this.charts.finance.data.datasets[0].data = data.monthlyData.income || [];
            this.charts.finance.data.datasets[1].data = data.monthlyData.expenses || [];
            this.charts.finance.update();
        }

        // Update category chart
        if (data.categoryData) {
            this.charts.category.data.labels = data.categoryData.labels || [];
            this.charts.category.data.datasets[0].data = data.categoryData.values || [];
            this.charts.category.update();
        }
    }

    updateChartPeriod(period, button) {
        // Update button states
        button.parentElement.querySelectorAll('.btn').forEach(b => b.classList.remove('active'));
        button.classList.add('active');

        // Reload chart data for the new period
        this.loadChartData(period);
    }

    async loadChartData(period = 'month') {
        try {
            const response = await fetch(`${this.API_BASE_URL}/analysis?period=${period}`, {
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                this.updateCharts(data);
            }
        } catch (error) {
            console.error('Error loading chart data:', error);
        }
    }

    async loadNotifications() {
        // Mock notifications for now
        const notifications = [
            {
                id: 1,
                icon: 'fas fa-exclamation-triangle',
                message: 'Bạn đã vượt ngân sách cho danh mục Ăn uống',
                time: '2 giờ trước',
                unread: true
            },
            {
                id: 2,
                icon: 'fas fa-bullseye',
                message: 'Bạn còn 5 ngày để đạt mục tiêu tiết kiệm',
                time: '1 ngày trước',
                unread: true
            },
            {
                id: 3,
                icon: 'fas fa-chart-line',
                message: 'Báo cáo tài chính tháng 10 đã sẵn sàng',
                time: '3 ngày trước',
                unread: false
            }
        ];

        this.displayNotifications(notifications);
    }

    displayNotifications(notifications) {
        const notificationList = document.getElementById('notificationList');
        const unreadCount = notifications.filter(n => n.unread).length;
        
        document.getElementById('notificationCount').textContent = unreadCount;
        document.getElementById('notificationCount').style.display = unreadCount > 0 ? 'flex' : 'none';

        notificationList.innerHTML = notifications.map(notification => `
            <div class="notification-item ${notification.unread ? 'unread' : ''}">
                <div class="notification-icon">
                    <i class="${notification.icon}"></i>
                </div>
                <div class="notification-content">
                    <p>${notification.message}</p>
                    <span class="notification-time">${notification.time}</span>
                </div>
            </div>
        `).join('');
    }

    showSection(sectionName) {
        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.section === sectionName) {
                item.classList.add('active');
            }
        });

        // Update content sections
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });

        const targetSection = document.getElementById(`${sectionName}-section`);
        if (targetSection) {
            targetSection.classList.add('active');
            this.currentSection = sectionName;
        }

        // Load section-specific data
        this.loadSectionData(sectionName);
    }

    async loadSectionData(section) {
        switch (section) {
            case 'transactions':
                await this.loadTransactions();
                break;
            case 'analysis':
                await this.loadAnalysis();
                break;
            case 'budgets':
                await this.loadBudgets();
                break;
            case 'goals':
                await this.loadGoals();
                break;
            case 'reports':
                await this.loadReports();
                break;
        }
    }

    async loadTransactions() {
        // Implementation for loading transactions
        console.log('Loading transactions...');
    }

    async loadAnalysis() {
        // Implementation for loading analysis
        console.log('Loading analysis...');
    }

    async loadBudgets() {
        // Implementation for loading budgets
        console.log('Loading budgets...');
    }

    async loadGoals() {
        // Implementation for loading goals
        console.log('Loading goals...');
    }

    async loadReports() {
        // Implementation for loading reports
        console.log('Loading reports...');
    }

    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const container = document.querySelector('.app-container');
        
        if (window.innerWidth <= 1024) {
            sidebar.classList.toggle('active');
        } else {
            container.classList.toggle('sidebar-collapsed');
        }
    }

    toggleUserDropdown() {
        document.getElementById('userProfile').classList.toggle('active');
    }

    toggleNotifications() {
        document.getElementById('notificationBtn').parentElement.classList.toggle('active');
    }

    showLogoutModal() {
        document.getElementById('logoutModal').classList.add('active');
    }

    hideLogoutModal() {
        document.getElementById('logoutModal').classList.remove('active');
    }

    async logout() {
        try {
            // Show loading
            document.getElementById('confirmLogout').innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang đăng xuất...';
            
            await fetch(`${this.API_BASE_URL}/logout`, {
                method: 'GET',
                credentials: 'include'
            });
            
            // Clear local storage
            localStorage.removeItem('isLoggedIn');
            localStorage.removeItem('userName');
            localStorage.removeItem('userEmail');
            
            // Redirect
            window.location.href = 'index.html';
            
        } catch (error) {
            console.error('Logout error:', error);
            // Force logout on error
            localStorage.clear();
            window.location.href = 'index.html';
        }
    }

    toggleProfileEdit() {
        const inputs = document.querySelectorAll('#profile-section input');
        const btn = document.getElementById('editProfileBtn');
        const isEditing = btn.textContent === 'Hủy';

        inputs.forEach(input => {
            if (input.id !== 'profileEmail') { // Email should not be editable
                input.disabled = isEditing;
            }
        });

        if (isEditing) {
            btn.textContent = 'Chỉnh sửa';
            btn.className = 'btn btn-primary';
            // Save changes
            this.saveProfile();
        } else {
            btn.textContent = 'Hủy';
            btn.className = 'btn btn-secondary';
        }
    }

    async saveProfile() {
        const profileData = {
            name: document.getElementById('profileName').value,
            phone: document.getElementById('profilePhone').value,
            monthly_income: parseInt(document.getElementById('profileIncome').value) || 0,
            savings_target: parseInt(document.getElementById('profileSavingsTarget').value) || 0
        };

        try {
            const response = await fetch(`${this.API_BASE_URL}/user`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(profileData)
            });

            if (response.ok) {
                this.userData = { ...this.userData, ...profileData };
                this.displayUserInfo();
                this.showNotification('Cập nhật hồ sơ thành công', 'success');
            }
        } catch (error) {
            console.error('Error saving profile:', error);
            this.showNotification('Lỗi khi cập nhật hồ sơ', 'error');
        }
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
            <button class="notification-close">&times;</button>
        `;

        // Add to page
        document.body.appendChild(notification);

        // Auto remove after 5 seconds
        setTimeout(() => {
            notification.remove();
        }, 5000);

        // Manual close
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.remove();
        });
    }

    handleResize() {
        if (window.innerWidth > 1024) {
            document.getElementById('sidebar').classList.remove('active');
        }
    }

    hideLoading() {
        const loadingScreen = document.getElementById('loading-screen');
        const appContainer = document.getElementById('app-container');
        
        setTimeout(() => {
            loadingScreen.style.opacity = '0';
            setTimeout(() => {
                loadingScreen.style.display = 'none';
                appContainer.style.display = 'grid';
            }, 300);
        }, 1000);
    }
}

// Global function for onclick events
function showSection(sectionName) {
    if (window.app) {
        window.app.showSection(sectionName);
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.app = new WealthWalletApp();
});

// Add notification styles
const notificationStyles = `
<style>
.notification {
    position: fixed;
    top: 80px;
    right: 24px;
    background: var(--surface-color);
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius);
    box-shadow: var(--shadow-lg);
    padding: 16px 20px;
    display: flex;
    align-items: center;
    gap: 12px;
    z-index: 10000;
    min-width: 320px;
    animation: slideInRight 0.3s ease;
}

.notification.success {
    border-left: 4px solid var(--success-color);
}

.notification.error {
    border-left: 4px solid var(--danger-color);
}

.notification.info {
    border-left: 4px solid var(--primary-color);
}

.notification i {
    font-size: 1.25rem;
}

.notification.success i { color: var(--success-color); }
.notification.error i { color: var(--danger-color); }
.notification.info i { color: var(--primary-color); }

.notification-close {
    background: none;
    border: none;
    font-size: 1.25rem;
    color: var(--text-secondary);
    cursor: pointer;
    margin-left: auto;
}

@keyframes slideInRight {
    from {
        transform: translateX(100%);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}
</style>
`;

document.head.insertAdjacentHTML('beforeend', notificationStyles);