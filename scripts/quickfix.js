/**
 * Quick Fix for Click Issues
 * This script ensures all interactive elements work properly
 */

// IMMEDIATE FIX - Run as soon as possible
(function() {
    'use strict';
    
    console.log('🔧 QuickFix: Starting...');
    
    // 1. FORCE REMOVE PRELOADER AFTER 2 SECONDS MAX
    setTimeout(function() {
        const preloader = document.getElementById('preloader');
        if (preloader) {
            preloader.style.display = 'none !important';
            preloader.style.opacity = '0';
            preloader.style.visibility = 'hidden';
            preloader.style.pointerEvents = 'none';
            preloader.classList.add('hidden');
            console.log('✅ QuickFix: Preloader force-removed');
        }
    }, 2000);
    
    // 2. ENSURE ALL BUTTONS AND LINKS ARE CLICKABLE
    function fixClickableElements() {
        // Fix all buttons
        const buttons = document.querySelectorAll('button, .btn, input[type="button"], input[type="submit"]');
        buttons.forEach(btn => {
            btn.style.pointerEvents = 'auto';
            btn.style.zIndex = '1';
            btn.style.position = 'relative';
        });
        
        // Fix all links
        const links = document.querySelectorAll('a');
        links.forEach(link => {
            link.style.pointerEvents = 'auto';
            link.style.zIndex = '1';
            link.style.position = 'relative';
        });
        
        // Fix navigation items specifically
        const navItems = document.querySelectorAll('.nav-menu a, .nav-actions a, .btn');
        navItems.forEach(item => {
            item.style.pointerEvents = 'auto !important';
            item.style.zIndex = '10';
            item.style.position = 'relative';
        });
        
        console.log('✅ QuickFix: Made', buttons.length + links.length, 'elements clickable');
    }
    
    // 3. ADD EMERGENCY CLICK HANDLERS
    function addEmergencyHandlers() {
        // Auth buttons
        const loginBtn = document.querySelector('a[href*="auth.html"]');
        const signupBtn = document.querySelector('a[href*="auth.html"][class*="primary"]');
        
        if (loginBtn) {
            loginBtn.addEventListener('click', function(e) {
                e.preventDefault();
                console.log('🔑 QuickFix: Redirecting to login');
                window.location.href = 'auth.html?tab=login';
            });
            console.log('✅ QuickFix: Login button handler added');
        }
        
        if (signupBtn) {
            signupBtn.addEventListener('click', function(e) {
                e.preventDefault();
                console.log('📝 QuickFix: Redirecting to signup');
                window.location.href = 'auth.html?tab=register';
            });
            console.log('✅ QuickFix: Signup button handler added');
        }
        
        // Dashboard button
        const dashboardBtns = document.querySelectorAll('a[href*="app.html"], a[href="dashboard.html"]');
        dashboardBtns.forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                console.log('📊 QuickFix: Redirecting to dashboard');
                window.location.href = 'app.html';
            });
        });
        
        if (dashboardBtns.length > 0) {
            console.log('✅ QuickFix: Dashboard button handlers added');
        }
        
        // Mobile menu
        const mobileBtn = document.querySelector('.mobile-menu-btn');
        const navContainer = document.querySelector('.nav-container');
        
        if (mobileBtn && navContainer) {
            mobileBtn.addEventListener('click', function(e) {
                e.preventDefault();
                navContainer.classList.toggle('active');
                console.log('📱 QuickFix: Mobile menu toggled');
            });
            console.log('✅ QuickFix: Mobile menu handler added');
        }
    }
    
    // 4. REMOVE ANY BLOCKING OVERLAYS
    function removeBlockingElements() {
        // Remove any modal overlays
        const overlays = document.querySelectorAll('.modal-overlay, .loading-overlay, .backdrop');
        overlays.forEach(overlay => {
            if (overlay.style.zIndex > 1000) {
                overlay.style.display = 'none';
                overlay.remove();
            }
        });
        
        // Remove any elements with high z-index that might block
        const highZElements = document.querySelectorAll('*');
        highZElements.forEach(el => {
            const zIndex = parseInt(window.getComputedStyle(el).zIndex);
            if (zIndex > 5000 && zIndex !== 10000) { // Keep preloader z-index
                el.style.zIndex = '1';
            }
        });
        
        console.log('✅ QuickFix: Removed blocking elements');
    }
    
    // 5. APPLY EMERGENCY CSS
    function applyEmergencyCSS() {
        const emergencyCSS = `
            <style id="emergency-fix-css">
                /* Force clickable elements */
                button, .btn, a, input[type="button"], input[type="submit"] {
                    pointer-events: auto !important;
                    position: relative !important;
                    z-index: 10 !important;
                }
                
                /* Fix preloader */
                #preloader.hidden {
                    display: none !important;
                    opacity: 0 !important;
                    visibility: hidden !important;
                    pointer-events: none !important;
                }
                
                /* Ensure navigation is clickable */
                .nav-menu a, .nav-actions a {
                    pointer-events: auto !important;
                    position: relative !important;
                    z-index: 100 !important;
                }
                
                /* Fix button states */
                .btn:hover {
                    transform: translateY(-2px) !important;
                }
                
                /* Remove any blocking elements */
                .loading {
                    pointer-events: none !important;
                }
            </style>
        `;
        
        if (!document.getElementById('emergency-fix-css')) {
            document.head.insertAdjacentHTML('beforeend', emergencyCSS);
            console.log('✅ QuickFix: Emergency CSS applied');
        }
    }
    
    // RUN ALL FIXES
    function runAllFixes() {
        try {
            applyEmergencyCSS();
            fixClickableElements();
            removeBlockingElements();
            addEmergencyHandlers();
            console.log('🎉 QuickFix: All fixes applied successfully!');
            
            // Show success message
            setTimeout(() => {
                const successMsg = document.createElement('div');
                successMsg.innerHTML = '✅ Đã sửa lỗi! Bây giờ bạn có thể click vào tất cả các nút.';
                successMsg.style.cssText = `
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: #10b981;
                    color: white;
                    padding: 15px 20px;
                    border-radius: 8px;
                    z-index: 10001;
                    font-weight: 500;
                    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
                `;
                document.body.appendChild(successMsg);
                
                setTimeout(() => {
                    successMsg.remove();
                }, 3000);
            }, 500);
            
        } catch (error) {
            console.error('❌ QuickFix error:', error);
        }
    }
    
    // Execute when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', runAllFixes);
    } else {
        runAllFixes();
    }
    
    // Also execute after a short delay to ensure everything is loaded
    setTimeout(runAllFixes, 1000);
    
})();