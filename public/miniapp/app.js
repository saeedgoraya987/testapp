/* =====================================================
   Open Swap Mini App — app.js
   Handles all state, API calls, and UI updates
   =====================================================
   ⚠️  I18N — DO NOT HARDCODE USER-FACING TEXT IN THIS FILE
   ─────────────────────────────────────────────────────
   All translatable strings are in /miniapp/locales/*.json

   ✅ USE:   t('key_name')  or  t('key_name', { var: value })
   ❌ NEVER: t('English text', 'Spanish text')  ← old pattern, removed
   ❌ NEVER: 'Loading...'  ← hardcoded, use t('loading') instead

   For static HTML, use:  <span data-i18n="key">Fallback</span>

   To add a new string:
     1. Add the key to /miniapp/locales/en.json
     2. Add the key to ALL other locale files (es.json, etc.)
     3. Use t('your_key') in this file

   See I18N.md in the project root for full documentation.
   ===================================================== */

const APP_NAME        = 'Open Swap';
const APP_BOT_USERNAME = 'OpenSwapBot';

const API_BASE = '/miniapp';

(function() {
  try {
    const cachedLogo = localStorage.getItem('tm_logo');
    const els = document.querySelectorAll('.ls-logo');
    if (cachedLogo) {
      els.forEach(el => {
        el.onload = () => { el.style.display = ''; };
        el.onerror = () => { el.style.display = 'none'; };
        el.src = cachedLogo;
      });
    }
  } catch(e) {}
})();

/**
 * Format a POWER number with suffix and 2 decimal places.
 * e.g. 1500 → "1.50K", 1200000 → "1.20M"
 */
function fmtPower(n) {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + 'B';
  if (n >= 1_000_000)     return (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000)         return (n / 1_000).toFixed(2) + 'K';
  return n.toFixed(2);
}

// ── Global error display (visible inside mini app) ────────────────────────────
window.addEventListener('error', (e) => {
  const msg = e.message || '';
  if (msg.includes('IDBDatabase') || msg.includes('cursor') || msg.includes('database connection')) return;
  const out = msg + (e.filename ? ` @ ${e.filename.split('/').pop()}:${e.lineno}` : '');
  showDbgToast('JS ERROR: ' + out);
});
window.addEventListener('unhandledrejection', (e) => {
  const msg = e.reason?.message || String(e.reason);
  if (msg.includes('IDBDatabase') || msg.includes('cursor') || msg.includes('database connection')) return;
  if (msg.includes('adex') || msg.includes('libtl')) return; // 3rd-party ad SDK noise
  showDbgToast('PROMISE: ' + msg);
});
function showDbgToast(msg) {
  console.error('[DBG]', msg);
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.className = 'toast error';
  void el.offsetWidth;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 6000);
}

// ── TON Connect setup ─────────────────────────────────────────
// Initialized once; wallet connection persists across sessions.
let tonConnectUI = null;
function getTonConnect() {
  if (tonConnectUI) return tonConnectUI;
  try {
    tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
      manifestUrl: window.location.origin + '/tonconnect-manifest.json',
      actionsConfiguration: {
        // Return user back to the Mini App after approving in wallet
        twaReturnUrl: 'https://t.me/' + (window.__botUsername || APP_BOT_USERNAME)
      }
    });
  } catch (e) {
    console.warn('TON Connect init failed:', e);
  }
  return tonConnectUI;
}
// ─────────────────────────────────────────────────────────────

// =====================================================
//  CONVERSION RATE — edit this to change HASHES → TON
//  Rule: 1K POWER → 25 HASHES/day → 0.00036 TON/day
//  So: 1 HASH = 0.00036 / 25 = 0.0000144 TON
//  To change: keep HASH_TO_TON = (dailyTon / dailyHashes)
//  where dailyHashes = 25 * (power / 1000)
// =====================================================
let HASH_TO_TON = 0.0000144;  // updated from server config after auth
let DAILY_HASHES_PER_1K = 25;

function applyEconomyConfig(user) {
  if (!user) return;
  if (user.hash_to_ton) HASH_TO_TON = user.hash_to_ton;
  if (user.base_hashes_per_1k_per_day) DAILY_HASHES_PER_1K = user.base_hashes_per_1k_per_day;
  if (user.ton_per_power) { TON_PER_POWER = user.ton_per_power; BASE_POWER_PER_TON = Math.round(1 / TON_PER_POWER); }
  if (user.wd_min_hashes) { WD_MIN_HASHES = user.wd_min_hashes; WD_MIN_TON = WD_MIN_HASHES * HASH_TO_TON; }
  if (user.power_name || user.hashes_name) I18n.setCurrencyNames(user.power_name, user.hashes_name);
  if (user.app_name) I18n.setAppName(user.app_name);
}

// ---- STATE ----
const state = {
  user: null,
  tonPrice: 0,
  lang: 'en',
  leaderboard: [],
  transactions: [],
  claimInterval: null,
  currentTab: 'mine',
  tasks: [],
  taskReferralCount: 0,
  taskChannel: null,
  refLink: '',
  slotOnCooldown: false,
  slotNextSpinAt: null,
};

// ---- TELEGRAM WEBAPP ----
const tg = window.Telegram?.WebApp;

function applyTgViewport() {
  if (!tg) return;
  const vh = tg.viewportStableHeight || tg.viewportHeight;
  if (vh && vh > 100) {
    document.documentElement.style.setProperty('--tg-vh', vh + 'px');
    document.getElementById('app').style.minHeight = vh + 'px';
  }
}

if (tg) {
  tg.ready();
  tg.expand();
  tg.enableClosingConfirmation();
  try {
    tg.setHeaderColor?.('#080B12');    // MineQuest — void black (matches app header)
    tg.setBackgroundColor?.('#080B12'); // MineQuest — void black (matches app bg)
    tg.disableVerticalSwipes?.();
  } catch (e) { /* older Telegram versions may not support these */ }
  tg.onEvent?.('viewportChanged', applyTgViewport);
  applyTgViewport();
}
const urlParams = new URL(window.location.href).searchParams;
const debugToken = urlParams.get('debug_token') || localStorage.getItem('tg_debug_token');
if (debugToken) localStorage.setItem('tg_debug_token', debugToken);

const initData = tg?.initData || debugToken || '';

// ---- UTILS ----
function fmt(n, decimals = 2) {
  if (n === undefined || n === null) return '0';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return Number(n).toFixed(decimals);
}
function fmtHashes(n) { return Number(n || 0).toFixed(8); }
function fmtTon(n) { return Number(n || 0).toFixed(8); }
function fmtTon5(n) { return Number(n || 0).toFixed(5); }
function fmtUsd(n) { return '$' + Number(n || 0).toFixed(4); }

function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast' + (type ? ' ' + type : '');
  void t.offsetWidth;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}

/**
 * showAlert(opts)
 * opts.type    = 'success' | 'error' | 'info'
 * opts.icon    = emoji shown in the dark display area
 * opts.power   = gold text (e.g. "+12K POWER"), optional
 * opts.badge   = bold headline below the display box
 * opts.msg     = smaller subtitle
 * opts.onClose = callback after OK (runs AFTER optional ad for success)
 */
function showAlert({ type = 'error', icon, power = '', badge = '', msg = '', onClose } = {}) {
  const overlay   = document.getElementById('alert-modal');
  const iconEl    = document.getElementById('alert-icon');
  const powerEl   = document.getElementById('alert-power');
  const badgeEl   = document.getElementById('alert-badge');
  const msgEl     = document.getElementById('alert-msg');
  const okBtn     = document.getElementById('alert-ok');
  if (!overlay) { showToast(msg || badge, type); return; }

  iconEl.textContent  = icon  || (type === 'success' ? '🏆' : type === 'error' ? '⚠️' : 'ℹ️');
  powerEl.textContent = power || '';
  badgeEl.textContent = badge || '';
  msgEl.textContent   = msg   || '';
  okBtn.textContent   = 'OK';
  okBtn.disabled      = false;

  overlay.className = `alert-overlay type-${type} open`;

  function closeAlert() {
    overlay.classList.remove('open');
    overlay.className = `alert-overlay type-${type}`;
    okBtn.removeEventListener('click', onOk);
    overlay.removeEventListener('click', onOverlayClick);
    if (onClose) onClose();
  }

  function onOk() {
    closeAlert();
  }

  const onOverlayClick = (e) => { if (e.target === overlay && type !== 'success') closeAlert(); };
  okBtn.addEventListener('click', onOk);
  overlay.addEventListener('click', onOverlayClick);
}

/** Shorthand for I18n.t(key, replacements) */
function t(key, replacements) {
  return I18n.t(key, replacements);
}

/**
 * Shows an input modal with a text field.
 * Returns a Promise that resolves with the entered string, or null if cancelled.
 */
function showInputModal({ title = '', msg = '', placeholder = '' } = {}) {
  return new Promise((resolve) => {
    const overlay   = document.getElementById('input-modal');
    const titleEl   = document.getElementById('input-modal-title');
    const msgEl     = document.getElementById('input-modal-msg');
    const field     = document.getElementById('input-modal-field');
    const errorEl   = document.getElementById('input-modal-error');
    const confirmBtn = document.getElementById('input-modal-confirm');
    const cancelBtn  = document.getElementById('input-modal-cancel');
    if (!overlay) { resolve(null); return; }

    titleEl.textContent      = title;
    msgEl.textContent        = msg;
    field.placeholder        = placeholder;
    field.value              = '';
    errorEl.textContent      = '';
    confirmBtn.textContent   = t('itrade_modal_confirm');
    cancelBtn.textContent    = t('itrade_modal_cancel');
    overlay.classList.add('open');
    setTimeout(() => field.focus(), 120);

    function close(value) {
      overlay.classList.remove('open');
      confirmBtn.removeEventListener('click', onConfirm);
      cancelBtn.removeEventListener('click', onCancel);
      resolve(value);
    }

    function onConfirm() {
      const val = field.value.trim();
      if (!val) { errorEl.textContent = t('itrade_modal_empty'); return; }
      close(val);
    }

    function onCancel() { close(null); }

    confirmBtn.addEventListener('click', onConfirm);
    cancelBtn.addEventListener('click', onCancel);
  });
}

// ---- API ----
async function apiPost(path, body = {}) {
  const res = await fetch(API_BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ initData, ...body })
  });
  try { return await res.json(); } catch { return { ok: false, error: `http_${res.status}` }; }
}
async function apiGet(path) {
  const res = await fetch(API_BASE + path);
  try { return await res.json(); } catch { return { ok: false, error: `http_${res.status}` }; }
}

function apiBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized === '1' || normalized === 'true' || normalized === 'yes';
  }
  return false;
}

function getWelcomeBonusPower() {
  const n = Number(state.user?.welcome_bonus_power);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

function shouldShowWelcomeBonus() {
  return !!state.user && !apiBoolean(state.user.welcome_bonus_claimed) && getWelcomeBonusPower() > 0;
}

function openWelcomeBonusModal() {
  if (!shouldShowWelcomeBonus()) return;

  const modal = document.getElementById('welcome-modal');
  const amountEl = document.getElementById('welcome-modal-amount');
  const btn = document.getElementById('welcome-modal-btn');
  if (!modal || !amountEl || !btn) return;

  const bonusPower = getWelcomeBonusPower();
  amountEl.textContent = bonusPower.toLocaleString();
  btn.disabled = false;
  btn.textContent = t('welcome_modal_btn');
  modal.classList.add('open');

  btn.onclick = async () => {
    btn.disabled = true;
    btn.textContent = t('loading');
    try {
      const res = await apiPost('/claim-welcome-bonus');
      if (res.ok) {
        state.user.welcome_bonus_claimed = true;
        if (res.new_power !== undefined) state.user.power = res.new_power;
        modal.classList.remove('open');

        const authRes2 = await apiPost('/auth');
        if (authRes2.ok) state.user = authRes2.user;
        renderAll();
        showToast(t('welcome_modal_claimed'), 'success');
        return;
      }

      if (res.error === 'already claimed') {
        state.user.welcome_bonus_claimed = true;
        modal.classList.remove('open');
        return;
      }

      showToast(res.error || t('error'), 'error');
    } catch (e) {
      showToast(t('error'), 'error');
    } finally {
      if (!apiBoolean(state.user?.welcome_bonus_claimed)) {
        btn.disabled = false;
        btn.textContent = t('welcome_modal_btn');
      }
    }
  };
}

// ---- INIT ----
async function init() {
  try {
    // Auth
    const authRes = await apiPost('/auth');
    if (!authRes.ok) {
      // Detect language from Telegram WebApp before i18n is fully initialized
      const tgLang = (window.Telegram && Telegram.WebApp && Telegram.WebApp.initDataUnsafe &&
        Telegram.WebApp.initDataUnsafe.user && Telegram.WebApp.initDataUnsafe.user.language_code) || 'en';
      await I18n.init(tgLang);
      document.getElementById('loading-screen').style.display = 'none';
      const modal = document.getElementById('not-registered-modal');
      if (modal) {
        I18n.applyDataI18n();
        modal.classList.add('open');
      }
      return;
    }

    if (authRes.app_logo_url) {
      try { localStorage.setItem('tm_logo', authRes.app_logo_url); } catch(e){}
      const els = document.querySelectorAll('.ls-logo');
      els.forEach(el => {
        el.onload = () => { el.style.display = ''; };
        el.onerror = () => { el.style.display = 'none'; };
        el.src = authRes.app_logo_url;
      });
    }

    state.user = authRes.user;
    applyEconomyConfig(authRes.user);
    state.tonPrice = authRes.user.ton_price || 3;
    // Language priority: localStorage override → server preference → 'en'
    state.lang = localStorage.getItem('tm_lang') || authRes.user.language || 'en';
    // expose bot username for TON Connect return URL
    window.__botUsername = authRes.user.bot_username || '';

    // Initialize i18n with user's language
    await I18n.init(state.lang);

    // Fetch TON price in background
    apiGet('/ton-price').then(r => { if (r.ok) { state.tonPrice = r.price; updatePriceDisplay(); } });

    // Render UI
    renderAll();
    initLangSelector();
    hideLoading();
    startClaimTimer();
    syncHashesFromDB(); // persist any hashes accrued since last visit
    snapshotDepositId(); // cache current deposit id for resume comparison

    openWelcomeBonusModal();


  } catch (e) {
    console.error('init error', e);
    document.getElementById('loading-screen').innerHTML =
      '<div style="color:#f05252;font-size:16px;padding:20px;text-align:center">⚠️ ' + t('error') + ': Failed to load. Please restart the app.</div>';
  }
}

// ---- LANGUAGE SELECTOR ----
// Map language codes to ISO 3166-1 alpha-2 country codes for flag images
const LANG_COUNTRY = {
  en: 'gb', es: 'es', pt: 'br', ru: 'ru',
  zh: 'cn', fr: 'fr', de: 'de', tr: 'tr',
  hi: 'in',
};

function flagImg(langCode, size = 20) {
  const country = LANG_COUNTRY[langCode] || '';
  if (!country) return '<span class="lang-flag-fallback">🌐</span>';
  return `<img class="lang-flag-img" src="https://flagcdn.com/w${size}/${country}.png" srcset="https://flagcdn.com/w${size * 2}/${country}.png 2x" width="${size}" height="${Math.round(size * 0.75)}" alt="${langCode}" loading="lazy">`;
}

async function initLangSelector() {
  const btn      = document.getElementById('lang-selector-btn');
  const dropdown = document.getElementById('lang-dropdown');
  const current  = document.getElementById('lang-selector-current');
  if (!btn || !dropdown || !current) return;

  // Populate dropdown with available locales
  const langs = await I18n.getAvailableLangs();
  dropdown.innerHTML = '';
  langs.forEach(({ code, label }) => {
    const li = document.createElement('li');
    li.className = 'lang-option' + (code === state.lang ? ' active' : '');
    li.innerHTML = `<span class="lang-flag">${flagImg(code)}</span><span class="lang-code">${label}</span>`;
    li.setAttribute('role', 'option');
    li.setAttribute('data-lang', code);
    li.addEventListener('click', () => {
      if (code === I18n.getLang()) { closeLangDropdown(); return; }
      localStorage.setItem('tm_lang', code);
      location.reload();
    });
    dropdown.appendChild(li);
  });

  // Set initial flag
  const activeLang = langs.find(l => l.code === state.lang);
  if (activeLang) current.innerHTML = flagImg(activeLang.code, 20);

  // Toggle open/close — use pointerdown so stopPropagation fires before
  // the document pointerdown/touchstart that closes the dropdown
  btn.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    const open = dropdown.style.display !== 'none';
    if (open) { closeLangDropdown(); } else { openLangDropdown(); }
  });

  // Close on outside interaction
  document.addEventListener('pointerdown', (e) => {
    if (!document.getElementById('lang-selector')?.contains(e.target)) {
      closeLangDropdown();
    }
  });
}

function openLangDropdown() {
  const btn      = document.getElementById('lang-selector-btn');
  const dropdown = document.getElementById('lang-dropdown');
  if (!btn || !dropdown) return;
  dropdown.style.display = '';
  btn.setAttribute('aria-expanded', 'true');
}

function closeLangDropdown() {
  const btn      = document.getElementById('lang-selector-btn');
  const dropdown = document.getElementById('lang-dropdown');
  if (!btn || !dropdown) return;
  dropdown.style.display = 'none';
  btn.setAttribute('aria-expanded', 'false');
}

function hideLoading() {
  const s = document.getElementById('loading-screen');
  s.classList.add('hidden');
  setTimeout(() => s.style.display = 'none', 500);
}

// ---- RENDER ----
function renderAll() {
  renderMine();
  renderShop();
  renderTeam();
  renderUserHeader();
}

function updatePriceDisplay() {
  // no-op: TON price no longer shown in wallet (fixed rate 100 H = 0.009 TON)
}

function renderUserHeader() {
  const u = state.user;
  if (!u) return;

  const firstName = u.first_name || tg?.initDataUnsafe?.user?.first_name || '';
  const photoUrl = u.photo_url || tg?.initDataUnsafe?.user?.photo_url || '';

  const nameEl = document.getElementById('header-user-name');
  if (nameEl) nameEl.textContent = firstName;

  const photoEl = document.getElementById('header-user-photo');
  const initialsEl = document.getElementById('header-user-initials');

  if (photoUrl && photoEl) {
    photoEl.src = photoUrl;
    photoEl.style.display = 'block';
    if (initialsEl) initialsEl.style.display = 'none';
  } else {
    if (photoEl) photoEl.style.display = 'none';
    if (initialsEl) {
      initialsEl.style.display = 'flex';
      initialsEl.textContent = firstName.charAt(0).toUpperCase();
    }
  }
}

// ---- MINE PAGE ----
// Compact H/day: 250, 1.2K, 3.4M ─────────────────────────────────────
function fmtHashRate(n) {
  const v = Number(n) || 0;
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(v % 1_000_000 === 0 ? 0 : 1) + 'M';
  if (v >= 1_000)     return (v / 1_000).toFixed(v % 1_000 === 0 ? 0 : 1) + 'K';
  return Math.round(v).toLocaleString();
}

// Human duration from seconds: "23h 41m", "6d 14h", "12m" ────────────
function fmtDuration(secs) {
  const s = Math.max(0, Math.floor(Number(secs) || 0));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function renderMine() {
  const u = state.user;
  if (!u) return;

  const hashes = u.hashes || 0;
  const hashesTon = hashes * HASH_TO_TON;
  const power = u.power || 0;
  const contracts = Array.isArray(u.contracts) ? u.contracts : [];
  const dailyHashes = contracts.reduce((sum, c) => sum + (c.hashes_per_day || 0), 0);

  // Stats strip
  const rateDayEl = document.getElementById('mine-rate-day');
  const powerEl   = document.getElementById('mine-power');
  if (rateDayEl) rateDayEl.textContent = fmtHashRate(dailyHashes);
  if (powerEl)   powerEl.textContent   = fmtPower(power);

  // HASHES balance
  const hashesEl = document.getElementById('mine-hashes');
  const tonEl    = document.getElementById('mine-ton');
  if (hashesEl) hashesEl.textContent = fmtHashes(hashes);
  if (tonEl) {
    const atRate = t('at_current_rate');
    tonEl.innerHTML = '≈ ' + fmtTon(hashesTon) + ' TON <span>' + atRate + '</span>';
  }

  // Swap banner subtitle
  const swapSub = document.getElementById('mine-swap-sub');
  if (swapSub) swapSub.textContent = t('swap_convert_detail', { h: fmt(hashes, 2), ton: fmtTon5(hashesTon) });

  // Contracts + next expiry
  renderContracts(contracts);
}

function renderContracts(contracts) {
  const wrap = document.getElementById('mine-contracts');
  const expiryEl = document.getElementById('mine-next-expiry');

  // Next expiry = soonest seconds_left among timed contracts
  const timed = contracts.filter(c => !c.permanent && c.seconds_left > 0);
  const soonest = timed.reduce((min, c) => Math.min(min, c.seconds_left), Infinity);
  if (expiryEl) expiryEl.textContent = timed.length ? fmtDuration(soonest) : '∞';

  if (!wrap) return;
  if (!contracts.length) {
    wrap.innerHTML = `<div class="mn-contracts-empty">${t('no_contracts')}</div>`;
    return;
  }

  // Active (timed) contracts: most-urgent first; permanent last
  const sorted = [...contracts].sort((a, b) => {
    if (a.permanent !== b.permanent) return a.permanent ? 1 : -1;
    return (a.seconds_left || 0) - (b.seconds_left || 0);
  });
  const visibleContracts = sorted.slice(0, 10);

  wrap.innerHTML = visibleContracts.map(c => {
    const rate = fmtHashRate(c.hashes_per_day);
    const amt  = fmtPower(c.amount);

    if (c.permanent) {
      return `
        <div class="mn-contract mn-contract--perm">
          <div class="mn-contract-icon"><i data-lucide="zap"></i></div>
          <div class="mn-contract-main">
            <div class="mn-contract-top">
              <div class="mn-contract-name">${amt} ${t('power_unit')}</div>
              <span class="mn-contract-badge" data-i18n="task_reward">TASK REWARD</span>
            </div>
            <div class="mn-contract-meta mn-contract-meta--perm">
              <i data-lucide="infinity"></i> <span data-i18n="permanent_word">Permanent</span>
            </div>
          </div>
          <div class="mn-contract-rate"><strong>${rate}</strong> <span data-i18n="h_per_day_unit">H/day</span></div>
        </div>`;
    }

    const pct = Math.round((c.progress || 0) * 100);
    // Color: green if plenty of life left, amber when near expiry (<24h)
    const urgent = c.seconds_left <= 86400;
    const toneCls = urgent ? 'is-urgent' : '';

    return `
      <div class="mn-contract ${toneCls}">
        <div class="mn-contract-icon"><i data-lucide="zap"></i></div>
        <div class="mn-contract-main">
          <div class="mn-contract-top">
            <div class="mn-contract-name">${amt} ${t('power_unit')}</div>
            <div class="mn-contract-rate"><strong>${rate}</strong> <span data-i18n="h_per_day_unit">H/day</span></div>
          </div>
          <div class="mn-contract-meta">
            <i data-lucide="clock"></i>
            <span>${t('expires_in', { time: fmtDuration(c.seconds_left) })}</span>
          </div>
          <div class="mn-contract-bar">
            <div class="mn-contract-bar-fill" style="width:${Math.max(pct, 2)}%"></div>
            <span class="mn-contract-pct">${pct}%</span>
          </div>
        </div>
      </div>`;
  }).join('');

  if (window.lucide) lucide.createIcons();
}

// ---- SWAP HASHES ----
function onSwapHashes() {
  openWithdrawModal();
}

function startClaimTimer() {
  // Update display every 1s with simulated increment for live animation
  setInterval(() => {
    if (!state.user) return;
    const power = state.user.power || 0;

    // 24/7 mining — always accumulate if power > 0 (no timer needed)
    if (power > 0) {
      const contracts = Array.isArray(state.user.contracts) ? state.user.contracts : [];
      const dailyHashes = contracts.reduce((sum, c) => sum + (c.hashes_per_day || 0), 0);
      const perSecond = dailyHashes / 86400;
      state.user.hashes = (state.user.hashes || 0) + perSecond;
    }

    // Hide start-production button if it exists in DOM
    const btn = document.getElementById('start-production-btn');
    if (btn) btn.style.display = 'none';

    renderMine();
  }, 1000);
}

async function startProduction() {
  if (!state.user) return;
  const btn = document.getElementById('start-production-btn');
  
  if (typeof show_11160788 === 'function') {
    if (btn) btn.disabled = true;
    const _useInterstitial = _sessionInterstitialShown < MAX_SESSION_INTERSTITIALS && Math.random() < INTERSTITIAL_CHANCE;
    if (_useInterstitial) _sessionInterstitialShown++;
    const _adP = _useInterstitial
      ? show_11160788({ type: 'inApp', inAppSettings: { frequency: 2, capping: 0.1, interval: 60, timeout: 30, everyPage: false } })
      : show_11160788('pop');
    _adP.then(async () => {
      try {
        const res = await apiPost('/start-production');
        if (res.ok) {
          state.user.hashes_production_ends_at = res.ends_at;
          state.user.hashes = res.total_hashes;
          renderMine();
          showToast(t('production_started') || 'Production Started!', 'success');
        } else {
          showToast(res.error || t('error'), 'error');
          if (btn) btn.disabled = false;
        }
      } catch {
        showToast(t('connection_error') || 'Connection Error', 'error');
        if (btn) btn.disabled = false;
      }
    }).catch(err => {
      console.error('Ad skip or error:', err);
      if (btn) btn.disabled = false;
    });
  } else {
    // Fallback if ad SDK not loaded
    if (btn) btn.disabled = true;
    try {
      const res = await apiPost('/start-production');
      if (res.ok) {
        state.user.hashes_production_ends_at = res.ends_at;
        state.user.hashes = res.total_hashes;
        renderMine();
        showToast(t('production_started') || 'Production Started!', 'success');
      } else {
        showToast(res.error || t('error'), 'error');
        if (btn) btn.disabled = false;
      }
    } catch {
      showToast(t('connection_error') || 'Connection Error', 'error');
      if (btn) btn.disabled = false;
    }
  }
}

// ---- WALLET PAGE ----
function renderWallet() {
  const u = state.user;
  if (!u) return;

  const hashes = u.hashes || 0;
  const hashesTon = hashes * HASH_TO_TON;

  const elH = document.getElementById('wallet-hashes');
  const elU = document.getElementById('wallet-hashes-usd');
  const elB = document.getElementById('wallet-ton-bal');
  if (elH) elH.textContent = fmtHashes(hashes);
  if (elU) elU.textContent = fmtTon(hashesTon) + ' TON';
  if (elB) elB.textContent = fmtTon(u.balance) + ' TON';
}

// ---- AD / CLAIM HELPERS ----
// Max 1 interstitial per app session to protect CPM
let _sessionInterstitialShown = 0;
const MAX_SESSION_INTERSTITIALS = 1;
const INTERSTITIAL_CHANCE = 0.20; // 20% — rare enough to maintain high CPM

function showGlobalCooldownToast(nextClaimAt) {
  const msLeft = Math.max(0, nextClaimAt - Date.now());
  const sLeft  = Math.ceil(msLeft / 1000);
  const m = Math.floor(sLeft / 60);
  const s = sLeft % 60;
  const label = m > 0 ? `${m}m ${s}s` : `${s}s`;
  showToast(`Please wait ${label} before claiming again`, 'error');
}

// ---- WITHDRAW FLOW ----
// Minimum swap = exactly 1000 HASHES
let WD_MIN_HASHES = 1000;
let WD_MIN_TON    = WD_MIN_HASHES * HASH_TO_TON;

function isValidTonAddress(addr) {
  // TON addresses: UQ/EQ/0: prefix + 46 base64url chars (48 total) — or raw hex 64 chars
  return /^[UE0][Qq0-9A-Za-z_-]{47}$/.test(addr) || /^[0-9a-fA-F]{64}$/.test(addr);
}

function wdSetInputError(inputId, hintId, msg) {
  const inp = document.getElementById(inputId);
  const hint = document.getElementById(hintId);
  if (inp) inp.classList.toggle('form-input--error', !!msg);
  if (hint) { hint.textContent = msg || ''; hint.style.display = msg ? '' : 'none'; }
}

function wdShowStep(n) {
  [1,2,3,4,5].forEach(i => {
    const el = document.getElementById('wd-step-' + i);
    if (el) el.style.display = i === n ? 'flex' : 'none';
  });
}

function openWithdrawModal() {
  const hashes = state.user?.hashes || 0;
  const tonAmt = hashes * HASH_TO_TON;
  const per1k  = 1000 * HASH_TO_TON;

  document.getElementById('wd-rate-display').textContent    = t('withdraw_rate_display', { ton: fmtTon(per1k) });
  document.getElementById('wd-balance-display').textContent = t('balance_hashes', { hashes: fmtHashes(hashes) });
  document.getElementById('wd-receive-display').textContent = t('receive_approx_ton', { ton: fmtTon(tonAmt) });
  document.getElementById('wd-min-display').textContent     = t('min_hashes_display', { hashes: WD_MIN_HASHES.toLocaleString() });

  // reset inputs & step
  const wInput = document.getElementById('wd-wallet');
  const mInput = document.getElementById('wd-memo');
  if (wInput) wInput.value = '';
  if (mInput) mInput.value = '';
  wdShowStep(1);
  document.getElementById('withdraw-modal').classList.add('open');
}

function closeWithdrawModal() {
  document.getElementById('withdraw-modal').classList.remove('open');
}

const WD_MIN_REFERRALS = 3;

async function wdCheckReferrals() {
  const loadingEl = document.getElementById('wd-ref-loading');
  const passEl    = document.getElementById('wd-ref-pass');
  const failEl    = document.getElementById('wd-ref-fail');

  if (loadingEl) { loadingEl.style.display = 'flex'; }
  if (passEl)    { passEl.style.display    = 'none'; }
  if (failEl)    { failEl.style.display    = 'none'; }

  let refCount = 0;
  try {
    const res  = await fetch(API_BASE + '/tasks?initData=' + encodeURIComponent(initData));
    const data = await res.json();
    if (data.ok) refCount = data.referral_count || 0;
  } catch (_) {}

  if (loadingEl) { loadingEl.style.display = 'none'; }

  if (typeof lucide !== 'undefined') {
    const step3 = document.getElementById('wd-step-3');
    if (step3) lucide.createIcons({ nodes: [step3] });
  }

  if (refCount >= WD_MIN_REFERRALS) {
    const countEl = document.getElementById('wd-ref-count');
    if (countEl) countEl.textContent = refCount;
    if (passEl) passEl.style.display = 'flex';
  } else {
    const countFailEl  = document.getElementById('wd-ref-count-fail');
    const neededEl     = document.getElementById('wd-ref-needed');
    if (countFailEl) countFailEl.textContent = refCount;
    if (neededEl)    neededEl.textContent    = WD_MIN_REFERRALS - refCount;
    if (failEl) failEl.style.display = 'flex';
  }
}

function wdShowResult(success, title, sub) {
  wdShowStep(5);
  const bar      = document.getElementById('wd-progress-bar');
  const titleEl  = document.getElementById('wd-progress-title');
  const subEl    = document.getElementById('wd-progress-sub');
  const doneBtn  = document.getElementById('wd-done-btn');
  const iconWrap = document.querySelector('#wd-step-5 .wd-icon');

  if (titleEl) titleEl.textContent = title;
  if (subEl)   subEl.textContent   = sub;

  if (success) {
    if (bar) { bar.style.width = '0%'; requestAnimationFrame(() => { bar.style.width = '100%'; }); }
    if (iconWrap) { iconWrap.innerHTML = '<i data-lucide="check-circle"></i>'; iconWrap.style.borderColor = 'rgba(34,197,94,0.4)'; iconWrap.style.boxShadow = '0 0 24px rgba(34,197,94,0.2)'; if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [iconWrap] }); }
    if (doneBtn) { doneBtn.style.display = ''; doneBtn.textContent = t('done'); }
  } else {
    if (bar) bar.style.width = '0%';
    if (iconWrap) { iconWrap.innerHTML = '<i data-lucide="x-circle"></i>'; iconWrap.style.borderColor = 'rgba(239,68,68,0.4)'; iconWrap.style.boxShadow = '0 0 24px rgba(239,68,68,0.2)'; if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [iconWrap] }); }
    if (doneBtn) { doneBtn.style.display = ''; doneBtn.textContent = t('try_again'); doneBtn.onclick = () => wdShowStep(1); }
  }
}

async function submitWithdraw() {
  const hashes = state.user?.hashes || 0;
  const wallet = document.getElementById('wd-wallet').value.trim();
  const memo   = document.getElementById('wd-memo').value.trim();

  // Show progress
  wdShowStep(5);
  const bar     = document.getElementById('wd-progress-bar');
  const titleEl = document.getElementById('wd-progress-title');
  const subEl   = document.getElementById('wd-progress-sub');
  if (titleEl) titleEl.textContent = t('processing_swap');
  if (subEl)   subEl.textContent   = t('swap_queued');
  if (bar) { bar.style.width = '0%'; requestAnimationFrame(() => { bar.style.width = '60%'; }); }

  try {
    const res = await apiPost('/withdraw', { wallet_address: wallet, memo });
    if (res.ok) {
      state.user.hashes = 0;
      renderMine();
      renderWallet();
      wdShowResult(true,
        t('swap_complete'),
        t('ton_on_way')
      );
    } else {
      const err = res.error || '';
      if (err.startsWith('minimum_not_met:')) {
        const parts  = err.split(':');
        const minTon = parts[1];
        const minH   = parseInt(parts[2]).toLocaleString();
        wdShowResult(false,
          t('insufficient_hashes'),
          t('not_enough_hashes_detail', { minH, minTon })
        );
      } else if (err === 'no hashes to swap') {
        wdShowResult(false,
          t('no_hashes_to_swap'),
          t('no_hashes_detail')
        );
      } else {
        wdShowResult(false,
          t('swap_failed'),
          err || t('swap_error')
        );
      }
    }
  } catch {
    wdShowResult(false,
      t('connection_error'),
      t('check_connection')
    );
  }
}

// ---- SHOP PAGE ----
function calcTonPerDay(amount) {
  const lifetimeHours = state.user?.power_lifetime_hours || 0;
  if (lifetimeHours > 0) {
    const roiTarget = state.user?.power_roi_target || 1.1;
    const targetTon = (amount * TON_PER_POWER) * roiTarget;
    const totalHashes = targetTon / HASH_TO_TON;
    const hashesPerSec = totalHashes / (lifetimeHours * 3600);
    return (hashesPerSec * 86400) * HASH_TO_TON;
  } else {
    return DAILY_HASHES_PER_1K * (amount / 1000) * HASH_TO_TON;
  }
}

// Economics — seeded from server config after auth (see applyEconomyConfig).
let TON_PER_POWER     = 0.0000085;
let BASE_POWER_PER_TON = Math.round(1 / TON_PER_POWER);

// TON-indexed packages with tiered bonus (matches SHOP_TIERS in miningConfig.ts).
const SHOP_TIERS = [
  { ton: 0.8, bonus: 0.00, tone: '' },
  { ton: 1,   bonus: 0.00, tone: '' },
  { ton: 5,   bonus: 0.02, tone: 'g' },
  { ton: 10,  bonus: 0.05, tone: 'b' },
  { ton: 25,  bonus: 0.25, tone: 'v' },
  { ton: 100, bonus: 0.50, tone: 'o' },
];

function shopRoiTarget() {
  const v = Number(state.user?.power_roi_target);
  return (v && v > 0) ? v : 1.1;
}

function renderShop() {
  const container = document.getElementById('shop-packages');
  if (!container) return;
  container.innerHTML = '';



  const roi = shopRoiTarget();

  SHOP_TIERS.forEach(tier => {
    // Must mirror creditedPowerForTon() in miningConfig.ts exactly.
    const basePower  = Math.round(tier.ton * BASE_POWER_PER_TON);
    const totalPower = Math.floor(basePower * (1 + tier.bonus));
    const bonusPower = totalPower - basePower;
    const finalReturn = tier.ton * (1 + tier.bonus) * roi;   // TON returned over contract lifetime

    const item = document.createElement('div');
    item.className = 'sh-pkg' + (tier.tone ? ' tone-' + tier.tone : '');

    const bonusChip = tier.bonus > 0
      ? `<span class="sh-pkg-bonus">+${fmtPower(bonusPower)}<small> ${t('power_unit')}</small></span>`
      : '';

    item.innerHTML = `
      <div class="sh-pkg-main">
        <div class="sh-pkg-power">${fmtPower(totalPower)} <span>${t('power_unit')}</span></div>
        <div class="sh-pkg-return"><i data-lucide="clock"></i> ${t('shop_final_return', { ton: finalReturn.toFixed(3) })}</div>
      </div>
      ${bonusChip}
      <button class="sh-pkg-buy">
        <strong>${tier.ton}</strong> 
        <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M28 0C12.536 0 0 12.536 0 28s12.536 28 28 28 28-12.536 28-28S43.464 0 28 0z" fill="#0098EA"/>
          <path d="M37.946 15.5H18.054c-3.5 0-5.5 4-3.5 6.9l11.5 17.5c.9 1.4 3 1.4 3.9 0l11.5-17.5c2-2.9 0-6.9-3.508-6.9zM26.5 31.1l-7.5-11.4h7.5v11.4zm3 0V19.7h7.5l-7.5 11.4z" fill="white"/>
        </svg>
      </button>
    `;

    item.querySelector('.sh-pkg-buy').onclick = () => onBuyPower(basePower);
    container.appendChild(item);
  });

  if (window.lucide) lucide.createIcons();
}

// ── Payment modal ────────────────────────────────────────────
let _payData = null;

function buildCommentPayload(text) {
  const textBytes = new TextEncoder().encode(text);
  const cell = new Uint8Array(4 + textBytes.length);
  cell.set(textBytes, 4);
  return btoa(String.fromCharCode(...cell))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function openPayModal(pkg, payRes) {
  _payData = {
    address:  payRes.deposit_address,
    nanotons: String(Math.round(payRes.ton_cost * 1e9)),
    memo:     String(payRes.memo),
    ton_cost: payRes.ton_cost,
  };
  
  const elPower = document.getElementById('pay-mod-power');
  if (elPower) elPower.innerHTML = `${pkg.label} <span>POWER</span>`;
  
  const elBonus = document.getElementById('pay-mod-bonus');
  if (elBonus) {
    elBonus.textContent = pkg.bonusPower > 0 ? `+${fmtPower(pkg.bonusPower)} POWER Bonus` : '';
  }
  
  const elPrice = document.getElementById('pay-mod-price');
  if (elPrice) elPrice.textContent = `${pkg.ton} TON`;
  
  const elHashes = document.getElementById('pay-mod-hashes');
  if (elHashes) elHashes.textContent = `~ ${fmt(pkg.totalHashes, 0)} ${I18n.getHashesName()}`;
  
  const elReturn = document.getElementById('pay-mod-return');
  if (elReturn) elReturn.textContent = `${pkg.finalReturn.toFixed(3)} TON`;
  
  const elDuration = document.getElementById('pay-mod-duration');
  if (elDuration) elDuration.textContent = pkg.lifetimeHours > 0 ? `${pkg.lifetimeHours}h` : `Permanent`;

  document.getElementById('pay-modal').classList.add('open');
  if (typeof lucide !== 'undefined') lucide.createIcons();

  // Open SSE stream — server will push the moment deposit is confirmed
  startDepositStream();
}

function closePayModal() {
  document.getElementById('pay-modal').classList.remove('open');
  // Keep SSE stream alive — deposit may arrive after modal is closed
}

async function payViaConnect() {
  if (!_payData) return;
  const { address, nanotons, memo } = _payData;
  const tc = getTonConnect();
  if (tc) {
    try {
      showToast(t('connect_wallet'));
      await tc.sendTransaction({
        validUntil: Math.floor(Date.now() / 1000) + 300,
        messages: [{ address, amount: nanotons, payload: buildCommentPayload(memo) }]
      });
      closePayModal();
      showToast(t('payment_sent'));
    } catch (tcErr) {
      const msg = tcErr?.message?.toLowerCase() || '';
      if (msg.includes('reject') || tcErr?.code === 300) {
        showToast(t('payment_cancelled'), 'error');
      } else {
        const webUrl = `https://app.tonkeeper.com/transfer/${address}?amount=${nanotons}&text=${encodeURIComponent(memo)}`;
        if (tg) tg.openLink(webUrl); else window.open(webUrl, '_blank');
      }
    }
  } else {
    const webUrl = `https://app.tonkeeper.com/transfer/${address}?amount=${nanotons}&text=${encodeURIComponent(memo)}`;
    if (tg) tg.openLink(webUrl); else window.open(webUrl, '_blank');
  }
}

function initPayModal() {
  document.getElementById('pay-close')?.addEventListener('click', closePayModal);
  document.getElementById('pay-modal')?.addEventListener('click', e => {
    if (e.target === document.getElementById('pay-modal')) closePayModal();
  });
  document.getElementById('pay-copy-addr')?.addEventListener('click', () => {
    navigator.clipboard?.writeText(_payData?.address || '');
    showToast(t('address_copied'));
  });
  document.getElementById('pay-copy-memo')?.addEventListener('click', () => {
    navigator.clipboard?.writeText(_payData?.memo || '');
    showToast(t('memo_copied'));
  });
  document.getElementById('pay-tonconnect-btn')?.addEventListener('click', payViaConnect);
}

// ── Deposit detection via Server-Sent Events ─────────────────
// Single persistent HTTP connection, zero polling, zero DB load.
// Server pushes 'deposit' event the instant bot confirms payment.
// Connection auto-closes on: deposit received | modal closed | 20 min timeout.
let _depositES = null;
let _knownDepositId = 0; // last deposit transaction id we've already shown to the user

async function snapshotDepositId() {
  try {
    const res = await apiGet('/poll-deposit?initData=' + encodeURIComponent(initData));
    if (res.ok) _knownDepositId = res.last_deposit_id || 0;
  } catch { /* silent */ }
}

async function checkNewDepositOnResume() {
  try {
    const res = await apiGet('/poll-deposit?initData=' + encodeURIComponent(initData));
    if (!res.ok) return;
    if (res.last_deposit_id > _knownDepositId) {
      _knownDepositId = res.last_deposit_id;
      const added    = res.last_deposit_power || 0;
      const newPower = res.power || (state.user?.power || 0);
      state.user.power = newPower;
      renderMine();
      showPowerSuccessModal(added, newPower);
    }
  } catch { /* silent */ }
}

function startDepositStream() {
  stopDepositStream();
  if (!initData) return;

  const url = API_BASE + '/deposit-stream?initData=' + encodeURIComponent(initData);
  const es  = new EventSource(url);
  _depositES = es;

  es.addEventListener('deposit', e => {
    stopDepositStream();
    try {
      const payload  = JSON.parse(e.data);
      const newPower = payload.newPower || (state.user?.power || 0);
      const added    = payload.power    || 0;
      state.user.power = newPower;
      renderMine();
      showPowerSuccessModal(added, newPower);
      // Update snapshot so resume check doesn't re-show this deposit
      snapshotDepositId();
    } catch { /* ignore */ }
    // Restart to keep listening for future deposits this session
    startDepositStream();
  });

  es.addEventListener('timeout', () => { stopDepositStream(); startDepositStream(); });
  es.onerror = () => stopDepositStream(); // on error, don't retry — avoids storm on auth failure
}

function stopDepositStream() {
  if (_depositES) { _depositES.close(); _depositES = null; }
}

// Keep old names as aliases so openPayModal / closePayModal still work
function startPowerPolling() { startDepositStream(); }
function stopPowerPolling()  { stopDepositStream();  }

// ── Power success modal ──────────────────────────────────────
function showPowerSuccessModal(addedPower, totalPower) {
  const modal  = document.getElementById('power-success-modal');
  const sheet  = modal?.querySelector('.ps-sheet');
  if (!modal) return;

  // Reset animations by cloning (forces re-run)
  const fresh = sheet.cloneNode(true);
  modal.replaceChild(fresh, sheet);
  if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [fresh] });
  fresh.querySelector('#ps-close-btn').addEventListener('click', closePowerSuccessModal);

  // Fill data
  const addedLabel = addedPower >= 1_000_000
    ? (addedPower / 1_000_000).toFixed(addedPower % 1_000_000 === 0 ? 0 : 1) + 'M'
    : addedPower >= 1_000
    ? (addedPower / 1_000).toFixed(addedPower % 1_000 === 0 ? 0 : 1) + 'K'
    : String(addedPower);

  const pkgEl    = fresh.querySelector('#ps-package-label');
  const totalEl  = fresh.querySelector('#ps-total-power');
  const durEl    = fresh.querySelector('#ps-duration-val');

  if (pkgEl)    pkgEl.innerHTML      = `+${addedLabel} <span>POWER</span>`;
  if (totalEl)  totalEl.textContent  = fmt(totalPower, 0);

  const lifetimeHours = state.user?.power_lifetime_hours || 0;
  if (durEl) {
    durEl.textContent = lifetimeHours > 0 ? lifetimeHours + 'h' : '∞';
  }

  // Burst particles
  spawnBurstParticles(fresh.querySelector('#ps-burst'));

  // Haptic feedback via Telegram
  tg?.HapticFeedback?.notificationOccurred?.('success');

  modal.classList.add('open');

  // Close the pay modal if it's still open
  closePayModal();
}

async function closePowerSuccessModal() {
  document.getElementById('power-success-modal')?.classList.remove('open');
  try {
    const authRes = await apiPost('/auth');
    if (authRes.ok) {
      state.user = authRes.user;
      renderMine();
    }
  } catch (e) {}
  showTab('mine');
}

function spawnBurstParticles(container) {
  if (!container) return;
  container.innerHTML = '';
  const COLORS = ['#00B4FF','#00e0ff','#ffffff','#8ed6ff','#c0f0ff'];
  const COUNT  = 12;
  for (let i = 0; i < COUNT; i++) {
    const angle  = (360 / COUNT) * i;
    const rad    = angle * Math.PI / 180;
    const dist   = 48 + Math.random() * 28;
    const dx     = Math.cos(rad) * dist;
    const dy     = Math.sin(rad) * dist;
    const dot    = document.createElement('div');
    dot.className = 'ps-burst-dot';
    dot.style.setProperty('--a',  angle + 'deg');
    dot.style.setProperty('--dx', dx + 'px');
    dot.style.setProperty('--dy', dy + 'px');
    dot.style.background = COLORS[i % COLORS.length];
    dot.style.animationDelay = (Math.random() * 0.08) + 's';
    container.appendChild(dot);
  }
}

async function onBuyPower(powerAmount) {
  try {
    const res = await apiPost('/buy-power', { power_amount: powerAmount });
    if (!res.ok) {
      showToast(res.error || t('error_generating_payment'), 'error');
      return;
    }
    // Derive package display from the server's authoritative ton_cost + the bonus tier.
    const tonCost    = res.ton_cost || powerAmount * TON_PER_POWER;
    const bonus      = shopBonusForTon(tonCost);
    const totalPower = Math.floor(powerAmount * (1 + bonus));
    const bonusPower = totalPower - powerAmount;
    const roiTarget = shopRoiTarget();
    const finalReturn = tonCost * (1 + bonus) * roiTarget;
    const lifetimeHours = state.user?.power_lifetime_hours || 0;
    const totalHashes = finalReturn > 0 ? (finalReturn / HASH_TO_TON) : (DAILY_HASHES_PER_1K * (totalPower / 1000));
    
    const pkg = { 
      label: totalPower.toLocaleString(), 
      ton: +tonCost.toFixed(3),
      power: totalPower,
      bonusPower: bonusPower,
      finalReturn: finalReturn,
      totalHashes: totalHashes,
      lifetimeHours: lifetimeHours
    };
    openPayModal(pkg, res);
  } catch {
    showToast(t('connection_error'), 'error');
  }
}

// Bonus fraction for a TON amount — mirrors bonusForTon() in miningConfig.ts.
function shopBonusForTon(ton) {
  const t = Number(ton) || 0;
  let bonus = 0;
  for (const tier of SHOP_TIERS) {
    if (t >= tier.ton * 0.98) bonus = tier.bonus;
  }
  return bonus;
}

// ---- TASKS PAGE ----
async function loadTasks() {
  const container = document.getElementById('tasks-list');
  if (!container) return;
  container.innerHTML = '<div style="color:var(--t3);text-align:center;padding:20px">' + t('loading') + '</div>';

  try {
    const res = await fetch(API_BASE + '/tasks?initData=' + encodeURIComponent(initData));
    const data = await res.json();
    if (!data.ok) { container.innerHTML = '<div style="color:var(--red);padding:20px">' + t('error_loading_tasks') + '</div>'; return; }

    state.tasks = data.tasks || [];
    state.taskReferralCount = data.referral_count || 0;
    state.taskChannel = data.task_channel || null;
    state.slotOnCooldown = data.slot_on_cooldown || false;
    state.slotNextSpinAt = data.slot_next_spin_at || null;

    const el = document.getElementById('tasks-referral-count');
    if (el) el.textContent = state.taskReferralCount;

    renderTasks();
  } catch {
    container.innerHTML = '<div style="color:var(--red);padding:20px">' + t('connection_error') + '</div>';
  }
}

// Tier color palette for referral cards (cycled by index) ──────────
const TASK_TIER_COLORS = ['g', 'o', 'v', 'y'];

// Abbreviate POWER: 950 → "950", 1500 → "1.5K", 12000 → "12K", 10_000_000 → "10M", 2_500_000_000 → "2.5B"
function fmtPower(n) {
  const v = Math.abs(Number(n) || 0);
  const units = [
    { t: 1e12, s: 'T' },
    { t: 1e9,  s: 'B' },
    { t: 1e6,  s: 'M' },
    { t: 1e3,  s: 'K' },
  ];
  for (const u of units) {
    if (v >= u.t) {
      const scaled = v / u.t;
      // 1 decimal only when it adds info, e.g. 1.5K but 12K (not 12.0K)
      const str = scaled >= 100 || scaled % 1 === 0 ? Math.round(scaled).toString() : scaled.toFixed(1);
      return str + u.s;
    }
  }
  // < 1000 — show as integer (no .00 noise for whole numbers)
  return (v % 1 === 0 ? v : v.toFixed(2)).toLocaleString();
}

function renderTasks() {
  const legacy     = document.getElementById('tasks-list');
  const inviteWrap = document.getElementById('tasks-invite-list');
  const dailyWrap  = document.getElementById('tasks-daily-list');
  const inviteSec  = document.getElementById('tk-invite-section');
  const dailySec   = document.getElementById('tk-daily-section');
  if (legacy) legacy.innerHTML = '';
  if (!inviteWrap || !dailyWrap) return;
  inviteWrap.innerHTML = '';
  dailyWrap.innerHTML  = '';

  if (!state.tasks.length) {
    if (legacy) legacy.innerHTML = '<div style="color:var(--t3);text-align:center;padding:20px">' + t('no_tasks_available') + '</div>';
    if (inviteSec) inviteSec.style.display = 'none';
    if (dailySec)  dailySec.style.display  = 'none';
    setTaskStats(0, 0);
    return;
  }

  // ── Stat cards: Total Earned (claimed pips) + Available (eligible, unclaimed) ──
  let earned = 0, available = 0;
  state.tasks.forEach(tk => {
    const pips = Number(tk.pips) || 0;
    if (tk.completed) earned += pips;
    else if (tk.eligible) available += pips;
  });
  setTaskStats(earned, available);

  // ── Split tasks into invite (referral tiers) and daily/other ──
  const referralTasks = [];
  const otherTasks    = [];
  state.tasks.forEach(tk => {
    if (tk.type === 'visit_url') return;                       // hidden
    if (tk.type === 'channel' && !tk.channel_url) return;      // hidden until configured
    if (tk.type === 'referral') referralTasks.push(tk);
    else if (tk.type !== 'ad' && tk.type !== 'ad2') otherTasks.push(tk);
  });
  // referral tiers ascending by required count
  referralTasks.sort((a, b) => (a.required || 0) - (b.required || 0));
  // other tasks: pending before completed
  otherTasks.sort((a, b) => (a.completed ? 1 : 0) - (b.completed ? 1 : 0));

  // ════════════════ INVITE SECTION ════════════════
  if (referralTasks.length) {
    if (inviteSec) inviteSec.style.display = '';
    const inviteDone = referralTasks.filter(tk => tk.completed).length;
    const dEl = document.getElementById('tk-invite-done');
    const nEl = document.getElementById('tk-invite-total');
    if (dEl) dEl.textContent = inviteDone;
    if (nEl) nEl.textContent = referralTasks.length;

    referralTasks.forEach((task, idx) => {
      inviteWrap.appendChild(buildReferralCard(task, TASK_TIER_COLORS[idx % TASK_TIER_COLORS.length]));
    });
  } else if (inviteSec) {
    inviteSec.style.display = 'none';
  }

  // ════════════════ DAILY / OTHER SECTION ════════════════
  if (dailySec) dailySec.style.display = '';
  // Games first, then partner/channel tasks
  dailyWrap.appendChild(buildSlotCard());
  const adTask  = state.tasks.find(tk => tk.type === 'ad');
  const ad2Task = state.tasks.find(tk => tk.type === 'ad2');
  if (adTask)  dailyWrap.appendChild(buildAdCard(adTask));
  if (ad2Task) dailyWrap.appendChild(buildAd2Card(ad2Task));
  otherTasks.forEach(task => dailyWrap.appendChild(buildGenericTaskCard(task)));

  if (window.lucide) lucide.createIcons();

  // ── Wire up buttons across both lists ──
  [inviteWrap, dailyWrap].forEach(scope => {
    scope.querySelectorAll('.task-btn.claim[data-task-id]').forEach(btn => {
      btn.addEventListener('click', () => onClaimTask(btn.dataset.taskId));
    });
    scope.querySelectorAll('.task-btn.join[data-channel]').forEach(btn => {
      btn.addEventListener('click', () => {
        const url = `https://t.me/${btn.dataset.channel}`;
        if (tg?.openTelegramLink) tg.openTelegramLink(url);
        else window.open(url, '_blank');
      });
    });
    scope.querySelectorAll('.task-btn.join[data-ext-ref]').forEach(btn => {
      btn.addEventListener('click', () => {
        const botUsername = btn.dataset.bot;
        const botStart    = btn.dataset.botStart;
        const isStartapp  = btn.dataset.startapp === '1';
        if (!botUsername) return;
        const url = isStartapp
          ? `https://t.me/${botUsername}/app${botStart ? `?startapp=${botStart}` : ''}`
          : (botStart ? `https://t.me/${botUsername}?start=${botStart}` : `https://t.me/${botUsername}`);
        if (tg?.openTelegramLink) tg.openTelegramLink(url);
        else window.open(url, '_blank');
      });
    });
    scope.querySelectorAll('.task-btn.join[data-miniapp-url]').forEach(btn => {
      btn.addEventListener('click', () => {
        const url = btn.dataset.miniappUrl;
        if (!url) return;
        if (tg?.openTelegramLink) tg.openTelegramLink(url);
        else window.open(url, '_blank');
      });
    });
    scope.querySelectorAll('.task-btn.join[data-visit-url]').forEach(btn => {
      btn.addEventListener('click', () => {
        const url = btn.dataset.visitUrl;
        if (!url) return;
        if (tg?.openLink) tg.openLink(url);
        else window.open(url, '_blank');
      });
    });
  });

  attachAdHandlers(dailyWrap);
}

function setTaskStats(earned, available) {
  const eEl = document.getElementById('tk-stat-earned');
  const aEl = document.getElementById('tk-stat-available');
  if (eEl) eEl.textContent = fmtPower(earned);
  if (aEl) aEl.textContent = fmtPower(available);
}

// ── Referral tier card (Invite N friends) ──────────────────────────
function buildReferralCard(task, tone) {
  const card = document.createElement('div');
  const isEligible = task.eligible && !task.completed;
  card.className = `tk-invite-card tone-${tone}` + (task.completed ? ' is-done' : '') + (isEligible ? ' is-eligible' : '');
  card.dataset.taskId = task.id;

  const title = (t('task_' + task.id) !== 'task_' + task.id) ? t('task_' + task.id) : (task.labelEn || `Invite ${task.required}`);
  const reward = fmtPower(task.pips);
  const cur    = Math.min(state.taskReferralCount, task.required || 0);
  const barPct = task.required ? Math.round((cur / task.required) * 100) : 0;
  const subText = t('invite_friends_sub'); // generic descriptor under title

  let chipHtml;
  if (task.completed) {
    chipHtml = `<div class="tk-invite-claimed"><i data-lucide="check"></i></div>`;
  } else if (isEligible) {
    chipHtml = `<button class="task-btn claim tk-invite-claim" data-task-id="${task.id}">${t('claim')}</button>`;
  } else {
    chipHtml = `<div class="tk-invite-reward">
        <span class="tk-invite-reward-num">+${reward}</span>
        <span class="tk-invite-reward-unit" data-i18n="power_unit">POWER</span>
      </div>`;
  }

  card.innerHTML = `
    <div class="tk-invite-tile">
      <i data-lucide="user-plus"></i>
      <span class="tk-invite-tile-num">${task.required}</span>
    </div>
    <div class="tk-invite-main">
      <div class="tk-invite-title">${title}</div>
      <div class="tk-invite-desc">${subText}</div>
      <div class="tk-invite-progress">
        <div class="tk-invite-bar"><div class="tk-invite-bar-fill" style="width:${Math.max(barPct, 3)}%"></div></div>
        <div class="tk-invite-count">${cur} / ${task.required}</div>
      </div>
    </div>
    <div class="tk-invite-action">${chipHtml}</div>
  `;
  return card;
}

// ── Generic daily/partner task card (channel, miniapp, external_referral) ──
function buildGenericTaskCard(task) {
  const card = document.createElement('div');
  const isEligible = task.eligible && !task.completed;
  card.className = 'task-card' + (task.completed ? ' completed' : '') + (isEligible ? ' eligible' : '');
  card.dataset.taskId = task.id;

  const iconName  = task.type === 'miniapp' ? 'layout-grid' : task.type === 'channel' ? 'send' : task.type === 'external_referral' ? 'external-link' : 'user-plus';
  const iconClass = task.type === 'channel' ? 'icon-channel' : 'icon-referral';
  const title     = task.type === 'miniapp'
    ? t('task_tone_ai_miniapp')
    : (t('task_' + task.id) !== 'task_' + task.id ? t('task_' + task.id) : task.labelEn);
  const rewardLabel = fmtPower(task.pips) + ' POWER';

  let actionHtml = '';
  if (task.completed) {
    actionHtml = `<div class="task-done-icon"><i data-lucide="check"></i></div>`;
  } else if (task.type === 'channel') {
    actionHtml = task.channel_url
      ? `<div class="task-btn-stack">
            <button class="task-btn join" data-channel="${task.channel_url.replace('@','')}">${t('join')}</button>
            <button class="task-btn claim" data-task-id="${task.id}">${t('claim')}</button>
          </div>`
      : `<button class="task-btn locked" disabled>N/A</button>`;
  } else if (task.type === 'miniapp') {
    actionHtml = `<div class="task-btn-stack">
        <button class="task-btn join" data-miniapp-url="${task.miniapp_url || ''}">${t('open_miniapp_btn')}</button>
        <button class="task-btn claim" data-task-id="${task.id}">${t('claim')}</button>
      </div>`;
  } else if (task.type === 'external_referral') {
    const openBtn = task.miniapp_url
      ? `<button class="task-btn join" data-miniapp-url="${task.miniapp_url}">${t('open_miniapp_btn')}</button>`
      : `<button class="task-btn join" data-ext-ref data-bot="${task.bot_username || ''}" data-bot-start="${task.bot_start || ''}" data-startapp="${task.startapp ? '1' : ''}">${t('open_miniapp_btn')}</button>`;
    actionHtml = `<div class="task-btn-stack">
        ${openBtn}
        <button class="task-btn claim" data-task-id="${task.id}">${t('claim')}</button>
      </div>`;
  } else if (isEligible) {
    actionHtml = `<button class="task-btn claim" data-task-id="${task.id}">${t('claim')}</button>`;
  } else {
    const needed = (task.required || 0) - state.taskReferralCount;
    actionHtml = `<button class="task-btn locked" disabled>${needed} ${t('left')}</button>`;
  }

  card.innerHTML = `
    <div class="task-icon ${iconClass}"><i data-lucide="${iconName}"></i></div>
    <div class="task-body">
      <div class="task-title">${title}</div>
      <div class="task-reward"><i data-lucide="zap"></i> +${rewardLabel}</div>
    </div>
    <div class="task-action">${actionHtml}</div>
  `;
  return card;
}

// ── Ad/Dice task card ─────────────────────────────────────────────────────────
function buildAdCard(task) {
  const card = document.createElement('div');
  const isCooldown = task.ad_claimed_today;
  card.className = 'task-card type-sponsor' + (isCooldown ? ' sponsor-cooldown' : '');
  card.dataset.taskId = task.id;

  let actionHtml = '';
  if (isCooldown && task.next_claim_at) {
    const msLeft = task.next_claim_at - Date.now();
    const hLeft  = Math.floor(msLeft / 3600000);
    const mLeft  = Math.floor((msLeft % 3600000) / 60000);
    actionHtml = `<button class="task-btn sponsor-cooldown-btn" disabled>${t('watch_ad_cooldown', { h: hLeft, m: mLeft })}</button>`;
  } else {
    actionHtml = `<button class="task-btn roll" id="sponsor-roll-btn">${t('watch_ad_btn')}</button>`;
  }

  card.innerHTML = `
    <div class="task-icon icon-sponsor"><i data-lucide="dices"></i></div>
    <div class="task-body">
      <div class="task-title">${t('watch_ad_label')}</div>
      <div class="task-reward"><i data-lucide="zap"></i> 5–50 POWER</div>
      <div style="font-size:11px;color:var(--t3);margin-top:2px">${t('watch_ad_sub')}</div>
    </div>
    <div class="task-action">${actionHtml}</div>
  `;

  // Attach click directly on the button node (not via delegation)
  if (!task.ad_claimed_today) {
    const btn = card.querySelector('.task-btn.roll');
    if (btn) {
      btn.onclick = (e) => {
        openDiceModal();
      };
    }
  }

  return card;
}

function attachAdHandlers(_container) {
  // No-op: handler is now attached directly in buildAdCard
}

// ── Ad2/Dice2 task card (6h cooldown, zone 11076114) ─────────────────────────
function buildAd2Card(task) {
  const card = document.createElement('div');
  const isCooldown = task.ad_claimed_today;
  card.className = 'task-card type-sponsor2' + (isCooldown ? ' sponsor-cooldown' : '');
  card.dataset.taskId = task.id;

  let actionHtml = '';
  if (isCooldown && task.next_claim_at) {
    const msLeft = task.next_claim_at - Date.now();
    const hLeft  = Math.floor(msLeft / 3600000);
    const mLeft  = Math.floor((msLeft % 3600000) / 60000);
    actionHtml = `<button class="task-btn sponsor-cooldown-btn" disabled>${t('watch_ad_cooldown', { h: hLeft, m: mLeft })}</button>`;
  } else {
    actionHtml = `<button class="task-btn roll roll2" id="sponsor2-roll-btn">${t('watch_ad_btn')}</button>`;
  }

  card.innerHTML = `
    <div class="task-icon icon-sponsor2"><i data-lucide="dice-6"></i></div>
    <div class="task-body">
      <div class="task-title">${t('watch_ad2_label') || 'Watch & Earn (6h)'}</div>
      <div class="task-reward"><i data-lucide="zap"></i> 1–12 POWER</div>
      <div style="font-size:11px;color:var(--t3);margin-top:2px">${t('watch_ad2_sub') || 'Every 6 hours'}</div>
    </div>
    <div class="task-action">${actionHtml}</div>
  `;

  if (!task.ad_claimed_today) {
    const btn = card.querySelector('.task-btn.roll2');
    if (btn) btn.onclick = () => openDice2Modal();
  }

  return card;
}

// ── Fruit Slot Machine ────────────────────────────────────────────────────────
function buildSlotCard() {
  const card = document.createElement('div');
  const isCooldown = state.slotOnCooldown;
  card.className = 'task-card type-slot' + (isCooldown ? ' slot-cooldown' : '');
  card.id = 'slot-task-card';

  let actionHtml = '';
  if (isCooldown && state.slotNextSpinAt) {
    const msLeft = state.slotNextSpinAt - Date.now();
    const hLeft  = Math.floor(msLeft / 3600000);
    const mLeft  = Math.floor((msLeft % 3600000) / 60000);
    actionHtml = `<button class="task-btn sponsor-cooldown-btn" disabled>${t('slot_cooldown', { h: hLeft, m: mLeft })}</button>`;
  } else {
    actionHtml = `<button class="task-btn roll" id="slot-spin-btn">${t('slot_spin_btn')}</button>`;
  }

  card.innerHTML = `
    <div class="task-icon icon-slot"><i data-lucide="cherry"></i></div>
    <div class="task-body">
      <div class="task-title">${t('slot_label')}</div>
      <div class="task-reward"><i data-lucide="zap"></i> ${t('slot_reward_range')}</div>
      <div style="font-size:11px;color:var(--t3);margin-top:2px">${t('slot_sub')}</div>
    </div>
    <div class="task-action">${actionHtml}</div>
  `;

  if (!isCooldown) {
    const btn = card.querySelector('#slot-spin-btn');
    if (btn) btn.onclick = () => openSlotModal();
  }
  return card;
}

let _slotSpinDone = false;
let _slotCountdownTimer = null;

// ── Slot helpers ──────────────────────────────────────────────────────────────
function _slotModalOpen(id) {
  const m = document.getElementById(id);
  if (!m) return null;
  m.classList.add('open'); m.style.display = 'flex';
  return m;
}
function _slotModalClose(id) {
  const m = document.getElementById(id);
  if (!m) return;
  m.classList.remove('open'); m.style.display = 'none';
}

// ── Open play modal ───────────────────────────────────────────────────────────
function openSlotModal() {
  _slotSpinDone = false;

  // Reset reels
  ['slot-r1','slot-r2','slot-r3'].forEach(id => {
    const box = document.getElementById(id);
    if (!box) return;
    (box.querySelector('span') || box).textContent = '🎰';
    box.classList.remove('spinning','landed');
  });

  const spinBtn = document.getElementById('slot-spin-btn-modal');

  // Step 1 button: "Watch Ad & Spin 🎰" — shows ad, then enables Spin
  function setWatchAdBtn() {
    if (!spinBtn) return;
    spinBtn.textContent = t('slot_watch_ad_btn');
    spinBtn.disabled = false;
    spinBtn.onclick = () => {
      spinBtn.disabled = true;
      spinBtn.textContent = t('slot_watching_ad');

      function onAdDone() {
        // Step 2: ad done → enable Spin button
        spinBtn.textContent = t('slot_spin_btn');
        spinBtn.disabled = false;
        spinBtn.onclick = () => doSlotSpin();
      }

      const adAvailable = typeof show_11160788 === 'function';
      if (!adAvailable) { onAdDone(); return; }

      // Interstitial capped at MAX_SESSION_INTERSTITIALS per session to protect CPM.
      // Use interstitial rarely (20% chance, max 1 per session); otherwise use pop.
      const useInterstitial = _sessionInterstitialShown < MAX_SESSION_INTERSTITIALS
                              && Math.random() < INTERSTITIAL_CHANCE;
      if (useInterstitial) _sessionInterstitialShown++;

      const fallback = setTimeout(onAdDone, 12000);
      try {
        const adPromise = useInterstitial
          ? show_11160788({ type: 'inApp', inAppSettings: { frequency: 2, capping: 0.1, interval: 60, timeout: 30, everyPage: false } })
          : show_11160788('pop');
        adPromise.then(() => { clearTimeout(fallback); onAdDone(); })
                 .catch(() => { clearTimeout(fallback); onAdDone(); });
      } catch (_) { clearTimeout(fallback); onAdDone(); }
    };
  }

  setWatchAdBtn();

  const modal = _slotModalOpen('slot-modal');
  if (!modal) return;

  const closeBtn = document.getElementById('slot-close');
  if (closeBtn) closeBtn.onclick = () => _slotModalClose('slot-modal');
  if (window.lucide) lucide.createIcons({ nodes: [modal] });
}

// ── Spin logic ────────────────────────────────────────────────────────────────
async function doSlotSpin() {
  if (_slotSpinDone) return;
  _slotSpinDone = true;

  const spinBtn = document.getElementById('slot-spin-btn-modal');
  const reelIds = ['slot-r1','slot-r2','slot-r3'];
  const FRUITS  = ['🍒','🍋','🍊','🍇','🍓','⭐'];

  if (spinBtn) { spinBtn.disabled = true; spinBtn.textContent = t('slot_spinning'); }

  reelIds.forEach(id => {
    const box = document.getElementById(id);
    if (box) { box.classList.add('spinning'); box.classList.remove('landed'); }
  });

  const fakeTimer = setInterval(() => {
    reelIds.forEach(id => {
      const box = document.getElementById(id);
      if (!box) return;
      (box.querySelector('span') || box).textContent = FRUITS[Math.floor(Math.random() * FRUITS.length)];
    });
  }, 80);

  const res = await apiPost('/tasks/slot-spin');
  await new Promise(r => setTimeout(r, 520));
  clearInterval(fakeTimer);

  if (res.ok) {
    state.slotOnCooldown = true;
    state.slotNextSpinAt = res.next_spin_at;
    if (state.user) state.user.power = res.new_power;

    // Land reels staggered
    await new Promise(resolve => {
      res.reels.forEach((sym, i) => {
        setTimeout(() => {
          const box = document.getElementById(reelIds[i]);
          if (box) {
            (box.querySelector('span') || box).textContent = sym;
            box.classList.remove('spinning');
            box.classList.add('landed');
          }
          if (i === 2) resolve();
        }, i * 230);
      });
    });

    await new Promise(r => setTimeout(r, 350));

    // Close play modal → open result modal
    _slotModalClose('slot-modal');
    openSlotResultModal(res);
    renderTasks();
    renderMine();

  } else if (res.error === 'cooldown') {
    clearInterval(fakeTimer);
    reelIds.forEach(id => { const b = document.getElementById(id); if (b) b.classList.remove('spinning'); });
    state.slotOnCooldown = true;
    state.slotNextSpinAt = res.next_spin_at;
    _slotModalClose('slot-modal');
    renderTasks();

  } else if (res.error === 'global_cooldown') {
    clearInterval(fakeTimer);
    reelIds.forEach(id => { const b = document.getElementById(id); if (b) b.classList.remove('spinning'); });
    _slotModalClose('slot-modal');
    showGlobalCooldownToast(res.next_claim_at);
    renderTasks();

  } else {
    clearInterval(fakeTimer);
    reelIds.forEach(id => {
      const b = document.getElementById(id);
      if (b) { (b.querySelector('span') || b).textContent = '❓'; b.classList.remove('spinning'); }
    });
    _slotSpinDone = false;
    if (spinBtn) { spinBtn.disabled = false; spinBtn.textContent = t('slot_watch_ad_btn'); }
    showToast(res.error || t('error'), 'error');
  }
}

// ── Result modal ──────────────────────────────────────────────────────────────
const SLOT_WIN_MSGS  = ['slot_msg_win1','slot_msg_win2','slot_msg_win3'];
const SLOT_NEAR_MSGS = ['slot_msg_near1','slot_msg_near2','slot_msg_near3'];
const SLOT_LOSE_MSGS = ['slot_msg_lose1','slot_msg_lose2','slot_msg_lose3'];

function openSlotResultModal(res) {
  // Fill result reels
  if (res.reels) {
    ['slotres-r1','slotres-r2','slotres-r3'].forEach((id, i) => {
      const el = document.getElementById(id);
      if (el) el.textContent = res.reels[i] || '🎰';
    });
  }

  const badge   = document.getElementById('slot-result-badge');
  const powerEl = document.getElementById('slot-result-power');
  const msgEl   = document.getElementById('slot-result-msg');
  const timerEl = document.getElementById('slot-result-timer');

  // Determine match type for message selection
  const r = res.reels || [];
  const isWin     = res.pips_awarded > 0;
  const isNearMiss = !isWin && r.length === 3 && (r[0]===r[1] || r[1]===r[2] || r[0]===r[2]);

  const msgKeys = isWin ? SLOT_WIN_MSGS : isNearMiss ? SLOT_NEAR_MSGS : SLOT_LOSE_MSGS;
  const msgKey  = msgKeys[Math.floor(Math.random() * msgKeys.length)];

  if (badge) {
    badge.className = 'slot-result-badge ' + (isWin ? 'win' : 'lose');
    badge.textContent = isWin ? t('slot_win') : isNearMiss ? t('slot_near') : t('slot_no_win');
  }
  if (powerEl) {
    if (isWin) {
      powerEl.textContent = '+' + res.pips_awarded + ' POWER';
      setTimeout(() => powerEl.classList.add('show'), 50);
    } else {
      powerEl.textContent = '';
      powerEl.classList.remove('show');
    }
  }
  if (msgEl) msgEl.textContent = t(msgKey);

  // Live countdown
  if (_slotCountdownTimer) clearInterval(_slotCountdownTimer);
  function updateTimer() {
    const ms = Math.max(0, (state.slotNextSpinAt || 0) - Date.now());
    const m  = Math.floor(ms / 60000);
    const s  = Math.floor((ms % 60000) / 1000);
    if (timerEl) timerEl.textContent = m + ':' + String(s).padStart(2,'0');
    if (ms <= 0) {
      clearInterval(_slotCountdownTimer);
      _slotCountdownTimer = null;
      state.slotOnCooldown = false;
      renderTasks();
    }
  }
  updateTimer();
  _slotCountdownTimer = setInterval(updateTimer, 1000);

  _slotModalOpen('slot-result-modal');

  const closeBtn = document.getElementById('slot-result-close');
  if (closeBtn) closeBtn.onclick = () => {
    _slotModalClose('slot-result-modal');
    if (_slotCountdownTimer) { clearInterval(_slotCountdownTimer); _slotCountdownTimer = null; }
  };
}

// ── Ad / Dice Modal ────────────────────────────────────────────────────────────
// ── Ad / Dice Modal ────────────────────────────────────────────────────────────
// ── Ad / Dice Modal ────────────────────────────────────────────────────────────
const AD_URL       = 'https://omg10.com/4/11160802';
const AD_URL2      = 'https://omg10.com/4/11160852';
const AD_WAIT_SECS = 10;

let _adClickTime = 0;
let _adCheckTimer = null;
let _adToastShown = false;

function openDiceModal() {
  try {
    const modal = document.getElementById('dice-modal');
    if (!modal) {
      if (typeof showDbgToast === 'function') showDbgToast('Missing dice-modal!');
      return;
    }

    const titleEl    = modal.querySelector('.dice-title');
    const subEl      = modal.querySelector('.dice-sub');
    const rollBtn    = document.getElementById('dice-roll-btn');
    const resultText = document.getElementById('dice-result-text');
    const rewardText = document.getElementById('dice-reward-text');
    const diceEl     = document.getElementById('dice');

    _adToastShown = false;
    if (resultText) resultText.textContent = '';
    if (rewardText) { rewardText.textContent = ''; rewardText.classList.remove('show'); }
    if (diceEl)     { diceEl.className = 'dice'; if (typeof showDiceFace === 'function') showDiceFace(diceEl, 1); }

    // Initial State: Prompt user to watch AD
    if (titleEl) titleEl.textContent = typeof t === 'function' ? t('dice_modal_title') || 'Roll for POWER' : 'Roll for POWER';
    if (subEl)   subEl.textContent   = typeof t === 'function' ? t('dice_modal_sub') || 'Watch a quick ad, then roll the dice!' : 'Watch a quick ad, then roll the dice!';

    if (rollBtn) {
      rollBtn.textContent = typeof t === 'function' ? t('watch_sponsor_ad_btn') || 'Watch Sponsor Ad' : 'Watch Sponsor Ad';
      rollBtn.disabled = false;
      rollBtn.onclick = () => {
        try {
          if (typeof tg !== 'undefined' && tg.openLink) {
            tg.openLink(AD_URL);
          } else {
            window.open(AD_URL, '_blank');
          }

          _adClickTime = Date.now();

          if (!_adToastShown) {
            setTimeout(() => {
              if (typeof showToast === 'function') {
                showToast(t('watch_ad_toast'));
                _adToastShown = true;
              }
            }, 4000);
          }

          clearInterval(_adCheckTimer);
          _adCheckTimer = setTimeout(() => {
            if (titleEl) titleEl.textContent = typeof t === 'function' ? t('ad_ready_title') || 'Ad Complete!' : 'Ad Complete!';
            if (subEl)   subEl.textContent   = typeof t === 'function' ? t('ad_ready_sub') || 'You can now roll the dice.' : 'You can now roll the dice.';

            rollBtn.classList.remove('waiting');
            rollBtn.textContent = typeof t === 'function' ? t('dice_roll_btn') || 'Roll!' : 'Roll!';
            rollBtn.disabled = false;
            if (typeof onRollDice === 'function') rollBtn.onclick = onRollDice;
          }, AD_WAIT_SECS * 1000);
        } catch (innerErr) {
          if (typeof showDbgToast === 'function') showDbgToast('Btn Error: ' + innerErr.message);
        }
      };
    }

    modal.style.display = 'flex';
    modal.classList.add('open');
    modal.style.opacity = '1';
    modal.style.pointerEvents = 'all';

    const closeBtn = document.getElementById('dice-close');
    if (closeBtn) closeBtn.onclick = () => { 
      modal.style.display = 'none';
      modal.classList.remove('open');
      clearTimeout(_adCheckTimer);
    };

  } catch (err) {
    if (typeof showDbgToast === 'function') showDbgToast('Modal Error: ' + err.message);
  }
}

function showDiceFace(diceEl, face) {
  diceEl.querySelectorAll('.dice-face').forEach(f => f.classList.remove('active'));
  const faceEl = diceEl.querySelector(`.face-${face}`);
  if (faceEl) faceEl.classList.add('active');
}

async function onRollDice() {
  const rollBtn    = document.getElementById('dice-roll-btn');
  const resultText = document.getElementById('dice-result-text');
  const rewardText = document.getElementById('dice-reward-text');
  const diceEl     = document.getElementById('dice');

  rollBtn.disabled = true;
  rollBtn.textContent = t('dice_rolling');
  rewardText.classList.remove('show');

  // Animate dice shake while API call happens
  diceEl.classList.add('rolling');

  // Fast fake-roll animation during shake
  let fakeFrame = 0;
  const fakeInterval = setInterval(() => {
    showDiceFace(diceEl, (fakeFrame % 6) + 1);
    fakeFrame++;
  }, 80);

  const res = await apiPost('/tasks/ad-roll');

  clearInterval(fakeInterval);

  setTimeout(() => {
    diceEl.classList.remove('rolling');

    if (res.ok) {
      showDiceFace(diceEl, res.face);
      resultText.textContent = t('dice_result', { face: res.face });
      rewardText.textContent  = t('dice_earned', { pips: res.pips_awarded });
      rewardText.classList.add('show');

      rollBtn.textContent = '✓ Done';

      // Update state
      if (state.user) state.user.power = res.new_power;
      const adTask = state.tasks.find(tk => tk.type === 'ad');
      if (adTask) { adTask.ad_claimed_today = true; adTask.next_claim_at = res.next_claim_at; }

      // Close modal after 2.5s and refresh
      setTimeout(() => {
        document.getElementById('dice-modal').style.display = 'none';
        renderTasks();
        renderMine();
      }, 2500);

    } else if (res.error === 'cooldown') {
      document.getElementById('dice-modal').style.display = 'none';
      loadTasks();
    } else if (res.error === 'global_cooldown') {
      document.getElementById('dice-modal').style.display = 'none';
      document.getElementById('dice-modal').classList.remove('open');
      showGlobalCooldownToast(res.next_claim_at);
      loadTasks();
    } else {
      rollBtn.disabled = false;
      rollBtn.textContent = t('dice_roll_btn');
      showToast(res.error || t('error'), 'error');
    }
  }, 750); // wait for shake animation to finish
}

// ── Dice2 Modal (6h, zone 11076114) ──────────────────────────────────────────
let _ad2ClickTime = 0;
let _ad2CheckTimer = null;
let _ad2ToastShown = false;

function openDice2Modal() {
  try {
    const modal = document.getElementById('dice2-modal');
    if (!modal) return;

    const titleEl    = modal.querySelector('.dice-title');
    const subEl      = modal.querySelector('.dice-sub');
    const rollBtn    = document.getElementById('dice2-roll-btn');
    const resultText = document.getElementById('dice2-result-text');
    const rewardText = document.getElementById('dice2-reward-text');
    const diceEl     = document.getElementById('dice2');

    _ad2ToastShown = false;
    if (resultText) resultText.textContent = '';
    if (rewardText) { rewardText.textContent = ''; rewardText.classList.remove('show'); }
    if (diceEl)     { diceEl.className = 'dice'; if (typeof showDiceFace === 'function') showDiceFace(diceEl, 1); }

    if (titleEl) titleEl.textContent = t('dice_modal_title') || 'Roll for POWER';
    if (subEl)   subEl.textContent   = t('dice_modal_sub') || 'Watch a quick ad, then roll the dice!';

    if (rollBtn) {
      rollBtn.textContent = t('watch_sponsor_ad_btn') || 'Watch Sponsor Ad';
      rollBtn.disabled = false;
      rollBtn.onclick = () => {
        try {
          if (typeof tg !== 'undefined' && tg.openLink) {
            tg.openLink(AD_URL2);
          } else {
            window.open(AD_URL2, '_blank');
          }

          _ad2ClickTime = Date.now();

          rollBtn.disabled = true;
          rollBtn.textContent = t('ad_progress_title') || 'Ad in Progress…';

          if (!_ad2ToastShown) {
            setTimeout(() => {
              if (typeof showToast === 'function') {
                showToast(t('watch_ad_toast'));
                _ad2ToastShown = true;
              }
            }, 4000);
          }

          clearTimeout(_ad2CheckTimer);
          _ad2CheckTimer = setTimeout(() => {
            if (titleEl) titleEl.textContent = t('ad_ready_title') || 'Ad Complete!';
            if (subEl)   subEl.textContent   = t('ad_ready_sub') || 'You can now roll the dice.';
            rollBtn.textContent = t('dice_roll_btn') || 'Roll!';
            rollBtn.disabled = false;
            rollBtn.onclick = onRollDice2;
          }, AD_WAIT_SECS * 1000);
        } catch (innerErr) {
          if (typeof showDbgToast === 'function') showDbgToast('Btn Error: ' + innerErr.message);
        }
      };
    }

    modal.style.display = 'flex';
    modal.classList.add('open');
    modal.style.opacity = '1';
    modal.style.pointerEvents = 'all';

    const closeBtn = document.getElementById('dice2-close');
    if (closeBtn) closeBtn.onclick = () => {
      modal.style.display = 'none';
      modal.classList.remove('open');
      clearTimeout(_ad2CheckTimer);
    };
  } catch (err) {
    if (typeof showDbgToast === 'function') showDbgToast('Dice2 Modal Error: ' + err.message);
  }
}

async function onRollDice2() {
  const rollBtn    = document.getElementById('dice2-roll-btn');
  const resultText = document.getElementById('dice2-result-text');
  const rewardText = document.getElementById('dice2-reward-text');
  const diceEl     = document.getElementById('dice2');

  rollBtn.disabled = true;
  rollBtn.textContent = t('dice_rolling');
  rewardText.classList.remove('show');

  diceEl.classList.add('rolling');

  let fakeFrame = 0;
  const fakeInterval = setInterval(() => {
    showDiceFace(diceEl, (fakeFrame % 6) + 1);
    fakeFrame++;
  }, 80);

  const res = await apiPost('/tasks/ad-roll2');

  clearInterval(fakeInterval);

  setTimeout(() => {
    diceEl.classList.remove('rolling');

    if (res.ok) {
      showDiceFace(diceEl, res.face);
      resultText.textContent = t('dice_result', { face: res.face });
      rewardText.textContent  = t('dice_earned', { pips: res.pips_awarded });
      rewardText.classList.add('show');
      rollBtn.textContent = '✓ Done';

      if (state.user) state.user.power = res.new_power;
      const ad2Task = state.tasks.find(tk => tk.type === 'ad2');
      if (ad2Task) { ad2Task.ad_claimed_today = true; ad2Task.next_claim_at = res.next_claim_at; }

      setTimeout(() => {
        document.getElementById('dice2-modal').style.display = 'none';
        renderTasks();
        renderMine();
      }, 2500);

    } else if (res.error === 'cooldown') {
      document.getElementById('dice2-modal').style.display = 'none';
      loadTasks();
    } else if (res.error === 'global_cooldown') {
      document.getElementById('dice2-modal').style.display = 'none';
      document.getElementById('dice2-modal').classList.remove('open');
      showGlobalCooldownToast(res.next_claim_at);
      loadTasks();
    } else {
      rollBtn.disabled = false;
      rollBtn.textContent = t('dice_roll_btn');
      showToast(res.error || t('error'), 'error');
    }
  }, 750);
}

async function onClaimTask(taskId) {
  const task = state.tasks.find(tk => tk.id === taskId);

  // For external_referral tasks, ask for the referral link first
  let referralLink = undefined;
  if (task && task.type === 'miniapp') {
    // miniapp tasks require no verification link — claim directly
  } else if (task && task.type === 'external_referral') {
    const botUsername = task.bot_username || '';
    referralLink = await showInputModal({
      title: t('itrade_modal_title'),
      msg:   t('itrade_modal_msg'),
      placeholder: t('itrade_modal_placeholder'),
    });
    if (!referralLink) return;
  }

  // Animate the card before the API call resolves
  const cardEl = document.querySelector(`.task-card[data-task-id="${taskId}"], .tk-invite-card[data-task-id="${taskId}"]`);
  if (cardEl) cardEl.classList.add('claiming');

  try {
    const payload = { task_id: taskId };
    if (referralLink) payload.referral_link = referralLink;
    const res = await apiPost('/tasks/claim', payload);
    if (res.ok) {
      if (task) task.completed = true;
      const rewardLabel = res.pips_awarded >= 1000 ? (res.pips_awarded / 1000) + 'K' : res.pips_awarded;
      if (state.user) state.user.power = res.new_power;
      setTimeout(() => { renderTasks(); renderMine(); }, 300);
      showAlert({
        type:  'success',
        icon:  '🏆',
        power: `+${rewardLabel} POWER`,
        badge: t('task_claim_title'),
        msg:   t('task_claim_sub'),
      });
    } else {
      if (cardEl) cardEl.classList.remove('claiming');
      if (res.error === 'not a member') {
        showAlert({ type: 'error', badge: t('join_channel_first'), msg: t('join_channel_sub') });
      } else if (res.error === 'invalid referral link format') {
        showAlert({ type: 'error', badge: t('itrade_error_badge_invalid_format'), msg: t('itrade_error_invalid_format') });
      } else if (res.error === 'referral link is not for the correct bot') {
        showAlert({ type: 'error', badge: t('itrade_error_badge_wrong_bot'), msg: t('itrade_error_wrong_bot') });
      } else if (res.error === 'not enough referrals') {
        showAlert({ type: 'error', badge: t('need_referrals', { required: res.required }), msg: t('need_referrals_sub') });
      } else if (res.error === 'cooldown') {
        const secsLeft = Math.ceil((res.next_claim_at - Date.now()) / 1000);
        showAlert({ type: 'info', icon: '⏱️', badge: t('task_cooldown_title'), msg: t('task_cooldown_sub', { secs: secsLeft }) });
      } else if (res.error === 'global_cooldown') {
        showGlobalCooldownToast(res.next_claim_at);
      } else {
        showAlert({ type: 'error', msg: res.error || t('error') });
      }
    }
  } catch {
    if (cardEl) cardEl.classList.remove('claiming');
    showAlert({ type: 'error', msg: t('connection_error') });
  }
}

// ---- LEADERBOARD PAGE ----

/** Returns the avatar background color based on a name string */
function lbAvatarColor(name) {
  const colors = [
    '#4F8EF7','#E05252','#52B788','#F7A84F',
    '#9B5DE5','#F15BB5','#00BBF9','#F7C59F'
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

/** Returns initials (up to 2 chars) from first + last name */
function lbInitials(first, last) {
  const f = (first || '').trim();
  const l = (last  || '').trim();
  if (f && l) return (f[0] + l[0]).toUpperCase();
  if (f)      return f.slice(0, 2).toUpperCase();
  return '??';
}

/** Checks if an entry belongs to the current logged-in user */
function lbIsSelf(entry) {
  if (!state.user) return false;
  if (entry.username && state.user.username && entry.username === state.user.username) return true;
  if (entry.telegram_id && state.user.telegram_id && entry.telegram_id.toString() === state.user.telegram_id.toString()) return true;
  return false;
}

/** Build an avatar element (img with fallback to initials) */
function lbAvatarEl(entry, size) {
  const initials = lbInitials(entry.first_name, entry.last_name);
  const color    = lbAvatarColor(entry.first_name || entry.username || '?');
  const fallback = `<div class="lb-${size}-avatar-initials" style="background:${color}">${initials}</div>`;
  if (!entry.photo_url) return fallback;
  // img with onerror fallback to initials
  return `<img src="${entry.photo_url}" alt=""
    style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block"
    onerror="this.replaceWith((function(){var d=document.createElement('div');d.className='lb-${size}-avatar-initials';d.style.background='${color}';d.textContent='${initials}';return d;})())">`;
}

const LB_PAGE_SIZE = 25;
const LB_MAX_PAGES = 4;
const lbState = { page: 1, total: 0, userRank: null, top3: [] };

async function loadLeaderboard(page = 1) {
  const podiumEl = document.getElementById('lb-podium');
  const restEl   = document.getElementById('lb-rest');
  if (!podiumEl || !restEl) return;

  restEl.innerHTML = '<div class="lb-loading">' + t('loading') + '</div>';
  if (page === 1) podiumEl.innerHTML = '';

  try {
    // Page 1: fetch top 3 + first 20 rest in one call (offset=0, limit=23)
    // Page N: fetch 20 items starting after top 3 + previous pages
    const offset = page === 1 ? 0 : 3 + (page - 2) * LB_PAGE_SIZE + LB_PAGE_SIZE;
    const limit  = page === 1 ? 3 + LB_PAGE_SIZE : LB_PAGE_SIZE;
    const qs = `limit=${limit}&offset=${offset}&initData=${encodeURIComponent(initData)}`;
    const res = await apiGet('/leaderboard?' + qs);

    if (!res.ok) {
      restEl.innerHTML = '<div class="lb-loading" style="color:var(--red)">' + t('error_loading_leaderboard') + '</div>';
      return;
    }

    lbState.page    = page;
    lbState.total   = res.total || 0;
    lbState.userRank = res.user_rank || null;

    if (page === 1) {
      lbState.top3 = (res.entries || []).slice(0, 3);
      state.leaderboard = res.entries || [];
    } else {
      state.leaderboard = res.entries || [];
    }

    renderLeaderboard();
  } catch {
    restEl.innerHTML = '<div class="lb-loading" style="color:var(--red)">' + t('connection_error') + '</div>';
  }
}

function renderLeaderboard() {
  const podiumEl  = document.getElementById('lb-podium');
  const restEl    = document.getElementById('lb-rest');
  const paginEl   = document.getElementById('lb-pagination');
  const prevBtn   = document.getElementById('lb-prev-btn');
  const nextBtn   = document.getElementById('lb-next-btn');
  const pageInfo  = document.getElementById('lb-page-info');
  const rankEl    = document.getElementById('lb-user-rank');
  const rankVal   = document.getElementById('lb-user-rank-val');

  if (!podiumEl || !restEl) return;

  // ── USER RANK BADGE ──────────────────────────────────
  if (lbState.userRank && rankEl) {
    rankVal.textContent  = '#' + lbState.userRank;
    rankEl.style.display = '';
  }

  // ── PODIUM (only on page 1) ──────────────────────────
  if (lbState.page === 1) {
    const top3 = lbState.top3;
    if (top3.length === 0) {
      podiumEl.innerHTML = '';
      restEl.innerHTML = '<div class="lb-loading">' + t('lb_no_data') + '</div>';
      return;
    }

    const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean);
    podiumEl.innerHTML = '';
    podiumOrder.forEach(entry => {
      if (!entry) return;
      const isSelf    = lbIsSelf(entry);
      const rankNum   = entry.rank;
      const slotClass = rankNum === 1 ? 'lb-pod--1st' : rankNum === 2 ? 'lb-pod--2nd' : 'lb-pod--3rd';
      const fullName  = [entry.first_name, entry.last_name].filter(Boolean).join(' ') || (entry.username ? '@' + entry.username : '');
      const powerStr  = fmtPower(entry.power);

      const pod = document.createElement('div');
      pod.className = 'lb-pod ' + slotClass + (isSelf ? ' lb-pod--self' : '');
      pod.innerHTML = `
        <div class="lb-pod-badge">${rankNum}</div>
        ${rankNum === 1 ? '<div class="lb-pod-laurel lb-pod-laurel--l"><i data-lucide="wheat"></i></div><div class="lb-pod-laurel lb-pod-laurel--r"><i data-lucide="wheat"></i></div>' : ''}
        <div class="lb-pod-avatar">${lbAvatarEl(entry, 'pod')}</div>
        <div class="lb-pod-name">${fullName}</div>
        <div class="lb-pod-power">${powerStr}</div>
        <div class="lb-pod-unit" data-i18n="power_unit">POWER</div>
        <div class="lb-pod-base"></div>
      `;
      podiumEl.appendChild(pod);
    });
  }

  // ── REST LIST ────────────────────────────────────────
  const listEntries = lbState.page === 1 ? state.leaderboard.slice(3) : state.leaderboard;

  restEl.innerHTML = '';
  if (listEntries.length === 0) {
    restEl.innerHTML = '<div class="lb-loading" style="padding:16px">' + t('lb_no_more') + '</div>';
  } else {
    listEntries.forEach(entry => {
      const isSelf   = lbIsSelf(entry);
      const fullName = [entry.first_name, entry.last_name].filter(Boolean).join(' ') || (entry.username ? '@' + entry.username : '');
      const powerStr = fmtPower(entry.power);

      const row = document.createElement('div');
      row.className = 'lb-row' + (isSelf ? ' lb-self' : '');
      row.innerHTML = `
        <div class="lb-row-rank">${entry.rank}</div>
        <div class="lb-row-avatar">${lbAvatarEl(entry, 'row')}</div>
        <div class="lb-row-name">${fullName}${isSelf ? '<span class="lb-self-badge">YOU</span>' : ''}</div>
        <div class="lb-row-right">
          <div class="lb-row-power">${powerStr}</div>
          <div class="lb-row-unit" data-i18n="power_unit">POWER</div>
        </div>
      `;
      restEl.appendChild(row);
    });
  }

  // ── PAGINATION ───────────────────────────────────────
  const totalPages = Math.ceil(Math.max(0, lbState.total - 3) / LB_PAGE_SIZE) + 1;
  if (paginEl && totalPages > 1) {
    paginEl.style.display = '';
    prevBtn.disabled = lbState.page <= 1;
    nextBtn.disabled = lbState.page >= totalPages;
    pageInfo.textContent = lbState.page + ' / ' + totalPages;
  } else if (paginEl) {
    paginEl.style.display = 'none';
  }



  if (window.lucide) lucide.createIcons();
}

// Season = current calendar month. Ends at the start of next month (UTC).
// "Season N" counts months since the project epoch so it increments monthly.
let _lbSeasonTimer = null;
function updateSeasonCountdown() {
  const labelEl = document.querySelector('#lb-season strong');
  const timeEl  = document.getElementById('lb-season-time');
  if (!timeEl) return;

  const now  = new Date();
  const end  = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0));
  // Season number: months elapsed since Jan 2026 (project epoch), 1-indexed.
  const seasonNum = (now.getUTCFullYear() - 2026) * 12 + now.getUTCMonth() + 1;
  if (labelEl) labelEl.textContent = t('lb_season_n', { n: Math.max(1, seasonNum) });

  const tick = () => {
    const secs = Math.max(0, Math.floor((end.getTime() - Date.now()) / 1000));
    const d = Math.floor(secs / 86400);
    const h = Math.floor((secs % 86400) / 3600);
    const m = Math.floor((secs % 3600) / 60);
    timeEl.textContent = `${d}d ${h}h ${m}m`;
  };
  tick();
  if (_lbSeasonTimer) clearInterval(_lbSeasonTimer);
  _lbSeasonTimer = setInterval(tick, 60000);
}

// ---- TEAM PAGE ----
const teamState = { membersPage: 1, logPage: 1, activeTab: 'members' };

function renderTeam() {
  const u = state.user;
  if (!u) return;

  const botUsername = u.bot_username || tg?.initDataUnsafe?.bot_username || '';
  const refLink = botUsername
    ? `https://t.me/${botUsername}?start=${u.telegram_id}`
    : `https://t.me/?start=${u.telegram_id}`;

  state.refLink = refLink;

  // Hero stats
  const refs        = u.referral_count  || 0;
  const validRefs   = u.valid_refs      ?? 0;
  const invalidRefs = u.invalid_refs    ?? Math.max(0, refs - validRefs);
  
  const refBonusReg = u.ref_bonus_regular || 2000;
  const refBonusPrem = u.ref_bonus_premium || 4000;
  const powerEarned = u.power_from_refs || (validRefs * refBonusReg);
  
  const refBonusRegEl = document.getElementById('team-ref-bonus');
  const refBonusPremEl = document.getElementById('team-prem-bonus');
  const commBonusEl = document.getElementById('team-comm-bonus');
  
  if (refBonusRegEl) refBonusRegEl.textContent = '+' + fmt(refBonusReg, 0);
  if (refBonusPremEl) refBonusPremEl.textContent = '+' + fmt(refBonusPrem, 0);
  if (commBonusEl) commBonusEl.textContent = (u.ref_affiliate_purchase_percent || 10) + '%';
  const totalEl   = document.getElementById('team-total-refs');
  const validEl   = document.getElementById('team-valid-refs');
  const invalidEl = document.getElementById('team-invalid-refs');
  const powerEl   = document.getElementById('team-power-earned');
  if (totalEl)   totalEl.textContent   = refs;
  if (validEl)   validEl.textContent   = validRefs;
  if (invalidEl) invalidEl.textContent = invalidRefs;
  if (powerEl)   powerEl.textContent   = fmtPower(powerEarned);

  // Share button
  const shareBtn = document.getElementById('team-share-btn');
  if (shareBtn) {
    shareBtn.onclick = () => {
      // Integration: include the link at the end of the text and keep the url param for stability
      const fullMessage = t('share_message') + '\n' + state.refLink;
      const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(state.refLink)}&text=${encodeURIComponent(fullMessage)}`;
      if (tg?.openTelegramLink) tg.openTelegramLink(shareUrl);
      else window.open(shareUrl, '_blank');
    };
  }

  // Tab switching
  document.querySelectorAll('.team-tab').forEach(btn => {
    btn.onclick = () => {
      const tab = btn.dataset.teamTab;
      teamState.activeTab = tab;
      document.querySelectorAll('.team-tab').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.team-tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`team-panel-${tab}`)?.classList.add('active');
      if (tab === 'members') loadTeamMembers(1);
      else loadTeamLog(1);
    };
  });

  // Initial load
  loadTeamMembers(1);
  lucide.createIcons();
}

async function loadTeamMembers(page) {
  teamState.membersPage = page;
  const list  = document.getElementById('team-members-list');
  const pager = document.getElementById('team-members-pager');
  if (!list) return;
  list.innerHTML = '<div class="team-list-empty" style="padding:20px"><i data-lucide="loader"></i> ' + t('loading') + '</div>';
  lucide.createIcons();

  try {
    const res = await apiPost('/team', { page, tab: 'members' });
    if (!res.ok || !res.members?.length) {
      list.innerHTML = `<div class="team-list-empty"><i data-lucide="user-plus"></i><span>${t('no_referrals_yet')}</span></div>`;
      if (pager) pager.innerHTML = '';
      lucide.createIcons();
      return;
    }
    list.innerHTML = res.members.map(r => {
      const name     = [r.first_name, r.last_name].filter(Boolean).join(' ') || r.username || t('unknown');
      const initials = name[0].toUpperCase();
      const isPrem   = r.is_premium;
      const isPend   = r.pending_referral_rewards;
      const badgeCls = isPend ? 'team-member-badge--pending' : (isPrem ? 'team-member-badge--premium' : 'team-member-badge--valid');
      const badgeTxt = isPend ? t('pending') : (isPrem ? t('premium') : t('valid'));
      const date     = r.created_at ? new Date(r.created_at).toLocaleDateString() : '';
      const avatarHtml = r.photo_url
        ? `<img class="team-member-avatar team-member-avatar--photo" src="${r.photo_url}" alt="${initials}" onerror="this.outerHTML='<div class=\\'team-member-avatar\\'>${initials}</div>'">`
        : `<div class="team-member-avatar">${initials}</div>`;
      return `<div class="team-member-item">
        ${avatarHtml}
        <div class="team-member-info">
          <div class="team-member-name">${name}</div>
          <div class="team-member-meta">${date}</div>
        </div>
        <span class="team-member-badge ${badgeCls}">${badgeTxt}</span>
      </div>`;
    }).join('');
    renderPager(pager, page, res.pages, loadTeamMembers);
  } catch (e) {
    list.innerHTML = '<div class="team-list-empty"><span>' + t('error_loading_members') + '</span></div>';
  }
  lucide.createIcons();
}

async function loadTeamLog(page) {
  teamState.logPage = page;
  const list  = document.getElementById('team-log-list');
  const pager = document.getElementById('team-log-pager');
  if (!list) return;
  list.innerHTML = '<div class="team-list-empty" style="padding:20px"><i data-lucide="loader"></i> ' + t('loading') + '</div>';
  lucide.createIcons();

  try {
    const res = await apiPost('/team', { page, tab: 'log' });
    if (!res.ok || !res.log?.length) {
      list.innerHTML = `<div class="team-list-empty"><i data-lucide="zap"></i><span>${t('no_power_earned_yet')}</span></div>`;
      if (pager) pager.innerHTML = '';
      lucide.createIcons();
      return;
    }
    list.innerHTML = res.log.map(r => {
      const handle = r.username ? `@${r.username}` : [r.first_name, r.last_name].filter(Boolean).join(' ') || t('unknown');
      const isPrem = r.is_premium;
      const date   = r.ts ? new Date(r.ts).toLocaleDateString() : '';
      const avatarHtml = r.photo_url
        ? `<img class="team-log-avatar team-log-avatar--photo" src="${r.photo_url}" alt="${handle}" onerror="this.outerHTML='<div class=\\'team-log-avatar\\'>${handle[0].toUpperCase()}</div>'">`
        : `<div class="team-log-avatar">${handle[0].toUpperCase()}</div>`;

      let power, label, iconHtml;
      if (r.entry_type === 'commission') {
        power    = Math.round(r.amount);
        label    = t('power_from_commission', { power: power.toLocaleString(), handle });
        iconHtml = `<i data-lucide="percent"></i>`;
      } else {
        const refBonusReg = state.user?.ref_bonus_regular || 2000;
        const refBonusPrem = state.user?.ref_bonus_premium || 4000;
        power    = isPrem ? refBonusPrem : refBonusReg;
        label    = isPrem ? t('power_from_premium_referral', { power: power.toLocaleString(), handle }) : t('power_from_valid_referral', { power: power.toLocaleString(), handle });
        iconHtml = `<i data-lucide="zap"></i>`;
      }

      return `<div class="team-log-item">
        ${avatarHtml}
        <div class="team-log-body">
          <div class="team-log-desc">${label}</div>
          <div class="team-log-date">${date}</div>
        </div>
        <div class="team-log-amount">${iconHtml} +${power.toLocaleString()}</div>
      </div>`;
    }).join('');
    renderPager(pager, page, res.pages, loadTeamLog);
  } catch (e) {
    list.innerHTML = '<div class="team-list-empty"><span>' + t('error_loading_log') + '</span></div>';
  }
  lucide.createIcons();
}

function renderPager(container, page, pages, onPage) {
  if (!container) return;
  if (pages <= 1) { container.innerHTML = ''; return; }
  container.innerHTML = `
    <button class="team-pager-btn" ${page <= 1 ? 'disabled' : ''} id="_pager_prev">‹</button>
    <span class="team-pager-info">${page} / ${pages}</span>
    <button class="team-pager-btn" ${page >= pages ? 'disabled' : ''} id="_pager_next">›</button>
  `;
  container.querySelector('#_pager_prev')?.addEventListener('click', () => onPage(page - 1));
  container.querySelector('#_pager_next')?.addEventListener('click', () => onPage(page + 1));
}

function copyRefLink() {
  const link = state.refLink || '';
  if (navigator.clipboard) {
    navigator.clipboard.writeText(link).then(() => {
      const btn = document.getElementById('copy-ref-btn');
      if (btn) { btn.classList.add('copied'); }
      showToast(t('link_copied'), 'success');
      setTimeout(() => { if (btn) btn.classList.remove('copied'); }, 2000);
    });
  }
}

// ---- SETTINGS (removed page, keep setLang for potential future use) ----
function renderSettings() {}

function setLang(lang) {
  state.lang = lang;
  renderAll();
}

// ---- NAVIGATION ----
function showTab(tab) {
  state.currentTab = tab;
  document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.page').forEach(p => p.classList.toggle('active', p.id === 'page-' + tab));

  if (tab === 'leaderboard') { lbState.page = 1; lbState.top3 = []; loadLeaderboard(1); }
  if (tab === 'tasks') loadTasks();
  if (tab === 'shop') renderShop();
  if (tab === 'mine') { 
    syncHashesFromDB(); 
    refreshUserAuth(); 
  }
  if (tab === 'team') renderTeam();
}

async function refreshUserAuth() {
  try {
    const authRes = await apiPost('/auth');
    if (authRes.ok) {
      state.user = authRes.user;
      renderMine();
    }
  } catch (e) {
    // silent
  }
}

// Called every time the user opens the Power/Mine tab.
// Persists elapsed hashes to DB, then continues visual animation from real value.
async function syncHashesFromDB() {
  renderMine(); // render immediately with current visual value
  try {
    const res = await apiPost('/claim');
    if (res.ok && res.total_hashes !== undefined) {
      state.user.hashes = res.total_hashes; // sync to real DB value
      renderMine();
    }
  } catch {
    // silent — visual animation continues regardless
  }
}

// ---- EVENT LISTENERS ----
document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) lucide.createIcons();

  initPayModal();

  // Tab navigation
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => showTab(btn.dataset.tab));
  });

  // Swap HASHES button → go to wallet withdraw
  document.getElementById('claim-btn')?.addEventListener('click', onSwapHashes);

  // Start Production button
  document.getElementById('start-production-btn')?.addEventListener('click', startProduction);

  // Withdraw modal — step navigation
  document.getElementById('wd-close')?.addEventListener('click', closeWithdrawModal);
  document.getElementById('withdraw-modal')?.addEventListener('click', function(e) {
    if (e.target === this) closeWithdrawModal();
  });
  // Step 1 → 2
  document.getElementById('wd-step1-btn')?.addEventListener('click', () => {
    wdShowStep(2);
  });
  // Step 2 back → 1
  document.getElementById('wd-back-1')?.addEventListener('click', () => wdShowStep(1));
  document.getElementById('wd-wallet')?.addEventListener('input', () => wdSetInputError('wd-wallet', 'wd-wallet-err', ''));
  // Step 2 → 3 (referral check)
  document.getElementById('wd-step2-btn')?.addEventListener('click', () => {
    const wallet = document.getElementById('wd-wallet').value.trim();
    if (!wallet) {
      wdSetInputError('wd-wallet', 'wd-wallet-err', t('enter_wallet_address'));
      return;
    }
    if (!isValidTonAddress(wallet)) {
      wdSetInputError('wd-wallet', 'wd-wallet-err', t('invalid_ton_address'));
      return;
    }
    wdSetInputError('wd-wallet', 'wd-wallet-err', '');
    wdShowStep(3);
    wdCheckReferrals();
  });
  // Step 3 back → 2
  document.getElementById('wd-back-2')?.addEventListener('click', () => wdShowStep(2));
  // Step 3 continue → 4 (memo) — only visible when refs >= 3
  document.getElementById('wd-step3-btn')?.addEventListener('click', () => wdShowStep(4));
  // Step 3 invite → Team tab
  document.getElementById('wd-ref-invite-btn')?.addEventListener('click', () => {
    closeWithdrawModal();
    showTab('team');
  });
  // Step 4 back → 3 (referral)
  document.getElementById('wd-back-3')?.addEventListener('click', () => wdShowStep(3));
  // Step 4 confirm → submit
  document.getElementById('wd-step4-btn')?.addEventListener('click', submitWithdraw);
  document.getElementById('wd-done-btn')?.addEventListener('click', closeWithdrawModal);

  // Copy ref link
  document.getElementById('copy-ref-btn')?.addEventListener('click', copyRefLink);

  // Leaderboard pagination
  document.getElementById('lb-prev-btn')?.addEventListener('click', () => {
    if (lbState.page > 1) { loadLeaderboard(lbState.page - 1); document.getElementById('lb-rest')?.scrollIntoView({ behavior: 'smooth' }); }
  });
  document.getElementById('lb-next-btn')?.addEventListener('click', () => {
    const totalPages = Math.ceil(Math.max(0, lbState.total - 3) / LB_PAGE_SIZE) + 1;
    if (lbState.page < totalPages) { loadLeaderboard(lbState.page + 1); document.getElementById('lb-rest')?.scrollIntoView({ behavior: 'smooth' }); }
  });

  // Power hero action buttons
  document.getElementById('mine-add-power-btn')?.addEventListener('click', () => showTab('shop'));
  document.getElementById('mine-free-power-btn')?.addEventListener('click', () => showTab('tasks'));

  // Leaderboard promo banner → Tasks
  document.getElementById('lb-promo-btn')?.addEventListener('click', () => showTab('tasks'));

  // Power success modal
  document.getElementById('power-success-modal')?.addEventListener('click', e => {
    if (e.target === document.getElementById('power-success-modal')) closePowerSuccessModal();
  });

  // Recheck on app resume (user returns after background/lock screen)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden || !state.user) return;
    // Restart SSE — connection dies in background
    if (_depositES) startDepositStream();
    // Check if a new deposit was processed while app was in background
    checkNewDepositOnResume();
  });

  // Start init
  init();
});
