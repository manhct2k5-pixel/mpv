/**
 * WealthWallet Main JavaScript
 * Handles homepage functionality, navigation, and user interactions
 */

class WealthWalletApp {
    constructor() {
        this.elements = {};
        this.isLoading = true;
        // Compute API base URL for homepage actions (e.g., logout)
        const isHttpOrigin = /^https?:\/\//i.test(window.location.origin);
        const fromConfig = (typeof window !== 'undefined' && window.API_BASE_URL) ? window.API_BASE_URL : null;
        this.API_BASE_URL = fromConfig || (isHttpOrigin ? '/api' : 'http://localhost:5000/api');
        this.init();
    }

    init() {
        document.addEventListener('DOMContentLoaded', () => {
            this.initializeElements();
            this.setupEventListeners();
            this.checkAuthState();
            this.setupAnimations();
            this.isLoading = false;
            console.log('✅ WealthWallet app initialized successfully');
        });

        // Handle page load
        window.addEventListener('load', () => {
            this.handlePageLoad();
        });
    }

    initializeElements() {
        try {
            this.elements = {
                preloader: document.getElementById('preloader'),
                scrollToTopBtn: document.getElementById('scrollToTopBtn'),
                mobileMenuBtn: document.querySelector('.mobile-menu-btn'),
                navContainer: document.querySelector('.nav-container'),
                navLinks: document.querySelectorAll('.nav-menu a'),
                guestActions: document.getElementById('guestActions'),
                userProfile: document.getElementById('userProfile'),
                logoutBtn: document.getElementById('logoutBtn'),
                newsletterForm: document.querySelector('.newsletter-form'),
                authLinks: document.querySelectorAll('.auth-link'),
                featureCards: document.querySelectorAll('.feature-card'),
                testimonialCards: document.querySelectorAll('.testimonial-card'),
                header: document.querySelector('header'),
                userNameDisplay: document.getElementById('userNameDisplay')
            };
            
            console.log('📦 Elements initialized');
        } catch (error) {
            console.error('❌ Error initializing elements:', error);
        }
    }

    setupEventListeners() {
        try {
            this.setupScrollEvents();
            this.setupNavigationEvents();
            this.setupMobileMenuEvents();
            this.setupAuthEvents();
            this.setupNewsletterEvents();
            this.setupSmoothScrolling();
            this.setupKeyboardEvents();
            
            console.log('🎧 Event listeners setup complete');
        } catch (error) {
            console.error('❌ Error setting up event listeners:', error);
        }
    }

    setupScrollEvents() {
        let scrollTimer = null;
        
        window.addEventListener('scroll', () => {
            if (scrollTimer) return;
            
            scrollTimer = setTimeout(() => {
                this.handleScroll();
                scrollTimer = null;
            }, 10);
        });
    }

    handleScroll() {
        const scrollY = window.scrollY;
        
        // Scroll to top button
        if (this.elements.scrollToTopBtn) {
            if (scrollY > 300) {
                this.elements.scrollToTopBtn.classList.add('show');
            } else {
                this.elements.scrollToTopBtn.classList.remove('show');
            }
        }
        
        // Sticky header effect
        if (this.elements.header) {
            if (scrollY > 50) {
                this.elements.header.style.boxShadow = '0 4px 10px rgba(0, 0, 0, 0.1)';
                this.elements.header.style.background = 'var(--dark-color)';
            } else {
                this.elements.header.style.boxShadow = 'none';
                this.elements.header.style.background = 'var(--dark-color)';
            }
        }
    }

    setupNavigationEvents() {
        // Scroll to top button
        if (this.elements.scrollToTopBtn) {
            this.elements.scrollToTopBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.scrollToTop();
            });
        }

        // Navigation links
        this.elements.navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                this.handleNavigation(e, link);
            });
        });
    }

    setupMobileMenuEvents() {
        if (!this.elements.mobileMenuBtn || !this.elements.navContainer) return;

        this.elements.mobileMenuBtn.addEventListener('click', () => {
            this.toggleMobileMenu();
        });

        // Close mobile menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.elements.navContainer.contains(e.target) && 
                !this.elements.mobileMenuBtn.contains(e.target)) {
                this.closeMobileMenu();
            }
        });

        // Close mobile menu when clicking on nav links
        this.elements.navLinks.forEach(link => {
            link.addEventListener('click', () => {
                this.closeMobileMenu();
            });
        });
    }

    setupAuthEvents() {
        if (this.elements.logoutBtn) {
            this.elements.logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleLogout();
            });
        }
    }

    setupNewsletterEvents() {
        if (!this.elements.newsletterForm) return;

        this.elements.newsletterForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleNewsletterSubmit(e);
        });
    }

    setupSmoothScrolling() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = anchor.getAttribute('href');
                
                if (targetId === '#') return;
                
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    targetElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    }

    setupKeyboardEvents() {
        document.addEventListener('keydown', (e) => {
            // ESC key closes mobile menu
            if (e.key === 'Escape') {
                this.closeMobileMenu();
            }
            
            // Enter key on scroll to top button
            if (e.key === 'Enter' && e.target === this.elements.scrollToTopBtn) {
                this.scrollToTop();
            }
        });
    }

    handlePageLoad() {
        try {
            if (this.elements.preloader) {
                setTimeout(() => {
                    this.elements.preloader.style.opacity = '0';
                    setTimeout(() => {
                        this.elements.preloader.style.display = 'none';
                    }, 300);
                }, 800);
            }
            
            // Trigger entrance animations
            this.triggerEntranceAnimations();
            
            console.log('🎨 Page load complete');
        } catch (error) {
            console.error('❌ Error handling page load:', error);
        }
    }

    checkAuthState() {
        try {
            const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
            const userName = localStorage.getItem('userName');
            
            if (isLoggedIn && userName) {
                this.showUserState(userName);
            } else {
                this.showGuestState();
            }
            
            console.log(`👤 Auth state: ${isLoggedIn ? 'logged in' : 'guest'}`);
        } catch (error) {
            console.error('❌ Error checking auth state:', error);
            this.showGuestState();
        }
    }

    showUserState(userName) {
        if (this.elements.guestActions) {
            this.elements.guestActions.style.display = 'none';
        }
        
        if (this.elements.userProfile) {
            this.elements.userProfile.style.display = 'block';
        }
        
        if (this.elements.userNameDisplay) {
            this.elements.userNameDisplay.textContent = userName;
        }
    }

    showGuestState() {
        if (this.elements.guestActions) {
            this.elements.guestActions.style.display = 'block';
        }
        
        if (this.elements.userProfile) {
            this.elements.userProfile.style.display = 'none';
        }
    }

    toggleMobileMenu() {
        const isActive = this.elements.navContainer.classList.contains('active');
        
        if (isActive) {
            this.closeMobileMenu();
        } else {
            this.openMobileMenu();
        }
    }

    openMobileMenu() {
        this.elements.navContainer.classList.add('active');
        this.elements.mobileMenuBtn.classList.add('active');
        
        const icon = this.elements.mobileMenuBtn.querySelector('i');
        if (icon) {
            icon.classList.remove('fa-bars');
            icon.classList.add('fa-times');
        }
        
        // Prevent body scrolling
        document.body.style.overflow = 'hidden';
    }

    closeMobileMenu() {
        this.elements.navContainer.classList.remove('active');
        this.elements.mobileMenuBtn.classList.remove('active');
        
        const icon = this.elements.mobileMenuBtn.querySelector('i');
        if (icon) {
            icon.classList.remove('fa-times');
            icon.classList.add('fa-bars');
        }
        
        // Restore body scrolling
        document.body.style.overflow = '';
    }

    scrollToTop() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }

    handleNavigation(e, link) {
        const href = link.getAttribute('href');
        
        // Handle external links
        if (href.startsWith('http')) {
            return true;
        }
        
        // Handle internal anchor links
        if (href.startsWith('#')) {
            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
            return false;
        }
    }

    async handleLogout() {
        try {
            // Show loading state
            this.setLoadingState(this.elements.logoutBtn, true);
            
            // Call logout API
            const response = await fetch(`${this.API_BASE_URL}/logout`, {
                method: 'GET',
                credentials: 'include'
            });
            
            // Clear local storage
            localStorage.removeItem('isLoggedIn');
            localStorage.removeItem('userName');
            localStorage.removeItem('userEmail');
            
            // Show success message
            this.showMessage('Đăng xuất thành công!', 'success');
            
            // Update UI
            this.showGuestState();
            
            // Redirect after delay
            setTimeout(() => {
                window.location.href = '/';
            }, 1500);
            
        } catch (error) {
            console.error('Logout error:', error);
            this.showMessage('Có lỗi xảy ra khi đăng xuất', 'error');
        } finally {
            this.setLoadingState(this.elements.logoutBtn, false);
        }
    }

    async handleNewsletterSubmit(e) {
        const form = e.target;
        const emailInput = form.querySelector('input[type="email"]');
        const email = emailInput.value.trim();
        
        if (!email || !this.isValidEmail(email)) {
            this.showMessage('Vui lòng nhập email hợp lệ', 'error');
            return;
        }
        
        try {
            this.setLoadingState(form.querySelector('button'), true);
            
            // Simulate newsletter subscription
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            this.showMessage('Đăng ký newsletter thành công!', 'success');
            emailInput.value = '';
            
        } catch (error) {
            console.error('Newsletter error:', error);
            this.showMessage('Có lỗi xảy ra, vui lòng thử lại', 'error');
        } finally {
            this.setLoadingState(form.querySelector('button'), false);
        }
    }

    setupAnimations() {
        // Intersection Observer for scroll animations
        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('animate-fade-in');
                    }
                });
            }, {
                threshold: 0.1,
                rootMargin: '0px 0px -50px 0px'
            });
            
            // Observe feature cards
            this.elements.featureCards.forEach(card => {
                observer.observe(card);
            });
            
            // Observe testimonial cards
            this.elements.testimonialCards.forEach(card => {
                observer.observe(card);
            });
        }
    }

    triggerEntranceAnimations() {
        // Add staggered animation classes
        this.elements.featureCards.forEach((card, index) => {
            setTimeout(() => {
                card.classList.add('animate-slide-up');
            }, index * 100);
        });
    }

    // Utility methods
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    setLoadingState(element, loading) {
        if (!element) return;
        
        if (loading) {
            element.classList.add('loading');
            element.disabled = true;
        } else {
            element.classList.remove('loading');
            element.disabled = false;
        }
    }

    showMessage(message, type = 'info') {
        // Create toast notification
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(toast);
        
        // Show toast
        setTimeout(() => {
            toast.classList.add('show');
        }, 100);
        
        // Hide and remove toast
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 3000);
    }
}

// Initialize the app
new WealthWalletApp();

// Toast CSS styles
const toastStyles = `
<style>
.toast {
    position: fixed;
    top: 20px;
    right: 20px;
    background: white;
    padding: 16px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    display: flex;
    align-items: center;
    gap: 12px;
    z-index: 10000;
    transform: translateX(400px);
    transition: all 0.3s ease;
    border-left: 4px solid #ccc;
    max-width: 400px;
}

.toast.show {
    transform: translateX(0);
}

.toast-success {
    border-left-color: #10b981;
    color: #10b981;
}

.toast-error {
    border-left-color: #ef4444;
    color: #ef4444;
}

.toast-info {
    border-left-color: #3b82f6;
    color: #3b82f6;
}

.toast i {
    font-size: 18px;
}

.toast span {
    font-weight: 500;
    color: #1f2937;
}
</style>
`;

document.head.insertAdjacentHTML('beforeend', toastStyles);