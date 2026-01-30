import { useState } from 'react';
import { nphiesService } from '../services/nphiesService';
import { useToast } from '../components/Toast';

/**
 * Eligibility Verification Page
 * Real-time patient coverage verification with NPHIES
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
    <div className="flex-1 overflow-y-auto bg-background-light dark:bg-background-dark">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 px-8 py-12">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMtOS45NDEgMC0xOCA4LjA1OS0xOCAxOHM4LjA1OSAxOCAxOCAxOCAxOC04LjA1OSAxOC0xOC04LjA1OS0xOC0xOC0xOHoiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLW9wYWNpdHk9Ii4xIi8+PC9nPjwvc3ZnPg==')] opacity-30"></div>
        
        <div className="relative max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <span className="material-symbols-rounded text-3xl text-white">verified_user</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Eligibility Verification</h1>
              <p className="text-emerald-100">Real-time coverage verification via NPHIES</p>
            </div>
          </div>

          {/* Search Card */}
          <div className="mt-8 bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-emerald-100 mb-2">Patient ID / National ID</label>
                <input
                  type="text"
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  placeholder="Enter patient ID..."
                  className="w-full px-4 py-3 rounded-xl bg-white/20 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-emerald-100 mb-2">Insurance Provider (Optional)</label>
                <select
                  value={insurerId}
                  onChange={(e) => setInsurerId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/20 border border-white/30 text-white focus:outline-none focus:ring-2 focus:ring-white/50"
                >
                  <option value="">Auto-detect</option>
                  <option value="INS-BUPA">Bupa Arabia</option>
                  <option value="INS-TAWUNIYA">Tawuniya</option>
                  <option value="INS-MEDGULF">MedGulf</option>
                  <option value="INS-AXA">AXA Cooperative</option>
                  <option value="INS-MALATH">Malath Insurance</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleVerify}
                  disabled={loading}
                  className="w-full px-6 py-3 rounded-xl bg-white text-emerald-600 font-semibold hover:bg-emerald-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <span className="material-symbols-rounded animate-spin text-xl">progress_activity</span>
                      Verifying...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-rounded text-xl">search</span>
                      Verify Eligibility
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Results Section */}
      <div className="max-w-4xl mx-auto px-8 py-8">
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <div className="flex items-center gap-3">
              <span className="material-symbols-rounded text-red-500">error</span>
              <p className="text-red-600 dark:text-red-400">{error}</p>
            </div>
          </div>
        )}

        {eligibility && (
          <div className="space-y-6 animate-in fade-in duration-500">
            {/* Status Card */}
            <div className={`rounded-2xl p-6 ${
              eligibility.eligible 
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500' 
                : 'bg-gradient-to-r from-red-500 to-orange-500'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
                    <span className="material-symbols-rounded text-4xl text-white">
                      {eligibility.eligible ? 'check_circle' : 'cancel'}
                    </span>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">
                      {eligibility.eligible ? 'Coverage Active' : 'Coverage Inactive'}
                    </h2>
                    <p className="text-white/80">
                      Policy: {eligibility.policyNumber} | Class: {eligibility.className || 'Standard'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-white/70">Valid Until</p>
                  <p className="text-xl font-bold text-white">{eligibility.coverageEnd}</p>
                </div>
              </div>
            </div>

            {/* Insurance Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <InfoCard
                icon="business"
                label="Insurance Provider"
                value={eligibility.payerName || 'Unknown'}
                sublabel={eligibility.payerId}
              />
              <InfoCard
                icon="percent"
                label="Co-Payment"
                value={`${eligibility.coPayPercentage || 0}%`}
                sublabel="Patient responsibility"
              />
              <InfoCard
                icon="payments"
                label="Deductible"
                value={formatCurrency(eligibility.deductible)}
                sublabel={eligibility.deductibleMet ? '✓ Met for this year' : 'Not yet met'}
              />
            </div>

            {/* Benefits Breakdown */}
            <div className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Benefits Summary</h3>
                <p className="text-sm text-slate-500">Annual coverage limits and usage</p>
              </div>
              
              <div className="p-6 space-y-6">
                {Object.values(eligibility.benefits || {}).map((benefit, index) => (
                  <BenefitRow
                    key={index}
                    benefit={benefit}
                    formatCurrency={formatCurrency}
                    usagePercentage={getBenefitUsagePercentage(benefit)}
                  />
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <QuickActionButton
                icon="receipt_long"
                label="Submit Claim"
                onClick={() => window.location.hash = '#claims'}
              />
              <QuickActionButton
                icon="approval"
                label="Prior Authorization"
                onClick={() => window.location.hash = '#prior-auth'}
              />
              <QuickActionButton
                icon="print"
                label="Print Summary"
                onClick={() => window.print()}
              />
              <QuickActionButton
                icon="history"
                label="View History"
                onClick={() => {}}
              />
            </div>
          </div>
        )}

        {/* Empty State */}
        {!eligibility && !loading && !error && (
          <div className="text-center py-16">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <span className="material-symbols-rounded text-5xl text-slate-400">person_search</span>
            </div>
            <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Enter Patient Details
            </h3>
            <p className="text-slate-500 max-w-md mx-auto">
              Enter a patient ID above to verify their insurance eligibility and view coverage details in real-time.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoCard({ icon, label, value, sublabel }) {
  return (
    <div className="bg-white dark:bg-surface-dark rounded-xl p-5 border border-slate-200 dark:border-slate-800">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <span className="material-symbols-rounded text-primary">{icon}</span>
        </div>
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
          <p className="text-lg font-bold text-slate-900 dark:text-white">{value}</p>
          <p className="text-xs text-slate-400">{sublabel}</p>
        </div>
      </div>
    </div>
  );
}

function BenefitRow({ benefit, formatCurrency, usagePercentage }) {
  const getBarColor = (percentage) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-900 dark:text-white capitalize">
            {benefit.name || benefit.category}
          </span>
          {usagePercentage >= 80 && (
            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              Low Balance
            </span>
          )}
        </div>
        <div className="text-right">
          <span className="text-sm font-bold text-slate-900 dark:text-white">
            {formatCurrency(benefit.remaining)}
          </span>
          <span className="text-xs text-slate-500"> remaining</span>
        </div>
      </div>
      
      <div className="relative h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`absolute inset-y-0 left-0 ${getBarColor(usagePercentage)} rounded-full transition-all duration-500`}
          style={{ width: `${usagePercentage}%` }}
        />
      </div>
      
      <div className="flex justify-between mt-1 text-xs text-slate-500">
        <span>Used: {formatCurrency(benefit.used)}</span>
        <span>Limit: {formatCurrency(benefit.allowed)}</span>
      </div>
    </div>
  );
}

function QuickActionButton({ icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-800 hover:border-primary hover:shadow-lg transition-all group"
    >
      <span className="material-symbols-rounded text-2xl text-slate-400 group-hover:text-primary transition-colors">
        {icon}
      </span>
      <span className="text-sm font-medium text-slate-600 dark:text-slate-400 group-hover:text-primary">
        {label}
      </span>
    </button>
  );
}
