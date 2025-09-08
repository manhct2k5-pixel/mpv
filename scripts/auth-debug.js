// Authentication Debug & Fix Script
console.log('🔧 Auth Debug Script Loaded');

// Enhanced error logging
const originalFetch = window.fetch;
window.fetch = function(...args) {
    console.log('🌐 Fetch Request:', args[0]);
    return originalFetch.apply(this, args)
        .then(response => {
            console.log('📡 Fetch Response:', response.status, response.statusText);
            return response;
        })
        .catch(error => {
            console.error('❌ Fetch Error:', error);
            throw error;
        });
};

// Override AuthManager for better debugging
document.addEventListener('DOMContentLoaded', function() {
    // Add debug info to page
    const debugInfo = document.createElement('div');
    debugInfo.id = 'auth-debug-info';
    debugInfo.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        background: rgba(0,0,0,0.8);
        color: white;
        padding: 10px;
        border-radius: 5px;
        font-size: 12px;
        font-family: monospace;
        z-index: 9999;
        max-width: 300px;
        display: none;
    `;
    document.body.appendChild(debugInfo);
    
    // Show debug info on Ctrl+D
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.key === 'd') {
            e.preventDefault();
            const debugDiv = document.getElementById('auth-debug-info');
            debugDiv.style.display = debugDiv.style.display === 'none' ? 'block' : 'none';
            
            // Update debug info
            debugDiv.innerHTML = `
                <strong>🔧 Auth Debug Info</strong><br>
                Origin: ${window.location.origin}<br>
                API Base: http://localhost:5000/api<br>
                LocalStorage: ${localStorage.getItem('isLoggedIn') || 'none'}<br>
                User: ${localStorage.getItem('userName') || 'none'}<br>
                Email: ${localStorage.getItem('userEmail') || 'none'}<br>
                <hr style="margin:5px 0;">
                <small>Press Ctrl+D to hide</small>
            `;
        }
    });
    
    // Add connection test button
    const testBtn = document.createElement('button');
    testBtn.innerHTML = '🔧 Debug Test';
    testBtn.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 8px 12px;
        background: #007bff;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        z-index: 9999;
        font-size: 12px;
    `;
    testBtn.onclick = async function() {
        try {
            const response = await fetch('http://localhost:5000/api/user', {
                credentials: 'include'
            });
            
            if (response.status === 401) {
                alert('✅ Server OK - Not logged in');
            } else if (response.ok) {
                const data = await response.json();
                alert(`✅ Server OK - Logged in as: ${data.user?.name}`);
            } else {
                alert(`⚠️ Server response: ${response.status}`);
            }
        } catch (error) {
            alert(`❌ Connection failed: ${error.message}`);
        }
    };
    document.body.appendChild(testBtn);
    
    console.log('🔧 Debug tools added. Press Ctrl+D for debug info');
});

// Enhanced CORS fix
if (!window.corsFixed) {
    const originalXHR = window.XMLHttpRequest;
    window.XMLHttpRequest = function() {
        const xhr = new originalXHR();
        const originalOpen = xhr.open;
        xhr.open = function(method, url, async, user, password) {
            if (url.includes('localhost:5000')) {
                xhr.withCredentials = true;
            }
            return originalOpen.apply(this, arguments);
        };
        return xhr;
    };
    window.corsFixed = true;
    console.log('🔧 CORS fix applied');
}