/* =====================================================
   Open Swap Mini App — i18n module
   Loads locale JSON and provides t(key, replacements?)
   =====================================================
   To add a new language:
     1. Create /miniapp/locales/<code>.json (copy en.json)
     2. Translate the values (not the keys)
     3. Done — no code changes needed

   To add a new translatable string:
     1. Add key to en.json AND all other locale files
     2. Use t('key') in app.js or data-i18n="key" in HTML

   See I18N.md in the project root for full documentation.
   ===================================================== */

const I18n = (() => {
  let _strings = {};
  let _fallback = {};
  let _lang = 'en';
  let _ready = false;
  let _powerName  = 'POWER';
  let _hashesName = 'HASHES';
  let _appName    = 'HashValt';

  /**
   * Initialize i18n: load the locale JSON for the given language.
   * Falls back to English for any missing keys.
   * @param {string} lang - language code (e.g. 'en', 'es')
   * @returns {Promise<void>}
   */
  async function init(lang) {
    _lang = lang || 'en';

    // Always load English as fallback first
    if (_lang !== 'en') {
      try {
        const fbRes = await fetch(`/miniapp/locales/en.json`);
        _fallback = await fbRes.json();
      } catch { _fallback = {}; }
    }

    try {
      const res = await fetch(`/miniapp/locales/${_lang}.json`);
      _strings = await res.json();
      if (_lang === 'en') _fallback = _strings;
    } catch {
      console.warn(`[i18n] Locale "${_lang}" not found, using English`);
      _strings = _fallback;
    }

    _ready = true;
    applyDataI18n();
  }

  /**
   * Get a translated string by key, with optional {placeholder} replacements.
   * @param {string} key
   * @param {Object} [replacements]
   * @returns {string}
   */
  function _applyCurrencyNames(text) {
    text = text.split('{APP_NAME}').join(_appName);
    if (_powerName  !== 'POWER')  text = text.split('POWER').join(_powerName);
    if (_hashesName !== 'HASHES') text = text.split('HASHES').join(_hashesName);
    return text;
  }

  function t(key, replacements) {
    let text = _strings[key] || _fallback[key] || key;

    if (replacements) {
      Object.entries(replacements).forEach(([k, v]) => {
        text = text.split(`{${k}}`).join(String(v));
      });
    }

    return _applyCurrencyNames(text);
  }

  function setCurrencyNames(powerName, hashesName) {
    if (powerName)  _powerName  = String(powerName).toUpperCase();
    if (hashesName) _hashesName = String(hashesName).toUpperCase();
    if (_ready) applyDataI18n();
  }

  function setAppName(name) {
    if (!name) return;
    _appName = String(name);
    if (typeof document !== 'undefined') document.title = _appName;
    if (_ready) applyDataI18n();
  }

  function getHashesName() { return _hashesName; }
  function getPowerName()  { return _powerName; }

  /**
   * Scan the DOM for elements with [data-i18n] and replace their textContent.
   * Supports data-i18n-html for innerHTML replacement.
   */
  function applyDataI18n() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const translated = _strings[key] || _fallback[key];
      if (translated) {
        el.textContent = _applyCurrencyNames(translated);
      } else {
        const current = el.textContent;
        const replaced = _applyCurrencyNames(current);
        if (replaced !== current) el.textContent = replaced;
      }
    });
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
      const key = el.getAttribute('data-i18n-html');
      const translated = _strings[key] || _fallback[key];
      if (translated) el.innerHTML = _applyCurrencyNames(translated);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      const translated = _strings[key] || _fallback[key];
      if (translated) el.placeholder = _applyCurrencyNames(translated);
    });
  }

  /**
   * Re-initialize with a new language and re-apply all DOM translations.
   * @param {string} lang
   */
  async function setLang(lang) {
    await init(lang);
  }

  /**
   * Probe which locale files exist by attempting to fetch them.
   * Returns an array of { code, label } objects for each available locale.
   * The list is built from a known set; only those that respond with valid JSON are included.
   * @returns {Promise<Array<{code:string, label:string}>>}
   */
  async function getAvailableLangs() {
    const candidates = [
      { code: 'en', label: 'EN' },
      { code: 'es', label: 'ES' },
      { code: 'hi', label: 'HI' },
      { code: 'pt', label: 'PT' },
      { code: 'ru', label: 'RU' },
      { code: 'zh', label: 'ZH' },
      { code: 'fr', label: 'FR' },
      { code: 'de', label: 'DE' },
      { code: 'tr', label: 'TR' },
    ];
    const results = await Promise.all(
      candidates.map(async ({ code, label }) => {
        try {
          const r = await fetch(`/miniapp/locales/${code}.json`, { method: 'HEAD' });
          return r.ok ? { code, label } : null;
        } catch { return null; }
      })
    );
    return results.filter(Boolean);
  }

  /** Current language code */
  function getLang() { return _lang; }

  /** Whether init() has completed */
  function isReady() { return _ready; }

  return { init, setLang, t, applyDataI18n, getLang, isReady, getAvailableLangs, setCurrencyNames, setAppName, getHashesName, getPowerName };
})();
