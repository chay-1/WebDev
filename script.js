// Centralized, defensive client script
document.addEventListener('DOMContentLoaded', function () {
    const $ = id => document.getElementById(id);

    function safeAddSubmit(id, handler) {
        const form = $(id);
        if (!form) return;
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            handler(form);
        });
    }

    // pending credentials stored after initial submit; login completes after user chooses role
    let pendingLogin = null;

    function showLoginMessage(text, color) {
        let el = document.getElementById('loginMessage');
        if (!el) {
            el = document.createElement('div');
            el.id = 'loginMessage';
            el.style.marginTop = '8px';
            const container = document.querySelector('.container') || document.body;
            container.appendChild(el);
        }
        el.style.color = color || 'red';
        el.textContent = text;
    }

    function handleRoleLogin(role) {
        const form = document.getElementById('loginForm');
        // try to read pendingLogin from in-memory or sessionStorage
        let pending = pendingLogin;
        if (!pending) {
            try { pending = JSON.parse(sessionStorage.getItem('pendingLogin')); } catch (e) { pending = null; }
        }
        if (!pending) return;
        const email = pending.email;
        const password = pending.password;

        // If backend is configured, send role with credentials
        if (window.BACKEND_URL) {
            fetch(window.BACKEND_URL.replace(/\/$/, '') + '/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email, password: password, role: role })
            }).then(res => {
                if (!res.ok) throw new Error('Authentication failed');
                return res.json();
            }).then(data => {
                if (data && data.success) {
                    // store current role for navigation decisions
                    const finalRole = data.role || role;
                    try { sessionStorage.setItem('currentRole', finalRole); } catch (e) {}
                    if (finalRole === 'admin') window.location.href = 'AdminDB.html';
                    else window.location.href = 'UserDB.html';
                } else {
                    showLoginMessage(data && data.message ? data.message : 'Login failed', 'red');
                }
            }).catch(err => {
                console.error(err);
                    showLoginMessage('Login failed. Check backend or try again.', 'red');
            });
            // clear pending
            pendingLogin = null;
            sessionStorage.removeItem('pendingLogin');
            return;
        }

        // Fallback client behavior: honor chosen role
        if (!email || !password) {
            showLoginMessage('Please enter email and password.', 'red');
            return;
        }
        if (role === 'admin') {
            try { sessionStorage.setItem('currentRole', 'admin'); } catch (e) {}
            sessionStorage.removeItem('pendingLogin');
            window.location.href = 'AdminDB.html';
            return;
        }
        try { sessionStorage.setItem('currentRole', 'user'); } catch (e) {}
        sessionStorage.removeItem('pendingLogin');
        window.location.href = 'UserDB.html';
    }

    // Expose handler to pages that call it (RoleSelection.html)
    window.handleRoleLogin = handleRoleLogin;

    safeAddSubmit('loginForm', function (form) {
        const email = form.querySelector('#email')?.value.trim() || '';
        const password = form.querySelector('#password')?.value || '';
        console.log('Login Attempt:', email);

        if (!email || !password) {
            showLoginMessage('Please enter email and password.', 'red');
            return;
        }

        // store credentials in sessionStorage and redirect to selection page
        const pending = { email: email, password: password };
        try { sessionStorage.setItem('pendingLogin', JSON.stringify(pending)); } catch (e) { /* ignore */ }
        window.location.href = 'RoleSelection.html';
    });

    safeAddSubmit('resetPasswordForm', function (form) {
        const resetEmail = form.querySelector('#resetEmail')?.value.trim() || '';
        console.log('Reset Password Attempt:', resetEmail);
        // Show an inline message instead of navigating away
        let msgEl = document.getElementById('resetMessage');
        if (!msgEl) {
            msgEl = document.createElement('div');
            msgEl.id = 'resetMessage';
            msgEl.style.marginTop = '10px';
            form.appendChild(msgEl);
        }
        if (!resetEmail) {
            msgEl.style.color = 'red';
            msgEl.textContent = 'Please enter your email address.';
            return;
        }
        // If a backend is configured, call it; otherwise show a friendly success message.
        if (window.BACKEND_URL) {
            fetch(window.BACKEND_URL.replace(/\/$/, '') + '/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: resetEmail })
            }).then(res => res.json()).then(data => {
                msgEl.style.color = data && data.success ? 'green' : 'red';
                msgEl.textContent = data && data.message ? data.message : (data && data.success ? 'If that email exists, a reset link was sent.' : 'Unable to request password reset.');
            }).catch(err => {
                console.error(err);
                msgEl.style.color = 'red';
                msgEl.textContent = 'Unable to contact the server. Try again later.';
            });
        } else {
            msgEl.style.color = 'green';
            msgEl.textContent = 'If that email exists, a reset link was sent. Check your inbox.';
        }
    });

    safeAddSubmit('signUpForm', function (form) {
        const fullName = form.querySelector('#fullName')?.value.trim() || '';
        const signUpEmail = form.querySelector('#signUpEmail')?.value.trim() || '';
        const signUpPassword = form.querySelector('#signUpPassword')?.value || '';
        const role = 'user'; // sign-ups default to user; admin must be created separately
        console.log('Sign Up Attempt:', fullName, signUpEmail);

        // Simple client-side validation
        let msgEl = document.getElementById('signUpMessage');
        if (!msgEl) {
            msgEl = document.createElement('div');
            msgEl.id = 'signUpMessage';
            msgEl.style.marginTop = '10px';
            form.appendChild(msgEl);
        }
        if (!fullName || !signUpEmail || !signUpPassword) {
            msgEl.style.color = 'red';
            msgEl.textContent = 'Please complete all fields.';
            return;
        }

        // If a backend URL is provided, post the sign-up data
        if (window.BACKEND_URL) {
            fetch(window.BACKEND_URL.replace(/\/$/, '') + '/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fullName: fullName, email: signUpEmail, password: signUpPassword, role: role })
            }).then(res => res.json()).then(data => {
                if (data && data.success) {
                    // Backend may return role
                    if (data.role === 'admin') window.location.href = 'AdminDB.html';
                    else window.location.href = 'UserDB.html';
                } else {
                    msgEl.style.color = 'red';
                    msgEl.textContent = data && data.message ? data.message : 'Sign up failed.';
                }
            }).catch(err => {
                console.error(err);
                msgEl.style.color = 'red';
                msgEl.textContent = 'Unable to contact server.';
            });
            return;
        }

        // Default user redirect after sign-up
        window.location.href = 'UserDB.html';
    });

    safeAddSubmit('userLoginForm', function (form) {
        const fullName = form.querySelector('#fullName')?.value.trim() || '';
        const email = form.querySelector('#email')?.value.trim() || '';
        const password = form.querySelector('#password')?.value || '';
        console.log('User Login Attempt:', fullName, email);

        if (!email || !password) {
            showLoginMessage('Please enter email and password.', 'red');
            return;
        }

        // If backend is configured, call it
        if (window.BACKEND_URL) {
            fetch(window.BACKEND_URL.replace(/\/$/, '') + '/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fullName: fullName, email: email, password: password, role: 'user' })
            }).then(res => {
                if (!res.ok) throw new Error('Authentication failed');
                return res.json();
            }).then(data => {
                if (data && data.success) {
                    try { sessionStorage.setItem('currentRole', data.role || 'user'); } catch (e) {}
                    window.location.href = 'UserDB.html';
                } else {
                    showLoginMessage(data && data.message ? data.message : 'Login failed', 'red');
                }
            }).catch(err => {
                console.error(err);
                showLoginMessage('Login failed. Check backend or try again.', 'red');
            });
            return;
        }

        // Fallback client-side behavior: accept any credentials and go to user dashboard
        try { sessionStorage.setItem('currentRole', 'user'); } catch (e) {}
        window.location.href = 'UserDB.html';
    });

    // Admin login page handler (role-specific login when user opens AdminLoginPage.html)
    safeAddSubmit('adminLoginForm', function (form) {
        const fullName = form.querySelector('#adminFullName')?.value.trim() || '';
        const email = form.querySelector('#adminEmail')?.value.trim() || '';
        const password = form.querySelector('#adminPassword')?.value || '';
        console.log('Admin Login Attempt:', fullName, email);

        if (!email || !password) {
            showLoginMessage('Please enter email and password.', 'red');
            return;
        }

        if (window.BACKEND_URL) {
            fetch(window.BACKEND_URL.replace(/\/$/, '') + '/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fullName: fullName, email: email, password: password, role: 'admin' })
            }).then(res => {
                if (!res.ok) throw new Error('Authentication failed');
                return res.json();
            }).then(data => {
                if (data && data.success) {
                    try { sessionStorage.setItem('currentRole', data.role || 'admin'); } catch (e) {}
                    window.location.href = 'AdminDB.html';
                } else {
                    showLoginMessage(data && data.message ? data.message : 'Admin login failed', 'red');
                }
            }).catch(err => {
                console.error(err);
                showLoginMessage('Login failed. Check backend or try again.', 'red');
            });
            return;
        }

        // Fallback: allow admin login locally
        try { sessionStorage.setItem('currentRole', 'admin'); } catch (e) {}
        window.location.href = 'AdminDB.html';
    });

    // Toggle helpers
    function toggle(id) {
        const el = $(id);
        if (!el) return;
        el.classList.toggle('hidden');
    }

    // Expose simple toggles for inline onclick attributes in HTML
    window.toggleForgotPassword = function () {
        const login = $('loginForm');
        const forgot = $('forgotPassword');
        if (!login || !forgot) return;
        login.classList.toggle('hidden');
        forgot.classList.toggle('hidden');
    };

    window.toggleSignUp = function () {
        const login = $('loginForm');
        const signUp = $('signUp');
        if (!login || !signUp) return;
        login.classList.toggle('hidden');
        signUp.classList.toggle('hidden');
    };

    // Show/hide admin code input when role selection changes
    window.toggleAdminCode = function (value) {
        const wrapper = document.getElementById('adminCodeWrapper');
        if (!wrapper) return;
        if (value === 'admin') wrapper.classList.remove('hidden');
        else wrapper.classList.add('hidden');
    };

    // Role selection is handled on RoleSelection.html which calls window.handleRoleLogin(role)

    // Navigation helpers — use actual filenames present in the workspace
    window.navigateToLeaveRequest = function () {
        console.log('Navigating to Leave Request');
        window.location.href = 'LeaveRequest.html';
    };

    window.navigateToProfile = function () {
        console.log('Navigate to profile requested');
        // No profile page in project root; keep as a no-op for safety.
    };

    window.navigateToNext = function () {
        const roleSelect = $('roleSelect');
        const role = roleSelect ? roleSelect.value : null;
        if (role === 'user') {
            window.location.href = 'UserLoginPage.html';
        } else if (role === 'admin') {
            window.location.href = 'AdminLoginPage.html';
        }
    };

    window.selectRole = function (role) {
        if (role === 'user') {
            window.location.href = 'UserLoginPage.html';
        } else if (role === 'admin') {
            window.location.href = 'AdminLoginPage.html';
        }
    };

    window.navigateHome = function () {
        window.location.href = 'LandingPage1.html';
    };

    window.navigateToLeaveStatus = function () {
        window.location.href = 'LeaveStatus.html';
    };

    window.openLeaveRequest = function (status) {
        // Pass status via query string if needed
        window.location.href = 'LeaveRequestDetails.html' + (status ? '?status=' + encodeURIComponent(status) : '');
    };

    window.approveLeave = function () {
        alert('Leave Approved');
        // TODO: call backend to update status
    };

    window.declineLeave = function () {
        alert('Leave Declined');
        // TODO: call backend to update status
    };

    // Toggle a named list's visibility on the Leave Status page
    window.toggleList = function (name) {
        const el = document.getElementById(name + 'List');
        if (!el) return;
        el.classList.toggle('hidden');
        // update aria-expanded on the button if present
        const btn = el.previousElementSibling ? el.previousElementSibling.querySelector('button') : null;
        if (btn) btn.setAttribute('aria-expanded', String(!el.classList.contains('hidden')));
    };

    window.navigateBackToDashboard = function () {
        // Prefer returning to the previous app page when possible
        try {
            const ref = document.referrer || '';
            // If the user came from one of our dashboard pages, go back in history
            if (ref.includes('UserDB.html') || ref.includes('AdminDB.html') || ref.includes('RoleSelection.html') || ref.includes('LeaveRequest.html')) {
                history.back();
                return;
            }
        } catch (e) { /* ignore */ }

        // If we have a stored currentRole, send to that dashboard
        try {
            const current = sessionStorage.getItem('currentRole');
            if (current === 'admin') {
                window.location.href = 'AdminDB.html';
                return;
            } else if (current === 'user') {
                window.location.href = 'UserDB.html';
                return;
            }
        } catch (e) { /* ignore */ }

        // If there are pending credentials (sessionStorage), go to role selection so user can choose User/Admin
        try {
            const pending = sessionStorage.getItem('pendingLogin');
            if (pending) {
                window.location.href = 'RoleSelection.html';
                return;
            }
        } catch (e) {
            // ignore
        }

        // Default to Login screen
        window.location.href = 'LoginScreen.html';
    };
});