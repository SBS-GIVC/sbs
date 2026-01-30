import { useState, useEffect } from 'react';
import { nphiesService } from '../services/nphiesService';
import { searchSBSCodes } from '../utils/middleware';
import { useToast } from '../components/Toast';

/**
 * Prior Authorization Workflow Page
 * Submit and track prior authorization requests for high-value procedures
 */
export function PriorAuthPage() {
  const [activeTab, setActiveTab] = useState('new');
  const [formData, setFormData] = useState({
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
  });
  const [sbsSuggestions, setSbsSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [authorizations, setAuthorizations] = useState([]);
  const toast = useToast();

  // Load existing authorizations
  useEffect(() => {
    // Mock data for demonstration
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

  // Search SBS codes
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
    e.preventDefault();
    
    if (!formData.patientId || !formData.sbsCode || !formData.estimatedAmount) {
      toast.warning('Please fill in all required fields');
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
        expectedDate: formData.expectedDate
      });

      // Add to list
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

      toast.success(`Prior authorization ${result.authNumber} submitted successfully!`);
      
      // Reset form
      setFormData({
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
      });
      
      setActiveTab('pending');
    } catch (error) {
      toast.error('Failed to submit prior authorization');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
      pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      denied: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      expired: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
    };
    
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${styles[status] || styles.pending}`}>
        {status}
      </span>
    );
  };

  const filteredAuthorizations = authorizations.filter(auth => {
    if (activeTab === 'new') return false;
    if (activeTab === 'pending') return auth.status === 'pending';
    if (activeTab === 'approved') return auth.status === 'approved';
    if (activeTab === 'denied') return auth.status === 'denied';
    return true;
  });

  return (
    <div className="flex-1 overflow-y-auto bg-background-light dark:bg-background-dark">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-700 px-8 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <span className="material-symbols-rounded text-3xl text-white">approval</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Prior Authorization</h1>
              <p className="text-violet-100">Request and track pre-approval for high-value procedures</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2">
            {[
              { id: 'new', label: 'New Request', icon: 'add_circle' },
              { id: 'pending', label: 'Pending', icon: 'pending', count: authorizations.filter(a => a.status === 'pending').length },
              { id: 'approved', label: 'Approved', icon: 'check_circle', count: authorizations.filter(a => a.status === 'approved').length },
              { id: 'denied', label: 'Denied', icon: 'cancel', count: authorizations.filter(a => a.status === 'denied').length },
              { id: 'all', label: 'All', icon: 'list' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-white text-violet-600'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                <span className="material-symbols-rounded text-xl">{tab.icon}</span>
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${
                    activeTab === tab.id ? 'bg-violet-100 text-violet-600' : 'bg-white/20'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-8">
        {/* New Request Form */}
        {activeTab === 'new' && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Patient Information</h3>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Patient ID / National ID *
                  </label>
                  <input
                    type="text"
                    value={formData.patientId}
                    onChange={(e) => setFormData(prev => ({ ...prev, patientId: e.target.value }))}
                    placeholder="Enter patient ID..."
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Patient Name
                  </label>
                  <input
                    type="text"
                    value={formData.patientName}
                    onChange={(e) => setFormData(prev => ({ ...prev, patientName: e.target.value }))}
                    placeholder="Enter patient name..."
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Procedure Details</h3>
              </div>
              <div className="p-6 space-y-6">
                <div className="relative">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    SBS Procedure Code *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.sbsCode}
                      onChange={(e) => handleSbsSearch(e.target.value)}
                      onFocus={() => sbsSuggestions.length > 0 && setShowSuggestions(true)}
                      placeholder="Search by code or description..."
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                      required
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 material-symbols-rounded text-slate-400">
                      search
                    </span>
                  </div>
                  
                  {/* SBS Code Suggestions */}
                  {showSuggestions && sbsSuggestions.length > 0 && (
                    <div className="absolute z-10 w-full mt-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl max-h-64 overflow-y-auto">
                      {sbsSuggestions.map((item, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => selectSbsCode(item)}
                          className="w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3 border-b border-slate-100 dark:border-slate-700 last:border-0"
                        >
                          <span className="font-mono text-sm text-primary">{item.code}</span>
                          <span className="text-sm text-slate-600 dark:text-slate-400 flex-1 truncate">{item.desc}</span>
                          <span className="text-xs text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
                            {item.category}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {formData.sbsDescription && (
                  <div className="p-4 rounded-xl bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800">
                    <p className="text-sm text-violet-600 dark:text-violet-400">
                      <strong>Selected:</strong> {formData.sbsDescription}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Primary Diagnosis (ICD-10)
                    </label>
                    <input
                      type="text"
                      value={formData.diagnosis}
                      onChange={(e) => setFormData(prev => ({ ...prev, diagnosis: e.target.value }))}
                      placeholder="e.g., M17.11"
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Estimated Amount (SAR) *
                    </label>
                    <input
                      type="number"
                      value={formData.estimatedAmount}
                      onChange={(e) => setFormData(prev => ({ ...prev, estimatedAmount: e.target.value }))}
                      placeholder="0.00"
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Expected Procedure Date
                    </label>
                    <input
                      type="date"
                      value={formData.expectedDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, expectedDate: e.target.value }))}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Urgency
                    </label>
                    <select
                      value={formData.urgency}
                      onChange={(e) => setFormData(prev => ({ ...prev, urgency: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="routine">Routine</option>
                      <option value="urgent">Urgent</option>
                      <option value="emergency">Emergency</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Clinical Justification / Notes
                  </label>
                  <textarea
                    value={formData.clinicalNotes}
                    onChange={(e) => setFormData(prev => ({ ...prev, clinicalNotes: e.target.value }))}
                    placeholder="Provide clinical justification for the procedure..."
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={() => setFormData({
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
                })}
                className="px-6 py-3 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Clear Form
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-8 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold hover:from-violet-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <span className="material-symbols-rounded animate-spin">progress_activity</span>
                    Submitting...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-rounded">send</span>
                    Submit Authorization
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Authorizations List */}
        {activeTab !== 'new' && (
          <div className="space-y-4">
            {filteredAuthorizations.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-slate-800">
                <span className="material-symbols-rounded text-5xl text-slate-300 mb-4">
                  folder_open
                </span>
                <p className="text-slate-500">No authorizations found in this category</p>
              </div>
            ) : (
              filteredAuthorizations.map(auth => (
                <div
                  key={auth.id}
                  className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-slate-800 p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        auth.status === 'approved' ? 'bg-emerald-100 dark:bg-emerald-900/30' :
                        auth.status === 'pending' ? 'bg-amber-100 dark:bg-amber-900/30' :
                        'bg-red-100 dark:bg-red-900/30'
                      }`}>
                        <span className={`material-symbols-rounded text-2xl ${
                          auth.status === 'approved' ? 'text-emerald-600' :
                          auth.status === 'pending' ? 'text-amber-600' :
                          'text-red-600'
                        }`}>
                          {auth.status === 'approved' ? 'check_circle' :
                           auth.status === 'pending' ? 'pending' : 'cancel'}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-3">
                          <h4 className="font-bold text-slate-900 dark:text-white">{auth.id}</h4>
                          {getStatusBadge(auth.status)}
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                          {auth.patientName} • {auth.patientId}
                        </p>
                        <div className="mt-2 flex items-center gap-4 text-sm">
                          <span className="font-mono text-primary">{auth.sbsCode}</span>
                          <span className="text-slate-500">{auth.description}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      {auth.approvedAmount && (
                        <p className="text-lg font-bold text-emerald-600">
                          {new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR', minimumFractionDigits: 0 }).format(auth.approvedAmount)}
                        </p>
                      )}
                      <p className="text-xs text-slate-500 mt-1">
                        Requested: {auth.requestedDate}
                      </p>
                      {auth.expiryDate && (
                        <p className="text-xs text-amber-600">
                          Expires: {auth.expiryDate}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {auth.denialReason && (
                    <div className="mt-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                      <p className="text-sm text-red-600 dark:text-red-400">
                        <strong>Denial Reason:</strong> {auth.denialReason}
                      </p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
