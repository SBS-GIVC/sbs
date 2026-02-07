// SBS Integration Engine — Ultra-Premium Command Center UI
// Vanilla JS (no build step) + Tailwind (layout utilities) + ultra.css (design system)
// Strict-CSP friendly: no inline <script> required in index.html.

/* global SBSAPIClient */

const translations = {
  en: {
    top: {
      badge: 'Ultra-Premium Command Center',
      status: 'Operational Telemetry',
      lang: 'AR'
    },
    nav: {
      claimBuilder: 'Claim Builder',
      eligibility: 'Eligibility',
      priorAuth: 'Prior Auth',
      codeBrowser: 'Code Browser',
      aiAnalytics: 'AI Analytics',
      copilot: 'AI Copilot',
      hintClaim: 'Submit + Analyze',
      hintEligibility: 'Coverage + Benefits',
      hintPriorAuth: 'Request + Track',
      hintCode: 'Normalize + Lookup',
      hintAnalytics: 'Inference Telemetry',
      hintCopilot: 'DeepSeek V4 HUD'
    },
    claim: {
      title: 'Claim Builder',
      subtitle: 'High-performance submission pipeline with cinematic observability.',
      patientName: 'Patient Name',
      patientId: 'Patient ID / Iqama',
      memberId: 'Member ID',
      payerId: 'Payer ID',
      claimType: 'Claim Type',
      professional: 'Professional',
      institutional: 'Institutional',
      pharmacy: 'Pharmacy',
      vision: 'Vision',
      userEmail: 'Your Email',
      uploadFile: 'Upload Claim Document',
      dragDrop: 'Drag & drop or click to browse',
      fileTypes: 'PDF, DOC, XLS, JSON, XML, Images (Max 10MB)',
      submit: 'Submit Claim',
      submitting: 'Processing…',
      claimId: 'Claim ID',
      track: 'Track',
      share: 'Copy Tracking URL',
      receipt: 'Receipt',
      riskHub: 'Safety Hub',
      riskHint: 'Signals derived from workflow + SLA envelopes.',
      analyzer: 'Smart Claim Analyzer',
      analyzerHint: 'Metrics, safety, and risk vectors (deterministic).'
    },
    tracking: {
      title: 'Workflow Timeline',
      subtitle: 'Real-time stages with SLA and risk signals.',
      enterId: 'Enter Claim ID',
      start: 'Start Tracking',
      retry: 'Retry',
      processing: 'Processing',
      complete: 'Complete',
      failed: 'Failed',
      slaWarning: 'SLA envelope exceeded'
    },
    eligibility: {
      title: 'Eligibility Workspace',
      subtitle: 'A unified verification console (demo endpoint).',
      memberId: 'Member ID / Iqama',
      payerId: 'Payer ID',
      check: 'Run Eligibility Check'
    },
    priorAuth: {
      title: 'Prior Authorization',
      subtitle: 'Request builder with cinematic tracking (demo endpoint).',
      memberId: 'Member ID / Iqama',
      procedureCode: 'Requested Procedure Code',
      submit: 'Submit Prior Auth'
    },
    codeBrowser: {
      title: 'Code Browser',
      subtitle: 'Normalize internal codes through the Normalizer service.',
      facilityId: 'Facility ID',
      internalCode: 'Internal Code',
      description: 'Description',
      normalize: 'Normalize'
    },
    analytics: {
      title: 'Neural Analytics Hub',
      subtitle: 'Real-time Inference Terminal + modular AI cards.',
      terminal: 'Inference Terminal',
      clear: 'Clear',
      pause: 'Pause',
      resume: 'Resume'
    },
    copilot: {
      title: 'AI Copilot (DeepSeek V4)',
      subtitle: 'Terminal-style HUD with cinematic chat flow (safe demo).',
      placeholder: 'Ask about a claim stage, normalization, or operational health…',
      send: 'Send'
    }
  },
  ar: {
    top: {
      badge: 'مركز القيادة الفائق',
      status: 'قياس وتشغيل الخدمات',
      lang: 'EN'
    },
    nav: {
      claimBuilder: 'بناء المطالبة',
      eligibility: 'الأهلية',
      priorAuth: 'الموافقات',
      codeBrowser: 'مستعرض الأكواد',
      aiAnalytics: 'تحليلات الذكاء',
      copilot: 'المساعد',
      hintClaim: 'إرسال + تحليل',
      hintEligibility: 'تغطية + مزايا',
      hintPriorAuth: 'طلب + تتبع',
      hintCode: 'معايرة + بحث',
      hintAnalytics: 'قياس الاستدلال',
      hintCopilot: 'واجهة DeepSeek V4'
    },
    claim: {
      title: 'بناء المطالبة',
      subtitle: 'سير عمل سريع مع قابلية مراقبة سينمائية.',
      patientName: 'اسم المريض',
      patientId: 'رقم الهوية / الإقامة',
      memberId: 'رقم العضوية',
      payerId: 'رقم شركة التأمين',
      claimType: 'نوع المطالبة',
      professional: 'مهنية',
      institutional: 'مؤسسية',
      pharmacy: 'صيدلية',
      vision: 'بصريات',
      userEmail: 'بريدك الإلكتروني',
      uploadFile: 'تحميل المستند',
      dragDrop: 'اسحب وأفلت أو انقر للتصفح',
      fileTypes: 'PDF, DOC, XLS, JSON, XML, Images (حد أقصى 10MB)',
      submit: 'تقديم المطالبة',
      submitting: 'جاري المعالجة…',
      claimId: 'رقم المطالبة',
      track: 'تتبع',
      share: 'نسخ رابط التتبع',
      receipt: 'الإيصال',
      riskHub: 'مركز السلامة',
      riskHint: 'إشارات مشتقة من سير العمل وحدود SLA.',
      analyzer: 'محلل المطالبة الذكي',
      analyzerHint: 'مقاييس وسلامة ومتجهات مخاطرة (ثابتة).'
    },
    tracking: {
      title: 'الخط الزمني',
      subtitle: 'مراحل في الزمن الحقيقي مع SLA وإشارات مخاطرة.',
      enterId: 'أدخل رقم المطالبة',
      start: 'ابدأ التتبع',
      retry: 'إعادة المحاولة',
      processing: 'جاري المعالجة',
      complete: 'مكتمل',
      failed: 'فشل',
      slaWarning: 'تجاوز حد SLA'
    },
    eligibility: {
      title: 'مساحة الأهلية',
      subtitle: 'كونسول موحد للتحقق (واجهة تجريبية).',
      memberId: 'رقم العضوية / الإقامة',
      payerId: 'رقم شركة التأمين',
      check: 'فحص الأهلية'
    },
    priorAuth: {
      title: 'الموافقة المسبقة',
      subtitle: 'منشئ الطلب مع تتبع سينمائي (واجهة تجريبية).',
      memberId: 'رقم العضوية / الإقامة',
      procedureCode: 'كود الإجراء',
      submit: 'إرسال الطلب'
    },
    codeBrowser: {
      title: 'مستعرض الأكواد',
      subtitle: 'معايرة الأكواد الداخلية عبر خدمة المعايرة.',
      facilityId: 'رقم المنشأة',
      internalCode: 'الكود الداخلي',
      description: 'الوصف',
      normalize: 'معايرة'
    },
    analytics: {
      title: 'مركز التحليلات العصبية',
      subtitle: 'طرفية الاستدلال + بطاقات الذكاء.',
      terminal: 'طرفية الاستدلال',
      clear: 'مسح',
      pause: 'إيقاف',
      resume: 'استئناف'
    },
    copilot: {
      title: 'المساعد (DeepSeek V4)',
      subtitle: 'واجهة طرفية مع تدفق محادثة سينمائي (آمن/تجريبي).',
      placeholder: 'اسأل عن مراحل المطالبة أو المعايرة أو صحة الخدمات…',
      send: 'إرسال'
    }
  }
};

function nowIso() {
  return new Date().toISOString();
}

function safeJsonParse(text, fallback = null) {
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

function hashToUnit(str) {
  // Deterministic 0..1 (no crypto).
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 1000) / 1000;
}

class SBSCommandCenter {
  constructor() {
    this.lang = 'en';
    this.activeWorkspace = 'claim-builder';

    // Claim workflow
    this.isSubmitting = false;
    this.selectedFile = null;
    this.currentClaimId = '';
    this.claimStatus = null;
    this.claimAnalysis = null;
    this.statusPollingInterval = null;
    this.statusPollFailures = 0;

    // Analytics terminal
    this.terminalLines = [];
    this.analyticsPollingInterval = null;
    this.analyticsPaused = false;
    this.lastServicesStatus = null;

    // Eligibility/prior auth
    this.eligibilityResult = null;
    this.priorAuthResult = null;

    // Code browser
    this.normalizeResult = null;

    // Copilot
    this.chatMessages = [
      { role: 'ai', ts: nowIso(), text: 'HUD online. Ask about workflow stages, safety signals, or code normalization.' }
    ];
    this.copilotBusy = false;

    this.init();
  }

  init() {
    // Service worker registration (kept outside HTML).
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(() => undefined);
      });
    }

    // Routing
    window.addEventListener('popstate', () => {
      this.activeWorkspace = this.pathToWorkspace(window.location.pathname);
      this.render();
      this.syncPolling();
    });

    // URL param actions
    window.addEventListener('DOMContentLoaded', () => {
      const params = new URLSearchParams(window.location.search);
      const action = params.get('action');
      const claimId = params.get('claimId');
      if (claimId) {
        this.currentClaimId = claimId;
      }
      if (action === 'track' && claimId) {
        this.startTracking(claimId);
      }

      this.activeWorkspace = this.pathToWorkspace(window.location.pathname);
      this.render();
      this.syncPolling();
    });

    // Drag/drop for file upload
    document.addEventListener('dragover', (e) => e.preventDefault());
    document.addEventListener('drop', (e) => e.preventDefault());
  }

  // ---------------------------------------------------------------------------
  // API helpers
  // ---------------------------------------------------------------------------
  getApiBaseUrl() {
    const rawBaseUrl = (window.SBS_API_BASE_URL || '').trim();
    if (!rawBaseUrl) return '';
    try {
      const url = new URL(rawBaseUrl);
      if (!['http:', 'https:'].includes(url.protocol)) return '';
      return url.origin;
    } catch {
      return '';
    }
  }

  getApiClient() {
    if (window.sbsApiClient) return window.sbsApiClient;
    if (window.SBSAPIClient) return new SBSAPIClient();
    return null;
  }

  apiUrl(path) {
    const base = this.getApiBaseUrl();
    if (!path.startsWith('/')) path = `/${path}`;
    return base ? `${base}${path}` : path;
  }

  getTrackingUrl() {
    if (!this.currentClaimId) return '';
    return this.apiUrl(`/api/claim-status/${this.currentClaimId}`);
  }

  getReceiptUrl() {
    if (!this.currentClaimId) return '';
    return this.apiUrl(`/api/claim-receipt/${this.currentClaimId}`);
  }

  // ---------------------------------------------------------------------------
  // Routing
  // ---------------------------------------------------------------------------
  pathToWorkspace(pathname) {
    const clean = (pathname || '/').replace(/\/+$/, '');
    if (clean === '' || clean === '/') return 'claim-builder';

    const map = {
      '/claim-builder': 'claim-builder',
      '/eligibility': 'eligibility',
      '/prior-auth': 'prior-auth',
      '/code-browser': 'code-browser',
      '/ai-analytics': 'ai-analytics',
      '/copilot': 'copilot'
    };
    return map[clean] || 'claim-builder';
  }

  navigate(path) {
    if (!path.startsWith('/')) path = `/${path}`;
    if (window.location.pathname !== path) {
      history.pushState({}, '', path);
    }
    this.activeWorkspace = this.pathToWorkspace(path);
    this.render();
    this.syncPolling();
  }

  // ---------------------------------------------------------------------------
  // UX primitives
  // ---------------------------------------------------------------------------
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = `${text ?? ''}`;
    return div.innerHTML;
  }

  toast(message, type = 'info') {
    const id = `toast-${Math.random().toString(16).slice(2)}`;
    const color = type === 'error' ? 'rgba(251,113,133,0.22)'
      : type === 'success' ? 'rgba(52,211,153,0.22)'
        : 'rgba(34,211,238,0.18)';

    const el = document.createElement('div');
    el.id = id;
    el.style.position = 'fixed';
    el.style.right = '16px';
    el.style.bottom = '16px';
    el.style.zIndex = '9999';
    el.style.maxWidth = '420px';
    el.style.borderRadius = '16px';
    el.style.padding = '12px 14px';
    el.style.border = '1px solid rgba(148,163,184,0.18)';
    el.style.background = `linear-gradient(180deg, ${color}, rgba(255,255,255,0.06))`;
    el.style.backdropFilter = 'blur(14px)';
    el.style.boxShadow = '0 18px 50px rgba(0,0,0,0.55)';
    el.style.color = 'rgba(255,255,255,0.92)';
    el.style.fontWeight = '800';
    el.style.letterSpacing = '0.2px';
    el.textContent = message;

    document.body.appendChild(el);
    setTimeout(() => {
      const node = document.getElementById(id);
      if (node) node.remove();
    }, 3200);
  }

  toggleLang() {
    this.lang = this.lang === 'en' ? 'ar' : 'en';
    document.documentElement.lang = this.lang;
    document.documentElement.dir = this.lang === 'ar' ? 'rtl' : 'ltr';
    this.render();
  }

  // ---------------------------------------------------------------------------
  // Claim submission & tracking
  // ---------------------------------------------------------------------------
  validateClaimForm(form) {
    const required = ['patientName', 'patientId', 'claimType', 'userEmail'];
    for (const key of required) {
      const val = (form[key]?.value || '').trim();
      if (!val) {
        this.toast(`${key} is required`, 'error');
        return false;
      }
    }
    return true;
  }

  handleFileSelect(event) {
    const file = event?.target?.files?.[0];
    if (!file) return;
    this.selectedFile = file;
    this.render();
  }

  bindUploadDragDrop() {
    const drop = document.getElementById('sbs-file-drop');
    if (!drop) return;

    const setOver = (over) => {
      drop.classList.toggle('dragover', over);
    };

    drop.ondragenter = (e) => { e.preventDefault(); setOver(true); };
    drop.ondragover = (e) => { e.preventDefault(); setOver(true); };
    drop.ondragleave = (e) => { e.preventDefault(); setOver(false); };
    drop.ondrop = (e) => {
      e.preventDefault();
      setOver(false);
      const file = e.dataTransfer?.files?.[0];
      if (file) {
        this.selectedFile = file;
        const input = document.getElementById('file-input');
        if (input) input.files = e.dataTransfer.files;
        this.render();
      }
    };
  }

  async submitClaim(event) {
    event.preventDefault();
    const form = event.target.elements;

    if (!this.validateClaimForm(form)) return;

    this.isSubmitting = true;
    this.render();

    const body = new FormData();
    body.append('patientName', form.patientName.value.trim());
    body.append('patientId', form.patientId.value.trim());
    body.append('memberId', (form.memberId.value || '').trim());
    body.append('payerId', (form.payerId.value || '').trim());
    body.append('claimType', form.claimType.value);
    body.append('userEmail', form.userEmail.value.trim());
    if (this.selectedFile) body.append('claimFile', this.selectedFile);

    try {
      const apiClient = this.getApiClient();
      let payload;
      if (apiClient) {
        apiClient.setBaseUrl(this.getApiBaseUrl());
        const result = await apiClient.submitClaim(body);
        payload = result.success ? result.data : null;
        if (!payload) throw new Error(result.error?.message || 'Submit failed');
      } else {
        const res = await fetch(this.apiUrl('/api/submit-claim'), { method: 'POST', body });
        payload = await res.json();
      }

      if (!payload?.success) {
        throw new Error(payload?.error || 'Submit failed');
      }

      this.currentClaimId = payload.claimId;
      this.claimStatus = null;
      this.isSubmitting = false;
      this.selectedFile = null;

      this.toast(`Claim submitted: ${payload.claimId}`, 'success');
      this.startTracking(payload.claimId);

    } catch (err) {
      this.isSubmitting = false;
      this.toast(err.message || 'Submission failed', 'error');
      this.render();
    }
  }

  startTracking(claimId) {
    this.currentClaimId = claimId;
    this.stopStatusPolling();
    this.fetchClaimStatus().then(() => {
      this.startStatusPolling();
    });
    this.render();
  }

  startStatusPolling() {
    this.stopStatusPolling();
    this.statusPollingInterval = setInterval(async () => {
      await this.fetchClaimStatus();
      if (this.claimStatus?.isComplete) {
        this.stopStatusPolling();
      }
    }, 3000);
  }

  stopStatusPolling() {
    if (this.statusPollingInterval) {
      clearInterval(this.statusPollingInterval);
      this.statusPollingInterval = null;
    }
  }

  async fetchClaimStatus() {
    if (!this.currentClaimId) return;

    try {
      const apiClient = this.getApiClient();
      let result;
      if (apiClient) {
        apiClient.setBaseUrl(this.getApiBaseUrl());
        const out = await apiClient.getClaimStatus(this.currentClaimId);
        result = out.success ? out.data : null;
        if (!result) throw new Error(out.error?.message || 'Status fetch failed');
      } else {
        const res = await fetch(this.apiUrl(`/api/claim-status/${this.currentClaimId}`));
        result = await res.json();
      }

      if (result?.success) {
        // server returns {success:true, data:{...}} OR old style {success:true,...}
        const data = result.data || result;
        this.claimStatus = data;
        // Fetch real risk vectors from analyzer (best-effort)
        await this.fetchClaimAnalysis();
        this.statusPollFailures = 0;

        // Terminal mirroring (if analytics open)
        if (this.activeWorkspace === 'ai-analytics' && data?.timeline?.length) {
          const last = data.timeline[data.timeline.length - 1];
          this.pushTerminal(`claim/${this.currentClaimId}`, last.message || last.event, last.status);
        }

        this.render();
      }
    } catch (err) {
      this.statusPollFailures += 1;
      if (this.statusPollFailures >= 3) {
        this.stopStatusPolling();
        this.toast('Unable to fetch claim status. Please retry.', 'error');
      }
    }
  }

  async fetchClaimAnalysis() {
    if (!this.currentClaimId) return;
    try {
      const apiClient = this.getApiClient();
      let data;
      if (apiClient?.getClaimAnalysis) {
        apiClient.setBaseUrl(this.getApiBaseUrl());
        const out = await apiClient.getClaimAnalysis(this.currentClaimId);
        data = out.success ? out.data : null;
      } else {
        const res = await fetch(this.apiUrl(`/api/claims/${this.currentClaimId}/analyzer`));
        data = await res.json();
      }

      if (data?.success && data?.risk?.subscores) {
        this.claimAnalysis = data;
      }
    } catch {
      // ignore; UI will fall back to deterministic vectors
    }
  }

  async retryClaim() {
    if (!this.currentClaimId) return;

    try {
      const apiClient = this.getApiClient();
      let result;
      if (apiClient) {
        apiClient.setBaseUrl(this.getApiBaseUrl());
        const out = await apiClient.retryClaim(this.currentClaimId);
        result = out.success ? out.data : null;
        if (!result) throw new Error(out.error?.message || 'Retry failed');
      } else {
        const res = await fetch(this.apiUrl(`/api/claims/${this.currentClaimId}/retry`), { method: 'POST' });
        result = await res.json();
      }
      if (!result?.success) throw new Error(result?.error || 'Retry failed');

      this.toast('Retry initiated', 'success');
      this.claimStatus = null;
      this.startTracking(this.currentClaimId);

    } catch (err) {
      this.toast(err.message || 'Retry failed', 'error');
    }
  }

  // ---------------------------------------------------------------------------
  // Analytics terminal + service polling
  // ---------------------------------------------------------------------------
  pushTerminal(source, message, status = '') {
    const ts = new Date().toLocaleTimeString();
    const line = { ts, source, message, status };
    this.terminalLines.push(line);
    if (this.terminalLines.length > 200) this.terminalLines.shift();
  }

  clearTerminal() {
    this.terminalLines = [];
    this.render();
  }

  setAnalyticsPaused(paused) {
    this.analyticsPaused = paused;
    this.render();
  }

  startAnalyticsPolling() {
    if (this.analyticsPollingInterval) return;
    this.analyticsPollingInterval = setInterval(async () => {
      if (this.analyticsPaused) return;
      await this.pollServices();
    }, 2500);
    void this.pollServices();
  }

  stopAnalyticsPolling() {
    if (this.analyticsPollingInterval) {
      clearInterval(this.analyticsPollingInterval);
      this.analyticsPollingInterval = null;
    }
  }

  async pollServices() {
    try {
      const apiClient = this.getApiClient();
      let data;
      if (apiClient) {
        apiClient.setBaseUrl(this.getApiBaseUrl());
        const out = await apiClient.getServicesStatus();
        data = out.success ? out.data : null;
      } else {
        const res = await fetch(this.apiUrl('/api/services/status'));
        data = await res.json();
      }

      if (data?.success && data?.services) {
        this.lastServicesStatus = data;

        // Emit terminal deltas
        const prev = this._prevServices || {};
        for (const svc of data.services) {
          const k = svc.service;
          const prevStatus = prev[k];
          if (prevStatus !== svc.status) {
            const s = svc.status === 'healthy' ? 'completed' : 'failed';
            this.pushTerminal(`svc/${k}`, `status=${svc.status}`, s);
          }
        }
        this._prevServices = Object.fromEntries(data.services.map(s => [s.service, s.status]));

        this.render();
      }
    } catch {
      // ignore
    }
  }

  syncPolling() {
    if (this.activeWorkspace === 'ai-analytics') this.startAnalyticsPolling();
    else this.stopAnalyticsPolling();
  }

  // ---------------------------------------------------------------------------
  // Eligibility / Prior Auth (demo endpoints)
  // ---------------------------------------------------------------------------
  async runEligibility(event) {
    event.preventDefault();
    const form = event.target.elements;
    const memberId = (form.memberId.value || '').trim();
    const payerId = (form.payerId.value || '').trim();
    const dateOfService = (form.dateOfService?.value || '').trim();
    const facilityId = (form.facilityId?.value || '').trim();

    try {
      const apiClient = this.getApiClient();
      let data;
      if (apiClient) {
        apiClient.setBaseUrl(this.getApiBaseUrl());
        const out = await apiClient.eligibilityCheck({ memberId, payerId, dateOfService, facilityId });
        data = out.success ? out.data : null;
        if (!data) throw new Error(out.error?.message || 'Eligibility failed');
      } else {
        const res = await fetch(this.apiUrl('/api/eligibility/check'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ memberId, payerId, dateOfService, facilityId })
        });
        data = await res.json();
      }
      this.eligibilityResult = data;
      this.toast('Eligibility check complete', 'success');
      this.render();
    } catch (err) {
      this.toast(err.message || 'Eligibility failed', 'error');
    }
  }

  async submitPriorAuth(event) {
    event.preventDefault();
    const form = event.target.elements;
    const memberId = (form.memberId.value || '').trim();
    const procedureCode = (form.procedureCode.value || '').trim();

    try {
      const apiClient = this.getApiClient();
      let data;
      if (apiClient) {
        apiClient.setBaseUrl(this.getApiBaseUrl());
        const out = await apiClient.priorAuthSubmit({ memberId, procedureCode });
        data = out.success ? out.data : null;
        if (!data) throw new Error(out.error?.message || 'Prior auth failed');
      } else {
        const res = await fetch(this.apiUrl('/api/prior-auth/submit'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ memberId, procedureCode })
        });
        data = await res.json();
      }
      this.priorAuthResult = data;
      this.toast('Prior auth submitted', 'success');
      this.render();
    } catch (err) {
      this.toast(err.message || 'Prior auth failed', 'error');
    }
  }

  // ---------------------------------------------------------------------------
  // Code Browser (proxy to normalizer)
  // ---------------------------------------------------------------------------
  async normalizeCode(event) {
    event.preventDefault();
    const form = event.target.elements;
    const facility_id = Number.parseInt(form.facilityId.value, 10);
    const internal_code = (form.internalCode.value || '').trim();
    const description = (form.description.value || '').trim();

    if (!facility_id || !internal_code) {
      this.toast('facilityId + internalCode required', 'error');
      return;
    }

    try {
      const apiClient = this.getApiClient();
      let data;
      if (apiClient) {
        apiClient.setBaseUrl(this.getApiBaseUrl());
        const out = await apiClient.normalizeCode({ facility_id, internal_code, description });
        data = out.success ? out.data : null;
        if (!data) throw new Error(out.error?.message || 'Normalize failed');
      } else {
        const res = await fetch(this.apiUrl('/api/normalizer/normalize'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ facility_id, internal_code, description })
        });
        data = await res.json();
      }
      this.normalizeResult = data;
      this.toast('Normalization complete', 'success');
      this.render();
    } catch (err) {
      this.toast(err.message || 'Normalization failed', 'error');
    }
  }

  // ---------------------------------------------------------------------------
  // Copilot
  // ---------------------------------------------------------------------------
  async sendCopilot(event) {
    event.preventDefault();
    if (this.copilotBusy) return;

    const input = document.getElementById('copilot-input');
    const text = (input?.value || '').trim();
    if (!text) return;

    this.chatMessages.push({ role: 'me', ts: nowIso(), text });
    if (input) input.value = '';

    this.copilotBusy = true;
    this.render();

    try {
      const apiClient = this.getApiClient();
      let data;
      if (apiClient) {
        apiClient.setBaseUrl(this.getApiBaseUrl());
        const out = await apiClient.copilotChat(text, {
          claimId: this.currentClaimId || null,
          workspace: this.activeWorkspace
        });
        data = out.success ? out.data : null;
        if (!data) throw new Error(out.error?.message || 'Copilot failed');
      } else {
        const res = await fetch(this.apiUrl('/api/copilot/chat'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            context: { claimId: this.currentClaimId || null, workspace: this.activeWorkspace }
          })
        });
        data = await res.json();
      }

      const raw = data.reply || 'No response';
      let rendered = raw;
      // If reply is a strict JSON object (recommended), render a readable report.
      const maybe = safeJsonParse(raw, null);
      if (maybe && typeof maybe === 'object' && (maybe.reply || maybe.category || maybe.actions || maybe.warnings)) {
        const lines = [];
        if (maybe.category || typeof maybe.confidence === 'number') {
          lines.push(`[category=${maybe.category || 'unknown'} confidence=${typeof maybe.confidence === 'number' ? maybe.confidence.toFixed(2) : '—'}]`);
          lines.push('');
        }
        if (maybe.reply) {
          lines.push(String(maybe.reply));
        } else {
          lines.push(raw);
        }
        if (Array.isArray(maybe.actions) && maybe.actions.length) {
          lines.push('');
          lines.push('Actions:');
          for (const a of maybe.actions) lines.push(`- ${a}`);
        }
        if (Array.isArray(maybe.warnings) && maybe.warnings.length) {
          lines.push('');
          lines.push('Warnings:');
          for (const w of maybe.warnings) lines.push(`- ${w}`);
        }
        rendered = lines.join('\n');
      }

      this.chatMessages.push({ role: 'ai', ts: nowIso(), text: rendered });

    } catch (err) {
      this.chatMessages.push({ role: 'ai', ts: nowIso(), text: `HUD error: ${err.message || 'request failed'}` });

    } finally {
      this.copilotBusy = false;
      this.render();

      const feed = document.getElementById('chat-feed');
      if (feed) feed.scrollTop = feed.scrollHeight;
    }
  }

  // ---------------------------------------------------------------------------
  // Smart Claim Analyzer (derived)
  // ---------------------------------------------------------------------------
  getStageSlaSeconds(stageKey) {
    const slaMap = {
      validation: 30,
      normalization: 45,
      financialRules: 45,
      signing: 30,
      nphiesSubmission: 60
    };
    return slaMap[stageKey] || 60;
  }

  computeStageDurations(claimStatus) {
    if (!claimStatus?.stages) return {};
    const out = {};
    for (const [k, v] of Object.entries(claimStatus.stages)) {
      if (!v?.timestamp) continue;
      // We only have timestamps per stage update; approximate using timeline sequence.
      out[k] = { status: v.status, timestamp: v.timestamp };
    }
    return out;
  }

  computeRiskVectors(claimId, claimStatus) {
    // Prefer server-side analyzer when available.
    if (this.claimAnalysis?.success && this.claimAnalysis?.risk?.subscores) {
      const s = this.claimAnalysis.risk.subscores;
      // UI expects 0..1 where higher = risk. Analyzer returns that already.
      return {
        dataCompleteness: clamp01(s.dataCompleteness),
        codeMapping: clamp01(s.codeMapping),
        eligibility: clamp01(s.eligibility ?? 0.5),
        fraudSignals: clamp01(s.fraudSignals),
        slaRisk: clamp01(s.slaRisk)
      };
    }

    const seed = claimId || 'seed';
    const base = hashToUnit(seed);

    // If claim has errors, amplify risk.
    const hasErrors = (claimStatus?.errors?.length || 0) > 0;
    const errBoost = hasErrors ? 0.25 : 0.0;

    return {
      dataCompleteness: clamp01(0.72 + (hashToUnit(seed + 'dc') - 0.5) * 0.22 - errBoost),
      codeMapping: clamp01(0.70 + (hashToUnit(seed + 'cm') - 0.5) * 0.26 - errBoost),
      eligibility: clamp01(0.68 + (hashToUnit(seed + 'el') - 0.5) * 0.28 - errBoost),
      fraudSignals: clamp01(0.50 + (hashToUnit(seed + 'fr') - 0.5) * 0.34 + errBoost),
      slaRisk: clamp01(0.40 + (hashToUnit(seed + 'sla') - 0.5) * 0.34 + this.computeSlaRisk(claimStatus))
    };
  }

  computeSlaRisk(claimStatus) {
    if (!claimStatus?.stages) return 0;
    const now = Date.now();
    let risk = 0;
    for (const [stageKey, stage] of Object.entries(claimStatus.stages)) {
      if (!stage?.timestamp) continue;
      if (!['in_progress', 'pending'].includes(stage.status)) continue;
      const elapsed = (now - new Date(stage.timestamp).getTime()) / 1000;
      const sla = this.getStageSlaSeconds(stageKey);
      if (elapsed > sla) risk = Math.max(risk, 0.30);
    }
    return risk;
  }

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------
  iconSvg(name) {
    const common = 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
    const map = {
      claim: `<svg width="18" height="18" viewBox="0 0 24 24" ${common}><path d="M9 12h6"/><path d="M9 16h6"/><path d="M6 7h12"/><path d="M7 3h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/></svg>`,
      shield: `<svg width="18" height="18" viewBox="0 0 24 24" ${common}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>`,
      auth: `<svg width="18" height="18" viewBox="0 0 24 24" ${common}><path d="M12 11V7"/><path d="M12 15h.01"/><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6l6 6v10a2 2 0 0 1-2 2z"/></svg>`,
      code: `<svg width="18" height="18" viewBox="0 0 24 24" ${common}><path d="M16 18l6-6-6-6"/><path d="M8 6l-6 6 6 6"/></svg>`,
      analytics: `<svg width="18" height="18" viewBox="0 0 24 24" ${common}><path d="M3 3v18h18"/><path d="M7 13l3-3 4 4 6-6"/></svg>`,
      copilot: `<svg width="18" height="18" viewBox="0 0 24 24" ${common}><path d="M12 3v6"/><path d="M5 9h14"/><path d="M7 9v10a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9"/></svg>`
    };
    return map[name] || '';
  }

  renderSidebar(t) {
    const items = [
      { key: 'claim-builder', path: '/', icon: 'claim', label: t.nav.claimBuilder, hint: t.nav.hintClaim },
      { key: 'eligibility', path: '/eligibility', icon: 'shield', label: t.nav.eligibility, hint: t.nav.hintEligibility },
      { key: 'prior-auth', path: '/prior-auth', icon: 'auth', label: t.nav.priorAuth, hint: t.nav.hintPriorAuth },
      { key: 'code-browser', path: '/code-browser', icon: 'code', label: t.nav.codeBrowser, hint: t.nav.hintCode },
      { key: 'ai-analytics', path: '/ai-analytics', icon: 'analytics', label: t.nav.aiAnalytics, hint: t.nav.hintAnalytics },
      { key: 'copilot', path: '/copilot', icon: 'copilot', label: t.nav.copilot, hint: t.nav.hintCopilot }
    ];

    return `
      <div class="cc-brand" style="padding: 10px 10px 16px 10px;">
        <div style="width: 36px; height: 36px; border-radius: 14px; background: linear-gradient(135deg, rgba(52,211,153,0.92), rgba(34,211,238,0.84)); box-shadow: 0 16px 40px rgba(34,211,238,0.16);"></div>
        <div>
          <div style="font-weight: 900; line-height: 1.1;">SBS Engine</div>
          <div style="font-size: 12px; color: rgba(226,232,240,0.55);">Integration Command</div>
        </div>
      </div>

      <div class="nav-group">
        ${items.map(it => {
          const current = this.activeWorkspace === it.key;
          return `
            <button class="nav-item" aria-current="${current ? 'page' : 'false'}" onclick="app.navigate('${it.path}')">
              <span class="nav-icon">${this.iconSvg(it.icon)}</span>
              <span class="nav-text">
                <span class="nav-label">${it.label}</span>
                <span class="nav-hint">${it.hint}</span>
              </span>
            </button>
          `;
        }).join('')}
      </div>

      <div style="margin-top: 18px; padding: 12px;" class="panel">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
          <div>
            <div style="font-weight:900; font-size:12px;">${t.top.status}</div>
            <div style="font-size:11px; color: rgba(226,232,240,0.55);">${this.lastServicesStatus?.overallHealth || '—'}</div>
          </div>
          <span class="cc-badge"><span class="cc-dot"></span> LIVE</span>
        </div>
      </div>
    `;
  }

  renderTopbar(t) {
    return `
      <div style="display:flex; align-items:center; gap:12px;">
        <span class="cc-badge"><span class="cc-dot"></span>${t.top.badge}</span>
        ${this.currentClaimId ? `<span class="cc-badge" style="border-color: rgba(52,211,153,0.28); background: rgba(52,211,153,0.10);">${t.claim.claimId}: <span style="font-family: var(--mono); font-weight: 900;">${this.escapeHtml(this.currentClaimId)}</span></span>` : ''}
      </div>

      <div style="display:flex; align-items:center; gap:10px;">
        ${this.currentClaimId ? `
          <button class="sbs-btn" onclick="navigator.clipboard?.writeText(app.getTrackingUrl()); app.toast('Copied tracking URL', 'success');">${t.claim.share}</button>
          <a class="sbs-btn" href="${this.getReceiptUrl()}" target="_blank" rel="noreferrer">${t.claim.receipt}</a>
        ` : ''}
        <button class="sbs-btn" onclick="app.toggleLang()">${t.top.lang}</button>
      </div>
    `;
  }

  renderWorkspace() {
    const t = translations[this.lang];

    const header = (title, subtitle) => `
      <div class="sbs-fade-in" style="margin-bottom: 12px;">
        <div style="font-size: 20px; font-weight: 950; letter-spacing: 0.2px;">${title}</div>
        <div style="color: rgba(226,232,240,0.55); margin-top: 4px;">${subtitle}</div>
      </div>
    `;

    if (this.activeWorkspace === 'eligibility') {
      return `
        ${header(t.eligibility.title, t.eligibility.subtitle)}
        <div class="panel">
          <div class="panel-header">
            <div>
              <div class="panel-title">${t.eligibility.title}</div>
              <div class="panel-sub">Unified workspace theme</div>
            </div>
          </div>
          <div class="panel-body">
            <form onsubmit="app.runEligibility(event)" class="sbs-grid sbs-cols-1 md-cols-2 sbs-gap-3">
              <div>
                <label class="text-xs" style="color: rgba(226,232,240,0.55);">${t.eligibility.memberId}</label>
                <input name="memberId" class="sbs-input" placeholder="105…" required />
              </div>
              <div>
                <label class="text-xs" style="color: rgba(226,232,240,0.55);">${t.eligibility.payerId}</label>
                <input name="payerId" class="sbs-input" placeholder="PAYER_…" />
              </div>
              <div>
                <label class="text-xs" style="color: rgba(226,232,240,0.55);">dateOfService</label>
                <input name="dateOfService" class="sbs-input" placeholder="2026-02-07" />
              </div>
              <div>
                <label class="text-xs" style="color: rgba(226,232,240,0.55);">facilityId</label>
                <input name="facilityId" class="sbs-input" placeholder="1" />
              </div>
              <div class="md-span-2" style="display:flex; gap:10px;">
                <button class="sbs-btn sbs-btn-primary" type="submit">${t.eligibility.check}</button>
                <button class="sbs-btn" type="button" onclick="app.eligibilityResult=null; app.render();">Clear</button>
              </div>
            </form>

            ${this.eligibilityResult ? `
              <div style="margin-top: 14px;" class="terminal">
                <div class="terminal-header">
                  <div style="font-weight:900;">Eligibility Result</div>
                  <div class="term-muted" style="font-family: var(--mono);">${this.escapeHtml(this.eligibilityResult.timestamp || nowIso())}</div>
                </div>
                <div class="terminal-body">
                  <div class="term-line">eligible=${this.escapeHtml(String(this.eligibilityResult.eligible))}</div>
                  <div class="term-line">plan=${this.escapeHtml(this.eligibilityResult.plan || '—')}</div>
                  <div class="term-line">benefits=${this.escapeHtml((this.eligibilityResult.benefits || []).join(', ') || '—')}</div>
                  ${this.eligibilityResult.coverage ? `<div class="term-line">coverage=${this.escapeHtml(JSON.stringify(this.eligibilityResult.coverage))}</div>` : ''}
                  <div class="term-line">source=${this.escapeHtml(this.eligibilityResult.source || '—')}</div>
                  <div class="term-line">notes=${this.escapeHtml(this.eligibilityResult.notes || '—')}</div>
                </div>
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }

    if (this.activeWorkspace === 'prior-auth') {
      return `
        ${header(t.priorAuth.title, t.priorAuth.subtitle)}
        <div class="panel">
          <div class="panel-header">
            <div>
              <div class="panel-title">${t.priorAuth.title}</div>
              <div class="panel-sub">Unified workspace theme</div>
            </div>
          </div>
          <div class="panel-body">
            <form onsubmit="app.submitPriorAuth(event)" class="sbs-grid sbs-cols-1 md-cols-2 sbs-gap-3">
              <div>
                <label class="text-xs" style="color: rgba(226,232,240,0.55);">${t.priorAuth.memberId}</label>
                <input name="memberId" class="sbs-input" required />
              </div>
              <div>
                <label class="text-xs" style="color: rgba(226,232,240,0.55);">${t.priorAuth.procedureCode}</label>
                <input name="procedureCode" class="sbs-input" placeholder="SBS-…" required />
              </div>
              <div class="md-span-2" style="display:flex; gap:10px;">
                <button class="sbs-btn sbs-btn-primary" type="submit">${t.priorAuth.submit}</button>
                <button class="sbs-btn" type="button" onclick="app.priorAuthResult=null; app.render();">Clear</button>
              </div>
            </form>

            ${this.priorAuthResult ? `
              <div style="margin-top: 14px;" class="terminal">
                <div class="terminal-header">
                  <div style="font-weight:900;">Prior Auth Result</div>
                  <div class="term-muted" style="font-family: var(--mono);">${this.escapeHtml(this.priorAuthResult.timestamp || nowIso())}</div>
                </div>
                <div class="terminal-body">
                  <div class="term-line">authId=${this.escapeHtml(this.priorAuthResult.authId || '—')}</div>
                  <div class="term-line">status=${this.escapeHtml(this.priorAuthResult.status || '—')}</div>
                  <div class="term-line">eta=${this.escapeHtml(this.priorAuthResult.eta || '—')}</div>
                  <div class="term-line">notes=${this.escapeHtml(this.priorAuthResult.notes || '—')}</div>
                </div>
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }

    if (this.activeWorkspace === 'code-browser') {
      return `
        ${header(t.codeBrowser.title, t.codeBrowser.subtitle)}
        <div class="panel">
          <div class="panel-header">
            <div>
              <div class="panel-title">Normalization Console</div>
              <div class="panel-sub">Calls landing proxy → normalizer /normalize</div>
            </div>
          </div>
          <div class="panel-body">
            <form onsubmit="app.normalizeCode(event)" class="sbs-grid sbs-cols-1 md-cols-3 sbs-gap-3">
              <div>
                <label class="text-xs" style="color: rgba(226,232,240,0.55);">${t.codeBrowser.facilityId}</label>
                <input name="facilityId" class="sbs-input" value="1" />
              </div>
              <div>
                <label class="text-xs" style="color: rgba(226,232,240,0.55);">${t.codeBrowser.internalCode}</label>
                <input name="internalCode" class="sbs-input" placeholder="LAB-001" required />
              </div>
              <div>
                <label class="text-xs" style="color: rgba(226,232,240,0.55);">${t.codeBrowser.description}</label>
                <input name="description" class="sbs-input" placeholder="CBC panel" />
              </div>
              <div style="display:flex; gap:10px; grid-column: 1 / -1;">
                <button class="sbs-btn sbs-btn-primary" type="submit">${t.codeBrowser.normalize}</button>
                <button class="sbs-btn" type="button" onclick="app.normalizeResult=null; app.render();">Clear</button>
              </div>
            </form>

            ${this.normalizeResult ? `
              <div style="margin-top: 14px;" class="panel panel-strong">
                <div class="panel-header">
                  <div>
                    <div class="panel-title">Mapped Code</div>
                    <div class="panel-sub">request_id=${this.escapeHtml(this.normalizeResult.request_id || '—')}</div>
                  </div>
                  <span class="cc-badge" style="border-color: rgba(34,211,238,0.28); background: rgba(34,211,238,0.10);">confidence=${this.escapeHtml(String(this.normalizeResult.confidence ?? '—'))}</span>
                </div>
                <div class="panel-body">
                  <div style="font-family: var(--mono); font-weight: 950; font-size: 18px;">${this.escapeHtml(this.normalizeResult.sbs_mapped_code || '—')}</div>
                  <div style="margin-top: 6px; color: rgba(226,232,240,0.70);">${this.escapeHtml(this.normalizeResult.official_description || '')}</div>
                  <div style="margin-top: 10px; color: rgba(226,232,240,0.55); font-size: 12px;">source=${this.escapeHtml(this.normalizeResult.mapping_source || '—')} • processing=${this.escapeHtml(String(this.normalizeResult.processing_time_ms || '—'))}ms</div>
                </div>
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }

    if (this.activeWorkspace === 'ai-analytics') {
      const terminalControls = `
        <div style="display:flex; gap:10px;">
          <button class="sbs-btn" onclick="app.clearTerminal()">${t.analytics.clear}</button>
          ${this.analyticsPaused
            ? `<button class="sbs-btn sbs-btn-primary" onclick="app.setAnalyticsPaused(false)">${t.analytics.resume}</button>`
            : `<button class="sbs-btn" onclick="app.setAnalyticsPaused(true)">${t.analytics.pause}</button>`
          }
        </div>
      `;

      const services = this.lastServicesStatus?.services || [];
      const overall = this.lastServicesStatus?.overallHealth || '—';

      const healthyCount = services.filter(s => s.status === 'healthy').length;
      const totalCount = services.length || 4;
      const healthPct = Math.round((healthyCount / totalCount) * 100);
      const ringR = 44;
      const ringC = 2 * Math.PI * ringR;
      const ringDash = Math.round((healthPct / 100) * ringC);
      const activity = Math.min(100, Math.round((this.terminalLines.length / 200) * 100));

      return `
        ${header(t.analytics.title, t.analytics.subtitle)}

        <div class="sbs-grid sbs-cols-1 lg-cols-3 sbs-gap-4">
          <div class="lg-span-2 terminal">
            <div class="terminal-header">
              <div style="font-weight:900;">${t.analytics.terminal}</div>
              ${terminalControls}
            </div>
            <div class="terminal-body" id="terminal-body">
              ${(this.terminalLines.length ? this.terminalLines : [{ts:'—',source:'system',message:'Telemetry awaiting events…',status:''}]).map(l => {
                const cls = l.status === 'completed' ? 'term-good' : l.status === 'failed' ? 'term-bad' : 'term-muted';
                return `<div class="term-line ${cls}">[${this.escapeHtml(l.ts)}] ${this.escapeHtml(l.source)} :: ${this.escapeHtml(l.message)}</div>`;
              }).join('')}
            </div>
          </div>

          <div class="panel">
            <div class="panel-header">
              <div>
                <div class="panel-title">AI Cards</div>
                <div class="panel-sub">overall=${this.escapeHtml(overall)}</div>
              </div>
            </div>
            <div class="panel-body" style="display:flex; flex-direction:column; gap:10px;">
              ${services.map(svc => {
                const ok = svc.status === 'healthy';
                const badgeStyle = ok
                  ? 'border-color: rgba(52,211,153,0.28); background: rgba(52,211,153,0.10);'
                  : 'border-color: rgba(251,113,133,0.28); background: rgba(251,113,133,0.10);';
                return `
                  <div class="panel" style="border-radius: 16px;">
                    <div class="panel-body" style="display:flex; align-items:center; justify-content:space-between; gap:10px; padding: 12px;">
                      <div>
                        <div style="font-weight: 950;">${this.escapeHtml(svc.service)}</div>
                        <div style="color: rgba(226,232,240,0.55); font-size: 12px;">${ok ? 'Stable' : (svc.error || 'Degraded')}</div>
                      </div>
                      <span class="cc-badge" style="${badgeStyle}">${this.escapeHtml(svc.status)}</span>
                    </div>
                  </div>
                `;
              }).join('') || '<div class="term-muted">No service telemetry yet.</div>'}
            </div>
          </div>
        </div>

        <div style="margin-top: 14px;" class="panel panel-strong">
          <div class="panel-header">
            <div>
              <div class="panel-title">Cinematic Results Visualization</div>
              <div class="panel-sub">health ring + inference activity gauge</div>
            </div>
            <span class="cc-badge" style="border-color: rgba(34,211,238,0.28); background: rgba(34,211,238,0.10);">health=${healthPct}%</span>
          </div>
          <div class="panel-body" style="display:grid; grid-template-columns: 180px 1fr; gap: 14px; align-items:center;">
            <div style="display:grid; place-items:center;">
              <svg width="120" height="120" viewBox="0 0 120 120">
                <defs>
                  <linearGradient id="sbsRing" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stop-color="rgba(52,211,153,0.95)" />
                    <stop offset="100%" stop-color="rgba(34,211,238,0.95)" />
                  </linearGradient>
                </defs>
                <circle cx="60" cy="60" r="${ringR}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="12" />
                <circle cx="60" cy="60" r="${ringR}" fill="none" stroke="url(#sbsRing)" stroke-width="12"
                  stroke-linecap="round" transform="rotate(-90 60 60)"
                  stroke-dasharray="${ringDash} ${Math.max(0, ringC - ringDash)}" />
                <text x="60" y="62" text-anchor="middle" fill="rgba(255,255,255,0.92)" font-size="18" font-family="var(--mono)" font-weight="900">${healthPct}%</text>
                <text x="60" y="80" text-anchor="middle" fill="rgba(226,232,240,0.55)" font-size="10" font-family="var(--mono)">overall</text>
              </svg>
            </div>

            <div>
              <div style="display:flex; align-items:center; justify-content:space-between; gap: 10px;">
                <div style="font-weight: 950;">Inference Activity</div>
                <div style="font-family: var(--mono); color: rgba(226,232,240,0.55);">activity=${activity}%</div>
              </div>
              <div style="margin-top: 10px; height: 12px; border-radius: 999px; background: rgba(255,255,255,0.06); border: 1px solid rgba(148,163,184,0.16); overflow:hidden;">
                <div style="width:${activity}%; height:100%; background: linear-gradient(90deg, rgba(167,139,250,0.22), rgba(34,211,238,0.22));"></div>
              </div>
              <div style="margin-top: 10px; color: rgba(226,232,240,0.55); font-size: 12px;">
                Healthy services: <span style="font-family: var(--mono); font-weight: 900;">${healthyCount}/${totalCount}</span> • Terminal events: <span style="font-family: var(--mono); font-weight: 900;">${this.terminalLines.length}</span>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    if (this.activeWorkspace === 'copilot') {
      return `
        ${header(t.copilot.title, t.copilot.subtitle)}
        <div class="sbs-grid sbs-cols-1 lg-cols-3 sbs-gap-4" style="min-height: 520px;">
          <div class="panel">
            <div class="panel-header">
              <div>
                <div class="panel-title">HUD Status</div>
                <div class="panel-sub">Provider exposed via /api/copilot/chat</div>
              </div>
            </div>
            <div class="panel-body" style="display:flex; flex-direction:column; gap:10px;">
              <div class="cc-badge" style="justify-content: space-between;">
                <span>connection</span><span style="font-family: var(--mono);">online</span>
              </div>
              <div class="cc-badge" style="justify-content: space-between; border-color: rgba(167,139,250,0.25); background: rgba(167,139,250,0.10);">
                <span>workspace</span><span style="font-family: var(--mono);">${this.escapeHtml(this.activeWorkspace)}</span>
              </div>
              <div class="cc-badge" style="justify-content: space-between; border-color: rgba(34,211,238,0.25); background: rgba(34,211,238,0.10);">
                <span>claimId</span><span style="font-family: var(--mono);">${this.escapeHtml(this.currentClaimId || '—')}</span>
              </div>
              <div class="terminal" style="margin-top: 8px;">
                <div class="terminal-header">
                  <div style="font-weight:900;">Operator Notes</div>
                </div>
                <div class="terminal-body">
                  <div class="term-line term-muted">• This Copilot is safe-by-default and does not expose secrets.</div>
                  <div class="term-line term-muted">• When DeepSeek is enabled server-side, replies are labeled accordingly.</div>
                </div>
              </div>
            </div>
          </div>

          <div class="terminal lg-span-2 chat">
            <div class="terminal-header">
              <div style="font-weight:900;">Cinematic Chat</div>
              <div class="term-muted" style="font-family: var(--mono);">mode=HUD</div>
            </div>
            <div class="chat-feed" id="chat-feed">
              ${this.chatMessages.map(m => `
                <div class="chat-msg ${m.role === 'me' ? 'me' : 'ai'}">
                  <div class="chat-meta">${m.role === 'me' ? 'operator' : 'copilot'} • ${this.escapeHtml(new Date(m.ts).toLocaleTimeString())}</div>
                  <div class="chat-text">${this.escapeHtml(m.text)}</div>
                </div>
              `).join('')}
            </div>
            <form class="chat-compose" onsubmit="app.sendCopilot(event)">
              <input id="copilot-input" class="sbs-input" placeholder="${this.escapeHtml(t.copilot.placeholder)}" ${this.copilotBusy ? 'disabled' : ''} />
              <button class="sbs-btn sbs-btn-primary" type="submit" ${this.copilotBusy ? 'disabled' : ''}>${t.copilot.send}</button>
            </form>
          </div>
        </div>
      `;
    }

    // Default: claim builder
    const risk = this.computeRiskVectors(this.currentClaimId, this.claimStatus);
    const riskEntries = Object.entries(risk);

    const radarKeys = ['dataCompleteness', 'codeMapping', 'eligibility', 'fraudSignals', 'slaRisk'];
    const radarVals = radarKeys.map(k => risk[k] ?? 0);
    const cx = 90;
    const cy = 90;
    const rr = 62;
    const points = radarVals.map((v, i) => {
      const a = (Math.PI * 2 * i) / radarVals.length - Math.PI / 2;
      const r = rr * clamp01(v);
      return `${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`;
    }).join(' ');

    const kpi = (label, value, hint = '') => `
      <div class="panel" style="border-radius: 16px;">
        <div class="panel-body" style="padding: 12px;">
          <div style="color: rgba(226,232,240,0.55); font-size: 12px; font-weight: 800;">${label}</div>
          <div style="margin-top: 4px; font-weight: 950; font-size: 18px; font-family: var(--mono);">${value}</div>
          ${hint ? `<div style="margin-top: 6px; color: rgba(226,232,240,0.55); font-size: 11px;">${hint}</div>` : ''}
        </div>
      </div>
    `;

    const claimComplete = Boolean(this.claimStatus?.isComplete);
    const claimSuccess = Boolean(this.claimStatus?.isSuccess);

    const analyzerScore = (this.claimAnalysis?.success && typeof this.claimAnalysis?.risk?.score100 === 'number')
      ? this.claimAnalysis.risk.score100
      : null;

    return `
      ${header(t.claim.title, t.claim.subtitle)}

      <div class="sbs-grid sbs-cols-1 xl-cols-3 sbs-gap-4">
        <div class="panel xl-span-2">
          <div class="panel-header">
            <div>
              <div class="panel-title">Submission Console</div>
              <div class="panel-sub">Landing API orchestration → Normalizer → Financial Rules → Signer → NPHIES</div>
            </div>
            <div style="display:flex; gap:10px;">
              <button class="sbs-btn" onclick="app.navigate('/ai-analytics')">Open Analytics</button>
              <button class="sbs-btn" onclick="app.navigate('/copilot')">Open Copilot</button>
            </div>
          </div>
          <div class="panel-body">
            <form onsubmit="app.submitClaim(event)" class="sbs-grid sbs-cols-1 md-cols-2 sbs-gap-3">
              <div>
                <label class="text-xs" style="color: rgba(226,232,240,0.55);">${t.claim.patientName} *</label>
                <input name="patientName" required class="sbs-input" />
              </div>
              <div>
                <label class="text-xs" style="color: rgba(226,232,240,0.55);">${t.claim.patientId} *</label>
                <input name="patientId" required class="sbs-input" />
              </div>
              <div>
                <label class="text-xs" style="color: rgba(226,232,240,0.55);">${t.claim.memberId}</label>
                <input name="memberId" class="sbs-input" />
              </div>
              <div>
                <label class="text-xs" style="color: rgba(226,232,240,0.55);">${t.claim.payerId}</label>
                <input name="payerId" class="sbs-input" />
              </div>
              <div>
                <label class="text-xs" style="color: rgba(226,232,240,0.55);">${t.claim.claimType} *</label>
                <select name="claimType" required class="sbs-select">
                  <option value="professional">${t.claim.professional}</option>
                  <option value="institutional">${t.claim.institutional}</option>
                  <option value="pharmacy">${t.claim.pharmacy}</option>
                  <option value="vision">${t.claim.vision}</option>
                </select>
              </div>
              <div>
                <label class="text-xs" style="color: rgba(226,232,240,0.55);">${t.claim.userEmail} *</label>
                <input name="userEmail" type="email" required class="sbs-input" />
              </div>

              <div class="md-span-2">
                <label class="text-xs" style="color: rgba(226,232,240,0.55);">${t.claim.uploadFile}</label>
                <div id="sbs-file-drop" class="file-upload-area">
                  <input type="file" id="file-input" class="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.json,.xml,.jpg,.jpeg,.png" onchange="app.handleFileSelect(event)">
                  <label for="file-input" class="cursor-pointer" style="display:block;">
                    <div style="display:flex; align-items:center; justify-content:space-between; gap:12px;">
                      <div>
                        <div style="font-weight: 950;">${t.claim.dragDrop}</div>
                        <div style="margin-top: 4px; color: rgba(226,232,240,0.55); font-size: 12px;">${t.claim.fileTypes}</div>
                      </div>
                      <div class="cc-badge" style="border-color: rgba(34,211,238,0.22); background: rgba(34,211,238,0.10); font-family: var(--mono);">
                        ${this.selectedFile ? this.escapeHtml(this.selectedFile.name) : 'no-file'}
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              <div class="md-span-2" style="display:flex; gap:10px; align-items:center;">
                <button type="submit" class="sbs-btn sbs-btn-primary" ${this.isSubmitting ? 'disabled' : ''}>
                  ${this.isSubmitting ? t.claim.submitting : t.claim.submit}
                </button>
                <div style="color: rgba(226,232,240,0.55); font-size: 12px;">
                  ${this.currentClaimId ? `tracking=${this.escapeHtml(this.currentClaimId)}` : '—'}
                </div>
              </div>
            </form>
          </div>
        </div>

        <div class="panel">
          <div class="panel-header">
            <div>
              <div class="panel-title">${t.claim.analyzer}</div>
              <div class="panel-sub">${t.claim.analyzerHint}</div>
            </div>
          </div>
          <div class="panel-body">
            <div class="kpi-grid" style="grid-template-columns: repeat(2, minmax(0, 1fr));">
              ${kpi('status', this.escapeHtml(this.claimStatus?.statusLabel || this.claimStatus?.status || '—'))}
              ${kpi('progress', this.escapeHtml(String(this.claimStatus?.progress?.percentage ?? '—')) + '%')}
              ${kpi('errors', this.escapeHtml(String(this.claimStatus?.errors?.length || 0)))}
              ${kpi('riskIndex', this.escapeHtml(String(analyzerScore !== null ? analyzerScore : Math.round((risk.fraudSignals + risk.slaRisk) * 50))) + '/100', analyzerScore !== null ? 'server analyzer' : 'composite')}
            </div>

            <div style="margin-top: 12px;" class="panel panel-strong">
              <div class="panel-header">
                <div>
                  <div class="panel-title">${t.claim.riskHub}</div>
                  <div class="panel-sub">${t.claim.riskHint}</div>
                </div>
              </div>
              <div class="panel-body" style="display:flex; flex-direction:column; gap:8px;">
                ${riskEntries.map(([k, v]) => {
                  const pct = Math.round(v * 100);
                  const tone = pct >= 70 ? 'rgba(251,113,133,0.20)' : pct >= 55 ? 'rgba(251,191,36,0.18)' : 'rgba(52,211,153,0.14)';
                  return `
                    <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
                      <div style="font-family: var(--mono); font-size: 12px; font-weight: 900;">${this.escapeHtml(k)}</div>
                      <div style="flex: 1; height: 8px; border-radius: 999px; background: rgba(255,255,255,0.06); border: 1px solid rgba(148,163,184,0.16); overflow:hidden;">
                        <div style="width:${pct}%; height:100%; background: linear-gradient(90deg, ${tone}, rgba(34,211,238,0.22));"></div>
                      </div>
                      <div style="font-family: var(--mono); font-weight: 950;">${pct}</div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>

            <div style="margin-top: 12px;" class="panel">
              <div class="panel-header">
                <div>
                  <div class="panel-title">Risk Vector Radar</div>
                  <div class="panel-sub">${this.currentClaimId ? `seed=${this.escapeHtml(this.currentClaimId)}` : 'seed=demo'}</div>
                </div>
              </div>
              <div class="panel-body" style="display:flex; gap:14px; align-items:center;">
                <svg width="180" height="180" viewBox="0 0 180 180" aria-label="risk radar">
                  <defs>
                    <linearGradient id="sbsRadar" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stop-color="rgba(52,211,153,0.85)" />
                      <stop offset="100%" stop-color="rgba(34,211,238,0.85)" />
                    </linearGradient>
                  </defs>
                  <circle cx="${cx}" cy="${cy}" r="${rr}" fill="none" stroke="rgba(148,163,184,0.16)" />
                  <circle cx="${cx}" cy="${cy}" r="${Math.round(rr*0.66)}" fill="none" stroke="rgba(148,163,184,0.12)" />
                  <circle cx="${cx}" cy="${cy}" r="${Math.round(rr*0.33)}" fill="none" stroke="rgba(148,163,184,0.10)" />
                  ${radarVals.map((_, i) => {
                    const a = (Math.PI * 2 * i) / radarVals.length - Math.PI / 2;
                    const x = cx + Math.cos(a) * rr;
                    const y = cy + Math.sin(a) * rr;
                    return `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="rgba(148,163,184,0.12)" />`;
                  }).join('')}
                  <polygon points="${points}" fill="url(#sbsRadar)" fill-opacity="0.22" stroke="rgba(34,211,238,0.55)" stroke-width="1.5" />
                  ${radarKeys.map((k, i) => {
                    const a = (Math.PI * 2 * i) / radarVals.length - Math.PI / 2;
                    const x = cx + Math.cos(a) * (rr + 14);
                    const y = cy + Math.sin(a) * (rr + 14);
                    const anchor = x < cx - 5 ? 'end' : x > cx + 5 ? 'start' : 'middle';
                    return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="${anchor}" fill="rgba(226,232,240,0.55)" font-size="9" font-family="var(--mono)">${this.escapeHtml(k.replace(/([A-Z])/g,' $1'))}</text>`;
                  }).join('')}
                </svg>

                <div style="flex:1; display:flex; flex-direction:column; gap:8px;">
                  ${radarKeys.map((k, i) => {
                    const pct = Math.round(radarVals[i] * 100);
                    return `<div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
                      <div style="font-family: var(--mono); font-size: 12px; font-weight: 900;">${this.escapeHtml(k)}</div>
                      <div style="font-family: var(--mono); font-weight: 950;">${pct}</div>
                    </div>`;
                  }).join('')}
                </div>
              </div>
            </div>

            ${this.currentClaimId ? `
              <div style="margin-top: 12px; display:flex; gap:10px;">
                <button class="sbs-btn" onclick="app.fetchClaimStatus()">${t.claim.track}</button>
                <button class="sbs-btn sbs-btn-danger" onclick="app.retryClaim()" ${claimComplete && !claimSuccess ? '' : 'disabled'}>${t.tracking.retry}</button>
              </div>
            ` : ''}
          </div>
        </div>
      </div>

      <div style="margin-top: 14px;" class="panel">
        <div class="panel-header">
          <div>
            <div class="panel-title">${t.tracking.title}</div>
            <div class="panel-sub">${t.tracking.subtitle}</div>
          </div>
          <div style="display:flex; gap:10px;">
            <input id="track-input" class="sbs-input" style="max-width: 320px;" placeholder="CLM-XXXX-XXXX" value="${this.escapeHtml(this.currentClaimId || '')}" />
            <button class="sbs-btn sbs-btn-primary" onclick="app.startTracking(document.getElementById('track-input').value)">${t.tracking.start}</button>
          </div>
        </div>
        <div class="panel-body">
          ${this.claimStatus?.timeline?.length ? `
            <div class="terminal">
              <div class="terminal-header">
                <div style="font-weight:900;">Timeline</div>
                <div class="term-muted" style="font-family: var(--mono);">events=${this.claimStatus.timeline.length}</div>
              </div>
              <div class="terminal-body">
                ${this.claimStatus.timeline.slice(-40).map(ev => {
                  const status = ev.status || '';
                  const cls = status === 'completed' ? 'term-good' : status === 'failed' ? 'term-bad' : 'term-muted';
                  return `<div class="term-line ${cls}">[${this.escapeHtml(new Date(ev.timestamp).toLocaleTimeString())}] ${this.escapeHtml(ev.message || ev.event)}</div>`;
                }).join('')}
              </div>
            </div>
          ` : '<div class="term-muted">No timeline yet. Submit or track a claim.</div>'}
        </div>
      </div>
    `;
  }

  render() {
    const t = translations[this.lang];
    const root = document.getElementById('app');
    if (!root) return;

    root.innerHTML = `
      <div class="cc-shell">
        <header class="cc-topbar">
          ${this.renderTopbar(t)}
        </header>

        <aside class="cc-sidebar">
          ${this.renderSidebar(t)}
        </aside>

        <main class="cc-main">
          ${this.renderWorkspace()}
          <div style="margin-top: 18px; color: rgba(226,232,240,0.45); font-size: 12px;">
            © 2026 SBS Integration Engine • Command Center UI
          </div>
        </main>
      </div>
    `;

    // bind drag & drop after render
    this.bindUploadDragDrop();

    // keep terminal scrolled
    if (this.activeWorkspace === 'ai-analytics') {
      const tb = document.getElementById('terminal-body');
      if (tb) tb.scrollTop = tb.scrollHeight;
    }
  }
}

// Expose globally for onclick handlers.
window.app = new SBSCommandCenter();
