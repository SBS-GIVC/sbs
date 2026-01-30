import { useState, useCallback } from 'react';
import { nphiesService } from '../services/nphiesService';
import { searchSBSCodes, getSBSCodeDetails } from '../utils/middleware';
import { useToast } from '../components/Toast';

/**
 * Smart Claim Builder
 * Intelligent claim creation with bundle detection, prior auth checking, and real-time validation
 */
export function ClaimBuilderPage() {
  const [step, setStep] = useState(1);
  const [claim, setClaim] = useState({
    patientId: '',
    patientName: '',
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
  const [eligibility, setEligibility] = useState(null);
  const [bundleInfo, setBundleInfo] = useState(null);
  const [priorAuthRequired, setPriorAuthRequired] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  // Step 1: Verify patient eligibility
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
      toast.error('Eligibility verification failed');
    } finally {
      setLoading(false);
    }
  };

  // Search SBS codes
  const handleSbsSearch = useCallback((query) => {
    setCurrentItem(prev => ({ ...prev, sbsCode: query }));
    
    if (query.length >= 2) {
      const results = searchSBSCodes(query, 10);
      setSbsSuggestions(results);
      setShowSuggestions(true);
    } else {
      setSbsSuggestions([]);
      setShowSuggestions(false);
    }
  }, []);

  // Select SBS code
  const selectSbsCode = (item) => {
    setCurrentItem({
      sbsCode: item.code,
      description: item.desc,
      quantity: 1,
      unitPrice: item.fee || 250
    });
    setShowSuggestions(false);
  };

  // Add item to claim
  const addItem = () => {
    if (!currentItem.sbsCode) {
      toast.warning('Please select a service code');
      return;
    }

    const newItem = {
      ...currentItem,
      sequence: claim.items.length + 1,
      netPrice: currentItem.quantity * currentItem.unitPrice
    };

    setClaim(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));

    // Reset current item
    setCurrentItem({ sbsCode: '', description: '', quantity: 1, unitPrice: 0 });
    
    // Check for bundles after adding
    checkBundles([...claim.items, newItem]);
    
    // Check if prior auth is required
    checkPriorAuth(newItem);
    
    toast.success('Service added to claim');
  };

  // Remove item from claim
  const removeItem = (index) => {
    const newItems = claim.items.filter((_, i) => i !== index);
    setClaim(prev => ({ ...prev, items: newItems }));
    checkBundles(newItems);
  };

  // Check for applicable bundles
  const checkBundles = (items) => {
    const sbsCodes = items.map(item => item.sbsCode);
    const result = nphiesService.detectBundles(sbsCodes);
    
    if (result.hasApplicableBundles && result.recommendedBundle) {
      setBundleInfo(result);
      toast.info(`Bundle detected: ${result.recommendedBundle.name} - Save ${formatCurrency(result.recommendedBundle.savings)}`);
    } else {
      setBundleInfo(null);
    }
  };

  // Check if prior auth is required
  const checkPriorAuth = (item) => {
    // Check against high-value procedure list
    const highValueCodes = ['49518', '38200', '39703', '38218', '30443', '30571'];
    const codePrefix = item.sbsCode.split('-')[0];
    
    if (highValueCodes.includes(codePrefix) || item.unitPrice > 5000) {
      setPriorAuthRequired(prev => [...prev, item.sbsCode]);
      toast.warning(`Prior authorization may be required for: ${item.description}`);
    }
  };

  // Apply bundle pricing
  const applyBundle = () => {
    if (bundleInfo && bundleInfo.recommendedBundle) {
      toast.success(`Applied ${bundleInfo.recommendedBundle.name}`);
      setClaim(prev => ({
        ...prev,
        bundleApplied: true,
        bundleId: bundleInfo.recommendedBundle.id
      }));
    }
  };

  // Calculate totals
  const calculateTotal = () => {
    if (claim.bundleApplied && bundleInfo?.recommendedBundle) {
      return bundleInfo.recommendedBundle.totalPrice;
    }
    return claim.items.reduce((sum, item) => sum + item.netPrice, 0);
  };

  // Submit claim
  const submitClaim = async () => {
    if (claim.items.length === 0) {
      toast.warning('Please add at least one service');
      return;
    }

    // Check for required prior auths
    if (priorAuthRequired.length > 0) {
      const proceed = window.confirm(
        `The following services may require prior authorization:\n\n${priorAuthRequired.join('\n')}\n\nProceed with submission?`
      );
      if (!proceed) return;
    }

    setSubmitting(true);
    try {
      const result = await nphiesService.submitClaim({
        ...claim,
        claimNumber: `CLM-${Date.now()}`,
        totalAmount: calculateTotal()
      });

      toast.success(`Claim ${result.nphiesReference} submitted successfully!`);
      setStep(4);
    } catch (error) {
      toast.error('Claim submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-SA', { 
      style: 'currency', 
      currency: 'SAR',
      minimumFractionDigits: 0 
    }).format(amount);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-background-light dark:bg-background-dark">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-700 px-8 py-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <span className="material-symbols-rounded text-3xl text-white">smart_toy</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Smart Claim Builder</h1>
              <p className="text-blue-100">AI-powered claim creation with automatic validation</p>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-between relative">
            <div className="absolute top-5 left-0 right-0 h-1 bg-white/20 rounded-full" />
            <div 
              className="absolute top-5 left-0 h-1 bg-white rounded-full transition-all duration-500"
              style={{ width: `${((step - 1) / 3) * 100}%` }}
            />
            
            {[
              { num: 1, label: 'Verify Patient', icon: 'person_search' },
              { num: 2, label: 'Add Services', icon: 'add_shopping_cart' },
              { num: 3, label: 'Review & Submit', icon: 'fact_check' },
              { num: 4, label: 'Complete', icon: 'check_circle' }
            ].map(s => (
              <div key={s.num} className="relative z-10 flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  step >= s.num 
                    ? 'bg-white text-blue-600' 
                    : 'bg-white/20 text-white'
                }`}>
                  <span className="material-symbols-rounded">{s.icon}</span>
                </div>
                <span className={`mt-2 text-sm font-medium ${
                  step >= s.num ? 'text-white' : 'text-white/60'
                }`}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-8 py-8">
        {/* Step 1: Patient Verification */}
        {step === 1 && (
          <div className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-slate-800 p-8">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Step 1: Verify Patient Eligibility</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Patient ID / National ID *
                </label>
                <input
                  type="text"
                  value={claim.patientId}
                  onChange={(e) => setClaim(prev => ({ ...prev, patientId: e.target.value }))}
                  placeholder="Enter patient ID..."
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Patient Name
                </label>
                <input
                  type="text"
                  value={claim.patientName}
                  onChange={(e) => setClaim(prev => ({ ...prev, patientName: e.target.value }))}
                  placeholder="Enter patient name..."
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Service Date
                </label>
                <input
                  type="date"
                  value={claim.serviceDate}
                  onChange={(e) => setClaim(prev => ({ ...prev, serviceDate: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Claim Type
                </label>
                <select
                  value={claim.claimType}
                  onChange={(e) => setClaim(prev => ({ ...prev, claimType: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary"
                >
                  <option value="institutional">Institutional (Inpatient)</option>
                  <option value="professional">Professional (Outpatient)</option>
                  <option value="oral">Oral (Dental)</option>
                  <option value="pharmacy">Pharmacy</option>
                  <option value="vision">Vision (Optical)</option>
                </select>
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <button
                onClick={verifyEligibility}
                disabled={loading}
                className="px-8 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="material-symbols-rounded animate-spin">progress_activity</span>
                    Verifying...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-rounded">verified_user</span>
                    Verify Eligibility
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Add Services */}
        {step === 2 && (
          <div className="space-y-6">
            {/* Eligibility Summary */}
            {eligibility && (
              <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl p-6 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="material-symbols-rounded text-4xl">verified_user</span>
                    <div>
                      <h3 className="font-bold text-lg">Patient Eligible</h3>
                      <p className="text-emerald-100">{eligibility.payerName} • {eligibility.policyNumber}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-emerald-100">Outpatient Remaining</p>
                    <p className="text-2xl font-bold">{formatCurrency(eligibility.benefits?.outpatient?.remaining || 0)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Add Service Form */}
            <div className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Add Service</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2 relative">
                  <input
                    type="text"
                    value={currentItem.sbsCode}
                    onChange={(e) => handleSbsSearch(e.target.value)}
                    onFocus={() => sbsSuggestions.length > 0 && setShowSuggestions(true)}
                    placeholder="Search SBS code or description..."
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary"
                  />
                  
                  {showSuggestions && sbsSuggestions.length > 0 && (
                    <div className="absolute z-20 w-full mt-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl max-h-64 overflow-y-auto">
                      {sbsSuggestions.map((item, index) => (
                        <button
                          key={index}
                          onClick={() => selectSbsCode(item)}
                          className="w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3 border-b border-slate-100 dark:border-slate-700 last:border-0"
                        >
                          <span className="font-mono text-sm text-primary">{item.code}</span>
                          <span className="text-sm text-slate-600 dark:text-slate-400 flex-1 truncate">{item.desc}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <input
                    type="number"
                    value={currentItem.quantity}
                    onChange={(e) => setCurrentItem(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                    min="1"
                    placeholder="Qty"
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <button
                    onClick={addItem}
                    disabled={!currentItem.sbsCode}
                    className="w-full px-4 py-3 rounded-xl bg-primary text-white font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-rounded">add</span>
                    Add
                  </button>
                </div>
              </div>

              {currentItem.description && (
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  Selected: <strong>{currentItem.description}</strong> • Unit Price: {formatCurrency(currentItem.unitPrice)}
                </p>
              )}
            </div>

            {/* Bundle Detection Alert */}
            {bundleInfo && bundleInfo.recommendedBundle && !claim.bundleApplied && (
              <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-6 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="material-symbols-rounded text-4xl">inventory_2</span>
                    <div>
                      <h3 className="font-bold text-lg">Bundle Detected!</h3>
                      <p className="text-amber-100">{bundleInfo.recommendedBundle.name}</p>
                      <p className="text-sm text-amber-200 mt-1">
                        Save {formatCurrency(bundleInfo.recommendedBundle.savings)} with bundle pricing
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={applyBundle}
                    className="px-6 py-3 bg-white text-amber-600 rounded-xl font-semibold hover:bg-amber-50 transition-colors"
                  >
                    Apply Bundle
                  </button>
                </div>
              </div>
            )}

            {claim.bundleApplied && (
              <div className="bg-emerald-100 dark:bg-emerald-900/20 border border-emerald-300 dark:border-emerald-800 rounded-xl p-4">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                  <span className="material-symbols-rounded">check_circle</span>
                  <span className="font-medium">Bundle Applied: {bundleInfo.recommendedBundle.name}</span>
                </div>
              </div>
            )}

            {/* Prior Auth Warning */}
            {priorAuthRequired.length > 0 && (
              <div className="bg-amber-100 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-800 rounded-xl p-4">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                  <span className="material-symbols-rounded">warning</span>
                  <span className="font-medium">Prior authorization may be required for: {priorAuthRequired.join(', ')}</span>
                </div>
              </div>
            )}

            {/* Items List */}
            {claim.items.length > 0 && (
              <div className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                  <h3 className="font-bold text-slate-900 dark:text-white">Claim Items ({claim.items.length})</h3>
                </div>
                <table className="w-full">
                  <thead className="bg-slate-50 dark:bg-slate-800/30">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">#</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">SBS Code</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Description</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Qty</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Unit Price</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Net</th>
                      <th className="px-6 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {claim.items.map((item, index) => (
                      <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                        <td className="px-6 py-4 text-sm text-slate-500">{index + 1}</td>
                        <td className="px-6 py-4 font-mono text-sm text-primary">{item.sbsCode}</td>
                        <td className="px-6 py-4 text-sm text-slate-900 dark:text-white">{item.description}</td>
                        <td className="px-6 py-4 text-sm text-slate-500 text-right">{item.quantity}</td>
                        <td className="px-6 py-4 text-sm text-slate-500 text-right">{formatCurrency(item.unitPrice)}</td>
                        <td className="px-6 py-4 text-sm font-semibold text-slate-900 dark:text-white text-right">{formatCurrency(item.netPrice)}</td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => removeItem(index)}
                            className="text-red-500 hover:text-red-600"
                          >
                            <span className="material-symbols-rounded text-xl">delete</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 dark:bg-slate-800/50">
                    <tr>
                      <td colSpan="5" className="px-6 py-4 text-right font-bold text-slate-900 dark:text-white">
                        {claim.bundleApplied ? 'Bundle Total:' : 'Total:'}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-xl text-primary">
                        {formatCurrency(calculateTotal())}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between">
              <button
                onClick={() => setStep(1)}
                className="px-6 py-3 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                ← Back
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={claim.items.length === 0}
                className="px-8 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                Review Claim
                <span className="material-symbols-rounded">arrow_forward</span>
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Review & Submit */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Review Claim</h2>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                <div>
                  <p className="text-sm text-slate-500">Patient ID</p>
                  <p className="font-semibold text-slate-900 dark:text-white">{claim.patientId}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Policy Number</p>
                  <p className="font-semibold text-slate-900 dark:text-white">{claim.policyNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Service Date</p>
                  <p className="font-semibold text-slate-900 dark:text-white">{claim.serviceDate}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Total Amount</p>
                  <p className="font-bold text-2xl text-primary">{formatCurrency(calculateTotal())}</p>
                </div>
              </div>

              <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Services ({claim.items.length})</h3>
              <div className="space-y-3">
                {claim.items.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                    <div className="flex items-center gap-4">
                      <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-mono text-sm text-primary">{item.sbsCode}</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">{item.description}</p>
                      </div>
                    </div>
                    <p className="font-semibold text-slate-900 dark:text-white">{formatCurrency(item.netPrice)}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setStep(2)}
                className="px-6 py-3 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                ← Back
              </button>
              <button
                onClick={submitClaim}
                disabled={submitting}
                className="px-8 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <span className="material-symbols-rounded animate-spin">progress_activity</span>
                    Submitting...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-rounded">send</span>
                    Submit to NPHIES
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Success */}
        {step === 4 && (
          <div className="text-center py-16">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <span className="material-symbols-rounded text-5xl text-emerald-600">check_circle</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Claim Submitted Successfully!</h2>
            <p className="text-slate-500 mb-8">Your claim has been sent to NPHIES for processing.</p>
            
            <div className="inline-flex gap-4">
              <button
                onClick={() => {
                  setClaim({
                    patientId: '',
                    patientName: '',
                    facilityId: 'FAC001',
                    policyNumber: '',
                    serviceDate: new Date().toISOString().split('T')[0],
                    claimType: 'institutional',
                    diagnoses: [],
                    items: []
                  });
                  setEligibility(null);
                  setBundleInfo(null);
                  setPriorAuthRequired([]);
                  setStep(1);
                }}
                className="px-6 py-3 rounded-xl bg-primary text-white font-medium hover:bg-primary/90"
              >
                Create New Claim
              </button>
              <button
                onClick={() => window.location.hash = '#claims'}
                className="px-6 py-3 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                View All Claims
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
