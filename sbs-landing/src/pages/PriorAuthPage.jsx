import { useState, useEffect } from 'react';
import { nphiesService } from '../services/nphiesService';
import { searchSBSCodes } from '../utils/middleware';
import { useToast } from '../components/Toast';
import { Button } from '../components/ui/Button';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { SectionHeader } from '../components/ui/SectionHeader';

/**
 * Premium Prior Authorization Page
 * Optimized for GIVC-SBS Ultra-Premium Design System
 */
export function PriorAuthPage() {
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
  const toast = useToast();

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

      toast.success(`Prior authorization ${result.authNumber} submitted`);
      setFormData(initialFormData);
      setActiveTab('pending');
    } catch (error) {
      toast.error('Submission failed');
    } finally {
      setSubmitting(false);
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
    <div className="flex-1 overflow-y-auto bg-grid scrollbar-hide">
      <main className="max-w-[1200px] mx-auto p-6 sm:p-8 space-y-8 stagger-children">
        <section className="animate-premium-in">
          <SectionHeader 
            title="Prior Authorization" 
            subtitle="Manage pre-approvals for specialized medical procedures via NPHIES routing."
            badge="CHI v3.1 Compliant"
          />

          {/* Tab Navigation */}
          <div className="flex flex-wrap gap-2 mt-8">
            {[
              { id: 'new', label: 'New Request', icon: 'add_circle' },
              { id: 'pending', label: 'Pending', icon: 'hourglass_empty', count: authorizations.filter(a => a.status === 'pending').length },
              { id: 'approved', label: 'Approved', icon: 'verified', count: authorizations.filter(a => a.status === 'approved').length },
              { id: 'denied', label: 'Denied', icon: 'report', count: authorizations.filter(a => a.status === 'denied').length },
              { id: 'all', label: 'Historical', icon: 'inventory_2' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl font-bold transition-all duration-300 ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 scale-[1.05]'
                    : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-white/50 border border-slate-200/50 dark:border-slate-700/50 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">{tab.icon}</span>
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

        <div className="min-h-[500px]">
          {activeTab === 'new' ? (
            <Card className="animate-premium-in">
              <CardHeader title="Create Authorization Request" subtitle="Fill in the clinical details carefully to ensure higher approval odds." />
              <CardBody className="space-y-8">
                {/* Patient Block */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2 text-primary">
                    <label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 ml-1">Patient Identity</label>
                    <div className="relative group">
                      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-blue-600">person</span>
                      <input 
                        type="text" 
                        value={formData.patientId}
                        onChange={(e) => setFormData({...formData, patientId: e.target.value})}
                        className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                        placeholder="Saudi ID / Iqama"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 ml-1">Full Legal Name</label>
                    <input 
                      type="text" 
                      value={formData.patientName}
                      onChange={(e) => setFormData({...formData, patientName: e.target.value})}
                      className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                      placeholder="e.g. Ahmad bin Khalid"
                    />
                  </div>
                </div>

                {/* Code Search Block */}
                <div className="space-y-2 relative">
                  <label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 ml-1">SBS Procedure Selection</label>
                  <div className="relative group">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-blue-600">search</span>
                    <input 
                      type="text" 
                      value={formData.sbsCode}
                      onChange={(e) => handleSbsSearch(e.target.value)}
                      onFocus={() => sbsSuggestions.length > 0 && setShowSuggestions(true)}
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                      placeholder="Search for procedure codes or keywords..."
                    />
                  </div>
                  
                  {showSuggestions && sbsSuggestions.length > 0 && (
                    <div className="absolute z-50 w-full mt-2 glass-panel border border-slate-200/50 dark:border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden max-h-72 overflow-y-auto stagger-children">
                      {sbsSuggestions.map((item, idx) => (
                        <div 
                          key={idx}
                          onClick={() => selectSbsCode(item)}
                          className="px-5 py-4 hover:bg-blue-600 hover:text-white cursor-pointer border-b border-slate-100 dark:border-slate-800 last:border-0 transition-colors group/item"
                        >
                          <div className="flex justify-between items-start gap-4">
                            <span className="font-mono text-sm font-bold bg-blue-600/10 text-blue-600 px-2 py-0.5 rounded group-hover/item:bg-white group-hover/item:text-blue-600">{item.code}</span>
                            <span className="text-xs font-bold uppercase tracking-widest text-slate-400 group-hover/item:text-white/60">{item.category}</span>
                          </div>
                          <p className="mt-1 text-sm font-medium leading-relaxed">{item.desc}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {formData.sbsDescription && (
                  <div className="p-4 rounded-2xl bg-blue-600/5 border border-blue-600/20 flex items-center gap-3">
                    <span className="material-symbols-outlined text-blue-600">info</span>
                    <p className="text-sm font-bold text-blue-600">Selected: {formData.sbsDescription}</p>
                  </div>
                )}

                {/* Amount and Urgency */}
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 ml-1">Estimated Cost (SAR)</label>
                    <input 
                      type="number" 
                      value={formData.estimatedAmount}
                      onChange={(e) => setFormData({...formData, estimatedAmount: e.target.value})}
                      className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-600/20 text-lg"
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 ml-1">Expected Date</label>
                    <input 
                      type="date" 
                      value={formData.expectedDate}
                      onChange={(e) => setFormData({...formData, expectedDate: e.target.value})}
                      className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 ml-1">Urgency Level</label>
                    <select 
                      value={formData.urgency}
                      onChange={(e) => setFormData({...formData, urgency: e.target.value})}
                      className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-600/20 appearance-none pointer-events-auto"
                    >
                      <option value="routine">Routine Care</option>
                      <option value="urgent">Urgent Case</option>
                      <option value="emergency">Life and Limb (Emergency)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 ml-1">Clinical Justification</label>
                  <textarea 
                    value={formData.clinicalNotes}
                    onChange={(e) => setFormData({...formData, clinicalNotes: e.target.value})}
                    rows={4}
                    className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                    placeholder="Enter medical necessity details here..."
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200/50 dark:border-slate-800/50">
                   <Button
                     variant="secondary"
                     onClick={() => {
                       setFormData(initialFormData);
                       setShowSuggestions(false);
                       setSbsSuggestions([]);
                     }}
                   >
                     Reset
                   </Button>
                   <Button icon="send" loading={submitting} onClick={handleSubmit} className="px-10">Submit Request</Button>
                </div>
              </CardBody>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredAuthorizations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 animate-premium-in">
                   <div className="size-20 rounded-[28px] bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center text-slate-300 dark:text-slate-600 mb-4">
                      <span className="material-symbols-outlined text-5xl">folder_off</span>
                   </div>
                   <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">No records in this queue</p>
                </div>
              ) : (
                filteredAuthorizations.map((auth, i) => (
                  <AuthListItem key={auth.id} auth={auth} delay={i * 50} />
                ))
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function AuthListItem({ auth, delay }) {
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
            <span className="material-symbols-outlined text-3xl font-bold">{config.icon}</span>
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
           <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Procedure Details</p>
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
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Requested {auth.requestedDate}</p>
           </div>
           <button className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-blue-600 hover:bg-blue-600/10 transition-all">
              <span className="material-symbols-outlined">chevron_right</span>
           </button>
        </div>
      </div>
    </div>
  );
}
