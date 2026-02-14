import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { SectionHeader } from '../components/ui/SectionHeader';
import { Button } from '../components/ui/Button';
import { APIService } from '../services/apiService';
import { useToast } from '../components/Toast';
import { i18n } from '../utils/i18n';

/**
 * Premium Mappings Analytics Page (Live)
 * Uses same-origin mapping telemetry APIs for a CSP-friendly, production-safe dashboard.
 */
export function MappingsPage({ lang = 'en' }) {
  const toast = useToast();
  const copy = i18n[lang] || i18n.en;
  const t = copy.pages?.mappings || i18n.en.pages.mappings;
  const [loading, setLoading] = useState(true);
  const [telemetry, setTelemetry] = useState(null);
  const [error, setError] = useState(null);
  const [refreshNonce, setRefreshNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const fetchTelemetry = async () => {
      try {
        const data = await APIService.getMappingsTelemetry(30);
        if (cancelled) return;
        if (!data?.success) throw new Error(data?.error || 'Failed to load telemetry');
        setTelemetry(data);
        setError(null);
      } catch (e) {
        if (cancelled) return;
        setError(e?.message || 'Failed to load telemetry');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 20000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [refreshNonce]);

  useEffect(() => {
    if (!error) return;
    toast.warning(error);
  }, [error]);

  const stats = useMemo(() => {
    const totals = telemetry?.totals || {};
    const kpis = telemetry?.kpis || {};
    return {
      events: Number(totals.events || 0),
      uniqueInternalCodes: Number(totals.uniqueInternalCodes || 0),
      overrides: Number(totals.overrides || 0),
      autoPct: Number(kpis.autoAccepted?.pct || 0),
      reviewPct: Number(kpis.reviewRequired?.pct || 0),
      rejectedPct: Number(kpis.rejected?.pct || 0),
      noMatchPct: Number(kpis.noMatch?.pct || 0),
      avgConfidence: Number(kpis.avgConfidence || 0),
      avgLatencyMs: Number(kpis.avgLatencyMs || 0),
      p95LatencyMs: Number(kpis.p95LatencyMs || 0),
      overrideHits: Number(kpis.overrideHits?.count || 0),
      noMatch: Number(kpis.noMatch?.count || 0),
      rejected: Number(kpis.rejected?.count || 0),
      facilities: Array.isArray(telemetry?.facilities) ? telemetry.facilities : [],
      daily: Array.isArray(telemetry?.daily) ? telemetry.daily : [],
      windowDays: Number(telemetry?.windowDays || 30),
      lastEventAt: telemetry?.lastEventAt || null,
      config: telemetry?.config || null
    };
  }, [telemetry]);

  const nav = (view) => window.dispatchEvent(new CustomEvent('sbs:navigate', { detail: { view } }));

  return (
    <div className="flex-1">
      <main className="max-w-[1400px] mx-auto p-6 sm:p-8 space-y-8 stagger-children">
        <section className="animate-premium-in">
          <SectionHeader
            title={t.header.title}
            subtitle={t.header.subtitle}
            badge={loading ? t.header.badgeLoading : t.header.badgeLive}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
            <StatCard
              testId="mappings-stat-events"
              title={t.stats.mappingsObserved}
              value={formatInt(stats.events)}
              trend={`${stats.windowDays}d`}
              icon="dataset"
              color="blue"
            />
            <StatCard
              testId="mappings-stat-auto"
              title={t.stats.autoAcceptRate}
              value={`${formatPct(stats.autoPct)}%`}
              trend={`${formatPct(stats.avgConfidence * 100)}% ${t.stats.avgConfidenceSuffix}`}
              icon="psychology"
              color="indigo"
            />
            <StatCard
              testId="mappings-stat-review"
              title={t.stats.reviewQueue}
              value={`${formatPct(stats.reviewPct)}%`}
              trend={`${formatInt(stats.uniqueInternalCodes)} ${t.stats.uniqueSuffix}`}
              icon="fact_check"
              color="emerald"
            />
            <StatCard
              testId="mappings-stat-latency"
              title={t.stats.p95Latency}
              value={formatLatency(stats.p95LatencyMs)}
              trend={`${formatLatency(stats.avgLatencyMs)} ${t.stats.avgLatencySuffix}`}
              icon="bolt"
              color="amber"
            />
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button size="sm" icon="tune" onClick={() => nav('mapping_rules')} data-testid="mappings-open-rules">
              {t.actions.configureRules}
            </Button>
            <Button size="sm" variant="secondary" icon="rule" onClick={() => nav('review')} data-testid="mappings-open-review">
              {t.actions.openReviewQueue}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              icon="refresh"
              onClick={() => {
                setLoading(true);
                setRefreshNonce((n) => n + 1);
              }}
              data-testid="mappings-refresh"
            >
              {t.actions.refresh}
            </Button>
            {stats.lastEventAt && (
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                {t.lastEvent}{' '}
                <span className="text-slate-700 dark:text-slate-200">
                  {String(stats.lastEventAt).replace('T', ' ').slice(0, 19)}
                </span>
              </div>
            )}
          </div>
        </section>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <Card className="animate-premium-in" style={{ animationDelay: '100ms' }}>
              <CardHeader
                title={t.charts.transformationAccuracy.title}
                subtitle={t.charts.transformationAccuracy.subtitle}
                action={
                  <div className="flex items-center gap-4">
                    <LegendDot color="bg-blue-600" label={t.charts.legend.volume} />
                    <LegendDot color="bg-indigo-400" label={t.charts.legend.avgConfidence} />
                  </div>
                }
              />
              <CardBody>
                <DailyChart loading={loading} daily={stats.daily} t={t} />
              </CardBody>
            </Card>

            <Card className="animate-premium-in" style={{ animationDelay: '200ms' }}>
              <CardHeader title={t.facilities.title} subtitle={t.facilities.subtitle} />
              <div className="overflow-x-auto">
                <table data-testid="mappings-facility-table" className="w-full text-left">
                  <thead className="bg-slate-50 dark:bg-slate-900/40">
                    <tr>
                      <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500">{t.facilities.table.facility}</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 text-right">{t.facilities.table.volume}</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500">{t.facilities.table.avgConfidence}</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 text-right">{t.facilities.table.overrides}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {stats.facilities.length > 0 ? (
                      stats.facilities.map((f) => (
                        <FacilityRow
                          key={String(f.facilityId)}
                          facilityId={f.facilityId}
                          volume={f.volume}
                          avgConfidence={Number(f.avgConfidence || 0)}
                          overrideHits={Number(f.overrideHits || 0)}
                          warn={Number(f.avgConfidence || 0) < Number(stats.config?.reviewTrigger || 0.5)}
                          t={t}
                        />
                      ))
                    ) : (
                      <tr>
                        <td className="px-6 py-10 text-center text-xs font-bold text-slate-400" colSpan={4}>
                          {loading
                            ? t.facilities.empty.loading
                            : t.facilities.empty.noData}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          <div className="space-y-8">
            <Card className="animate-premium-in" style={{ animationDelay: '300ms' }}>
              <CardHeader title={t.anomalies.title} subtitle={t.anomalies.subtitle} />
              <CardBody className="space-y-6">
                <div className="flex justify-center py-8">
                  <div className="size-44 rounded-full border-[12px] border-slate-100 dark:border-slate-800 relative flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full border-[12px] border-blue-600 border-t-transparent -rotate-45"></div>
                    <div className="text-center">
                      <p data-testid="mappings-anomalies-total" className="text-3xl font-black text-slate-900 dark:text-white">
                        {formatInt(stats.noMatch + stats.rejected)}
                      </p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{t.anomalies.totalFlags}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3" data-testid="mappings-anomaly-list">
                  <ErrorLink label={t.anomalies.items.noMatch} count={stats.noMatch} color="bg-blue-600" />
                  <ErrorLink label={t.anomalies.items.rejectedLowConf} count={stats.rejected} color="bg-rose-500" />
                  <ErrorLink label={t.anomalies.items.overrideHits} count={stats.overrideHits} color="bg-indigo-500" />
                </div>
              </CardBody>
            </Card>

            <Card className="bg-indigo-600 text-white animate-premium-in" style={{ animationDelay: '400ms' }}>
              <CardBody className="p-8 text-center space-y-6">
                <div className="size-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mx-auto border border-white/20">
                  <span className="material-symbols-outlined text-3xl">auto_awesome</span>
                </div>
                <div className="space-y-2">
                  <h4 className="text-xl font-black tracking-tight">{t.aiAudit.title}</h4>
                  <p className="text-sm font-bold text-indigo-100">
                    {t.aiAudit.bodyLead}{' '}
                    <span className="font-black">{formatInt(stats.overrides)}</span>.
                  </p>
                </div>
                <button
                  onClick={() => nav('mapping_rules')}
                  className="w-full py-4 bg-white text-indigo-600 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl transition-transform active:scale-95"
                  data-testid="mappings-review-governance"
                >
                  {t.aiAudit.button}
                </button>
              </CardBody>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

function formatInt(n) {
  const x = Number.isFinite(Number(n)) ? Number(n) : 0;
  return x.toLocaleString();
}

function formatPct(n) {
  const x = Number.isFinite(Number(n)) ? Number(n) : 0;
  return Math.round(x * 10) / 10;
}

function formatLatency(ms) {
  const n = Number.isFinite(Number(ms)) ? Number(ms) : 0;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}s`;
  return `${Math.round(n)}ms`;
}

function StatCard({ testId, title, value, trend, icon, color }) {
  const colors = {
    blue: 'text-blue-600 bg-blue-600/10',
    indigo: 'text-indigo-600 bg-indigo-600/10',
    emerald: 'text-emerald-600 bg-emerald-600/10',
    amber: 'text-amber-600 bg-amber-600/10',
  };
  return (
    <div
      data-testid={testId}
      className="glass-card p-6 rounded-[28px] border border-slate-200/50 dark:border-slate-800/50 hover:border-blue-600/30 transition-all group"
    >
      <div className="flex justify-between items-start mb-4">
        <div className={`size-12 rounded-2xl flex items-center justify-center ${colors[color] || colors.blue} transition-transform group-hover:rotate-6`}>
          <span className="material-symbols-outlined text-2xl">{icon}</span>
        </div>
        <span className="text-[11px] font-black px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
          {trend}
        </span>
      </div>
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">{title}</p>
      <h4 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">{value}</h4>
    </div>
  );
}

function LegendDot({ color, label }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`size-2.5 rounded-full ${color}`}></div>
      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</span>
    </div>
  );
}

function FacilityRow({ facilityId, volume, avgConfidence, overrideHits, warn, t }) {
  const accuracy = Math.round(avgConfidence * 1000) / 10;
  return (
    <tr className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
      <td className="px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black text-xs text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
            {String(facilityId)}
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900 dark:text-white">
              {t.facilities.row.facilityLabel.replace('{id}', String(facilityId))}
            </p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              {t.facilities.row.nodeLabel.replace('{id}', String(facilityId))}
            </p>
          </div>
        </div>
      </td>
      <td className="px-6 py-5 text-right">
        <p className="text-sm font-black text-slate-700 dark:text-slate-300">{formatInt(volume)}</p>
      </td>
      <td className="px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex-1 h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden w-24 shadow-inner">
            <div
              className={`h-full rounded-full ${warn ? 'bg-amber-500' : 'bg-blue-600'} transition-all duration-1000`}
              style={{ width: `${Math.max(0, Math.min(100, accuracy))}%` }}
            ></div>
          </div>
          <span className={`text-xs font-black ${warn ? 'text-amber-600' : 'text-blue-600'}`}>{accuracy}%</span>
        </div>
      </td>
      <td className="px-6 py-5 text-right">
        <p className="text-sm font-black text-slate-700 dark:text-slate-300">{formatInt(overrideHits)}</p>
      </td>
    </tr>
  );
}

function ErrorLink({ label, count, color }) {
  return (
    <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-slate-700">
      <div className="flex items-center gap-3">
        <div className={`size-2.5 rounded-full ${color}`}></div>
        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{label}</span>
      </div>
      <span className="text-xs font-black text-slate-400 group-hover:text-blue-600">{formatInt(count)}</span>
    </div>
  );
}

function DailyChart({ loading, daily, t }) {
  const maxVol = Math.max(1, ...daily.map((d) => Number(d.volume || 0)));
  return (
    <div
      data-testid="mappings-daily-chart"
      className="relative w-full h-[320px] rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-transparent"></div>
      {loading ? (
        <div className="relative h-full flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="size-16 rounded-full bg-blue-600/10 flex items-center justify-center mx-auto text-blue-600">
              <span className="material-symbols-outlined text-3xl animate-spin">progress_activity</span>
            </div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{t.charts.daily.loading}</p>
          </div>
        </div>
      ) : daily.length === 0 ? (
        <div className="relative h-full flex items-center justify-center">
          <div className="text-center space-y-3 opacity-70">
            <div className="size-16 rounded-full bg-blue-600/10 flex items-center justify-center mx-auto text-blue-600">
              <span className="material-symbols-outlined text-3xl">query_stats</span>
            </div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{t.charts.daily.empty}</p>
          </div>
        </div>
      ) : (
        <div className="relative h-full px-6 py-8 flex items-end gap-1">
          {daily.map((d) => {
            const vol = Number(d.volume || 0);
            const avg = Math.max(0, Math.min(1, Number(d.avgConfidence || 0)));
            const hVol = Math.round((vol / maxVol) * 100);
            const hConf = Math.round(avg * 100);
            return (
              <div key={d.day} className="flex-1 min-w-0 flex flex-col justify-end items-center gap-1">
                <div className="w-full rounded-t bg-blue-600/70" style={{ height: `${Math.max(2, hVol)}%` }} title={`${d.day} volume=${vol}`}></div>
                <div className="w-full rounded-t bg-indigo-400/70" style={{ height: `${Math.max(2, hConf)}%` }} title={`${d.day} avgConfidence=${Math.round(avg * 100)}%`}></div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
