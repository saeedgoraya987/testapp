const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ── Logging middleware ──
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ── In-memory Database ──
const DB = {
  users: new Map(),
  deposits: new Map(),
  depositId: 0
};

// ── Configuration ──
const CONFIG = {
  HASH_TO_TON: 0.0000144,
  DAILY_HASHES_PER_1K: 602,
  WD_MIN_HASHES: 1000,
  TON_PER_POWER: 0.0000085,
  POWER_LIFETIME_HOURS: 24,
  POWER_ROI_TARGET: 1.1,
  REF_BONUS_REGULAR: 2000,
  REF_BONUS_PREMIUM: 4000,
  WD_MIN_REFERRALS: 3,
  SLOT_COOLDOWN_MINUTES: 15,
  AD_COOLDOWN_HOURS: 24
};

// ── Helper Functions ──
function generateId() {
  return Date.now().toString(36) + crypto.randomBytes(4).toString('hex');
}

function getUserIdFromInitData(initData) {
  try {
    if (initData.startsWith('{')) {
      const data = JSON.parse(initData);
      return data.user?.id?.toString() || null;
    }
    const params = new URLSearchParams(initData);
    const userStr = params.get('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      return user.id.toString();
    }
    return null;
  } catch {
    return null;
  }
}

function getUser(id) {
  if (!DB.users.has(id)) {
    // Only create user if we have a valid ID
    if (!id) return null;
    
    DB.users.set(id, {
      id: id,
      telegram_id: parseInt(id) || 0,
      first_name: '',
      last_name: '',
      username: '',
      photo_url: '',
      hashes: 0,
      power: 0,
      balance: 0,
      contracts: [],
      referrals: [],
      referral_count: 0,
      valid_refs: 0,
      invalid_refs: 0,
      power_from_refs: 0,
      welcome_bonus_power: 1000,
      welcome_bonus_claimed: false,
      created_at: Date.now(),
      language: 'en',
      ad_claimed_today: false,
      ad_next_claim_at: 0,
      ad2_claimed_today: false,
      ad2_next_claim_at: 0,
      slot_next_spin_at: 0,
      tasks_completed: []
    });
  }
  return DB.users.get(id);
}

function saveUser(user) {
  DB.users.set(user.id, user);
}

function calculateHashesPerDay(power) {
  return (power / 1000) * CONFIG.DAILY_HASHES_PER_1K;
}

// ── API Routes ──

// ── Auth ──
app.post('/miniapp/auth', (req, res) => {
  const { initData } = req.body;
  
  if (!initData) {
    return res.json({ ok: false, error: 'Invalid initData' });
  }

  const userId = getUserIdFromInitData(initData);
  if (!userId) {
    return res.json({ ok: false, error: 'User ID not found' });
  }
  
  const user = getUser(userId);
  if (!user) {
    return res.json({ ok: false, error: 'User creation failed' });
  }
  
  // Update user info from initData
  try {
    if (initData.startsWith('{')) {
      const data = JSON.parse(initData);
      if (data.user) {
        user.first_name = data.user.first_name || user.first_name || 'User';
        user.last_name = data.user.last_name || user.last_name || '';
        user.username = data.user.username || user.username || '';
        user.photo_url = data.user.photo_url || user.photo_url || '';
        user.language_code = data.user.language_code || user.language_code || 'en';
      }
    } else {
      // Try URLSearchParams
      const params = new URLSearchParams(initData);
      const userStr = params.get('user');
      if (userStr) {
        const data = JSON.parse(userStr);
        user.first_name = data.first_name || user.first_name || 'User';
        user.last_name = data.last_name || user.last_name || '';
        user.username = data.username || user.username || '';
        user.photo_url = data.photo_url || user.photo_url || '';
        user.language_code = data.language_code || user.language_code || 'en';
      }
    }
  } catch (e) {
    console.log('[DEBUG] Error parsing user data:', e.message);
  }
  
  // Check if user has POWER but no active contract - create one automatically
  if (user.power > 0 && user.contracts.length === 0) {
    console.log(`[DEBUG] Creating automatic contract for user ${userId} with ${user.power} POWER`);
    const contract = {
      id: generateId(),
      power: user.power,
      hashes_per_day: calculateHashesPerDay(user.power),
      amount: user.power,
      duration: CONFIG.POWER_LIFETIME_HOURS,
      seconds_left: CONFIG.POWER_LIFETIME_HOURS * 60 * 60,
      progress: 0,
      permanent: false,
      active: true,
      expired: false,
      created_at: Date.now(),
      expiresAt: Date.now() + CONFIG.POWER_LIFETIME_HOURS * 60 * 60 * 1000
    };
    user.contracts.push(contract);
    saveUser(user);
  }
  
  // Update existing contracts
  let needsUpdate = false;
  user.contracts = user.contracts.map(c => {
    if (!c.hashes_per_day || c.hashes_per_day === 0) {
      c.hashes_per_day = calculateHashesPerDay(c.power || c.amount || 1000);
      needsUpdate = true;
    }
    if (c.active && !c.expired) {
      const elapsed = (Date.now() - c.created_at) / 1000;
      c.seconds_left = Math.max(0, (c.duration * 60 * 60) - elapsed);
      c.progress = Math.min(1, elapsed / (c.duration * 60 * 60));
      if (c.seconds_left <= 0) {
        c.active = false;
        c.expired = true;
      }
    }
    return c;
  });
  
  if (needsUpdate) {
    saveUser(user);
  }
  
  res.json({
    ok: true,
    user: {
      ...user,
      hash_to_ton: CONFIG.HASH_TO_TON,
      base_hashes_per_1k_per_day: CONFIG.DAILY_HASHES_PER_1K,
      ton_per_power: CONFIG.TON_PER_POWER,
      wd_min_hashes: CONFIG.WD_MIN_HASHES,
      power_lifetime_hours: CONFIG.POWER_LIFETIME_HOURS,
      power_roi_target: CONFIG.POWER_ROI_TARGET,
      ref_bonus_regular: CONFIG.REF_BONUS_REGULAR,
      ref_bonus_premium: CONFIG.REF_BONUS_PREMIUM,
      wd_min_referrals: CONFIG.WD_MIN_REFERRALS,
      app_name: 'Open Swap',
      bot_username: 'OpenSwapBot'
    }
  });
});

app.post('/miniapi/auth', (req, res) => {
  const { initData } = req.body;
  
  if (!initData) {
    return res.json({ ok: false, error: 'Invalid initData' });
  }

  const userId = getUserIdFromInitData(initData);
  if (!userId) {
    return res.json({ ok: false, error: 'User ID not found' });
  }
  
  const user = getUser(userId);
  if (!user) {
    return res.json({ ok: false, error: 'User creation failed' });
  }
  
  // Update user info from initData
  try {
    if (initData.startsWith('{')) {
      const data = JSON.parse(initData);
      if (data.user) {
        user.first_name = data.user.first_name || user.first_name || 'User';
        user.last_name = data.user.last_name || user.last_name || '';
        user.username = data.user.username || user.username || '';
        user.photo_url = data.user.photo_url || user.photo_url || '';
        user.language_code = data.user.language_code || user.language_code || 'en';
      }
    } else {
      const params = new URLSearchParams(initData);
      const userStr = params.get('user');
      if (userStr) {
        const data = JSON.parse(userStr);
        user.first_name = data.first_name || user.first_name || 'User';
        user.last_name = data.last_name || user.last_name || '';
        user.username = data.username || user.username || '';
        user.photo_url = data.photo_url || user.photo_url || '';
        user.language_code = data.language_code || user.language_code || 'en';
      }
    }
  } catch (e) {
    console.log('[DEBUG] Error parsing user data:', e.message);
  }
  
  if (user.power > 0 && user.contracts.length === 0) {
    console.log(`[DEBUG] Creating automatic contract for user ${userId} with ${user.power} POWER`);
    const contract = {
      id: generateId(),
      power: user.power,
      hashes_per_day: calculateHashesPerDay(user.power),
      amount: user.power,
      duration: CONFIG.POWER_LIFETIME_HOURS,
      seconds_left: CONFIG.POWER_LIFETIME_HOURS * 60 * 60,
      progress: 0,
      permanent: false,
      active: true,
      expired: false,
      created_at: Date.now(),
      expiresAt: Date.now() + CONFIG.POWER_LIFETIME_HOURS * 60 * 60 * 1000
    };
    user.contracts.push(contract);
    saveUser(user);
  }
  
  let needsUpdate = false;
  user.contracts = user.contracts.map(c => {
    if (!c.hashes_per_day || c.hashes_per_day === 0) {
      c.hashes_per_day = calculateHashesPerDay(c.power || c.amount || 1000);
      needsUpdate = true;
    }
    if (c.active && !c.expired) {
      const elapsed = (Date.now() - c.created_at) / 1000;
      c.seconds_left = Math.max(0, (c.duration * 60 * 60) - elapsed);
      c.progress = Math.min(1, elapsed / (c.duration * 60 * 60));
      if (c.seconds_left <= 0) {
        c.active = false;
        c.expired = true;
      }
    }
    return c;
  });
  
  if (needsUpdate) {
    saveUser(user);
  }
  
  res.json({
    ok: true,
    user: {
      ...user,
      hash_to_ton: CONFIG.HASH_TO_TON,
      base_hashes_per_1k_per_day: CONFIG.DAILY_HASHES_PER_1K,
      ton_per_power: CONFIG.TON_PER_POWER,
      wd_min_hashes: CONFIG.WD_MIN_HASHES,
      power_lifetime_hours: CONFIG.POWER_LIFETIME_HOURS,
      power_roi_target: CONFIG.POWER_ROI_TARGET,
      ref_bonus_regular: CONFIG.REF_BONUS_REGULAR,
      ref_bonus_premium: CONFIG.REF_BONUS_PREMIUM,
      wd_min_referrals: CONFIG.WD_MIN_REFERRALS,
      app_name: 'Open Swap',
      bot_username: 'OpenSwapBot'
    }
  });
});

// ── Welcome Bonus ──
app.post('/miniapp/claim-welcome-bonus', (req, res) => {
  console.log('[DEBUG] Welcome bonus endpoint hit!');
  const { initData } = req.body;
  const userId = getUserIdFromInitData(initData);
  if (!userId) {
    return res.json({ ok: false, error: 'User ID not found' });
  }
  
  const user = getUser(userId);
  if (!user) {
    return res.json({ ok: false, error: 'User not found' });
  }
  
  if (user.welcome_bonus_claimed) {
    return res.json({ ok: false, error: 'already claimed' });
  }

  const bonus = user.welcome_bonus_power || 1000;
  user.power = (user.power || 0) + bonus;
  user.welcome_bonus_claimed = true;
  
  const contract = {
    id: generateId(),
    power: bonus,
    hashes_per_day: calculateHashesPerDay(bonus),
    amount: bonus,
    duration: CONFIG.POWER_LIFETIME_HOURS,
    seconds_left: CONFIG.POWER_LIFETIME_HOURS * 60 * 60,
    progress: 0,
    permanent: false,
    active: true,
    expired: false,
    created_at: Date.now(),
    expiresAt: Date.now() + CONFIG.POWER_LIFETIME_HOURS * 60 * 60 * 1000
  };
  user.contracts.push(contract);
  
  saveUser(user);
  
  console.log(`[DEBUG] Welcome bonus claimed: ${bonus} POWER for user ${userId}`);
  res.json({
    ok: true,
    bonus: bonus,
    new_power: user.power,
    contract: contract
  });
});

app.post('/miniapi/claim-welcome-bonus', (req, res) => {
  console.log('[DEBUG] Welcome bonus endpoint hit (miniapi)!');
  const { initData } = req.body;
  const userId = getUserIdFromInitData(initData);
  if (!userId) {
    return res.json({ ok: false, error: 'User ID not found' });
  }
  
  const user = getUser(userId);
  if (!user) {
    return res.json({ ok: false, error: 'User not found' });
  }
  
  if (user.welcome_bonus_claimed) {
    return res.json({ ok: false, error: 'already claimed' });
  }

  const bonus = user.welcome_bonus_power || 1000;
  user.power = (user.power || 0) + bonus;
  user.welcome_bonus_claimed = true;
  
  const contract = {
    id: generateId(),
    power: bonus,
    hashes_per_day: calculateHashesPerDay(bonus),
    amount: bonus,
    duration: CONFIG.POWER_LIFETIME_HOURS,
    seconds_left: CONFIG.POWER_LIFETIME_HOURS * 60 * 60,
    progress: 0,
    permanent: false,
    active: true,
    expired: false,
    created_at: Date.now(),
    expiresAt: Date.now() + CONFIG.POWER_LIFETIME_HOURS * 60 * 60 * 1000
  };
  user.contracts.push(contract);
  
  saveUser(user);
  
  console.log(`[DEBUG] Welcome bonus claimed: ${bonus} POWER for user ${userId}`);
  res.json({
    ok: true,
    bonus: bonus,
    new_power: user.power,
    contract: contract
  });
});

// ── Get User ──
app.get('/miniapp/user/:userId', (req, res) => {
  const { userId } = req.params;
  
  if (!DB.users.has(userId)) {
    return res.status(404).json({ ok: false, error: 'User not found' });
  }
  
  const user = getUser(userId);
  res.json({ ok: true, user });
});

app.get('/miniapi/user/:userId', (req, res) => {
  const { userId } = req.params;
  
  if (!DB.users.has(userId)) {
    return res.status(404).json({ ok: false, error: 'User not found' });
  }
  
  const user = getUser(userId);
  res.json({ ok: true, user });
});

// ── Get Contracts ──
app.get('/miniapp/user/contracts', (req, res) => {
  const { userId } = req.query;
  
  if (!userId || !DB.users.has(userId)) {
    return res.json({ ok: false, error: 'User not found' });
  }
  
  const user = getUser(userId);
  res.json({ ok: true, contracts: user.contracts || [] });
});

app.get('/miniapi/user/contracts', (req, res) => {
  const { userId } = req.query;
  
  if (!userId || !DB.users.has(userId)) {
    return res.json({ ok: false, error: 'User not found' });
  }
  
  const user = getUser(userId);
  res.json({ ok: true, contracts: user.contracts || [] });
});

// ── TON Price ──
app.get('/miniapp/ton-price', (req, res) => {
  res.json({ ok: true, price: 3.0 });
});

app.get('/miniapi/ton-price', (req, res) => {
  res.json({ ok: true, price: 3.0 });
});

// ── Start Production ──
app.post('/miniapp/start-production', (req, res) => {
  const { initData } = req.body;
  const userId = getUserIdFromInitData(initData);
  if (!userId) {
    return res.json({ ok: false, error: 'User ID not found' });
  }
  
  const user = getUser(userId);
  if (!user) {
    return res.json({ ok: false, error: 'User not found' });
  }
  
  const hasActiveContract = user.contracts.some(c => c.active && !c.expired);
  if (hasActiveContract) {
    return res.json({ ok: false, error: 'Already mining' });
  }
  
  const powerToUse = user.power || 1000;
  const contract = {
    id: generateId(),
    power: powerToUse,
    hashes_per_day: calculateHashesPerDay(powerToUse),
    amount: powerToUse,
    duration: CONFIG.POWER_LIFETIME_HOURS,
    seconds_left: CONFIG.POWER_LIFETIME_HOURS * 60 * 60,
    progress: 0,
    permanent: false,
    active: true,
    expired: false,
    created_at: Date.now(),
    expiresAt: Date.now() + CONFIG.POWER_LIFETIME_HOURS * 60 * 60 * 1000
  };
  
  user.contracts.push(contract);
  saveUser(user);
  
  res.json({
    ok: true,
    ends_at: contract.expiresAt,
    total_hashes: user.hashes || 0
  });
});

app.post('/miniapi/start-production', (req, res) => {
  const { initData } = req.body;
  const userId = getUserIdFromInitData(initData);
  if (!userId) {
    return res.json({ ok: false, error: 'User ID not found' });
  }
  
  const user = getUser(userId);
  if (!user) {
    return res.json({ ok: false, error: 'User not found' });
  }
  
  const hasActiveContract = user.contracts.some(c => c.active && !c.expired);
  if (hasActiveContract) {
    return res.json({ ok: false, error: 'Already mining' });
  }
  
  const powerToUse = user.power || 1000;
  const contract = {
    id: generateId(),
    power: powerToUse,
    hashes_per_day: calculateHashesPerDay(powerToUse),
    amount: powerToUse,
    duration: CONFIG.POWER_LIFETIME_HOURS,
    seconds_left: CONFIG.POWER_LIFETIME_HOURS * 60 * 60,
    progress: 0,
    permanent: false,
    active: true,
    expired: false,
    created_at: Date.now(),
    expiresAt: Date.now() + CONFIG.POWER_LIFETIME_HOURS * 60 * 60 * 1000
  };
  
  user.contracts.push(contract);
  saveUser(user);
  
  res.json({
    ok: true,
    ends_at: contract.expiresAt,
    total_hashes: user.hashes || 0
  });
});

// ── Buy Power ──
app.post('/miniapp/buy-power', (req, res) => {
  const { initData, power_amount } = req.body;
  const userId = getUserIdFromInitData(initData);
  if (!userId) {
    return res.json({ ok: false, error: 'User ID not found' });
  }
  
  const user = getUser(userId);
  if (!user) {
    return res.json({ ok: false, error: 'User not found' });
  }
  
  const tonCost = power_amount * CONFIG.TON_PER_POWER;
  
  DB.depositId++;
  const depositId = DB.depositId;
  const memo = `P${depositId}`;
  
  const deposit = {
    id: depositId,
    userId,
    power: power_amount,
    tonCost,
    memo,
    status: 'pending',
    created_at: Date.now()
  };
  DB.deposits.set(depositId, deposit);
  
  res.json({
    ok: true,
    deposit_address: 'UQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABkZGVm',
    ton_cost: tonCost,
    memo: memo,
    deposit_id: depositId
  });
});

app.post('/miniapi/buy-power', (req, res) => {
  const { initData, power_amount } = req.body;
  const userId = getUserIdFromInitData(initData);
  if (!userId) {
    return res.json({ ok: false, error: 'User ID not found' });
  }
  
  const user = getUser(userId);
  if (!user) {
    return res.json({ ok: false, error: 'User not found' });
  }
  
  const tonCost = power_amount * CONFIG.TON_PER_POWER;
  
  DB.depositId++;
  const depositId = DB.depositId;
  const memo = `P${depositId}`;
  
  const deposit = {
    id: depositId,
    userId,
    power: power_amount,
    tonCost,
    memo,
    status: 'pending',
    created_at: Date.now()
  };
  DB.deposits.set(depositId, deposit);
  
  res.json({
    ok: true,
    deposit_address: 'UQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABkZGVm',
    ton_cost: tonCost,
    memo: memo,
    deposit_id: depositId
  });
});

// ── Poll Deposit ──
app.get('/miniapp/poll-deposit', (req, res) => {
  const { initData } = req.query;
  const userId = getUserIdFromInitData(initData);
  if (!userId) {
    return res.json({ ok: false, error: 'User ID not found' });
  }
  
  const user = getUser(userId);
  if (!user) {
    return res.json({ ok: false, error: 'User not found' });
  }
  
  let lastDepositId = 0;
  let lastDepositPower = 0;
  
  for (const [id, deposit] of DB.deposits) {
    if (deposit.userId === userId && deposit.status === 'completed') {
      if (id > lastDepositId) {
        lastDepositId = id;
        lastDepositPower = deposit.power || 0;
        deposit.status = 'claimed';
      }
    }
  }
  
  res.json({
    ok: true,
    last_deposit_id: lastDepositId,
    last_deposit_power: lastDepositPower,
    power: user.power
  });
});

app.get('/miniapi/poll-deposit', (req, res) => {
  const { initData } = req.query;
  const userId = getUserIdFromInitData(initData);
  if (!userId) {
    return res.json({ ok: false, error: 'User ID not found' });
  }
  
  const user = getUser(userId);
  if (!user) {
    return res.json({ ok: false, error: 'User not found' });
  }
  
  let lastDepositId = 0;
  let lastDepositPower = 0;
  
  for (const [id, deposit] of DB.deposits) {
    if (deposit.userId === userId && deposit.status === 'completed') {
      if (id > lastDepositId) {
        lastDepositId = id;
        lastDepositPower = deposit.power || 0;
        deposit.status = 'claimed';
      }
    }
  }
  
  res.json({
    ok: true,
    last_deposit_id: lastDepositId,
    last_deposit_power: lastDepositPower,
    power: user.power
  });
});

// ── Claim (Mine HASHES) ──
app.post('/miniapp/claim', (req, res) => {
  const { initData } = req.body;
  const userId = getUserIdFromInitData(initData);
  if (!userId) {
    return res.json({ ok: false, error: 'User ID not found' });
  }
  
  const user = getUser(userId);
  if (!user) {
    return res.json({ ok: false, error: 'User not found' });
  }
  
  let totalHashes = user.hashes || 0;
  
  user.contracts = user.contracts.map(c => {
    if (c.permanent) return c;
    if (c.expired) return c;
    
    const elapsed = Date.now() - c.created_at;
    const maxDuration = c.duration * 60 * 60 * 1000;
    const progress = Math.min(elapsed / maxDuration, 1);
    c.progress = progress;
    c.seconds_left = Math.max(0, (c.duration * 60 * 60) - (elapsed / 1000));
    
    if (progress >= 1) {
      c.active = false;
      c.expired = true;
    }
    
    if (c.active) {
      const hashesPerDay = c.hashes_per_day || calculateHashesPerDay(c.power || c.amount || 1000);
      const earned = (hashesPerDay / 86400) * (elapsed / 1000);
      totalHashes += earned;
    }
    
    return c;
  });
  
  user.hashes = totalHashes;
  saveUser(user);
  
  res.json({
    ok: true,
    total_hashes: totalHashes
  });
});

app.post('/miniapi/claim', (req, res) => {
  const { initData } = req.body;
  const userId = getUserIdFromInitData(initData);
  if (!userId) {
    return res.json({ ok: false, error: 'User ID not found' });
  }
  
  const user = getUser(userId);
  if (!user) {
    return res.json({ ok: false, error: 'User not found' });
  }
  
  let totalHashes = user.hashes || 0;
  
  user.contracts = user.contracts.map(c => {
    if (c.permanent) return c;
    if (c.expired) return c;
    
    const elapsed = Date.now() - c.created_at;
    const maxDuration = c.duration * 60 * 60 * 1000;
    const progress = Math.min(elapsed / maxDuration, 1);
    c.progress = progress;
    c.seconds_left = Math.max(0, (c.duration * 60 * 60) - (elapsed / 1000));
    
    if (progress >= 1) {
      c.active = false;
      c.expired = true;
    }
    
    if (c.active) {
      const hashesPerDay = c.hashes_per_day || calculateHashesPerDay(c.power || c.amount || 1000);
      const earned = (hashesPerDay / 86400) * (elapsed / 1000);
      totalHashes += earned;
    }
    
    return c;
  });
  
  user.hashes = totalHashes;
  saveUser(user);
  
  res.json({
    ok: true,
    total_hashes: totalHashes
  });
});

// ── Mine (incremental) ──
app.post('/miniapp/mine', (req, res) => {
  const { initData } = req.body;
  const userId = getUserIdFromInitData(initData);
  if (!userId) {
    return res.json({ ok: false, error: 'User ID not found' });
  }
  
  const user = getUser(userId);
  if (!user) {
    return res.json({ ok: false, error: 'User not found' });
  }
  
  const activeContracts = user.contracts.filter(c => c.active && !c.expired);
  let totalHashesPerDay = 0;
  
  activeContracts.forEach(c => {
    totalHashesPerDay += c.hashes_per_day || calculateHashesPerDay(c.power || c.amount || 1000);
  });
  
  const hashesPerSecond = totalHashesPerDay / 86400;
  const earned = hashesPerSecond * 60;
  
  user.hashes = (user.hashes || 0) + earned;
  saveUser(user);
  
  res.json({
    ok: true,
    earned: earned.toFixed(8),
    total: user.hashes.toFixed(8)
  });
});

app.post('/miniapi/mine', (req, res) => {
  const { initData } = req.body;
  const userId = getUserIdFromInitData(initData);
  if (!userId) {
    return res.json({ ok: false, error: 'User ID not found' });
  }
  
  const user = getUser(userId);
  if (!user) {
    return res.json({ ok: false, error: 'User not found' });
  }
  
  const activeContracts = user.contracts.filter(c => c.active && !c.expired);
  let totalHashesPerDay = 0;
  
  activeContracts.forEach(c => {
    totalHashesPerDay += c.hashes_per_day || calculateHashesPerDay(c.power || c.amount || 1000);
  });
  
  const hashesPerSecond = totalHashesPerDay / 86400;
  const earned = hashesPerSecond * 60;
  
  user.hashes = (user.hashes || 0) + earned;
  saveUser(user);
  
  res.json({
    ok: true,
    earned: earned.toFixed(8),
    total: user.hashes.toFixed(8)
  });
});

// ── Tasks ──
app.get('/miniapp/tasks', (req, res) => {
  const { initData } = req.query;
  const userId = getUserIdFromInitData(initData);
  if (!userId) {
    return res.json({ ok: false, error: 'User ID not found' });
  }
  
  const user = getUser(userId);
  if (!user) {
    return res.json({ ok: false, error: 'User not found' });
  }
  
  const tasks = [
    {
      id: 'invite_1',
      type: 'referral',
      labelEn: 'Invite 1 Friend',
      required: 1,
      pips: 2000,
      eligible: user.referral_count >= 1,
      completed: user.tasks_completed.includes('invite_1')
    },
    {
      id: 'invite_3',
      type: 'referral',
      labelEn: 'Invite 3 Friends',
      required: 3,
      pips: 3000,
      eligible: user.referral_count >= 3,
      completed: user.tasks_completed.includes('invite_3')
    },
    {
      id: 'invite_5',
      type: 'referral',
      labelEn: 'Invite 5 Friends',
      required: 5,
      pips: 5000,
      eligible: user.referral_count >= 5,
      completed: user.tasks_completed.includes('invite_5')
    },
    {
      id: 'invite_10',
      type: 'referral',
      labelEn: 'Invite 10 Friends',
      required: 10,
      pips: 10000,
      eligible: user.referral_count >= 10,
      completed: user.tasks_completed.includes('invite_10')
    },
    {
      id: 'channel',
      type: 'channel',
      labelEn: 'Join Our Channel',
      channel_url: '@openswap_channel',
      pips: 500,
      eligible: true,
      completed: user.tasks_completed.includes('channel')
    },
    {
      id: 'ad_roll',
      type: 'ad',
      labelEn: 'Daily Roll',
      pips: 5,
      eligible: !user.ad_claimed_today || Date.now() > user.ad_next_claim_at,
      completed: false,
      ad_claimed_today: user.ad_claimed_today || false,
      next_claim_at: user.ad_next_claim_at || 0
    },
    {
      id: 'ad2_roll',
      type: 'ad2',
      labelEn: '6h Roll',
      pips: 1,
      eligible: !user.ad2_claimed_today || Date.now() > user.ad2_next_claim_at,
      completed: false,
      ad_claimed_today: user.ad2_claimed_today || false,
      next_claim_at: user.ad2_next_claim_at || 0
    }
  ];
  
  res.json({
    ok: true,
    tasks: tasks,
    referral_count: user.referral_count || 0,
    slot_on_cooldown: Date.now() < user.slot_next_spin_at,
    slot_next_spin_at: user.slot_next_spin_at || 0
  });
});

app.get('/miniapi/tasks', (req, res) => {
  const { initData } = req.query;
  const userId = getUserIdFromInitData(initData);
  if (!userId) {
    return res.json({ ok: false, error: 'User ID not found' });
  }
  
  const user = getUser(userId);
  if (!user) {
    return res.json({ ok: false, error: 'User not found' });
  }
  
  const tasks = [
    {
      id: 'invite_1',
      type: 'referral',
      labelEn: 'Invite 1 Friend',
      required: 1,
      pips: 2000,
      eligible: user.referral_count >= 1,
      completed: user.tasks_completed.includes('invite_1')
    },
    {
      id: 'invite_3',
      type: 'referral',
      labelEn: 'Invite 3 Friends',
      required: 3,
      pips: 3000,
      eligible: user.referral_count >= 3,
      completed: user.tasks_completed.includes('invite_3')
    },
    {
      id: 'invite_5',
      type: 'referral',
      labelEn: 'Invite 5 Friends',
      required: 5,
      pips: 5000,
      eligible: user.referral_count >= 5,
      completed: user.tasks_completed.includes('invite_5')
    },
    {
      id: 'invite_10',
      type: 'referral',
      labelEn: 'Invite 10 Friends',
      required: 10,
      pips: 10000,
      eligible: user.referral_count >= 10,
      completed: user.tasks_completed.includes('invite_10')
    },
    {
      id: 'channel',
      type: 'channel',
      labelEn: 'Join Our Channel',
      channel_url: '@openswap_channel',
      pips: 500,
      eligible: true,
      completed: user.tasks_completed.includes('channel')
    },
    {
      id: 'ad_roll',
      type: 'ad',
      labelEn: 'Daily Roll',
      pips: 5,
      eligible: !user.ad_claimed_today || Date.now() > user.ad_next_claim_at,
      completed: false,
      ad_claimed_today: user.ad_claimed_today || false,
      next_claim_at: user.ad_next_claim_at || 0
    },
    {
      id: 'ad2_roll',
      type: 'ad2',
      labelEn: '6h Roll',
      pips: 1,
      eligible: !user.ad2_claimed_today || Date.now() > user.ad2_next_claim_at,
      completed: false,
      ad_claimed_today: user.ad2_claimed_today || false,
      next_claim_at: user.ad2_next_claim_at || 0
    }
  ];
  
  res.json({
    ok: true,
    tasks: tasks,
    referral_count: user.referral_count || 0,
    slot_on_cooldown: Date.now() < user.slot_next_spin_at,
    slot_next_spin_at: user.slot_next_spin_at || 0
  });
});

// ── Task Claim ──
app.post('/miniapp/tasks/claim', (req, res) => {
  const { initData, task_id } = req.body;
  const userId = getUserIdFromInitData(initData);
  if (!userId) {
    return res.json({ ok: false, error: 'User ID not found' });
  }
  
  const user = getUser(userId);
  if (!user) {
    return res.json({ ok: false, error: 'User not found' });
  }
  
  const task = [
    { id: 'invite_1', required: 1, pips: 2000 },
    { id: 'invite_3', required: 3, pips: 3000 },
    { id: 'invite_5', required: 5, pips: 5000 },
    { id: 'invite_10', required: 10, pips: 10000 },
    { id: 'channel', required: 0, pips: 500 },
    { id: 'ad_roll', required: 0, pips: 5 },
    { id: 'ad2_roll', required: 0, pips: 1 }
  ].find(t => t.id === task_id);
  
  if (!task) {
    return res.json({ ok: false, error: 'Invalid task' });
  }
  
  if (user.tasks_completed.includes(task_id)) {
    return res.json({ ok: false, error: 'already completed' });
  }
  
  if (task_id.startsWith('invite_')) {
    if (user.referral_count < task.required) {
      return res.json({ ok: false, error: 'not enough referrals', required: task.required });
    }
  }
  
  if (task_id === 'ad_roll') {
    if (user.ad_claimed_today && Date.now() < user.ad_next_claim_at) {
      return res.json({ ok: false, error: 'cooldown', next_claim_at: user.ad_next_claim_at });
    }
    user.ad_claimed_today = true;
    user.ad_next_claim_at = Date.now() + CONFIG.AD_COOLDOWN_HOURS * 60 * 60 * 1000;
  }
  
  if (task_id === 'ad2_roll') {
    if (user.ad2_claimed_today && Date.now() < user.ad2_next_claim_at) {
      return res.json({ ok: false, error: 'cooldown', next_claim_at: user.ad2_next_claim_at });
    }
    user.ad2_claimed_today = true;
    user.ad2_next_claim_at = Date.now() + 6 * 60 * 60 * 1000;
  }
  
  const pipsAwarded = task.pips || 0;
  user.power = (user.power || 0) + pipsAwarded;
  user.tasks_completed.push(task_id);
  
  user.contracts = user.contracts.map(c => {
    if (c.active) {
      c.hashes_per_day = calculateHashesPerDay(c.power || c.amount || 1000);
    }
    return c;
  });
  
  saveUser(user);
  
  res.json({
    ok: true,
    pips_awarded: pipsAwarded,
    new_power: user.power,
    next_claim_at: user.ad_next_claim_at || 0
  });
});

app.post('/miniapi/tasks/claim', (req, res) => {
  const { initData, task_id } = req.body;
  const userId = getUserIdFromInitData(initData);
  if (!userId) {
    return res.json({ ok: false, error: 'User ID not found' });
  }
  
  const user = getUser(userId);
  if (!user) {
    return res.json({ ok: false, error: 'User not found' });
  }
  
  const task = [
    { id: 'invite_1', required: 1, pips: 2000 },
    { id: 'invite_3', required: 3, pips: 3000 },
    { id: 'invite_5', required: 5, pips: 5000 },
    { id: 'invite_10', required: 10, pips: 10000 },
    { id: 'channel', required: 0, pips: 500 },
    { id: 'ad_roll', required: 0, pips: 5 },
    { id: 'ad2_roll', required: 0, pips: 1 }
  ].find(t => t.id === task_id);
  
  if (!task) {
    return res.json({ ok: false, error: 'Invalid task' });
  }
  
  if (user.tasks_completed.includes(task_id)) {
    return res.json({ ok: false, error: 'already completed' });
  }
  
  if (task_id.startsWith('invite_')) {
    if (user.referral_count < task.required) {
      return res.json({ ok: false, error: 'not enough referrals', required: task.required });
    }
  }
  
  if (task_id === 'ad_roll') {
    if (user.ad_claimed_today && Date.now() < user.ad_next_claim_at) {
      return res.json({ ok: false, error: 'cooldown', next_claim_at: user.ad_next_claim_at });
    }
    user.ad_claimed_today = true;
    user.ad_next_claim_at = Date.now() + CONFIG.AD_COOLDOWN_HOURS * 60 * 60 * 1000;
  }
  
  if (task_id === 'ad2_roll') {
    if (user.ad2_claimed_today && Date.now() < user.ad2_next_claim_at) {
      return res.json({ ok: false, error: 'cooldown', next_claim_at: user.ad2_next_claim_at });
    }
    user.ad2_claimed_today = true;
    user.ad2_next_claim_at = Date.now() + 6 * 60 * 60 * 1000;
  }
  
  const pipsAwarded = task.pips || 0;
  user.power = (user.power || 0) + pipsAwarded;
  user.tasks_completed.push(task_id);
  
  user.contracts = user.contracts.map(c => {
    if (c.active) {
      c.hashes_per_day = calculateHashesPerDay(c.power || c.amount || 1000);
    }
    return c;
  });
  
  saveUser(user);
  
  res.json({
    ok: true,
    pips_awarded: pipsAwarded,
    new_power: user.power,
    next_claim_at: user.ad_next_claim_at || 0
  });
});

// ── Slot Spin ──
app.post('/miniapp/tasks/slot-spin', (req, res) => {
  const { initData } = req.body;
  const userId = getUserIdFromInitData(initData);
  if (!userId) {
    return res.json({ ok: false, error: 'User ID not found' });
  }
  
  const user = getUser(userId);
  if (!user) {
    return res.json({ ok: false, error: 'User not found' });
  }
  
  if (Date.now() < user.slot_next_spin_at) {
    return res.json({ 
      ok: false, 
      error: 'cooldown', 
      next_spin_at: user.slot_next_spin_at 
    });
  }
  
  const fruits = ['🍒', '🍋', '🍊', '🍇', '🍓', '⭐'];
  const reels = [
    fruits[Math.floor(Math.random() * fruits.length)],
    fruits[Math.floor(Math.random() * fruits.length)],
    fruits[Math.floor(Math.random() * fruits.length)]
  ];
  
  let pipsAwarded = 0;
  if (reels[0] === reels[1] && reels[1] === reels[2]) {
    if (reels[0] === '⭐') pipsAwarded = 25;
    else pipsAwarded = 10;
  } else if (reels[0] === reels[1] || reels[1] === reels[2] || reels[0] === reels[2]) {
    pipsAwarded = 3;
  }
  
  if (pipsAwarded > 0) {
    user.power = (user.power || 0) + pipsAwarded;
    user.contracts = user.contracts.map(c => {
      if (c.active) {
        c.hashes_per_day = calculateHashesPerDay(c.power || c.amount || 1000);
      }
      return c;
    });
  }
  
  user.slot_next_spin_at = Date.now() + CONFIG.SLOT_COOLDOWN_MINUTES * 60 * 1000;
  saveUser(user);
  
  res.json({
    ok: true,
    reels: reels,
    pips_awarded: pipsAwarded,
    new_power: user.power,
    next_spin_at: user.slot_next_spin_at
  });
});

app.post('/miniapi/tasks/slot-spin', (req, res) => {
  const { initData } = req.body;
  const userId = getUserIdFromInitData(initData);
  if (!userId) {
    return res.json({ ok: false, error: 'User ID not found' });
  }
  
  const user = getUser(userId);
  if (!user) {
    return res.json({ ok: false, error: 'User not found' });
  }
  
  if (Date.now() < user.slot_next_spin_at) {
    return res.json({ 
      ok: false, 
      error: 'cooldown', 
      next_spin_at: user.slot_next_spin_at 
    });
  }
  
  const fruits = ['🍒', '🍋', '🍊', '🍇', '🍓', '⭐'];
  const reels = [
    fruits[Math.floor(Math.random() * fruits.length)],
    fruits[Math.floor(Math.random() * fruits.length)],
    fruits[Math.floor(Math.random() * fruits.length)]
  ];
  
  let pipsAwarded = 0;
  if (reels[0] === reels[1] && reels[1] === reels[2]) {
    if (reels[0] === '⭐') pipsAwarded = 25;
    else pipsAwarded = 10;
  } else if (reels[0] === reels[1] || reels[1] === reels[2] || reels[0] === reels[2]) {
    pipsAwarded = 3;
  }
  
  if (pipsAwarded > 0) {
    user.power = (user.power || 0) + pipsAwarded;
    user.contracts = user.contracts.map(c => {
      if (c.active) {
        c.hashes_per_day = calculateHashesPerDay(c.power || c.amount || 1000);
      }
      return c;
    });
  }
  
  user.slot_next_spin_at = Date.now() + CONFIG.SLOT_COOLDOWN_MINUTES * 60 * 1000;
  saveUser(user);
  
  res.json({
    ok: true,
    reels: reels,
    pips_awarded: pipsAwarded,
    new_power: user.power,
    next_spin_at: user.slot_next_spin_at
  });
});

// ── Ad Roll ──
app.post('/miniapp/tasks/ad-roll', (req, res) => {
  const { initData } = req.body;
  const userId = getUserIdFromInitData(initData);
  if (!userId) {
    return res.json({ ok: false, error: 'User ID not found' });
  }
  
  const user = getUser(userId);
  if (!user) {
    return res.json({ ok: false, error: 'User not found' });
  }
  
  if (user.ad_claimed_today && Date.now() < user.ad_next_claim_at) {
    return res.json({ 
      ok: false, 
      error: 'cooldown', 
      next_claim_at: user.ad_next_claim_at 
    });
  }
  
  const face = Math.floor(Math.random() * 6) + 1;
  const pipsAwarded = face * 5;
  user.power = (user.power || 0) + pipsAwarded;
  user.ad_claimed_today = true;
  user.ad_next_claim_at = Date.now() + CONFIG.AD_COOLDOWN_HOURS * 60 * 60 * 1000;
  
  user.contracts = user.contracts.map(c => {
    if (c.active) {
      c.hashes_per_day = calculateHashesPerDay(c.power || c.amount || 1000);
    }
    return c;
  });
  
  saveUser(user);
  
  res.json({
    ok: true,
    face: face,
    pips_awarded: pipsAwarded,
    new_power: user.power,
    next_claim_at: user.ad_next_claim_at
  });
});

app.post('/miniapi/tasks/ad-roll', (req, res) => {
  const { initData } = req.body;
  const userId = getUserIdFromInitData(initData);
  if (!userId) {
    return res.json({ ok: false, error: 'User ID not found' });
  }
  
  const user = getUser(userId);
  if (!user) {
    return res.json({ ok: false, error: 'User not found' });
  }
  
  if (user.ad_claimed_today && Date.now() < user.ad_next_claim_at) {
    return res.json({ 
      ok: false, 
      error: 'cooldown', 
      next_claim_at: user.ad_next_claim_at 
    });
  }
  
  const face = Math.floor(Math.random() * 6) + 1;
  const pipsAwarded = face * 5;
  user.power = (user.power || 0) + pipsAwarded;
  user.ad_claimed_today = true;
  user.ad_next_claim_at = Date.now() + CONFIG.AD_COOLDOWN_HOURS * 60 * 60 * 1000;
  
  user.contracts = user.contracts.map(c => {
    if (c.active) {
      c.hashes_per_day = calculateHashesPerDay(c.power || c.amount || 1000);
    }
    return c;
  });
  
  saveUser(user);
  
  res.json({
    ok: true,
    face: face,
    pips_awarded: pipsAwarded,
    new_power: user.power,
    next_claim_at: user.ad_next_claim_at
  });
});

// ── Ad2 Roll ──
app.post('/miniapp/tasks/ad-roll2', (req, res) => {
  const { initData } = req.body;
  const userId = getUserIdFromInitData(initData);
  if (!userId) {
    return res.json({ ok: false, error: 'User ID not found' });
  }
  
  const user = getUser(userId);
  if (!user) {
    return res.json({ ok: false, error: 'User not found' });
  }
  
  if (user.ad2_claimed_today && Date.now() < user.ad2_next_claim_at) {
    return res.json({ 
      ok: false, 
      error: 'cooldown', 
      next_claim_at: user.ad2_next_claim_at 
    });
  }
  
  const face = Math.floor(Math.random() * 6) + 1;
  const pipsAwarded = face * 2;
  user.power = (user.power || 0) + pipsAwarded;
  user.ad2_claimed_today = true;
  user.ad2_next_claim_at = Date.now() + 6 * 60 * 60 * 1000;
  
  user.contracts = user.contracts.map(c => {
    if (c.active) {
      c.hashes_per_day = calculateHashesPerDay(c.power || c.amount || 1000);
    }
    return c;
  });
  
  saveUser(user);
  
  res.json({
    ok: true,
    face: face,
    pips_awarded: pipsAwarded,
    new_power: user.power,
    next_claim_at: user.ad2_next_claim_at
  });
});

app.post('/miniapi/tasks/ad-roll2', (req, res) => {
  const { initData } = req.body;
  const userId = getUserIdFromInitData(initData);
  if (!userId) {
    return res.json({ ok: false, error: 'User ID not found' });
  }
  
  const user = getUser(userId);
  if (!user) {
    return res.json({ ok: false, error: 'User not found' });
  }
  
  if (user.ad2_claimed_today && Date.now() < user.ad2_next_claim_at) {
    return res.json({ 
      ok: false, 
      error: 'cooldown', 
      next_claim_at: user.ad2_next_claim_at 
    });
  }
  
  const face = Math.floor(Math.random() * 6) + 1;
  const pipsAwarded = face * 2;
  user.power = (user.power || 0) + pipsAwarded;
  user.ad2_claimed_today = true;
  user.ad2_next_claim_at = Date.now() + 6 * 60 * 60 * 1000;
  
  user.contracts = user.contracts.map(c => {
    if (c.active) {
      c.hashes_per_day = calculateHashesPerDay(c.power || c.amount || 1000);
    }
    return c;
  });
  
  saveUser(user);
  
  res.json({
    ok: true,
    face: face,
    pips_awarded: pipsAwarded,
    new_power: user.power,
    next_claim_at: user.ad2_next_claim_at
  });
});

// ── Leaderboard ──
app.get('/miniapp/leaderboard', (req, res) => {
  const { limit = 25, offset = 0, initData } = req.query;
  
  const allUsers = Array.from(DB.users.values())
    .filter(u => u.power > 0 && u.first_name && u.first_name !== '')
    .sort((a, b) => (b.power || 0) - (a.power || 0));
  
  const total = allUsers.length;
  const entries = allUsers.slice(parseInt(offset), parseInt(offset) + parseInt(limit));
  
  let userRank = null;
  if (initData) {
    const userId = getUserIdFromInitData(initData);
    const rank = allUsers.findIndex(u => u.id === userId) + 1;
    if (rank > 0) userRank = rank;
  }
  
  res.json({
    ok: true,
    entries: entries.map((u, idx) => ({
      id: u.id,
      first_name: u.first_name || 'User',
      last_name: u.last_name || '',
      username: u.username || '',
      photo_url: u.photo_url || '',
      power: u.power || 0,
      rank: parseInt(offset) + idx + 1
    })),
    total: total,
    user_rank: userRank
  });
});

app.get('/miniapi/leaderboard', (req, res) => {
  const { limit = 25, offset = 0, initData } = req.query;
  
  const allUsers = Array.from(DB.users.values())
    .filter(u => u.power > 0 && u.first_name && u.first_name !== '')
    .sort((a, b) => (b.power || 0) - (a.power || 0));
  
  const total = allUsers.length;
  const entries = allUsers.slice(parseInt(offset), parseInt(offset) + parseInt(limit));
  
  let userRank = null;
  if (initData) {
    const userId = getUserIdFromInitData(initData);
    const rank = allUsers.findIndex(u => u.id === userId) + 1;
    if (rank > 0) userRank = rank;
  }
  
  res.json({
    ok: true,
    entries: entries.map((u, idx) => ({
      id: u.id,
      first_name: u.first_name || 'User',
      last_name: u.last_name || '',
      username: u.username || '',
      photo_url: u.photo_url || '',
      power: u.power || 0,
      rank: parseInt(offset) + idx + 1
    })),
    total: total,
    user_rank: userRank
  });
});

// ── Team ──
app.post('/miniapp/team', (req, res) => {
  const { initData, page = 1, tab = 'members' } = req.body;
  const userId = getUserIdFromInitData(initData);
  if (!userId) {
    return res.json({ ok: false, error: 'User ID not found' });
  }
  
  const user = getUser(userId);
  if (!user) {
    return res.json({ ok: false, error: 'User not found' });
  }
  
  if (tab === 'members') {
    const members = user.referrals || [];
    const pageSize = 10;
    const totalPages = Math.ceil(members.length / pageSize) || 1;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    
    const paginatedMembers = members.slice(start, end).map(id => {
      const refUser = DB.users.get(id);
      if (!refUser) {
        return {
          id: id,
          first_name: 'Unknown',
          username: '',
          photo_url: '',
          power: 0,
          pending_referral_rewards: false,
          is_premium: false
        };
      }
      return {
        ...refUser,
        pending_referral_rewards: false,
        is_premium: false,
        power: refUser.power || 0
      };
    });
    
    res.json({
      ok: true,
      members: paginatedMembers,
      pages: totalPages,
      current_page: page
    });
  } else {
    res.json({
      ok: true,
      log: [],
      pages: 1,
      current_page: page
    });
  }
});

app.post('/miniapi/team', (req, res) => {
  const { initData, page = 1, tab = 'members' } = req.body;
  const userId = getUserIdFromInitData(initData);
  if (!userId) {
    return res.json({ ok: false, error: 'User ID not found' });
  }
  
  const user = getUser(userId);
  if (!user) {
    return res.json({ ok: false, error: 'User not found' });
  }
  
  if (tab === 'members') {
    const members = user.referrals || [];
    const pageSize = 10;
    const totalPages = Math.ceil(members.length / pageSize) || 1;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    
    const paginatedMembers = members.slice(start, end).map(id => {
      const refUser = DB.users.get(id);
      if (!refUser) {
        return {
          id: id,
          first_name: 'Unknown',
          username: '',
          photo_url: '',
          power: 0,
          pending_referral_rewards: false,
          is_premium: false
        };
      }
      return {
        ...refUser,
        pending_referral_rewards: false,
        is_premium: false,
        power: refUser.power || 0
      };
    });
    
    res.json({
      ok: true,
      members: paginatedMembers,
      pages: totalPages,
      current_page: page
    });
  } else {
    res.json({
      ok: true,
      log: [],
      pages: 1,
      current_page: page
    });
  }
});

// ── Referral ──
app.post('/miniapp/referral', (req, res) => {
  const { initData, referrerId, newUserId } = req.body;
  
  if (!DB.users.has(referrerId) || !DB.users.has(newUserId)) {
    return res.json({ ok: false, error: 'User not found' });
  }
  
  const referrer = getUser(referrerId);
  
  if (referrer.referrals.includes(newUserId)) {
    return res.json({ ok: false, error: 'Already referred' });
  }
  
  referrer.referrals.push(newUserId);
  referrer.referral_count = (referrer.referral_count || 0) + 1;
  referrer.valid_refs = (referrer.valid_refs || 0) + 1;
  referrer.power = (referrer.power || 0) + CONFIG.REF_BONUS_REGULAR;
  referrer.power_from_refs = (referrer.power_from_refs || 0) + CONFIG.REF_BONUS_REGULAR;
  
  referrer.contracts = referrer.contracts.map(c => {
    if (c.active) {
      c.hashes_per_day = calculateHashesPerDay(c.power || c.amount || 1000);
    }
    return c;
  });
  
  saveUser(referrer);
  
  res.json({
    ok: true,
    bonus: CONFIG.REF_BONUS_REGULAR,
    totalPower: referrer.power
  });
});

app.post('/miniapi/referral', (req, res) => {
  const { initData, referrerId, newUserId } = req.body;
  
  if (!DB.users.has(referrerId) || !DB.users.has(newUserId)) {
    return res.json({ ok: false, error: 'User not found' });
  }
  
  const referrer = getUser(referrerId);
  
  if (referrer.referrals.includes(newUserId)) {
    return res.json({ ok: false, error: 'Already referred' });
  }
  
  referrer.referrals.push(newUserId);
  referrer.referral_count = (referrer.referral_count || 0) + 1;
  referrer.valid_refs = (referrer.valid_refs || 0) + 1;
  referrer.power = (referrer.power || 0) + CONFIG.REF_BONUS_REGULAR;
  referrer.power_from_refs = (referrer.power_from_refs || 0) + CONFIG.REF_BONUS_REGULAR;
  
  referrer.contracts = referrer.contracts.map(c => {
    if (c.active) {
      c.hashes_per_day = calculateHashesPerDay(c.power || c.amount || 1000);
    }
    return c;
  });
  
  saveUser(referrer);
  
  res.json({
    ok: true,
    bonus: CONFIG.REF_BONUS_REGULAR,
    totalPower: referrer.power
  });
});

// ── Withdraw ──
app.post('/miniapp/withdraw', (req, res) => {
  const { initData, wallet_address, memo } = req.body;
  const userId = getUserIdFromInitData(initData);
  if (!userId) {
    return res.json({ ok: false, error: 'User ID not found' });
  }
  
  const user = getUser(userId);
  if (!user) {
    return res.json({ ok: false, error: 'User not found' });
  }
  
  if (!user.hashes || user.hashes < CONFIG.WD_MIN_HASHES) {
    return res.json({ 
      ok: false, 
      error: `minimum_not_met:${(CONFIG.WD_MIN_HASHES * CONFIG.HASH_TO_TON).toFixed(8)}:${CONFIG.WD_MIN_HASHES}` 
    });
  }
  
  if ((user.referral_count || 0) < CONFIG.WD_MIN_REFERRALS) {
    return res.json({ 
      ok: false, 
      error: `referral_requirement:${CONFIG.WD_MIN_REFERRALS}` 
    });
  }
  
  const tonAmount = user.hashes * CONFIG.HASH_TO_TON;
  user.hashes = 0;
  user.balance = (user.balance || 0) + tonAmount;
  
  saveUser(user);
  
  res.json({
    ok: true,
    ton_amount: tonAmount,
    message: 'Swap completed successfully'
  });
});

app.post('/miniapi/withdraw', (req, res) => {
  const { initData, wallet_address, memo } = req.body;
  const userId = getUserIdFromInitData(initData);
  if (!userId) {
    return res.json({ ok: false, error: 'User ID not found' });
  }
  
  const user = getUser(userId);
  if (!user) {
    return res.json({ ok: false, error: 'User not found' });
  }
  
  if (!user.hashes || user.hashes < CONFIG.WD_MIN_HASHES) {
    return res.json({ 
      ok: false, 
      error: `minimum_not_met:${(CONFIG.WD_MIN_HASHES * CONFIG.HASH_TO_TON).toFixed(8)}:${CONFIG.WD_MIN_HASHES}` 
    });
  }
  
  if ((user.referral_count || 0) < CONFIG.WD_MIN_REFERRALS) {
    return res.json({ 
      ok: false, 
      error: `referral_requirement:${CONFIG.WD_MIN_REFERRALS}` 
    });
  }
  
  const tonAmount = user.hashes * CONFIG.HASH_TO_TON;
  user.hashes = 0;
  user.balance = (user.balance || 0) + tonAmount;
  
  saveUser(user);
  
  res.json({
    ok: true,
    ton_amount: tonAmount,
    message: 'Swap completed successfully'
  });
});

// ── Deposit Stream ──
app.get('/miniapp/deposit-stream', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });
  
  res.write('retry: 10000\n\n');
  res.write('event: connected\ndata: {"status":"ok"}\n\n');
  
  const pingInterval = setInterval(() => {
    res.write('event: ping\ndata: {}\n\n');
  }, 30000);
  
  req.on('close', () => {
    clearInterval(pingInterval);
  });
});

app.get('/miniapi/deposit-stream', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });
  
  res.write('retry: 10000\n\n');
  res.write('event: connected\ndata: {"status":"ok"}\n\n');
  
  const pingInterval = setInterval(() => {
    res.write('event: ping\ndata: {}\n\n');
  }, 30000);
  
  req.on('close', () => {
    clearInterval(pingInterval);
  });
});

// ═══════════════════════════════════════════════════════════
// STATIC FILES - MUST COME LAST
// ═══════════════════════════════════════════════════════════

app.use('/miniapp', express.static(path.join(__dirname, 'public', 'miniapp')));

app.get('/', (req, res) => {
  res.redirect('/miniapp');
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'miniapp', 'index.html'));
});

// ═══════════════════════════════════════════════════════════
// INITIALIZE - No demo users
// ═══════════════════════════════════════════════════════════

console.log('✅ Server starting with clean user database');
console.log(`📊 Initial users: ${DB.users.size}`);

// ── Start Server ──
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Open Swap Server running on port ${PORT}`);
  console.log(`📁 Serving from: ${path.join(__dirname, 'public', 'miniapp')}`);
  console.log(`\n🔗 Open in browser: http://localhost:${PORT}/miniapp\n`);
  console.log(`📡 API endpoints available at /miniapp/* and /miniapi/*`);
});
