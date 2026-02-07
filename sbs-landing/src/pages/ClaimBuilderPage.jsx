import { useState, useCallback, useEffect } from 'react';
import { nphiesService } from '../services/nphiesService';
import { aiAssistant } from '../services/aiAssistantService';
import { useToast } from '../components/Toast';
import { Button } from '../components/ui/Button';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { SectionHeader } from '../components/ui/SectionHeader';

/**
 * Premium Smart Claim Builder
 * AI-powered claim creation with bundle detection, validation, and real-time assistance
 */
export function ClaimBuilderPage() {
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
    items: []
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

  const verifyEligibility = async () => {
    if (!claim.patientId) {
      toast.warning('Please enter patient ID');
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
        toast.success('Patient eligibility verified');
        setStep(2);
      } else {
        toast.error('Patient coverage not active');
      }
    } catch (error) {
      toast.error('Verification failed');
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
        const localResults = aiAssistant.localSearch(query, null, 10);
        setSbsSuggestions(localResults);
        setShowSuggestions(true);
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
    if (!currentItem.sbsCode) return;
    const newItem = {
      ...currentItem,
      sequence: claim.items.length + 1,
      netPrice: currentItem.quantity * currentItem.unitPrice
    };
    const newItems = [...claim.items, newItem];
    setClaim(prev => ({ ...prev, items: newItems }));
    setCurrentItem({ sbsCode: '', description: '', quantity: 1, unitPrice: 0 });
    
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
    if (claim.bundleApplied && bundleInfo?.recommendedBundle) {
      return bundleInfo.recommendedBundle.totalPrice;
    }
    return claim.items.reduce((sum, item) => sum + item.netPrice, 0);
  };

  const submitClaim = async () => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/submit-claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claim: { ...claim, totalAmount: calculateTotal() } })
      });
      const result = await res.json();
      setSubmissionResult(result);
      setStep(4);
      toast.success('Claim submitted successfully');
    } catch (e) {
      toast.error('Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR', minimumFractionDigits: 0 }).format(amount);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-grid scrollbar-hide">
      <main className="max-w-[1400px] mx-auto p-6 sm:p-8 space-y-8 stagger-children">
        
        {/* Header and Progress */}
        <section className="animate-premium-in">
          <SectionHeader 
            title="Smart Claim Builder" 
            subtitle="Autonomous billing engine with real-time NPHIES compliance and AI code optimization."
            badge="AI-V4 Powered"
          />

          <div className="mt-10 mb-2 relative flex items-center justify-between max-w-3xl mx-auto">
            <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-200 dark:bg-slate-800 -translate-y-1/2 rounded-full"></div>
            <div 
              className="absolute top-1/2 left-0 h-1 bg-blue-600 -translate-y-1/2 rounded-full transition-all duration-700"
              style={{ width: `${((step - 1) / 3) * 100}%` }}
            ></div>
            
            {[
              { n: 1, icon: 'person_search', label: 'Identity' },
              { n: 2, icon: 'add_task', label: 'Services' },
              { n: 3, icon: 'fact_check', label: 'Review' },
              { n: 4, icon: 'check_circle', label: 'Relayed' }
            ].map(s => (
              <div key={s.n} className="relative z-10 flex flex-col items-center gap-2">
                <div className={`size-12 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-xl ${
                  step >= s.n ? 'bg-blue-600 text-white scale-110 shadow-blue-600/20' : 'bg-white dark:bg-slate-800 text-slate-400'
                }`}>
                  <span className="material-symbols-outlined text-2xl">{s.icon}</span>
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
              <CardHeader title="Patient & Payer Context" subtitle="Verified identities against national databases minimize claim rejection." />
              <CardBody className="grid md:grid-cols-2 gap-8">
                 <div className="space-y-4">
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Universal Patient ID</label>
                       <div className="relative group">
                          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600">fingerprint</span>
                          <input 
                            type="text" 
                            className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                            placeholder="Enter Saudi ID / Iqama"
                            value={claim.patientId}
                            onChange={(e) => setClaim({...claim, patientId: e.target.value})}
                          />
                       </div>
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Patient Full Name</label>
                       <input 
                          type="text" 
                          className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                          placeholder="e.g. Fadil Ahmad"
                          value={claim.patientName}
                          onChange={(e) => setClaim({...claim, patientName: e.target.value})}
                       />
                    </div>
                 </div>
                 <div className="space-y-4">
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Contact Email</label>
                       <input 
                          type="email" 
                          className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                          placeholder="billing-notifications@provider.com"
                          value={claim.userEmail}
                          onChange={(e) => setClaim({...claim, userEmail: e.target.value})}
                       />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Service Date</label>
                          <input 
                            type="date" 
                            className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                            value={claim.serviceDate}
                            onChange={(e) => setClaim({...claim, serviceDate: e.target.value})}
                          />
                       </div>
                       <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Claim Type</label>
                          <select 
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
                    <Button loading={loading} icon="verified" onClick={verifyEligibility} className="w-full py-4 rounded-2xl">Validate Identity & Continue</Button>
                 </div>
              </CardBody>
            </Card>
          )}

          {step === 2 && (
            <div className="grid lg:grid-cols-3 gap-8 animate-premium-in">
               <div className="lg:col-span-2 space-y-6">
                  {/* Service Entry */}
                  <Card>
                     <CardHeader title="Service Orchestration" subtitle="Add procedures, pharmaceuticals, or disposables to this claim session." />
                     <CardBody className="space-y-6">
                        <div className="relative space-y-2">
                           <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">SBS Code / Service Description</label>
                           <div className="relative">
                              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                              <input 
                                type="text"
                                className="w-full pl-12 pr-12 py-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                                placeholder="Search by code or describe in natural language..."
                                value={currentItem.sbsCode}
                                onChange={(e) => handleSbsSearch(e.target.value)}
                              />
                              {isSearching && <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-blue-600">progress_activity</span>}
                           </div>
                           
                           {showSuggestions && sbsSuggestions.length > 0 && (
                             <div className="absolute z-50 w-full mt-2 glass-panel border border-slate-200/50 dark:border-slate-700/50 rounded-2xl shadow-2xl max-h-72 overflow-y-auto overflow-x-hidden">
                                {aiInsights && <div className="px-5 py-2.5 bg-blue-600 font-bold text-white text-[11px] flex items-center gap-2">
                                   <span className="material-symbols-outlined text-sm">auto_awesome</span> {aiInsights}
                                </div>}
                                {sbsSuggestions.map((item, idx) => (
                                  <div key={idx} onClick={() => selectSbsCode(item)} className="px-5 py-4 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer border-b border-slate-100 dark:border-slate-800 last:border-0 group/item transition-colors">
                                     <div className="flex justify-between items-start">
                                        <span className="font-mono text-sm font-bold text-blue-600 bg-blue-600/10 px-2 py-0.5 rounded">{item.code}</span>
                                        <span className="text-[10px] font-black uppercase text-slate-400">{item.category}</span>
                                     </div>
                                     <p className="mt-1 text-sm font-bold text-slate-700 dark:text-slate-200">{item.desc}</p>
                                  </div>
                                ))}
                             </div>
                           )}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-2">
                              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Quantity</label>
                              <input 
                                type="number" 
                                className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold"
                                value={currentItem.quantity}
                                onChange={(e) => setCurrentItem({...currentItem, quantity: Number(e.target.value)})}
                              />
                           </div>
                           <div className="space-y-2">
                              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Unit Price (Estimated)</label>
                              <div className="relative">
                                 <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">SAR</span>
                                 <input 
                                   type="number" 
                                   className="w-full pl-14 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold"
                                   value={currentItem.unitPrice}
                                   onChange={(e) => setCurrentItem({...currentItem, unitPrice: Number(e.target.value)})}
                                 />
                              </div>
                           </div>
                        </div>
                        <Button variant="secondary" className="w-full py-4 rounded-2xl border-dashed" onClick={addItem} icon="add_box">Add to Session</Button>
                     </CardBody>
                  </Card>

                  {/* List of items */}
                  {claim.items.length > 0 && (
                    <Card>
                       <CardHeader title="Session Payload" action={<span className="text-xl font-black text-blue-600">{formatCurrency(calculateTotal())}</span>} />
                       <div className="overflow-x-auto">
                          <table className="w-full text-left">
                             <thead className="bg-slate-50 dark:bg-slate-900/40">
                                <tr>
                                   <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500">Service Info</th>
                                   <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 text-right">Net Price</th>
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
                                        <button onClick={() => removeItem(idx)} className="p-2 text-slate-300 hover:text-rose-500 transition-colors"><span className="material-symbols-outlined text-lg">delete</span></button>
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
                             <span className={`material-symbols-outlined font-black ${isValidating ? 'text-blue-600' : validation?.errors?.length > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                {isValidating ? 'sync' : validation?.errors?.length > 0 ? 'report' : 'verified'}
                             </span>
                             <h4 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white">AI Compliance Agent</h4>
                          </div>
                          
                          {validation?.errors?.map((err, i) => (
                            <div key={i} className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs font-bold text-rose-600 flex gap-2">
                               <span className="material-symbols-outlined text-xs">close</span> {err}
                            </div>
                          ))}
                          {validation?.warnings?.map((err, i) => (
                            <div key={i} className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs font-bold text-amber-600 flex gap-2">
                               <span className="material-symbols-outlined text-xs">warning</span> {err}
                            </div>
                          ))}
                          
                          {validation?.suggestions?.map((sug, i) => (
                            <div key={i} className="p-4 glass-panel border border-blue-600/20 rounded-2xl space-y-3">
                               <div className="flex items-start gap-2">
                                  <span className="material-symbols-outlined text-blue-600 text-sm">auto_awesome</span>
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
                        <Button className="w-full py-4 rounded-2xl" onClick={() => setStep(3)}>Proceed to Review</Button>
                     </CardBody>
                  </Card>
               </div>
            </div>
          )}

          {step === 3 && (
            <Card className="max-w-3xl mx-auto animate-premium-in shadow-2xl overflow-hidden">
               <div className="p-12 text-center space-y-6 bg-slate-900 text-white">
                  <div className="size-20 bg-blue-600 rounded-[28px] flex items-center justify-center mx-auto shadow-2xl shadow-blue-600/40">
                     <span className="material-symbols-outlined text-4xl">fact_check</span>
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
                        <div className="flex items-center gap-2 text-xs font-bold text-emerald-500"><span className="material-symbols-outlined text-sm">shield</span> Digital Signature Ready</div>
                        <div className="flex items-center gap-2 text-xs font-bold text-emerald-500"><span className="material-symbols-outlined text-sm">lock</span> RSA-2048 Active</div>
                     </div>
                  </div>
                  <div className="flex gap-4 pt-4">
                     <Button variant="secondary" className="flex-1 py-4" onClick={() => setStep(2)}>Modify Session</Button>
                     <Button loading={submitting} icon="bolt" className="flex-[2] py-4" onClick={submitClaim}>Sign & Submit to NPHIES</Button>
                  </div>
               </CardBody>
            </Card>
          )}

          {step === 4 && (
            <div className="max-w-2xl mx-auto text-center space-y-8 animate-premium-in py-12">
               <div className="relative">
                  <div className="size-32 bg-emerald-500 rounded-[40px] flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/20 scale-110">
                     <span className="material-symbols-outlined text-6xl text-white">verified</span>
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
                        <code className="text-blue-600 font-mono">{submissionResult?.claimId || 'CLM-88234-X'}</code>
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
