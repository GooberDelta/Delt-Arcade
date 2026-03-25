/*
     * ════════════════════════════════════════════════════════
     * ADMIN DASHBOARD JAVASCRIPT
     *
     * ARCHITECTURE:
     * - On load: auth-guard check, then load the active tab's data
     * - Tab switching: show/hide panels + load data lazily (only
     *   when a tab is first visited, not all at once on page load)
     * - API calls: all use apiCall() helper which automatically
     *   attaches the JWT from sessionStorage
     * - Toast: lightweight notification for action feedback
     * ════════════════════════════════════════════════════════
     */

    const API = '';

    // ── Auth: read token and role from sessionStorage ──
    const token    = sessionStorage.getItem('auth_token');
    const userRole = sessionStorage.getItem('user_role');
    const username = sessionStorage.getItem('username');

    // Guard: redirect immediately if not an admin
    // WHY check this on the frontend too? It's not a security boundary
    // (the backend enforces that), but it prevents the flash of the
    // dashboard before the first API call fails and redirects.
    if (!token || userRole !== 'admin') {
      window.location.href = '/login';
    }

    document.getElementById('adminName').textContent = username || '—';

    // ── Logout ──
    document.getElementById('logoutBtn').addEventListener('click', () => {
      sessionStorage.clear();
      window.location.href = '/login';
    });

    // ── API helper ──
    // Attaches the JWT as a Bearer token to every request.
    // Returns parsed JSON or throws with the error detail.
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

    // ── Toast ──
    let toastTimer = null;
    function showToast(msg, type = 'success') {
      const existing = document.querySelector('.toast');
      if (existing) existing.remove();
      clearTimeout(toastTimer);

      const el = document.createElement('div');
      el.className = `toast ${type}`;
      el.textContent = (type === 'success' ? '✅ ' : '⚠️ ') + msg;
      document.body.appendChild(el);
      toastTimer = setTimeout(() => el.remove(), 3500);
    }

    // ── Tab switching ──
    // We track which tabs have been loaded to avoid redundant API calls.
    const loaded = new Set();

    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        // Deactivate all tabs and panels
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));

        // Activate clicked tab
        btn.classList.add('active');
        const tabId = btn.dataset.tab;
        document.getElementById(`panel-${tabId}`).classList.add('active');

        // Lazy-load: only fetch data the first time a tab is opened
        if (!loaded.has(tabId)) {
          loaded.add(tabId);
          loadTab(tabId);
        }
      });
    });

    function loadTab(tabId) {
      switch (tabId) {
        case 'overview':     loadOverview();        break;
        case 'approvals':    loadApprovals();       break;
        case 'users':        loadUsers();           break;
        case 'cards':        loadCards();           break;
        case 'transactions': loadTransactions();    break;
        case 'credits':      loadCreditRequests(); loadResolvedCredits(); break;
        case 'news':         loadNews();            break;
      }
    }

    // ════════════════════════════════════
    // OVERVIEW TAB
    // ════════════════════════════════════

    async function loadOverview() {
      try {
        const [stats, txns] = await Promise.all([
          apiCall('/admin/stats'),
          apiCall('/admin/transactions?limit=10'),
        ]);

        // Populate stat cards
        document.getElementById('stat-totalUsers').textContent    = stats.users.total;
        document.getElementById('stat-pendingUsers').textContent  = stats.users.pending;
        document.getElementById('stat-activeCards').textContent   = stats.cards.approved;
        document.getElementById('stat-pendingCards').textContent  = stats.cards.pending;
        document.getElementById('stat-creditsAdded').textContent  = stats.transactions.credits_added;
        document.getElementById('stat-creditsSpent').textContent  = stats.transactions.credits_spent;
        document.getElementById('stat-totalTxns').textContent     = stats.transactions.total;

        // Update the pending badge on the Approvals tab
        const pendingTotal = stats.users.pending + stats.cards.pending;
        const badge = document.getElementById('pendingBadge');
        if (pendingTotal > 0) {
          badge.textContent = pendingTotal;
          badge.classList.remove('hidden');
        } else {
          badge.classList.add('hidden');
        }

        // Render recent transactions mini-table
        document.getElementById('recentTxnsBody').innerHTML =
          txns.length === 0
            ? emptyState('No transactions yet.')
            : buildTxnTable(txns);

      } catch (err) {
        showToast(err.message, 'error');
      }
    }

    // ════════════════════════════════════
    // APPROVALS TAB
    // ════════════════════════════════════

    async function loadApprovals() {
      try {
        const [users, cards] = await Promise.all([
          apiCall('/admin/pending-users'),
          apiCall('/admin/pending-cards'),
        ]);
        renderPendingUsers(users);
        renderPendingCards(cards);
      } catch (err) {
        showToast(err.message, 'error');
      }
    }

    function renderPendingUsers(users) {
      const el = document.getElementById('pendingUsersBody');
      if (!users.length) { el.innerHTML = emptyState('No pending user accounts.'); return; }

      el.innerHTML = `
        <table class="data-table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Display Name</th>
              <th>Email</th>
              <th>Registered</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${users.map(u => `
              <tr id="urow-${u.username}">
                <td><strong>${u.username}</strong></td>
                <td>${u.display_name || '—'}</td>
                <td style="color:var(--text-muted)">${u.email}</td>
                <td style="color:var(--text-muted)">${fmtDate(u.created_at)}</td>
                <td>
                  <div class="action-group">
                    <button class="btn btn-approve"
                      onclick="approveUser('${u.username}')">✓ Approve</button>
                    <button class="btn btn-deny"
                      onclick="denyUser('${u.username}')">✕ Deny</button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>`;
    }

    function renderPendingCards(cards) {
      const el = document.getElementById('pendingCardsBody');
      if (!cards.length) { el.innerHTML = emptyState('No pending card requests.'); return; }

      el.innerHTML = `
        <table class="data-table">
          <thead>
            <tr>
              <th>UID</th>
              <th>Nickname</th>
              <th>Design</th>
              <th>Owner</th>
              <th>Requested</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${cards.map(c => `
              <tr id="crow-${c.uid}">
                <td class="uid">${c.uid}</td>
                <td><strong>${c.nickname}</strong></td>
                <td>${designChip(c.design)}</td>
                <td style="color:var(--text-muted)">${c.owner_username}</td>
                <td style="color:var(--text-muted)">${fmtDate(c.created_at)}</td>
                <td>
                  <div class="action-group">
                    <button class="btn btn-approve"
                      onclick="approveCard('${c.uid}')">✓ Approve</button>
                    <button class="btn btn-deny"
                      onclick="denyCard('${c.uid}')">✕ Deny</button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>`;
    }

    async function approveUser(username) {
      try {
        await apiCall(`/admin/approve-user/${username}`, 'POST');
        document.getElementById(`urow-${username}`)?.remove();
        showToast(`${username} approved.`);
        _cachedUsers = null;  // Invalidate cache — newly approved user should appear in dropdowns
        refreshBadge();
      } catch (err) { showToast(err.message, 'error'); }
    }

    async function denyUser(username) {
      try {
        await apiCall(`/admin/deny-user/${username}`, 'POST');
        const row = document.getElementById(`urow-${username}`);
        if (row) row.querySelector('.action-group').innerHTML =
          `<span class="badge badge-denied">Denied</span>`;
        showToast(`${username} denied.`);
        _cachedUsers = null;  // Invalidate cache
        refreshBadge();
      } catch (err) { showToast(err.message, 'error'); }
    }

    async function approveCard(uid) {
      try {
        await apiCall('/admin/approve-card', 'POST', { uid });
        document.getElementById(`crow-${uid}`)?.remove();
        showToast(`Card ${uid} approved.`);
        refreshBadge();
      } catch (err) { showToast(err.message, 'error'); }
    }

    async function denyCard(uid) {
      try {
        await apiCall(`/admin/deny-card/${uid}`, 'POST');
        const row = document.getElementById(`crow-${uid}`);
        if (row) row.querySelector('.action-group').innerHTML =
          `<span class="badge badge-denied">Denied</span>`;
        showToast(`Card ${uid} denied.`);
        refreshBadge();
      } catch (err) { showToast(err.message, 'error'); }
    }

    // Re-fetch stats to update the badge count after an approval/denial
    async function refreshBadge() {
      try {
        const [stats, creditReqs] = await Promise.all([
          apiCall('/admin/stats'),
          apiCall('/admin/credit-requests?status=pending'),
        ]);
        const total = stats.users.pending + stats.cards.pending;
        const badge = document.getElementById('pendingBadge');
        badge.textContent = total;
        total > 0 ? badge.classList.remove('hidden') : badge.classList.add('hidden');

        // Update credit requests badge separately
        const creditBadge = document.getElementById('creditBadge');
        const creditCount = creditReqs.length;
        creditBadge.textContent = creditCount;
        creditCount > 0
          ? creditBadge.classList.remove('hidden')
          : creditBadge.classList.add('hidden');
      } catch (_) {}
    }

    // ════════════════════════════════════
    // CREDIT REQUESTS TAB
    // ════════════════════════════════════

    async function loadCreditRequests() {
      const el = document.getElementById('pendingCreditsBody');
      el.innerHTML = `<div class="loading-state"><span class="spinner"></span> Loading…</div>`;
      try {
        const reqs = await apiCall('/admin/credit-requests?status=pending');

        // Update nav badge while we're here
        const badge = document.getElementById('creditBadge');
        badge.textContent = reqs.length;
        reqs.length > 0
          ? badge.classList.remove('hidden')
          : badge.classList.add('hidden');

        if (!reqs.length) {
          el.innerHTML = emptyState('No pending credit requests.');
          return;
        }

        el.innerHTML = `
          <table class="data-table">
            <thead>
              <tr>
                <th>Requested</th>
                <th>Card UID</th>
                <th>Owner</th>
                <th>Amount</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${reqs.map(r => `
                <tr id="creq-${r.card_uid}">
                  <td style="color:var(--text-muted);white-space:nowrap">
                    ${fmtDate(r.requested_at)}
                  </td>
                  <td class="uid">${r.card_uid}</td>
                  <td style="color:var(--text-muted)">${r.owner_username}</td>
                  <td>
                    <strong style="color:var(--accent)">${r.amount}</strong>
                    <span style="color:var(--text-muted);font-size:0.78rem"> credits</span>
                  </td>
                  <td>
                    <div class="action-group">
                      <button class="btn btn-approve"
                        onclick="approveCreditReq('${r.card_uid}')">✓ Approve</button>
                      <button class="btn btn-deny"
                        onclick="denyCreditReq('${r.card_uid}')">✕ Deny</button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>`;
      } catch (err) {
        el.innerHTML = emptyState(`Error: ${err.message}`);
      }
    }

    async function loadResolvedCredits() {
      const el = document.getElementById('resolvedCreditsBody');
      el.innerHTML = `<div class="loading-state"><span class="spinner"></span> Loading…</div>`;
      try {
        // Fetch both approved and denied in parallel
        const [approved, denied] = await Promise.all([
          apiCall('/admin/credit-requests?status=approved'),
          apiCall('/admin/credit-requests?status=denied'),
        ]);
        // Merge and sort by resolved_at descending, cap at 50
        const all = [...approved, ...denied]
          .sort((a, b) => new Date(b.resolved_at) - new Date(a.resolved_at))
          .slice(0, 50);

        if (!all.length) {
          el.innerHTML = emptyState('No resolved requests yet.');
          return;
        }

        el.innerHTML = `
          <table class="data-table">
            <thead>
              <tr>
                <th>Resolved</th>
                <th>Card UID</th>
                <th>Owner</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Resolved By</th>
              </tr>
            </thead>
            <tbody>
              ${all.map(r => `
                <tr>
                  <td style="color:var(--text-muted);white-space:nowrap">
                    ${fmtDate(r.resolved_at)}
                  </td>
                  <td class="uid">${r.card_uid}</td>
                  <td style="color:var(--text-muted)">${r.owner_username}</td>
                  <td style="color:var(--text-muted)">${r.amount}</td>
                  <td>${r.status === 'approved'
                    ? '<span class="badge badge-approved">Approved</span>'
                    : '<span class="badge badge-denied">Denied</span>'
                  }</td>
                  <td style="color:var(--text-muted)">${r.resolved_by || '—'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>`;
      } catch (err) {
        el.innerHTML = emptyState(`Error: ${err.message}`);
      }
    }

    async function approveCreditReq(cardUid) {
      try {
        const res = await apiCall(`/admin/credit-requests/${cardUid}/approve`, 'POST');
        document.getElementById(`creq-${cardUid}`)?.remove();
        showToast(`Credits approved. New balance: ${res.balance_after}`);
        refreshBadge();
        // Reload resolved panel so it stays current
        loadResolvedCredits();
      } catch (err) { showToast(err.message, 'error'); }
    }

    async function denyCreditReq(cardUid) {
      try {
        await apiCall(`/admin/credit-requests/${cardUid}/deny`, 'POST');
        document.getElementById(`creq-${cardUid}`)?.remove();
        showToast('Credit request denied.');
        refreshBadge();
        loadResolvedCredits();
      } catch (err) { showToast(err.message, 'error'); }
    }

    // ════════════════════════════════════
    // NEWS TAB
    // ════════════════════════════════════

    async function loadNews() {
      const el = document.getElementById('newsListBody');
      el.innerHTML = `<div class="loading-state"><span class="spinner"></span> Loading…</div>`;
      try {
        const posts = await apiCall('/news');

        if (!posts.length) {
          el.innerHTML = emptyState('No posts yet. Publish one above!');
          return;
        }

        el.innerHTML = `
          <table class="data-table">
            <thead>
              <tr>
                <th>Posted</th>
                <th>Title</th>
                <th>Body</th>
                <th>Author</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${posts.map(p => `
                <tr id="news-${p.post_id}">
                  <td style="color:var(--text-muted);white-space:nowrap">
                    ${fmtDate(p.posted_at)}
                  </td>
                  <td><strong>${escapeHtml(p.title)}</strong></td>
                  <td style="color:var(--text-muted);font-size:0.82rem;max-width:300px;">
                    ${escapeHtml(p.body).substring(0, 120)}${p.body.length > 120 ? '…' : ''}
                  </td>
                  <td style="color:var(--text-muted)">${p.author || '—'}</td>
                  <td>
                    <button class="btn btn-remove"
                      onclick="deleteNewsPost('${p.post_id}')">🗑 Delete</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>`;
      } catch (err) {
        el.innerHTML = emptyState(`Error: ${err.message}`);
      }
    }

    async function submitNewsPost() {
      const title = document.getElementById('newsTitle').value.trim();
      const body  = document.getElementById('newsBody').value.trim();

      if (!title) { showToast('Please enter a title.', 'error'); return; }
      if (!body)  { showToast('Please enter a body.',  'error'); return; }

      try {
        await apiCall('/admin/news', 'POST', { title, body });
        document.getElementById('newsTitle').value = '';
        document.getElementById('newsBody').value  = '';
        showToast('Post published!');
        // Reload the list so the new post appears immediately
        loaded.delete('news');
        loadNews();
      } catch (err) { showToast(err.message, 'error'); }
    }

    async function deleteNewsPost(postId) {
      if (!confirm('Delete this post? This cannot be undone.')) return;
      try {
        await apiCall(`/admin/news/${postId}`, 'DELETE');
        document.getElementById(`news-${postId}`)?.remove();
        showToast('Post deleted.');
      } catch (err) { showToast(err.message, 'error'); }
    }

    // Escape HTML to prevent XSS in admin-entered content
    function escapeHtml(str) {
      if (!str) return '';
      return str
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // ════════════════════════════════════
    // USERS TAB
    // ════════════════════════════════════

    async function loadUsers() {
      try {
        const users = await apiCall('/admin/users');
        const el    = document.getElementById('allUsersBody');

        if (!users.length) { el.innerHTML = emptyState('No guest accounts yet.'); return; }

        el.innerHTML = `
          <table class="data-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Display Name</th>
                <th>Email</th>
                <th>Status</th>
                <th>Cards</th>
                <th>Registered</th>
              </tr>
            </thead>
            <tbody>
              ${users.map(u => `
                <tr>
                  <td><strong>${u.username}</strong></td>
                  <td>${u.display_name || '—'}</td>
                  <td style="color:var(--text-muted)">${u.email}</td>
                  <td>${statusBadge(u)}</td>
                  <td style="color:var(--text-muted)">${(u.linked_cards || []).length}</td>
                  <td style="color:var(--text-muted)">${fmtDate(u.created_at)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>`;
      } catch (err) {
        showToast(err.message, 'error');
      }
    }

    // ════════════════════════════════════
    // CARDS TAB
    // ════════════════════════════════════

    async function loadCards() {
      try {
        const cards = await apiCall('/admin/cards');
        const el    = document.getElementById('allCardsBody');

        if (!cards.length) { el.innerHTML = emptyState('No cards registered yet.'); return; }

        el.innerHTML = `
          <table class="data-table">
            <thead>
              <tr>
                <th>UID</th>
                <th>Nickname</th>
                <th>Design</th>
                <th>Owner</th>
                <th>Balance</th>
                <th>Status</th>
                <th>Last Used</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${cards.map(c => `
                <tr id="card-${c.uid}" ${c.is_service ? 'style="background:rgba(251,191,36,0.04);"' : ''}>
                  <td class="uid">${c.uid}</td>
                  <td>
                    <strong>${c.nickname}</strong>
                    ${c.is_service
                      ? ' <span class="badge badge-service">⚙ Service</span>'
                      : ''
                    }
                  </td>
                  <td>
                    ${c.design && c.design !== 'none'
                      ? `<div style="display:flex;align-items:center;gap:0.5rem;">
                          ${designChip(c.design)}
                          <select onchange="assignDesign('${c.uid}', this.value)"
                            style="font-size:0.72rem;padding:0.15rem 0.4rem;
                            background:var(--bg-input);border:1px solid var(--border);
                            border-radius:4px;color:var(--text-muted);cursor:pointer;">
                            <option value="">Change…</option>
                            <option value="purple">Purple</option>
                            <option value="teal">Teal</option>
                          </select>
                        </div>`
                      : `<select onchange="assignDesign('${c.uid}', this.value)"
                          style="padding:0.3rem 0.6rem;
                          background:rgba(245,166,35,0.08);
                          border:1px solid rgba(245,166,35,0.35);
                          border-radius:6px;color:var(--accent);
                          font-size:0.78rem;cursor:pointer;font-weight:600;">
                          <option value="">Assign design…</option>
                          <option value="purple">🟣 Purple</option>
                          <option value="teal">🟦 Teal</option>
                        </select>`
                    }
                  </td>
                  <td>
                    <div class="user-picker" id="picker-${c.uid}">
                      <button type="button" class="user-picker-btn ${c.owner_username ? 'has-value' : ''}"
                        onclick="toggleUserPicker('picker-${c.uid}')">
                        <div class="up-avatar" id="picker-${c.uid}-avatar">—</div>
                        <span id="picker-${c.uid}-label">${c.owner_username || '— Unassigned —'}</span>
                        <span style="margin-left:auto;opacity:0.5;font-size:0.7rem;">▾</span>
                      </button>
                      <div class="user-picker-panel" id="picker-${c.uid}-panel">
                        <input class="user-picker-search" placeholder="Search users…"
                          oninput="filterUserPicker('picker-${c.uid}', this.value)"/>
                        <div id="picker-${c.uid}-options">
                          <div class="user-picker-empty">Loading…</div>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    ${c.is_service
                      ? '<span style="color:var(--text-muted);font-size:0.78rem;">N/A</span>'
                      : `<strong style="color:var(--accent)">${c.balance}</strong>`
                    }
                  </td>
                  <td>${cardStatusBadge(c)}</td>
                  <td style="color:var(--text-muted)">${c.last_used ? fmtDate(c.last_used) : 'Never'}</td>
                  <td>
                    <div class="action-group">
                      ${c.approved && !c.is_service ? `
                        <button class="btn btn-credits"
                          onclick="openCreditsModal('${c.uid}', '${c.nickname}')">+ Credits</button>
                      ` : ''}
                      <button class="btn btn-remove"
                        onclick="removeCard('${c.uid}')">Remove</button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>`;
      } catch (err) {
        showToast(err.message, 'error');
        return;
      }

      // Populate the owner reassignment dropdowns with the user list
      populateOwnerSelects();
    }

    async function assignDesign(uid, design) {
      if (!design) return;
      try {
        await apiCall(`/admin/cards/${uid}/design`, 'PUT', { design });
        showToast(`Design updated to ${design}.`);
        loaded.delete('cards');
        loadCards();
      } catch (err) { showToast(err.message, 'error'); }
    }

    async function assignOwner(uid, value, selectEl) {
      if (!value && value !== null) return;  // blank string = placeholder, skip

      const newOwner = (value === '__unassign__' || value === null) ? null : value;

      try {
        await apiCall(`/admin/cards/${uid}/owner`, 'PUT', { owner_username: newOwner });
        showToast(newOwner
          ? `Card ${uid} assigned to @${newOwner}.`
          : `Card ${uid} owner removed.`
        );
      } catch (err) {
        showToast(err.message, 'error');
      }
    }

    // ════════════════════════════════════
    // USER PICKER
    // A custom dropdown replacing native <select> for owner assignment.
    // Each option shows avatar, display name, and @username.
    // ════════════════════════════════════

    // Close any open picker when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.user-picker')) {
        document.querySelectorAll('.user-picker-panel.open')
          .forEach(p => p.classList.remove('open'));
      }
    });

    function toggleUserPicker(pickerId) {
      const panel = document.getElementById(`${pickerId}-panel`) ||
                    document.getElementById(pickerId)?.querySelector('.user-picker-panel');
      if (!panel) return;
      const wasOpen = panel.classList.contains('open');
      // Close all others first
      document.querySelectorAll('.user-picker-panel.open')
        .forEach(p => p.classList.remove('open'));
      if (!wasOpen) {
        panel.classList.add('open');
        // Always rebuild options when opening — ensures fresh data
        buildPickerOptions(pickerId);
      }
    }

    function filterUserPicker(pickerId, query) {
      const panel = document.getElementById(`${pickerId}-panel`) ||
                    document.getElementById(pickerId)?.querySelector('.user-picker-panel');
      if (!panel) return;
      const q = query.toLowerCase();
      panel.querySelectorAll('.user-picker-option').forEach(opt => {
        const text = opt.dataset.search || '';
        opt.style.display = text.includes(q) ? '' : 'none';
      });
    }

    async function buildPickerOptions(pickerId) {
      const isModal   = pickerId === 'modalUserPicker';
      const container = isModal
        ? document.getElementById('modalUserPickerOptions')
        : document.getElementById(`${pickerId}-options`);
      if (!container) return;

      // Show loading state while fetching
      container.innerHTML = '<div class="user-picker-empty">Loading…</div>';

      // Fetch users if not cached — this is the key fix
      try {
        if (!_cachedUsers) {
          _cachedUsers = await apiCall('/admin/users');
        }
      } catch (err) {
        container.innerHTML = '<div class="user-picker-empty">Failed to load users.</div>';
        return;
      }

      const approvedUsers = _cachedUsers.filter(u => u.approved && !u.denied);

      // Get the currently selected owner so we can skip them in the list
      const btn          = isModal
        ? document.querySelector('#modalUserPicker .user-picker-btn')
        : document.querySelector(`#${CSS.escape(pickerId)} .user-picker-btn`);
      const currentOwner = isModal
        ? (document.getElementById('newCardOwner').value || '')
        : (btn?.dataset.current || '');

      container.innerHTML = '';

      // "Remove / unassign" row — always present
      const removeRow = document.createElement('div');
      removeRow.className      = 'user-picker-option remove-opt';
      removeRow.dataset.search = 'remove unassign clear';
      removeRow.innerHTML = `
        <div class="up-opt-avatar" style="border-color:rgba(224,82,82,0.3);">✕</div>
        <div class="up-opt-info">
          <div class="up-opt-name">Remove owner</div>
          <div class="up-opt-username">Leave unassigned</div>
        </div>`;
      removeRow.addEventListener('click', () => selectUser(pickerId, null, null, null));
      container.appendChild(removeRow);

      if (!approvedUsers.length) {
        const empty = document.createElement('div');
        empty.className   = 'user-picker-empty';
        empty.textContent = 'No approved users found.';
        container.appendChild(empty);
        return;
      }

      approvedUsers.forEach(u => {
        // Still show current owner in list so admin can "re-confirm" if needed
        const row = document.createElement('div');
        row.className      = 'user-picker-option';
        row.dataset.search = `${(u.display_name || '').toLowerCase()} ${u.username.toLowerCase()}`;

        const avatarHtml = u.avatar
          ? `<img src="${u.avatar}" alt="${u.username}"/>`
          : (u.display_name || u.username)[0].toUpperCase();

        // Highlight already-selected owner
        const isSelected = u.username === currentOwner;
        row.innerHTML = `
          <div class="up-opt-avatar">${avatarHtml}</div>
          <div class="up-opt-info">
            <div class="up-opt-name">${u.display_name || u.username}${isSelected ? ' ✓' : ''}</div>
            <div class="up-opt-username">@${u.username}</div>
          </div>`;
        row.addEventListener('click', () =>
          selectUser(pickerId, u.username, u.display_name || u.username, u.avatar || null)
        );
        container.appendChild(row);
      });
    }

    function selectUser(pickerId, username, displayName, avatar) {
      const isModal = pickerId === 'modalUserPicker';

      // Close the panel
      const panel = isModal
        ? document.getElementById('modalUserPickerPanel')
        : document.getElementById(`${pickerId}-panel`);
      panel?.classList.remove('open');

      if (isModal) {
        // Update the hidden input + button display
        document.getElementById('newCardOwner').value = username || '';
        const btn    = document.querySelector('#modalUserPicker .user-picker-btn');
        const avEl   = document.getElementById('modalPickerAvatar');
        const lblEl  = document.getElementById('modalPickerLabel');
        if (username) {
          btn.classList.add('has-value');
          avEl.innerHTML = avatar ? `<img src="${avatar}" alt="${username}"/>` : displayName[0].toUpperCase();
          lblEl.textContent = `${displayName} (@${username})`;
        } else {
          btn.classList.remove('has-value');
          avEl.innerHTML    = '—';
          lblEl.textContent = '— Leave unassigned —';
        }
      } else {
        // Inline table picker — call assignOwner directly
        const uid = pickerId.replace('picker-', '');
        const btn = document.querySelector(`#${CSS.escape(pickerId)} .user-picker-btn`);
        const avEl  = document.getElementById(`${pickerId}-avatar`);
        const lblEl = document.getElementById(`${pickerId}-label`);
        if (username) {
          btn.classList.add('has-value');
          avEl.innerHTML    = avatar ? `<img src="${avatar}" alt="${username}"/>` : displayName[0].toUpperCase();
          lblEl.textContent = `${displayName} (@${username})`;
          btn.dataset.current = username;
        } else {
          btn.classList.remove('has-value');
          avEl.innerHTML    = '—';
          lblEl.textContent = '— Unassigned —';
          btn.dataset.current = '';
        }
        // Persist to backend
        assignOwner(uid, username || '__unassign__', null);
      }
    }

    // After loadCards renders the table, update each picker button
    // to show the current owner's avatar and display name instead of
    // just their raw username string.
    async function populateOwnerSelects() {
      try {
        if (!_cachedUsers) {
          _cachedUsers = await apiCall('/admin/users');
        }
        const approvedUsers = _cachedUsers.filter(u => u.approved && !u.denied);

        // For each card row, find the picker and check if the label is a
        // plain username — if so, replace it with display name + avatar
        document.querySelectorAll('[id^="picker-"][id$="-label"]').forEach(lblEl => {
          const pickerId = lblEl.id.replace('-label', '');
          const rawLabel = lblEl.textContent.trim();
          // Skip if already formatted or unassigned
          if (!rawLabel || rawLabel.startsWith('—') || rawLabel.includes('(@')) return;
          // rawLabel is the username at this point
          const u = approvedUsers.find(u => u.username === rawLabel);
          if (!u) return;
          lblEl.textContent = `${u.display_name || u.username} (@${u.username})`;
          const avEl = document.getElementById(`${pickerId}-avatar`);
          if (avEl) {
            avEl.innerHTML = u.avatar
              ? `<img src="${u.avatar}" alt="${u.username}"/>`
              : (u.display_name || u.username)[0].toUpperCase();
          }
          const btn = document.querySelector(`#${CSS.escape(pickerId)} .user-picker-btn`);
          if (btn) {
            btn.classList.add('has-value');
            btn.dataset.current = u.username;
          }
        });
      } catch (_) {}
    }

    async function removeCard(uid) {
      if (!confirm(`Remove card ${uid}? This cannot be undone.`)) return;
      try {
        await apiCall(`/admin/remove-card/${uid}`, 'DELETE');
        document.getElementById(`card-${uid}`)?.remove();
        showToast(`Card ${uid} removed.`);
      } catch (err) { showToast(err.message, 'error'); }
    }

    // ════════════════════════════════════
    // ADD CREDITS MODAL
    // ════════════════════════════════════

    function openCreditsModal(uid, nickname) {
      document.getElementById('creditsCardUid').value      = uid;
      document.getElementById('creditsCardDisplay').value  = `${nickname} (${uid})`;
      document.getElementById('creditsAmount').value       = '';
      document.getElementById('creditsNote').value         = '';
      document.getElementById('creditsModal').classList.add('open');
    }

    function closeCreditsModal() {
      document.getElementById('creditsModal').classList.remove('open');
    }

    // Close modal when clicking the dark overlay background
    document.getElementById('creditsModal').addEventListener('click', function(e) {
      if (e.target === this) closeCreditsModal();
    });

    async function submitCredits() {
      const uid    = document.getElementById('creditsCardUid').value;
      const amount = parseFloat(document.getElementById('creditsAmount').value);
      const note   = document.getElementById('creditsNote').value.trim();

      if (!amount || amount <= 0) {
        showToast('Please enter a valid amount.', 'error');
        return;
      }

      try {
        const res = await apiCall('/admin/add-credits', 'POST', { uid, amount, note: note || null });
        closeCreditsModal();
        showToast(`${amount} credits added. New balance: ${res.balance_after}`);
        // Refresh the cards tab so the updated balance shows immediately
        loaded.delete('cards');
        if (document.getElementById('panel-cards').classList.contains('active')) {
          loadCards();
        }
      } catch (err) { showToast(err.message, 'error'); }
    }

    // ════════════════════════════════════
    // TRANSACTIONS TAB
    // ════════════════════════════════════

    let allTxns = []; // Client-side cache for filtering

    async function loadTransactions() {
      try {
        allTxns = await apiCall('/admin/transactions?limit=200');
        applyFilters();
      } catch (err) {
        showToast(err.message, 'error');
      }
    }

    function applyFilters() {
      const cardUid  = document.getElementById('fCardUid').value.trim().toUpperCase();
      const username = document.getElementById('fUsername').value.trim().toLowerCase();
      const machine  = document.getElementById('fMachine').value.trim().toLowerCase();
      const type     = document.getElementById('fType').value;
      const dateFrom = document.getElementById('fDateFrom').value;
      const dateTo   = document.getElementById('fDateTo').value;

      /*
       * WHY filter client-side?
       * We fetch up to 200 recent transactions once, then filter
       * in JS instantly. For a home arcade this is more than enough.
       * If you later have thousands of transactions, you'd move the
       * filtering to the backend using query params instead.
       */
      let filtered = allTxns.filter(t => {
        if (cardUid  && !t.card_uid.includes(cardUid))                         return false;
        if (username && !t.owner_username.toLowerCase().includes(username))    return false;
        if (machine  && !(t.note || '').toLowerCase().includes(machine))       return false;
        if (type     && t.type !== type)                                       return false;
        if (dateFrom && new Date(t.timestamp) < new Date(dateFrom))            return false;
        if (dateTo   && new Date(t.timestamp) > new Date(dateTo + 'T23:59:59')) return false;
        return true;
      });

      document.getElementById('txnsBody').innerHTML =
        filtered.length === 0
          ? emptyState('No transactions match the current filters.')
          : buildTxnTable(filtered);
    }

    function clearFilters() {
      ['fCardUid','fUsername','fMachine','fDateFrom','fDateTo'].forEach(id => {
        document.getElementById(id).value = '';
      });
      document.getElementById('fType').value = '';
      applyFilters();
    }

    // ════════════════════════════════════
    // SHARED RENDER HELPERS
    // ════════════════════════════════════

    function buildTxnTable(txns) {
      return `
        <table class="data-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Card UID</th>
              <th>Owner</th>
              <th>Type</th>
              <th>Amount</th>
              <th>Balance After</th>
              <th>Source</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            ${txns.map(t => `
              <tr>
                <td style="color:var(--text-muted);white-space:nowrap">${fmtDate(t.timestamp)}</td>
                <td class="uid">${t.card_uid}</td>
                <td style="color:var(--text-muted)">${t.owner_username}</td>
                <td>${typeBadge(t.type)}</td>
                <td style="font-weight:600;color:${t.type==='credit'?'var(--success)':'var(--error)'}">${t.type==='credit'?'+':'−'}${t.amount}</td>
                <td style="color:var(--text-muted)">${t.balance_after}</td>
                <td>${sourceBadge(t.source)}</td>
                <td style="color:var(--text-muted);font-size:0.8rem">${t.note || '—'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>`;
    }

    // Badge helpers — convert data values into styled HTML chips
    function typeBadge(type) {
      return type === 'credit'
        ? '<span class="badge badge-credit">Credit</span>'
        : '<span class="badge badge-debit">Debit</span>';
    }

    function sourceBadge(source) {
      const map = {
        admin:         '<span class="badge badge-admin">Admin</span>',
        scanner:       '<span class="badge badge-scanner">Scanner</span>',
        service:       '<span class="badge badge-service">⚙ Service</span>',
        guest_request: '<span class="badge badge-pending">Guest</span>',
      };
      return map[source] || `<span class="badge">${source}</span>`;
    }

    function designChip(design) {
      if (!design || design === 'none') {
        return '<span style="color:var(--text-muted);font-size:0.78rem;">Unassigned</span>';
      }
      return design === 'purple'
        ? '<span class="card-chip card-chip-purple"><span class="card-chip-dot"></span>Purple</span>'
        : '<span class="card-chip card-chip-teal"><span class="card-chip-dot"></span>Teal</span>';
    }

    function statusBadge(user) {
      if (user.denied)   return '<span class="badge badge-denied">Denied</span>';
      if (user.approved) return '<span class="badge badge-approved">Approved</span>';
      return '<span class="badge badge-pending">Pending</span>';
    }

    function cardStatusBadge(card) {
      if (card.denied)   return '<span class="badge badge-denied">Denied</span>';
      if (card.approved) return '<span class="badge badge-approved">Active</span>';
      return '<span class="badge badge-pending">Pending</span>';
    }

    function emptyState(msg) {
      return `<div class="empty-state"><div class="empty-icon">🗂️</div>${msg}</div>`;
    }

    // Format ISO timestamp to a readable local string
    function fmtDate(iso) {
      if (!iso) return '—';
      return new Date(iso).toLocaleString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    }

    // ════════════════════════════════════
    // INITIAL LOAD
    // ════════════════════════════════════

    // Load avatar from stored profile data
    // WHY check sessionStorage first? Avoids an extra API call on every
    // page load — the account page saves the avatar there after upload.
    async function loadAvatar() {
      const stored = sessionStorage.getItem('avatar');
      const initial = (username || '?')[0].toUpperCase();
      document.getElementById('avatarInitial').textContent = initial;
      document.getElementById('adminName').textContent = username || '—';

      if (stored) {
        setAvatarImage(stored);
        return;
      }
      // Otherwise fetch from the backend
      try {
        const me = await apiCall('/auth/me/full');
        if (me.avatar) {
          sessionStorage.setItem('avatar', me.avatar);
          setAvatarImage(me.avatar);
        }
        if (me.display_name) {
          document.getElementById('adminName').textContent = me.display_name;
        }
      } catch (_) {} // Silently fail — avatar is cosmetic
    }

    function setAvatarImage(src) {
      const container = document.getElementById('headerAvatar');
      container.innerHTML = `<img src="${src}" alt="avatar"/>`;
    }

    // ════════════════════════════════════
    // ADD CARD MODAL
    // ════════════════════════════════════

    // Cache the user list so we don't re-fetch on every modal open.
    // Cleared when a user is approved/denied so it stays fresh.
    let _cachedUsers = null;

    async function openAddCardModal() {
      document.getElementById('newCardUid').value        = '';
      document.getElementById('newCardNickname').value   = '';
      document.getElementById('newCardBalance').value    = '0';
      document.getElementById('newCardDesign').value     = 'purple';
      document.getElementById('newCardOwner').value      = '';
      document.getElementById('newCardIsService').checked = false;
      document.getElementById('newCardGuestFields').style.display = '';

      // Reset the user picker button to unassigned state
      const btn   = document.querySelector('#modalUserPicker .user-picker-btn');
      const avEl  = document.getElementById('modalPickerAvatar');
      const lblEl = document.getElementById('modalPickerLabel');
      btn.classList.remove('has-value');
      avEl.innerHTML    = '—';
      lblEl.textContent = '— Leave unassigned —';

      // Pre-load user cache so picker opens instantly
      try {
        if (!_cachedUsers) {
          _cachedUsers = await apiCall('/admin/users');
        }
        // Build picker options now so they're ready
        buildPickerOptions('modalUserPicker');
      } catch (_) {}

      document.getElementById('addCardModal').classList.add('open');
    }

    function closeAddCardModal() {
      document.getElementById('addCardModal').classList.remove('open');
    }

    function toggleServiceCard() {
      const isService = document.getElementById('newCardIsService').checked;
      document.getElementById('newCardGuestFields').style.display =
        isService ? 'none' : '';
    }

    document.getElementById('addCardModal').addEventListener('click', function(e) {
      if (e.target === this) closeAddCardModal();
    });

    // Normalise UID to uppercase as the user types
    document.getElementById('newCardUid').addEventListener('input', function() {
      const pos = this.selectionStart;
      this.value = this.value.toUpperCase();
      this.setSelectionRange(pos, pos);
    });

    async function submitAddCard() {
      const uid       = document.getElementById('newCardUid').value.trim().toUpperCase();
      const nickname  = document.getElementById('newCardNickname').value.trim()
                        || 'Delt-Arcade Game Card';
      const isService = document.getElementById('newCardIsService').checked;
      const design    = document.getElementById('newCardDesign').value;  // always read
      const owner     = isService ? null : (document.getElementById('newCardOwner').value || null);
      const balance   = isService ? 0 : (parseFloat(document.getElementById('newCardBalance').value) || 0);

      if (!uid) { showToast('Please enter a card UID.', 'error'); return; }

      try {
        await apiCall('/admin/add-card', 'POST', {
          uid,
          nickname,
          design,
          owner_username:   owner,
          starting_balance: balance,
          is_service:       isService,
        });
        closeAddCardModal();
        showToast(isService
          ? `Service card ${uid} created.`
          : `Card ${uid} created successfully.`
        );
        loaded.delete('cards');
        if (document.getElementById('panel-cards').classList.contains('active')) {
          loadCards();
        }
      } catch (err) { showToast(err.message, 'error'); }
    }

    // Load the Overview tab on page open
    loaded.add('overview');
    loadOverview();
    loadAvatar();
    // Prime the credit requests badge independently of the tab
    apiCall('/admin/credit-requests?status=pending').then(reqs => {
      const badge = document.getElementById('creditBadge');
      badge.textContent = reqs.length;
      reqs.length > 0
        ? badge.classList.remove('hidden')
        : badge.classList.add('hidden');
    }).catch(() => {});

    // ════════════════════════════════════
    // BACKGROUND POLLING
    //
    // Every 30 seconds we silently fetch the latest counts.
    // If anything changed since the last check, we:
    //   1. Update the nav badge numbers
    //   2. Show a toast so the admin knows something arrived
    //   3. Auto-refresh the active tab if it's directly affected
    //      (e.g. the Approvals tab refreshes if a new user registered)
    //
    // WHY 30 seconds? It's a reasonable balance — responsive enough
    // that an admin won't miss a request for long, but not so aggressive
    // that it hammers the server. You can lower it if you want faster
    // updates (e.g. 10000 for 10s) or raise it for less traffic.
    // ════════════════════════════════════

    // Track last-known counts so we can detect changes
    let _lastPendingUsers  = 0;
    let _lastPendingCards  = 0;
    let _lastCreditReqs    = 0;

    async function pollForUpdates() {
      try {
        const [stats, creditReqs] = await Promise.all([
          apiCall('/admin/stats'),
          apiCall('/admin/credit-requests?status=pending'),
        ]);

        const newPendingUsers = stats.users.pending;
        const newPendingCards = stats.cards.pending;
        const newCreditReqs   = creditReqs.length;

        // ── Update approval badge ──
        const approvalTotal = newPendingUsers + newPendingCards;
        const approvalBadge = document.getElementById('pendingBadge');
        approvalBadge.textContent = approvalTotal;
        approvalTotal > 0
          ? approvalBadge.classList.remove('hidden')
          : approvalBadge.classList.add('hidden');

        // ── Update credit badge ──
        const creditBadge = document.getElementById('creditBadge');
        creditBadge.textContent = newCreditReqs;
        newCreditReqs > 0
          ? creditBadge.classList.remove('hidden')
          : creditBadge.classList.add('hidden');

        // ── Detect new arrivals and notify ──
        const activeTab = document.querySelector('.tab-btn.active')?.dataset.tab;

        if (newPendingUsers > _lastPendingUsers) {
          const diff = newPendingUsers - _lastPendingUsers;
          showToast(
            `${diff} new account registration${diff > 1 ? 's' : ''} awaiting approval.`,
            'info'
          );
          // Auto-refresh approvals tab if it's open
          if (activeTab === 'approvals') loadApprovals();
        }

        if (newPendingCards > _lastPendingCards) {
          const diff = newPendingCards - _lastPendingCards;
          showToast(
            `${diff} new card request${diff > 1 ? 's' : ''} awaiting approval.`,
            'info'
          );
          if (activeTab === 'approvals') loadApprovals();
        }

        if (newCreditReqs > _lastCreditReqs) {
          const diff = newCreditReqs - _lastCreditReqs;
          showToast(
            `${diff} new credit request${diff > 1 ? 's' : ''} submitted.`,
            'info'
          );
          if (activeTab === 'credits') loadCreditRequests();
        }

        // Also silently refresh the overview stats if it's the active tab
        if (activeTab === 'overview') {
          // Only update the stat numbers, don't flash a toast for this
          document.getElementById('stat-totalUsers').textContent    = stats.users.total;
          document.getElementById('stat-pendingUsers').textContent  = stats.users.pending;
          document.getElementById('stat-activeCards').textContent   = stats.cards.approved;
          document.getElementById('stat-pendingCards').textContent  = stats.cards.pending;
          document.getElementById('stat-creditsAdded').textContent  = stats.transactions.credits_added;
          document.getElementById('stat-creditsSpent').textContent  = stats.transactions.credits_spent;
          document.getElementById('stat-totalTxns').textContent     = stats.transactions.total;
        }

        // Store new counts for next comparison
        _lastPendingUsers = newPendingUsers;
        _lastPendingCards = newPendingCards;
        _lastCreditReqs   = newCreditReqs;

      } catch (_) {
        // Silently ignore poll failures — the admin is still logged in,
        // the server might just have had a brief hiccup. We don't want
        // to flash an error toast every 30 seconds if the backend restarts.
      }
    }

    // Seed the initial counts from the first load so we don't
    // false-positive on existing pending items at startup
    apiCall('/admin/stats').then(stats => {
      _lastPendingUsers = stats.users.pending;
      _lastPendingCards = stats.cards.pending;
    }).catch(() => {});
    apiCall('/admin/credit-requests?status=pending').then(reqs => {
      _lastCreditReqs = reqs.length;
    }).catch(() => {});

    // Start the poll — runs every 30 seconds
    const POLL_INTERVAL_MS = 30_000;
    setInterval(pollForUpdates, POLL_INTERVAL_MS);

    // Also poll immediately after the page has been hidden and then
    // brought back into focus — covers the case where the admin
    // switches tabs for a while and comes back
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') pollForUpdates();
    });
