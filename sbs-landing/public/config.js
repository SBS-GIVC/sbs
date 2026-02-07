// SBS Landing UI runtime configuration
// - External file (no inline scripts) to keep Helmet CSP strict.

(() => {
  // Optional override: set in localStorage to point UI at a remote Landing API
  // (useful when hosting UI separately).
  const lsKey = 'SBS_API_BASE_URL';

  const fromStorage = (() => {
    try {
      return (window.localStorage && window.localStorage.getItem(lsKey)) || '';
    } catch {
      return '';
    }
  })();

  // If set, this should be an origin (e.g. https://landing.example.com)
  window.SBS_API_BASE_URL = (fromStorage || '').trim();
})();
