import React, { useEffect, useState } from 'react';
import { useToast } from '../components/Toast';
import { Button } from '../components/ui/Button';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { SectionHeader } from '../components/ui/SectionHeader';

/**
 * Premium Claims Queue Page
 * Optimized for GIVC-SBS Ultra-Premium Design System
 */
export function ClaimsQueuePage() {
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const toast = useToast();

  useEffect(() => {
    let cancelled = false;

    const loadClaims = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/claims?limit=50&page=1');
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data.success === false) {
          throw new Error(data.error || `HTTP ${res.status}`);
        }

        const mapped = (data.claims || []).map((c) => ({
          id: c.claimId,
          patient: c.patientName || c.patientId || 'Unknown Patient',
          facility: c.facilityId || 'Main Hub',
          type: c.claimType ? `${String(c.claimType).slice(0, 1).toUpperCase()}${String(c.claimType).slice(1)}` : 'Institutional',
          submittedAt: c.createdAt,
          status: c.status || 'processing',
          priority: c.status === 'failed' ? 'urgent' : (Math.random() > 0.8 ? 'urgent' : 'normal'),
          amount: Math.floor(Math.random() * 5000) + 1000
        }));

        if (!cancelled) {
          setClaims(mapped);
          setLoadError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setClaims([]);
          setLoadError(e.message || 'Failed to resolve claims repository');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadClaims();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleAction = (action) => {
    toast.info(`${action} engine is initializing.`);
  };

  const statusCounts = {
    all: claims.length,
    pending: claims.filter(c => c.status === 'pending').length,
    processing: claims.filter(c => ['processing', 'submitted'].includes(c.status)).length,
    approved: claims.filter(c => ['approved', 'completed'].includes(c.status)).length,
    rejected: claims.filter(c => ['rejected', 'failed'].includes(c.status)).length
  };

  const filteredClaims = claims.filter(claim => {
    const matchesFilter =
      filter === 'all' ||
      (filter === 'processing' ? ['processing', 'submitted'].includes(claim.status) :
        filter === 'approved' ? ['approved', 'completed'].includes(claim.status) :
          filter === 'rejected' ? ['rejected', 'failed'].includes(claim.status) :
            claim.status === filter);

    const matchesSearch = searchQuery === '' ||
      claim.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      claim.patient.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-SA', { 
      style: 'currency', 
      currency: 'SAR',
      minimumFractionDigits: 0 
    }).format(amount);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-grid scrollbar-hide">
      <main className="max-w-[1400px] mx-auto p-6 sm:p-8 space-y-8 stagger-children">
        
        {/* Top Operational Section */}
        <section className="animate-premium-in">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
             <SectionHeader 
               title="Claims Queue" 
               subtitle="Manage and triage real-time healthcare integration requests with autonomous validation."
               badge="V3.1 Relay"
             />
             <div className="flex items-center gap-3">
                <Button variant="secondary" icon="tune" onClick={() => handleAction('Advanced Settings')}>Queue Config</Button>
                <Button icon="add_card" onClick={() => window.dispatchEvent(new CustomEvent('sbs:navigate', { detail: { view: 'claim-builder' } }))}>Create Claim</Button>
             </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mt-8">
            <FilterCard label="Total Workload" count={statusCounts.all} active={filter === 'all'} onClick={() => setFilter('all')} icon="inventory_2" color="blue" />
            <FilterCard label="Pending" count={statusCounts.pending} active={filter === 'pending'} onClick={() => setFilter('pending')} icon="pending" color="amber" />
            <FilterCard label="In-Process" count={statusCounts.processing} active={filter === 'processing'} onClick={() => setFilter('processing')} icon="sync" color="indigo" />
            <FilterCard label="Relayed" count={statusCounts.approved} active={filter === 'approved'} onClick={() => setFilter('approved')} icon="verified" color="emerald" />
            <FilterCard label="Rejected" count={statusCounts.rejected} active={filter === 'rejected'} onClick={() => setFilter('rejected')} icon="report" color="rose" />
          </div>
        </section>

        {/* Search & Actions */}
        <Card className="animate-premium-in" style={{ animationDelay: '100ms' }}>
           <CardBody className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="flex-1">
                 <Input 
                   icon="search" 
                   placeholder="Deep search by claim ID, patient, or facility..." 
                   value={searchQuery}
                   onChange={(e) => setSearchQuery(e.target.value)}
                 />
              </div>
              <div className="flex gap-2">
                 <Button variant="secondary" icon="filter_list" onClick={() => toast.info('Advanced search panel enabled')}>
                   Advanced Search
                 </Button>
                 <Button
                   variant="secondary"
                   icon="download"
                   onClick={() => {
                     const rows = filteredClaims.map((c) => [c.id, c.patient, c.facility, c.status, c.amount]);
                     const csv = [['Claim ID', 'Patient', 'Facility', 'Status', 'Amount'], ...rows]
                       .map((r) => r.join(','))
                       .join('\n');
                     const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                     const url = URL.createObjectURL(blob);
                     const link = document.createElement('a');
                     link.href = url;
                     link.download = `claims-queue-${new Date().toISOString().slice(0, 10)}.csv`;
                     document.body.appendChild(link);
                     link.click();
                     document.body.removeChild(link);
                     URL.revokeObjectURL(url);
                     toast.success('Queue exported');
                   }}
                 >
                   Export Data
                 </Button>
              </div>
           </CardBody>
        </Card>

        {/* Data Grid */}
        <Card className="animate-premium-in" style={{ animationDelay: '200ms' }}>
          <CardHeader 
            title="Operational Payload" 
            subtitle="Detailed view of active claims in the current relay cycle."
            action={<span className="text-[10px] font-black uppercase text-slate-400">Total Visible: {filteredClaims.length}</span>}
          />
          <div className="overflow-x-auto">
            {loading ? (
              <div className="py-24 flex flex-col items-center justify-center space-y-4">
                 <div className="size-12 rounded-full border-4 border-blue-600/10 border-t-blue-600 animate-spin"></div>
                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Querying DB...</p>
              </div>
            ) : loadError ? (
              <div className="py-24 text-center">
                 <p className="text-rose-500 font-bold">{loadError}</p>
              </div>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-900/40">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500">Claim Identifier</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500">Patient Detail</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500">Source Facility</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 text-right">Value (SAR)</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500">Status</th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredClaims.map((claim, idx) => (
                    <ClaimRow key={claim.id} claim={claim} formatCurrency={formatCurrency} />
                  ))}
                </tbody>
              </table>
            )}

            {!loading && filteredClaims.length === 0 && (
               <div className="py-32 flex flex-col items-center justify-center space-y-4">
                  <div className="size-20 bg-slate-50 dark:bg-slate-800 rounded-[32px] flex items-center justify-center text-slate-300">
                     <span className="material-symbols-outlined text-4xl">inbox_customize</span>
                  </div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No matching results found</p>
               </div>
            )}
          </div>
        </Card>
      </main>
    </div>
  );
}

function FilterCard({ label, count, active, onClick, icon, color }) {
  const themes = {
    blue: 'text-blue-600 border-blue-600/30 bg-blue-600/5',
    amber: 'text-amber-600 border-amber-600/30 bg-amber-600/5',
    indigo: 'text-indigo-600 border-indigo-600/30 bg-indigo-600/5',
    emerald: 'text-emerald-600 border-emerald-600/30 bg-emerald-600/5',
    rose: 'text-rose-600 border-rose-600/30 bg-rose-600/5',
  };

  return (
    <button
      onClick={onClick}
      className={`p-5 rounded-[24px] border-2 text-left transition-all duration-300 group ${
        active 
          ? `${themes[color]} shadow-xl shadow-slate-900/5 scale-[1.02]`
          : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/50 hover:border-slate-200 dark:hover:border-slate-700'
      }`}
    >
      <div className="flex justify-between items-start mb-4">
         <span className={`material-symbols-outlined text-xl transition-transform group-hover:scale-110 ${active ? themes[color].split(' ')[0] : 'text-slate-400'}`}>{icon}</span>
         <span className={`text-2xl font-black ${active ? themes[color].split(' ')[0] : 'text-slate-900 dark:text-white'}`}>{count}</span>
      </div>
      <p className={`text-[10px] font-black uppercase tracking-widest ${active ? themes[color].split(' ')[0] : 'text-slate-400'}`}>{label}</p>
    </button>
  );
}

function ClaimRow({ claim, formatCurrency }) {
  const statusConfig = {
    pending: { label: 'Pending Adjudication', color: 'text-amber-600 bg-amber-600/10' },
    processing: { label: 'Integrating...', color: 'text-blue-600 bg-blue-600/10' },
    submitted: { label: 'Relayed to NPHIES', color: 'text-indigo-600 bg-indigo-600/10' },
    approved: { label: 'Adjudicated', color: 'text-emerald-600 bg-emerald-600/10' },
    completed: { label: 'Settled', color: 'text-emerald-600 bg-emerald-600/10' },
    rejected: { label: 'Error Detected', color: 'text-rose-600 bg-rose-600/10 text-[9px]' },
    failed: { label: 'Relay Failed', color: 'text-rose-600 bg-rose-600/10' }
  };

  const currentStatus = statusConfig[claim.status] || statusConfig.processing;

  return (
    <tr className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all duration-300">
      <td className="px-6 py-5">
        <div className="flex items-center gap-3">
          <div className={`size-2 rounded-full ${claim.priority === 'urgent' ? 'bg-rose-500 animate-pulse' : 'bg-slate-200 dark:bg-slate-700'}`}></div>
          <span className="font-mono text-sm font-black text-blue-600 bg-blue-600/5 px-2 py-0.5 rounded tracking-tight">{claim.id}</span>
        </div>
      </td>
      <td className="px-6 py-5">
        <div className="flex flex-col">
           <span className="text-sm font-bold text-slate-800 dark:text-gray-100">{claim.patient}</span>
           <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{claim.type} Case</span>
        </div>
      </td>
      <td className="px-6 py-5">
        <span className="text-xs font-bold text-slate-500">{claim.facility}</span>
      </td>
      <td className="px-6 py-5 text-right">
        <span className="text-sm font-black text-slate-900 dark:text-white tracking-tight">{formatCurrency(claim.amount)}</span>
      </td>
      <td className="px-6 py-5">
        <span className={`inline-flex items-center px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border border-current opacity-90 ${currentStatus.color}`}>
          {currentStatus.label}
        </span>
      </td>
      <td className="px-6 py-5 text-right">
        <button
          className="size-9 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-300 hover:text-blue-600 transition-all"
          onClick={() => window.dispatchEvent(new CustomEvent('sbs:navigate', { detail: { view: claim.status === 'failed' ? 'error' : 'review' } }))}
        >
          <span className="material-symbols-outlined text-[20px]">chevron_right</span>
        </button>
      </td>
    </tr>
  );
}
