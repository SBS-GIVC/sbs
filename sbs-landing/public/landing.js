// SBS Integration Engine Landing Page
// Vanilla JS + Tailwind - No build step required

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
      close: "Close"
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
      close: "إغلاق"
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
    this.lang = 'en';
    this.showClaimModal = false;
    this.showSuccessModal = false;
    this.isSubmitting = false;
    this.selectedFile = null;
    this.formData = {};
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

  init() {
    document.documentElement.lang = this.lang;
    document.documentElement.dir = this.lang === 'ar' ? 'rtl' : 'ltr';
    this.render();
    this.attachEventListeners();
  }

  toggleLang() {
    this.lang = this.lang === 'en' ? 'ar' : 'en';
    document.documentElement.lang = this.lang;
    document.documentElement.dir = this.lang === 'ar' ? 'rtl' : 'ltr';
    this.render();
  }

  openClaimModal() {
    this.showClaimModal = true;
    this.render();
  }

  closeClaimModal() {
    this.showClaimModal = false;
    this.selectedFile = null;
    this.formData = {};
    this.render();
  }

  handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      document.getElementById('file-name').textContent = file.name;
    }
  }

  async submitClaim(event) {
    event.preventDefault();
    this.isSubmitting = true;
    this.render();

    const formDataToSend = new FormData();
    const formElements = event.target.elements;
    
    formDataToSend.append('patientName', formElements.patientName.value);
    formDataToSend.append('patientId', formElements.patientId.value);
    formDataToSend.append('memberId', formElements.memberId.value);
    formDataToSend.append('payerId', formElements.payerId.value);
    formDataToSend.append('claimType', formElements.claimType.value);
    formDataToSend.append('userEmail', formElements.userEmail.value);
    
    if (this.selectedFile) {
      formDataToSend.append('claimFile', this.selectedFile);
    }

    try {
      const apiBaseUrl = this.getApiBaseUrl();
      const submitUrl = apiBaseUrl ? `${apiBaseUrl}/api/submit-claim` : '/api/submit-claim';

      const response = await fetch(submitUrl, {
        method: 'POST',
        body: formDataToSend
      });

      const result = await response.json();

      if (result.success) {
        this.showClaimModal = false;
        this.showSuccessModal = true;
        this.selectedFile = null;
        this.formData = {};
      } else {
        alert('Error: ' + result.error);
      }
    } catch (error) {
      alert('Submission failed: ' + error.message);
    } finally {
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
                <div class="file-upload-area p-6 rounded-lg text-center">
                  <input type="file" id="file-input" accept=".pdf,.doc,.docx,.xls,.xlsx,.json,.xml,.jpg,.jpeg,.png" onchange="app.handleFileSelect(event)" class="hidden">
                  <label for="file-input" class="cursor-pointer">
                    <svg class="w-12 h-12 text-emerald-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                    </svg>
                    <p class="text-slate-300 font-medium">${t.claim.dragDrop}</p>
                    <p class="text-slate-500 text-sm mt-1">${t.claim.fileTypes}</p>
                    <p id="file-name" class="text-emerald-400 text-sm mt-2 font-medium"></p>
                  </label>
                </div>
              </div>

              <button type="submit" ${this.isSubmitting ? 'disabled' : ''} class="w-full px-6 py-3 bg-gradient-to-r from-emerald-500 to-cyan-600 hover:from-emerald-400 hover:to-cyan-500 text-white rounded-lg font-bold text-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                ${this.isSubmitting ? t.claim.submitting : t.claim.submit}
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
            <p class="text-slate-400 mb-6">${t.claim.successMsg}</p>
            <button onclick="app.showSuccessModal = false; app.render();" class="px-6 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-900 rounded-lg font-bold transition-all">
              ${t.claim.close}
            </button>
          </div>
        </div>
      ` : ''}
    `;

    document.getElementById('app').innerHTML = html;
  }

  attachEventListeners() {
    // Event listeners are handled through onclick attributes in the HTML
  }
}

// Initialize the app
const app = new SBSLandingPage();
