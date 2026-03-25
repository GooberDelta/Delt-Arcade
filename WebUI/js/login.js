/*
     * ─────────────────────────────────────────────────────
     * AUTH FLOW EXPLAINED
     *
     * 1. User submits form
     * 2. We POST credentials to Python backend at /auth/login
     * 3. Backend hashes the password and checks it against MongoDB
     * 4. If correct, backend returns a JWT (JSON Web Token)
     * 5. We store the JWT in sessionStorage
     * 6. Every future API call sends: Authorization: Bearer <token>
     * 7. Backend verifies the JWT signature before returning data
     *
     * WHY sessionStorage (not localStorage)?
     * sessionStorage clears when the tab closes — more secure for
     * an admin system. Use localStorage if you prefer persistent login.
     * ─────────────────────────────────────────────────────
     */

    const form       = document.getElementById('loginForm');
    const loginBtn   = document.getElementById('loginBtn');
    const feedbackEl = document.getElementById('feedbackMsg');

    function showMessage(text, type) {
      feedbackEl.className = `message ${type}`;
      feedbackEl.innerHTML = (type === 'error' ? '&#9888;&#65039; ' : '&#9989; ') + text;
    }

    function validate(username, password) {
      if (!username.trim()) return 'Please enter your username.';
      if (!password)         return 'Please enter your password.';
      if (password.length < 6) return 'Password must be at least 6 characters.';
      return null; // null = no error
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault(); // Prevent browser page reload on submit

      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;

      // Client-side validation — fast check before hitting the server
      const err = validate(username, password);
      if (err) { showMessage(err, 'error'); return; }

      // Show loading state
      loginBtn.disabled = true;
      loginBtn.innerHTML = '<span class="spinner"></span>Signing in&hellip;';
      feedbackEl.className = 'message';

      try {
        /*
         * fetch() — the browser's built-in HTTP client.
         * We POST JSON to our FastAPI backend.
         * 'Content-Type: application/json' tells the server
         * what format the body is in — FastAPI requires this.
         *
         * Replace the URL with your actual backend address.
         * Local dev: http://localhost:8000
         */
        const response = await fetch('/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (!response.ok) {
          // Server returned 4xx or 5xx error
          showMessage(data.detail || 'Login failed. Please try again.', 'error');
          return;
        }

        /*
         * SUCCESS — store the JWT and user info.
         *
         * WHAT IS A JWT?
         * A small digitally-signed string: header.payload.signature
         * The payload contains user ID, role, expiry time.
         * The signature proves it hasn't been tampered with.
         * The backend uses a secret key to both sign and verify it.
         */
        sessionStorage.setItem('auth_token', data.access_token);
        sessionStorage.setItem('user_role',  data.role);
        sessionStorage.setItem('username',   data.username);

        showMessage('Login successful!', 'success');

        if (data.role === 'admin') {
          /*
           * Admins get a mode selector — they choose between the
           * Admin Panel and Guest Mode. The form is hidden so the
           * page feels clean and intentional rather than cluttered.
           */
          form.style.display = 'none';
          document.getElementById('orDivider').style.display = 'none';
          document.getElementById('modeSelector').classList.add('visible');
        } else {
          // Guests go straight to their dashboard
          setTimeout(() => {
            window.location.href = '/dashboard-guest';
          }, 800);
        }

      } catch (networkErr) {
        /*
         * This catch handles network failures (server down, wrong URL,
         * CORS issues) — NOT 4xx/5xx responses (those arrive normally).
         */
        showMessage('Could not reach the server. Is the backend running?', 'error');
        console.error('Login error:', networkErr);
      } finally {
        // Always restore the button whether success or failure
        loginBtn.disabled = false;
        loginBtn.innerHTML = 'Sign In';
      }
    });

    // Auto-redirect if a valid session already exists
    window.addEventListener('DOMContentLoaded', () => {
      const token = sessionStorage.getItem('auth_token');
      const role  = sessionStorage.getItem('user_role');
      if (!token) return;

      if (role === 'admin') {
        // Admin already logged in — show mode selector directly
        document.getElementById('loginForm').style.display    = 'none';
        document.getElementById('orDivider').style.display    = 'none';
        document.getElementById('modeSelector').classList.add('visible');
        // Also show a subtle welcome back message
        const feedbackEl = document.getElementById('feedbackMsg');
        feedbackEl.className = 'message success';
        feedbackEl.innerHTML = '&#9989; Session active — choose your view.';
        feedbackEl.style.display = 'flex';
      } else {
        window.location.href = '/dashboard-guest';
      }
    });
