(function () {
  'use strict';
  if (window.__AutoAds) return;
  window.__AutoAds = true;

  var CFG = {
    sdkFn: 'show_',
    storageKey: 'aa_auto_v1', lockKey: 'aa_auto_lock_v1', sessionKey: 'aa_auto_session_v1',
    slotCount: 25,
    slotUnlockMs: 60 * 60 * 1000,
    autoDelaysMs: [50000, 180000, 120000],
    sessionResetAfterMs: 60 * 1000,
    sdkRetryMs: 10 * 1000,
    noResponseMs: 8 * 1000, lockMs: 15 * 1000,
    requireTelegram: false
  };

  function now(){ return Date.now(); }
  function log(){ try{ console.info.apply(console, arguments); }catch(e){} }
  function err(){ try{ console.error.apply(console, arguments); }catch(e){} }
  function read(){ try{ var p = JSON.parse(localStorage.getItem(CFG.storageKey) || '{}'); return (p && typeof p === 'object') ? p : {}; }catch(e){ return {}; } }
  function write(s){ try{ localStorage.setItem(CFG.storageKey, JSON.stringify(s)); }catch(e){} }
  function markPageSession(){ try{ sessionStorage.setItem(CFG.sessionKey, String(now())); }catch(e){} }
  function isNewPageSession(){ try{ var a = !!sessionStorage.getItem(CFG.sessionKey); markPageSession(); return !a; }catch(e){ return true; } }

  function normalizeSlots(slots){
    var n = Array.isArray(slots) ? slots.slice(0, CFG.slotCount).map(function(v){ return Number(v) || 0; }) : [];
    while (n.length < CFG.slotCount) n.push(0);
    return n;
  }
  function normalize(state){
    var t = now();
    state.slots = normalizeSlots(state.slots);
    state.totalShown = Number(state.totalShown) || 0;
    if (!Number.isFinite(state.sessionStartAt)) state.sessionStartAt = t;
    if (!Number.isFinite(state.nextDueAt)) { state.lastDelayMs = CFG.autoDelaysMs[0]; state.nextDueAt = state.sessionStartAt + CFG.autoDelaysMs[0]; }
    return state;
  }
  function randomDelay(){ return CFG.autoDelaysMs[Math.floor(Math.random() * CFG.autoDelaysMs.length)] || CFG.autoDelaysMs[0]; }
  function availableSlot(state, t){ return state.slots.findIndex(function(u){ return !u || (t - u) >= CFG.slotUnlockMs; }); }
  function nextUnlockAt(state){ var u = []; state.slots.forEach(function(used){ if (used) u.push(used + CFG.slotUnlockMs); }); return u.length ? Math.min.apply(Math, u) : now() + CFG.autoDelaysMs[0]; }
  function hasTelegram(){ var tg = window.Telegram && window.Telegram.WebApp; var raw = (location.hash || '') + '&' + (location.search || ''); return !!(tg && tg.initData) || raw.indexOf('tgWebAppData=') >= 0; }
  function canRun(){ return CFG.requireTelegram ? hasTelegram() : true; }
  function acquireLock(t){ try{ var u = Number(localStorage.getItem(CFG.lockKey) || 0); if (u && u > t) return false; localStorage.setItem(CFG.lockKey, String(t + CFG.lockMs)); return true; }catch(e){ return true; } }
  function releaseLock(){ try{ localStorage.removeItem(CFG.lockKey); }catch(e){} }
  function scheduleNext(state, t){ var d = randomDelay(); state.lastDelayMs = d; state.nextDueAt = t + d; }
  function resetSessionClock(state, t){ state.sessionStartAt = t; state.lastDelayMs = CFG.autoDelaysMs[0]; state.nextDueAt = t + CFG.autoDelaysMs[0]; write(state); markPageSession(); }

  function markUsed(state, t){
    var slot = availableSlot(state, t); if (slot < 0) return false;
    state.slots[slot] = t; state.totalShown++; state.lastShownAt = t;
    scheduleNext(state, t); write(state);
    log('[AutoAds] shown', { slot: slot + 1, of: CFG.slotCount, total: state.totalShown, nextInMs: state.lastDelayMs });
    return true;
  }
  function delayUntil(state, t){
    if (availableSlot(state, t) < 0) return Math.max(nextUnlockAt(state), t + 1000);
    return Math.max(state.nextDueAt || t, t + 1000);
  }

  function callMonetag(state, t){
    var fn = window[CFG.sdkFn];
    if (typeof fn !== 'function') { err('[AutoAds] SDK fn missing:', CFG.sdkFn); return false; }
    var answered = false;
    var noResp = setTimeout(function(){ if (!answered) err('[AutoAds] show() no response in', CFG.noResponseMs, 'ms'); }, CFG.noResponseMs);
    try {
      var result = fn();
      var used = markUsed(state, t);
      if (result && typeof result.then === 'function')
        result.then(function(r){ answered = true; clearTimeout(noResp); log('[AutoAds] resolved', r); })
              .catch(function(e){ answered = true; clearTimeout(noResp); err('[AutoAds] rejected', e); });
      else { answered = true; clearTimeout(noResp); }
      return used;
    } catch (e) { answered = true; clearTimeout(noResp); err('[AutoAds] threw', e); return false; }
  }

  var timer = null, hiddenAt = 0;
  function plan(){
    if (timer) clearTimeout(timer);
    var t = now(), state = normalize(read()); write(state);
    timer = setTimeout(tick, Math.max(1000, Math.min(delayUntil(state, t) - t, 2147483647)));
  }
  function tick(){
    var t = now(), state = normalize(read());
    if (!canRun())                   { state.nextDueAt = t + CFG.sdkRetryMs; write(state); plan(); return; }
    if (t < (state.nextDueAt || 0))  { plan(); return; }
    if (availableSlot(state, t) < 0) { state.nextDueAt = Math.max(nextUnlockAt(state), state.nextDueAt || 0); write(state); plan(); return; }
    if (!acquireLock(t))             { plan(); return; }
    try { if (!callMonetag(state, t)) { state.nextDueAt = t + CFG.sdkRetryMs; write(state); } }
    finally { releaseLock(); plan(); }
  }
  function startFresh(){ resetSessionClock(normalize(read()), now()); plan(); }
  function boot(){ if (isNewPageSession()) startFresh(); else plan(); }

  window.AutoAds = { plan: plan, reset: startFresh, state: function(){ return normalize(read()); } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
  document.addEventListener('visibilitychange', function(){
    if (document.hidden) { hiddenAt = now(); return; }
    if (hiddenAt && (now() - hiddenAt) >= CFG.sessionResetAfterMs) startFresh(); else plan();
    hiddenAt = 0;
  });
})();
