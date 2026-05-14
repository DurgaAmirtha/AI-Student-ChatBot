document.addEventListener('DOMContentLoaded', () => {
    
    if(api.getToken() && window.location.pathname === '/' ) {
        // Automatically redirect to app if logged in
        window.location.href = '/app';
    }

    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const showSignupBtn = document.getElementById('showSignup');
    const showLoginBtn = document.getElementById('showLogin');
    const authError = document.getElementById('authError');

    if(showSignupBtn) {
        showSignupBtn.addEventListener('click', (e) => {
            e.preventDefault();
            loginForm.classList.add('hidden');
            signupForm.classList.remove('hidden');
            authError.classList.add('hidden');
        });
    }

    if(showLoginBtn) {
        showLoginBtn.addEventListener('click', (e) => {
            e.preventDefault();
            signupForm.classList.add('hidden');
            loginForm.classList.remove('hidden');
            authError.classList.add('hidden');
        });
    }

    function showError(msg) {
        authError.textContent = msg;
        authError.classList.remove('hidden');
    }

    if(loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;

            const formData = new URLSearchParams();
            formData.append('username', email); // OAuth2 requires 'username'
            formData.append('password', password);

            try {
                const res = await api.request('/auth/login', {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                });
                api.setToken(res.access_token);
                window.location.href = '/app';
            } catch (err) {
                showError(err.message);
            }
        });
    }

    if(signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('signupName').value;
            const email = document.getElementById('signupEmail').value;
            const password = document.getElementById('signupPassword').value;
            const course = document.getElementById('signupCourse').value;

            try {
                await api.request('/auth/register', {
                    method: 'POST',
                    body: JSON.stringify({ name, email, password, course })
                });
                // Switch back to login page
                showLoginBtn.click();
                showError("Registration successful! Please login.");
                authError.classList.remove('bg-red-500/10', 'border-red-500/50', 'text-red-400');
                authError.classList.add('bg-green-500/10', 'border-green-500/50', 'text-green-400');
            } catch (err) {
                showError(err.message);
            }
        });
    }
});
