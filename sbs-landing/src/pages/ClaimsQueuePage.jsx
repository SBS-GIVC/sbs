import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { i18n } from '../utils/i18n';
import { useToast } from '../components/Toast';
import { Button } from '../components/ui/Button';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { SectionHeader } from '../components/ui/SectionHeader';

const API_BASE_URL =
  (typeof window !== 'undefined' && typeof window.SBS_API_URL === 'string' && window.SBS_API_URL.trim())
    ? window.SBS_API_URL.replace(/\/+$/, '')
    : '';

/**
 * Premium Claims Queue Page
 * Optimized for GIVC-SBS Ultra-Premium Design System
 */
export function ClaimsQueuePage({ lang = 'en' }) {
  const copy = i18n[lang] || i18n.en;
  const t = copy.pages?.claimsQueue || i18n.en.pages.claimsQueue;
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [busyById, setBusyById] = useState({});
  const toast = useToast();

  const bucketFrom = useCallback((status, progressPercentage) => {
    const s = String(status || 'processing').toLowerCase();
    if (['failed', 'rejected'].includes(s)) return 'rejected';
    if (['approved', 'completed', 'submitted'].includes(s)) return 'relayed';
    const pct = Number(progressPercentage || 0);
    if (s === 'processing' && pct <= 25) return 'pending';
    return 'processing';
  }, []);

  const mapClaim = useCallback((c) => {
    const progress = c.progress || {};
    const progressPercentage = Number(progress.percentage || 0);
    const status = String(c.status || 'processing').toLowerCase();
    const aiRiskScore = Number.isFinite(Number(c.aiRiskScore)) ? Number(c.aiRiskScore) : null;
    const priority =
      ['failed', 'rejected'].includes(status) || (aiRiskScore !== null && aiRiskScore >= 80)
        ? 'urgent'
        : (aiRiskScore !== null && aiRiskScore >= 60 ? 'elevated' : 'normal');

    return {
      id: c.claimId,
      patient: c.patientName || c.patientId || 'Unknown Patient',
      patientId: c.patientId || null,
      facility: c.facilityId || 'Main Hub',
      type: c.claimType
        ? `${String(c.claimType).slice(0, 1).toUpperCase()}${String(c.claimType).slice(1)}`
        : 'Institutional',
      submittedAt: c.createdAt,
      lastUpdate: c.lastUpdate,
      status,
      bucket: bucketFrom(status, progressPercentage),
      progressPercentage,
      currentStage: progress.currentStage || null,
      itemsCount: Number(c.itemsCount || 0),
      amount: Math.max(0, Number(c.totalAmount || 0)),
      aiRiskScore,
      routeUsed: c.routeUsed || null,
      trackingUrl: c.trackingUrl || null,
      priority
    };
  }, [bucketFrom]);

  const loadClaims = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/claims?limit=50&page=1`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      const mapped = (data.claims || []).map(mapClaim);
      setClaims(mapped);
      setLoadError(null);
    } catch (e) {
      setClaims([]);
      setLoadError(e?.message || 'Failed to resolve claims repository');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [mapClaim]);

  useEffect(() => {
    loadClaims();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => loadClaims({ silent: true }), 15000);
    return () => clearInterval(id);
  }, [autoRefresh, loadClaims]);

  const handleAction = (action) => {
    toast.info(`${action} ${lang === 'ar' ? 'قيد التهيئة' : 'engine is initializing.'}`);
  };

  const statusCounts = useMemo(() => {
    return {
      all: claims.length,
      pending: claims.filter((c) => c.bucket === 'pending').length,
      processing: claims.filter((c) => c.bucket === 'processing').length,
      relayed: claims.filter((c) => c.bucket === 'relayed').length,
      rejected: claims.filter((c) => c.bucket === 'rejected').length
    };
  }, [claims]);

  const filteredClaims = claims.filter(claim => {
    const matchesFilter = filter === 'all' || claim.bucket === filter;

    const matchesSearch = searchQuery === '' ||
      claim.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      claim.patient.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(claim.facility).toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(claim.patientId || '').toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-SA', { 
      style: 'currency', 
      currency: 'SAR',
      minimumFractionDigits: 0 
    }).format(amount);
  };

  const refreshClaim = async (claimId) => {
    const cid = String(claimId || '');
    if (!cid) return;
    setBusyById((prev) => ({ ...prev, [cid]: true }));
    try {
      const res = await fetch(`${API_BASE_URL}/api/claim-status/${encodeURIComponent(cid)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) {
        throw new Error(data.error || data.message || `HTTP ${res.status}`);
      }
      setClaims((prev) => prev.map((c) => {
        if (c.id !== cid) return c;
        const progressPercentage = Number(data.progress?.percentage || c.progressPercentage || 0);
        const status = String(data.status || c.status || 'processing').toLowerCase();
        return {
          ...c,
          status,
          progressPercentage,
          currentStage: data.progress?.currentStage || c.currentStage,
          lastUpdate: data.timestamps?.lastUpdate || c.lastUpdate,
          trackingUrl: data.trackingUrl || c.trackingUrl,
          bucket: bucketFrom(status, progressPercentage)
        };
      }));
      toast.success(t.toast.statusRefreshed);
    } catch (e) {
      toast.error(e?.message || t.toast.statusRefreshFailed);
    } finally {
      setBusyById((prev) => ({ ...prev, [cid]: false }));
    }
  };

  const retryClaim = async (claimId) => {
    const cid = String(claimId || '');
    if (!cid) return;
    setBusyById((prev) => ({ ...prev, [cid]: true }));
    try {
      const res = await fetch(`${API_BASE_URL}/api/claims/${encodeURIComponent(cid)}/retry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) {
        throw new Error(data.error || data.message || `HTTP ${res.status}`);
      }
      toast.success(t.toast.retryInitiated);
      await refreshClaim(cid);
    } catch (e) {
      toast.error(e?.message || t.toast.retryFailed);
    } finally {
      setBusyById((prev) => ({ ...prev, [cid]: false }));
    }
  };

  const openTracking = (claim) => {
    const url = claim?.trackingUrl || `/tracking.html?claimId=${encodeURIComponent(claim?.id || '')}`;
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const openReceipt = (claimId) => {
    const cid = String(claimId || '');
    if (!cid) return;
    window.open(`${API_BASE_URL}/api/claim-receipt/${encodeURIComponent(cid)}`, '_blank', 'noopener,noreferrer');
  };

  const copyClaimId = async (claimId) => {
    const cid = String(claimId || '');
    if (!cid) return;
    try {
      await navigator.clipboard.writeText(cid);
      toast.success(t.toast.claimIdCopied);
    } catch {
      toast.error(t.toast.copyFailed);
    }
  };

  return (
    <div className="flex-1">
      <main className="max-w-[1400px] mx-auto p-6 sm:p-8 space-y-8 stagger-children">
        
        {/* Top Operational Section */}
        <section className="animate-premium-in">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
             <SectionHeader 
               title={t.header.title} 
               subtitle={t.header.subtitle}
               badge={t.header.badge}
             />
	             <div className="flex items-center gap-3">
	                <Button
	                  variant="secondary"
	                  icon={autoRefresh ? 'pause_circle' : 'play_circle'}
	                  onClick={() => setAutoRefresh((v) => !v)}
	                  data-testid="claimsqueue-autorefresh"
	                >
	                  {autoRefresh ? t.actions.autoRefreshOn : t.actions.autoRefreshOff}
	                </Button>
	                <Button
	                  variant="secondary"
	                  icon="refresh"
	                  loading={loading}
	                  onClick={() => loadClaims()}
	                  data-testid="claimsqueue-refresh"
	                >
	                  {t.actions.refresh}
	                </Button>
	                <Button icon="add_card" onClick={() => window.dispatchEvent(new CustomEvent('sbs:navigate', { detail: { view: 'claim-builder' } }))}>
                    {t.actions.create}
                  </Button>
	             </div>
	          </div>

	          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mt-8">
	            <FilterCard label={t.filters.all} count={statusCounts.all} active={filter === 'all'} onClick={() => setFilter('all')} icon="inventory_2" color="blue" />
	            <FilterCard label={t.filters.pending} count={statusCounts.pending} active={filter === 'pending'} onClick={() => setFilter('pending')} icon="pending" color="amber" />
	            <FilterCard label={t.filters.processing} count={statusCounts.processing} active={filter === 'processing'} onClick={() => setFilter('processing')} icon="sync" color="indigo" />
	            <FilterCard label={t.filters.relayed} count={statusCounts.relayed} active={filter === 'relayed'} onClick={() => setFilter('relayed')} icon="verified" color="emerald" />
	            <FilterCard label={t.filters.rejected} count={statusCounts.rejected} active={filter === 'rejected'} onClick={() => setFilter('rejected')} icon="report" color="rose" />
	          </div>
	        </section>

        {/* Search & Actions */}
        <Card className="animate-premium-in" style={{ animationDelay: '100ms' }}>
           <CardBody className="flex flex-col sm:flex-row gap-4 items-end">
	              <div className="flex-1">
	                 <Input 
	                   label={t.search.label}
	                   icon="search" 
	                   placeholder={t.search.placeholder}
	                   data-testid="claimsqueue-search"
	                   value={searchQuery}
	                   onChange={(e) => setSearchQuery(e.target.value)}
	                 />
	              </div>
	              <div className="flex gap-2">
	                 <Button variant="secondary" icon="filter_list" onClick={() => toast.info(t.actions.advanced)}>
                   {t.actions.advanced}
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
                     toast.success(t.toast.exportOk);
                   }}
                 >
                   {t.actions.export}
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
                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{copy.common.loading}</p>
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
	                    <ClaimRow
	                      key={claim.id}
	                      claim={claim}
	                      formatCurrency={formatCurrency}
	                      busy={!!busyById[claim.id]}
	                      onRefresh={() => refreshClaim(claim.id)}
	                      onRetry={() => retryClaim(claim.id)}
	                      onOpenTracking={() => openTracking(claim)}
	                      onOpenReceipt={() => openReceipt(claim.id)}
	                      onCopyId={() => copyClaimId(claim.id)}
	                    />
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
      type="button"
      onClick={onClick}
      className={`p-5 rounded-[24px] border-2 text-left transition-all duration-300 group ${
        active 
          ? `${themes[color]} shadow-xl shadow-slate-900/5 scale-[1.02]`
          : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/50 hover:border-slate-200 dark:hover:border-slate-700'
      } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900`}
    >
      <div className="flex justify-between items-start mb-4">
         <span aria-hidden="true" className={`material-symbols-outlined text-xl transition-transform group-hover:scale-110 ${active ? themes[color].split(' ')[0] : 'text-slate-400'}`}>{icon}</span>
         <span className={`text-2xl font-black ${active ? themes[color].split(' ')[0] : 'text-slate-900 dark:text-white'}`}>{count}</span>
      </div>
      <p className={`text-[10px] font-black uppercase tracking-widest ${active ? themes[color].split(' ')[0] : 'text-slate-400'}`}>{label}</p>
    </button>
  );
}

function ClaimRow({
  claim,
  formatCurrency,
  busy = false,
  onRefresh,
  onRetry,
  onOpenTracking,
  onOpenReceipt,
  onCopyId
}) {
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
  const riskTheme =
    claim.aiRiskScore === null
      ? null
      : (claim.aiRiskScore >= 80
        ? { label: 'High Risk', cls: 'bg-rose-500/10 text-rose-600 border-rose-500/20' }
        : (claim.aiRiskScore >= 60
          ? { label: 'Review', cls: 'bg-amber-500/10 text-amber-700 border-amber-500/20' }
          : { label: 'Low Risk', cls: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20' }));

  return (
    <tr data-testid={`claimsqueue-row-${claim.id}`} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all duration-300">
      <td className="px-6 py-5">
        <div className="flex items-center gap-3">
          <div className={`size-2 rounded-full ${claim.priority === 'urgent' ? 'bg-rose-500 animate-pulse' : 'bg-slate-200 dark:bg-slate-700'}`}></div>
          <div className="flex flex-col">
            <span data-testid={`claimsqueue-claimid-${claim.id}`} className="font-mono text-sm font-black text-blue-600 bg-blue-600/5 px-2 py-0.5 rounded tracking-tight w-fit">{claim.id}</span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                {Number.isFinite(Number(claim.progressPercentage)) ? `${Math.round(Number(claim.progressPercentage))}%` : '--'}
              </span>
              {claim.currentStage && (
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  {String(claim.currentStage).replace(/([A-Z])/g, ' $1').trim()}
                </span>
              )}
              {!!claim.itemsCount && (
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  items:{claim.itemsCount}
                </span>
              )}
            </div>
          </div>
        </div>
      </td>
      <td className="px-6 py-5">
        <div className="flex flex-col">
           <span className="text-sm font-bold text-slate-800 dark:text-gray-100">{claim.patient}</span>
           <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{claim.type} Case</span>
           {claim.patientId && (
             <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{claim.patientId}</span>
           )}
        </div>
      </td>
      <td className="px-6 py-5">
        <div className="flex flex-col">
          <span className="text-xs font-bold text-slate-500">{claim.facility}</span>
          {claim.routeUsed && (
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">route:{claim.routeUsed}</span>
          )}
        </div>
      </td>
      <td className="px-6 py-5 text-right">
        <div className="flex flex-col items-end gap-1">
          <span data-testid={`claimsqueue-amount-${claim.id}`} className="text-sm font-black text-slate-900 dark:text-white tracking-tight">{formatCurrency(claim.amount)}</span>
          {riskTheme && (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-widest ${riskTheme.cls}`} title="AI pre-submit risk (server-side)">
              {riskTheme.label} {claim.aiRiskScore}
            </span>
          )}
        </div>
      </td>
      <td className="px-6 py-5">
        <span className={`inline-flex items-center px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border border-current opacity-90 ${currentStatus.color}`}>
          {currentStatus.label}
        </span>
      </td>
      <td className="px-6 py-5 text-right">
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            data-testid={`claimsqueue-copy-${claim.id}`}
            className="size-9 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900"
            title="Copy Claim ID"
            aria-label="Copy claim ID"
            disabled={busy}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onCopyId?.();
            }}
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[20px]">content_copy</span>
          </button>
          <button
            type="button"
            data-testid={`claimsqueue-receipt-${claim.id}`}
            className="size-9 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-300 hover:text-indigo-600 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900"
            title="Open Receipt JSON"
            aria-label="Open receipt JSON"
            disabled={busy}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onOpenReceipt?.();
            }}
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[20px]">receipt_long</span>
          </button>
          <button
            type="button"
            data-testid={`claimsqueue-track-${claim.id}`}
            className="size-9 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-300 hover:text-emerald-600 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900"
            title="Open Tracking"
            aria-label="Open tracking"
            disabled={busy}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onOpenTracking?.();
            }}
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[20px]">travel_explore</span>
          </button>
          <button
            type="button"
            data-testid={`claimsqueue-refresh-${claim.id}`}
            className="size-9 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-300 hover:text-blue-600 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900"
            title="Refresh Status"
            aria-label="Refresh status"
            disabled={busy}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onRefresh?.();
            }}
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[20px]">sync</span>
          </button>
          <button
            type="button"
            data-testid={`claimsqueue-retry-${claim.id}`}
            className={`size-9 rounded-xl transition-all ${
              ['failed', 'rejected'].includes(String(claim.status || '').toLowerCase())
                ? 'hover:bg-rose-500/10 text-slate-300 hover:text-rose-600'
                : 'opacity-40 cursor-not-allowed text-slate-300'
            } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900`}
            title="Retry Failed Claim"
            aria-label="Retry failed claim"
            disabled={busy || !['failed', 'rejected'].includes(String(claim.status || '').toLowerCase())}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onRetry?.();
            }}
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[20px]">refresh</span>
          </button>
        </div>
      </td>
    </tr>
  );
}
