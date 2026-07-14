document.addEventListener('DOMContentLoaded', async () => {
    const form = document.getElementById('adminLoginForm');
    const emailInput = document.getElementById('admin-email');
    const passwordInput = document.getElementById('admin-password');
    const toggleBtn = document.getElementById('togglePassword');
    const passwordIcon = document.getElementById('passwordIcon');
    const loginBtn = document.getElementById('login-btn');
    const btnText = document.getElementById('btn-text');
    const btnSpinner = document.getElementById('btn-spinner');
    const loginError = document.getElementById('login-error');
    const emailError = document.getElementById('email-error');
    const passwordError = document.getElementById('password-error');
    const rememberMe = document.getElementById('remember-me');

    const API_BASE_URL = (typeof window !== 'undefined' && window.API_BASE_URL) || window.location.origin;

    function buildUrl(path) {
        return API_BASE_URL + path;
    }

    function getAuthHeaders() {
        const token = localStorage.getItem('admin_token');
        const headers = { 'Content-Type': 'application/json' };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        return headers;
    }

    async function apiRequest(path, options = {}) {
        const url = buildUrl(path);
        const headers = getAuthHeaders();
        const mergedOptions = {
            ...options,
            headers: { ...headers, ...options.headers }
        };

        let res;
        try {
            res = await fetch(url, mergedOptions);
        } catch (err) {
            if (err.name === 'TypeError' && err.message === 'Failed to fetch') {
                throw new Error('Unable to connect to the server. Please check that the backend is running and the API URL is configured correctly.');
            }
            throw new Error('Network error: ' + err.message);
        }

        const contentType = res.headers.get('content-type') || '';
        const isJson = contentType.includes('application/json');

        if (!res.ok) {
            let message = `Server returned status ${res.status}.`;
            if (isJson) {
                try {
                    const errData = await res.json();
                    message = errData.message || errData.error || message;
                } catch (_) {
                    message = `Server returned status ${res.status} with an unexpected response.`;
                }
            } else {
                const text = await res.text();
                if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
                    message = 'The server returned an HTML page instead of a JSON response. Please check the API URL.';
                } else {
                    message = `Server returned status ${res.status} with an unexpected response.`;
                }
            }
            const error = new Error(message);
            error.status = res.status;
            throw error;
        }

        if (!isJson) {
            const text = await res.text();
            if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
                throw new Error('The server returned an HTML page instead of a JSON response. Please check the API URL.');
            }
            throw new Error('Server returned a non-JSON response.');
        }

        return await res.json();
    }

    async function checkServerHealth() {
        try {
            const data = await apiRequest('/api/health');
            return true;
        } catch (err) {
            console.error('Server health check failed:', err);
            return false;
        }
    }

    toggleBtn.addEventListener('click', () => {
        const type = passwordInput.type === 'password' ? 'text' : 'password';
        passwordInput.type = type;
        passwordIcon.textContent = type === 'password' ? 'visibility' : 'visibility_off';
    });

    emailInput.addEventListener('input', () => {
        emailError.classList.add('hidden');
        loginError.classList.add('hidden');
    });

    passwordInput.addEventListener('input', () => {
        passwordError.classList.add('hidden');
        loginError.classList.add('hidden');
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        emailError.classList.add('hidden');
        passwordError.classList.add('hidden');
        loginError.classList.add('hidden');

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        let hasError = false;
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            emailError.classList.remove('hidden');
            hasError = true;
        }
        if (!password || password.length < 6) {
            passwordError.classList.remove('hidden');
            hasError = true;
        }

        if (hasError) return;

        setLoading(true);

        try {
            const data = await apiRequest('/api/admin/login', {
                method: 'POST',
                body: JSON.stringify({
                    email,
                    password,
                    rememberMe: rememberMe.checked
                })
            });

            if (data.success && data.token) {
                localStorage.setItem('admin_token', data.token);
                localStorage.setItem('admin_user', JSON.stringify(data.user || {}));
            }

            window.location.href = '/admin-dashboard.html';
        } catch (err) {
            loginError.textContent = err.message;
            loginError.classList.remove('hidden');
            setLoading(false);
        }
    });

    function setLoading(isLoading) {
        if (isLoading) {
            loginBtn.disabled = true;
            loginBtn.classList.add('opacity-70', 'cursor-not-allowed');
            btnText.textContent = 'Logging in...';
            btnSpinner.classList.remove('hidden');
        } else {
            loginBtn.disabled = false;
            loginBtn.classList.remove('opacity-70', 'cursor-not-allowed');
            btnText.textContent = 'Login';
            btnSpinner.classList.add('hidden');
        }
    }

    async function checkSession() {
        try {
            const data = await apiRequest('/api/admin/session');
            if (data.loggedIn) {
                window.location.href = '/admin-dashboard.html';
            }
        } catch (err) {
            // Stay on login page if backend unreachable or session invalid
        }
    }

    // Check server health on page load
    const isHealthy = await checkServerHealth();
    if (!isHealthy && !window.location.search.includes('no-health-check')) {
        loginError.textContent = 'Unable to connect to the server. Please check that the backend is running and the API URL is configured correctly.';
        loginError.classList.remove('hidden');
        loginBtn.disabled = true;
        loginBtn.classList.add('opacity-50', 'cursor-not-allowed');
        btnText.textContent = 'Server Unavailable';
    }

    checkSession();
});
