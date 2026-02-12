import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { AICopilot, AICopilotFAB } from './components/AICopilot';

// Lazy load pages for better code splitting
const DashboardPage = lazy(() => import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const MappingsPage = lazy(() => import('./pages/MappingsPage').then((m) => ({ default: m.MappingsPage })));
const MappingReviewPage = lazy(() => import('./pages/MappingReviewPage').then((m) => ({ default: m.MappingReviewPage })));
const ErrorDetailPage = lazy(() => import('./pages/ErrorDetailPage').then((m) => ({ default: m.ErrorDetailPage })));
const FacilityPerformanceReport = lazy(() => import('./pages/FacilityPerformanceReport').then((m) => ({ default: m.FacilityPerformanceReport })));
const FacilityUsagePage = lazy(() => import('./pages/FacilityUsagePage').then((m) => ({ default: m.FacilityUsagePage })));
const MappingRulesConfig = lazy(() => import('./pages/MappingRulesConfig').then((m) => ({ default: m.MappingRulesConfig })));
const DeveloperPortal = lazy(() => import('./pages/DeveloperPortal').then((m) => ({ default: m.DeveloperPortal })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const ClaimsQueuePage = lazy(() => import('./pages/ClaimsQueuePage').then((m) => ({ default: m.ClaimsQueuePage })));
const EligibilityPage = lazy(() => import('./pages/EligibilityPage').then((m) => ({ default: m.EligibilityPage })));
const PriorAuthPage = lazy(() => import('./pages/PriorAuthPage').then((m) => ({ default: m.PriorAuthPage })));
const ClaimBuilderPage = lazy(() => import('./pages/ClaimBuilderPage').then((m) => ({ default: m.ClaimBuilderPage })));
const SBSCodeBrowser = lazy(() => import('./pages/SBSCodeBrowser').then((m) => ({ default: m.SBSCodeBrowser })));
const UnifiedCodeBrowser = lazy(() => import('./pages/UnifiedCodeBrowser').then((m) => ({ default: m.UnifiedCodeBrowser })));
const AIHubPage = lazy(() => import('./pages/AIHubPage').then((m) => ({ default: m.AIHubPage })));
const PredictiveAnalyticsPage = lazy(() => import('./pages/PredictiveAnalyticsPage').then((m) => ({ default: m.PredictiveAnalyticsPage })));
const AIAnalyticsHub = lazy(() => import('./pages/AIAnalyticsHub').then((m) => ({ default: m.AIAnalyticsHub })));
const IoTDashboardPage = lazy(() => import('./pages/IoTDashboardPage').then((m) => ({ default: m.IoTDashboardPage })));

const VIEW_META = {
  dashboard: {
    en: { title: 'Active Integration Status', subtitle: '', breadcrumbs: ['Home', 'Data Ingestion & Normalization'] },
    ar: { title: 'حالة التكامل النشطة', subtitle: '', breadcrumbs: ['الرئيسية', 'استيعاب البيانات والمعالجة'] }
  },
  mappings: {
    en: { title: 'Claims Mapping Analytics', subtitle: 'Real-time performance metrics for hospital integration gateway', breadcrumbs: ['Home', 'Analytics'] },
    ar: { title: 'تحليلات ربط المطالبات', subtitle: 'مؤشرات أداء لحظية لبوابة تكامل المنشآت الصحية', breadcrumbs: ['الرئيسية', 'التحليلات'] }
  },
  review: {
    en: { title: 'Healthcare Integration Gateway', subtitle: '', breadcrumbs: ['Worklist', 'Review Ticket #8842'] },
    ar: { title: 'بوابة التكامل الصحي', subtitle: '', breadcrumbs: ['قائمة العمل', 'مراجعة التذكرة #8842'] }
  },
  error: {
    en: { title: 'Healthcare Integration Gateway', subtitle: '', breadcrumbs: ['Claims', 'Queue', 'Review'] },
    ar: { title: 'بوابة التكامل الصحي', subtitle: '', breadcrumbs: ['المطالبات', 'الطابور', 'المراجعة'] }
  },
  facility_performance: {
    en: { title: 'Facility Performance', subtitle: 'Network-wide operational metrics comparison', breadcrumbs: ['Home', 'Facilities', 'Performance'] },
    ar: { title: 'أداء المنشآت', subtitle: 'مقارنة مؤشرات التشغيل على مستوى الشبكة', breadcrumbs: ['الرئيسية', 'المنشآت', 'الأداء'] }
  },
  facility_usage: {
    en: { title: 'Usage & Quotas', subtitle: 'API limits and throughput management', breadcrumbs: ['Home', 'Facilities', 'Usage'] },
    ar: { title: 'الاستخدام والحصص', subtitle: 'إدارة حدود واجهات البرمجة والسعة التشغيلية', breadcrumbs: ['الرئيسية', 'المنشآت', 'الاستخدام'] }
  },
  mapping_rules: {
    en: { title: 'Configuration', subtitle: 'AI Normalization Logic & Thresholds', breadcrumbs: ['Home', 'Configuration', 'Mapping Rules'] },
    ar: { title: 'الإعدادات', subtitle: 'منطق المعايرة الذكية وحدود الثقة', breadcrumbs: ['الرئيسية', 'الإعدادات', 'قواعد الربط'] }
  },
  developer: {
    en: { title: 'Developer Portal', subtitle: '', breadcrumbs: ['Home', 'Developers'] },
    ar: { title: 'بوابة المطور', subtitle: '', breadcrumbs: ['الرئيسية', 'المطورون'] }
  },
  settings: {
    en: { title: 'Settings', subtitle: 'Manage application preferences', breadcrumbs: ['Home', 'Settings'] },
    ar: { title: 'الإعدادات', subtitle: 'إدارة تفضيلات التطبيق', breadcrumbs: ['الرئيسية', 'الإعدادات'] }
  },
  claims: {
    en: { title: 'Claims Queue', subtitle: 'Manage incoming healthcare claims', breadcrumbs: ['Home', 'Claims'] },
    ar: { title: 'طابور المطالبات', subtitle: 'إدارة مطالبات الرعاية الصحية الواردة', breadcrumbs: ['الرئيسية', 'المطالبات'] }
  },
  eligibility: {
    en: { title: 'Eligibility Verification', subtitle: 'Real-time coverage verification', breadcrumbs: ['Home', 'Eligibility'] },
    ar: { title: 'التحقق من الاستحقاق', subtitle: 'التحقق اللحظي من التغطية', breadcrumbs: ['الرئيسية', 'الاستحقاق'] }
  },
  'prior-auth': {
    en: { title: 'Prior Authorization', subtitle: 'Request and track pre-approvals', breadcrumbs: ['Home', 'Prior Authorization'] },
    ar: { title: 'الموافقة المسبقة', subtitle: 'طلب وتتبع الموافقات المسبقة', breadcrumbs: ['الرئيسية', 'الموافقة المسبقة'] }
  },
  'claim-builder': {
    en: { title: 'Smart Claim Builder', subtitle: 'AI-powered claim creation', breadcrumbs: ['Home', 'Claim Builder'] },
    ar: { title: 'منشئ المطالبة الذكي', subtitle: 'إنشاء المطالبات بالذكاء الاصطناعي', breadcrumbs: ['الرئيسية', 'منشئ المطالبة'] }
  },
  'code-browser': {
    en: { title: 'SBS Code Catalogue', subtitle: 'Browse official CHI codes', breadcrumbs: ['Home', 'Code Browser'] },
    ar: { title: 'دليل أكواد SBS', subtitle: 'استعراض أكواد مجلس الضمان الرسمية', breadcrumbs: ['الرئيسية', 'متصفح الأكواد'] }
  },
  'unified-browser': {
    en: { title: 'Unified Code Browser', subtitle: 'Search across all healthcare code systems', breadcrumbs: ['Home', 'Unified Browser'] },
    ar: { title: 'المتصفح الموحد للأكواد', subtitle: 'بحث عبر جميع أنظمة الأكواد الصحية', breadcrumbs: ['الرئيسية', 'المتصفح الموحد'] }
  },
  'ai-hub': {
    en: { title: 'AI Hub', subtitle: 'AI-powered healthcare billing tools', breadcrumbs: ['Home', 'AI Tools'] },
    ar: { title: 'مركز الذكاء الاصطناعي', subtitle: 'أدوات فوترة صحية مدعومة بالذكاء الاصطناعي', breadcrumbs: ['الرئيسية', 'أدوات الذكاء'] }
  },
  'predictive-analytics': {
    en: { title: 'Predictive Analytics', subtitle: 'AI-powered insights and forecasting', breadcrumbs: ['Home', 'Analytics', 'Predictions'] },
    ar: { title: 'التحليلات التنبؤية', subtitle: 'رؤى وتوقعات مدعومة بالذكاء الاصطناعي', breadcrumbs: ['الرئيسية', 'التحليلات', 'التوقعات'] }
  },
  'ai-analytics': {
    en: { title: 'AI Analytics Hub', subtitle: 'Comprehensive AI-powered claim analytics', breadcrumbs: ['Home', 'AI Tools', 'Analytics Hub'] },
    ar: { title: 'مركز التحليلات الذكية', subtitle: 'تحليلات شاملة للمطالبات بالذكاء الاصطناعي', breadcrumbs: ['الرئيسية', 'أدوات الذكاء', 'مركز التحليلات'] }
  },
  'iot-dashboard': {
    en: { title: 'IoT Monitoring', subtitle: 'Real-time device monitoring and event streaming', breadcrumbs: ['Home', 'IoT', 'Dashboard'] },
    ar: { title: 'مراقبة إنترنت الأشياء', subtitle: 'مراقبة الأجهزة وبث الأحداث لحظياً', breadcrumbs: ['الرئيسية', 'إنترنت الأشياء', 'لوحة التحكم'] }
  }
};

// Loading component for Suspense
function PageLoader({ lang = 'en' }) {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <div className="size-12 mx-auto mb-4 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
        <p className="text-slate-500 text-sm">{lang === 'ar' ? 'جارٍ التحميل...' : 'Loading...'}</p>
      </div>
    </div>
  );
}

function getViewMeta(normalizedView, lang) {
  const meta = VIEW_META[normalizedView] || VIEW_META.dashboard;
  return meta[lang] || meta.en;
}

export default function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [lang, setLang] = useState(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem('sbs_lang') : null;
    return saved === 'ar' ? 'ar' : 'en';
  });

  const isRTL = lang === 'ar';

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
      document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    }
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('sbs_lang', lang);
    }
  }, [lang, isRTL]);

  useEffect(() => {
    const handleNavigate = (event) => {
      const view = event?.detail?.view;
      if (!view) return;
      setCurrentView(view);
      setSidebarOpen(false);
    };

    window.addEventListener('sbs:navigate', handleNavigate);
    return () => window.removeEventListener('sbs:navigate', handleNavigate);
  }, []);

  const normalizedView = (() => {
    const v = String(currentView || '');
    if (v === 'ai_hub' || v === 'ai-copilot' || v === 'claim-optimizer') return 'ai-hub';
    if (v === 'iot_dashboard') return 'iot-dashboard';
    return v;
  })();

  const { title, subtitle, breadcrumbs } = getViewMeta(normalizedView, lang);

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className="flex h-screen w-full overflow-hidden bg-background-light font-body text-slate-900 antialiased"
    >
      {sidebarOpen && (
        <button
          type="button"
          aria-label={lang === 'ar' ? 'إغلاق التنقل' : 'Close navigation'}
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 md:hidden"
        />
      )}

      <Sidebar
        currentView={currentView}
        setCurrentView={(view) => {
          setCurrentView(view);
          setSidebarOpen(false);
        }}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        lang={lang}
        isRTL={isRTL}
      />

      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {!['developer', 'iot-dashboard'].includes(normalizedView) && (
          <TopHeader
            title={title}
            subtitle={subtitle}
            breadcrumbs={breadcrumbs}
            onMenuClick={() => setSidebarOpen(true)}
            lang={lang}
            isRTL={isRTL}
            onToggleLanguage={() => setLang((prev) => (prev === 'en' ? 'ar' : 'en'))}
          />
        )}

        <main data-testid={`view-${normalizedView}`} className="flex-1 overflow-hidden relative flex flex-col">
          <Suspense fallback={<PageLoader lang={lang} />}>
            {normalizedView === 'dashboard' && <DashboardPage />}
            {normalizedView === 'mappings' && <MappingsPage />}
            {normalizedView === 'review' && <MappingReviewPage />}
            {normalizedView === 'error' && <ErrorDetailPage />}
            {normalizedView === 'facility_performance' && <FacilityPerformanceReport />}
            {normalizedView === 'facility_usage' && <FacilityUsagePage />}
            {normalizedView === 'mapping_rules' && <MappingRulesConfig />}
            {normalizedView === 'developer' && <DeveloperPortal />}
            {normalizedView === 'claims' && <ClaimsQueuePage />}
            {normalizedView === 'settings' && <SettingsPage />}
            {normalizedView === 'eligibility' && <EligibilityPage />}
            {normalizedView === 'prior-auth' && <PriorAuthPage />}
            {normalizedView === 'claim-builder' && <ClaimBuilderPage />}
            {normalizedView === 'code-browser' && <SBSCodeBrowser />}
            {normalizedView === 'unified-browser' && <UnifiedCodeBrowser />}
            {normalizedView === 'ai-hub' && <AIHubPage />}
            {normalizedView === 'predictive-analytics' && <PredictiveAnalyticsPage />}
            {normalizedView === 'ai-analytics' && <AIAnalyticsHub />}
            {normalizedView === 'iot-dashboard' && <IoTDashboardPage />}
          </Suspense>
        </main>
      </div>

      <AICopilot
        isOpen={copilotOpen}
        onClose={() => setCopilotOpen(false)}
        lang={lang}
        context={{ currentPage: normalizedView, lang }}
      />

      {!copilotOpen && <AICopilotFAB onClick={() => setCopilotOpen(true)} />}
    </div>
  );
}
