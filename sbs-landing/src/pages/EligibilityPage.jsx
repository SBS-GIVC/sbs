import { useRef, useState } from 'react';
import { nphiesService } from '../services/nphiesService';
import { i18n } from '../utils/i18n';
import { useToast } from '../components/Toast';
import { Button } from '../components/ui/Button';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { SectionHeader } from '../components/ui/SectionHeader';

/**
 * Premium Eligibility Verification Page
 * Optimized for GIVC-SBS Ultra-Premium Design System
 */
export function EligibilityPage({ lang = 'en' }) {
  const copy = i18n[lang] || i18n.en;
  const t = copy.pages?.eligibility || i18n.en.pages.eligibility;
  const [patientId, setPatientId] = useState('');
  const [insurerId, setInsurerId] = useState('');
  const [serviceDate, setServiceDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [eligibility, setEligibility] = useState(null);
  const [error, setError] = useState(null);
  const [formAttempted, setFormAttempted] = useState(false);
  const [touched, setTouched] = useState({ patientId: false });
  const [showRaw, setShowRaw] = useState(false);
  const toast = useToast();
  const patientIdRef = useRef(null);

  const validatePatientId = (value) => {
    const v = String(value || '').trim();
    if (!v) return t.validation.patientIdRequired;
    if (!/^[0-9]{10}$/.test(v)) return t.validation.patientIdInvalid;
    return null;
  };

  const patientIdError = (formAttempted || touched.patientId) ? validatePatientId(patientId) : null;

  const handleVerify = async () => {
    setFormAttempted(true);
    const pidError = validatePatientId(patientId);
    if (pidError) {
      setTouched((prev) => ({ ...prev, patientId: true }));
      toast.warning(pidError);
      patientIdRef.current?.focus?.();
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await nphiesService.checkEligibility({
        patientId,
        insurerId: insurerId || '',
        policyNumber: `POL-${patientId}`,
        serviceDate
      });

      setEligibility(result);
      setShowRaw(false);
      
      if (result.eligible) {
        toast.success(t.toast.eligible);
      } else {
        toast.error(t.toast.ineligible);
      }
    } catch (err) {
      const msg = err?.message || t.toast.failed;
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setPatientId('');
    setInsurerId('');
    setServiceDate(new Date().toISOString().split('T')[0]);
    setEligibility(null);
    setError(null);
    setShowRaw(false);
    setFormAttempted(false);
    setTouched({ patientId: false });
  };

  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return 'N/A';
    return new Intl.NumberFormat(lang === 'ar' ? 'ar-SA' : 'en-SA', { 
      style: 'currency', 
      currency: 'SAR',
      minimumFractionDigits: 0 
    }).format(amount);
  };

  const getBenefitUsagePercentage = (benefit) => {
    if (!benefit.allowed || benefit.allowed === 0) return 0;
    return Math.round((benefit.used / benefit.allowed) * 100);
  };

  return (
    <div className="flex-1">
      <main className="max-w-[1200px] mx-auto p-6 sm:p-8 space-y-8 stagger-children">
        
        {/* Header Section */}
        <section className="animate-premium-in">
          <SectionHeader 
            title={t.header.title} 
            subtitle={t.header.subtitle}
            badge={t.header.badge}
          />
          
          <Card className="mt-8 border-l-4 border-l-emerald-500">
            <CardBody className="p-8">
              <form
                className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleVerify();
                }}
              >
                <div className="space-y-2">
                  <label htmlFor="eligibility-patient-id" className="text-xs font-bold text-slate-600 uppercase tracking-widest px-1">
                    {t.fields.patientId} <span aria-hidden="true" className="text-rose-500">*</span>
                  </label>
                  <div className="relative group">
                    <span aria-hidden="true" className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors">fingerprint</span>
                    <input
                      ref={patientIdRef}
                      type="text"
                      id="eligibility-patient-id"
                      value={patientId}
                      onChange={(e) => setPatientId(e.target.value)}
                      onBlur={() => setTouched((prev) => ({ ...prev, patientId: true }))}
                      placeholder={t.placeholders.patientId}
                      data-testid="eligibility-patient-id"
                      inputMode="numeric"
                      pattern="[0-9]{10}"
                      required
                      aria-invalid={!!patientIdError}
                      aria-describedby={patientIdError ? 'eligibility-patient-id-error' : undefined}
                      className={`w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 border rounded-2xl text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 transition-all ${
                        patientIdError
                          ? 'border-rose-500/60 dark:border-rose-500/50 focus:ring-rose-500/20'
                          : 'border-slate-200 dark:border-slate-700 focus:ring-blue-600/20'
                      }`}
                    />
                  </div>
                  {patientIdError && (
                    <p id="eligibility-patient-id-error" role="alert" className="text-xs font-bold text-rose-600 px-1">
                      {patientIdError}
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="eligibility-insurer" className="text-xs font-bold text-slate-600 uppercase tracking-widest px-1">{t.fields.insurer}</label>
                  <div className="relative group">
                    <span aria-hidden="true" className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors">business</span>
                    <select
                      id="eligibility-insurer"
                      value={insurerId}
                      onChange={(e) => setInsurerId(e.target.value)}
                      data-testid="eligibility-insurer"
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-blue-600/20 appearance-none transition-all"
                    >
                      <option value="">{t.insurerOptions.auto}</option>
                      <option value="INS-BUPA">Bupa Arabia</option>
                      <option value="INS-TAWUNIYA">Tawuniya</option>
                      <option value="INS-MEDGULF">MedGulf</option>
                      <option value="INS-AXA">GIG (Formerly AXA)</option>
                    </select>
                    <span aria-hidden="true" className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="eligibility-service-date" className="text-xs font-bold text-slate-600 uppercase tracking-widest px-1">{t.fields.serviceDate}</label>
                  <div className="relative group">
                    <span aria-hidden="true" className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors">event</span>
                    <input
                      type="date"
                      id="eligibility-service-date"
                      value={serviceDate}
                      onChange={(e) => setServiceDate(e.target.value)}
                      data-testid="eligibility-service-date"
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-blue-600/20 transition-all"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <Button 
                    type="submit"
                    loading={loading}
                    icon="verified" 
                    data-testid="eligibility-verify"
                    className="w-full py-4 rounded-2xl"
                    variant="success"
                  >
                    {t.actions.verify}
                  </Button>
                  <Button
                    icon="refresh"
                    onClick={handleClear}
                    data-testid="eligibility-clear"
                    className="w-full py-3 rounded-2xl"
                    variant="secondary"
                    disabled={loading}
                  >
                    {t.actions.clear}
                  </Button>
                </div>
              </form>

              <p className="mt-5 text-[11px] font-semibold text-slate-500 px-1">
                {t.consent}{' '}
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent('sbs:navigate', { detail: { view: 'privacy' } }))}
                  className="underline underline-offset-4 hover:text-blue-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                >
                  {lang === 'ar' ? 'عرض الخصوصية' : 'View privacy'}
                </button>
              </p>
            </CardBody>
          </Card>
        </section>

        {/* Results Area */}
        <div className="min-h-[400px]">
          {error && (
            <div className="animate-premium-in p-6 rounded-3xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-4">
              <div className="size-12 rounded-2xl bg-rose-500 flex items-center justify-center text-white shadow-lg shadow-rose-500/20">
                <span aria-hidden="true" className="material-symbols-outlined">report</span>
              </div>
              <div>
                <h4 className="font-bold text-rose-600 dark:text-rose-400">{lang === 'ar' ? 'فشل التحقق' : 'Verification Failed'}</h4>
                <p className="text-sm text-rose-500/80 font-medium">{error}</p>
              </div>
            </div>
          )}

          {eligibility ? (
            <div className="space-y-8 animate-premium-in">
              {/* Main Status Card */}
              <Card className={`overflow-hidden border-none shadow-2xl`}>
                <div className={`p-8 flex flex-col sm:flex-row items-center justify-between gap-6 bg-gradient-to-r text-white ${
                  eligibility.eligible 
                    ? 'from-emerald-500 to-teal-600 shadow-emerald-500/20' 
                    : 'from-rose-500 to-orange-600 shadow-rose-500/20'
                }`}>
                  <div className="flex items-center gap-6">
                    <div className="size-20 rounded-[24px] bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-xl">
                      <span aria-hidden="true" className="material-symbols-outlined text-5xl">
                        {eligibility.eligible ? 'check_circle' : 'cancel'}
                      </span>
                    </div>
                    <div className="text-center sm:text-left">
                      <h2 className="text-3xl font-extrabold tracking-tighter leading-tight">
                        {eligibility.eligible
                          ? (lang === 'ar' ? 'المريض مؤهل' : 'Patient is Eligible')
                          : (lang === 'ar' ? 'التغطية غير نشطة' : 'Coverage Inactive')}
                      </h2>
                      <p className="text-white/80 font-bold tracking-tight mt-1 flex items-center gap-2 justify-center sm:justify-start">
                        <span aria-hidden="true" className="material-symbols-outlined text-sm">policy</span>
                        {lang === 'ar' ? 'الوثيقة' : 'Policy'}: {eligibility.policyNumber}
                        <span className="mx-2 opacity-50">|</span>
                        {lang === 'ar' ? 'الفئة' : 'Class'}: {eligibility.className || (lang === 'ar' ? 'قياسي' : 'Standard')}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2 justify-center sm:justify-start" data-testid="eligibility-meta">
                        <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-white/15 border border-white/15">
                          source: {eligibility.source || '—'}
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-white/15 border border-white/15">
                          {typeof eligibility.responseTimeMs === 'number' ? `${eligibility.responseTimeMs}ms` : '—'}
                        </span>
                        {eligibility.requestId && (
                          <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-white/15 border border-white/15">
                            req: {String(eligibility.requestId).slice(-8)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-center sm:text-right bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                    <p className="text-xs font-bold uppercase tracking-widest text-white/70">{lang === 'ar' ? 'سارية حتى' : 'Coverage Valid Until'}</p>
                    <p className="text-2xl font-black">{eligibility.coverageEnd || '—'}</p>
                  </div>
                </div>
                
                <CardBody className="grid sm:grid-cols-3 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-slate-200/50 dark:divide-slate-800/50 p-0">
                  <div className="p-6 space-y-1">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{lang === 'ar' ? 'الجهة الدافعة' : 'Insurance Payer'}</p>
                    <p className="text-lg font-extrabold text-slate-900 dark:text-white capitalize">{eligibility.payerName || 'Detecting...'}</p>
                    <p className="text-xs font-mono text-slate-400">{eligibility.payerId}</p>
                  </div>
                  <div className="p-6 space-y-1">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{lang === 'ar' ? 'المشاركة / التحمل' : 'Co-Payment / Deductible'}</p>
                    <div className="flex items-center gap-2">
                       <span className="text-lg font-extrabold text-slate-900 dark:text-white">{eligibility.coPayPercentage || 0}%</span>
                       <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-600/10 text-blue-600 border border-blue-600/20">{lang === 'ar' ? 'حصة المريض' : 'Patient Share'}</span>
                    </div>
                    <p className="text-xs font-bold text-slate-400">{formatCurrency(eligibility.deductible)} {lang === 'ar' ? 'إجمالي التحمل' : 'total deductible'}</p>
                  </div>
                  <div className="p-6 space-y-1">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{lang === 'ar' ? 'نمط التحكيم' : 'Adjudication Mode'}</p>
                    <p className="text-lg font-extrabold text-slate-900 dark:text-white">{lang === 'ar' ? 'فوري (نفيس)' : 'Real-time (NPHIES)'}</p>
                    <p className="text-xs font-bold text-emerald-500 flex items-center gap-1">
                      <span className="size-1.5 rounded-full bg-emerald-500"></span> 
                      {lang === 'ar' ? 'الجسر الآمن نشط' : 'Secure Bridge Active'}
                    </p>
                  </div>
                </CardBody>
              </Card>

              {/* Benefits breakdown */}
              <Card>
                <CardHeader 
                  title={lang === 'ar' ? 'تفاصيل مزايا التغطية' : 'Coverage Benefits Detail'}
                  subtitle={lang === 'ar' ? 'تفصيل الفئات النشطة والحدود المتبقية.' : 'Detailed breakdown of active benefit categories and remaining limits.'}
                />
                <CardBody className="space-y-6">
                  {Object.values(eligibility.benefits || {}).length ? (
                    Object.values(eligibility.benefits || {}).map((benefit, index) => (
                      <BenefitBar
                        key={index}
                        benefit={benefit}
                        lang={lang}
                        formatCurrency={formatCurrency}
                        percentage={getBenefitUsagePercentage(benefit)}
                      />
                    ))
                  ) : (
                    <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60">
                      <div className="flex items-center gap-3">
                        <div className="size-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                          <span aria-hidden="true" className="material-symbols-outlined">info</span>
                        </div>
                        <div>
                          <div className="text-sm font-extrabold text-slate-900 dark:text-white">
                            {lang === 'ar' ? 'لا توجد حدود منافع في الرد' : 'No benefit limits returned'}
                          </div>
                          <div className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                            {lang === 'ar'
                              ? 'قد تتطلب هذه الجهة الدافعة استعلاماً إضافياً عن المنافع أو أن الاستجابة محدودة في هذه البيئة.'
                              : 'This payer may require benefit inquiry, or the response is limited in this environment.'}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardBody>
              </Card>

              {/* Evidence / Raw */}
              <Card>
                <CardHeader
                  title={lang === 'ar' ? 'أدلة التحقق' : 'Verification Evidence'}
                  subtitle={lang === 'ar' ? 'مخرجات للتدقيق والتتبع واستكشاف الأخطاء.' : 'Operator-grade output for audits, debugging, and downstream automation.'}
                />
                <CardBody className="flex flex-col gap-4">
                  <div className="flex flex-wrap gap-3">
                    <Button
                      variant="secondary"
                      icon="content_copy"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(JSON.stringify(eligibility, null, 2));
                          toast.success(lang === 'ar' ? 'تم نسخ JSON' : 'Eligibility JSON copied');
                        } catch {
                          toast.error(lang === 'ar' ? 'فشل النسخ (الحافظة غير متاحة)' : 'Copy failed (clipboard not available)');
                        }
                      }}
                      data-testid="eligibility-copy-json"
                    >
                      {lang === 'ar' ? 'نسخ JSON' : 'Copy JSON'}
                    </Button>
                    <Button
                      variant="secondary"
                      icon={showRaw ? 'visibility_off' : 'visibility'}
                      onClick={() => setShowRaw((v) => !v)}
                      data-testid="eligibility-toggle-raw"
                    >
                      {showRaw ? (lang === 'ar' ? 'إخفاء الخام' : 'Hide Raw') : (lang === 'ar' ? 'عرض الخام' : 'Show Raw')}
                    </Button>
                  </div>

                  {showRaw && (
                    <pre
                      data-testid="eligibility-raw"
                      className="text-xs font-mono p-4 rounded-3xl bg-slate-950 text-slate-100 overflow-auto border border-slate-800/70"
                      style={{ maxHeight: 380 }}
                    >
                      {JSON.stringify(eligibility, null, 2)}
                    </pre>
                  )}
                </CardBody>
              </Card>

              {/* Quick Actions */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <ActionCard icon="add_box" label={lang === 'ar' ? 'إنشاء مطالبة' : 'Create Claim'} sub={lang === 'ar' ? 'استخدم نتيجة الاستحقاق الحالية' : 'Use current eligibility'} onClick={() => window.dispatchEvent(new CustomEvent('sbs:navigate', { detail: { view: 'claim-builder' } }))} />
                <ActionCard icon="approval" label={lang === 'ar' ? 'طلب موافقة' : 'Request Auth'} sub={lang === 'ar' ? 'بوابة الموافقة المسبقة' : 'Pre-approval portal'} onClick={() => window.dispatchEvent(new CustomEvent('sbs:navigate', { detail: { view: 'prior-auth' } }))} />
                <ActionCard icon="print" label={lang === 'ar' ? 'طباعة الملخص' : 'Print Summary'} sub={lang === 'ar' ? 'تصدير PDF' : 'Generate PDF export'} onClick={() => window.print()} />
                <ActionCard
                  icon="history"
                  label={lang === 'ar' ? 'سجل التحقق' : 'Verify History'}
                  sub={lang === 'ar' ? 'مراجعة الجلسات السابقة' : 'Audit older sessions'}
                  onClick={() => {
                    toast.info(lang === 'ar' ? 'فتح سجلات الاستحقاق السابقة' : 'Opening historical eligibility sessions');
                    window.dispatchEvent(new CustomEvent('sbs:navigate', { detail: { view: 'claims' } }));
                  }}
                />
              </div>
            </div>
          ) : !loading && (
            <div className="flex flex-col items-center justify-center py-20 animate-premium-in">
              <div className="size-24 rounded-[32px] bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center text-slate-300 dark:text-slate-600 mb-6">
                <span aria-hidden="true" className="material-symbols-outlined text-6xl">person_search</span>
              </div>
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">{lang === 'ar' ? 'جاهز للتحقق' : 'Ready for Verification'}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1 max-w-xs text-center">
                {lang === 'ar'
                  ? 'أدخل رقم الهوية الوطنية أو الإقامة لبدء التحقق الفوري من الاستحقاق.'
                  : 'Enter a Patient National ID or Iqama number to begin the real-time eligibility check.'}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function BenefitBar({ benefit, lang, formatCurrency, percentage }) {
  const isHighUsage = percentage > 85;
  return (
    <div className="space-y-2 group">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-1.5 rounded-lg ${isHighUsage ? 'bg-rose-500/10 text-rose-600' : 'bg-blue-600/10 text-blue-600'}`}>
            <span aria-hidden="true" className="material-symbols-outlined text-[20px]">medical_services</span>
          </div>
          <span className="text-sm font-extrabold text-slate-700 dark:text-slate-200 capitalize group-hover:text-blue-600 transition-colors">
            {benefit.name || benefit.category}
          </span>
        </div>
        <div className="text-right">
          <p className="text-sm font-black text-slate-900 dark:text-white">{formatCurrency(benefit.remaining)}</p>
          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
            {lang === 'ar' ? 'الحد المتبقي' : 'Remaining Limit'}
          </p>
        </div>
      </div>
      
      <div className="relative h-2.5 bg-slate-100 dark:bg-slate-800/50 rounded-full overflow-hidden shadow-inner font-bold">
        <div 
          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-1000 cubic-bezier(0.16, 1, 0.3, 1) ${
            isHighUsage ? 'bg-gradient-to-r from-rose-500 to-orange-500' : 'bg-gradient-to-r from-blue-600 to-indigo-600'
          }`}
          style={{ width: `${percentage}%` }}
        >
          <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
        </div>
      </div>
      
      <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
        <span>
          {lang === 'ar' ? 'المستخدم' : 'Used'}: {formatCurrency(benefit.used)} ({percentage}%)
        </span>
        <span>
          {lang === 'ar' ? 'الحد السنوي' : 'Annual Limit'}: {formatCurrency(benefit.allowed)}
        </span>
      </div>
    </div>
  );
}

function ActionCard({ icon, label, sub, onClick }) {
  return (
    <button 
      onClick={onClick}
      className="glass-card p-5 rounded-3xl border border-slate-200/50 dark:border-slate-800/50 hover:border-blue-600/50 transition-all duration-300 flex flex-col items-center gap-3 group text-center"
    >
      <div className="size-12 rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-400 group-hover:bg-blue-600 group-hover:text-white group-hover:scale-110 transition-all duration-300 flex items-center justify-center">
        <span aria-hidden="true" className="material-symbols-outlined text-2xl">{icon}</span>
      </div>
      <div>
        <h4 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight">{label}</h4>
        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">{sub}</p>
      </div>
    </button>
  );
}
