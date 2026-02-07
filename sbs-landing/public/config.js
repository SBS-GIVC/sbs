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

  // Default is same-origin (empty string => relative URLs).
  // If you host the UI separately, set localStorage[SBS_API_BASE_URL] to an origin
  // (e.g. https://landing.example.com). Never store API keys here.
  window.SBS_API_BASE_URL = (fromStorage || '').trim();
})();
