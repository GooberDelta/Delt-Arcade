/*
     * ════════════════════════════════════════════════════════
     * GUEST DASHBOARD JAVASCRIPT
     *
     * On load:
     *   1. Auth guard — redirect to login if no token
     *   2. Load avatar from sessionStorage or API
     *   3. Load cards → compute total balance → render grid
     *   4. Load news feed
     *
     * Card interactions:
     *   - Click "History" button → open transaction drawer below grid
     *   - Click "Credits" button → open credit request modal
     *   - Click "Add Card" tile  → open add card modal
     *
     * UID duplicate check: debounced input handler calls
     *   GET /cards/check-uid/{uid} — returns {available: bool}
     * ════════════════════════════════════════════════════════
     */

    const API      = '';
    const token    = sessionStorage.getItem('auth_token');
    const userRole = sessionStorage.getItem('user_role');
    const username = sessionStorage.getItem('username');

    // Auth guard
    if (!token) { window.location.href = '/login'; }

    // Show the Admin Panel button if the logged-in user is an admin
    if (userRole === 'admin') {
      document.getElementById('switchToAdmin').style.display = '';
    }

    document.getElementById('logoutBtn').addEventListener('click', () => {
      sessionStorage.clear();
      window.location.href = '/login';
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

    // ── Toast ──
    let toastTimer = null;
    function showToast(msg, type = 'success') {
      const existing = document.querySelector('.toast');
      if (existing) existing.remove();
      clearTimeout(toastTimer);
      const el = document.createElement('div');
      el.className = `toast ${type}`;
      el.textContent = msg;
      document.body.appendChild(el);
      toastTimer = setTimeout(() => el.remove(), 3500);
    }

    // ── Format helpers ──
    function fmtDate(iso) {
      if (!iso) return '—';
      return new Date(iso).toLocaleString(undefined, {
        month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    }

    function typeBadge(type) {
      return type === 'credit'
        ? '<span class="badge badge-credit">+ Credit</span>'
        : '<span class="badge badge-debit">− Debit</span>';
    }

    function sourceBadge(src) {
      const map = {
        admin:   '<span class="badge badge-admin">Admin</span>',
        scanner: '<span class="badge badge-scanner">Scanner</span>',
        service: '<span class="badge" style="background:rgba(251,191,36,0.12);color:#fbbf24;">⚙ Service</span>',
      };
      return map[src] || `<span class="badge">${src}</span>`;
    }

    // ════════════════════════════════════
    // AVATAR LOAD
    // ════════════════════════════════════

    async function loadAvatar() {
      const stored  = sessionStorage.getItem('avatar');
      const initial = (username || '?')[0].toUpperCase();

      document.getElementById('avatarInitial').textContent = initial;
      document.getElementById('guestName').textContent     = username || '—';
      document.getElementById('welcomeName').textContent   = username || '—';

      if (stored) { setAvatarImg(stored); return; }

      try {
        const me = await apiCall('/auth/me/full');
        if (me.avatar) {
          sessionStorage.setItem('avatar', me.avatar);
          setAvatarImg(me.avatar);
        }
        if (me.display_name) {
          document.getElementById('guestName').textContent   = me.display_name;
          document.getElementById('welcomeName').textContent = me.display_name;
        }
      } catch (_) {}
    }

    function setAvatarImg(src) {
      document.getElementById('headerAvatar').innerHTML =
        `<img src="${src}" alt="avatar"/>`;
    }

    // ════════════════════════════════════
    // LOAD CARDS
    // ════════════════════════════════════

    let myCards = [];

    async function loadCards() {
      try {
        myCards = await apiCall('/cards/my-cards');
        renderCards();
        updateTotalBalance();
        updateWelcomeStatus();
      } catch (err) {
        document.getElementById('cardsGrid').innerHTML =
          `<div class="empty-state"><div class="empty-icon">⚠️</div>${err.message}</div>`;
      }
    }

    function updateTotalBalance() {
      // Sum only approved (active) cards
      const total = myCards
        .filter(c => c.approved && !c.denied)
        .reduce((sum, c) => sum + (c.balance || 0), 0);
      document.getElementById('totalBalance').textContent = total.toFixed(2);
    }

    function updateWelcomeStatus() {
      const active  = myCards.filter(c => c.approved && !c.denied).length;
      const pending = myCards.filter(c => !c.approved && !c.denied).length;
      let msg = '';
      if (!myCards.length)  msg = 'No cards yet — register one below!';
      else if (active === 1) msg = `You have 1 active card.`;
      else if (active > 1)   msg = `You have ${active} active cards.`;
      if (pending)           msg += ` ${pending} card${pending>1?'s':''} pending approval.`;
      document.getElementById('welcomeStatus').textContent = msg;
    }

    function cardImageSrc(design) {
      /*
       * WHY check for null/undefined explicitly?
       * Cards added by guests have no design yet (admin assigns it later).
       * We show a placeholder tile rather than a broken image in that case.
       */
      if (!design) return null;
      return design === 'purple'
        ? 'assets/card_purple.png'
        : 'assets/card_teal.png';
    }

    function cardStatusInfo(card) {
      if (card.denied)   return { label: 'Denied',  cls: 'denied'  };
      if (card.approved) return { label: 'Active',  cls: 'active'  };
      return              { label: 'Pending', cls: 'pending' };
    }

    function renderCards() {
      const grid = document.getElementById('cardsGrid');

      /*
       * WHY check owner_username for null instead of the UID?
       * A card with no owner means it was admin-created but not yet
       * assigned. We detect that with a null/falsy owner_username
       * check rather than anything UID-related.
       *
       * Staggered animation: animation-delay increases by 60ms per card.
       */
      const cardHTML = myCards.map((card, i) => {
        const status = cardStatusInfo(card);
        const imgSrc = cardImageSrc(card.design);

        return `
          <div class="card-item" data-uid="${card.uid}"
            style="animation-delay:${i * 60}ms">
            <div class="card-visual">
              ${imgSrc
                ? `<img src="${imgSrc}" alt="${card.design} card"/>`
                : `<div class="card-unassigned">
                     <div class="card-unassigned-icon">🃏</div>
                   </div>`
              }
              <div class="card-info">
                <div class="card-info-top">
                  <div class="card-nickname">${card.nickname}</div>
                  <span class="card-status-badge ${status.cls}">${status.label}</span>
                </div>
                <div class="card-info-bottom">
                  <div class="card-balance-label">Balance</div>
                  <div class="card-balance">${(card.balance || 0).toFixed(2)}</div>
                  <div class="card-uid-display">${card.uid}</div>
                </div>
              </div>
            </div>

            ${card.approved && !card.denied ? `
              <div class="card-action-row">
                <button class="btn-card-action btn-card-credits"
                  data-action="credits"
                  data-uid="${card.uid}"
                  data-nickname="${card.nickname.replace(/"/g, '&quot;')}">
                  + Credits
                </button>
                <button class="btn-card-action btn-card-history"
                  data-action="history"
                  data-uid="${card.uid}"
                  data-nickname="${card.nickname.replace(/"/g, '&quot;')}">
                  History
                </button>
                <button class="btn-card-action btn-card-remove"
                  data-action="remove"
                  data-uid="${card.uid}"
                  data-nickname="${card.nickname.replace(/"/g, '&quot;')}">
                  Remove
                </button>
              </div>
            ` : `
              <div class="card-action-row">
                <button class="btn-card-action btn-card-remove"
                  data-action="remove"
                  data-uid="${card.uid}"
                  data-nickname="${card.nickname.replace(/"/g, '&quot;')}"
                  style="flex:1">
                  Remove Card
                </button>
              </div>
            `}
          </div>`;
      }).join('');

      // "Add Card" tile always appears at the end of the grid
      const addTile = `
        <div class="add-card-tile" data-action="add-card">
          <div class="add-card-tile-inner">
            <div class="add-card-tile-icon">＋</div>
            <div class="add-card-tile-label">Register a Card</div>
          </div>
        </div>`;

      grid.innerHTML = cardHTML + addTile;

      /*
       * WHY a delegated listener instead of inline onclick?
       * Inline onclick attributes use string interpolation — if a card
       * nickname contains a single quote (e.g. "John's Card"), it breaks
       * the JS syntax inside the attribute and silently does nothing.
       *
       * A delegated listener on the parent grid reads data-* attributes
       * instead, which are always safe regardless of the value's content.
       */
      grid.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        const action   = btn.dataset.action;
        const uid      = btn.dataset.uid;
        const nickname = btn.dataset.nickname;
        if (action === 'credits')  openCreditsModal(uid, nickname);
        if (action === 'history')  toggleDrawer(uid, nickname);
        if (action === 'add-card') openAddCardModal();
        if (action === 'remove')   removeCard(uid, nickname);
      });
    }

    // ════════════════════════════════════
    // TRANSACTION DRAWER
    // ════════════════════════════════════

    let openDrawerUid = null;

    async function toggleDrawer(uid, nickname) {
      const drawer = document.getElementById('txnDrawer');

      // If the same card is clicked again, close the drawer
      if (openDrawerUid === uid && drawer.classList.contains('open')) {
        closeDrawer();
        return;
      }

      openDrawerUid = uid;
      drawer.classList.add('open');
      document.getElementById('txnDrawerTitle').textContent =
        `Transaction History — ${nickname}`;
      document.getElementById('txnDrawerBody').innerHTML =
        `<div class="loading-state"><span class="spinner"></span> Loading…</div>`;

      try {
        const txns = await apiCall(`/cards/${uid}/transactions?limit=30`);

        if (!txns.length) {
          document.getElementById('txnDrawerBody').innerHTML =
            `<div class="empty-state"><div class="empty-icon">📭</div>No transactions yet.</div>`;
          return;
        }

        document.getElementById('txnDrawerBody').innerHTML = `
          <table class="data-table">
            <thead>
              <tr>
                <th>Date</th>
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
                  <td>${typeBadge(t.type)}</td>
                  <td style="font-weight:600;color:${t.type==='credit'?'var(--success)':'var(--error)'}">
                    ${t.type === 'credit' ? '+' : '−'}${t.amount}
                  </td>
                  <td style="color:var(--text-muted)">${t.balance_after}</td>
                  <td>${sourceBadge(t.source)}</td>
                  <td style="color:var(--text-muted);font-size:0.8rem">${t.note || '—'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>`;
      } catch (err) {
        document.getElementById('txnDrawerBody').innerHTML =
          `<div class="empty-state">⚠️ ${err.message}</div>`;
      }
    }

    function closeDrawer() {
      openDrawerUid = null;
      document.getElementById('txnDrawer').classList.remove('open');
    }

    // ════════════════════════════════════
    // REMOVE CARD
    // ════════════════════════════════════

    /*
     * WHY a two-step confirmation toast instead of window.confirm()?
     * window.confirm() blocks the browser thread and looks dated.
     * Instead we show a warning toast with a short countdown. If the
     * user doesn't cancel within 5 seconds, the removal proceeds.
     * This is the same pattern used by Gmail's "undo send".
     */
    let removeTimer   = null;
    let removePending = null;

    function removeCard(uid, nickname) {
      // If another remove is already pending, cancel it first
      if (removeTimer) {
        clearTimeout(removeTimer);
        const old = document.querySelector('.toast-remove');
        if (old) old.remove();
      }

      removePending = uid;

      // Show a warning toast with an Undo button
      const toast = document.createElement('div');
      toast.className = 'toast error toast-remove';
      toast.style.cssText = 'pointer-events:auto; display:flex; align-items:center; gap:0.75rem; max-width:340px;';
      toast.innerHTML = `
        <span style="flex:1">Removing "${nickname}"…</span>
        <button onclick="cancelRemove()" style="
          background:transparent; border:1px solid rgba(224,82,82,0.5);
          color:var(--error); border-radius:6px; padding:0.25rem 0.6rem;
          cursor:pointer; font-size:0.78rem; font-weight:600;
          font-family:'DM Sans',sans-serif;">
          Undo
        </button>`;
      document.body.appendChild(toast);

      removeTimer = setTimeout(() => {
        toast.remove();
        if (removePending === uid) confirmRemove(uid);
      }, 5000);
    }

    function cancelRemove() {
      clearTimeout(removeTimer);
      removePending = null;
      const toast = document.querySelector('.toast-remove');
      if (toast) toast.remove();
      showToast('Removal cancelled.', 'info');
    }

    async function confirmRemove(uid) {
      removePending = null;
      try {
        await apiCall(`/cards/${uid}/release`, 'POST');
        // Close the transaction drawer if it was open for this card
        if (openDrawerUid === uid) closeDrawer();
        showToast('Card removed from your account.', 'success');
        await loadCards();
      } catch (err) {
        showToast(err.message, 'error');
      }
    }

    // ════════════════════════════════════
    // ADD CARD MODAL
    // ════════════════════════════════════

    function openAddCardModal() {
      document.getElementById('newCardUid').value      = '';
      document.getElementById('newCardNickname').value = '';
      document.getElementById('uidStatus').textContent = '';
      document.getElementById('uidStatus').className   = 'uid-status';
      document.getElementById('addCardSubmitBtn').disabled = false;
      document.getElementById('addCardModal').classList.add('open');
    }

    function closeAddCardModal() {
      document.getElementById('addCardModal').classList.remove('open');
    }
    document.getElementById('addCardModal').addEventListener('click', function(e) {
      if (e.target === this) closeAddCardModal();
    });

    // Normalise UID to uppercase while typing
    document.getElementById('newCardUid').addEventListener('input', function() {
      const pos = this.selectionStart;
      this.value = this.value.toUpperCase().replace(/[^A-F0-9]/g, '');
      this.setSelectionRange(pos, pos);
      debouncedUidCheck(this.value);
    });

    /*
     * DEBOUNCED UID CHECK
     * WHY debounce? We don't want to fire an API call on every single
     * keypress. Waiting 450ms after the user stops typing gives a good
     * balance between responsiveness and not spamming the server.
     */
    let uidCheckTimer = null;
    function debouncedUidCheck(uid) {
      clearTimeout(uidCheckTimer);
      const statusEl = document.getElementById('uidStatus');
      if (uid.length < 4) {
        statusEl.textContent = '';
        statusEl.className = 'uid-status';
        return;
      }
      statusEl.textContent = 'Checking…';
      statusEl.className = 'uid-status checking';
      uidCheckTimer = setTimeout(() => checkUid(uid), 450);
    }

    async function checkUid(uid) {
      const statusEl = document.getElementById('uidStatus');
      try {
        const result = await apiCall(`/cards/check-uid/${uid}`);
        if (result.available) {
          statusEl.textContent = '✓ Card found — ready to claim';
          statusEl.className   = 'uid-status available';
          document.getElementById('addCardSubmitBtn').disabled = false;
        } else if (result.status === 'unknown') {
          statusEl.textContent = '✕ This UID is not in the system — contact an administrator';
          statusEl.className   = 'uid-status taken';
          document.getElementById('addCardSubmitBtn').disabled = true;
        } else if (result.status === 'service') {
          statusEl.textContent = '✕ This is a service card and cannot be registered';
          statusEl.className   = 'uid-status taken';
          document.getElementById('addCardSubmitBtn').disabled = true;
        } else {
          statusEl.textContent = '✕ This card is already registered to someone';
          statusEl.className   = 'uid-status taken';
          document.getElementById('addCardSubmitBtn').disabled = true;
        }
      } catch (_) {
        statusEl.textContent = '';
        statusEl.className = 'uid-status';
      }
    }

    async function submitAddCard() {
      const uid      = document.getElementById('newCardUid').value.trim();
      // Default nickname if left blank
      const nickname = document.getElementById('newCardNickname').value.trim()
                       || 'Delt-Arcade Game Card';
      const statusEl = document.getElementById('uidStatus');

      if (!uid) {
        statusEl.textContent = 'Please enter the card UID.';
        statusEl.className   = 'uid-status taken';
        return;
      }

      // Block submission if UID is known to be taken
      if (statusEl.classList.contains('taken')) {
        showToast('That UID is already registered.', 'error');
        return;
      }

      const btn = document.getElementById('addCardSubmitBtn');
      btn.disabled = true;
      btn.textContent = 'Registering…';

      try {
        /*
         * POST /cards/add — guest registers a card.
         * No design sent — admin will assign that later.
         * Card is created as approved: true per the project decision
         * (only credit requests need admin approval).
         */
        await apiCall('/cards/add', 'POST', { uid, nickname, design: 'none' });
        closeAddCardModal();
        showToast('Card registered! Reloading…', 'success');
        // Reload the cards grid to show the new card
        await loadCards();
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Register Card';
      }
    }

    // ════════════════════════════════════
    // REQUEST CREDITS MODAL
    // ════════════════════════════════════

    let selectedAmount = null;

    function openCreditsModal(uid, nickname) {
      selectedAmount = null;
      document.getElementById('creditsCardUid').value     = uid;
      document.getElementById('creditsCardDisplay').value = `${nickname} (${uid})`;
      // Deselect all presets
      document.querySelectorAll('.preset-chip').forEach(c => c.classList.remove('selected'));
      document.getElementById('creditsModal').classList.add('open');
    }

    function closeCreditsModal() {
      document.getElementById('creditsModal').classList.remove('open');
    }
    document.getElementById('creditsModal').addEventListener('click', function(e) {
      if (e.target === this) closeCreditsModal();
    });

    function selectPreset(el) {
      document.querySelectorAll('.preset-chip').forEach(c => c.classList.remove('selected'));
      el.classList.add('selected');
      selectedAmount = parseInt(el.dataset.amount, 10);
    }

    async function submitCreditRequest() {
      if (!selectedAmount) {
        showToast('Please select a credit amount.', 'error');
        return;
      }

      const uid = document.getElementById('creditsCardUid').value;
      const btn = document.getElementById('creditsSubmitBtn');
      btn.disabled = true;
      btn.textContent = 'Submitting…';

      try {
        await apiCall('/cards/request-credits', 'POST', {
          uid,
          amount: selectedAmount,
        });
        closeCreditsModal();
        showToast(
          `Request for ${selectedAmount} credits submitted! An admin will review it shortly.`,
          'info'
        );
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Submit Request';
      }
    }

    // ════════════════════════════════════
    // NEWS FEED
    // ════════════════════════════════════

    async function loadNews() {
      try {
        /*
         * GET /news — public endpoint, no auth required.
         * Returns posts sorted newest first.
         */
        const posts = await apiCall('/news');
        const feed  = document.getElementById('newsFeed');

        if (!posts.length) {
          feed.innerHTML = `
            <div class="empty-state">
              <div class="empty-icon">📰</div>
              No news yet. Check back soon!
            </div>`;
          return;
        }

        feed.innerHTML = posts.map(p => `
          <div class="news-item">
            <div class="news-item-title">${escapeHtml(p.title)}</div>
            <div class="news-item-body">${escapeHtml(p.body)}</div>
            <div class="news-item-meta">
              ${fmtDate(p.posted_at)}
              ${p.author ? ` · by ${escapeHtml(p.author)}` : ''}
            </div>
          </div>
        `).join('');

      } catch (err) {
        document.getElementById('newsFeed').innerHTML =
          `<div class="empty-state">⚠️ Could not load news.</div>`;
      }
    }

    /*
     * WHY escapeHtml?
     * News content comes from the server. If an admin accidentally
     * types "<script>" in a post body, we don't want it to execute.
     * Escaping converts < > & " to safe HTML entities.
     */
    function escapeHtml(str) {
      if (!str) return '';
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    // ════════════════════════════════════
    // INITIAL LOAD
    // ════════════════════════════════════

    loadAvatar();
    loadCards();
    loadNews();
