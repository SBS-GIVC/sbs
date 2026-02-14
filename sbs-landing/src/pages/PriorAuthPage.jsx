import { useMemo, useState, useEffect } from 'react';
import { nphiesService } from '../services/nphiesService';
import { searchSBSCodes } from '../utils/middleware';
import { i18n } from '../utils/i18n';
import { useToast } from '../components/Toast';
import { Button } from '../components/ui/Button';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { SectionHeader } from '../components/ui/SectionHeader';

/**
 * Premium Prior Authorization Page
 * Optimized for GIVC-SBS Ultra-Premium Design System
 */
export function PriorAuthPage({ lang = 'en' }) {
  const copy = i18n[lang] || i18n.en;
  const t = copy.pages?.priorAuth || i18n.en.pages.priorAuth;
  const initialFormData = {
    patientId: '',
    patientName: '',
    facilityId: 'FAC001',
    sbsCode: '',
    sbsDescription: '',
    diagnosis: '',
    estimatedAmount: '',
    expectedDate: '',
    clinicalNotes: '',
    urgency: 'routine'
  };

  const [activeTab, setActiveTab] = useState('new');
  const [formData, setFormData] = useState(initialFormData);
  const [sbsSuggestions, setSbsSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [authorizations, setAuthorizations] = useState([]);
  const [lastResult, setLastResult] = useState(null);
  const [showRaw, setShowRaw] = useState(false);
  const [refreshingId, setRefreshingId] = useState(null);
  const [formAttempted, setFormAttempted] = useState(false);
  const [touched, setTouched] = useState({ patientId: false, sbsCode: false, estimatedAmount: false });
  const toast = useToast();

  const validatePatientId = (value) => {
    const v = String(value || '').trim();
    if (!v) return t.validation.patientIdRequired;
    if (!/^[0-9]{10}$/.test(v)) return t.validation.patientIdInvalid;
    return null;
  };

  const validateSbsCode = (value) => {
    const v = String(value || '').trim();
    if (!v) return t.validation.sbsRequired;
    if (v.length < 4) return lang === 'ar' ? 'أدخل 4 أحرف على الأقل لتحديد الإجراء.' : 'Enter at least 4 characters to identify a procedure.';
    return null;
  };

  const validateEstimatedAmount = (value) => {
    const raw = String(value ?? '').trim();
    if (!raw) return t.validation.amountRequired;
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) return t.validation.amountInvalid;
    return null;
  };

  const fieldErrors = useMemo(() => {
    return {
      patientId: (formAttempted || touched.patientId) ? validatePatientId(formData.patientId) : null,
      sbsCode: (formAttempted || touched.sbsCode) ? validateSbsCode(formData.sbsCode) : null,
      estimatedAmount: (formAttempted || touched.estimatedAmount) ? validateEstimatedAmount(formData.estimatedAmount) : null,
    };
  }, [formAttempted, touched.patientId, touched.sbsCode, touched.estimatedAmount, formData.patientId, formData.sbsCode, formData.estimatedAmount]);

  useEffect(() => {
    setAuthorizations([
      {
        id: 'PA-2026-ABC123',
        patientId: '1098765432',
        patientName: 'Mohammed Al-Rashid',
        sbsCode: '49518-00-00',
        description: 'Total Knee Replacement',
        status: 'approved',
        requestedDate: '2026-01-25',
        approvedDate: '2026-01-27',
        expiryDate: '2026-02-27',
        approvedAmount: 45000
      },
      {
        id: 'PA-2026-DEF456',
        patientId: '1098765433',
        patientName: 'Fatima Al-Harbi',
        sbsCode: '38200-00-00',
        description: 'Cardiac Catheterization',
        status: 'pending',
        requestedDate: '2026-01-29',
        approvedDate: null,
        expiryDate: null,
        approvedAmount: null
      },
      {
        id: 'PA-2026-GHI789',
        patientId: '1098765434',
        patientName: 'Ahmed Al-Ghamdi',
        sbsCode: '39703-00-00',
        description: 'Brain Tumor Excision',
        status: 'denied',
        requestedDate: '2026-01-20',
        approvedDate: null,
        expiryDate: null,
        approvedAmount: null,
        denialReason: 'Additional documentation required'
      }
    ]);
  }, []);

  const handleSbsSearch = (query) => {
    setFormData(prev => ({ ...prev, sbsCode: query }));
    if (query.length >= 2) {
      const results = searchSBSCodes(query, 8);
      setSbsSuggestions(results);
      setShowSuggestions(true);
    } else {
      setSbsSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const selectSbsCode = (item) => {
    setFormData(prev => ({
      ...prev,
      sbsCode: item.code,
      sbsDescription: item.desc
    }));
    setShowSuggestions(false);
  };

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    setFormAttempted(true);
    const pidError = validatePatientId(formData.patientId);
    const codeError = validateSbsCode(formData.sbsCode);
    const amountError = validateEstimatedAmount(formData.estimatedAmount);
    if (pidError || codeError || amountError) {
      setTouched({ patientId: true, sbsCode: true, estimatedAmount: true });
      toast.warning(t.toast.fixFields);
      return;
    }
    setSubmitting(true);
    try {
      const result = await nphiesService.submitPriorAuth({
        patientId: formData.patientId,
        facilityId: formData.facilityId,
        sbsCode: formData.sbsCode,
        diagnosis: formData.diagnosis,
        description: formData.sbsDescription,
        estimatedAmount: parseFloat(formData.estimatedAmount),
        expectedDate: formData.expectedDate,
        urgency: formData.urgency,
        clinicalNotes: formData.clinicalNotes
      });

      setLastResult(result);
      setShowRaw(false);

      setAuthorizations(prev => [{
        id: result.authNumber,
        patientId: formData.patientId,
        patientName: formData.patientName || 'New Patient',
        sbsCode: formData.sbsCode,
        description: formData.sbsDescription,
        status: result.status,
        requestedDate: new Date().toISOString().split('T')[0],
        approvedDate: result.status === 'approved' ? new Date().toISOString().split('T')[0] : null,
        expiryDate: result.validUntil,
        approvedAmount: result.approvedAmount
      }, ...prev]);

      toast.success(lang === 'ar'
        ? `تم إرسال طلب الموافقة ${result.authNumber}`
        : `Prior authorization ${result.authNumber} submitted`);
      setFormData(initialFormData);
      setFormAttempted(false);
      setTouched({ patientId: false, sbsCode: false, estimatedAmount: false });
      setActiveTab('pending');
    } catch (error) {
      toast.error(error?.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const refreshStatus = async (authId) => {
    if (!authId) return;
    setRefreshingId(authId);
    try {
      const res = await fetch(`/api/prior-auth/${encodeURIComponent(authId)}/status`);
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || `Status check failed (HTTP ${res.status})`);
      }

      const mapped =
        data.status === 'approved' ? 'approved' :
        data.status === 'denied' ? 'denied' : 'pending';
      const today = new Date().toISOString().split('T')[0];

      setAuthorizations((prev) =>
        prev.map((a) => {
          if (a.id !== authId) return a;
          return {
            ...a,
            status: mapped,
            approvedAmount: typeof data.approvedAmount === 'number' ? data.approvedAmount : a.approvedAmount,
            expiryDate: data.validUntil || a.expiryDate,
            approvedDate: mapped === 'approved' ? (a.approvedDate || today) : a.approvedDate,
            denialReason: data.denialReason || a.denialReason
          };
        })
      );

      toast.success(`Status updated: ${mapped}`);
    } catch (e) {
      toast.error(e?.message || 'Status check failed');
    } finally {
      setRefreshingId(null);
    }
  };

  const filteredAuthorizations = authorizations.filter(auth => {
    if (activeTab === 'new') return false;
    if (activeTab === 'pending') return auth.status === 'pending';
    if (activeTab === 'approved') return auth.status === 'approved';
    if (activeTab === 'denied') return auth.status === 'denied';
    return true;
  });

  return (
    <div className="flex-1">
      <main className="max-w-[1200px] mx-auto p-6 sm:p-8 space-y-8 stagger-children">
        <section className="animate-premium-in">
          <SectionHeader 
            title={t.header.title} 
            subtitle={t.header.subtitle}
            badge={t.header.badge}
          />

          {/* Tab Navigation */}
          <div className="flex flex-wrap gap-2 mt-8">
            {[
              { id: 'new', label: t.tabs.new, icon: 'add_circle' },
              { id: 'pending', label: t.tabs.pending, icon: 'hourglass_empty', count: authorizations.filter(a => a.status === 'pending').length },
              { id: 'approved', label: t.tabs.approved, icon: 'verified', count: authorizations.filter(a => a.status === 'approved').length },
              { id: 'denied', label: t.tabs.denied, icon: 'report', count: authorizations.filter(a => a.status === 'denied').length },
              { id: 'all', label: t.tabs.all, icon: 'inventory_2' }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                data-testid={`priorauth-tab-${tab.id}`}
                className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl font-bold transition-all duration-300 ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 scale-[1.05]'
                    : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-white/50 border border-slate-200/50 dark:border-slate-700/50 hover:text-slate-900 dark:hover:text-white'
                } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900`}
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[20px]">{tab.icon}</span>
                <span className="text-sm tracking-tight">{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-blue-600/10 text-blue-600'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </section>

        <div className="min-h-[500px] space-y-6">
          {lastResult && (
            <Card className="animate-premium-in border border-slate-200/50 dark:border-slate-800/50">
              <CardHeader
                title={lang === 'ar' ? 'أدلة الموافقة' : 'Authorization Evidence'}
                subtitle={lang === 'ar' ? 'تفاصيل الاستجابة لأغراض التدقيق والأتمتة.' : 'Operator-grade response details for auditability and workflow automation.'}
              />
              <CardBody className="space-y-4">
                <div className="flex flex-wrap items-center gap-2" data-testid="priorauth-meta">
                  <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-700/60">
                    id: {lastResult.authNumber}
                  </span>
                  <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-700/60">
                    status: {lastResult.status}
                  </span>
                  {lastResult.eta && (
                    <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-700/60">
                      eta: {lastResult.eta}
                    </span>
                  )}
                  {lastResult.validUntil && (
                    <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-700/60">
                      validUntil: {lastResult.validUntil}
                    </span>
                  )}
                  {lastResult.requestId && (
                    <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-700/60">
                      req: {String(lastResult.requestId).slice(-8)}
                    </span>
                  )}
                  {typeof lastResult.responseTimeMs === 'number' && (
                    <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-700/60">
                      {lastResult.responseTimeMs}ms
                    </span>
                  )}
                </div>

                {(lastResult.requiredDocuments?.length || lastResult.nextActions?.length) ? (
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-700/60">
                      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Required Documents</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(lastResult.requiredDocuments || []).map((d) => (
                          <span key={d} className="px-2.5 py-1 rounded-full text-[10px] font-black bg-blue-600/10 text-blue-600 border border-blue-600/20">
                            {d}
                          </span>
                        ))}
                        {!lastResult.requiredDocuments?.length && (
                          <span className="text-xs font-bold text-slate-500">None</span>
                        )}
                      </div>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-700/60">
                      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Next Actions</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(lastResult.nextActions || []).map((a) => (
                          <span key={a} className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                            {a}
                          </span>
                        ))}
                        {!lastResult.nextActions?.length && (
                          <span className="text-xs font-bold text-slate-500">None</span>
                        )}
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="secondary"
                      icon="content_copy"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(JSON.stringify(lastResult, null, 2));
                          toast.success(t.toast.copyOk);
                        } catch {
                          toast.error(t.toast.copyFail);
                        }
                      }}
                      data-testid="priorauth-copy-json"
                    >
                    {lang === 'ar' ? 'نسخ JSON' : 'Copy JSON'}
                  </Button>
                  <Button
                    variant="secondary"
                    icon={showRaw ? 'visibility_off' : 'visibility'}
                    onClick={() => setShowRaw((v) => !v)}
                    data-testid="priorauth-toggle-raw"
                  >
                    {showRaw ? (lang === 'ar' ? 'إخفاء الخام' : 'Hide Raw') : (lang === 'ar' ? 'عرض الخام' : 'Show Raw')}
                  </Button>
                  <Button
                    variant="secondary"
                    icon="refresh"
                    onClick={() => refreshStatus(lastResult.authNumber)}
                    disabled={refreshingId === lastResult.authNumber}
                    data-testid="priorauth-refresh-latest"
                  >
                    {t.actions.checkStatus}
                  </Button>
                </div>

                {showRaw && (
                  <pre
                    data-testid="priorauth-raw"
                    className="text-xs font-mono p-4 rounded-3xl bg-slate-950 text-slate-100 overflow-auto border border-slate-800/70"
                    style={{ maxHeight: 380 }}
                  >
                    {JSON.stringify(lastResult, null, 2)}
                  </pre>
                )}
              </CardBody>
            </Card>
          )}

          {activeTab === 'new' ? (
            <Card className="animate-premium-in">
              <CardHeader title={t.form.title} subtitle={t.form.subtitle} />
              <CardBody className="space-y-8">
                <form className="space-y-8" onSubmit={handleSubmit} noValidate>
                {/* Patient Block */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2 text-primary">
                    <label htmlFor="priorauth-patient-id" className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 ml-1">
                      {t.form.patientId} <span aria-hidden="true" className="text-rose-500">{' '}*</span>
                    </label>
                    <div className="relative group">
                      <span aria-hidden="true" className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-blue-600">person</span>
                      <input 
                        type="text" 
                        id="priorauth-patient-id"
                        value={formData.patientId}
                        onChange={(e) => setFormData({...formData, patientId: e.target.value})}
                        onBlur={() => setTouched((prev) => ({ ...prev, patientId: true }))}
                        data-testid="priorauth-patient-id"
                        inputMode="numeric"
                        pattern="[0-9]{10}"
                        required
                        aria-invalid={!!fieldErrors.patientId}
                        aria-describedby={fieldErrors.patientId ? 'priorauth-patient-id-error' : undefined}
                        className={`w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border rounded-2xl font-bold focus:outline-none focus:ring-2 ${
                          fieldErrors.patientId
                            ? 'border-rose-500/60 dark:border-rose-500/50 focus:ring-rose-500/20'
                            : 'border-slate-200 dark:border-slate-700 focus:ring-blue-600/20'
                        }`}
                        placeholder="Saudi ID / Iqama"
                      />
                    </div>
                    {fieldErrors.patientId && (
                      <p id="priorauth-patient-id-error" role="alert" className="text-[11px] font-semibold text-rose-600 ml-1">
                        {fieldErrors.patientId}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="priorauth-patient-name" className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 ml-1">{t.form.patientName}</label>
                    <input 
                      type="text" 
                      id="priorauth-patient-name"
                      value={formData.patientName}
                      onChange={(e) => setFormData({...formData, patientName: e.target.value})}
                      className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                      placeholder="e.g. Ahmad bin Khalid"
                    />
                  </div>
                </div>

                {/* Code Search Block */}
                <div className="space-y-2 relative">
                  <label htmlFor="priorauth-sbs-code" className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 ml-1">
                    {t.form.sbsSelection} <span aria-hidden="true" className="text-rose-500">{' '}*</span>
                  </label>
                  <div className="relative group">
                    <span aria-hidden="true" className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-blue-600">search</span>
                    <input 
                      type="text" 
                      id="priorauth-sbs-code"
                      value={formData.sbsCode}
                      onChange={(e) => handleSbsSearch(e.target.value)}
                      onFocus={() => sbsSuggestions.length > 0 && setShowSuggestions(true)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') setShowSuggestions(false);
                      }}
                      onBlur={() => {
                        setTouched((prev) => ({ ...prev, sbsCode: true }));
                        // Delay to allow clicking a suggestion item.
                        setTimeout(() => setShowSuggestions(false), 150);
                      }}
                      data-testid="priorauth-sbs-code"
                      required
                      role="combobox"
                      aria-autocomplete="list"
                      aria-expanded={showSuggestions && sbsSuggestions.length > 0}
                      aria-controls="priorauth-suggestions-list"
                      aria-invalid={!!fieldErrors.sbsCode}
                      aria-describedby={fieldErrors.sbsCode ? 'priorauth-sbs-code-error' : undefined}
                      className={`w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border rounded-2xl font-bold focus:outline-none focus:ring-2 ${
                        fieldErrors.sbsCode
                          ? 'border-rose-500/60 dark:border-rose-500/50 focus:ring-rose-500/20'
                          : 'border-slate-200 dark:border-slate-700 focus:ring-blue-600/20'
                      }`}
                      placeholder="Search for procedure codes or keywords..."
                    />
                  </div>
                  
                  {showSuggestions && sbsSuggestions.length > 0 && (
                    <div
                      id="priorauth-suggestions-list"
                      role="listbox"
                      data-testid="priorauth-suggestions"
                      className="absolute z-50 w-full mt-2 glass-panel border border-slate-200/50 dark:border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden max-h-72 overflow-y-auto stagger-children"
                    >
                      {sbsSuggestions.map((item, idx) => (
                        <button
                          type="button"
                          key={idx}
                          role="option"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            selectSbsCode(item);
                          }}
                          data-testid={`priorauth-suggestion-${idx}`}
                          className="px-5 py-4 hover:bg-blue-600 hover:text-white cursor-pointer border-b border-slate-100 dark:border-slate-800 last:border-0 transition-colors group/item focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900"
                        >
                          <div className="flex justify-between items-start gap-4">
                            <span className="font-mono text-sm font-bold bg-blue-600/10 text-blue-600 px-2 py-0.5 rounded group-hover/item:bg-white group-hover/item:text-blue-600">{item.code}</span>
                            <span className="text-xs font-bold uppercase tracking-widest text-slate-400 group-hover/item:text-white/60">{item.category}</span>
                          </div>
                          <p className="mt-1 text-sm font-medium leading-relaxed">{item.desc}</p>
                        </button>
                      ))}
                    </div>
                  )}
                  {fieldErrors.sbsCode && (
                    <p id="priorauth-sbs-code-error" role="alert" className="text-[11px] font-semibold text-rose-600 ml-1">
                      {fieldErrors.sbsCode}
                    </p>
                  )}
                </div>

                {formData.sbsDescription && (
                  <div className="p-4 rounded-2xl bg-blue-600/5 border border-blue-600/20 flex items-center gap-3">
                    <span aria-hidden="true" className="material-symbols-outlined text-blue-600">info</span>
                    <p className="text-sm font-bold text-blue-600">
                      {lang === 'ar' ? 'تم الاختيار:' : 'Selected:'} {formData.sbsDescription}
                    </p>
                  </div>
                )}

                {/* Amount and Urgency */}
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label htmlFor="priorauth-estimated-amount" className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 ml-1">
                      {t.form.estimated} <span aria-hidden="true" className="text-rose-500">{' '}*</span>
                    </label>
                    <input 
                      type="number" 
                      id="priorauth-estimated-amount"
                      value={formData.estimatedAmount}
                      onChange={(e) => setFormData({...formData, estimatedAmount: e.target.value})}
                      onBlur={() => setTouched((prev) => ({ ...prev, estimatedAmount: true }))}
                      data-testid="priorauth-estimated-amount"
                      min="0"
                      required
                      aria-invalid={!!fieldErrors.estimatedAmount}
                      aria-describedby={fieldErrors.estimatedAmount ? 'priorauth-estimated-amount-error' : undefined}
                      className={`w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border rounded-2xl font-bold focus:outline-none focus:ring-2 text-lg ${
                        fieldErrors.estimatedAmount
                          ? 'border-rose-500/60 dark:border-rose-500/50 focus:ring-rose-500/20'
                          : 'border-slate-200 dark:border-slate-700 focus:ring-blue-600/20'
                      }`}
                      placeholder="0"
                    />
                    {fieldErrors.estimatedAmount && (
                      <p id="priorauth-estimated-amount-error" role="alert" className="text-[11px] font-semibold text-rose-600 ml-1">
                        {fieldErrors.estimatedAmount}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="priorauth-expected-date" className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 ml-1">{t.form.expectedDate}</label>
                    <input 
                      type="date" 
                      id="priorauth-expected-date"
                      value={formData.expectedDate}
                      onChange={(e) => setFormData({...formData, expectedDate: e.target.value})}
                      data-testid="priorauth-expected-date"
                      className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="priorauth-urgency" className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 ml-1">{t.form.urgency}</label>
                    <select 
                      id="priorauth-urgency"
                      value={formData.urgency}
                      onChange={(e) => setFormData({...formData, urgency: e.target.value})}
                      data-testid="priorauth-urgency"
                      className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-600/20 appearance-none pointer-events-auto"
                    >
                      <option value="routine">{t.urgencyOptions.routine}</option>
                      <option value="urgent">{t.urgencyOptions.urgent}</option>
                      <option value="emergency">{t.urgencyOptions.emergency}</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="priorauth-clinical-notes" className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 ml-1">{t.form.clinicalNotes}</label>
                  <textarea 
                    id="priorauth-clinical-notes"
                    value={formData.clinicalNotes}
                    onChange={(e) => setFormData({...formData, clinicalNotes: e.target.value})}
                    data-testid="priorauth-clinical-notes"
                    rows={4}
                    className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                    placeholder="Enter medical necessity details here..."
                  />
                </div>

                <p className="text-[11px] font-semibold text-slate-500 ml-1">
                  {t.consent}{' '}
                  <button
                    type="button"
                    onClick={() => window.dispatchEvent(new CustomEvent('sbs:navigate', { detail: { view: 'privacy' } }))}
                    className="underline underline-offset-4 hover:text-blue-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                  >
                    {lang === 'ar' ? 'عرض الخصوصية' : 'View privacy'}
                  </button>
                </p>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200/50 dark:border-slate-800/50">
                   <Button
                     type="button"
                     variant="secondary"
                     onClick={() => {
                       setFormData(initialFormData);
                       setShowSuggestions(false);
                       setSbsSuggestions([]);
                       setLastResult(null);
                       setShowRaw(false);
                       setFormAttempted(false);
                       setTouched({ patientId: false, sbsCode: false, estimatedAmount: false });
                     }}
                     data-testid="priorauth-reset"
                   >
                     {t.actions.reset}
                   </Button>
                   <Button
                     type="submit"
                     icon="send"
                     loading={submitting}
                     className="px-10"
                     data-testid="priorauth-submit"
                   >
                     {t.actions.submit}
                   </Button>
                </div>
                </form>
              </CardBody>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredAuthorizations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 animate-premium-in">
                   <div className="size-20 rounded-[28px] bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center text-slate-300 dark:text-slate-600 mb-4">
                      <span aria-hidden="true" className="material-symbols-outlined text-5xl">folder_off</span>
                   </div>
                   <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">
                     {lang === 'ar' ? 'لا توجد سجلات في هذه القائمة' : 'No records in this queue'}
                   </p>
                </div>
              ) : (
                filteredAuthorizations.map((auth, i) => (
                  <AuthListItem
                    key={auth.id}
                    auth={auth}
                    delay={i * 50}
                    onRefresh={() => refreshStatus(auth.id)}
                    refreshing={refreshingId === auth.id}
                    lang={lang}
                    t={t}
                  />
                ))
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function AuthListItem({ auth, delay, onRefresh, refreshing, lang = 'en', t }) {
  const statusConfig = {
    approved: { icon: 'verified', color: 'emerald', bg: 'bg-emerald-500/10', text: 'text-emerald-600' },
    pending: { icon: 'hourglass_top', color: 'amber', bg: 'bg-amber-500/10', text: 'text-amber-600' },
    denied: { icon: 'report_off', color: 'rose', bg: 'bg-rose-500/10', text: 'text-rose-600' },
  };

  const config = statusConfig[auth.status] || statusConfig.pending;

  return (
    <div 
      className="glass-card p-6 rounded-[28px] border border-slate-200/50 dark:border-slate-800/50 hover:border-blue-600/30 transition-all duration-300 animate-premium-in"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-6 w-full lg:w-auto">
          <div className={`size-16 rounded-[20px] ${config.bg} flex items-center justify-center ${config.text} text-center`}>
            <span aria-hidden="true" className="material-symbols-outlined text-3xl font-bold">{config.icon}</span>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h4 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">{auth.id}</h4>
              <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${config.bg} ${config.text} border border-${config.color}-500/20`}>
                {auth.status}
              </span>
            </div>
            <p className="text-sm font-bold text-slate-500">{auth.patientName} <span className="mx-2 opacity-30">|</span> ID: {auth.patientId}</p>
          </div>
        </div>

        <div className="h-px lg:h-12 w-full lg:w-px bg-slate-200/50 dark:bg-slate-800/50"></div>

        <div className="flex-1 w-full">
           <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-1">
             {lang === 'ar' ? 'تفاصيل الإجراء' : 'Procedure Details'}
           </p>
           <div className="flex items-center gap-3">
              <span className="font-mono text-sm font-bold text-blue-600 bg-blue-600/10 px-2 py-0.5 rounded">{auth.sbsCode}</span>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300 truncate max-w-md">{auth.description}</p>
           </div>
        </div>

        <div className="flex items-center gap-4 text-right w-full lg:w-auto justify-between lg:justify-end">
           <div>
              {auth.approvedAmount && (
                <p className="text-lg font-black text-emerald-600 tracking-tighter">SAR {auth.approvedAmount.toLocaleString()}</p>
              )}
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {lang === 'ar' ? `تم الطلب ${auth.requestedDate}` : `Requested ${auth.requestedDate}`}
              </p>
           </div>
           <div className="flex items-center gap-2">
             {auth.status === 'pending' && typeof onRefresh === 'function' && (
               <button
                 type="button"
                 onClick={onRefresh}
                 disabled={refreshing}
                 data-testid={`priorauth-refresh-${auth.id}`}
                 className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60 hover:text-blue-600 hover:bg-blue-600/10 transition-all text-[10px] font-black uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900"
               >
                 {refreshing ? (lang === 'ar' ? 'جارٍ التحقق…' : 'Checking…') : (t?.actions?.checkStatus || (lang === 'ar' ? 'تحقق من الحالة' : 'Check Status'))}
               </button>
             )}
             <button
               type="button"
               aria-label={lang === 'ar' ? 'فتح التفاصيل' : 'Open details'}
               className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-blue-600 hover:bg-blue-600/10 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900"
             >
                <span aria-hidden="true" className="material-symbols-outlined">chevron_right</span>
             </button>
           </div>
        </div>
      </div>
    </div>
  );
}
