/* =====================================================
   Open Swap Mini App — app.js (No Ads, Auto-Contract)
   ===================================================== */

const APP_NAME = 'Open Swap';
const APP_BOT_USERNAME = 'OpenSwapBot';
const API_BASE = '/miniapp';

// ── I18n helper ──
function t(key, replacements) {
  return I18n.t(key, replacements);
}

// ── Format helpers ──
function fmtPower(n) {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + 'B';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(2) + 'K';
  return n.toFixed(2);
}

function fmtHashes(n) {
  return Number(n || 0).toFixed(8);
}

function fmtTon(n) {
  return Number(n || 0).toFixed(8);
}

function fmtDuration(secs) {
  const s = Math.max(0, Math.floor(Number(secs) || 0));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// ── Global state ──
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
  refLink: ''
};

// ── Economy Config ──
let HASH_TO_TON = 0.0000144;
let DAILY_HASHES_PER_1K = 602;
let TON_PER_POWER = 0.0000085;
let BASE_POWER_PER_TON = Math.round(1 / TON_PER_POWER);

// ── Telegram WebApp ──
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
  try {
    tg.setHeaderColor?.('#080B12');
    tg.setBackgroundColor?.('#080B12');
    tg.disableVerticalSwipes?.();
  } catch (e) {}
  tg.onEvent?.('viewportChanged', applyTgViewport);
  applyTgViewport();
}

const initData = tg?.initData || '';

// ── API ──
async function apiPost(path, body = {}) {
  try {
    const res = await fetch(API_BASE + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData, ...body })
    });
    return await res.json();
  } catch {
    return { ok: false, error: 'connection_error' };
  }
}

async function apiGet(path) {
  try {
    const res = await fetch(API_BASE + path);
    return await res.json();
  } catch {
    return { ok: false, error: 'connection_error' };
  }
}

// ── Toast ──
function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast' + (type ? ' ' + type : '');
  void t.offsetWidth;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}

// ── Alert Modal ──
function showAlert({ type = 'error', icon, power = '', badge = '', msg = '' } = {}) {
  const overlay = document.getElementById('alert-modal');
  const iconEl = document.getElementById('alert-icon');
  const powerEl = document.getElementById('alert-power');
  const badgeEl = document.getElementById('alert-badge');
  const msgEl = document.getElementById('alert-msg');
  const okBtn = document.getElementById('alert-ok');
  
  if (!overlay) {
    showToast(msg || badge, type);
    return;
  }
  
  iconEl.textContent = icon || (type === 'success' ? '🏆' : type === 'error' ? '⚠️' : 'ℹ️');
  powerEl.textContent = power || '';
  badgeEl.textContent = badge || '';
  msgEl.textContent = msg || '';
  okBtn.textContent = 'OK';
  okBtn.disabled = false;
  overlay.className = `alert-overlay type-${type} open`;
  
  function closeAlert() {
    overlay.classList.remove('open');
    overlay.className = `alert-overlay type-${type}`;
    okBtn.removeEventListener('click', onOk);
    overlay.removeEventListener('click', onOverlayClick);
  }
  
  function onOk() { closeAlert(); }
  const onOverlayClick = (e) => { if (e.target === overlay && type !== 'success') closeAlert(); };
  
  okBtn.addEventListener('click', onOk);
  overlay.addEventListener('click', onOverlayClick);
}

// ── Contract Helper ──
function createContractForPower(user, powerAmount) {
  if (!user || powerAmount <= 0) return null;
  
  const contract = {
    id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
    power: powerAmount,
    hashes_per_day: (powerAmount / 1000) * DAILY_HASHES_PER_1K,
    amount: powerAmount,
    duration: 24,
    seconds_left: 24 * 60 * 60,
    progress: 0,
    permanent: false,
    active: true,
    expired: false,
    created_at: Date.now(),
    expiresAt: Date.now() + 24 * 60 * 60 * 1000
  };
  
  user.contracts = user.contracts || [];
  user.contracts.push(contract);
  return contract;
}

// ── INIT ──
async function init() {
  try {
    const authRes = await apiPost('/auth');
    if (!authRes.ok) {
      const tgLang = (tg?.initDataUnsafe?.user?.language_code) || 'en';
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
      try { localStorage.setItem('tm_logo', authRes.app_logo_url); } catch(e) {}
    }
    
    state.user = authRes.user;
    state.tonPrice = authRes.user.ton_price || 3;
    state.lang = localStorage.getItem('tm_lang') || authRes.user.language || 'en';
    
    // Apply economy config
    if (authRes.user.hash_to_ton) HASH_TO_TON = authRes.user.hash_to_ton;
    if (authRes.user.base_hashes_per_1k_per_day) DAILY_HASHES_PER_1K = authRes.user.base_hashes_per_1k_per_day;
    if (authRes.user.ton_per_power) TON_PER_POWER = authRes.user.ton_per_power;
    
    await I18n.init(state.lang);
    
    apiGet('/ton-price').then(r => {
      if (r.ok) {
        state.tonPrice = r.price;
      }
    });
    
    renderAll();
    initLangSelector();
    hideLoading();
    startMining();
    openWelcomeBonusModal();
  } catch (e) {
    console.error('init error', e);
    document.getElementById('loading-screen').innerHTML = '<div style="color:#f05252;font-size:16px;padding:20px;text-align:center">⚠️ Error: Failed to load. Please restart the app.</div>';
  }
}

// ── Language Selector ──
const LANG_COUNTRY = {
  en: 'gb', es: 'es', pt: 'br', ru: 'ru', 
  zh: 'cn', fr: 'fr', de: 'de', tr: 'tr', hi: 'in'
};

function flagImg(langCode, size = 20) {
  const country = LANG_COUNTRY[langCode] || '';
  if (!country) return '<span class="lang-flag-fallback">🌐</span>';
  return `<img class="lang-flag-img" src="https://flagcdn.com/w${size}/${country}.png" srcset="https://flagcdn.com/w${size * 2}/${country}.png 2x" width="${size}" height="${Math.round(size * 0.75)}" alt="${langCode}" loading="lazy">`;
}

async function initLangSelector() {
  const btn = document.getElementById('lang-selector-btn');
  const dropdown = document.getElementById('lang-dropdown');
  const current = document.getElementById('lang-selector-current');
  if (!btn || !dropdown || !current) return;
  
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
  
  const activeLang = langs.find(l => l.code === state.lang);
  if (activeLang) current.innerHTML = flagImg(activeLang.code, 20);
  
  btn.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    const open = dropdown.style.display !== 'none';
    if (open) closeLangDropdown();
    else openLangDropdown();
  });
  
  document.addEventListener('pointerdown', (e) => {
    if (!document.getElementById('lang-selector')?.contains(e.target)) {
      closeLangDropdown();
    }
  });
}

function openLangDropdown() {
  const btn = document.getElementById('lang-selector-btn');
  const dropdown = document.getElementById('lang-dropdown');
  if (!btn || !dropdown) return;
  dropdown.style.display = '';
  btn.setAttribute('aria-expanded', 'true');
}

function closeLangDropdown() {
  const btn = document.getElementById('lang-selector-btn');
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

// ── MINING ──
function startMining() {
  // Update every second
  setInterval(() => {
    if (!state.user) return;
    const power = state.user.power || 0;
    if (power > 0) {
      const contracts = Array.isArray(state.user.contracts) ? state.user.contracts : [];
      const dailyHashes = contracts.reduce((sum, c) => sum + (c.hashes_per_day || 0), 0);
      const perSecond = dailyHashes / 86400;
      state.user.hashes = (state.user.hashes || 0) + perSecond;
    }
    renderMine();
  }, 1000);
}

// ── RENDER MINE ──
function renderMine() {
  const u = state.user;
  if (!u) return;
  
  const hashes = u.hashes || 0;
  const hashesTon = hashes * HASH_TO_TON;
  const power = u.power || 0;
  const contracts = Array.isArray(u.contracts) ? u.contracts : [];
  const dailyHashes = contracts.reduce((sum, c) => sum + (c.hashes_per_day || 0), 0);
  
  // Stats
  const rateDayEl = document.getElementById('mine-rate-day');
  const powerEl = document.getElementById('mine-power');
  if (rateDayEl) rateDayEl.textContent = Math.round(dailyHashes).toLocaleString();
  if (powerEl) powerEl.textContent = fmtPower(power);
  
  // Hashes
  const hashesEl = document.getElementById('mine-hashes');
  const tonEl = document.getElementById('mine-ton');
  if (hashesEl) hashesEl.textContent = fmtHashes(hashes);
  if (tonEl) {
    tonEl.innerHTML = '≈ ' + fmtTon(hashesTon) + ' TON <span>' + t('at_current_rate') + '</span>';
  }
  
  // Swap subtitle
  const swapSub = document.getElementById('mine-swap-sub');
  if (swapSub) {
    swapSub.textContent = t('swap_convert_detail', { h: fmtPower(hashes), ton: fmtTon(hashesTon) });
  }
  
  // Contracts
  renderContracts(contracts);
}

function renderContracts(contracts) {
  const wrap = document.getElementById('mine-contracts');
  const expiryEl = document.getElementById('mine-next-expiry');
  
  const timed = contracts.filter(c => !c.permanent && c.seconds_left > 0);
  const soonest = timed.reduce((min, c) => Math.min(min, c.seconds_left), Infinity);
  if (expiryEl) expiryEl.textContent = timed.length ? fmtDuration(soonest) : '∞';
  
  if (!wrap) return;
  if (!contracts.length) {
    wrap.innerHTML = `<div class="mn-contracts-empty">${t('no_contracts')}</div>`;
    return;
  }
  
  const sorted = [...contracts].sort((a, b) => {
    if (a.permanent !== b.permanent) return a.permanent ? 1 : -1;
    return (a.seconds_left || 0) - (b.seconds_left || 0);
  });
  
  const visibleContracts = sorted.slice(0, 10);
  wrap.innerHTML = visibleContracts.map(c => {
    const rate = Math.round(c.hashes_per_day || 0).toLocaleString();
    const amt = fmtPower(c.amount || c.power || 0);
    
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
              <i data-lucide="infinity"></i>
              <span data-i18n="permanent_word">Permanent</span>
            </div>
          </div>
          <div class="mn-contract-rate"><strong>${rate}</strong> <span data-i18n="h_per_day_unit">H/day</span></div>
        </div>
      `;
    }
    
    const pct = Math.round((c.progress || 0) * 100);
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
      </div>
    `;
  }).join('');
  
  if (window.lucide) lucide.createIcons();
}

// ── RENDER SHOP ──
const SHOP_TIERS = [
  { ton: 0.8, bonus: 0.00 },
  { ton: 1, bonus: 0.00 },
  { ton: 5, bonus: 0.02 },
  { ton: 10, bonus: 0.05 },
  { ton: 25, bonus: 0.25 },
  { ton: 100, bonus: 0.50 }
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
    const basePower = Math.round(tier.ton * BASE_POWER_PER_TON);
    const totalPower = Math.floor(basePower * (1 + tier.bonus));
    const bonusPower = totalPower - basePower;
    const finalReturn = tier.ton * (1 + tier.bonus) * roi;
    
    const item = document.createElement('div');
    item.className = 'sh-pkg' + (tier.bonus > 0 ? ' tone-g' : '');
    
    const bonusChip = tier.bonus > 0 ? 
      `<span class="sh-pkg-bonus">+${fmtPower(bonusPower)}<small> ${t('power_unit')}</small></span>` : '';
    
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

// ── BUY POWER ──
let _payData = null;

async function onBuyPower(powerAmount) {
  try {
    const res = await apiPost('/buy-power', { power_amount: powerAmount });
    if (!res.ok) {
      showToast(res.error || t('error_generating_payment'), 'error');
      return;
    }
    
    const tonCost = res.ton_cost || powerAmount * TON_PER_POWER;
    const bonus = shopBonusForTon(tonCost);
    const totalPower = Math.floor(powerAmount * (1 + bonus));
    const bonusPower = totalPower - powerAmount;
    const roiTarget = shopRoiTarget();
    const finalReturn = tonCost * (1 + bonus) * roiTarget;
    const lifetimeHours = state.user?.power_lifetime_hours || 24;
    
    const pkg = {
      label: totalPower.toLocaleString(),
      ton: +tonCost.toFixed(3),
      power: totalPower,
      bonusPower: bonusPower,
      finalReturn: finalReturn,
      lifetimeHours: lifetimeHours
    };
    
    openPayModal(pkg, res);
  } catch {
    showToast(t('connection_error'), 'error');
  }
}

function shopBonusForTon(ton) {
  const t = Number(ton) || 0;
  let bonus = 0;
  for (const tier of SHOP_TIERS) {
    if (t >= tier.ton * 0.98) bonus = tier.bonus;
  }
  return bonus;
}

function openPayModal(pkg, payRes) {
  _payData = {
    address: payRes.deposit_address,
    nanotons: String(Math.round(payRes.ton_cost * 1e9)),
    memo: String(payRes.memo),
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
  if (elHashes) elHashes.textContent = `~ ${fmtPower(pkg.power)} ${I18n.getHashesName()}`;
  
  const elReturn = document.getElementById('pay-mod-return');
  if (elReturn) elReturn.textContent = `${pkg.finalReturn.toFixed(3)} TON`;
  
  const elDuration = document.getElementById('pay-mod-duration');
  if (elDuration) elDuration.textContent = pkg.lifetimeHours > 0 ? `${pkg.lifetimeHours}h` : `Permanent`;
  
  document.getElementById('pay-modal').classList.add('open');
  if (typeof lucide !== 'undefined') lucide.createIcons();
  
  // Auto-confirm deposit for demo - with contract creation
  setTimeout(() => {
    const user = state.user;
    if (user) {
      user.power = (user.power || 0) + pkg.power;
      // Create contract for the purchased POWER
      const contract = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
        power: pkg.power,
        hashes_per_day: (pkg.power / 1000) * DAILY_HASHES_PER_1K,
        amount: pkg.power,
        duration: pkg.lifetimeHours,
        seconds_left: pkg.lifetimeHours * 60 * 60,
        progress: 0,
        permanent: false,
        active: true,
        expired: false,
        created_at: Date.now(),
        expiresAt: Date.now() + pkg.lifetimeHours * 60 * 60 * 1000
      };
      user.contracts = user.contracts || [];
      user.contracts.push(contract);
      renderAll();
      closePayModal();
      showPowerSuccessModal(pkg.power, user.power);
    }
  }, 2000);
}

function closePayModal() {
  document.getElementById('pay-modal').classList.remove('open');
}

function showPowerSuccessModal(addedPower, totalPower) {
  const modal = document.getElementById('power-success-modal');
  const sheet = modal?.querySelector('.ps-sheet');
  if (!modal) return;
  
  const fresh = sheet.cloneNode(true);
  modal.replaceChild(fresh, sheet);
  if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [fresh] });
  
  fresh.querySelector('#ps-close-btn').addEventListener('click', closePowerSuccessModal);
  
  const addedLabel = addedPower >= 1000 ? (addedPower / 1000).toFixed(1) + 'K' : String(addedPower);
  const pkgEl = fresh.querySelector('#ps-package-label');
  const totalEl = fresh.querySelector('#ps-total-power');
  const durEl = fresh.querySelector('#ps-duration-val');
  
  if (pkgEl) pkgEl.innerHTML = `+${addedLabel} <span>POWER</span>`;
  if (totalEl) totalEl.textContent = fmtPower(totalPower);
  if (durEl) {
    const lifetimeHours = state.user?.power_lifetime_hours || 24;
    durEl.textContent = lifetimeHours > 0 ? lifetimeHours + 'h' : '∞';
  }
  
  modal.classList.add('open');
  closePayModal();
  tg?.HapticFeedback?.notificationOccurred?.('success');
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

// ── RENDER TASKS ──
async function loadTasks() {
  const container = document.getElementById('tasks-list');
  const dailyWrap = document.getElementById('tasks-daily-list');
  const inviteWrap = document.getElementById('tasks-invite-list');
  const inviteSec = document.getElementById('tk-invite-section');
  const dailySec = document.getElementById('tk-daily-section');
  
  if (!container) return;
  container.innerHTML = '<div style="color:var(--t3);text-align:center;padding:20px">' + t('loading') + '</div>';
  
  try {
    const res = await apiGet('/tasks?initData=' + encodeURIComponent(initData));
    if (!res.ok) {
      container.innerHTML = '<div style="color:var(--red);padding:20px">' + t('error_loading_tasks') + '</div>';
      return;
    }
    
    state.tasks = res.tasks || [];
    state.taskReferralCount = res.referral_count || 0;
    
    // Calculate earned and available
    let earned = 0, available = 0;
    state.tasks.forEach(tk => {
      const pips = Number(tk.pips) || 0;
      if (tk.completed) earned += pips;
      else if (tk.eligible) available += pips;
    });
    setTaskStats(earned, available);
    
    // Filter tasks
    const referralTasks = state.tasks.filter(tk => tk.type === 'referral');
    const otherTasks = state.tasks.filter(tk => tk.type !== 'referral' && tk.type !== 'ad' && tk.type !== 'ad2');
    
    // Render invite section
    if (inviteWrap && referralTasks.length) {
      if (inviteSec) inviteSec.style.display = '';
      const inviteDone = referralTasks.filter(tk => tk.completed).length;
      const dEl = document.getElementById('tk-invite-done');
      const nEl = document.getElementById('tk-invite-total');
      if (dEl) dEl.textContent = inviteDone;
      if (nEl) nEl.textContent = referralTasks.length;
      
      inviteWrap.innerHTML = referralTasks.map(task => {
        const title = t('task_' + task.id) !== 'task_' + task.id ? t('task_' + task.id) : task.labelEn;
        const reward = fmtPower(task.pips);
        const cur = Math.min(state.taskReferralCount, task.required || 0);
        const barPct = task.required ? Math.round((cur / task.required) * 100) : 0;
        
        let actionHtml;
        if (task.completed) {
          actionHtml = `<div class="tk-invite-claimed"><i data-lucide="check"></i></div>`;
        } else if (task.eligible) {
          actionHtml = `<button class="task-btn claim tk-invite-claim" data-task-id="${task.id}">${t('claim')}</button>`;
        } else {
          actionHtml = `<div class="tk-invite-reward">
            <span class="tk-invite-reward-num">+${reward}</span>
            <span class="tk-invite-reward-unit" data-i18n="power_unit">POWER</span>
          </div>`;
        }
        
        return `
          <div class="tk-invite-card tone-g ${task.completed ? 'is-done' : ''} ${task.eligible && !task.completed ? 'is-eligible' : ''}" data-task-id="${task.id}">
            <div class="tk-invite-tile">
              <i data-lucide="user-plus"></i>
              <span class="tk-invite-tile-num">${task.required}</span>
            </div>
            <div class="tk-invite-main">
              <div class="tk-invite-title">${title}</div>
              <div class="tk-invite-desc">${t('invite_friends_sub')}</div>
              <div class="tk-invite-progress">
                <div class="tk-invite-bar"><div class="tk-invite-bar-fill" style="width:${Math.max(barPct, 3)}%"></div></div>
                <div class="tk-invite-count">${cur} / ${task.required}</div>
              </div>
            </div>
            <div class="tk-invite-action">${actionHtml}</div>
          </div>
        `;
      }).join('');
      
      inviteWrap.querySelectorAll('.task-btn.claim[data-task-id]').forEach(btn => {
        btn.addEventListener('click', () => onClaimTask(btn.dataset.taskId));
      });
    } else if (inviteSec) {
      inviteSec.style.display = 'none';
    }
    
    // Render daily/other tasks
    if (dailyWrap) {
      if (dailySec) dailySec.style.display = '';
      dailyWrap.innerHTML = otherTasks.map(task => {
        const title = t('task_' + task.id) !== 'task_' + task.id ? t('task_' + task.id) : task.labelEn;
        const reward = fmtPower(task.pips);
        let actionHtml;
        
        if (task.completed) {
          actionHtml = `<div class="task-done-icon"><i data-lucide="check"></i></div>`;
        } else if (task.type === 'channel') {
          actionHtml = task.channel_url ? `
            <div class="task-btn-stack">
              <button class="task-btn join" data-channel="${task.channel_url.replace('@','')}">${t('join')}</button>
              <button class="task-btn claim" data-task-id="${task.id}">${t('claim')}</button>
            </div>
          ` : `<button class="task-btn locked" disabled>N/A</button>`;
        } else if (task.eligible) {
          actionHtml = `<button class="task-btn claim" data-task-id="${task.id}">${t('claim')}</button>`;
        } else {
          const needed = (task.required || 0) - state.taskReferralCount;
          actionHtml = `<button class="task-btn locked" disabled>${needed} ${t('left')}</button>`;
        }
        
        return `
          <div class="task-card ${task.completed ? 'completed' : ''} ${task.eligible && !task.completed ? 'eligible' : ''}" data-task-id="${task.id}">
            <div class="task-icon icon-referral"><i data-lucide="check-circle"></i></div>
            <div class="task-body">
              <div class="task-title">${title}</div>
              <div class="task-reward"><i data-lucide="zap"></i> +${reward} POWER</div>
            </div>
            <div class="task-action">${actionHtml}</div>
          </div>
        `;
      }).join('');
      
      dailyWrap.querySelectorAll('.task-btn.claim[data-task-id]').forEach(btn => {
        btn.addEventListener('click', () => onClaimTask(btn.dataset.taskId));
      });
      dailyWrap.querySelectorAll('.task-btn.join[data-channel]').forEach(btn => {
        btn.addEventListener('click', () => {
          const url = `https://t.me/${btn.dataset.channel}`;
          if (tg?.openTelegramLink) tg.openTelegramLink(url);
          else window.open(url, '_blank');
        });
      });
    }
    
    container.innerHTML = '';
    if (window.lucide) lucide.createIcons();
  } catch {
    container.innerHTML = '<div style="color:var(--red);padding:20px">' + t('connection_error') + '</div>';
  }
}

function setTaskStats(earned, available) {
  const eEl = document.getElementById('tk-stat-earned');
  const aEl = document.getElementById('tk-stat-available');
  if (eEl) eEl.textContent = fmtPower(earned);
  if (aEl) aEl.textContent = fmtPower(available);
}

// ── CLAIM TASK (with auto-contract) ──
async function onClaimTask(taskId) {
  const card = document.querySelector(`.task-card[data-task-id="${taskId}"], .tk-invite-card[data-task-id="${taskId}"]`);
  if (card) card.classList.add('claiming');
  
  try {
    const res = await apiPost('/tasks/claim', { task_id: taskId });
    if (res.ok) {
      const task = state.tasks.find(tk => tk.id === taskId);
      if (task) task.completed = true;
      
      // Update user power and create contract
      if (state.user && res.pips_awarded > 0) {
        state.user.power = (state.user.power || 0) + res.pips_awarded;
        // Create contract for the earned POWER
        const contract = {
          id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
          power: res.pips_awarded,
          hashes_per_day: (res.pips_awarded / 1000) * DAILY_HASHES_PER_1K,
          amount: res.pips_awarded,
          duration: 24,
          seconds_left: 24 * 60 * 60,
          progress: 0,
          permanent: false,
          active: true,
          expired: false,
          created_at: Date.now(),
          expiresAt: Date.now() + 24 * 60 * 60 * 1000
        };
        state.user.contracts = state.user.contracts || [];
        state.user.contracts.push(contract);
      }
      
      setTimeout(() => {
        loadTasks();
        renderMine();
      }, 300);
      
      showAlert({
        type: 'success',
        icon: '🏆',
        power: `+${res.pips_awarded} POWER`,
        badge: t('task_claim_title'),
        msg: t('task_claim_sub')
      });
    } else {
      if (card) card.classList.remove('claiming');
      if (res.error === 'not enough referrals') {
        showAlert({
          type: 'error',
          badge: t('need_referrals', { required: res.required }),
          msg: t('need_referrals_sub')
        });
      } else if (res.error === 'already completed') {
        showAlert({ type: 'info', badge: 'Already Completed', msg: 'This task is already done.' });
      } else {
        showAlert({ type: 'error', msg: res.error || t('error') });
      }
    }
  } catch {
    if (card) card.classList.remove('claiming');
    showAlert({ type: 'error', msg: t('connection_error') });
  }
}

// ── LEADERBOARD ──
const LB_PAGE_SIZE = 25;
const lbState = { page: 1, total: 0, userRank: null, top3: [] };

function lbInitials(first, last) {
  const f = (first || '').trim();
  const l = (last || '').trim();
  if (f && l) return (f[0] + l[0]).toUpperCase();
  if (f) return f.slice(0, 2).toUpperCase();
  return '??';
}

function lbAvatarColor(name) {
  const colors = ['#4F8EF7','#E05252','#52B788','#F7A84F','#9B5DE5','#F15BB5','#00BBF9','#F7C59F'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function lbIsSelf(entry) {
  if (!state.user) return false;
  if (entry.username && state.user.username && entry.username === state.user.username) return true;
  if (entry.id && state.user.id && entry.id === state.user.id) return true;
  return false;
}

function lbAvatarEl(entry, size) {
  const initials = lbInitials(entry.first_name, entry.last_name);
  const color = lbAvatarColor(entry.first_name || entry.username || '?');
  if (!entry.photo_url) {
    return `<div class="lb-${size}-avatar-initials" style="background:${color}">${initials}</div>`;
  }
  return `<img src="${entry.photo_url}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block">`;
}

async function loadLeaderboard(page = 1) {
  const podiumEl = document.getElementById('lb-podium');
  const restEl = document.getElementById('lb-rest');
  if (!podiumEl || !restEl) return;
  
  restEl.innerHTML = '<div class="lb-loading">' + t('loading') + '</div>';
  
  try {
    const offset = page === 1 ? 0 : 3 + (page - 2) * LB_PAGE_SIZE + LB_PAGE_SIZE;
    const limit = page === 1 ? 3 + LB_PAGE_SIZE : LB_PAGE_SIZE;
    const qs = `limit=${limit}&offset=${offset}&initData=${encodeURIComponent(initData)}`;
    const res = await apiGet('/leaderboard?' + qs);
    
    if (!res.ok) {
      restEl.innerHTML = '<div class="lb-loading" style="color:var(--red)">' + t('error_loading_leaderboard') + '</div>';
      return;
    }
    
    lbState.page = page;
    lbState.total = res.total || 0;
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
  const podiumEl = document.getElementById('lb-podium');
  const restEl = document.getElementById('lb-rest');
  const rankEl = document.getElementById('lb-user-rank');
  const rankVal = document.getElementById('lb-user-rank-val');
  
  if (lbState.userRank && rankEl) {
    rankVal.textContent = '#' + lbState.userRank;
    rankEl.style.display = '';
  }
  
  // Podium
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
      const isSelf = lbIsSelf(entry);
      const rankNum = entry.rank;
      const slotClass = rankNum === 1 ? 'lb-pod--1st' : rankNum === 2 ? 'lb-pod--2nd' : 'lb-pod--3rd';
      const fullName = [entry.first_name, entry.last_name].filter(Boolean).join(' ') || (entry.username ? '@' + entry.username : '');
      const powerStr = fmtPower(entry.power);
      
      const pod = document.createElement('div');
      pod.className = 'lb-pod ' + slotClass + (isSelf ? ' lb-pod--self' : '');
      pod.innerHTML = `
        <div class="lb-pod-badge">${rankNum}</div>
        <div class="lb-pod-avatar">${lbAvatarEl(entry, 'pod')}</div>
        <div class="lb-pod-name">${fullName}</div>
        <div class="lb-pod-power">${powerStr}</div>
        <div class="lb-pod-unit" data-i18n="power_unit">POWER</div>
        <div class="lb-pod-base"></div>
      `;
      podiumEl.appendChild(pod);
    });
  }
  
  // Rest list
  const listEntries = lbState.page === 1 ? state.leaderboard.slice(3) : state.leaderboard;
  restEl.innerHTML = '';
  if (listEntries.length === 0) {
    restEl.innerHTML = '<div class="lb-loading" style="padding:16px">' + t('lb_no_more') + '</div>';
  } else {
    listEntries.forEach(entry => {
      const isSelf = lbIsSelf(entry);
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
  
  // Pagination
  const totalPages = Math.ceil(Math.max(0, lbState.total - 3) / LB_PAGE_SIZE) + 1;
  const paginEl = document.getElementById('lb-pagination');
  const prevBtn = document.getElementById('lb-prev-btn');
  const nextBtn = document.getElementById('lb-next-btn');
  const pageInfo = document.getElementById('lb-page-info');
  
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

// ── TEAM ──
const teamState = { membersPage: 1, logPage: 1, activeTab: 'members' };

function renderTeam() {
  const u = state.user;
  if (!u) return;
  
  const botUsername = u.bot_username || tg?.initDataUnsafe?.bot_username || '';
  const refLink = botUsername ? `https://t.me/${botUsername}?start=${u.telegram_id}` : `https://t.me/?start=${u.telegram_id}`;
  state.refLink = refLink;
  
  // Stats
  const refs = u.referral_count || 0;
  const validRefs = u.valid_refs ?? 0;
  const invalidRefs = u.invalid_refs ?? Math.max(0, refs - validRefs);
  const refBonusReg = u.ref_bonus_regular || 2000;
  const refBonusPrem = u.ref_bonus_premium || 4000;
  const powerEarned = u.power_from_refs || (validRefs * refBonusReg);
  
  const refBonusRegEl = document.getElementById('team-ref-bonus');
  const refBonusPremEl = document.getElementById('team-prem-bonus');
  const commBonusEl = document.getElementById('team-comm-bonus');
  if (refBonusRegEl) refBonusRegEl.textContent = '+' + fmtPower(refBonusReg);
  if (refBonusPremEl) refBonusPremEl.textContent = '+' + fmtPower(refBonusPrem);
  if (commBonusEl) commBonusEl.textContent = (u.ref_affiliate_purchase_percent || 10) + '%';
  
  document.getElementById('team-total-refs').textContent = refs;
  document.getElementById('team-valid-refs').textContent = validRefs;
  document.getElementById('team-invalid-refs').textContent = invalidRefs;
  document.getElementById('team-power-earned').textContent = fmtPower(powerEarned);
  
  // Share button
  document.getElementById('team-share-btn').onclick = () => {
    const fullMessage = t('share_message') + '\n' + state.refLink;
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(state.refLink)}&text=${encodeURIComponent(fullMessage)}`;
    if (tg?.openTelegramLink) tg.openTelegramLink(shareUrl);
    else window.open(shareUrl, '_blank');
  };
  
  document.getElementById('copy-ref-btn').onclick = () => {
    navigator.clipboard.writeText(state.refLink).then(() => {
      showToast(t('link_copied'), 'success');
    });
  };
  
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
  
  loadTeamMembers(1);
  if (window.lucide) lucide.createIcons();
}

async function loadTeamMembers(page) {
  teamState.membersPage = page;
  const list = document.getElementById('team-members-list');
  const pager = document.getElementById('team-members-pager');
  if (!list) return;
  
  list.innerHTML = '<div class="team-list-empty" style="padding:20px"><i data-lucide="loader"></i> ' + t('loading') + '</div>';
  if (window.lucide) lucide.createIcons();
  
  try {
    const res = await apiPost('/team', { page, tab: 'members' });
    if (!res.ok || !res.members?.length) {
      list.innerHTML = `<div class="team-list-empty"><i data-lucide="user-plus"></i><span>${t('no_referrals_yet')}</span></div>`;
      if (pager) pager.innerHTML = '';
      if (window.lucide) lucide.createIcons();
      return;
    }
    
    list.innerHTML = res.members.map(r => {
      const name = [r.first_name, r.last_name].filter(Boolean).join(' ') || r.username || t('unknown');
      const initials = name[0].toUpperCase();
      const isPrem = r.is_premium;
      const isPend = r.pending_referral_rewards;
      const badgeCls = isPend ? 'team-member-badge--pending' : (isPrem ? 'team-member-badge--premium' : 'team-member-badge--valid');
      const badgeTxt = isPend ? t('pending') : (isPrem ? t('premium') : t('valid'));
      const date = r.created_at ? new Date(r.created_at).toLocaleDateString() : '';
      
      const avatarHtml = r.photo_url ? 
        `<img class="team-member-avatar team-member-avatar--photo" src="${r.photo_url}" alt="${initials}">` : 
        `<div class="team-member-avatar">${initials}</div>`;
      
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
  } catch {
    list.innerHTML = '<div class="team-list-empty"><span>' + t('error_loading_members') + '</span></div>';
  }
  if (window.lucide) lucide.createIcons();
}

async function loadTeamLog(page) {
  teamState.logPage = page;
  const list = document.getElementById('team-log-list');
  const pager = document.getElementById('team-log-pager');
  if (!list) return;
  
  list.innerHTML = '<div class="team-list-empty" style="padding:20px"><i data-lucide="loader"></i> ' + t('loading') + '</div>';
  if (window.lucide) lucide.createIcons();
  
  try {
    const res = await apiPost('/team', { page, tab: 'log' });
    if (!res.ok || !res.log?.length) {
      list.innerHTML = `<div class="team-list-empty"><i data-lucide="zap"></i><span>${t('no_power_earned_yet')}</span></div>`;
      if (pager) pager.innerHTML = '';
      if (window.lucide) lucide.createIcons();
      return;
    }
    
    list.innerHTML = res.log.map(r => {
      const handle = r.username ? `@${r.username}` : [r.first_name, r.last_name].filter(Boolean).join(' ') || t('unknown');
      const date = r.ts ? new Date(r.ts).toLocaleDateString() : '';
      const avatarHtml = r.photo_url ? 
        `<img class="team-log-avatar team-log-avatar--photo" src="${r.photo_url}" alt="${handle}">` : 
        `<div class="team-log-avatar">${handle[0].toUpperCase()}</div>`;
      
      let power, label;
      if (r.entry_type === 'commission') {
        power = Math.round(r.amount);
        label = t('power_from_commission', { power: power.toLocaleString(), handle });
      } else {
        const refBonusReg = state.user?.ref_bonus_regular || 2000;
        const refBonusPrem = state.user?.ref_bonus_premium || 4000;
        power = r.is_premium ? refBonusPrem : refBonusReg;
        label = r.is_premium ? 
          t('power_from_premium_referral', { power: power.toLocaleString(), handle }) : 
          t('power_from_valid_referral', { power: power.toLocaleString(), handle });
      }
      
      return `<div class="team-log-item">
        ${avatarHtml}
        <div class="team-log-body">
          <div class="team-log-desc">${label}</div>
          <div class="team-log-date">${date}</div>
        </div>
        <div class="team-log-amount"><i data-lucide="zap"></i> +${power.toLocaleString()}</div>
      </div>`;
    }).join('');
    
    renderPager(pager, page, res.pages, loadTeamLog);
  } catch {
    list.innerHTML = '<div class="team-list-empty"><span>' + t('error_loading_log') + '</span></div>';
  }
  if (window.lucide) lucide.createIcons();
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

// ── WITHDRAW ──
let WD_MIN_HASHES = 1000;

function isValidTonAddress(addr) {
  return /^[UE0][Qq0-9A-Za-z_-]{47}$/.test(addr) || /^[0-9a-fA-F]{64}$/.test(addr);
}

function openWithdrawModal() {
  const hashes = state.user?.hashes || 0;
  const tonAmt = hashes * HASH_TO_TON;
  const per1k = 1000 * HASH_TO_TON;
  
  document.getElementById('wd-rate-display').textContent = t('withdraw_rate_display', { ton: fmtTon(per1k) });
  document.getElementById('wd-balance-display').textContent = t('balance_hashes', { hashes: fmtHashes(hashes) });
  document.getElementById('wd-receive-display').textContent = t('receive_approx_ton', { ton: fmtTon(tonAmt) });
  document.getElementById('wd-min-display').textContent = t('min_hashes_display', { hashes: WD_MIN_HASHES.toLocaleString() });
  
  document.getElementById('wd-wallet').value = '';
  document.getElementById('wd-memo').value = '';
  wdShowStep(1);
  document.getElementById('withdraw-modal').classList.add('open');
}

function closeWithdrawModal() {
  document.getElementById('withdraw-modal').classList.remove('open');
}

function wdShowStep(n) {
  [1,2,3,4,5].forEach(i => {
    const el = document.getElementById('wd-step-' + i);
    if (el) el.style.display = i === n ? 'flex' : 'none';
  });
}

async function submitWithdraw() {
  const hashes = state.user?.hashes || 0;
  const wallet = document.getElementById('wd-wallet').value.trim();
  const memo = document.getElementById('wd-memo').value.trim();
  
  if (!wallet) {
    showToast(t('enter_wallet_address'), 'error');
    return;
  }
  
  if (!isValidTonAddress(wallet)) {
    showToast(t('invalid_ton_address'), 'error');
    return;
  }
  
  wdShowStep(5);
  const titleEl = document.getElementById('wd-progress-title');
  const subEl = document.getElementById('wd-progress-sub');
  const bar = document.getElementById('wd-progress-bar');
  
  if (titleEl) titleEl.textContent = t('processing_swap');
  if (subEl) subEl.textContent = t('swap_queued');
  if (bar) { bar.style.width = '0%'; requestAnimationFrame(() => { bar.style.width = '60%'; }); }
  
  try {
    const res = await apiPost('/withdraw', { wallet_address: wallet, memo });
    if (res.ok) {
      state.user.hashes = 0;
      renderMine();
      wdShowResult(true, t('swap_complete'), t('ton_on_way'));
    } else {
      const err = res.error || '';
      if (err.startsWith('minimum_not_met:')) {
        const parts = err.split(':');
        const minH = parseInt(parts[2]).toLocaleString();
        wdShowResult(false, t('insufficient_hashes'), t('not_enough_hashes_detail', { minH }));
      } else if (err === 'no hashes to swap') {
        wdShowResult(false, t('no_hashes_to_swap'), t('no_hashes_detail'));
      } else {
        wdShowResult(false, t('swap_failed'), err || t('swap_error'));
      }
    }
  } catch {
    wdShowResult(false, t('connection_error'), t('check_connection'));
  }
}

function wdShowResult(success, title, sub) {
  wdShowStep(5);
  const titleEl = document.getElementById('wd-progress-title');
  const subEl = document.getElementById('wd-progress-sub');
  const doneBtn = document.getElementById('wd-done-btn');
  const iconWrap = document.querySelector('#wd-step-5 .wd-icon');
  
  if (titleEl) titleEl.textContent = title;
  if (subEl) subEl.textContent = sub;
  
  if (success) {
    if (iconWrap) {
      iconWrap.innerHTML = '<i data-lucide="check-circle"></i>';
      iconWrap.style.borderColor = 'rgba(34,197,94,0.4)';
      if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [iconWrap] });
    }
    if (doneBtn) {
      doneBtn.style.display = '';
      doneBtn.textContent = t('done');
      doneBtn.onclick = () => { closeWithdrawModal(); };
    }
  } else {
    if (iconWrap) {
      iconWrap.innerHTML = '<i data-lucide="x-circle"></i>';
      iconWrap.style.borderColor = 'rgba(239,68,68,0.4)';
      if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [iconWrap] });
    }
    if (doneBtn) {
      doneBtn.style.display = '';
      doneBtn.textContent = t('try_again');
      doneBtn.onclick = () => wdShowStep(1);
    }
  }
}

// ── WELCOME BONUS ──
function shouldShowWelcomeBonus() {
  return !!state.user && !state.user.welcome_bonus_claimed && (state.user.welcome_bonus_power || 0) > 0;
}

function openWelcomeBonusModal() {
  if (!shouldShowWelcomeBonus()) return;
  
  const modal = document.getElementById('welcome-modal');
  const amountEl = document.getElementById('welcome-modal-amount');
  const btn = document.getElementById('welcome-modal-btn');
  if (!modal || !amountEl || !btn) return;
  
  const bonusPower = state.user.welcome_bonus_power || 1000;
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
        // Create contract for welcome bonus
        if (res.bonus > 0) {
          const contract = {
            id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
            power: res.bonus,
            hashes_per_day: (res.bonus / 1000) * DAILY_HASHES_PER_1K,
            amount: res.bonus,
            duration: 24,
            seconds_left: 24 * 60 * 60,
            progress: 0,
            permanent: false,
            active: true,
            expired: false,
            created_at: Date.now(),
            expiresAt: Date.now() + 24 * 60 * 60 * 1000
          };
          state.user.contracts = state.user.contracts || [];
          state.user.contracts.push(contract);
        }
        modal.classList.remove('open');
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
      if (!state.user?.welcome_bonus_claimed) {
        btn.disabled = false;
        btn.textContent = t('welcome_modal_btn');
      }
    }
  };
}

// ── RENDER ALL ──
function renderAll() {
  renderMine();
  renderShop();
  renderTeam();
}

// ── NAVIGATION ──
function showTab(tab) {
  state.currentTab = tab;
  document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.page').forEach(p => p.classList.toggle('active', p.id === 'page-' + tab));
  
  if (tab === 'leaderboard') {
    lbState.page = 1;
    lbState.top3 = [];
    loadLeaderboard(1);
  }
  if (tab === 'tasks') loadTasks();
  if (tab === 'shop') renderShop();
  if (tab === 'mine') renderMine();
  if (tab === 'team') renderTeam();
}

// ── EVENT LISTENERS ──
document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) lucide.createIcons();
  
  // Tab navigation
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => showTab(btn.dataset.tab));
  });
  
  // Swap HASHES button
  document.getElementById('claim-btn')?.addEventListener('click', openWithdrawModal);
  
  // Withdraw modal
  document.getElementById('wd-close')?.addEventListener('click', closeWithdrawModal);
  document.getElementById('withdraw-modal')?.addEventListener('click', function(e) {
    if (e.target === this) closeWithdrawModal();
  });
  
  document.getElementById('wd-step1-btn')?.addEventListener('click', () => wdShowStep(2));
  document.getElementById('wd-back-1')?.addEventListener('click', () => wdShowStep(1));
  
  document.getElementById('wd-step2-btn')?.addEventListener('click', submitWithdraw);
  document.getElementById('wd-done-btn')?.addEventListener('click', closeWithdrawModal);
  
  // Power hero buttons
  document.getElementById('mine-add-power-btn')?.addEventListener('click', () => showTab('shop'));
  document.getElementById('mine-free-power-btn')?.addEventListener('click', () => showTab('tasks'));
  
  // Leaderboard pagination
  document.getElementById('lb-prev-btn')?.addEventListener('click', () => {
    if (lbState.page > 1) {
      loadLeaderboard(lbState.page - 1);
      document.getElementById('lb-rest')?.scrollIntoView({ behavior: 'smooth' });
    }
  });
  document.getElementById('lb-next-btn')?.addEventListener('click', () => {
    const totalPages = Math.ceil(Math.max(0, lbState.total - 3) / LB_PAGE_SIZE) + 1;
    if (lbState.page < totalPages) {
      loadLeaderboard(lbState.page + 1);
      document.getElementById('lb-rest')?.scrollIntoView({ behavior: 'smooth' });
    }
  });
  
  // Power success modal
  document.getElementById('power-success-modal')?.addEventListener('click', e => {
    if (e.target === document.getElementById('power-success-modal')) closePowerSuccessModal();
  });
  
  // Start
  init();
});
