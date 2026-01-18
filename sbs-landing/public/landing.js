// SBS Integration Engine Landing Page
// Vanilla JS + Tailwind - No build step required

/**
 * Toast Notification System
 */
class ToastManager {
  constructor() {
    this.container = null;
    this.toasts = [];
  }

  init() {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      this.container.className = 'fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none';
      this.container.style.cssText = 'max-width: 400px;';
      document.body.appendChild(this.container);
    }
    return this.container;
  }

  show(message, type = 'info', duration = 5000) {
    this.init();
    
    const toast = document.createElement('div');
    const id = Date.now();
    toast.dataset.toastId = id;
    
    const colors = {
      success: 'bg-emerald-600',
      error: 'bg-red-600',
      warning: 'bg-amber-600',
      info: 'bg-blue-600'
    };
    
    const icons = {
      success: 'M5 13l4 4L19 7',
      error: 'M6 18L18 6M6 6l12 12',
      warning: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
      info: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
    };
    
    toast.className = `pointer-events-auto ${colors[type]} text-white px-6 py-4 rounded-lg shadow-lg flex items-start gap-3 transform translate-x-full transition-all duration-300 ease-out`;
    
    toast.innerHTML = `
      <svg class="w-6 h-6 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${icons[type]}"></path>
      </svg>
      <div class="flex-1">
        <div class="text-sm">${this.escapeHtml(message)}</div>
      </div>
      <button class="toast-close ml-2 text-white/80 hover:text-white transition-colors">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>
    `;
    
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => this.dismiss(id));
    
    this.container.appendChild(toast);
    this.toasts.push({ id, element: toast });
    
    // Animate in
    requestAnimationFrame(() => {
      toast.style.transform = 'translateX(0)';
    });
    
    // Auto-dismiss
    if (duration > 0) {
      setTimeout(() => this.dismiss(id), duration);
    }
    
    return id;
  }

  dismiss(id) {
    const index = this.toasts.findIndex(t => t.id === id);
    if (index === -1) return;
    
    const { element } = this.toasts[index];
    element.style.transform = 'translateX(400px)';
    element.style.opacity = '0';
    
    setTimeout(() => {
      element.remove();
      this.toasts.splice(index, 1);
    }, 300);
  }

  success(message, duration) { return this.show(message, 'success', duration); }
  error(message, duration) { return this.show(message, 'error', duration); }
  warning(message, duration) { return this.show(message, 'warning', duration); }
  info(message, duration) { return this.show(message, 'info', duration); }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Global toast instance
const toast = new ToastManager();

// Confetti celebration effect
function showConfetti() {
  const colors = ['#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b'];
  const confettiCount = 50;
  
  for (let i = 0; i < confettiCount; i++) {
    const confetti = document.createElement('div');
    confetti.className = 'confetti';
    confetti.style.left = Math.random() * 100 + 'vw';
    confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    confetti.style.animationDelay = Math.random() * 1 + 's';
    confetti.style.animationDuration = (Math.random() * 2 + 2) + 's';
    confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';
    document.body.appendChild(confetti);
    
    // Remove after animation
    setTimeout(() => confetti.remove(), 5000);
  }
}

const translations = {
  en: {
    nav: {
      features: "Features",
      submitClaim: "Submit Claim",
      docs: "Documentation",
      lang: "AR"
    },
    hero: {
      badge: "Production Ready v1.0",
      title: "The Ultimate Saudi Billing System Integration Engine",
      subtitle: "A high-performance, AI-powered bridge between your hospital system and NPHIES. Fully compliant, secure, and blazing fast.",
      cta_submit: "Submit Claim",
      cta_docs: "Read Documentation"
    },
    claim: {
      title: "Submit Insurance Claim",
      subtitle: "Upload your claim and our system will automatically process it through validation, normalization, signing, and NPHIES submission.",
      patientName: "Patient Name",
      patientId: "Patient ID / Iqama",
      memberId: "Member ID",
      payerId: "Payer ID",
      claimType: "Claim Type",
      professional: "Professional",
      institutional: "Institutional",
      pharmacy: "Pharmacy",
      vision: "Vision",
      userEmail: "Your Email",
      uploadFile: "Upload Claim Document",
      dragDrop: "Drag and drop or click to browse",
      fileTypes: "PDF, DOC, XLS, JSON, XML (Max 10MB)",
      submit: "Submit Claim",
      submitting: "Processing...",
      success: "Success!",
      successMsg: "Your claim has been submitted and is being processed through our workflow.",
      error: "Error",
      close: "Close",
      trackStatus: "Track Status",
      trackingTitle: "Claim Tracking",
      trackingSubtitle: "Real-time workflow progress",
      claimIdLabel: "Claim ID",
      trackExisting: "Track Existing Claim",
      enterClaimId: "Enter Claim ID",
      startTracking: "Start Tracking",
      invalidClaimId: "Invalid claim ID format",
      timeline: "Timeline",
      expectedTime: "Expected time",
      nextStep: "Next step",
      shareTracking: "Share Tracking Link",
      downloadReceipt: "Download Receipt",
      slaWarning: "This stage is taking longer than expected",
      stages: {
        received: "Received",
        validation: "Validation",
        normalization: "Normalization",
        financialRules: "Financial Rules",
        signing: "Digital Signing",
        nphiesSubmission: "NPHIES Submission"
      },
      stageStatus: {
        pending: "Pending",
        in_progress: "In Progress",
        completed: "Completed",
        failed: "Failed"
      },
      retry: "Retry Claim",
      processing: "Processing",
      complete: "Complete",
      failed: "Failed"
    },
    services: {
      title: "Core Microservices",
      subtitle: "Four robust, containerized services powering your revenue cycle.",
      cards: [
        { title: "Normalizer Service", desc: "AI-powered code translation using Gemini Pro. Converts local codes to SBS standard in milliseconds." },
        { title: "Financial Rules", desc: "Complete CHI business logic. Handles bundle detection and tier-based pricing automatically." },
        { title: "Signer Service", desc: "Military-grade security. RSA-2048 digital signatures and SHA-256 hashing for every payload." },
        { title: "NPHIES Bridge", desc: "Direct integration with national platform. Auto-retry logic and exponential backoff." }
      ]
    },
    footer: {
      rights: "© 2026 SBS Integration Engine.",
      desc: "Empowering digital health transformation.",
      powered: "Powered by BrainSAIT برينسايت",
      author: "Auth: Dr.Mohamed El Fadil"
    }
  },
  ar: {
    nav: {
      features: "المميزات",
      submitClaim: "تقديم مطالبة",
      docs: "الوثائق",
      lang: "EN"
    },
    hero: {
      badge: "جاهز للإنتاج v1.0",
      title: "المحرك المتكامل لنظام الفوترة السعودي",
      subtitle: "جسر عالي الأداء ومدعوم بالذكاء الاصطناعي بين نظام المستشفى ومنصة نفيس. متوافق تماماً، آمن، وسريع للغاية.",
      cta_submit: "تقديم مطالبة",
      cta_docs: "اقرأ الوثائق"
    },
    claim: {
      title: "تقديم مطالبة تأمينية",
      subtitle: "قم بتحميل مطالبتك وسيقوم نظامنا بمعالجتها تلقائياً من خلال التحقق والمعايرة والتوقيع والإرسال إلى نفيس.",
      patientName: "اسم المريض",
      patientId: "رقم الهوية / الإقامة",
      memberId: "رقم العضوية",
      payerId: "رقم شركة التأمين",
      claimType: "نوع المطالبة",
      professional: "مهنية",
      institutional: "مؤسسية",
      pharmacy: "صيدلية",
      vision: "بصريات",
      userEmail: "بريدك الإلكتروني",
      uploadFile: "تحميل مستند المطالبة",
      dragDrop: "اسحب وأفلت أو انقر للتصفح",
      fileTypes: "PDF, DOC, XLS, JSON, XML (حد أقصى 10MB)",
      submit: "تقديم المطالبة",
      submitting: "جاري المعالجة...",
      success: "نجح!",
      successMsg: "تم تقديم مطالبتك وهي قيد المعالجة عبر نظامنا.",
      error: "خطأ",
      close: "إغلاق",
      trackStatus: "تتبع الحالة",
      trackingTitle: "تتبع المطالبة",
      trackingSubtitle: "متابعة سير العمل في الوقت الفعلي",
      claimIdLabel: "رقم المطالبة",
      trackExisting: "تتبع مطالبة موجودة",
      enterClaimId: "أدخل رقم المطالبة",
      startTracking: "ابدأ التتبع",
      invalidClaimId: "صيغة رقم المطالبة غير صحيحة",
      timeline: "الخط الزمني",
      expectedTime: "المدة المتوقعة",
      nextStep: "الخطوة التالية",
      shareTracking: "مشاركة رابط التتبع",
      downloadReceipt: "تحميل الإيصال",
      slaWarning: "هذه المرحلة تستغرق وقتًا أطول من المتوقع",
      stages: {
        received: "تم الاستلام",
        validation: "التحقق",
        normalization: "المعايرة",
        financialRules: "القواعد المالية",
        signing: "التوقيع الرقمي",
        nphiesSubmission: "الإرسال لنفيس"
      },
      stageStatus: {
        pending: "قيد الانتظار",
        in_progress: "جاري التنفيذ",
        completed: "مكتمل",
        failed: "فشل"
      },
      retry: "إعادة المحاولة",
      processing: "جاري المعالجة",
      complete: "مكتمل",
      failed: "فشل"
    },
    services: {
      title: "الخدمات الأساسية",
      subtitle: "أربع خدمات قوية ومستقلة لدعم دورة الإيرادات الخاصة بك.",
      cards: [
        { title: "خدمة المعايرة", desc: "ترجمة الأكواد باستخدام Gemini Pro. يحول الأكواد المحلية إلى أكواد SBS القياسية في أجزاء من الثانية." },
        { title: "القواعد المالية", desc: "تطبيق كامل لقواعد مجلس الضمان الصحي. يعالج الحزم والأسعار تلقائياً." },
        { title: "خدمة التوقيع", desc: "أمان من الدرجة العسكرية. توقيعات RSA-2048 وتشفير SHA-256." },
        { title: "جسر نفيس", desc: "تكامل مباشر مع المنصة الوطنية. منطق إعادة محاولة تلقائي." }
      ]
    },
    footer: {
      rights: "© 2026 محرك تكامل SBS.",
      desc: "تمكين التحول الرقمي الصحي.",
      powered: "مدعوم من برينسايت BrainSAIT",
      author: "المؤلف: د.محمد الفاضل"
    }
  }
};

class SBSLandingPage {
  constructor() {
    this.lang = localStorage.getItem('sbs-lang') || 'en';
    this.theme = localStorage.getItem('sbs-theme') || 'dark';
    this.showClaimModal = false;
    this.showSuccessModal = false;
    this.showTrackingModal = false;
    this.isSubmitting = false;
    this.selectedFile = null;
    this.formData = {};
    this.currentClaimId = null;
    this.claimStatus = null;
    this.statusPollingInterval = null;
    this.validationErrors = {};
    this.dragCounter = 0; // For drag-drop handling
    this.init();
  }

  getApiBaseUrl() {
    const rawBaseUrl = (window.SBS_API_BASE_URL || '').trim();
    if (!rawBaseUrl) {
      return '';
    }
    
    // Validate URL format and protocol
    try {
      const url = new URL(rawBaseUrl);
      if (!['http:', 'https:'].includes(url.protocol)) {
        console.error('Invalid protocol in API base URL');
        return '';
      }
      return url.origin;
    } catch (error) {
      console.error('Invalid API base URL format');
      return '';
    }
  }

  getApiClient() {
    if (window.sbsApiClient) {
      return window.sbsApiClient;
    }

    if (window.SBSAPIClient) {
      return new window.SBSAPIClient();
    }

    return null;
  }

  getTrackingUrl() {
    if (!this.currentClaimId) return '';
    const apiBaseUrl = this.getApiBaseUrl();
    return apiBaseUrl
      ? `${apiBaseUrl}/api/claim-status/${this.currentClaimId}`
      : `${window.location.origin}/api/claim-status/${this.currentClaimId}`;
  }

  getReceiptUrl() {
    if (!this.currentClaimId) return '';
    const apiBaseUrl = this.getApiBaseUrl();
    return apiBaseUrl
      ? `${apiBaseUrl}/api/claim-receipt/${this.currentClaimId}`
      : `${window.location.origin}/api/claim-receipt/${this.currentClaimId}`;
  }

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

  getStageGuidance(stageKey) {
    const guidance = {
      received: { expectedTime: '5s', nextStep: 'Validation will start shortly' },
      validation: { expectedTime: '30s', nextStep: 'We will normalize codes next' },
      normalization: { expectedTime: '45s', nextStep: 'Financial rules will be applied' },
      financialRules: { expectedTime: '45s', nextStep: 'Claim will be digitally signed' },
      signing: { expectedTime: '30s', nextStep: 'Submission to NPHIES is next' },
      nphiesSubmission: { expectedTime: '60s', nextStep: 'Await final response' }
    };
    return guidance[stageKey] || { expectedTime: '60s', nextStep: 'Processing continues' };
  }

  init() {
    document.documentElement.lang = this.lang;
    document.documentElement.dir = this.lang === 'ar' ? 'rtl' : 'ltr';
    
    // Check for claim ID in URL
    this.checkUrlParams();
    
    this.render();
    this.attachEventListeners();
    this.setupKeyboardShortcuts();
    this.setupOnlineStatus();
  }

  checkUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const claimId = params.get('claimId') || params.get('claim');
    if (claimId && /^CLM-[A-Z0-9]+-[A-Z0-9]+$/.test(claimId)) {
      this.currentClaimId = claimId;
      this.showTrackingModal = true;
      setTimeout(() => this.startStatusPolling(), 500);
    }
  }

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Escape to close modals
      if (e.key === 'Escape') {
        if (this.showClaimModal) this.closeClaimModal();
        else if (this.showSuccessModal) { this.showSuccessModal = false; this.render(); }
        else if (this.showTrackingModal) this.closeTrackingModal();
      }
      
      // Ctrl/Cmd + K to open claim modal
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        this.openClaimModal();
      }
      
      // Ctrl/Cmd + T to open tracking modal
      if ((e.ctrlKey || e.metaKey) && e.key === 't') {
        e.preventDefault();
        this.openTrackingModal();
      }
    });
  }

  setupOnlineStatus() {
    window.addEventListener('online', () => {
      toast.success('Connection restored!');
      if (this.showTrackingModal && this.currentClaimId) {
        this.startStatusPolling();
      }
    });
    
    window.addEventListener('offline', () => {
      toast.warning('You are offline. Some features may not work.');
      this.stopStatusPolling();
    });
  }

  toggleLang() {
    this.lang = this.lang === 'en' ? 'ar' : 'en';
    localStorage.setItem('sbs-lang', this.lang);
    document.documentElement.lang = this.lang;
    document.documentElement.dir = this.lang === 'ar' ? 'rtl' : 'ltr';
    this.render();
    toast.info(this.lang === 'ar' ? 'تم تغيير اللغة إلى العربية' : 'Language changed to English');
  }

  openClaimModal() {
    this.showClaimModal = true;
    this.render();
  }

  closeClaimModal() {
    this.showClaimModal = false;
    this.selectedFile = null;
    this.formData = {};
    this.validationErrors = {};
    this.render();
  }

  openTrackingModal(claimIdOrEvent) {
    // Handle both direct call and event-based call
    const claimId = typeof claimIdOrEvent === 'string' 
      ? claimIdOrEvent 
      : claimIdOrEvent?.target?.dataset?.claimId;
    
    this.currentClaimId = claimId || this.currentClaimId;
    this.showTrackingModal = true;
    this.showSuccessModal = false;
    if (this.currentClaimId) {
      this.startStatusPolling();
    }
    this.render();
  }

  closeTrackingModal() {
    this.showTrackingModal = false;
    this.stopStatusPolling();
    this.claimStatus = null;
    this.render();
  }

  startTrackingFromInput() {
    const input = document.getElementById('tracking-claim-id');
    const claimId = input?.value?.trim();
    const t = translations[this.lang];

    if (!claimId) {
      this.showError(t.claim.invalidClaimId);
      return;
    }

    const claimIdRegex = /^CLM-[A-Z0-9]+-[A-Z0-9]+$/;
    if (!claimIdRegex.test(claimId)) {
      this.showError(t.claim.invalidClaimId);
      return;
    }

    this.currentClaimId = claimId;
    this.claimStatus = null;
    this.stopStatusPolling();
    this.startStatusPolling();
    this.render();
  }

  handleFileSelect(event) {
    const file = event.target.files?.[0] || event.dataTransfer?.files?.[0];
    if (file) {
      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        this.showError('File size exceeds 10MB limit');
        return;
      }
      // Validate file type
      const allowedTypes = /\.(pdf|doc|docx|xls|xlsx|json|xml|jpg|jpeg|png)$/i;
      if (!allowedTypes.test(file.name)) {
        this.showError('Invalid file type. Allowed: PDF, DOC, XLS, JSON, XML, Images');
        return;
      }
      this.selectedFile = file;
      const fileNameEl = document.getElementById('file-name');
      if (fileNameEl) {
        fileNameEl.textContent = `✓ ${file.name} (${this.formatFileSize(file.size)})`;
        fileNameEl.className = 'text-emerald-400 text-sm mt-2 font-medium';
      }
      toast.success(`File "${file.name}" selected`);
    }
  }

  handleDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
  }

  handleDragEnter(event) {
    event.preventDefault();
    event.stopPropagation();
    this.dragCounter++;
    const dropZone = document.getElementById('file-drop-zone');
    if (dropZone) {
      dropZone.classList.add('dragover');
    }
  }

  handleDragLeave(event) {
    event.preventDefault();
    event.stopPropagation();
    this.dragCounter--;
    if (this.dragCounter === 0) {
      const dropZone = document.getElementById('file-drop-zone');
      if (dropZone) {
        dropZone.classList.remove('dragover');
      }
    }
  }

  handleDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    this.dragCounter = 0;
    const dropZone = document.getElementById('file-drop-zone');
    if (dropZone) {
      dropZone.classList.remove('dragover');
    }
    this.handleFileSelect(event);
  }

  removeSelectedFile() {
    this.selectedFile = null;
    const fileInput = document.getElementById('file-input');
    if (fileInput) fileInput.value = '';
    const fileNameEl = document.getElementById('file-name');
    if (fileNameEl) fileNameEl.textContent = '';
    this.render();
  }

  formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  validateForm(formElements) {
    const errors = {};

    // Required fields
    if (!formElements.patientName.value.trim()) {
      errors.patientName = 'Patient name is required';
    }
    if (!formElements.patientId.value.trim()) {
      errors.patientId = 'Patient ID is required';
    }
    if (!formElements.claimType.value) {
      errors.claimType = 'Claim type is required';
    }

    // Email validation
    const email = formElements.userEmail.value.trim();
    if (!email) {
      errors.userEmail = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.userEmail = 'Invalid email format';
    }

    this.validationErrors = errors;
    return Object.keys(errors).length === 0;
  }

  showError(message) {
    toast.error(message);
  }

  showSuccess(message) {
    toast.success(message);
  }

  showInfo(message) {
    toast.info(message);
  }

  async copyToClipboard(text, successMessage = 'Copied to clipboard!') {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        toast.success(successMessage);
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        toast.success(successMessage);
      }
    } catch (error) {
      toast.error('Failed to copy to clipboard');
      console.error('Clipboard error:', error);
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  async startStatusPolling() {
    // Fetch immediately
    await this.fetchClaimStatus();

    // Then poll every 3 seconds
    this.statusPollingInterval = setInterval(async () => {
      await this.fetchClaimStatus();

      // Stop polling if complete
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
      if (apiClient) {
        apiClient.setBaseUrl(this.getApiBaseUrl());
        const result = await apiClient.getClaimStatus(this.currentClaimId);

        if (result.success) {
          this.claimStatus = result.data;
          this.statusPollFailures = 0; // Reset failure counter on success
          this.render();
        } else {
          console.error('Claim status fetch failed:', result.error);
          this.stopStatusPolling();
        }
      } else {
        const apiBaseUrl = this.getApiBaseUrl();
        const statusUrl = apiBaseUrl
          ? `${apiBaseUrl}/api/claim-status/${this.currentClaimId}`
          : `/api/claim-status/${this.currentClaimId}`;

        const response = await fetch(statusUrl);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();

        if (result.success) {
          this.claimStatus = result;
          this.statusPollFailures = 0; // Reset failure counter on success
          this.render();
        } else {
          console.error('Claim status fetch failed:', result.error);
          this.stopStatusPolling();
        }
      }
    } catch (error) {
      console.error('Error fetching claim status:', error);
      // Stop polling after multiple consecutive failures
      if (typeof this.statusPollFailures !== 'number') {
        this.statusPollFailures = 0;
      }
      this.statusPollFailures += 1;
      if (this.statusPollFailures >= 3) {
        this.stopStatusPolling();
        this.showError('Unable to fetch claim status. Please refresh the page.');
      }
    }
  }

  async retryClaim() {
    if (!this.currentClaimId) return;

    try {
      const apiClient = this.getApiClient();
      if (apiClient) {
        apiClient.setBaseUrl(this.getApiBaseUrl());
        const result = await apiClient.retryClaim(this.currentClaimId);
        const payload = result.success ? result.data : null;

        if (result.success && payload?.success !== false) {
          this.claimStatus = null;
          this.startStatusPolling();
        } else {
          this.showError(payload?.error || result.error?.message || 'Retry failed');
        }
      } else {
        const apiBaseUrl = this.getApiBaseUrl();
        const retryUrl = apiBaseUrl
          ? `${apiBaseUrl}/api/claims/${this.currentClaimId}/retry`
          : `/api/claims/${this.currentClaimId}/retry`;

        const response = await fetch(retryUrl, { method: 'POST' });
        const result = await response.json();

        if (result.success) {
          this.claimStatus = null;
          this.startStatusPolling();
        } else {
          this.showError(result.error || 'Retry failed');
        }
      }
    } catch (error) {
      this.showError('Failed to retry claim: ' + error.message);
    }
  }

  async submitClaim(event) {
    event.preventDefault();

    const formElements = event.target.elements;

    // Validate form before submission
    if (!this.validateForm(formElements)) {
      this.render();
      return;
    }

    this.isSubmitting = true;
    this.render();

    const formDataToSend = new FormData();

    formDataToSend.append('patientName', formElements.patientName.value.trim());
    formDataToSend.append('patientId', formElements.patientId.value.trim());
    formDataToSend.append('memberId', formElements.memberId.value.trim());
    formDataToSend.append('payerId', formElements.payerId.value.trim());
    formDataToSend.append('claimType', formElements.claimType.value);
    formDataToSend.append('userEmail', formElements.userEmail.value.trim());

    if (this.selectedFile) {
      formDataToSend.append('claimFile', this.selectedFile);
    }

    try {
      const apiClient = this.getApiClient();
      const useApiClient = Boolean(apiClient);
      let result = null;

      if (useApiClient) {
        apiClient.setBaseUrl(this.getApiBaseUrl());
        result = await apiClient.submitClaim(formDataToSend);
      } else {
        const apiBaseUrl = this.getApiBaseUrl();
        const submitUrl = apiBaseUrl ? `${apiBaseUrl}/api/submit-claim` : '/api/submit-claim';

        const response = await fetch(submitUrl, {
          method: 'POST',
          body: formDataToSend
        });

        result = await response.json();
      }

      const payload = useApiClient && result?.success ? result.data : result;

      if (payload?.success) {
        this.showClaimModal = false;
        this.selectedFile = null;
        this.formData = {};
        this.validationErrors = {};

        // Store claim info and open tracking modal
        this.currentClaimId = payload.claimId;
        this.lastSubmission = {
          claimId: payload.claimId,
          patientName: formElements.patientName.value,
          patientId: formElements.patientId.value,
          claimType: formElements.claimType.value,
          submittedAt: payload.data?.submittedAt || new Date().toISOString()
        };

        // Show success modal with celebration
        this.showSuccessModal = true;
        this.isSubmitting = false;
        this.render();
        
        // Trigger confetti celebration
        showConfetti();
        toast.success('Claim submitted successfully! 🎉');

      } else {
        // Handle validation errors from server
        if (payload?.validationErrors) {
          this.showError(payload.validationErrors.join(', '));
        } else {
          this.showError(payload?.error || result?.error?.message || 'Unknown error occurred');
        }
        this.isSubmitting = false;
        this.render();
      }
    } catch (error) {
      console.error('Submission error:', error);
      this.showError('Submission failed: ' + error.message);
      this.isSubmitting = false;
      this.render();
    }
  }

  render() {
    const t = translations[this.lang];
    
    const html = `
      <!-- Navbar -->
      <nav class="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex items-center justify-between h-20">
            <div class="flex items-center gap-3">
              <div class="bg-gradient-to-tr from-emerald-400 to-cyan-500 p-2 rounded-lg">
                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                </svg>
              </div>
              <span class="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                SBS Engine
              </span>
            </div>
            
            <div class="flex items-center gap-4">
              <a href="#features" class="text-slate-300 hover:text-white transition-colors text-sm font-medium hidden md:block">${t.nav.features}</a>
              <button onclick="app.openTrackingModal()" class="text-slate-300 hover:text-white transition-colors text-sm font-medium hidden md:block">
                ${t.claim.trackExisting}
              </button>
              <button onclick="app.openClaimModal()" class="bg-emerald-500 hover:bg-emerald-400 text-slate-900 px-5 py-2 rounded-full font-bold text-sm transition-all shadow-lg shadow-emerald-500/20">
                ${t.nav.submitClaim}
              </button>
              <button onclick="app.toggleLang()" class="px-3 py-1 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-white uppercase transition-all">
                ${t.nav.lang}
              </button>
            </div>
          </div>
        </div>
      </nav>

      <!-- Hero -->
      <div class="min-h-screen flex items-center justify-center overflow-hidden bg-slate-950 pt-20 relative">
        <div class="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5"></div>
        
        <div class="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-600 rounded-full blur-[80px] opacity-30 animate-pulse-slow"></div>
        <div class="absolute top-[40%] left-[60%] w-[500px] h-[500px] bg-emerald-600 rounded-full blur-[80px] opacity-40 animate-pulse-slow" style="animation-delay: 2s;"></div>
        
        <div class="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center">
          <span class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-semibold mb-8 animate-fade-in">
            <span class="relative flex h-3 w-3">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            ${t.hero.badge}
          </span>

          <h1 class="text-5xl md:text-7xl font-extrabold text-white tracking-tight leading-tight mb-6 max-w-4xl animate-fade-in" style="animation-delay: 0.2s;">
            ${t.hero.title}
          </h1>

          <p class="text-xl md:text-2xl text-slate-400 max-w-2xl mb-10 leading-relaxed animate-fade-in" style="animation-delay: 0.4s;">
            ${t.hero.subtitle}
          </p>

          <div class="flex flex-col sm:flex-row gap-4 w-full sm:w-auto animate-fade-in" style="animation-delay: 0.6s;">
            <button onclick="app.openClaimModal()" class="px-8 py-4 bg-gradient-to-r from-emerald-500 to-cyan-600 hover:from-emerald-400 hover:to-cyan-500 text-white rounded-xl font-bold text-lg shadow-xl shadow-emerald-900/40 transition-all transform hover:scale-105">
              ${t.hero.cta_submit}
            </button>
            <a href="https://brainsait369.blogspot.com/" target="_blank" class="px-8 py-4 bg-slate-800/50 hover:bg-slate-800 text-white border border-slate-700 rounded-xl font-bold text-lg backdrop-blur-sm transition-all">
              ${t.hero.cta_docs}
            </a>
          </div>
        </div>
      </div>

      <!-- Services -->
      <section id="features" class="py-24 bg-slate-950 relative">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="text-center mb-16">
            <h2 class="text-3xl md:text-5xl font-bold text-white mb-4">${t.services.title}</h2>
            <p class="text-xl text-slate-400 max-w-2xl mx-auto">${t.services.subtitle}</p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            ${t.services.cards.map((card, idx) => `
              <div class="group p-8 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-800/80 transition-all duration-300 backdrop-blur-sm overflow-hidden">
                <div class="w-16 h-16 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-400 mb-6 group-hover:scale-110 group-hover:bg-emerald-500/10 transition-all duration-300">
                  <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${idx === 0 ? 'M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z' : idx === 1 ? 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' : idx === 2 ? 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' : 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z'}"></path>
                  </svg>
                </div>
                <h3 class="text-2xl font-bold text-white mb-4 group-hover:text-emerald-400 transition-colors">${card.title}</h3>
                <p class="text-slate-400 leading-relaxed group-hover:text-slate-300 transition-colors">${card.desc}</p>
              </div>
            `).join('')}
          </div>
        </div>
      </section>

      <!-- Footer -->
      <footer class="bg-slate-900 border-t border-slate-800 py-12">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <div class="flex items-center gap-2 mb-2">
              <svg class="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
              </svg>
              <span class="text-lg font-bold text-white">SBS Engine</span>
            </div>
            <p class="text-slate-400 text-sm mb-4">${t.footer.desc}</p>
            <div class="flex flex-col gap-2 text-xs font-medium">
              <a href="https://github.com/enterprises/brainsait" target="_blank" class="text-slate-500 hover:text-emerald-400 transition-colors">
                ${t.footer.powered}
              </a>
              <a href="https://github.com/Fadil369" target="_blank" class="text-slate-500 hover:text-emerald-400 transition-colors">
                ${t.footer.author}
              </a>
            </div>
          </div>
          <div class="text-slate-500 text-sm">
            ${t.footer.rights}
          </div>
        </div>
      </footer>

      <!-- Claim Submission Modal -->
      ${this.showClaimModal ? `
        <div class="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onclick="app.closeClaimModal()"></div>
          <div class="relative w-full max-w-2xl bg-slate-900 rounded-2xl shadow-2xl overflow-hidden z-10 border border-slate-800">
            <div class="p-6 border-b border-slate-800 flex justify-between items-center">
              <div>
                <h2 class="text-2xl font-bold text-white">${t.claim.title}</h2>
                <p class="text-slate-400 text-sm mt-1">${t.claim.subtitle}</p>
              </div>
              <button onclick="app.closeClaimModal()" class="p-2 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-400 transition-colors">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            
            <form onsubmit="app.submitClaim(event)" class="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-slate-300 mb-2">${t.claim.patientName} *</label>
                  <input type="text" name="patientName" required class="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-emerald-500 focus:outline-none">
                </div>
                <div>
                  <label class="block text-sm font-medium text-slate-300 mb-2">${t.claim.patientId} *</label>
                  <input type="text" name="patientId" required class="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-emerald-500 focus:outline-none">
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-slate-300 mb-2">${t.claim.memberId}</label>
                  <input type="text" name="memberId" class="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-emerald-500 focus:outline-none">
                </div>
                <div>
                  <label class="block text-sm font-medium text-slate-300 mb-2">${t.claim.payerId}</label>
                  <input type="text" name="payerId" class="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-emerald-500 focus:outline-none">
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-slate-300 mb-2">${t.claim.claimType} *</label>
                <select name="claimType" required class="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-emerald-500 focus:outline-none">
                  <option value="professional">${t.claim.professional}</option>
                  <option value="institutional">${t.claim.institutional}</option>
                  <option value="pharmacy">${t.claim.pharmacy}</option>
                  <option value="vision">${t.claim.vision}</option>
                </select>
              </div>

              <div>
                <label class="block text-sm font-medium text-slate-300 mb-2">${t.claim.userEmail} *</label>
                <input type="email" name="userEmail" required class="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-emerald-500 focus:outline-none">
              </div>

              <div>
                <label class="block text-sm font-medium text-slate-300 mb-2">${t.claim.uploadFile}</label>
                <div id="file-drop-zone" class="file-upload-area p-6 rounded-lg text-center" ondragover="app.handleDragOver(event)" ondragenter="app.handleDragEnter(event)" ondragleave="app.handleDragLeave(event)" ondrop="app.handleDrop(event)">
                  <input type="file" id="file-input" accept=".pdf,.doc,.docx,.xls,.xlsx,.json,.xml,.jpg,.jpeg,.png" onchange="app.handleFileSelect(event)" class="hidden">
                  <label for="file-input" class="cursor-pointer">
                    <svg class="w-12 h-12 text-emerald-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                    </svg>
                    <p class="text-slate-300 font-medium">${t.claim.dragDrop}</p>
                    <p class="text-slate-500 text-sm mt-1">${t.claim.fileTypes}</p>
                  </label>
                  ${this.selectedFile ? `
                    <div class="mt-3 flex items-center justify-center gap-2">
                      <span id="file-name" class="text-emerald-400 text-sm font-medium">✓ ${this.escapeHtml(this.selectedFile.name)} (${this.formatFileSize(this.selectedFile.size)})</span>
                      <button type="button" onclick="app.removeSelectedFile()" class="text-red-400 hover:text-red-300 transition-colors p-1">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                      </button>
                    </div>
                  ` : `<p id="file-name" class="text-emerald-400 text-sm mt-2 font-medium"></p>`}
                </div>
              </div>

              <button type="submit" ${this.isSubmitting ? 'disabled' : ''} class="w-full px-6 py-3 bg-gradient-to-r from-emerald-500 to-cyan-600 hover:from-emerald-400 hover:to-cyan-500 text-white rounded-lg font-bold text-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2">
                ${this.isSubmitting ? `
                  <svg class="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                  </svg>
                  ${t.claim.submitting}
                ` : `
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  ${t.claim.submit}
                `}
              </button>
            </form>
          </div>
        </div>
      ` : ''}

      <!-- Success Modal -->
      ${this.showSuccessModal ? `
        <div class="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onclick="app.showSuccessModal = false; app.render();"></div>
          <div class="relative w-full max-w-md bg-slate-900 rounded-2xl shadow-2xl overflow-hidden z-10 border border-emerald-500/50 p-8 text-center">
            <div class="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg class="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <h3 class="text-2xl font-bold text-white mb-2">${t.claim.success}</h3>
            <p class="text-slate-400 mb-4">${t.claim.successMsg}</p>
            ${this.currentClaimId ? `
              <div class="bg-slate-800/50 rounded-lg p-3 mb-6">
                <p class="text-slate-500 text-xs mb-1">${t.claim.claimIdLabel}</p>
                <p class="text-emerald-400 font-mono font-bold">${this.currentClaimId}</p>
              </div>
            ` : ''}
            <div class="flex gap-3 justify-center">
              <button onclick="app.showSuccessModal = false; app.render();" class="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold transition-all">
                ${t.claim.close}
              </button>
              ${this.currentClaimId ? `
                <button onclick="app.openTrackingModal(this.dataset.claimId)" data-claim-id="${this.escapeHtml(this.currentClaimId)}" class="px-6 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-900 rounded-lg font-bold transition-all flex items-center gap-2">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path>
                  </svg>
                  ${t.claim.trackStatus}
                </button>
                <button onclick="app.copyToClipboard(app.getTrackingUrl(), 'Tracking link copied!')" class="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold transition-all">
                  ${t.claim.shareTracking}
                </button>
                <a href="${this.getReceiptUrl()}" target="_blank" class="px-6 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-900 rounded-lg font-bold transition-all">
                  ${t.claim.downloadReceipt}
                </a>
              ` : ''}
            </div>
          </div>
        </div>
      ` : ''}

      <!-- Tracking Modal -->
      ${this.showTrackingModal ? `
        <div class="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onclick="app.closeTrackingModal()"></div>
          <div class="relative w-full max-w-2xl bg-slate-900 rounded-2xl shadow-2xl overflow-hidden z-10 border border-slate-700">
            <div class="p-6 border-b border-slate-800 flex justify-between items-center">
              <div>
                <h2 class="text-2xl font-bold text-white">${t.claim.trackingTitle}</h2>
                <p class="text-slate-400 text-sm mt-1">${t.claim.trackingSubtitle}</p>
              </div>
              <button onclick="app.closeTrackingModal()" class="p-2 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-400 transition-colors">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>

            <div class="p-6">
              <!-- Claim ID and Status Header -->
              <div class="flex justify-between items-center mb-6">
                <div class="bg-slate-800/50 rounded-lg px-4 py-2">
                  <p class="text-slate-500 text-xs">${t.claim.claimIdLabel}</p>
                  <p class="text-emerald-400 font-mono font-bold">${this.currentClaimId || '—'}</p>
                </div>
                <div class="flex flex-wrap gap-2">
                  <button onclick="app.copyToClipboard(app.getTrackingUrl(), 'Tracking link copied!')" class="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold">
                    ${t.claim.shareTracking}
                  </button>
                  <a href="${this.getReceiptUrl()}" target="_blank" class="px-3 py-1 bg-cyan-500 hover:bg-cyan-400 text-slate-900 rounded-lg text-xs font-semibold">
                    ${t.claim.downloadReceipt}
                  </a>
                </div>
                ${this.claimStatus ? `
                  <div class="flex items-center gap-2">
                    ${this.claimStatus.isComplete ?
                      (this.claimStatus.isSuccess ?
                        `<span class="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-sm font-medium flex items-center gap-1">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                          ${t.claim.complete}
                        </span>` :
                        `<span class="px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-sm font-medium flex items-center gap-1">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                          ${t.claim.failed}
                        </span>`)
                      : `<span class="px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-sm font-medium flex items-center gap-1">
                          <svg class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                          ${t.claim.processing}
                        </span>`
                    }
                  </div>
                ` : ''}
              </div>

              <div class="bg-slate-800/50 rounded-lg p-4 mb-6">
                <label class="block text-slate-400 text-sm">${t.claim.enterClaimId}</label>
                <div class="flex flex-col sm:flex-row gap-2 mt-2">
                  <input id="tracking-claim-id" value="${this.currentClaimId || ''}" placeholder="CLM-XXXXXXX-XXXXXX" class="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-emerald-500 focus:outline-none" />
                  <button onclick="app.startTrackingFromInput()" class="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-900 rounded-lg font-bold">
                    ${t.claim.startTracking}
                  </button>
                </div>
              </div>

              <!-- Progress Bar -->
              ${this.claimStatus ? `
                <div class="mb-6">
                  <div class="flex justify-between text-sm mb-2">
                    <span class="text-slate-400">${t.claim.processing}</span>
                    <span class="text-emerald-400 font-bold">${this.claimStatus.progress?.percentage || 0}%</span>
                  </div>
                  <div class="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div class="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-500 ease-out" style="width: ${this.claimStatus.progress?.percentage || 0}%"></div>
                  </div>
                </div>
              ` : `
                <div class="flex justify-center py-8">
                  <svg class="w-8 h-8 text-emerald-400 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                  </svg>
                </div>
              `}

              <!-- Workflow Stages -->
              ${this.claimStatus ? `
                <div class="space-y-3">
                  ${this.renderWorkflowStages(t)}
                </div>

                <!-- Errors -->
                ${this.claimStatus.errors && this.claimStatus.errors.length > 0 ? `
                  <div class="mt-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <h4 class="text-red-400 font-bold mb-2 flex items-center gap-2">
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                      Errors
                    </h4>
                    <ul class="text-slate-400 text-sm space-y-1">
                      ${this.claimStatus.errors.map(err => `<li>- ${err.stage}: ${err.error}</li>`).join('')}
                    </ul>
                  </div>
                ` : ''}

                <!-- Timeline -->
                ${this.claimStatus.timeline && this.claimStatus.timeline.length > 0 ? `
                  <div class="mt-6 p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
                    <h4 class="text-emerald-400 font-bold mb-3">${t.claim.timeline}</h4>
                    <ul class="text-slate-400 text-sm space-y-2 max-h-40 overflow-auto">
                      ${this.claimStatus.timeline
                        .slice()
                        .reverse()
                        .map(entry => `
                          <li class="flex items-start justify-between gap-3">
                            <span>${this.escapeHtml(entry.message || entry.event)}</span>
                            <span class="text-slate-500 text-xs whitespace-nowrap">${new Date(entry.timestamp).toLocaleTimeString()}</span>
                          </li>
                        `).join('')}
                    </ul>
                  </div>
                ` : ''}

                <!-- Retry Button for Failed Claims -->
                ${this.claimStatus.isFailed ? `
                  <div class="mt-6 flex justify-center">
                    <button onclick="app.retryClaim()" class="px-6 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 rounded-lg font-bold transition-all flex items-center gap-2">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                      ${t.claim.retry}
                    </button>
                  </div>
                ` : ''}
              ` : ''}
            </div>
          </div>
        </div>
      ` : ''}
    `;

    document.getElementById('app').innerHTML = html;
  }

  renderWorkflowStages(t) {
    if (!this.claimStatus?.stages) return '';

    const stageOrder = [
      { key: 'received', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
      { key: 'validation', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
      { key: 'normalization', icon: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4' },
      { key: 'financialRules', icon: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z' },
      { key: 'signing', icon: 'M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z' },
      { key: 'nphiesSubmission', icon: 'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12' }
    ];

    return stageOrder.map((stage, idx) => {
      const stageData = this.claimStatus.stages[stage.key];
      if (!stageData) return '';

      const status = stageData.status;
      const isCompleted = status === 'completed';
      const isInProgress = status === 'in_progress';
      const isFailed = status === 'failed';

      const statusColor = isCompleted ? 'emerald' : isFailed ? 'red' : isInProgress ? 'blue' : 'slate';
      const bgColor = isCompleted ? 'bg-emerald-500/20' : isFailed ? 'bg-red-500/20' : isInProgress ? 'bg-blue-500/20' : 'bg-slate-800';
      const borderColor = isCompleted ? 'border-emerald-500/50' : isFailed ? 'border-red-500/50' : isInProgress ? 'border-blue-500/50' : 'border-slate-700';
      const iconColor = isCompleted ? 'text-emerald-400' : isFailed ? 'text-red-400' : isInProgress ? 'text-blue-400' : 'text-slate-500';

      const stageName = t.claim.stages[stage.key] || stage.key;
      const stageStatusText = t.claim.stageStatus[status] || status;
      const stageGuidance = this.getStageGuidance(stage.key);
      const stageTimestamp = stageData.timestamp ? new Date(stageData.timestamp) : null;
      const elapsedSeconds = stageTimestamp ? Math.floor((Date.now() - stageTimestamp.getTime()) / 1000) : 0;
      const slaSeconds = this.getStageSlaSeconds(stage.key);
      const showSlaWarning = status === 'in_progress' && elapsedSeconds > slaSeconds;

      return `
        <div class="flex items-center gap-4 p-3 rounded-lg ${bgColor} border ${borderColor} transition-all">
          <div class="w-10 h-10 rounded-full ${bgColor} flex items-center justify-center ${iconColor}">
            ${isInProgress ?
              `<svg class="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>` :
              `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${stage.icon}"></path></svg>`
            }
          </div>
          <div class="flex-1">
            <div class="flex justify-between items-center">
              <span class="font-medium text-white">${stageName}</span>
              <span class="text-xs px-2 py-1 rounded-full ${bgColor} text-${statusColor}-400">${stageStatusText}</span>
            </div>
            ${stageData.message ? `<p class="text-slate-400 text-sm mt-1">${stageData.message}</p>` : ''}
            <div class="text-slate-500 text-xs mt-1">
              <span class="mr-2">${t.claim.expectedTime}: ${stageGuidance.expectedTime}</span>
              <span>${t.claim.nextStep}: ${stageGuidance.nextStep}</span>
            </div>
            ${showSlaWarning ? `<p class="text-amber-400 text-xs mt-1">${t.claim.slaWarning}</p>` : ''}
            ${stageData.timestamp ? `<p class="text-slate-500 text-xs mt-1">${new Date(stageData.timestamp).toLocaleTimeString()}</p>` : ''}
          </div>
        </div>
      `;
    }).join('');
  }

  attachEventListeners() {
    // Event listeners are handled through onclick attributes in the HTML
  }
}

// Initialize the app
const app = new SBSLandingPage();
