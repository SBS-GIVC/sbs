import { useState } from 'react';
import { nphiesService } from '../services/nphiesService';
import { useToast } from '../components/Toast';
import { Button } from '../components/ui/Button';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { SectionHeader } from '../components/ui/SectionHeader';

/**
 * Premium Eligibility Verification Page
 * Optimized for GIVC-SBS Ultra-Premium Design System
 */
export function EligibilityPage() {
  const [patientId, setPatientId] = useState('');
  const [insurerId, setInsurerId] = useState('');
  const [loading, setLoading] = useState(false);
  const [eligibility, setEligibility] = useState(null);
  const [error, setError] = useState(null);
  const toast = useToast();

  const handleVerify = async () => {
    if (!patientId) {
      toast.warning('Please enter a Patient ID');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await nphiesService.checkEligibility({
        patientId,
        insurerId: insurerId || 'INS-DEFAULT',
        policyNumber: `POL-${patientId}`,
        serviceDate: new Date().toISOString().split('T')[0]
      });

      setEligibility(result);
      
      if (result.eligible) {
        toast.success('Patient is eligible for coverage');
      } else {
        toast.error('Patient coverage not active');
      }
    } catch (err) {
      setError(err.message);
      toast.error('Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('en-SA', { 
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
    <div className="flex-1 overflow-y-auto bg-grid scrollbar-hide">
      <main className="max-w-[1200px] mx-auto p-6 sm:p-8 space-y-8 stagger-children">
        
        {/* Header Section */}
        <section className="animate-premium-in">
          <SectionHeader 
            title="Eligibility Verification" 
            subtitle="Validate patient coverage and benefit limits against national NPHIES databases in real-time."
            badge="Live Verification"
          />
          
          <Card className="mt-8 border-l-4 border-l-emerald-500">
            <CardBody className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Patient National ID / Iqama</label>
                  <div className="relative group">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors">fingerprint</span>
                    <input
                      type="text"
                      value={patientId}
                      onChange={(e) => setPatientId(e.target.value)}
                      placeholder="e.g. 1029384756"
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-blue-600/20 transition-all"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Insurance Provider</label>
                  <div className="relative group">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors">business</span>
                    <select
                      value={insurerId}
                      onChange={(e) => setInsurerId(e.target.value)}
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-blue-600/20 appearance-none transition-all"
                    >
                      <option value="">Auto-detect via NPHIES</option>
                      <option value="INS-BUPA">Bupa Arabia</option>
                      <option value="INS-TAWUNIYA">Tawuniya</option>
                      <option value="INS-MEDGULF">MedGulf</option>
                      <option value="INS-AXA">GIG (Formerly AXA)</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</span>
                  </div>
                </div>

                <Button 
                  loading={loading}
                  icon="verified" 
                  onClick={handleVerify}
                  className="w-full py-4 rounded-2xl"
                  variant="success"
                >
                  Verify Coverage
                </Button>
              </div>
            </CardBody>
          </Card>
        </section>

        {/* Results Area */}
        <div className="min-h-[400px]">
          {error && (
            <div className="animate-premium-in p-6 rounded-3xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-4">
              <div className="size-12 rounded-2xl bg-rose-500 flex items-center justify-center text-white shadow-lg shadow-rose-500/20">
                <span className="material-symbols-outlined">report</span>
              </div>
              <div>
                <h4 className="font-bold text-rose-600 dark:text-rose-400">Verification Failed</h4>
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
                      <span className="material-symbols-outlined text-5xl">
                        {eligibility.eligible ? 'check_circle' : 'cancel'}
                      </span>
                    </div>
                    <div className="text-center sm:text-left">
                      <h2 className="text-3xl font-extrabold tracking-tighter leading-tight">
                        {eligibility.eligible ? 'Patient is Eligible' : 'Coverage Inactive'}
                      </h2>
                      <p className="text-white/80 font-bold tracking-tight mt-1 flex items-center gap-2 justify-center sm:justify-start">
                        <span className="material-symbols-outlined text-sm">policy</span>
                        Policy: {eligibility.policyNumber}
                        <span className="mx-2 opacity-50">|</span>
                        Class: {eligibility.className || 'Standard'}
                      </p>
                    </div>
                  </div>
                  <div className="text-center sm:text-right bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                    <p className="text-xs font-bold uppercase tracking-widest text-white/70">Coverage Valid Until</p>
                    <p className="text-2xl font-black">{eligibility.coverageEnd}</p>
                  </div>
                </div>
                
                <CardBody className="grid sm:grid-cols-3 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-slate-200/50 dark:divide-slate-800/50 p-0">
                  <div className="p-6 space-y-1">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Insurance Payer</p>
                    <p className="text-lg font-extrabold text-slate-900 dark:text-white capitalize">{eligibility.payerName || 'Detecting...'}</p>
                    <p className="text-xs font-mono text-slate-400">{eligibility.payerId}</p>
                  </div>
                  <div className="p-6 space-y-1">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Co-Payment / Deductible</p>
                    <div className="flex items-center gap-2">
                       <span className="text-lg font-extrabold text-slate-900 dark:text-white">{eligibility.coPayPercentage || 0}%</span>
                       <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-600/10 text-blue-600 border border-blue-600/20">Patient Share</span>
                    </div>
                    <p className="text-xs font-bold text-slate-400">{formatCurrency(eligibility.deductible)} total deductible</p>
                  </div>
                  <div className="p-6 space-y-1">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Adjudication Mode</p>
                    <p className="text-lg font-extrabold text-slate-900 dark:text-white">Real-time (NPHIES)</p>
                    <p className="text-xs font-bold text-emerald-500 flex items-center gap-1">
                      <span className="size-1.5 rounded-full bg-emerald-500"></span> 
                      Secure Bridge Active
                    </p>
                  </div>
                </CardBody>
              </Card>

              {/* Benefits breakdown */}
              <Card>
                <CardHeader 
                  title="Coverage Benefits Detail" 
                  subtitle="Detailed breakdown of active benefit categories and remaining limits."
                />
                <CardBody className="space-y-6">
                  {Object.values(eligibility.benefits || {}).map((benefit, index) => (
                    <BenefitBar
                      key={index}
                      benefit={benefit}
                      formatCurrency={formatCurrency}
                      percentage={getBenefitUsagePercentage(benefit)}
                    />
                  ))}
                </CardBody>
              </Card>

              {/* Quick Actions */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <ActionCard icon="add_box" label="Create Claim" sub="Use current eligibility" onClick={() => window.dispatchEvent(new CustomEvent('sbs:navigate', { detail: { view: 'claim-builder' } }))} />
                <ActionCard icon="approval" label="Request Auth" sub="Pre-approval portal" onClick={() => window.dispatchEvent(new CustomEvent('sbs:navigate', { detail: { view: 'prior-auth' } }))} />
                <ActionCard icon="print" label="Print Summary" sub="Generate PDF export" onClick={() => window.print()} />
                <ActionCard icon="history" label="Verify History" sub="Audit older sessions" onClick={() => {}} />
              </div>
            </div>
          ) : !loading && (
            <div className="flex flex-col items-center justify-center py-20 animate-premium-in">
              <div className="size-24 rounded-[32px] bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center text-slate-300 dark:text-slate-600 mb-6">
                <span className="material-symbols-outlined text-6xl">person_search</span>
              </div>
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">Ready for Verification</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1 max-w-xs text-center">
                Enter a Patient National ID or Iqama number to begin the real-time eligibility check.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function BenefitBar({ benefit, formatCurrency, percentage }) {
  const isHighUsage = percentage > 85;
  return (
    <div className="space-y-2 group">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-1.5 rounded-lg ${isHighUsage ? 'bg-rose-500/10 text-rose-600' : 'bg-blue-600/10 text-blue-600'}`}>
            <span className="material-symbols-outlined text-[20px]">medical_services</span>
          </div>
          <span className="text-sm font-extrabold text-slate-700 dark:text-slate-200 capitalize group-hover:text-blue-600 transition-colors">
            {benefit.name || benefit.category}
          </span>
        </div>
        <div className="text-right">
          <p className="text-sm font-black text-slate-900 dark:text-white">{formatCurrency(benefit.remaining)}</p>
          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Remaining Limit</p>
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
        <span>Used: {formatCurrency(benefit.used)} ({percentage}%)</span>
        <span>Annual Limit: {formatCurrency(benefit.allowed)}</span>
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
        <span className="material-symbols-outlined text-2xl">{icon}</span>
      </div>
      <div>
        <h4 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight">{label}</h4>
        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">{sub}</p>
      </div>
    </button>
  );
}
