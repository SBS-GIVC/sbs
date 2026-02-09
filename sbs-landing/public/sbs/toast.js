// Shared lightweight toast notifications for static pages.
class ToastManager {
  constructor(containerId = 'toast-container') {
    this.container = document.getElementById(containerId) || this.ensureContainer(containerId);
  }

  ensureContainer(id) {
    const el = document.createElement('div');
    el.id = id;
    el.style.position = 'fixed';
    el.style.top = '16px';
    el.style.right = '16px';
    el.style.zIndex = '9999';
    el.style.display = 'flex';
    el.style.flexDirection = 'column';
    el.style.gap = '10px';
    document.body.appendChild(el);
    return el;
  }

  show(message, type = 'info', durationMs = 2800) {
    const toast = document.createElement('div');
    const palettes = {
      info: {
        bg: 'linear-gradient(180deg, rgba(34,211,238,0.18), rgba(15,23,42,0.88))',
        border: 'rgba(34,211,238,0.38)'
      },
      success: {
        bg: 'linear-gradient(180deg, rgba(52,211,153,0.18), rgba(15,23,42,0.88))',
        border: 'rgba(52,211,153,0.38)'
      },
      error: {
        bg: 'linear-gradient(180deg, rgba(251,113,133,0.20), rgba(15,23,42,0.88))',
        border: 'rgba(251,113,133,0.45)'
      }
    };
    const tone = palettes[type] || palettes.info;
    toast.style.minWidth = '260px';
    toast.style.maxWidth = '420px';
    toast.style.padding = '11px 14px';
    toast.style.borderRadius = '14px';
    toast.style.border = `1px solid ${tone.border}`;
    toast.style.background = tone.bg;
    toast.style.color = 'rgba(248,250,252,0.96)';
    toast.style.fontWeight = '700';
    toast.style.fontSize = '13px';
    toast.style.boxShadow = '0 12px 30px rgba(0,0,0,0.35)';
    toast.style.backdropFilter = 'blur(10px)';
    toast.style.transform = 'translateY(-6px)';
    toast.style.opacity = '0';
    toast.style.transition = 'all 180ms ease';
    toast.textContent = String(message || '');

    this.container.appendChild(toast);
    requestAnimationFrame(() => {
      toast.style.transform = 'translateY(0)';
      toast.style.opacity = '1';
    });

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-6px)';
      setTimeout(() => toast.remove(), 200);
    }, durationMs);
  }

  success(message, durationMs) {
    this.show(message, 'success', durationMs);
  }

  error(message, durationMs) {
    this.show(message, 'error', durationMs);
  }

  info(message, durationMs) {
    this.show(message, 'info', durationMs);
  }
}

window.ToastManager = ToastManager;
