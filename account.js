/*
     * ════════════════════════════════════════════════════════
     * ACCOUNT PAGE JAVASCRIPT
     *
     * Three independent save operations:
     * 1. Avatar upload  — converts file to base64, POSTs to /auth/me
     * 2. Profile save   — updates display_name + email via PUT /auth/me
     * 3. Password save  — sends current + new password via PUT /auth/me
     *
     * WHY three separate forms?
     * Each section can fail independently. If the email update fails
     * (e.g. already taken), the password form shouldn't be affected.
     * Keeps error messages localised and actions predictable.
     * ════════════════════════════════════════════════════════
     */

    const API      = '';
    const token    = sessionStorage.getItem('auth_token');
    const userRole = sessionStorage.getItem('user_role');
    const username = sessionStorage.getItem('username');

    // Auth guard
    if (!token) window.location.href = '/login';

    // Adjust back button destination based on role
    document.getElementById('backBtn').href =
      userRole === 'admin' ? '/dashboard-admin' : '/dashboard-guest';

    // Logout handlers
    ['logoutBtn', 'logoutBtnDanger'].forEach(id => {
      document.getElementById(id).addEventListener('click', () => {
        sessionStorage.clear();
        window.location.href = '/login';
      });
    });

    // ── API helper ──
    async function apiCall(path, method = 'GET', body = null) {
      const opts = {
        method,
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${token}`,
        },
      };
      if (body) opts.body = JSON.stringify(body);
      const res  = await fetch(API + path, opts);
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Request failed');
      return data;
    }

    // ── Message helper ──
    function showMsg(elId, text, type) {
      const el = document.getElementById(elId);
      el.className = `msg ${type}`;
      el.innerHTML = (type === 'error' ? '⚠️ ' : '✅ ') + text;
      // Auto-clear success messages after 4 seconds
      if (type === 'success') setTimeout(() => el.className = 'msg', 4000);
    }

    // ════════════════════════════════════
    // LOAD PROFILE ON PAGE OPEN
    // ════════════════════════════════════

    async function loadProfile() {
      try {
        /*
         * GET /auth/me/full returns the complete user document
         * (minus the password field). We use this to pre-fill
         * all the form fields.
         */
        const me = await apiCall('/auth/me/full');

        document.getElementById('fieldDisplayName').value = me.display_name || '';
        document.getElementById('fieldUsername').value    = me.username || '';
        document.getElementById('fieldEmail').value       = me.email || '';

        // Update the preview panel
        document.getElementById('previewDisplayName').textContent = me.display_name || me.username;
        document.getElementById('previewUsername').textContent    = `@${me.username}`;
        document.getElementById('previewRole').textContent        = me.role || 'guest';

        // Set avatar initial letter
        const initial = (me.display_name || me.username || '?')[0].toUpperCase();
        document.getElementById('avatarInitial').textContent = initial;

        // Load avatar if stored
        const storedAvatar = sessionStorage.getItem('avatar');
        if (storedAvatar) {
          setAvatarPreview(storedAvatar);
        } else if (me.avatar) {
          sessionStorage.setItem('avatar', me.avatar);
          setAvatarPreview(me.avatar);
        }

      } catch (err) {
        console.error('Failed to load profile:', err);
      }
    }

    function setAvatarPreview(src) {
      const el = document.getElementById('avatarPreview');
      // Keep the overlay div — just replace the initial span with an img
      el.innerHTML = `
        <img src="${src}" alt="avatar"/>
        <div class="avatar-overlay">📷<span>Change</span></div>`;
    }

    loadProfile();

    // ════════════════════════════════════
    // AVATAR UPLOAD
    // ════════════════════════════════════

    document.getElementById('avatarFileInput').addEventListener('change', async function() {
      const file = this.files[0];
      if (!file) return;

      /*
       * WHY 2MB limit?
       * MongoDB documents have a 16MB hard limit. A base64-encoded
       * image is ~33% larger than the raw file. Staying under 2MB
       * keeps the document well within limits and ensures fast loads.
       */
      if (file.size > 2 * 1024 * 1024) {
        showMsg('profileMsg', 'Image must be under 2 MB.', 'error');
        return;
      }

      // Convert the file to a base64 data URI using FileReader.
      // WHY FileReader instead of URL.createObjectURL?
      // createObjectURL creates a temporary browser-local URL —
      // it can't be stored in the DB or used across sessions.
      // Base64 is a plain string that travels over HTTP and lives in MongoDB.
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target.result; // "data:image/png;base64,..."

        try {
          await apiCall('/auth/me', 'PUT', { avatar: base64 });
          // Update the preview immediately — don't wait for a reload
          setAvatarPreview(base64);
          // Cache in sessionStorage so the dashboard header updates too
          sessionStorage.setItem('avatar', base64);
          showMsg('profileMsg', 'Profile picture updated.', 'success');
        } catch (err) {
          showMsg('profileMsg', err.message, 'error');
        }
      };
      reader.readAsDataURL(file);
    });

    // ════════════════════════════════════
    // SAVE PROFILE (display name + email)
    // ════════════════════════════════════

    async function saveProfile() {
      const display_name = document.getElementById('fieldDisplayName').value.trim();
      const email        = document.getElementById('fieldEmail').value.trim();

      if (!display_name) {
        showMsg('profileMsg', 'Display name cannot be empty.', 'error'); return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showMsg('profileMsg', 'Please enter a valid email address.', 'error'); return;
      }

      const btn = document.getElementById('saveProfileBtn');
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span>Saving…';

      try {
        await apiCall('/auth/me', 'PUT', { display_name, email });
        // Update the live preview name
        document.getElementById('previewDisplayName').textContent = display_name;
        showMsg('profileMsg', 'Profile saved successfully.', 'success');
      } catch (err) {
        showMsg('profileMsg', err.message, 'error');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Save Profile';
      }
    }

    // ════════════════════════════════════
    // PASSWORD STRENGTH METER
    // ════════════════════════════════════

    function scorePassword(pwd) {
      let score = 0;
      if (pwd.length >= 8)  score++;
      if (pwd.length >= 12) score++;
      if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
      if (/[0-9]/.test(pwd)) score++;
      if (/[^A-Za-z0-9]/.test(pwd)) score++;
      return Math.min(score, 4);
    }

    const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
    const strengthColors = ['', '#e05252', '#f5a623', '#3b9eff', '#3ecf8e'];

    document.getElementById('fieldNewPwd').addEventListener('input', function() {
      const v = this.value;
      const meter = document.getElementById('pwdStrengthMeter');
      const label = document.getElementById('pwdStrengthLabel');
      if (!v) { meter.removeAttribute('data-strength'); label.textContent = ''; return; }
      const score = scorePassword(v);
      meter.setAttribute('data-strength', score);
      label.textContent  = strengthLabels[score];
      label.style.color  = strengthColors[score];
    });

    // ════════════════════════════════════
    // CHANGE PASSWORD
    // ════════════════════════════════════

    async function savePassword() {
      const current = document.getElementById('fieldCurrentPwd').value;
      const newPwd  = document.getElementById('fieldNewPwd').value;
      const confirm = document.getElementById('fieldConfirmPwd').value;

      if (!current) {
        showMsg('pwdMsg', 'Please enter your current password.', 'error'); return;
      }
      if (newPwd.length < 8) {
        showMsg('pwdMsg', 'New password must be at least 8 characters.', 'error'); return;
      }
      if (scorePassword(newPwd) < 2) {
        showMsg('pwdMsg', 'Password is too weak — add numbers or uppercase letters.', 'error'); return;
      }
      if (newPwd !== confirm) {
        showMsg('pwdMsg', 'Passwords do not match.', 'error'); return;
      }

      const btn = document.getElementById('savePwdBtn');
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span>Updating…';

      try {
        /*
         * We send current_password so the backend can verify the
         * user knows their existing password before allowing a change.
         * WHY? Prevents someone who left their session open from
         * having their password changed without their knowledge.
         */
        await apiCall('/auth/me', 'PUT', {
          current_password: current,
          new_password:     newPwd,
        });
        document.getElementById('fieldCurrentPwd').value = '';
        document.getElementById('fieldNewPwd').value     = '';
        document.getElementById('fieldConfirmPwd').value = '';
        document.getElementById('pwdStrengthMeter').removeAttribute('data-strength');
        document.getElementById('pwdStrengthLabel').textContent = '';
        showMsg('pwdMsg', 'Password updated successfully.', 'success');
      } catch (err) {
        showMsg('pwdMsg', err.message, 'error');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Update Password';
      }
    }
