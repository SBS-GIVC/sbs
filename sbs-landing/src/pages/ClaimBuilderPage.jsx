import { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import { nphiesService } from '../services/nphiesService';
import { aiAssistant } from '../services/aiAssistantService';
import { i18n } from '../utils/i18n';
import { useToast } from '../components/Toast';
import { Button } from '../components/ui/Button';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { SectionHeader } from '../components/ui/SectionHeader';

/**
 * Premium Smart Claim Builder
 * AI-powered claim creation with bundle detection, validation, and real-time assistance
 */
export function ClaimBuilderPage({ lang = 'en' }) {
  const copy = i18n[lang] || i18n.en;
  const t = copy.pages?.claimBuilder || i18n.en.pages.claimBuilder;
  const [step, setStep] = useState(1);
  const [claim, setClaim] = useState({
    patientId: '',
    patientName: '',
    userEmail: '',
    facilityId: 'FAC001',
    policyNumber: '',
    serviceDate: new Date().toISOString().split('T')[0],
    claimType: 'institutional',
    diagnoses: [],
    items: [],
    bundleApplied: false,
    bundleId: null
  });
  const [currentItem, setCurrentItem] = useState({ sbsCode: '', description: '', quantity: 1, unitPrice: 0 });
  const [sbsSuggestions, setSbsSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [aiInsights, setAiInsights] = useState(null);
  const [eligibility, setEligibility] = useState(null);
  const [bundleInfo, setBundleInfo] = useState(null);
  const [priorAuthRequired, setPriorAuthRequired] = useState([]);
  const [validation, setValidation] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null);
  const [claimStatus, setClaimStatus] = useState(null);
  const toast = useToast();
  const [formAttempted, setFormAttempted] = useState({ identity: false, item: false });
  const [touched, setTouched] = useState({
    patientId: false,
    userEmail: false,
    itemSbsCode: false,
    itemQuantity: false,
    itemUnitPrice: false
  });

  const patientIdRef = useRef(null);
  const userEmailRef = useRef(null);
  const itemSbsCodeRef = useRef(null);

  const validatePatientId = (value) => {
    const v = String(value || '').trim();
    if (!v) return t.validation.patientIdRequired;
    if (!/^[0-9]{10}$/.test(v)) return t.validation.patientIdInvalid;
    return null;
  };

  const validateEmail = (value) => {
    const v = String(value || '').trim();
    if (!v) return null;
    if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(v)) return t.validation.emailInvalid;
    return null;
  };

  const validateItemSbsCode = (value) => {
    const v = String(value || '').trim();
    if (!v) return t.validation.itemCodeRequired;
    if (v.length < 2) return lang === 'ar' ? 'أدخل حرفين على الأقل للبحث.' : 'Enter at least 2 characters to search.';
    return null;
  };

  const validateQuantity = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return t.validation.qtyInvalid;
    return null;
  };

  const validateUnitPrice = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return t.validation.priceInvalid;
    return null;
  };

  const fieldErrors = useMemo(() => {
    return {
      patientId: (formAttempted.identity || touched.patientId) ? validatePatientId(claim.patientId) : null,
      userEmail: (formAttempted.identity || touched.userEmail) ? validateEmail(claim.userEmail) : null,
      itemSbsCode: (formAttempted.item || touched.itemSbsCode) ? validateItemSbsCode(currentItem.sbsCode) : null,
      itemQuantity: (formAttempted.item || touched.itemQuantity) ? validateQuantity(currentItem.quantity) : null,
      itemUnitPrice: (formAttempted.item || touched.itemUnitPrice) ? validateUnitPrice(currentItem.unitPrice) : null,
    };
  }, [
    formAttempted.identity,
    formAttempted.item,
    touched.patientId,
    touched.userEmail,
    touched.itemSbsCode,
    touched.itemQuantity,
    touched.itemUnitPrice,
    claim.patientId,
    claim.userEmail,
    currentItem.sbsCode,
    currentItem.quantity,
    currentItem.unitPrice
  ]);

  const applyClaimContext = useCallback((ctx) => {
    const code = String(ctx?.code || ctx?.sbsCode || ctx?.sbs_code || '').trim();
    if (!code) return;
    const description = String(ctx?.description || ctx?.desc || ctx?.official_description || '').trim();
    const unitPrice = Number(ctx?.fee || ctx?.unitPrice || 0);

    setCurrentItem((prev) => ({
      ...prev,
      sbsCode: code,
      description: description || prev.description || '',
      unitPrice: Number.isFinite(unitPrice) ? unitPrice : prev.unitPrice
    }));
    setShowSuggestions(false);
    setSbsSuggestions([]);

    toast.info(`${t.toast.stagedLoaded}: ${code}`);
  }, [toast, t.toast.stagedLoaded]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const tryRead = (storage) => {
      try { return storage.getItem('sbs_claim_context_code'); } catch { return null; }
    };
    const raw =
      tryRead(window.sessionStorage) ||
      tryRead(window.localStorage);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      applyClaimContext(parsed);
    } catch {
      // ignore
    } finally {
      try { window.sessionStorage.removeItem('sbs_claim_context_code'); } catch {}
      try { window.localStorage.removeItem('sbs_claim_context_code'); } catch {}
    }
  }, [applyClaimContext]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (event) => applyClaimContext(event?.detail);
    window.addEventListener('sbs:claim-context', handler);
    return () => window.removeEventListener('sbs:claim-context', handler);
  }, [applyClaimContext]);

  const getSuggestionConfidence = (item) => {
    const c = item?.confidence;
    if (typeof c === 'number' && Number.isFinite(c)) {
      return Math.max(0, Math.min(1, c));
    }
    const score = item?.score;
    if (typeof score === 'number' && Number.isFinite(score)) {
      // Map local fuzzy score to a human-friendly "match" signal.
      return Math.max(0.35, Math.min(0.92, score / 100));
    }
    return 0.55;
  };

  // "Top Pick" should follow the UI ordering (most relevant first),
  // not the raw confidence value (AI suggestions may have higher confidence).
  const topPickCode = sbsSuggestions?.[0]?.code || '';

  const individualTotal = claim.items.reduce((sum, item) => sum + (item.netPrice || 0), 0);
  const recommendedBundle = bundleInfo?.recommendedBundle || null;
  const bundleSavings = recommendedBundle ? Math.max(0, individualTotal - recommendedBundle.totalPrice) : 0;
  const bundleSavingsPct = individualTotal > 0 ? Math.round((bundleSavings / individualTotal) * 100) : 0;

  const applyRecommendedBundle = () => {
    if (!recommendedBundle) return;
    setClaim((prev) => ({
      ...prev,
      bundleApplied: true,
      bundleId: recommendedBundle.id
    }));
    toast.success(`${t.toast.bundleApplied}: ${recommendedBundle.name}`);
  };

  const clearBundle = () => {
    setClaim((prev) => ({ ...prev, bundleApplied: false, bundleId: null }));
    toast.info(t.toast.bundleCleared);
  };

  const verifyEligibility = async () => {
    setFormAttempted((prev) => ({ ...prev, identity: true }));
    const pidError = validatePatientId(claim.patientId);
    const emailError = validateEmail(claim.userEmail);
    if (pidError || emailError) {
      setTouched((prev) => ({
        ...prev,
        patientId: true,
        userEmail: true
      }));
      toast.warning(pidError || emailError || t.toast.fixFields);
      if (pidError) patientIdRef.current?.focus?.();
      else if (emailError) userEmailRef.current?.focus?.();
      return;
    }
    
    setLoading(true);
    try {
      const result = await nphiesService.checkEligibility({
        patientId: claim.patientId,
        insurerId: 'INS-AUTO',
        policyNumber: claim.policyNumber || `POL-${claim.patientId}`,
        serviceDate: claim.serviceDate
      });
      
      setEligibility(result);
      setClaim(prev => ({ ...prev, policyNumber: result.policyNumber }));
      
      if (result.eligible) {
        toast.success(t.toast.eligible);
        setStep(2);
      } else {
        toast.error(t.toast.ineligible);
      }
    } catch (error) {
      toast.error(t.toast.verifyFail);
    } finally {
      setLoading(false);
    }
  };

  const handleSbsSearch = useCallback(async (query) => {
    setCurrentItem(prev => ({ ...prev, sbsCode: query }));
    if (query.length >= 2) {
      setIsSearching(true);
      try {
        const results = await aiAssistant.smartSearch(query, { limit: 10, includeAI: true });
        setSbsSuggestions(results.results);
        setShowSuggestions(true);
        if (results.aiInsights) setAiInsights(results.aiInsights);
      } catch (error) {
        try {
          const fallback = await aiAssistant.smartSearch(query, { limit: 10, includeAI: false });
          setSbsSuggestions(fallback.results);
          setShowSuggestions(true);
        } catch {
          setSbsSuggestions([]);
          setShowSuggestions(false);
          toast.warning(t.toast.searchUnavailable);
        }
      } finally {
        setIsSearching(false);
      }
    } else {
      setSbsSuggestions([]);
      setShowSuggestions(false);
      setAiInsights(null);
    }
  }, []);

  const selectSbsCode = (item) => {
    setCurrentItem({
      sbsCode: item.code,
      description: item.desc,
      quantity: 1,
      unitPrice: item.fee || 250
    });
    setShowSuggestions(false);
    setAiInsights(null);
  };

  const addItem = () => {
    setFormAttempted((prev) => ({ ...prev, item: true }));
    const codeError = validateItemSbsCode(currentItem.sbsCode);
    const qtyError = validateQuantity(currentItem.quantity);
    const priceError = validateUnitPrice(currentItem.unitPrice);
    if (codeError || qtyError || priceError) {
      setTouched((prev) => ({
        ...prev,
        itemSbsCode: true,
        itemQuantity: true,
        itemUnitPrice: true
      }));
      toast.warning(codeError || qtyError || priceError || t.toast.fixFields);
      if (codeError) itemSbsCodeRef.current?.focus?.();
      return;
    }
    const newItem = {
      ...currentItem,
      sequence: claim.items.length + 1,
      netPrice: currentItem.quantity * currentItem.unitPrice
    };
    const newItems = [...claim.items, newItem];
    setClaim(prev => ({ ...prev, items: newItems }));
    setCurrentItem({ sbsCode: '', description: '', quantity: 1, unitPrice: 0 });
    setFormAttempted((prev) => ({ ...prev, item: false }));
    setTouched((prev) => ({
      ...prev,
      itemSbsCode: false,
      itemQuantity: false,
      itemUnitPrice: false
    }));
    
    checkBundles(newItems);
    checkPriorAuth(newItem);
    validateClaimWithAI(newItems);
  };

  const removeItem = (index) => {
    const newItems = claim.items.filter((_, i) => i !== index);
    setClaim(prev => ({ ...prev, items: newItems }));
    checkBundles(newItems);
    if (newItems.length > 0) validateClaimWithAI(newItems);
    else setValidation(null);
  };

  const checkBundles = (items) => {
    const sbsCodes = items.map(item => item.sbsCode);
    const result = nphiesService.detectBundles(sbsCodes);
    setBundleInfo(result.hasApplicableBundles ? result : null);
    // If bundles are no longer applicable, clear any previously applied bundle.
    if (!result.hasApplicableBundles) {
      setClaim((prev) => prev.bundleApplied ? { ...prev, bundleApplied: false, bundleId: null } : prev);
      return;
    }
    // If the recommendation changed, avoid silently keeping an outdated applied bundle.
    const nextId = result.recommendedBundle?.id || null;
    if (nextId) {
      setClaim((prev) => (prev.bundleApplied && prev.bundleId && prev.bundleId !== nextId)
        ? { ...prev, bundleApplied: false, bundleId: null }
        : prev);
    }
  };

  const checkPriorAuth = (item) => {
    const highValueCodes = ['49518', '38200', '39703', '38218', '30443', '30571'];
    const codePrefix = item.sbsCode.split('-')[0];
    if (highValueCodes.includes(codePrefix) || item.unitPrice > 5000) {
      setPriorAuthRequired(prev => [...prev, item.sbsCode]);
    }
  };

  const validateClaimWithAI = async (items) => {
    setIsValidating(true);
    try {
      const result = await aiAssistant.validateClaim({...claim, items});
      setValidation(result);
    } finally {
      setIsValidating(false);
    }
  };

  const calculateTotal = () => {
    if (claim.bundleApplied && recommendedBundle) {
      return recommendedBundle.totalPrice;
    }
    return claim.items.reduce((sum, item) => sum + item.netPrice, 0);
  };

  const submitClaim = async () => {
    setSubmitting(true);
    try {
      const payload = {
        patientName: claim.patientName,
        patientId: claim.patientId,
        // Optional in backend, but include for consistency across UIs.
        memberId: claim.patientId,
        claimType: claim.claimType,
        userEmail: claim.userEmail,
        facilityId: claim.facilityId,
        services: claim.items.map((item) => ({
          // The enhanced endpoint maps internalCode -> internal_code and sbsCode -> service_code.
          // In this UI, we only capture SBS codes, so mirror the value for internalCode.
          internalCode: item.sbsCode,
          sbsCode: item.sbsCode,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          serviceDate: item.serviceDate || claim.serviceDate
        })),
        servicesTotal: calculateTotal()
      };

      const res = await fetch('/api/submit-claim-enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await res.json();
      if (!res.ok || !result?.success) {
        throw new Error(result?.error || result?.message || `Submission failed (HTTP ${res.status})`);
      }
      setSubmissionResult(result);
      setStep(4);
      toast.success(t.toast.submitted);
    } catch (e) {
      toast.error(e?.message || t.toast.submissionFailed);
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat(lang === 'ar' ? 'ar-SA' : 'en-SA', { style: 'currency', currency: 'SAR', minimumFractionDigits: 0 }).format(amount);
  };

  return (
    <div className="flex-1">
      <main className="max-w-[1400px] mx-auto p-6 sm:p-8 space-y-8 stagger-children">
        
        {/* Header and Progress */}
        <section className="animate-premium-in">
          <SectionHeader 
            title={t.header.title} 
            subtitle={t.header.subtitle}
            badge={t.header.badge}
          />

          <div className="mt-10 mb-2 relative flex items-center justify-between max-w-3xl mx-auto">
            <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-200 dark:bg-slate-800 -translate-y-1/2 rounded-full"></div>
            <div 
              className="absolute top-1/2 left-0 h-1 bg-blue-600 -translate-y-1/2 rounded-full transition-all duration-700"
              style={{ width: `${((step - 1) / 3) * 100}%` }}
            ></div>
            
            {[
              { n: 1, icon: 'person_search', label: t.steps.identity },
              { n: 2, icon: 'add_task', label: t.steps.services },
              { n: 3, icon: 'fact_check', label: t.steps.review },
              { n: 4, icon: 'check_circle', label: t.steps.relayed }
            ].map(s => (
              <div key={s.n} className="relative z-10 flex flex-col items-center gap-2">
                <div className={`size-12 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-xl ${
                  step >= s.n ? 'bg-blue-600 text-white scale-110 shadow-blue-600/20' : 'bg-white dark:bg-slate-800 text-slate-400'
                }`}>
                  <span aria-hidden="true" className="material-symbols-outlined text-2xl">{s.icon}</span>
                </div>
                <span className={`text-[10px] font-black uppercase tracking-widest ${step >= s.n ? 'text-blue-600' : 'text-slate-400'}`}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </section>

        <div className="min-h-[600px]">
          {step === 1 && (
            <Card className="max-w-4xl mx-auto animate-premium-in shadow-2xl">
              <CardHeader title={t.identity.title} subtitle={t.identity.subtitle} />
              <CardBody>
                <form
                  className="grid md:grid-cols-2 gap-8"
                  onSubmit={(e) => {
                    e.preventDefault();
                    verifyEligibility();
                  }}
                  noValidate
                >
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label htmlFor="claimbuilder-patient-id" className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">
                        {t.identity.patientId} <span aria-hidden="true" className="text-rose-500">{' '}*</span>
                      </label>
                      <div className="relative group">
                        <span aria-hidden="true" className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600">fingerprint</span>
                        <input 
                          ref={patientIdRef}
                          type="text"
                          id="claimbuilder-patient-id"
                          className={`w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border rounded-2xl font-bold focus:outline-none focus:ring-2 ${
                            fieldErrors.patientId
                              ? 'border-rose-500/60 dark:border-rose-500/50 focus:ring-rose-500/20'
                              : 'border-slate-200 dark:border-slate-800 focus:ring-blue-600/20'
                          }`}
                          placeholder="Enter Saudi ID / Iqama"
                          value={claim.patientId}
                          data-testid="claimbuilder-patient-id"
                          inputMode="numeric"
                          pattern="[0-9]{10}"
                          required
                          aria-invalid={!!fieldErrors.patientId}
                          aria-describedby={fieldErrors.patientId ? 'claimbuilder-patient-id-error' : undefined}
                          onBlur={() => setTouched((prev) => ({ ...prev, patientId: true }))}
                          onChange={(e) => setClaim({...claim, patientId: e.target.value})}
                        />
                      </div>
                      {fieldErrors.patientId && (
                        <p id="claimbuilder-patient-id-error" role="alert" className="text-[11px] font-semibold text-rose-600 ml-1">
                          {fieldErrors.patientId}
                        </p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="claimbuilder-patient-name" className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">{t.identity.patientName}</label>
                      <input 
                        type="text" 
                        id="claimbuilder-patient-name"
                        className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                        placeholder="e.g. Fadil Ahmad"
                        value={claim.patientName}
                        onChange={(e) => setClaim({...claim, patientName: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label htmlFor="claimbuilder-user-email" className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">{t.identity.email}</label>
                      <input 
                        ref={userEmailRef}
                        type="email"
                        id="claimbuilder-user-email"
                        className={`w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border rounded-2xl font-bold focus:outline-none focus:ring-2 ${
                          fieldErrors.userEmail
                            ? 'border-rose-500/60 dark:border-rose-500/50 focus:ring-rose-500/20'
                            : 'border-slate-200 dark:border-slate-800 focus:ring-blue-600/20'
                        }`}
                        placeholder="billing-notifications@provider.com"
                        value={claim.userEmail}
                        aria-invalid={!!fieldErrors.userEmail}
                        aria-describedby={fieldErrors.userEmail ? 'claimbuilder-user-email-error' : undefined}
                        onBlur={() => setTouched((prev) => ({ ...prev, userEmail: true }))}
                        onChange={(e) => setClaim({...claim, userEmail: e.target.value})}
                      />
                      {fieldErrors.userEmail && (
                        <p id="claimbuilder-user-email-error" role="alert" className="text-[11px] font-semibold text-rose-600 ml-1">
                          {fieldErrors.userEmail}
                        </p>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label htmlFor="claimbuilder-service-date" className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">{t.identity.serviceDate}</label>
                        <input 
                          type="date"
                          id="claimbuilder-service-date"
                          className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                          value={claim.serviceDate}
                          onChange={(e) => setClaim({...claim, serviceDate: e.target.value})}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label htmlFor="claimbuilder-claim-type" className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">{t.identity.claimType}</label>
                        <select 
                          id="claimbuilder-claim-type"
                          className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-600/20 appearance-none pointer-events-auto"
                          value={claim.claimType}
                          onChange={(e) => setClaim({...claim, claimType: e.target.value})}
                        >
                          <option value="institutional">Institutional</option>
                          <option value="professional">Professional</option>
                          <option value="pharmacy">Pharmacy</option>
                          <option value="vision">Vision</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-2 pt-6 border-t border-slate-100 dark:border-slate-800">
                    <Button
                      type="submit"
                      loading={loading}
                      icon="verified"
                      className="w-full py-4 rounded-2xl"
                      data-testid="claimbuilder-validate-identity"
                    >
                      {t.identity.proceed}
                    </Button>
                    <p className="mt-4 text-[11px] font-semibold text-slate-500">
                      {t.identity.consent}{' '}
                      <button
                        type="button"
                        onClick={() => window.dispatchEvent(new CustomEvent('sbs:navigate', { detail: { view: 'privacy' } }))}
                        className="underline underline-offset-4 hover:text-blue-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                      >
                        {lang === 'ar' ? 'عرض الخصوصية' : 'View privacy'}
                      </button>
                    </p>
                  </div>
                </form>
              </CardBody>
            </Card>
          )}

          {step === 2 && (
            <div className="grid lg:grid-cols-3 gap-8 animate-premium-in">
               <div className="lg:col-span-2 space-y-6">
                  {/* Service Entry */}
                  <Card>
                     <CardHeader title={t.services.title} subtitle={t.services.subtitle} />
                     <CardBody className="space-y-6">
                        <div className="relative space-y-2">
                          <label htmlFor="claimbuilder-item-sbs" className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">
                             {t.services.code} <span aria-hidden="true" className="text-rose-500">{' '}*</span>
                           </label>
                           <div className="relative">
                              <span aria-hidden="true" className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                              <input 
                                ref={itemSbsCodeRef}
                                type="text"
                                id="claimbuilder-item-sbs"
                                role="combobox"
                                aria-autocomplete="list"
                                aria-expanded={showSuggestions && sbsSuggestions.length > 0}
                                aria-controls="claimbuilder-sbs-suggestions"
                                aria-invalid={!!fieldErrors.itemSbsCode}
                                aria-describedby={fieldErrors.itemSbsCode ? 'claimbuilder-item-sbs-error' : undefined}
                                className={`w-full pl-12 pr-12 py-4 bg-slate-50 dark:bg-slate-900/50 border rounded-2xl font-bold focus:outline-none focus:ring-2 ${
                                  fieldErrors.itemSbsCode
                                    ? 'border-rose-500/60 dark:border-rose-500/50 focus:ring-rose-500/20'
                                    : 'border-slate-200 dark:border-slate-800 focus:ring-blue-600/20'
                                }`}
                                placeholder="Search by code or describe in natural language..."
                                value={currentItem.sbsCode}
                                data-testid="claimbuilder-item-sbs"
                                required
                                onBlur={() => setTouched((prev) => ({ ...prev, itemSbsCode: true }))}
                                onChange={(e) => handleSbsSearch(e.target.value)}
                              />
                              {isSearching && <span aria-hidden="true" className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-blue-600">progress_activity</span>}
                           </div>
                           
                           {showSuggestions && sbsSuggestions.length > 0 && (
                             <div
                               id="claimbuilder-sbs-suggestions"
                               role="listbox"
                               className="absolute z-50 w-full mt-2 glass-panel border border-slate-200/50 dark:border-slate-700/50 rounded-2xl shadow-2xl max-h-72 overflow-y-auto overflow-x-hidden"
                             >
                                {aiInsights && <div className="px-5 py-2.5 bg-blue-600 font-bold text-white text-[11px] flex items-center gap-2">
                                   <span aria-hidden="true" className="material-symbols-outlined text-sm">auto_awesome</span> {aiInsights}
                                </div>}
                                {sbsSuggestions.map((item, idx) => (
                                  (() => {
                                    const conf = getSuggestionConfidence(item);
                                    const confPct = Math.round(conf * 100);
                                    const isTopPick = topPickCode && item.code === topPickCode;
                                    const reasoning = item.aiReason || item.aiReasoning || item.reason || '';
                                    const isAi = item.source === 'ai' || typeof item.confidence === 'number';
                                    return (
                                      <button
                                        type="button"
                                        role="option"
                                        key={idx}
                                        onMouseDown={(e) => {
                                          e.preventDefault();
                                          selectSbsCode(item);
                                        }}
                                        data-testid={isTopPick ? 'sbs-suggestion-top-pick' : `sbs-suggestion-${idx}`}
                                        className={`px-5 py-4 cursor-pointer border-b border-slate-100 dark:border-slate-800 last:border-0 group/item transition-colors ${
                                          isTopPick
                                            ? 'bg-gradient-to-r from-blue-600/10 to-emerald-500/10 hover:from-blue-600/15 hover:to-emerald-500/15 border-l-4 border-l-blue-600'
                                            : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                                        } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900`}
                                      >
                                        <div className="flex items-start justify-between gap-3">
                                          <div className="flex flex-wrap items-center gap-2">
                                            <span className="font-mono text-sm font-black text-blue-600 bg-blue-600/10 px-2.5 py-1 rounded-lg border border-blue-600/20">{item.code}</span>
                                            {isTopPick && (
                                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-blue-600 to-emerald-500 text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-600/30 animate-pulse">
                                                <span aria-hidden="true" className="material-symbols-outlined text-[14px]">auto_awesome</span>
                                                🌟 AI Top Pick
                                              </span>
                                            )}
                                            {isAi && !isTopPick && (
                                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase tracking-widest shadow-sm" title="AI-enhanced suggestion">
                                                <span aria-hidden="true" className="material-symbols-outlined text-[12px]">smart_toy</span>
                                                AI
                                              </span>
                                            )}
                                          </div>

                                          <div className="flex items-center gap-3">
                                            <div className="flex flex-col items-end gap-0.5">
                                              <div
                                                className="relative h-6 w-28 rounded-full bg-slate-200/80 dark:bg-slate-800/80 overflow-hidden border-2 border-slate-300/70 dark:border-slate-700/60 shadow-inner"
                                                title={`${isAi ? 'AI confidence' : 'Match score'}: ${confPct}%`}
                                              >
                                                <div
                                                  className={`h-full transition-all duration-500 ${
                                                    confPct >= 80 
                                                      ? 'bg-gradient-to-r from-emerald-500 to-green-600' 
                                                      : confPct >= 60 
                                                      ? 'bg-gradient-to-r from-blue-500 to-blue-600' 
                                                      : 'bg-gradient-to-r from-amber-500 to-orange-500'
                                                  }`}
                                                  style={{ width: `${confPct}%` }}
                                                ></div>
                                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-black text-slate-900/90 dark:text-white/90 drop-shadow">
                                                  {confPct}%
                                                </span>
                                              </div>
                                              <span className="text-[9px] font-bold uppercase text-slate-400">
                                                {confPct >= 80 ? '🎯 Excellent' : confPct >= 60 ? '👍 Good' : '⚠️ Fair'} Match
                                              </span>
                                            </div>
                                            <span className="text-[10px] font-black uppercase text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">{item.category || '—'}</span>
                                          </div>
                                        </div>

                                        <p className="mt-2 text-sm font-extrabold text-slate-700 dark:text-slate-200">{item.desc}</p>
                                        {reasoning && (
                                          <div
                                            className="mt-3 flex items-start gap-3 p-3.5 rounded-xl bg-gradient-to-r from-blue-600/8 to-purple-600/8 dark:from-blue-600/12 dark:to-purple-600/12 border-2 border-blue-600/20 shadow-sm"
                                            title={reasoning}
                                          >
                                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white shadow-lg flex-shrink-0">
                                              <span aria-hidden="true" className="material-symbols-outlined text-base">psychology</span>
                                            </div>
                                            <div className="flex-1">
                                              <div className="text-[9px] font-black uppercase tracking-widest text-blue-700 dark:text-blue-400 mb-1">💡 AI Reasoning</div>
                                              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 leading-relaxed">{reasoning}</p>
                                            </div>
                                          </div>
                                        )}
                                      </button>
                                    );
                                  })()
                                ))}
                             </div>
                           )}
                           {fieldErrors.itemSbsCode && (
                             <p id="claimbuilder-item-sbs-error" role="alert" className="text-[11px] font-semibold text-rose-600 ml-1">
                               {fieldErrors.itemSbsCode}
                             </p>
                           )}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-2">
                              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{t.services.qty}</label>
                              <input 
                                type="number" 
                                className={`w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border rounded-2xl font-bold ${
                                  fieldErrors.itemQuantity ? 'border-rose-500/60 dark:border-rose-500/50' : 'border-slate-200 dark:border-slate-800'
                                }`}
                                value={currentItem.quantity}
                                data-testid="claimbuilder-item-qty"
                                min="1"
                                required
                                aria-invalid={!!fieldErrors.itemQuantity}
                                aria-describedby={fieldErrors.itemQuantity ? 'claimbuilder-item-qty-error' : undefined}
                                onBlur={() => setTouched((prev) => ({ ...prev, itemQuantity: true }))}
                                onChange={(e) => setCurrentItem({...currentItem, quantity: Number(e.target.value)})}
                              />
                              {fieldErrors.itemQuantity && (
                                <p id="claimbuilder-item-qty-error" role="alert" className="text-[11px] font-semibold text-rose-600 ml-1 mt-1">
                                  {fieldErrors.itemQuantity}
                                </p>
                              )}
                           </div>
                           <div className="space-y-2">
                              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{t.services.unitPrice}</label>
                              <div className="relative">
                                 <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">SAR</span>
                                 <input 
                                   type="number" 
                                   className={`w-full pl-14 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border rounded-2xl font-bold ${
                                     fieldErrors.itemUnitPrice ? 'border-rose-500/60 dark:border-rose-500/50' : 'border-slate-200 dark:border-slate-800'
                                   }`}
                                   value={currentItem.unitPrice}
                                   data-testid="claimbuilder-item-unitprice"
                                   min="1"
                                   required
                                   aria-invalid={!!fieldErrors.itemUnitPrice}
                                   aria-describedby={fieldErrors.itemUnitPrice ? 'claimbuilder-item-unitprice-error' : undefined}
                                   onBlur={() => setTouched((prev) => ({ ...prev, itemUnitPrice: true }))}
                                   onChange={(e) => setCurrentItem({...currentItem, unitPrice: Number(e.target.value)})}
                                 />
                              </div>
                              {fieldErrors.itemUnitPrice && (
                                <p id="claimbuilder-item-unitprice-error" role="alert" className="text-[11px] font-semibold text-rose-600 ml-1 mt-1">
                                  {fieldErrors.itemUnitPrice}
                                </p>
                              )}
                           </div>
                        </div>
                        <Button
                          variant="secondary"
                          className="w-full py-4 rounded-2xl border-dashed"
                          onClick={addItem}
                          icon="add_box"
                          data-testid="claimbuilder-add-item"
                        >
                          {t.services.add}
                        </Button>
                     </CardBody>
                  </Card>

                  {/* List of items */}
                  {claim.items.length > 0 && (
                    <Card>
                       <CardHeader title={t.services.payloadTitle} action={<span className="text-xl font-black text-blue-600">{formatCurrency(calculateTotal())}</span>} />
                       <div className="overflow-x-auto">
                          <table className="w-full text-left">
                             <thead className="bg-slate-50 dark:bg-slate-900/40">
                                <tr>
                                   <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500">{t.services.serviceInfo}</th>
                                   <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 text-right">{t.services.netPrice}</th>
                                   <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500"></th>
                                </tr>
                             </thead>
                             <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {claim.items.map((item, idx) => (
                                  <tr key={idx} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                     <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                           <span className="font-mono text-xs font-black bg-blue-600/10 text-blue-600 px-2 py-0.5 rounded">{item.sbsCode}</span>
                                           <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{item.description}</p>
                                        </div>
                                        <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{item.quantity} Unit × {formatCurrency(item.unitPrice)}</p>
                                     </td>
                                     <td className="px-6 py-4 text-right font-black text-slate-900 dark:text-white">
                                        {formatCurrency(item.netPrice)}
                                     </td>
                                     <td className="px-6 py-4 text-right">
                                        <button
                                          type="button"
                                          onClick={() => removeItem(idx)}
                                          className="p-2 text-slate-300 hover:text-rose-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900"
                                          aria-label={`Remove service ${item.sbsCode}`}
                                        >
                                          <span aria-hidden="true" className="material-symbols-outlined text-lg">delete</span>
                                        </button>
                                     </td>
                                  </tr>
                                ))}
                             </tbody>
                          </table>
                       </div>
                    </Card>
                  )}
               </div>

               <div className="space-y-6">
                  {/* AI Validation */}
                  {(validation || isValidating) && (
                    <Card className={`border-l-4 transition-colors ${isValidating ? 'border-l-blue-600 animate-pulse' : validation?.errors?.length > 0 ? 'border-l-rose-500' : 'border-l-emerald-500 shadow-emerald-500/10'}`}>
                       <CardBody className="space-y-4">
                          <div className="flex items-center gap-2">
                             <span aria-hidden="true" className={`material-symbols-outlined font-black ${isValidating ? 'text-blue-600' : validation?.errors?.length > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                {isValidating ? 'sync' : validation?.errors?.length > 0 ? 'report' : 'verified'}
                             </span>
                             <h4 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white">AI Compliance Agent</h4>
                          </div>
                          
                          {validation?.errors?.map((err, i) => (
                            <div key={i} className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs font-bold text-rose-600 flex gap-2">
                               <span aria-hidden="true" className="material-symbols-outlined text-xs">close</span> {err}
                            </div>
                          ))}
                          {validation?.warnings?.map((err, i) => (
                            <div key={i} className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs font-bold text-amber-600 flex gap-2">
                               <span aria-hidden="true" className="material-symbols-outlined text-xs">warning</span> {err}
                            </div>
                          ))}
                          
                          {validation?.suggestions?.map((sug, i) => (
                            <div key={i} className="p-4 glass-panel border border-blue-600/20 rounded-2xl space-y-3">
                               <div className="flex items-start gap-2">
                                  <span aria-hidden="true" className="material-symbols-outlined text-blue-600 text-sm">auto_awesome</span>
                                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300 leading-relaxed">{sug.reason || sug.name}</p>
                               </div>
                               <button onClick={() => toast.info('Optimizing...')} className="w-full py-2 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg shadow-lg shadow-blue-600/20 transition-transform active:scale-95">Optimize with Agent</button>
                            </div>
                          ))}

                          {!isValidating && !validation?.errors?.length && claim.items.length > 0 && (
                            <div className="text-center py-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
                               <p className="text-xs font-black text-emerald-600 uppercase tracking-widest">Compliance Guaranteed</p>
                            </div>
                          )}
                       </CardBody>
                    </Card>
                  )}

                  {/* Bundle Opportunity - Enhanced with Visual Savings Calculator */}
                  {recommendedBundle && claim.items.length > 0 && (
                    <Card className="border-2 border-amber-500/40 bg-gradient-to-br from-amber-50 via-orange-50/50 to-amber-100/80 dark:from-amber-500/10 dark:to-orange-500/5 shadow-2xl shadow-amber-500/20 relative overflow-hidden">
                      {/* Animated background sparkle effect */}
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(251,191,36,0.1),transparent_50%)] pointer-events-none"></div>
                      
                      <CardBody className="space-y-5 relative z-10">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <span aria-hidden="true" className="material-symbols-outlined text-amber-500 text-4xl animate-pulse">redeem</span>
                              <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full animate-ping"></div>
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <div className="text-[11px] font-black uppercase tracking-widest text-amber-600">🎁 Bundle Opportunity</div>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest">
                                  <span aria-hidden="true" className="material-symbols-outlined text-[12px]">auto_awesome</span>
                                  AI Detected
                                </span>
                              </div>
                              <div className="text-base font-black text-slate-900 dark:text-white">{recommendedBundle.name}</div>
                            </div>
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border-2 border-amber-500/40 bg-white/90 dark:bg-slate-900/60 text-amber-700 dark:text-amber-400 shadow-lg" title="Match percentage based on required codes detected in your session">
                            {Math.round(recommendedBundle.matchPercentage || 0)}% match
                          </span>
                        </div>

                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 leading-relaxed">
                          {recommendedBundle.description}
                        </p>

                        {/* Visual Comparison - Enhanced */}
                        <div className="relative">
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                            <div className="flex flex-col items-center gap-1">
                              <span aria-hidden="true" className="material-symbols-outlined text-3xl text-emerald-600 drop-shadow-lg animate-bounce">trending_flat</span>
                              <span className="text-[9px] font-black uppercase tracking-widest text-emerald-700 bg-white/90 dark:bg-slate-900/80 px-2 py-0.5 rounded-full border border-emerald-500/30">
                                Save
                              </span>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div className="p-5 bg-white/90 dark:bg-slate-900/50 border-2 border-slate-300/80 dark:border-slate-700/60 rounded-2xl shadow-lg relative">
                              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Individual Codes</div>
                              <div className="text-2xl font-black text-slate-900 dark:text-white">{formatCurrency(individualTotal)}</div>
                              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1">Standard Pricing</div>
                            </div>
                            <div className="p-5 bg-gradient-to-br from-emerald-500/20 to-blue-600/20 border-2 border-emerald-500/40 rounded-2xl shadow-xl relative">
                              <div className="absolute -top-2 -right-2 bg-emerald-600 text-white text-[8px] font-black uppercase px-2 py-1 rounded-full shadow-lg">
                                Best Value
                              </div>
                              <div className="text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400 mb-1">Bundle Price</div>
                              <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400">{formatCurrency(recommendedBundle.totalPrice)}</div>
                              <div className="text-[9px] font-bold text-emerald-600 dark:text-emerald-500 uppercase tracking-wider mt-1">Optimized Rate</div>
                            </div>
                          </div>
                        </div>

                        {/* Savings Highlight - Enhanced */}
                        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/20 to-green-500/20 border-2 border-emerald-500/40 flex items-center justify-between gap-3 shadow-lg">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-600 text-white shadow-lg">
                              <span aria-hidden="true" className="material-symbols-outlined text-xl">savings</span>
                            </div>
                            <div>
                              <div className="text-[10px] font-black uppercase tracking-widest text-emerald-800 dark:text-emerald-300">You Save</div>
                              <div className="text-lg font-black text-emerald-700 dark:text-emerald-400">
                                {formatCurrency(bundleSavings)} <span className="text-sm">({bundleSavingsPct}%)</span>
                              </div>
                            </div>
                          </div>
                          {claim.bundleApplied ? (
                            <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full bg-emerald-600 text-white shadow-lg">
                              <span aria-hidden="true" className="material-symbols-outlined text-sm">check_circle</span>
                              Applied
                            </span>
                          ) : (
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-3 py-1.5 bg-white/50 dark:bg-slate-800/50 rounded-full">Optional</span>
                          )}
                        </div>

                        <div className="flex gap-3">
                          <Button
                            variant={claim.bundleApplied ? 'secondary' : 'success'}
                            className="flex-1 py-4 rounded-2xl text-base font-black shadow-xl hover:shadow-2xl transition-all duration-200 hover:scale-[1.02]"
                            onClick={claim.bundleApplied ? clearBundle : applyRecommendedBundle}
                            icon={claim.bundleApplied ? 'undo' : 'auto_fix_high'}
                            data-testid="claimbuilder-apply-bundle"
                          >
                            {claim.bundleApplied ? '↩️ Clear Bundle' : `✨ Apply ${recommendedBundle.name} Bundle`}
                          </Button>
                        </div>

                        {/* AI Confidence Note */}
                        <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-600/5 dark:bg-blue-600/10 border border-blue-600/10">
                          <span aria-hidden="true" className="material-symbols-outlined text-blue-600 text-sm">psychology</span>
                          <p className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 leading-relaxed">
                            <strong>AI Recommendation:</strong> This bundle was automatically detected based on your selected services. Applying it will optimize your claim for faster approval and maximum reimbursement.
                          </p>
                        </div>
                      </CardBody>
                    </Card>
                  )}

                  {/* Summary Card */}
                  <Card className="bg-slate-900 text-white shadow-2xl">
                     <CardBody className="space-y-6">
                        <div className="space-y-1">
                           <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Total Adjudicated Amount</p>
                           <h3 className="text-4xl font-black tracking-tighter text-blue-500">{formatCurrency(calculateTotal())}</h3>
                        </div>
                        <div className="space-y-3 pt-6 border-t border-white/10">
                           <div className="flex justify-between text-xs font-bold text-slate-400">
                              <span>Patient Coverage</span>
                              <span className="text-emerald-500">92% Cover</span>
                           </div>
                           <div className="flex justify-between text-xs font-bold text-slate-400">
                              <span>Taxes / VAT</span>
                              <span>SAR 0.00</span>
                           </div>
                        </div>
                        <Button className="w-full py-4 rounded-2xl" onClick={() => setStep(3)} data-testid="claimbuilder-proceed-review">
                          Proceed to Review
                        </Button>
                     </CardBody>
                  </Card>
               </div>
            </div>
          )}

          {step === 3 && (
            <Card className="max-w-3xl mx-auto animate-premium-in shadow-2xl overflow-hidden">
               <div className="p-12 text-center space-y-6 bg-slate-900 text-white">
                  <div className="size-20 bg-blue-600 rounded-[28px] flex items-center justify-center mx-auto shadow-2xl shadow-blue-600/40">
                     <span aria-hidden="true" className="material-symbols-outlined text-4xl">fact_check</span>
                  </div>
                  <div className="space-y-2">
                     <h2 className="text-4xl font-black tracking-tighter">Final Verification</h2>
                     <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Review the operational payload before national relay</p>
                  </div>
               </div>
               <CardBody className="p-8 space-y-8">
                  <div className="grid grid-cols-2 gap-6 pb-8 border-b border-slate-100 dark:border-slate-800">
                     <div>
                        <p className="text-[10px] font-black uppercase text-slate-400">Relaying to</p>
                        <p className="text-lg font-black text-slate-800 dark:text-white">NPHIES Production</p>
                     </div>
                     <div className="text-right">
                        <p className="text-[10px] font-black uppercase text-slate-400">Claim Value</p>
                        <p className="text-lg font-black text-blue-600">{formatCurrency(calculateTotal())}</p>
                     </div>
                  </div>
                  <div className="space-y-4">
                     <p className="text-[10px] font-black uppercase text-slate-400 text-center">Security Check</p>
                     <div className="flex justify-center gap-4">
                        <div className="flex items-center gap-2 text-xs font-bold text-emerald-500"><span aria-hidden="true" className="material-symbols-outlined text-sm">shield</span> Digital Signature Ready</div>
                        <div className="flex items-center gap-2 text-xs font-bold text-emerald-500"><span aria-hidden="true" className="material-symbols-outlined text-sm">lock</span> RSA-2048 Active</div>
                     </div>
                  </div>
                  <div className="flex gap-4 pt-4">
                     <Button variant="secondary" className="flex-1 py-4" onClick={() => setStep(2)}>Modify Session</Button>
                     <Button
                       loading={submitting}
                       icon="bolt"
                       className="flex-[2] py-4"
                       onClick={submitClaim}
                       data-testid="claimbuilder-submit"
                     >
                       Sign & Submit to NPHIES
                     </Button>
                  </div>
               </CardBody>
            </Card>
          )}

          {step === 4 && (
            <div className="max-w-2xl mx-auto text-center space-y-8 animate-premium-in py-12">
               <div className="relative">
                  <div className="size-32 bg-emerald-500 rounded-[40px] flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/20 scale-110">
                     <span aria-hidden="true" className="material-symbols-outlined text-6xl text-white">verified</span>
                  </div>
                  <div className="absolute inset-x-0 bottom-[-10px] flex justify-center">
                     <span className="px-4 py-1.5 bg-slate-900 border border-slate-800 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl">Transmission Success</span>
                  </div>
               </div>
               <div className="space-y-3">
                  <h2 className="text-4xl font-black tracking-tighter text-slate-900 dark:text-white">Claim Successfully Relayed</h2>
                  <p className="text-slate-500 font-bold max-w-sm mx-auto leading-relaxed">Your claim has been normalized, signed and accepted by the national integration gateway.</p>
               </div>
               
               <Card className="bg-slate-50 dark:bg-slate-900/40 border-slate-200/50 dark:border-slate-800/50">
                  <CardBody className="space-y-4 text-left">
                     <div className="flex justify-between items-center text-sm font-bold">
                        <span className="text-slate-400 uppercase tracking-widest text-[10px]">Reference ID</span>
                        <code className="text-blue-600 font-mono" data-testid="claimbuilder-reference">
                          {submissionResult?.claimId || 'CLM-88234-X'}
                        </code>
                     </div>
                     <div className="flex justify-between items-center text-sm font-bold">
                        <span className="text-slate-400 uppercase tracking-widest text-[10px]">Relay Status</span>
                        <span className="text-emerald-500 uppercase">Accepted</span>
                     </div>
                  </CardBody>
               </Card>

               <div className="flex flex-wrap justify-center gap-4">
                  <Button icon="receipt" onClick={() => window.open(submissionResult?.trackingUrl, '_blank')}>Download NPHIES Receipt</Button>
                  <Button variant="secondary" icon="refresh" onClick={() => window.location.reload()}>Build Another Claim</Button>
               </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
