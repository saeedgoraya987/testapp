/* ═══════════════════════════════════════════════════════════════
   FORGE Mini App — styles.css
   Design system: deep violet × amber × near-black
   ═══════════════════════════════════════════════════════════════ */

/* ── 1. CSS Variables ──────────────────────────────────────────── */
:root {
  --bg:        #060606;
  --surface:   #0C0C0C;
  --card:      #111111;
  --card-h:    #171717;
  --primary:   #6B7FFF;
  --primary-l: #9BABFF;
  --primary-d: rgba(107,127,255,0.10);
  --accent:    #6B7FFF;
  --accent-l:  #9BABFF;
  --accent-d:  rgba(107,127,255,0.10);
  --success:   #2DC89A;
  --danger:    #F04747;
  /* shared accent tones (also overridden per-page for tinted variants) */
  --tone-g:    #6B7FFF;
  --tone-o:    #6B7FFF;
  --tone-v:    #B96BFF;
  --tone-b:    #4F8EF7;
  --t1:        #F0F0F0;
  --t2:        rgba(240,240,240,0.55);
  --t3:        rgba(240,240,240,0.25);
  --t4:        rgba(240,240,240,0.09);
  --border:    rgba(255,255,255,0.06);
  --border-a:  rgba(107,127,255,0.35);
  --radius:    10px;
  --radius-sm: 7px;
  --nav-h:     54px;
  --hdr-h:     52px;
}

/* ── 2. Reset ──────────────────────────────────────────────────── */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  -webkit-text-size-adjust: 100%;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif;
  background: var(--bg);
  color: var(--t1);
  overflow: hidden;
  height: 100svh;
  -webkit-font-smoothing: antialiased;
}

button {
  cursor: pointer;
  border: none;
  background: none;
  color: inherit;
  font: inherit;
}

input {
  font: inherit;
  color: inherit;
}

::-webkit-scrollbar { width: 0; }

/* ── 3. App layout ─────────────────────────────────────────────── */
#app {
  display: flex;
  flex-direction: column;
  height: 100svh;
  overflow: hidden;
  position: relative;
}

.page {
  display: none;
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  /* clear the nav (content row + safe-area) so the last items aren't hidden */
  padding: 16px 16px calc(var(--nav-h) + env(safe-area-inset-bottom, 0px) + 20px);
  -webkit-overflow-scrolling: touch;
}

.page.active {
  display: block;
  animation: fadeIn 0.2s ease;
}

/* ── 4. Floating lang selector (no header bar) ─────────────────── */
.float-lang {
  position: fixed;
  top: 12px;
  right: 14px;
  z-index: 300;
}

/* ── 5. Nav ────────────────────────────────────────────────────── */
.nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  /* 54px content row + the device's bottom safe-area (home indicator).
     Adding the inset to height — not as inner padding — keeps the icons/
     labels fully visible above the iPhone home bar. */
  height: calc(var(--nav-h) + env(safe-area-inset-bottom, 0px));
  padding-bottom: env(safe-area-inset-bottom, 0px);
  background: rgba(6,6,6,0.96);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-top: 1px solid rgba(255,255,255,0.06);
  display: flex;
  z-index: 200;
}

.nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  border: none;
  background: none;
  color: rgba(160,170,255,0.18);
  cursor: pointer;
  padding: 0 4px 4px;
  -webkit-tap-highlight-color: transparent;
  transition: color 0.18s;
  position: relative;
}

/* Top indicator bar — only visible on active */
.nav-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: 28%;
  right: 28%;
  height: 2px;
  background: transparent;
  border-radius: 0 0 3px 3px;
  transition: background 0.18s;
}

.nav-item.active {
  color: var(--primary-l);
}

.nav-item.active::before {
  background: var(--primary);
}

.nav-icon svg {
  width: 20px;
  height: 20px;
  fill: currentColor;
  display: block;
  transition: filter 0.18s;
}

.nav-item.active .nav-icon svg {
  filter: drop-shadow(0 0 5px rgba(107,127,255,0.45));
}

/* Label always visible */
.nav-label {
  font-size: 9px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: inherit;
}

/* ═══════════════════════════════════════════════════════════════
   6. Mine / Home page — redesigned (mining ring · contracts)
   ═══════════════════════════════════════════════════════════════ */
.mn-page, #loading-screen { --ring: #7B6FFF; --ring-glow: rgba(107,127,255,0.6); }

/* ── Mining ring ── */
.mn-ring-section {
  display: flex;
  justify-content: center;
  padding: 18px 0 6px;
}
.mn-ring {
  position: relative;
  width: 220px;
  height: 220px;
  display: flex;
  align-items: center;
  justify-content: center;
}
/* outer rotating conic arc */
.mn-ring-spin {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: conic-gradient(from 0deg,
    transparent 0deg,
    rgba(139,64,216,0.06) 180deg,
    #8840D8 270deg,
    #4BB8FF 330deg,
    rgba(107,127,255,0.9) 350deg,
    transparent 360deg);
  -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 6px), #000 calc(100% - 5px));
          mask: radial-gradient(farthest-side, transparent calc(100% - 6px), #000 calc(100% - 5px));
  filter: drop-shadow(0 0 10px var(--ring-glow));
  animation: mnSpin 3.2s linear infinite;
}
@keyframes mnSpin { to { transform: rotate(360deg); } }
/* static inner ring */
.mn-ring-track {
  position: absolute;
  inset: 22px;
  border-radius: 50%;
  border: 1.5px solid rgba(107,127,255,0.18);
  box-shadow: 0 0 40px rgba(107,127,255,0.12) inset;
}
.mn-ring-core {
  position: absolute;
  inset: 34px;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: radial-gradient(circle, rgba(107,127,255,0.10), rgba(6,6,6,0) 70%);
}
.mn-ring-bolt {
  width: 64px;
  height: 64px;
  color: var(--ring);
  stroke-width: 1.6;
  filter: drop-shadow(0 0 14px var(--ring-glow));
  animation: mnPulse 2.4s ease-in-out infinite;
}
@keyframes mnPulse {
  0%, 100% { opacity: 0.9; filter: drop-shadow(0 0 10px var(--ring-glow)); }
  50%      { opacity: 1;   filter: drop-shadow(0 0 22px var(--ring-glow)); }
}
.mn-ring-label {
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0.32em;
  text-indent: 0.32em;
  color: var(--ring);
}
.mn-ring-photo {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
  box-shadow: 0 0 18px var(--ring-glow);
  animation: mnPulse 2.4s ease-in-out infinite;
}

/* ── HASHES balance ── */
.mn-hashes {
  text-align: center;
  padding: 6px 0 18px;
}
.pay-hero-modern {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* Glowing zap icon (matches Swap modal's green icon treatment) */
.pay-mod-icon {
  position: relative;
  width: 70px;
  height: 70px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle, rgba(107,127,255,0.22), rgba(107,127,255,0.04) 70%);
  margin-bottom: 12px;
}
.pay-mod-icon-ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  box-shadow:
    0 0 0 1px rgba(107,127,255,0.5),
    0 0 0 7px rgba(107,127,255,0.10),
    0 0 32px rgba(107,127,255,0.45);
  animation: wdRingPulse 2.6s ease-in-out infinite;
}
.pay-mod-icon svg {
  position: relative;
  width: 32px;
  height: 32px;
  color: var(--primary-l);
  filter: drop-shadow(0 0 10px rgba(107,127,255,0.55));
}
.pay-mod-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--t2);
  letter-spacing: 0.02em;
}

.pay-modern-power {
  font-size: 40px;
  font-weight: 800;
  color: var(--t1);
  letter-spacing: -1px;
  line-height: 1.1;
  margin-top: 4px;
}
.pay-modern-power span {
  font-size: 18px;
  color: var(--t2);
}
.pay-modern-bonus {
  font-size: 13px;
  font-weight: 800;
  color: var(--tone-v);
  margin-top: 8px;
  min-height: 20px;
}
.pay-modern-bonus:not(:empty) {
  padding: 5px 12px;
  border-radius: 20px;
  background: rgba(185,107,255,0.12);
  border: 1px solid rgba(185,107,255,0.3);
  margin-top: 10px;
}
.pay-modern-grid {
  width: 100%;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 20px;
}
.pay-mod-stat {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  text-align: left;
  background: rgba(255,255,255,0.03);
  border: 1px solid var(--border);
  padding: 14px;
  border-radius: 14px;
}
.pay-mod-stat .pm-ic {
  width: 30px;
  height: 30px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(107,127,255,0.10);
  border: 1px solid rgba(107,127,255,0.22);
  color: var(--primary-l);
  margin-bottom: 9px;
}
.pay-mod-stat .pm-ic svg { width: 15px; height: 15px; }
.pay-mod-stat .pm-ic--g {
  background: rgba(107,127,255,0.10);
  border-color: rgba(107,127,255,0.25);
  color: var(--tone-g);
}
.pay-mod-stat .pm-label {
  font-size: 11.5px;
  color: var(--t2);
  font-weight: 600;
  margin-bottom: 3px;
}
.pay-mod-stat .pm-val {
  font-size: 15px;
  color: var(--t1);
  font-weight: 800;
}
.tone-g-text {
  color: var(--tone-g) !important;
}

.mn-hashes-value {
  font-size: 40px;
  font-weight: 800;
  color: var(--t1);
  line-height: 1.05;
  letter-spacing: -0.5px;
  font-variant-numeric: tabular-nums;
}
.mn-hashes-label {
  font-size: 14px;
  color: var(--t2);
  margin-top: 6px;
}
.mn-hashes-ton {
  font-size: 13px;
  color: var(--t3);
  margin-top: 4px;
}
.mn-hashes-ton span { color: var(--t3); }

/* ── Stats strip ── */
.mn-stats {
  display: flex;
  align-items: center;
  padding: 16px 8px;
  margin-bottom: 22px;
  background: linear-gradient(180deg, var(--card-h), var(--card));
  border: 1px solid var(--border);
  border-radius: 16px;
  box-shadow: 0 8px 28px rgba(0,0,0,0.35);
}
.mn-stat {
  flex: 1;
  text-align: center;
  min-width: 0;
}
.mn-stat-div {
  width: 1px;
  align-self: stretch;
  margin: 2px 0;
  background: var(--border);
}
.mn-stat-val {
  font-size: 13px;
  color: var(--t3);
  font-weight: 500;
}
.mn-stat-val strong {
  font-size: 18px;
  font-weight: 800;
  color: var(--t1);
  letter-spacing: -0.3px;
}
.mn-stat-lbl {
  font-size: 11.5px;
  color: var(--t2);
  margin-top: 3px;
}

/* ── Section title ── */
.mn-section-title {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: var(--t3);
  margin-bottom: 12px;
}

/* ── Contracts ── */
.mn-contracts { margin-bottom: 20px; }
.mn-contracts-empty {
  text-align: center;
  padding: 22px;
  color: var(--t3);
  font-size: 13px;
}
.mn-contract {
  position: relative;
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 14px;
  margin-bottom: 12px;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 15px;
  overflow: hidden;
}
.mn-contract-icon {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  border-radius: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--primary-d);
  border: 1px solid rgba(107,127,255,0.28);
  color: var(--primary-l);
}
.mn-contract-icon svg { width: 24px; height: 24px; stroke-width: 1.9; }
.mn-contract-main { flex: 1; min-width: 0; }
.mn-contract-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.mn-contract-name {
  font-size: 16px;
  font-weight: 800;
  color: var(--t1);
}
.mn-contract-rate {
  flex-shrink: 0;
  font-size: 13px;
  color: var(--primary-l);
}
.mn-contract-rate strong {
  font-size: 16px;
  font-weight: 800;
  color: var(--primary-l);
}
.mn-contract-meta {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12.5px;
  color: var(--success);
  margin-top: 5px;
}
.mn-contract-meta svg { width: 14px; height: 14px; }
.mn-contract.is-urgent .mn-contract-meta { color: var(--accent-l); }
.mn-contract-meta--perm { color: var(--primary-l); }
.mn-contract-meta--perm svg { width: 16px; height: 16px; }

/* expiry progress bar */
.mn-contract-bar {
  position: relative;
  height: 6px;
  border-radius: 3px;
  background: rgba(255,255,255,0.07);
  margin-top: 10px;
  overflow: visible;
}
.mn-contract-bar-fill {
  height: 100%;
  border-radius: 3px;
  background: var(--success);
  box-shadow: 0 0 8px var(--success);
  transition: width 0.5s cubic-bezier(.4,0,.2,1);
}
.mn-contract.is-urgent .mn-contract-bar-fill {
  background: var(--accent);
  box-shadow: 0 0 8px var(--accent);
}
.mn-contract-pct {
  position: absolute;
  right: 0;
  top: -18px;
  font-size: 12px;
  font-weight: 800;
  color: var(--success);
}
.mn-contract.is-urgent .mn-contract-pct { color: var(--accent-l); }

/* permanent contract — violet "task reward" accent */
.mn-contract--perm .mn-contract-top { align-items: flex-start; }
.mn-contract-badge {
  flex-shrink: 0;
  padding: 4px 9px;
  border-radius: 7px;
  font-size: 9.5px;
  font-weight: 800;
  letter-spacing: 0.06em;
  color: #C79BFF;
  background: rgba(185,107,255,0.14);
  border: 1px solid rgba(185,107,255,0.3);
}
.mn-contract--perm {
  background:
    radial-gradient(120% 160% at 100% 50%, rgba(185,107,255,0.08), transparent 55%),
    var(--card);
}

/* ── Swap banner ── */
.mn-swap-banner {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 16px;
  margin-bottom: 14px;
  border: none;
  border-radius: 16px;
  cursor: pointer;
  text-align: left;
  background:
    radial-gradient(120% 180% at 0% 0%, rgba(75,184,255,0.22), transparent 50%),
    linear-gradient(135deg, rgba(107,127,255,0.20), rgba(136,64,216,0.14));
  border: 1px solid rgba(107,127,255,0.40);
  box-shadow: 0 8px 26px rgba(107,127,255,0.20);
  transition: transform 0.1s, filter 0.15s;
}
.mn-swap-banner:active { transform: scale(0.99); filter: brightness(1.06); }
.mn-swap-icon {
  flex-shrink: 0;
  width: 46px;
  height: 46px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(107,127,255,0.18);
  color: var(--primary-l);
}
.mn-swap-icon svg { width: 24px; height: 24px; filter: drop-shadow(0 0 8px rgba(107,127,255,0.6)); }
.mn-swap-text { flex: 1; min-width: 0; }
.mn-swap-title {
  font-size: 18px;
  font-weight: 800;
  color: var(--t1);
  letter-spacing: -0.2px;
}
.mn-swap-sub {
  font-size: 12.5px;
  color: var(--t2);
  margin-top: 3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.mn-swap-arrow { flex-shrink: 0; width: 22px; height: 22px; color: var(--primary-l); }

/* ── Quick actions ── */
.mn-actions {
  display: flex;
  gap: 10px;
}
.mn-action {
  flex: 1;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 14px;
  background: rgba(107,127,255,0.08);
  border: 1px solid var(--border-a);
  color: var(--primary-l);
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.1s, border-color 0.15s;
}
.mn-action svg { width: 18px; height: 18px; }
.mn-action:active { transform: scale(0.97); }
.mn-action--ghost {
  background: rgba(255,255,255,0.03);
  border: 1px solid var(--border);
  color: var(--t2);
}
.mn-action--ghost svg { color: var(--t2); }

/* legacy production button (kept, hidden by default) */
.btn-produce {
  width: 100%;
  height: 52px;
  background: linear-gradient(135deg, #4BB8FF, #8840D8);
  border: none;
  border-radius: 14px;
  color: #ffffff;
  font-size: 14px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  cursor: pointer;
  box-shadow: 0 6px 22px rgba(107,127,255,0.3);
  margin-bottom: 14px;
  transition: opacity 0.15s, transform 0.1s;
}
.btn-produce:disabled { opacity: 0.45; }
.btn-produce:active { transform: scale(0.98); }

/* ═══════════════════════════════════════════════════════════════
   7. Shop — redesigned (hero · rate card · TON+bonus packages)
   ═══════════════════════════════════════════════════════════════ */
.sh-page {
  --tone-g: #6B7FFF; --tone-g-d: rgba(107,127,255,0.12);
  --tone-b: #4F8EF7; --tone-b-d: rgba(79,142,247,0.14);
  --tone-v: #B96BFF; --tone-v-d: rgba(185,107,255,0.14);
  --tone-o: #6B7FFF; --tone-o-d: rgba(107,127,255,0.14);
}

/* ── Hero ── */
.sh-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 2px 10px;
}
.sh-hero-text { min-width: 0; }
.sh-hero-title {
  font-size: 32px;
  font-weight: 800;
  letter-spacing: -0.5px;
  line-height: 1.05;
  color: var(--t1);
}
.sh-hero-sub { font-size: 13.5px; color: var(--t2); margin-top: 6px; }
.sh-hero-art {
  position: relative;
  flex-shrink: 0;
  width: 104px;
  height: 104px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--primary-l);
}
.sh-hero-art svg { position: relative; width: 60px; height: 60px; filter: drop-shadow(0 6px 16px rgba(107,127,255,0.4)); }
.sh-hero-art-glow {
  position: absolute;
  inset: 10px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(107,127,255,0.36), transparent 68%);
  filter: blur(9px);
}

/* ── Tab bar ── */
.sh-tabbar {
  display: flex;
  gap: 18px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 16px;
}
.sh-tab {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 10px 2px;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  color: var(--t3);
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}
.sh-tab svg { width: 16px; height: 16px; }
.sh-tab.active { color: var(--primary-l); border-bottom-color: var(--primary); }

/* ── Rate card ── */
.sh-rate {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 15px 16px;
  margin-bottom: 16px;
  background: linear-gradient(180deg, var(--card-h), var(--card));
  border: 1px solid var(--border);
  border-radius: 16px;
}
.sh-rate-icon {
  flex-shrink: 0;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-a);
  color: var(--primary-l);
}
.sh-rate-icon svg { width: 20px; height: 20px; }
.sh-rate-title { font-size: 16px; font-weight: 700; color: var(--t1); }
.sh-rate-sub { font-size: 12.5px; color: var(--t2); margin-top: 3px; line-height: 1.4; }

/* ── Packages ── */
.sh-list { display: flex; flex-direction: column; gap: 12px; }
.sh-pkg {
  position: relative;
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 16px 14px;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 15px;
  transition: border-color 0.2s, transform 0.1s;
}
.sh-pkg:active { transform: scale(0.995); }
/* tone wiring for bonus chips */
.sh-pkg.tone-g { --tone: var(--tone-g); --tone-d: var(--tone-g-d); }
.sh-pkg.tone-b { --tone: var(--tone-b); --tone-d: var(--tone-b-d); }
.sh-pkg.tone-v { --tone: var(--tone-v); --tone-d: var(--tone-v-d); }
.sh-pkg.tone-o { --tone: var(--tone-o); --tone-d: var(--tone-o-d); }

.sh-pkg-icon {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  border-radius: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--tone-g-d);
  border: 1px solid rgba(107,127,255,0.28);
  color: var(--primary-l);
}
.sh-pkg-icon svg { width: 24px; height: 24px; filter: drop-shadow(0 0 8px rgba(107,127,255,0.5)); }

.sh-pkg-main { flex: 1; min-width: 0; }
.sh-pkg-power {
  font-size: 24px;
  font-weight: 800;
  color: var(--t1);
  letter-spacing: -0.4px;
  line-height: 1.05;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sh-pkg-power span { font-size: 14px; font-weight: 700; color: var(--t2); }
.sh-pkg-return {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: var(--t3);
  margin-top: 5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sh-pkg-return svg { width: 14px; height: 14px; flex-shrink: 0; }

.sh-pkg-bonus {
  flex-shrink: 0;
  padding: 6px 9px;
  border-radius: 9px;
  font-size: 12px;
  font-weight: 800;
  white-space: nowrap;
  color: var(--tone, var(--primary-l));
  background: var(--tone-d, var(--primary-d));
  border: 1px solid color-mix(in srgb, var(--tone, var(--primary)) 32%, transparent);
}
.sh-pkg-bonus small { font-size: 9px; font-weight: 700; opacity: 0.7; }

.sh-pkg-buy {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  flex-shrink: 0;
  min-width: 70px;
  padding: 11px 12px;
  border-radius: 12px;
  background: transparent;
  border: 1px solid var(--border-a);
  color: #ffffff;
  cursor: pointer;
  text-align: center;
  transition: background 0.15s, transform 0.1s;
}
.sh-pkg-buy strong { font-size: 18px; font-weight: 800; }
.sh-pkg-buy svg { width: 18px; height: 18px; margin-top: -1px; }
.sh-pkg-buy:active { background: rgba(107,127,255,0.12); transform: scale(0.96); }

/* ── Footer note ── */
.sh-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 16px;
  padding: 4px 2px;
}
.sh-footer-left, .sh-footer-right {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 12px;
}
.sh-footer-left { color: var(--t3); }
.sh-footer-left svg { width: 14px; height: 14px; }
.sh-footer-right { color: var(--primary-l); font-weight: 600; }

/* ═══════════════════════════════════════════════════════════════
   8. Leaderboard / Trophy — redesigned (hero · podium · rows)
   ═══════════════════════════════════════════════════════════════ */
.lb-page {
  --gold:   #6B7FFF;  --gold-d:   rgba(107,127,255,0.14);
  --silver: #AEB4C2;  --silver-d: rgba(174,180,194,0.12);
  --bronze: #C8895A;  --bronze-d: rgba(200,137,90,0.12);
}

/* ── Hero ── */
.lb-hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 2px 14px;
}
.lb-hero-text { min-width: 0; }
.lb-hero-eyebrow { margin-bottom: 8px; }
.lb-hero-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 13px;
  background: linear-gradient(140deg, rgba(107,127,255,0.18), rgba(107,127,255,0.04));
  border: 1px solid rgba(107,127,255,0.22);
  color: var(--primary-l);
  box-shadow: 0 0 26px rgba(107,127,255,0.18) inset;
}
.lb-hero-icon svg { width: 24px; height: 24px; }
.lb-hero-title {
  font-size: 32px;
  font-weight: 800;
  letter-spacing: -0.5px;
  line-height: 1.05;
  color: var(--t1);
}
.lb-hero-sub {
  font-size: 13.5px;
  color: var(--t2);
  margin-top: 6px;
  line-height: 1.4;
  max-width: 240px;
}
.lb-hero-art {
  position: relative;
  flex-shrink: 0;
  width: 104px;
  height: 104px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--primary-l);
}
.lb-hero-art svg { position: relative; width: 64px; height: 64px; filter: drop-shadow(0 6px 16px rgba(107,127,255,0.4)); }
.lb-hero-art-glow {
  position: absolute;
  inset: 8px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(107,127,255,0.38), transparent 68%);
  filter: blur(9px);
}

/* ── Season pill ── */
.lb-season {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin-top: 14px;
  padding: 8px 13px;
  border-radius: 11px;
  background: var(--card);
  border: 1px solid var(--border);
  font-size: 12.5px;
  color: var(--t2);
}
.lb-season svg { width: 15px; height: 15px; color: var(--primary-l); }
.lb-season strong { color: var(--t1); font-weight: 700; }
.lb-season-time { color: var(--primary-l); font-weight: 700; }

/* ── Podium ── */
.lb-podium {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 8px;
  margin: 10px 0 18px;
}
.lb-pod {
  position: relative;
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 8px 0;
  border-radius: 16px 16px 0 0;
  border: 1px solid var(--border);
  border-bottom: none;
}
/* order in DOM: 2nd, 1st, 3rd */
.lb-pod--2nd { background: linear-gradient(180deg, var(--silver-d), transparent 60%); border-color: rgba(174,180,194,0.25); }
.lb-pod--1st {
  background: linear-gradient(180deg, var(--gold-d), transparent 55%);
  border-color: rgba(107,127,255,0.4);
  padding-top: 24px;
  margin-bottom: 22px;          /* lifts the winner */
  box-shadow: 0 -4px 30px rgba(107,127,255,0.12);
}
.lb-pod--3rd { background: linear-gradient(180deg, var(--bronze-d), transparent 60%); border-color: rgba(200,137,90,0.3); }
.lb-pod--self { outline: 1px solid var(--primary); }

/* rank badge */
.lb-pod-badge {
  position: absolute;
  top: -13px;
  left: 50%;
  transform: translateX(-50%);
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 800;
  color: #0a0a0a;
  z-index: 3;
}
.lb-pod--1st .lb-pod-badge { background: linear-gradient(160deg, #A8BBFF, var(--gold)); box-shadow: 0 4px 12px rgba(107,127,255,0.5); }
.lb-pod--2nd .lb-pod-badge { background: linear-gradient(160deg, #E4E8F0, var(--silver)); }
.lb-pod--3rd .lb-pod-badge { background: linear-gradient(160deg, #E0A878, var(--bronze)); }

/* laurels around winner */
.lb-pod-laurel {
  position: absolute;
  top: 30px;
  color: var(--gold);
  opacity: 0.5;
  pointer-events: none;
}
.lb-pod-laurel svg { width: 30px; height: 54px; }
.lb-pod-laurel--l { left: 4px; transform: scaleX(-1); }
.lb-pod-laurel--r { right: 4px; }

.lb-pod-avatar {
  position: relative;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 700;
  color: var(--primary-l);
  background: var(--card-h);
  overflow: hidden;
  z-index: 2;
}
.lb-pod-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
.lb-pod-avatar-initials, .lb-row-avatar-initials {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 700;
}
.lb-pod--1st .lb-pod-avatar { width: 72px; height: 72px; border: 2px solid var(--gold); box-shadow: 0 0 18px rgba(107,127,255,0.4); }
.lb-pod--2nd .lb-pod-avatar { border: 2px solid var(--silver); }
.lb-pod--3rd .lb-pod-avatar { border: 2px solid var(--bronze); }

.lb-pod-name {
  font-size: 14px;
  font-weight: 700;
  color: var(--t1);
  margin-top: 10px;
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: center;
}
.lb-pod--1st .lb-pod-name { font-size: 15px; }
.lb-pod-power {
  font-size: 19px;
  font-weight: 800;
  letter-spacing: -0.4px;
  margin-top: 6px;
  font-variant-numeric: tabular-nums;
}
.lb-pod--1st .lb-pod-power { font-size: 22px; color: var(--gold); }
.lb-pod--2nd .lb-pod-power { color: var(--primary-l); }
.lb-pod--3rd .lb-pod-power { color: var(--bronze); }
.lb-pod-unit {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--t3);
  margin-top: 2px;
}

/* pedestal base */
.lb-pod-base {
  width: calc(100% + 2px);
  margin-top: 14px;
  border-radius: 6px 6px 0 0;
}
.lb-pod--1st .lb-pod-base { height: 26px; background: linear-gradient(180deg, var(--gold), rgba(107,127,255,0.35)); box-shadow: 0 0 24px rgba(107,127,255,0.3); }
.lb-pod--2nd .lb-pod-base { height: 16px; background: linear-gradient(180deg, var(--silver), rgba(174,180,194,0.3)); }
.lb-pod--3rd .lb-pod-base { height: 12px; background: linear-gradient(180deg, var(--bronze), rgba(200,137,90,0.3)); }

/* ── Your-rank badge ── */
.lb-user-rank {
  background: var(--primary-d);
  border: 1px solid var(--border-a);
  border-radius: 12px;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
}
.lb-user-rank-label { font-size: 12.5px; color: var(--t2); }
.lb-user-rank-val { font-size: 16px; font-weight: 800; color: var(--primary-l); margin-left: auto; }

/* ── Rest list ── */
.lb-rest {
  background: linear-gradient(180deg, var(--card-h), var(--card));
  border: 1px solid var(--border);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 8px 28px rgba(0,0,0,0.35);
}
.lb-row {
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 13px 15px;
  border-bottom: 1px solid var(--border);
  border-left: 2px solid transparent;
}
.lb-row:last-child { border-bottom: none; }
.lb-row.lb-self { border-left-color: var(--primary); background: var(--primary-d); }

.lb-row-rank {
  font-size: 15px;
  font-weight: 700;
  color: var(--t2);
  width: 22px;
  text-align: center;
  flex-shrink: 0;
}
.lb-row-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--card-h);
  border: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  color: var(--t2);
  overflow: hidden;
  flex-shrink: 0;
}
.lb-row-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }

.lb-row-name {
  flex: 1;
  min-width: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--t1);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.lb-self-badge {
  font-size: 9px;
  font-weight: 700;
  background: var(--primary);
  color: #ffffff;
  padding: 2px 6px;
  border-radius: 5px;
  margin-left: 8px;
  vertical-align: middle;
}
.lb-row-right { flex-shrink: 0; text-align: right; }
.lb-row-power {
  font-size: 17px;
  font-weight: 800;
  color: var(--primary-l);
  letter-spacing: -0.3px;
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
}
.lb-row-unit {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--t3);
}

/* ── Pagination ── */
.lb-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 16px 0 0;
}
.lb-page-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--card);
  border: 1px solid var(--border-a);
  color: var(--t1);
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: opacity 0.15s;
}
.lb-page-btn:disabled { opacity: 0.3; pointer-events: none; }
.lb-page-info { font-size: 13px; font-weight: 600; color: var(--t2); min-width: 48px; text-align: center; }

.lb-loading { text-align: center; padding: 20px; color: var(--t3); font-size: 13px; }

/* ── Promo banner ── */
.lb-promo {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 14px;
  margin-top: 16px;
  padding: 16px;
  border-radius: 16px;
  cursor: pointer;
  text-align: left;
  background:
    radial-gradient(120% 160% at 8% 0%, rgba(107,127,255,0.14), transparent 55%),
    linear-gradient(180deg, var(--card-h), var(--card));
  border: 1px solid rgba(107,127,255,0.2);
  transition: transform 0.1s, filter 0.15s;
}
.lb-promo:active { transform: scale(0.99); filter: brightness(1.05); }
.lb-promo-art {
  flex-shrink: 0;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle, rgba(107,127,255,0.28), rgba(107,127,255,0.05));
  border: 1px solid rgba(107,127,255,0.3);
  color: var(--primary-l);
  box-shadow: 0 0 22px rgba(107,127,255,0.22);
}
.lb-promo-art svg { width: 26px; height: 26px; filter: drop-shadow(0 0 8px rgba(107,127,255,0.6)); }
.lb-promo-text { flex: 1; min-width: 0; }
.lb-promo-title { font-size: 15px; font-weight: 800; color: var(--t1); }
.lb-promo-sub { font-size: 12.5px; color: var(--t2); margin-top: 4px; line-height: 1.4; }
.lb-promo-arrow { flex-shrink: 0; width: 20px; height: 20px; color: var(--primary-l); }

/* ── 9. Team ────────────────────────────────────────────────────── */

/* Team page — no side padding, sections handle their own.
   Shares the Tasks design system (tones, gradient tiles, glow). */
.tn-page {
  padding: 0 0 calc(var(--nav-h) + env(safe-area-inset-bottom, 0px) + 20px);
  --tone-g:  #6B7FFF;  --tone-g-d:  rgba(107,127,255,0.12);
  --tone-o:  #6B7FFF;  --tone-o-d:  rgba(107,127,255,0.12);
}

/* ── Hero ── */
.tn-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 18px 12px;
  overflow: hidden;
}

.tn-hero-left {
  flex: 1;
  min-width: 0;
}

.tn-hero-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 13px;
  margin-bottom: 10px;
  background: linear-gradient(140deg, rgba(107,127,255,0.18), rgba(107,127,255,0.04));
  border: 1px solid rgba(107,127,255,0.22);
  color: var(--primary-l);
  box-shadow: 0 0 26px rgba(107,127,255,0.18) inset;
}
.tn-hero-tag svg { width: 24px; height: 24px; }

.tn-hero-title {
  font-size: 34px;
  font-weight: 800;
  color: var(--t1);
  line-height: 1.05;
  letter-spacing: -0.5px;
  margin-bottom: 6px;
}

.tn-hero-sub {
  font-size: 13.5px;
  color: var(--t2);
  line-height: 1.4;
}

/* Hero art — glowing 3D-style group icon (matches Tasks hero art) */
.tn-hero-art {
  position: relative;
  width: 110px;
  height: 110px;
  flex-shrink: 0;
  margin-left: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--primary-l);
}
.tn-hero-art svg {
  position: relative;
  width: 72px;
  height: 72px;
  opacity: 0.95;
  filter: drop-shadow(0 6px 18px rgba(107,127,255,0.4));
}
.tn-hero-art-glow {
  position: absolute;
  inset: 14px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(107,127,255,0.4), transparent 68%);
  filter: blur(10px);
}

/* placeholder for future image */
.tn-hero-img { width: 110px; height: 110px; object-fit: contain; }

/* ── Reward rows ── */
.tn-rewards {
  background: linear-gradient(180deg, var(--card-h), var(--card));
  border-radius: 16px;
  margin: 8px 16px 12px;
  overflow: hidden;
  border: 1px solid var(--border);
  box-shadow: 0 8px 28px rgba(0,0,0,0.35);
}

.tn-reward-row {
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 15px 16px;
  border-bottom: 1px solid var(--border);
}

.tn-reward-row--last { border-bottom: none; }

.tn-reward-icon {
  width: 46px;
  height: 46px;
  border-radius: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.tn-reward-icon svg { width: 22px; height: 22px; stroke-width: 1.9; }

.tn-reward-icon--ref  {
  background: var(--tone-g-d); color: var(--tone-g);
  border: 1px solid rgba(107,127,255,0.28);
}
.tn-reward-icon--prem {
  background: var(--tone-o-d); color: var(--tone-o);
  border: 1px solid rgba(107,127,255,0.28);
}
.tn-reward-icon--comm {
  border-radius: 50%;
  background: rgba(255,255,255,0.05); color: var(--t2);
  border: 1px solid var(--border);
}

.tn-reward-info { flex: 1; min-width: 0; }

.tn-reward-name {
  font-size: 15px;
  font-weight: 700;
  color: var(--t1);
}

.tn-reward-desc {
  font-size: 12px;
  color: var(--t2);
  margin-top: 2px;
}

.tn-reward-val {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 3px;
}

.tn-reward-num {
  font-size: 19px;
  font-weight: 800;
  color: var(--t1);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.4px;
  line-height: 1;
}

.tn-reward-num--g { color: var(--tone-g); }
.tn-reward-num--o { color: var(--tone-o); }

.tn-reward-unit {
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--t3);
}

/* ── Stats with icons ── */
.tn-stats {
  background: linear-gradient(180deg, var(--card-h), var(--card));
  border-radius: 16px;
  margin: 0 16px 14px;
  border: 1px solid var(--border);
  overflow: hidden;
  box-shadow: 0 8px 28px rgba(0,0,0,0.35);
}

.tn-stat-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  border-bottom: 1px solid var(--border);
}

.tn-stat-row:last-child { border-bottom: none; }

.tn-stat-cell {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-right: 1px solid var(--border);
}

.tn-stat-cell:last-child { border-right: none; }

.tn-stat-icon {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.tn-stat-icon svg { width: 20px; height: 20px; stroke-width: 1.9; }

.tn-stat-icon--g { background: var(--tone-g-d); color: var(--tone-g); border: 1px solid rgba(107,127,255,0.24); }
.tn-stat-icon--o { background: var(--tone-o-d); color: var(--tone-o); border: 1px solid rgba(107,127,255,0.24); }

.tn-stat-body { min-width: 0; }

.tn-stat-num {
  font-size: 21px;
  font-weight: 800;
  color: var(--t1);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.4px;
  line-height: 1;
}

.tn-stat-num--g { color: var(--tone-g); }
.tn-stat-num--o { color: var(--tone-o); }

.tn-stat-lbl {
  font-size: 11.5px;
  color: var(--t2);
  margin-top: 4px;
}

/* ── Action buttons ── */
.tn-actions {
  display: flex;
  gap: 10px;
  margin: 0 16px 14px;
}

.tn-btn-share {
  flex: 1;
  height: 52px;
  background: linear-gradient(135deg, #4BB8FF, #8840D8);
  border: none;
  border-radius: 14px;
  color: #ffffff;
  font-size: 14.5px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  cursor: pointer;
  box-shadow: 0 6px 22px rgba(107,127,255,0.3);
  transition: opacity 0.15s, transform 0.1s, filter 0.15s;
}
.tn-btn-share svg { width: 18px; height: 18px; stroke-width: 2.2; }
.tn-btn-share:active { transform: scale(0.97); filter: brightness(1.08); }

.tn-btn-copy {
  flex: 1;
  height: 52px;
  background: rgba(255,255,255,0.04);
  border: 1px solid var(--border-a);
  border-radius: 14px;
  color: var(--t1);
  font-size: 14.5px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  transition: border-color 0.15s, transform 0.1s;
}
.tn-btn-copy svg { width: 17px; height: 17px; stroke-width: 2; color: var(--primary-l); }
.tn-btn-copy:active { transform: scale(0.97); }

/* ── Members card ── */
.tn-members-card {
  background: linear-gradient(180deg, var(--card-h), var(--card));
  border-radius: 16px;
  margin: 0 16px;
  border: 1px solid var(--border);
  overflow: hidden;
  box-shadow: 0 8px 28px rgba(0,0,0,0.35);
}

.tn-tabs-bar {
  display: flex;
  border-bottom: 1px solid var(--border);
}

.team-tab {
  flex: 1;
  height: 44px;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  color: var(--t3);
  font-size: 13px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
}

.team-tab.active {
  color: var(--primary-l);
  border-bottom-color: var(--primary);
}

.team-tab-panel { display: none; }
.team-tab-panel.active { display: block; }

.team-list { display: flex; flex-direction: column; }

/* Empty state */
.tn-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 36px 20px;
  gap: 12px;
}

.tn-empty-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  border-radius: 18px;
  margin-bottom: 4px;
  background: radial-gradient(circle, rgba(107,127,255,0.22), rgba(107,127,255,0.04));
  border: 1px solid rgba(107,127,255,0.2);
  color: var(--primary-l);
  box-shadow: 0 0 28px rgba(107,127,255,0.2);
}
.tn-empty-icon svg { width: 30px; height: 30px; stroke-width: 1.6; }

.tn-empty-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--t1);
}

.tn-empty-sub {
  font-size: 13px;
  color: var(--t3);
  text-align: center;
  line-height: 1.5;
}

/* Keep old .team-list-empty for JS-generated states */
.team-list-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 28px;
  color: var(--t3);
  font-size: 13px;
}

/* Member rows */
.team-member-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}

.team-member-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(107,127,255,0.14);
  border: 1px solid rgba(107,127,255,0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  color: var(--primary-l);
  flex-shrink: 0;
  overflow: hidden;
}

.team-member-avatar--photo { object-fit: cover; display: block; }
.team-member-info { flex: 1; min-width: 0; }

.team-member-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--t1);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.team-member-meta {
  font-size: 11px;
  color: var(--t3);
  margin-top: 2px;
}

.team-member-badge {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 3px 10px;
  border-radius: 20px;
  flex-shrink: 0;
}

.team-member-badge--valid   { background: rgba(107,127,255,0.16); color: var(--primary-l); }
.team-member-badge--pending { background: rgba(107,127,255,0.14); color: var(--accent); }
.team-member-badge--premium { background: rgba(107,127,255,0.22); color: #fff; }

/* Log rows */
.team-log-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}

.team-log-avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: rgba(255,255,255,0.06);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: var(--t2);
  flex-shrink: 0;
  overflow: hidden;
}

.team-log-avatar--photo { object-fit: cover; display: block; }
.team-log-body { flex: 1; min-width: 0; }

.team-log-desc {
  font-size: 12px;
  color: var(--t2);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.team-log-date {
  font-size: 10px;
  color: var(--t3);
  margin-top: 2px;
}

.team-log-amount {
  font-size: 14px;
  font-weight: 700;
  color: var(--primary-l);
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.team-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 14px 16px;
}

.team-pager-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: transparent;
  border: 1px solid rgba(255,255,255,0.14);
  color: var(--t1);
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: border-color 0.15s;
}

.team-pager-btn:disabled { opacity: 0.25; pointer-events: none; }

.team-pager-info {
  font-size: 12px;
  color: var(--t3);
  min-width: 60px;
  text-align: center;
}

/* ═══════════════════════════════════════════════════════════════
   10. TASKS — redesigned (stat cards · invite tiers · daily)
   ═══════════════════════════════════════════════════════════════ */
.tk-page {
  --tone-g:  #6B7FFF;  --tone-g-d:  rgba(107,127,255,0.12);
  --tone-o:  #6B7FFF;  --tone-o-d:  rgba(107,127,255,0.12);
  --tone-v:  #B96BFF;  --tone-v-d:  rgba(185,107,255,0.12);
  --tone-y:  #F2D24B;  --tone-y-d:  rgba(242,210,75,0.12);
}

/* ── Hero ── */
.tk-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 2px 8px;
}
.tk-hero-text { min-width: 0; }
.tk-hero-eyebrow { margin-bottom: 8px; }
.tk-hero-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 13px;
  background: linear-gradient(140deg, rgba(107,127,255,0.18), rgba(107,127,255,0.04));
  border: 1px solid rgba(107,127,255,0.22);
  color: var(--primary-l);
  box-shadow: 0 0 26px rgba(107,127,255,0.18) inset;
}
.tk-hero-icon svg { width: 24px; height: 24px; }
.tk-hero-title {
  font-size: 32px;
  font-weight: 800;
  letter-spacing: -0.5px;
  line-height: 1.05;
  color: var(--t1);
}
.tk-hero-sub {
  font-size: 13.5px;
  color: var(--t2);
  margin-top: 6px;
  line-height: 1.4;
}
.tk-hero-art {
  position: relative;
  flex-shrink: 0;
  width: 96px;
  height: 96px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--primary-l);
}
.tk-hero-art svg { width: 60px; height: 60px; opacity: 0.92; filter: drop-shadow(0 6px 16px rgba(107,127,255,0.35)); }
.tk-hero-art-glow {
  position: absolute;
  inset: 6px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(107,127,255,0.35), transparent 70%);
  filter: blur(8px);
}

/* ── Stat cards ── */
.tk-stats {
  display: flex;
  align-items: stretch;
  gap: 4px;
  padding: 16px 14px;
  margin: 8px 0 22px;
  background: linear-gradient(180deg, var(--card-h), var(--card));
  border: 1px solid var(--border);
  border-radius: 16px;
  box-shadow: 0 8px 28px rgba(0,0,0,0.35);
}
.tk-stat {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 11px;
  min-width: 0;
}
.tk-stat-div {
  width: 1px;
  align-self: stretch;
  margin: 4px 6px;
  background: var(--border);
}
.tk-stat-icon {
  width: 40px;
  height: 40px;
  border-radius: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.tk-stat-icon svg { width: 21px; height: 21px; }
.tk-stat-icon--earned { background: var(--tone-g-d); color: var(--tone-g); }
.tk-stat-icon--avail  { background: var(--tone-o-d); color: var(--tone-o); }
.tk-stat-body { min-width: 0; }
.tk-stat-label {
  font-size: 11.5px;
  color: var(--t2);
  font-weight: 500;
  margin-bottom: 2px;
}
.tk-stat-row { display: flex; align-items: baseline; gap: 5px; }
.tk-stat-num {
  font-size: 20px;
  font-weight: 800;
  letter-spacing: -0.4px;
  line-height: 1;
}
.tk-stat-num--earned { color: var(--tone-g); }
.tk-stat-num--avail  { color: var(--tone-o); }
.tk-stat-unit {
  font-size: 10px;
  font-weight: 700;
  color: var(--t3);
  letter-spacing: 0.5px;
}

/* ── Section header ── */
.tk-section { margin-bottom: 26px; }
.tk-section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 14px;
}
.tk-section-title {
  font-size: 19px;
  font-weight: 800;
  color: var(--t1);
  letter-spacing: -0.3px;
}
.tk-section-sub {
  font-size: 12.5px;
  color: var(--t2);
  margin-top: 3px;
}
.tk-section-badge {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border-radius: 20px;
  background: var(--primary-d);
  border: 1px solid var(--border-a);
  color: var(--primary-l);
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

/* ── Invite tier card ── */
.tk-invite-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 15px 14px;
  margin-bottom: 11px;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 15px;
  overflow: hidden;
  transition: border-color 0.2s, transform 0.12s, box-shadow 0.2s;
}
.tk-invite-card::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: radial-gradient(120% 140% at 0% 0%, var(--tone-card, transparent), transparent 55%);
  opacity: 0.5;
  pointer-events: none;
}
.tk-invite-card:active { transform: scale(0.992); }
.tk-invite-card.is-done { opacity: 0.72; }
.tk-invite-card.is-done .tk-invite-bar-fill { width: 100% !important; }
.tk-invite-card.is-eligible {
  border-color: var(--tone, var(--primary));
  box-shadow: 0 0 0 1px var(--tone, var(--primary)), 0 6px 22px rgba(0,0,0,0.3);
}
/* tone wiring */
.tk-invite-card.tone-g { --tone: var(--tone-g); --tone-d: var(--tone-g-d); --tone-card: rgba(107,127,255,0.06); }
.tk-invite-card.tone-o { --tone: var(--tone-o); --tone-d: var(--tone-o-d); --tone-card: rgba(107,127,255,0.06); }
.tk-invite-card.tone-v { --tone: var(--tone-v); --tone-d: var(--tone-v-d); --tone-card: rgba(185,107,255,0.06); }
.tk-invite-card.tone-y { --tone: var(--tone-y); --tone-d: var(--tone-y-d); --tone-card: rgba(242,210,75,0.06); }

.tk-invite-tile {
  position: relative;
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  border-radius: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--tone-d);
  border: 1px solid color-mix(in srgb, var(--tone) 35%, transparent);
  color: var(--tone);
}
.tk-invite-tile svg { width: 21px; height: 21px; stroke-width: 1.9; opacity: 0.9; }
.tk-invite-tile-num {
  position: absolute;
  top: -6px;
  right: -6px;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 9px;
  font-size: 10px;
  font-weight: 800;
  line-height: 1;
  color: #0a0a0a;
  background: var(--tone);
  box-shadow: 0 0 10px var(--tone);
}

.tk-invite-main { flex: 1; min-width: 0; }
.tk-invite-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--t1);
}
.tk-invite-desc {
  font-size: 11.5px;
  color: var(--t2);
  margin: 2px 0 9px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.tk-invite-progress {
  display: flex;
  align-items: center;
  gap: 10px;
}
.tk-invite-bar {
  flex: 1;
  height: 5px;
  border-radius: 3px;
  background: rgba(255,255,255,0.06);
  overflow: hidden;
}
.tk-invite-bar-fill {
  height: 100%;
  border-radius: 3px;
  background: var(--tone);
  box-shadow: 0 0 8px var(--tone);
  transition: width 0.5s cubic-bezier(.4,0,.2,1);
}
.tk-invite-count {
  flex-shrink: 0;
  font-size: 12px;
  font-weight: 700;
  color: var(--tone);
  white-space: nowrap;
}

.tk-invite-action { flex-shrink: 0; }
.tk-invite-reward {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 78px;
  padding: 9px 10px;
  border-radius: 11px;
  background: var(--tone-d);
  border: 1px solid color-mix(in srgb, var(--tone) 28%, transparent);
}
.tk-invite-reward-num {
  font-size: 17px;
  font-weight: 800;
  line-height: 1;
  color: var(--tone);
}
.tk-invite-reward-unit {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.5px;
  color: color-mix(in srgb, var(--tone) 70%, var(--t2));
  margin-top: 3px;
}
.tk-invite-claim {
  height: 38px;
  padding: 0 18px;
}
.tk-invite-claimed {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(107,127,255,0.16);
  border: 1px solid rgba(107,127,255,0.4);
  color: var(--tone-g);
}
.tk-invite-claimed svg { width: 18px; height: 18px; }

/* claim-in-flight feedback */
.tk-invite-card.claiming, .task-card.claiming {
  pointer-events: none;
  animation: tkClaimPulse 0.7s ease-in-out infinite;
}
@keyframes tkClaimPulse {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.55; }
}

/* ── Promo banner ── */
.tk-promo {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-top: 14px;
  padding: 16px 16px;
  border-radius: 16px;
  background:
    radial-gradient(120% 160% at 12% 0%, rgba(107,127,255,0.16), transparent 55%),
    linear-gradient(180deg, var(--card-h), var(--card));
  border: 1px solid rgba(107,127,255,0.2);
}
.tk-promo-art {
  flex-shrink: 0;
  width: 52px;
  height: 52px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle, rgba(107,127,255,0.3), rgba(107,127,255,0.05));
  color: var(--primary-l);
  box-shadow: 0 0 22px rgba(107,127,255,0.25);
}
.tk-promo-art svg { width: 26px; height: 26px; }
.tk-promo-text { flex: 1; min-width: 0; }
.tk-promo-title {
  font-size: 14.5px;
  font-weight: 800;
  color: var(--t1);
  line-height: 1.25;
}
.tk-promo-sub {
  font-size: 12px;
  color: var(--t2);
  margin-top: 4px;
  line-height: 1.4;
}
.tk-promo-chevron {
  flex-shrink: 0;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-a);
  color: var(--primary-l);
}
.tk-promo-chevron svg { width: 18px; height: 18px; }

/* ── Daily / generic task card ── */
.task-card {
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 14px;
  background: var(--card);
  border-radius: 15px;
  border: 1px solid var(--border);
  margin-bottom: 11px;
  transition: border-color 0.2s, opacity 0.2s, box-shadow 0.2s;
}
.task-card.eligible {
  border-color: var(--primary);
  box-shadow: 0 0 0 1px var(--primary), 0 6px 20px rgba(0,0,0,0.28);
}
.task-card.completed { opacity: 0.5; }

.task-icon {
  width: 46px;
  height: 46px;
  border-radius: 13px;
  background: var(--primary-d);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--primary-l);
}
.task-icon svg { width: 22px; height: 22px; stroke-width: 1.9; }
.icon-channel  { background: var(--accent-d); color: var(--accent-l); }
.icon-referral { background: var(--primary-d); color: var(--primary-l); }
.icon-slot     { background: rgba(185,107,255,0.12); color: #B96BFF; }
.icon-sponsor  { background: var(--accent-d); color: var(--accent-l); }
.icon-sponsor2 { background: rgba(185,107,255,0.12); color: #B96BFF; }

.task-body { flex: 1; min-width: 0; }
.task-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--t1);
}
.task-reward {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12.5px;
  font-weight: 700;
  color: var(--accent-l);
  margin-top: 4px;
}
.task-reward svg { width: 14px; height: 14px; }

.task-action { flex-shrink: 0; }
.task-btn-stack {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: flex-end;
}
.task-btn {
  height: 36px;
  padding: 0 16px;
  background: var(--primary);
  border: none;
  border-radius: 10px;
  color: #fff;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.15s, transform 0.1s, filter 0.15s;
}
.task-btn:active { transform: scale(0.95); filter: brightness(1.1); }
.task-btn.join {
  background: rgba(255,255,255,0.07);
  color: var(--t1);
  border: 1px solid var(--border);
}
.task-btn.roll, .task-btn.roll2 {
  background: linear-gradient(135deg, #4BB8FF, #8840D8);
  color: #ffffff;
}
.task-btn.locked, .task-btn:disabled,
.task-btn.sponsor-cooldown-btn {
  background: var(--card-h);
  color: var(--t3);
  border: 1px solid var(--border);
  cursor: default;
}
.task-btn.locked:active, .task-btn:disabled:active { transform: none; filter: none; }

.task-done-icon {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: rgba(107,127,255,0.16);
  border: 1px solid rgba(107,127,255,0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--success);
}
.task-done-icon svg { width: 17px; height: 17px; }

.task-card.completed .task-reward { color: var(--t3); }
.sponsor-cooldown, .slot-cooldown { opacity: 0.7; }

.tasks-all-done {
  text-align: center;
  padding: 24px;
  color: var(--t3);
}
.tasks-all-done-icon {
  font-size: 36px;
  margin-bottom: 12px;
  display: block;
  line-height: 1;
}
.tasks-all-done-title {
  font-size: 18px;
  font-weight: 800;
  color: var(--t1);
}
.tasks-all-done-sub {
  font-size: 13px;
  color: var(--t3);
  margin-top: 6px;
}

/* ── 11. Modals — shared base ──────────────────────────────────── */
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0,0,0,0.75);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  display: none;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.modal-overlay.open {
  display: flex;
}

.modal-overlay.open .modal-sheet {
  transform: scale(1);
  opacity: 1;
}

.modal-sheet {
  width: 100%;
  max-width: 400px;
  margin: auto 0;
  background:
    radial-gradient(120% 80% at 50% -10%, rgba(255,255,255,0.06), transparent 55%),
    linear-gradient(180deg, var(--card-h), var(--card));
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 24px;
  padding: 24px 20px 32px;
  max-height: 92svh;
  overflow-y: auto;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 16px;
  box-shadow: 0 24px 70px rgba(0,0,0,0.6), 0 0 50px rgba(255,255,255,0.02);
  transform: scale(0.9);
  opacity: 0;
  transition: transform 0.35s cubic-bezier(0.22,1,0.36,1), opacity 0.3s ease;
}

.modal-handle {
  display: none;
}

.modal-close {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--card-h);
  border: 1px solid var(--border);
  color: var(--t2);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
}

/* ── Dice modal ── */
.dice-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0,0,0,0.75);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  display: none;
  align-items: center;
  justify-content: center;
  padding: 20px 16px;
}

.dice-overlay.open {
  display: flex;
}

.dice-overlay.open .dice-sheet {
  transform: scale(1);
  opacity: 1;
}

.dice-sheet {
  position: relative;
  width: 100%;
  max-width: 400px;
  margin: auto 0;
  background:
    radial-gradient(120% 80% at 50% -10%, rgba(255,255,255,0.06), transparent 55%),
    linear-gradient(180deg, var(--card-h), var(--card));
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 24px;
  padding: 32px 24px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
  box-shadow: 0 24px 70px rgba(0,0,0,0.6), 0 0 50px rgba(255,255,255,0.02);
  transform: scale(0.9);
  opacity: 0;
  transition: transform 0.35s cubic-bezier(0.22,1,0.36,1), opacity 0.3s ease;
}

.dice-header {
  position: relative;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 4px;
}

.dice-title {
  font-size: 22px;
  font-weight: 900;
  color: var(--t1);
  text-align: center;
  width: 100%;
}

.dice-close {
  position: absolute;
  top: -16px;
  right: -12px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--card-h);
  border: 1px solid var(--border);
  color: var(--t3);
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.dice-sub {
  font-size: 14px;
  color: var(--t2);
  margin-bottom: 24px;
  text-align: center;
  width: 100%;
}

.dice-prize-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  width: 100%;
  margin: 10px 0 24px;
  background: var(--card-h);
  padding: 10px;
  border-radius: var(--radius);
}

.dice-prize-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--surface);
  padding: 8px 4px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
}

.dice-prize-item .face {
  font-size: 13px;
  font-weight: 800;
  color: var(--t2);
  margin-bottom: 2px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.dice-prize-item .reward {
  font-size: 15px;
  font-weight: 900;
  color: var(--accent);
}

.dice-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
  height: 100px;
}

.dice {
  width: 80px;
  height: 80px;
  background: var(--primary-d);
  border: 2px solid var(--primary);
  border-radius: 18px;
  position: relative;
  transition: transform 0.1s;
}

.dice-face {
  position: absolute;
  inset: 0;
  display: none;
  padding: 14px;
  box-sizing: border-box;
  grid-template-areas:
    "a . c"
    "e g f"
    "d . b";
  grid-template-columns: 1fr 1fr 1fr;
  grid-template-rows: 1fr 1fr 1fr;
}

.dice-face.active {
  display: grid;
}

.dice-face span {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--primary-l);
  justify-self: center;
  align-self: center;
}

.dice-face.face-1 span:nth-child(1) { grid-area: g; width: 18px; height: 18px; }
.dice-face.face-2 span:nth-child(1) { grid-area: a; }
.dice-face.face-2 span:nth-child(2) { grid-area: b; }
.dice-face.face-3 span:nth-child(1) { grid-area: a; }
.dice-face.face-3 span:nth-child(2) { grid-area: g; }
.dice-face.face-3 span:nth-child(3) { grid-area: b; }
.dice-face.face-4 span:nth-child(1) { grid-area: a; }
.dice-face.face-4 span:nth-child(2) { grid-area: c; }
.dice-face.face-4 span:nth-child(3) { grid-area: d; }
.dice-face.face-4 span:nth-child(4) { grid-area: b; }
.dice-face.face-5 span:nth-child(1) { grid-area: a; }
.dice-face.face-5 span:nth-child(2) { grid-area: c; }
.dice-face.face-5 span:nth-child(3) { grid-area: g; }
.dice-face.face-5 span:nth-child(4) { grid-area: d; }
.dice-face.face-5 span:nth-child(5) { grid-area: b; }
.dice-face.face-6 span:nth-child(1) { grid-area: a; }
.dice-face.face-6 span:nth-child(2) { grid-area: c; }
.dice-face.face-6 span:nth-child(3) { grid-area: e; }
.dice-face.face-6 span:nth-child(4) { grid-area: f; }
.dice-face.face-6 span:nth-child(5) { grid-area: d; }
.dice-face.face-6 span:nth-child(6) { grid-area: b; }

@keyframes dice-shake {
  0%   { transform: rotate(0deg) scale(1); }
  15%  { transform: rotate(-18deg) scale(1.08); }
  30%  { transform: rotate(14deg) scale(1.12); }
  45%  { transform: rotate(-10deg) scale(1.1); }
  60%  { transform: rotate(8deg) scale(1.06); }
  75%  { transform: rotate(-5deg) scale(1.03); }
  90%  { transform: rotate(3deg) scale(1.01); }
  100% { transform: rotate(0deg) scale(1); }
}

.dice.rolling {
  animation: dice-shake 0.7s ease-in-out forwards;
}

.dice-roll-btn {
  width: 100%;
  height: 48px;
  background: var(--primary);
  border: none;
  border-radius: var(--radius);
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  margin-top: 16px;
  transition: opacity 0.15s, transform 0.1s;
}

.dice-roll-btn:active {
  opacity: 0.85;
  transform: scale(0.97);
}

.dice-roll-btn:disabled {
  opacity: 0.5;
  pointer-events: none;
}

.dice-result-text {
  font-size: 16px;
  font-weight: 700;
  color: var(--t2);
  text-align: center;
  min-height: 22px;
  margin-bottom: 2px;
}

.dice-reward-text {
  font-size: 28px;
  font-weight: 900;
  color: var(--accent);
  min-height: 36px;
  margin-bottom: 8px;
  opacity: 0;
  transform: scale(0.7);
  transition: opacity 0.3s ease, transform 0.3s ease;
  line-height: 1;
}

.dice-reward-text.show {
  opacity: 1;
  transform: scale(1);
}

/* ── Slot modal ── */
.slot-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0,0,0,0.75);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  display: none;
  align-items: center;
  justify-content: center;
  padding: 20px 16px;
}

.slot-overlay.open {
  display: flex;
}

.slot-overlay.open .slot-sheet {
  transform: scale(1);
  opacity: 1;
}

.slot-sheet {
  position: relative;
  width: 100%;
  max-width: 400px;
  margin: auto 0;
  background:
    radial-gradient(120% 80% at 50% -10%, rgba(255,255,255,0.06), transparent 55%),
    linear-gradient(180deg, var(--card-h), var(--card));
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 24px;
  padding: 32px 24px 28px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
  box-shadow: 0 24px 70px rgba(0,0,0,0.6), 0 0 50px rgba(255,255,255,0.02);
  transform: scale(0.9);
  opacity: 0;
  transition: transform 0.35s cubic-bezier(0.22,1,0.36,1), opacity 0.3s ease;
}

.slot-header {
  position: relative;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 4px;
}

.slot-title {
  font-size: 22px;
  font-weight: 900;
  color: var(--t1);
  text-align: center;
  width: 100%;
}

.slot-close {
  position: absolute;
  top: -16px;
  right: -12px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--card-h);
  border: 1px solid var(--border);
  color: var(--t3);
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.slot-sub {
  font-size: 14px;
  color: var(--t2);
  font-weight: 500;
  text-align: center;
  width: 100%;
  margin-bottom: 18px;
}

.slot-prize-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  width: 100%;
  margin-bottom: 20px;
  background: var(--card-h);
  padding: 10px;
  border-radius: var(--radius);
}

.slot-prize-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--surface);
  padding: 8px 4px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
}

.slot-prize-item.slot-prize--star {
  border-color: rgba(107,127,255,0.4);
  background: rgba(107,127,255,0.06);
}

.slot-prize-symbols {
  font-size: 14px;
  letter-spacing: -1px;
  margin-bottom: 3px;
  line-height: 1;
}

.slot-prize-reward {
  font-size: 13px;
  font-weight: 900;
  color: var(--accent);
}

.slot-wrap {
  position: relative;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 18px;
}

.slot-machine-body {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  background: var(--bg);
  border-radius: var(--radius);
  padding: 16px 14px;
  box-shadow: 0 8px 28px rgba(0,0,0,0.35);
  width: 100%;
}

.slot-reel-box {
  flex: 1;
  height: 64px;
  width: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  line-height: 1;
  background: var(--card-h);
  border: 2px solid var(--border-a);
  border-radius: 10px;
  user-select: none;
  overflow: hidden;
}

.slot-reel-box span {
  display: block;
  transition: transform 0.08s;
}

.slot-reel-box.spinning span {
  animation: reelSpin 0.09s linear infinite;
}

.slot-reel-box.landed span {
  animation: reelLand 0.35s cubic-bezier(0.17,0.67,0.3,1.4) forwards;
}

@keyframes reelSpin {
  0%   { transform: translateY(0) scale(1); opacity: 1; }
  40%  { transform: translateY(-8px) scale(0.85); opacity: 0.5; }
  100% { transform: translateY(0) scale(1); opacity: 1; }
}

@keyframes reelLand {
  0%   { transform: scale(0.6) translateY(-10px); }
  65%  { transform: scale(1.18) translateY(3px); }
  100% { transform: scale(1) translateY(0); }
}

.slot-reel-divider {
  width: 2px;
  height: 50px;
  margin: 0 4px;
  background: var(--border-a);
  border-radius: 2px;
  flex-shrink: 0;
}

.slot-payline {
  position: absolute;
  left: 14px;
  right: 14px;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(124,58,237,0.6), transparent);
  border-radius: 2px;
  pointer-events: none;
}

.slot-result-sheet {
  gap: 10px;
}

.slot-result-reels {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: var(--bg);
  border-radius: var(--radius);
  padding: 18px 20px;
  width: 100%;
  box-shadow: 0 8px 28px rgba(0,0,0,0.35);
  margin-bottom: 4px;
}

.slot-result-reels span {
  font-size: 48px;
  line-height: 1;
  background: var(--card-h);
  border-radius: var(--radius-sm);
  width: 76px;
  height: 76px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border);
}

.slot-result-badge {
  font-size: 32px;
  font-weight: 900;
  line-height: 1.1;
  text-align: center;
}

.slot-result-power {
  font-size: 36px;
  font-weight: 900;
  color: var(--accent);
  text-align: center;
  line-height: 1;
  opacity: 0;
  transform: scale(0.7);
  transition: opacity 0.35s ease, transform 0.35s ease;
  min-height: 0;
}

.slot-result-power.show {
  opacity: 1;
  transform: scale(1);
  min-height: 44px;
}

.slot-result-msg {
  font-size: 14px;
  color: var(--t2);
  text-align: center;
  font-weight: 500;
  padding: 0 8px;
  line-height: 1.4;
}

.slot-result-timer-label {
  font-size: 11px;
  color: var(--t3);
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-top: 6px;
}

.slot-result-timer {
  font-size: 28px;
  font-weight: 900;
  color: var(--t1);
  text-align: center;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
}

.slot-result-close-btn {
  width: 100%;
  height: 48px;
  background: var(--primary);
  border: none;
  border-radius: var(--radius);
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  margin-top: 16px;
}

/* ── Withdraw modal ── */
#withdraw-modal {
  display: none;
}

#withdraw-modal.open {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.75);
  z-index: 1000;
}

/* ── Swap (withdraw) modal — Green accent, centered ── */
.wd-overlay {
  --ton: var(--primary);
  --ton-glow: rgba(107,127,255,0.55);
  align-items: center;          /* true vertical centering */
  justify-content: center;
  padding: 20px;
}

.wd-sheet {
  width: 100%;
  max-width: 400px;
  margin: auto 0;
  background:
    radial-gradient(120% 80% at 50% -10%, rgba(107,127,255,0.10), transparent 55%),
    linear-gradient(180deg, var(--card-h), var(--card));
  border: 1px solid rgba(107,127,255,0.4);
  border-radius: 24px;
  padding: 16px 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  box-shadow: 0 24px 70px rgba(0,0,0,0.6), 0 0 50px rgba(107,127,255,0.12);
  transform: scale(0.9);
  opacity: 0;
  transition: transform 0.35s cubic-bezier(0.22,1,0.36,1), opacity 0.3s ease;
}
.wd-overlay.open .wd-sheet { transform: scale(1); opacity: 1; }

.wd-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  width: 100%;
  text-align: center;
}

.wd-title {
  font-size: 20px;
  font-weight: 800;
  color: var(--t1);
  letter-spacing: -0.3px;
}
.wd-subtitle {
  font-size: 13px;
  color: var(--t2);
  margin-top: -6px;
  line-height: 1.4;
}

/* TON icon with concentric glow rings */
.wd-icon-wrap { margin-bottom: 2px; }
.wd-icon {
  position: relative;
  width: 54px;
  height: 54px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.wd-icon-ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  box-shadow:
    0 0 0 1px rgba(107,127,255,0.5),
    0 0 0 8px rgba(107,127,255,0.12),
    0 0 0 15px rgba(107,127,255,0.05),
    0 0 36px var(--ton-glow);
  animation: wdRingPulse 2.6s ease-in-out infinite;
}
@keyframes wdRingPulse {
  0%, 100% { box-shadow: 0 0 0 1px rgba(107,127,255,0.5), 0 0 0 8px rgba(107,127,255,0.12), 0 0 0 15px rgba(107,127,255,0.05), 0 0 30px var(--ton-glow); }
  50%      { box-shadow: 0 0 0 1px rgba(136,64,216,0.6), 0 0 0 9px rgba(136,64,216,0.16), 0 0 0 17px rgba(136,64,216,0.07), 0 0 44px var(--ton-glow); }
}
.wd-icon svg { position: relative; width: 32px; height: 32px; filter: drop-shadow(0 0 12px var(--ton-glow)); }
.wd-icon--progress {
  width: 64px; height: 64px;
  border-radius: 20px;
  background: var(--primary-d);
  border: 1px solid var(--border-a);
  box-shadow: 0 0 24px rgba(107,127,255,0.2);
}
.wd-icon--progress svg { width: 28px; height: 28px; stroke: var(--primary-l); stroke-width: 2; fill: none; filter: none; }

/* You'll receive — hero box */
.wd-receive-box {
  width: 100%;
  text-align: left;
  padding: 12px 14px;
  border-radius: 16px;
  background:
    radial-gradient(120% 200% at 100% 50%, rgba(107,127,255,0.10), transparent 60%),
    rgba(107,127,255,0.05);
  border: 1px solid rgba(107,127,255,0.4);
}
.wd-receive-label {
  font-size: 13px;
  color: var(--ton);
  font-weight: 600;
  margin-bottom: 2px;
}
.wd-receive-val {
  font-size: clamp(20px, 6.5vw, 30px);
  font-weight: 800;
  color: var(--ton);
  letter-spacing: -0.5px;
  line-height: 1.05;
  text-shadow: 0 0 18px rgba(107,127,255,0.4);
  word-wrap: break-word;
}

/* Rate rows */
.wd-rate-box {
  width: 100%;
  background: rgba(255,255,255,0.03);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 6px 16px;
  display: flex;
  flex-direction: column;
}
.wd-rate-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 0;
}
.wd-rate-label {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: var(--t2);
}
.wd-rate-ic {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border);
  color: var(--ton);
  flex-shrink: 0;
}
.wd-rate-ic svg { width: 16px; height: 16px; }
.wd-rate-val {
  font-size: 13.5px;
  font-weight: 700;
  color: var(--t1);
  text-align: right;
}
.accent-ton-text { color: var(--ton); }
.wd-rate-divider { height: 1px; background: var(--border); }

/* Amber warning */
.wd-notice {
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: 12px;
  color: var(--accent-l);
  background: var(--accent-d);
  border: 1px solid rgba(107,127,255,0.3);
  border-radius: 12px;
  padding: 8px 12px;
  line-height: 1.4;
  width: 100%;
  text-align: left;
}
.wd-notice svg { width: 18px; height: 18px; flex-shrink: 0; color: var(--accent); }

/* Continue button — primary gradient */
.wd-sheet .submit-btn.wd-continue-btn {
  height: 48px;
  border-radius: 14px;
  font-size: 16px;
  font-weight: 800;
  background: linear-gradient(135deg, var(--primary), var(--primary-l));
  color: #fff;
  box-shadow: 0 8px 26px var(--primary-d);
}
.wd-sheet .submit-btn.wd-continue-btn:active { filter: brightness(1.08); }

.wd-step-header {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  text-align: left;
}

.wd-step-header .wd-title {
  flex: 1;
}

.wd-back-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  flex-shrink: 0;
  background: var(--card-h);
  border: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--t2);
  cursor: pointer;
}

.wd-step-sub {
  font-size: 13px;
  color: var(--t3);
  line-height: 1.5;
  text-align: left;
  width: 100%;
}

.wd-progress-bar-wrap {
  width: 100%;
  height: 6px;
  background: var(--card-h);
  border-radius: 99px;
  overflow: hidden;
}

.wd-progress-bar {
  height: 100%;
  width: 0%;
  border-radius: 99px;
  background: var(--primary);
  transition: width 1.2s cubic-bezier(0.4,0,0.2,1);
}

/* ── Form elements ── */
.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--t3);
  text-transform: uppercase;
}

.form-optional {
  font-weight: 400;
  color: var(--t4);
}

.form-input {
  background: var(--card-h);
  border: 1px solid var(--border-a);
  border-radius: var(--radius-sm);
  color: var(--t1);
  font-size: 14px;
  height: 46px;
  padding: 0 14px;
  outline: none;
  width: 100%;
  transition: border-color 0.2s;
}

.form-input:focus {
  border-color: var(--primary);
}

.form-hint--error {
  font-size: 12px;
  color: var(--danger);
  min-height: 16px;
}

/* ── Payment modal ── */
/* Payment modal — centered, green glow (matches Swap modal) */
#pay-modal {
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.pay-sheet {
  width: 100%;
  max-width: 400px;
  margin: auto 0;
  border-radius: 24px;
  background:
    radial-gradient(120% 80% at 50% -10%, rgba(107,127,255,0.10), transparent 55%),
    linear-gradient(180deg, var(--card-h), var(--card));
  border: 1px solid rgba(107,127,255,0.4);
  box-shadow: 0 24px 70px rgba(0,0,0,0.6), 0 0 50px rgba(107,127,255,0.12);
  padding: 22px 20px 24px;
  gap: clamp(6px, 2vh, 12px);
  max-height: 92svh;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.pay-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: clamp(2px, 0.5vh, 6px);
}

.pay-hero-icon {
  width: clamp(36px, 8vw, 48px);
  height: clamp(36px, 8vw, 48px);
  border-radius: 14px;
  margin-bottom: clamp(2px, 0.8vh, 6px);
  background: var(--primary-d);
  border: 1px solid var(--border-a);
  display: flex;
  align-items: center;
  justify-content: center;
}

.pay-hero-icon svg {
  width: clamp(18px, 4vw, 24px);
  height: clamp(18px, 4vw, 24px);
  stroke: var(--primary-l);
  stroke-width: 2;
  fill: none;
}

.pay-hero-title {
  font-size: clamp(14px, 4vw, 18px);
  font-weight: 800;
  color: var(--t1);
}

.pay-hero-amount {
  font-size: clamp(20px, 6vw, 28px);
  font-weight: 900;
  color: var(--accent);
}

.pay-qr-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.pay-qr-img {
  width: clamp(72px, 22vw, 104px);
  height: clamp(72px, 22vw, 104px);
  border-radius: 10px;
  background: #fff;
  object-fit: contain;
  box-shadow: 0 4px 16px rgba(0,0,0,0.3);
  border: 3px solid #fff;
  padding: 2px;
}

.pay-field {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.pay-field-label {
  font-size: 10px;
  font-weight: 700;
  color: var(--t3);
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.pay-field-row {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--card-h);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: clamp(6px, 1.5vh, 10px) 12px;
}

.pay-field--memo .pay-field-row {
  background: rgba(107,127,255,0.06);
  border-color: rgba(107,127,255,0.3);
}

.pay-field-val {
  flex: 1;
  font-size: 12px;
  font-weight: 600;
  color: var(--t1);
  word-break: break-all;
  line-height: 1.4;
}

.pay-field-copy {
  width: 34px;
  height: 34px;
  border-radius: var(--radius-sm);
  flex-shrink: 0;
  background: var(--primary-d);
  border: 1px solid var(--border-a);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: opacity 0.15s, transform 0.1s;
}

.pay-field-copy:active {
  opacity: 0.7;
  transform: scale(0.92);
}

.pay-memo-warning {
  font-size: 11px;
  font-weight: 600;
  color: var(--accent-l);
  background: var(--accent-d);
  border: 1px solid rgba(107,127,255,0.35);
  border-radius: var(--radius-sm);
  padding: 6px 10px;
  line-height: 1.4;
}

.pay-tonconnect-btn {
  width: 100%;
  height: 54px;
  margin-top: 8px;
  padding: 0 16px;
  background: linear-gradient(135deg, #4BB8FF, #8840D8);
  border: none;
  border-radius: 14px;
  font-size: 16px;
  font-weight: 800;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  cursor: pointer;
  box-shadow: 0 8px 26px rgba(107,127,255,0.35);
  transition: filter 0.15s, transform 0.1s;
}
.pay-tonconnect-btn svg { filter: drop-shadow(0 1px 2px rgba(0,0,0,0.25)); }

.pay-tonconnect-btn:active {
  filter: brightness(1.08);
  transform: scale(0.98);
}

.pay-footer-note {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 11px;
  color: var(--t4);
  text-align: center;
}

.submit-btn {
  width: 100%;
  height: 48px;
  background: var(--primary);
  border: none;
  border-radius: var(--radius);
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  margin-top: 16px;
  transition: opacity 0.15s, transform 0.1s;
}

.submit-btn:active {
  opacity: 0.85;
  transform: scale(0.98);
}

.submit-btn:disabled {
  opacity: 0.45;
}

/* ── Power Success modal ── */
#power-success-modal {
  align-items: center;
  justify-content: center;
  padding: 20px;
}

#power-success-modal .ps-sheet {
  width: 100%;
  max-width: 360px;
  margin: auto 0;
  background:
    radial-gradient(120% 80% at 50% -10%, rgba(255,255,255,0.06), transparent 55%),
    linear-gradient(180deg, var(--card-h), var(--card));
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 24px;
  padding: 28px 24px 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  text-align: center;
  position: relative;
  overflow: hidden;
  box-shadow: 0 24px 70px rgba(0,0,0,0.6), 0 0 50px rgba(255,255,255,0.02);
  transform: scale(0.9);
  opacity: 0;
  transition: transform 0.35s cubic-bezier(0.22,1,0.36,1), opacity 0.3s ease;
}

#power-success-modal.open .ps-sheet {
  transform: scale(1);
  opacity: 1;
}

.ps-burst {
  position: absolute;
  top: 90px;
  left: 50%;
  width: 0;
  height: 0;
  pointer-events: none;
}

.ps-icon-wrap {
  position: relative;
  margin: 8px 0;
}

.ps-icon-ring {
  position: absolute;
  inset: -8px;
  border-radius: 50%;
  border: 2px solid var(--primary);
  opacity: 0.4;
  animation: pulse 2s ease infinite;
}

.ps-icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  color: #fff;
}

.ps-title {
  font-size: 22px;
  font-weight: 800;
  color: var(--t1);
}

.ps-package {
  font-size: 18px;
  font-weight: 800;
  color: var(--accent);
}

.ps-stats {
  display: flex;
  align-items: center;
  background: var(--card-h);
  border-radius: var(--radius);
  padding: 16px 0;
  width: 100%;
}

.ps-stat {
  flex: 1;
  text-align: center;
}

.ps-stat-label {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--t3);
}

.ps-stat-val {
  font-size: 16px;
  font-weight: 800;
  color: var(--t1);
  margin-top: 4px;
}

.ps-stat-div {
  width: 1px;
  height: 36px;
  background: var(--border);
  flex-shrink: 0;
}

.ps-close-btn {
  width: 100%;
  height: 48px;
  background: var(--primary);
  border: none;
  border-radius: var(--radius);
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  margin-top: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: opacity 0.15s, transform 0.1s;
}

.ps-close-btn:active {
  opacity: 0.85;
  transform: scale(0.98);
}

/* ── Alert / Input modal ── */
.alert-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.8);
  z-index: 1010;
  display: none;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.alert-overlay.open {
  display: flex;
}

.alert-overlay.open .alert-sheet {
  transform: scale(1);
  opacity: 1;
}

.alert-sheet {
  width: 100%;
  max-width: 360px;
  margin: auto 0;
  background:
    radial-gradient(120% 80% at 50% -10%, rgba(255,255,255,0.06), transparent 55%),
    linear-gradient(180deg, var(--card-h), var(--card));
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 24px;
  padding: 24px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 12px;
  box-shadow: 0 24px 70px rgba(0,0,0,0.6), 0 0 50px rgba(255,255,255,0.02);
  transform: scale(0.9);
  opacity: 0;
  transition: transform 0.35s cubic-bezier(0.22,1,0.36,1), opacity 0.3s ease;
}

.alert-display-icon {
  font-size: 36px;
  line-height: 1;
}

.alert-display-power {
  font-size: 28px;
  font-weight: 900;
  color: var(--primary-l);
}

.alert-badge {
  font-size: 14px;
  font-weight: 700;
  color: var(--t1);
}

.alert-msg {
  font-size: 13px;
  color: var(--t2);
  line-height: 1.5;
}

.alert-ok-btn {
  width: 100%;
  height: 48px;
  background: var(--primary);
  border: none;
  border-radius: var(--radius);
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  margin-top: 16px;
}

.input-modal-input {
  background: var(--card-h);
  border: 1px solid var(--border-a);
  border-radius: var(--radius-sm);
  color: var(--t1);
  font-size: 14px;
  height: 46px;
  padding: 0 14px;
  outline: none;
  width: 100%;
  transition: border-color 0.2s;
  font-family: inherit;
}

.input-modal-input:focus {
  border-color: var(--primary);
}

.input-modal-input::placeholder {
  color: var(--t3);
}

.input-modal-error {
  font-size: 12px;
  color: var(--danger);
  min-height: 16px;
  text-align: center;
}

/* ── 12. Loading screen ────────────────────────────────────────── */
#loading-screen {
  position: fixed;
  inset: 0;
  background: var(--bg);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  transition: opacity 0.5s cubic-bezier(0.4,0,0.2,1);
}

#loading-screen.hidden {
  opacity: 0;
  pointer-events: none;
}

.ls-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 24px;
}

.ls-logo {
  width: 80px;
  height: 80px;
  object-fit: contain;
  border-radius: 20px;
  box-shadow: 0 8px 32px rgba(107,127,255,0.4);
}

.ls-power-counter {
  font-size: 52px;
  font-weight: 900;
  color: var(--t1);
  font-variant-numeric: tabular-nums;
  min-width: 200px;
  text-align: center;
}

.ls-power-label {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--accent);
  margin-top: -8px;
}

.ls-bar {
  width: 200px;
  height: 4px;
  background: var(--card-h);
  border-radius: 2px;
  overflow: hidden;
}

.ls-bar-fill {
  height: 4px;
  background: var(--primary);
  border-radius: 2px;
  animation: barFill 2.5s ease-out forwards;
}

/* ── 13. Toast ─────────────────────────────────────────────────── */
.toast {
  position: fixed;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--card);
  border: 1px solid var(--border-a);
  border-radius: var(--radius-sm);
  color: var(--t1);
  font-size: 13px;
  font-weight: 600;
  padding: 10px 18px;
  opacity: 0;
  transition: opacity 0.3s;
  z-index: 9000;
  pointer-events: none;
  white-space: nowrap;
  box-shadow: 0 8px 32px rgba(0,0,0,0.4);
}

.toast.show {
  opacity: 1;
}

.toast.error {
  border-color: rgba(239,68,68,0.5);
  color: var(--danger);
}

.toast.success {
  border-color: rgba(16,185,129,0.4);
  color: var(--success);
}

/* ── 14. Utilities ─────────────────────────────────────────────── */
.accent-ton-text {
  color: #0098EA;
}

/* Lang selector */
.lang-selector {
  position: relative;
}

.lang-selector-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  color: var(--t2);
  font-size: 13px;
  transition: border-color 0.15s, color 0.15s;
}

.lang-selector-btn:hover {
  border-color: var(--primary);
  color: var(--t1);
}

.lang-selector-btn svg {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  fill: none;
  stroke: currentColor;
  transition: transform 0.2s;
}

.lang-selector-btn[aria-expanded="true"] svg {
  transform: rotate(180deg);
}

.lang-dropdown {
  position: absolute;
  right: 0;
  top: calc(100% + 8px);
  background: var(--card);
  border: 1px solid var(--border-a);
  border-radius: var(--radius);
  padding: 6px;
  min-width: 120px;
  list-style: none;
  z-index: 500;
  box-shadow: 0 8px 24px rgba(0,0,0,0.4);
}

.lang-dropdown li {
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--t2);
  transition: background 0.12s, color 0.12s;
}

.lang-dropdown li:hover {
  background: var(--card-h);
  color: var(--t1);
}

/* Lucide icon helpers */
i[data-lucide] {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

i[data-lucide] svg {
  display: block;
  stroke: currentColor;
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
}

[data-lucide="loader"] {
  animation: spin 1s linear infinite;
}

/* ── 15. Animations ────────────────────────────────────────────── */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 0.4; }
  50%       { transform: scale(1.12); opacity: 0.7; }
}

@keyframes barFill {
  from { width: 0%; }
  to   { width: 100%; }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes shimmer {
  0%   { left: -100%; }
  100% { left: 130%; }
}
