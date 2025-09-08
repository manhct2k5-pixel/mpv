// Auth Page JavaScript
class AuthManager {
    constructor() {
        // Use same-origin when served over http(s), fallback to localhost when opened from file://
        const isHttpOrigin = /^https?:\/\//i.test(window.location.origin);
        this.API_BASE_URL = isHttpOrigin ? '/api' : 'http://localhost:5000/api';
        this.currentTab = 'login';
        this.isLoading = false;
        
        this.init();
    }

    init() {
        // Check if user is already logged in
        if (this.checkAuth()) {
            window.location.href = 'app.html';
            return;
        }

        this.setupEventListeners();
        this.handleInitialTab();
    }

    checkAuth() {
        const isLoggedIn = localStorage.getItem('isLoggedIn');
        const userEmail = localStorage.getItem('userEmail');
        return isLoggedIn === 'true' && userEmail;
    }

    setupEventListeners() {
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.target.dataset.tab;
                this.switchTab(tab);
            });
        });

        // Form submissions
        document.querySelector('#loginForm form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        document.querySelector('#registerForm form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleRegister();
        });

        // Real-time validation
        document.querySelectorAll('.form-input').forEach(input => {
            input.addEventListener('input', (e) => {
                this.validateField(e.target);
            });

            input.addEventListener('blur', (e) => {
                this.validateField(e.target);
            });
        });

        // Password strength checking
        const registerPassword = document.getElementById('registerPassword');
        if (registerPassword) {
            registerPassword.addEventListener('input', (e) => {
                this.checkPasswordStrength(e.target.value);
            });
        }

        // Social login buttons (placeholder functionality)
        document.querySelectorAll('.btn-google, .btn-facebook').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleSocialLogin(btn.classList.contains('btn-google') ? 'google' : 'facebook');
            });
        });

        // Enter key handling
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !this.isLoading) {
                const activeForm = document.querySelector('.auth-form.active');
                if (activeForm) {
                    activeForm.querySelector('form').dispatchEvent(new Event('submit'));
                }
            }
        });
    }

    handleInitialTab() {
        const urlParams = new URLSearchParams(window.location.search);
        const tab = urlParams.get('tab');
        if (tab && (tab === 'login' || tab === 'register')) {
            this.switchTab(tab);
        } else {
            this.switchTab('login');
        }
    }

    switchTab(tab) {
        this.currentTab = tab;
        
        // Update URL
        const url = new URL(window.location);
        url.searchParams.set('tab', tab);
        window.history.replaceState(null, '', url);

        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.tab === tab) {
                btn.classList.add('active');
            }
        });

        // Update forms
        document.querySelectorAll('.auth-form').forEach(form => {
            form.classList.remove('active');
            if (form.id === `${tab}Form`) {
                form.classList.add('active');
            }
        });

        // Update header text
        const headerTitle = document.querySelector('.auth-header h3');
        const headerSubtitle = document.querySelector('.auth-header p');
        
        if (tab === 'login') {
            headerTitle.textContent = 'Đăng nhập';
            headerSubtitle.textContent = 'Chào mừng bạn quay trở lại với WealthWallet';
        } else {
            headerTitle.textContent = 'Đăng ký';
            headerSubtitle.textContent = 'Tạo tài khoản mới để bắt đầu quản lý tài chính';
        }

        // Clear any previous errors
        this.clearErrors();
        this.clearMessages();
    }

    validateField(field) {
        const value = field.value.trim();
        const fieldName = field.name;
        let isValid = true;
        let errorMessage = '';

        // Clear previous error
        this.clearFieldError(field);

        switch (fieldName) {
            case 'email':
            case 'loginEmail':
                if (!value) {
                    errorMessage = 'Email là bắt buộc';
                    isValid = false;
                } else if (!this.isValidEmail(value)) {
                    errorMessage = 'Email không hợp lệ';
                    isValid = false;
                }
                break;

            case 'password':
            case 'loginPassword':
                if (!value) {
                    errorMessage = 'Mật khẩu là bắt buộc';
                    isValid = false;
                } else if (fieldName === 'password' && value.length < 6) {
                    errorMessage = 'Mật khẩu phải có ít nhất 6 ký tự';
                    isValid = false;
                }
                break;

            case 'name':
                if (!value) {
                    errorMessage = 'Họ tên là bắt buộc';
                    isValid = false;
                } else if (value.length < 2) {
                    errorMessage = 'Họ tên phải có ít nhất 2 ký tự';
                    isValid = false;
                }
                break;

            case 'confirmPassword':
                const password = document.getElementById('registerPassword').value;
                if (!value) {
                    errorMessage = 'Vui lòng xác nhận mật khẩu';
                    isValid = false;
                } else if (value !== password) {
                    errorMessage = 'Mật khẩu xác nhận không khớp';
                    isValid = false;
                }
                break;
        }

        if (!isValid) {
            this.showFieldError(field, errorMessage);
        }

        return isValid;
    }

    validateForm(formType) {
        const form = document.getElementById(`${formType}Form`);
        const inputs = form.querySelectorAll('.form-input');
        let isValid = true;

        inputs.forEach(input => {
            if (!this.validateField(input)) {
                isValid = false;
            }
        });

        // Additional validations for register form
        if (formType === 'register') {
            const termsCheckbox = form.querySelector('input[name="terms"]');
            if (termsCheckbox && !termsCheckbox.checked) {
                this.showMessage('Bạn phải đồng ý với điều khoản sử dụng', 'error');
                isValid = false;
            }
        }

        return isValid;
    }

    async handleLogin() {
        if (this.isLoading) return;

        if (!this.validateForm('login')) {
            return;
        }

        this.setLoading(true, 'login');

        const loginFormEl = document.querySelector('#loginForm form');
        const formData = new FormData(loginFormEl);
        const loginData = {
            email: formData.get('loginEmail'),
            password: formData.get('loginPassword'),
            remember_me: !!formData.get('remember')
        };

        try {
            const response = await fetch(`${this.API_BASE_URL}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(loginData)
            });

            const data = await response.json();

            if (response.ok && data.success) {
                // Store user info
                localStorage.setItem('isLoggedIn', 'true');
                localStorage.setItem('userEmail', loginData.email);
                localStorage.setItem('userName', data.user.name);

                this.showMessage('Đăng nhập thành công! Đang chuyển hướng...', 'success');
                
                // Redirect after short delay - optimized for better UX
                setTimeout(() => {
                    window.location.href = 'app.html';
                }, 800);

            } else {
                this.showMessage(data.message || 'Đăng nhập thất bại', 'error');
            }

        } catch (error) {
            console.error('Login error:', error);
            this.showMessage('Lỗi kết nối. Vui lòng thử lại.', 'error');
        } finally {
            this.setLoading(false, 'login');
        }
    }

    async handleRegister() {
        if (this.isLoading) return;

        if (!this.validateForm('register')) {
            return;
        }

        this.setLoading(true, 'register');

        const registerFormEl = document.querySelector('#registerForm form');
        const formData = new FormData(registerFormEl);
        const registerData = {
            name: formData.get('name'),
            email: formData.get('email'),
            password: formData.get('password')
        };

        try {
            const response = await fetch(`${this.API_BASE_URL}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(registerData)
            });

            const data = await response.json();

            if (response.ok && data.success) {
                this.showMessage('Đăng ký thành công! Đang đăng nhập...', 'success');
                
                // Auto login after successful registration
                setTimeout(() => {
                    localStorage.setItem('isLoggedIn', 'true');
                    localStorage.setItem('userEmail', registerData.email);
                    localStorage.setItem('userName', registerData.name);
                    window.location.href = 'app.html';
                }, 1500);

            } else {
                this.showMessage(data.message || 'Đăng ký thất bại', 'error');
            }

        } catch (error) {
            console.error('Register error:', error);
            this.showMessage('Lỗi kết nối. Vui lòng thử lại.', 'error');
        } finally {
            this.setLoading(false, 'register');
        }
    }

    handleSocialLogin(provider) {
        // Placeholder for social login
        this.showMessage(`Tính năng đăng nhập bằng ${provider === 'google' ? 'Google' : 'Facebook'} sẽ sớm được cập nhật`, 'info');
    }

    checkPasswordStrength(password) {
        const strengthIndicator = document.querySelector('.password-strength');
        const strengthFill = document.querySelector('.strength-fill');
        const strengthText = document.querySelector('.strength-text');

        if (!password) {
            strengthIndicator.classList.remove('show');
            return;
        }

        strengthIndicator.classList.add('show');

        let score = 0;
        let feedback = '';

        // Length check
        if (password.length >= 8) score++;
        if (password.length >= 12) score++;

        // Character variety checks
        if (/[a-z]/.test(password)) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/[^A-Za-z0-9]/.test(password)) score++;

        // Remove previous strength classes
        strengthFill.classList.remove('weak', 'fair', 'good', 'strong');

        if (score <= 2) {
            strengthFill.classList.add('weak');
            feedback = 'Mật khẩu yếu';
        } else if (score <= 4) {
            strengthFill.classList.add('fair');
            feedback = 'Mật khẩu trung bình';
        } else if (score <= 5) {
            strengthFill.classList.add('good');
            feedback = 'Mật khẩu tốt';
        } else {
            strengthFill.classList.add('strong');
            feedback = 'Mật khẩu mạnh';
        }

        strengthText.textContent = feedback;
    }

    setLoading(loading, formType) {
        this.isLoading = loading;
        const submitBtn = document.querySelector(`#${formType}Form .btn-primary`);
        
        if (loading) {
            submitBtn.classList.add('btn-loading');
            submitBtn.disabled = true;
        } else {
            submitBtn.classList.remove('btn-loading');
            submitBtn.disabled = false;
        }
    }

    showFieldError(field, message) {
        field.classList.add('error');
        const errorElement = field.parentElement.querySelector('.error-message');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.add('show');
        }
    }

    clearFieldError(field) {
        field.classList.remove('error');
        const errorElement = field.parentElement.querySelector('.error-message');
        if (errorElement) {
            errorElement.classList.remove('show');
        }
    }

    clearErrors() {
        document.querySelectorAll('.form-input').forEach(input => {
            this.clearFieldError(input);
        });
    }

    showMessage(message, type = 'info') {
        this.clearMessages();

        const messageDiv = document.createElement('div');
        messageDiv.className = `${type}-message show`;
        
        const icon = type === 'success' ? 'fas fa-check-circle' : 
                    type === 'error' ? 'fas fa-exclamation-circle' : 
                    'fas fa-info-circle';
        
        messageDiv.innerHTML = `<i class="${icon}"></i> ${message}`;

        const activeForm = document.querySelector('.auth-form.active');
        if (activeForm) {
            activeForm.insertBefore(messageDiv, activeForm.querySelector('form'));
        }

        // Auto hide after 3 seconds for non-error messages - faster UX
        if (type !== 'error') {
            setTimeout(() => {
                messageDiv.classList.remove('show');
                setTimeout(() => messageDiv.remove(), 300);
            }, 3000);
        }
    }

    clearMessages() {
        document.querySelectorAll('.success-message, .error-message, .info-message').forEach(msg => {
            if (msg.classList.contains('show')) {
                msg.remove();
            }
        });
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    new AuthManager();
});

// Add additional message styles
const messageStyles = `
<style>
.error-message, .success-message, .info-message {
    padding: 12px 16px;
    border-radius: var(--border-radius);
    margin-bottom: 24px;
    display: none;
    align-items: center;
    gap: 8px;
    font-size: 0.875rem;
    font-weight: 500;
    animation: slideDown 0.3s ease;
}

.error-message {
    background: rgb(239 68 68 / 0.1);
    border: 1px solid var(--danger-color);
    color: var(--danger-color);
}

.success-message {
    background: rgb(16 185 129 / 0.1);
    border: 1px solid var(--success-color);
    color: var(--success-color);
}

.info-message {
    background: rgb(79 70 229 / 0.1);
    border: 1px solid var(--primary-color);
    color: var(--primary-color);
}

.error-message.show,
.success-message.show,
.info-message.show {
    display: flex;
}

@keyframes slideDown {
    from {
        opacity: 0;
        transform: translateY(-10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}
</style>
`;

document.head.insertAdjacentHTML('beforeend', messageStyles);