/*
     * ─────────────────────────────────────────────
     * REGISTRATION PAGE JAVASCRIPT
     *
     * Three layers of logic here:
     * 1. REAL-TIME VALIDATION — runs as the user types (oninput)
     *    Gives instant feedback without waiting for submit.
     *
     * 2. SUBMIT VALIDATION — final check before the API call.
     *    Catches anything the real-time checks might have missed
     *    (e.g. user never touched a field).
     *
     * 3. API CALL — POST to /auth/register, handle response.
     * ─────────────────────────────────────────────
     */

    // ── DOM references ──
    const form            = document.getElementById('registerForm');
    const registerBtn     = document.getElementById('registerBtn');
    const feedbackEl      = document.getElementById('feedbackMsg');
    const successPanel    = document.getElementById('successPanel');
    const successUsername = document.getElementById('successUsername');
    const loginLinkRow    = document.getElementById('loginLinkRow');
    const strengthMeter   = document.getElementById('strengthMeter');
    const strengthLabel   = document.getElementById('strengthLabel');

    // ── Helper: show/hide inline message ──
    function showMessage(text, type) {
      feedbackEl.className = `message ${type}`;
      feedbackEl.innerHTML = (type === 'error' ? '⚠️ ' : '✅ ') + text;
    }

    // ── Helper: set field validation state ──
    // wrapId: the id of the .input-wrap div
    // state: 'valid' | 'invalid' | '' (neutral)
    // hintText: text to show below the field
    // hintType: 'error' | 'success' | '' (default muted)
    function setFieldState(wrapId, state, hintText = '', hintType = '') {
      const wrap = document.getElementById(wrapId);
      const hint = document.getElementById(`hint-${wrapId.replace('wrap-', '')}`);
      const icon = wrap.querySelector('.status-icon');

      // Remove old states
      wrap.classList.remove('valid', 'invalid');
      if (state) wrap.classList.add(state);

      // Update the right-side status icon
      if (state === 'valid')   icon.textContent = '✓';
      if (state === 'invalid') icon.textContent = '✕';
      if (!state)              icon.textContent = '';

      // Update hint text
      if (hint) {
        hint.textContent = hintText;
        hint.className = `field-hint ${hintType}`;
      }
    }

    // ─────────────────────────────────────────────
    // REAL-TIME VALIDATION HANDLERS
    // Each field validates itself as the user types.
    // We use 'input' events (fires on every keystroke).
    // ─────────────────────────────────────────────

    // ── Display Name ──
    document.getElementById('displayName').addEventListener('input', function() {
      const v = this.value.trim();
      if (!v) {
        setFieldState('wrap-displayName', '', 'Your name as it appears in the dashboard.');
      } else if (v.length < 2) {
        setFieldState('wrap-displayName', 'invalid', 'Must be at least 2 characters.', 'error');
      } else {
        setFieldState('wrap-displayName', 'valid', '');
      }
    });

    // ── Username ──
    // Rules: 3-20 chars, alphanumeric + underscores only.
    // WHY these rules? Prevents spaces (which cause URL issues),
    // special chars (which cause injection risks), and very short
    // names (which are likely placeholder/test entries).
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;

    document.getElementById('username').addEventListener('input', function() {
      const v = this.value.trim();
      if (!v) {
        setFieldState('wrap-username', '', '3–20 characters. Letters, numbers, and _ only.');
      } else if (!usernameRegex.test(v)) {
        setFieldState('wrap-username', 'invalid',
          v.length < 3 ? 'Too short — minimum 3 characters.' :
          v.length > 20 ? 'Too long — maximum 20 characters.' :
          'Only letters, numbers, and underscores allowed.',
          'error');
      } else {
        setFieldState('wrap-username', 'valid', `"${v}" looks good!`, 'success');
      }
    });

    // ── Email ──
    // Simple format check — the server will do the real validation.
    // We use a basic regex rather than a complex one because email
    // validation is notoriously tricky and the server catches edge cases.
    document.getElementById('email').addEventListener('input', function() {
      const v = this.value.trim();
      const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      if (!v) {
        setFieldState('wrap-email', '', '');
      } else if (!ok) {
        setFieldState('wrap-email', 'invalid', 'Please enter a valid email address.', 'error');
      } else {
        setFieldState('wrap-email', 'valid', '');
      }
    });

    // ── Password strength algorithm ──
    // Scores the password on 4 criteria (0–4 points).
    // WHY score rather than pass/fail? Gradual improvement gives
    // the user agency. They can stop at "Good" if they want.
    function scorePassword(pwd) {
      let score = 0;
      if (pwd.length >= 8)  score++;          // Minimum length
      if (pwd.length >= 12) score++;          // Better length
      if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++; // Mixed case
      if (/[0-9]/.test(pwd)) score++;         // Has number
      if (/[^A-Za-z0-9]/.test(pwd)) score++;  // Has special char
      return Math.min(score, 4);              // Cap at 4
    }

    const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
    const strengthColors = ['', 'var(--strength-weak)', 'var(--strength-fair)', 'var(--strength-good)', 'var(--strength-strong)'];

    document.getElementById('password').addEventListener('input', function() {
      const v = this.value;
      if (!v) {
        strengthMeter.removeAttribute('data-strength');
        strengthLabel.textContent = '';
        setFieldState('wrap-password', '', '');
        // Also re-check confirm password if it has a value
        checkConfirmMatch();
        return;
      }

      const score = scorePassword(v);
      strengthMeter.setAttribute('data-strength', score);
      strengthLabel.textContent = strengthLabels[score];
      strengthLabel.style.color = strengthColors[score];

      if (v.length < 8) {
        setFieldState('wrap-password', 'invalid', 'Password must be at least 8 characters.', 'error');
      } else if (score < 2) {
        setFieldState('wrap-password', 'invalid', 'Try adding numbers or uppercase letters.', 'error');
      } else {
        setFieldState('wrap-password', 'valid', '');
      }

      // Always re-evaluate confirm password when the password changes,
      // because the user might have already typed in confirm.
      checkConfirmMatch();
    });

    // ── Confirm Password ──
    function checkConfirmMatch() {
      const pwd     = document.getElementById('password').value;
      const confirm = document.getElementById('confirmPassword').value;
      if (!confirm) {
        setFieldState('wrap-confirmPassword', '', '');
        return;
      }
      if (pwd === confirm) {
        setFieldState('wrap-confirmPassword', 'valid', 'Passwords match!', 'success');
      } else {
        setFieldState('wrap-confirmPassword', 'invalid', 'Passwords do not match.', 'error');
      }
    }

    document.getElementById('confirmPassword').addEventListener('input', checkConfirmMatch);

    // ─────────────────────────────────────────────
    // SUBMIT HANDLER
    // ─────────────────────────────────────────────
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const displayName     = document.getElementById('displayName').value.trim();
      const username        = document.getElementById('username').value.trim();
      const email           = document.getElementById('email').value.trim();
      const password        = document.getElementById('password').value;
      const confirmPassword = document.getElementById('confirmPassword').value;

      // ── Final validation sweep ──
      // We re-run all checks here so fields the user never touched
      // (just tabbed past) also get validated on submit.
      let errors = [];

      if (!displayName || displayName.length < 2)
        errors.push('Please enter a valid display name.');

      if (!usernameRegex.test(username))
        errors.push('Username must be 3–20 characters, letters/numbers/_ only.');

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        errors.push('Please enter a valid email address.');

      if (password.length < 8)
        errors.push('Password must be at least 8 characters.');

      if (scorePassword(password) < 2)
        errors.push('Password is too weak — add numbers or uppercase letters.');

      if (password !== confirmPassword)
        errors.push('Passwords do not match.');

      if (errors.length > 0) {
        showMessage(errors[0], 'error'); // Show first error only — don't overwhelm
        return;
      }

      // ── Loading state ──
      registerBtn.disabled = true;
      registerBtn.innerHTML = '<span class="spinner"></span>Creating account…';
      feedbackEl.className = 'message';

      try {
        /*
         * POST to /auth/register
         * Body matches the RegisterRequest Pydantic model in main.py:
         * { username, password, email, display_name }
         *
         * The backend will:
         * 1. Check username + email aren't already taken
         * 2. Hash the password with bcrypt
         * 3. Insert the user document with approved: false
         * 4. Return a success message
         */
        const response = await fetch('/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username,
            password,
            email,
            display_name: displayName
          })
        });

        const data = await response.json();

        if (!response.ok) {
          // 409 = username or email already taken
          // 422 = validation error from Pydantic
          showMessage(data.detail || 'Registration failed. Please try again.', 'error');
          return;
        }

        // ── SUCCESS ──
        // Hide the form, show the confirmation panel.
        // We don't redirect because the user can't log in yet anyway —
        // they need admin approval first.
        successUsername.textContent = username;
        form.style.display = 'none';
        loginLinkRow.style.display = 'none';
        successPanel.classList.add('visible');

      } catch (err) {
        showMessage('Could not reach the server. Is the backend running?', 'error');
        console.error('Register error:', err);
      } finally {
        registerBtn.disabled = false;
        registerBtn.innerHTML = 'Create Account';
      }
    });

    // Redirect if already logged in (no need to register again)
    window.addEventListener('DOMContentLoaded', () => {
      if (sessionStorage.getItem('auth_token')) {
        const role = sessionStorage.getItem('user_role');
        window.location.href = role === 'admin'
          ? '/dashboard-admin'
          : '/dashboard-guest';
      }
    });
