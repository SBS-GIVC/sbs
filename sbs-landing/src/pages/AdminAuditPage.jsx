import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { i18n } from '../utils/i18n';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { SectionHeader } from '../components/ui/SectionHeader';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useToast } from '../components/Toast';

const API_BASE_URL =
  (typeof window !== 'undefined' && typeof window.SBS_API_URL === 'string' && window.SBS_API_URL.trim())
    ? window.SBS_API_URL.replace(/\/+$/, '')
    : '';

export function AdminAuditPage({ lang = 'en' }) {
  const copy = i18n[lang] || i18n.en;
  const t = copy.pages?.adminAudit || i18n.en.pages.adminAudit;
  const toast = useToast();

  const [token, setToken] = useState(() => {
    if (typeof window === 'undefined') return '';
    try { return window.sessionStorage.getItem('sbs_admin_token') || ''; } catch { return ''; }
  });
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState([]);
  const [error, setError] = useState(null);

  const authHeaders = useMemo(() => {
    const headers = {};
    const trimmed = String(token || '').trim();
    if (trimmed) headers.Authorization = trimmed.startsWith('Bearer ') ? trimmed : `Bearer ${trimmed}`;
    return headers;
  }, [token]);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (typeof window !== 'undefined') {
        try { window.sessionStorage.setItem('sbs_admin_token', token || ''); } catch {}
      }

      const res = await fetch(`${API_BASE_URL}/api/admin/audit?limit=200`, {
        headers: { ...authHeaders }
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) {
        throw new Error(data.error || data.message || `HTTP ${res.status}`);
      }
      setEvents(Array.isArray(data.events) ? data.events : []);
    } catch (e) {
      setEvents([]);
      setError(e?.message || 'Failed to load audit events');
      toast.error(e?.message || 'Failed to load audit events');
    } finally {
      setLoading(false);
    }
  }, [authHeaders, token, toast]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  return (
    <div className="flex-1">
      <main className="max-w-[1400px] mx-auto p-6 sm:p-8 space-y-8 stagger-children">
        <section className="animate-premium-in">
          <SectionHeader title={t.title} subtitle={t.subtitle} badge={t.badge} />
        </section>

        <Card>
          <CardHeader title={t.tokenLabel} subtitle={null} />
          <CardBody className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1">
              <Input
                label={t.tokenLabel}
                placeholder={t.tokenPlaceholder}
                value={token}
                onChange={(e) => setToken(e.target.value)}
              />
            </div>
            <Button
              icon="refresh"
              loading={loading}
              onClick={loadEvents}
              data-testid="auditlog-load"
            >
              {t.load}
            </Button>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title={t.title}
            subtitle={error ? String(error) : null}
            action={<span className="text-[10px] font-black uppercase text-slate-400">{events.length}</span>}
          />
          <div className="overflow-x-auto">
            {loading ? (
              <div className="py-24 flex flex-col items-center justify-center space-y-4">
                <div className="size-12 rounded-full border-4 border-blue-600/10 border-t-blue-600 animate-spin"></div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{copy.common.loading}</p>
              </div>
            ) : events.length === 0 ? (
              <div className="py-24 text-center">
                <p className="text-slate-500 font-semibold">{t.empty}</p>
              </div>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-900/40">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500">{t.columns.time}</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500">{t.columns.type}</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500">{t.columns.actor}</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500">{t.columns.detail}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {events.map((evt) => (
                    <tr key={evt.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                      <td className="px-6 py-4 text-[11px] font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {evt.timestamp}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-blue-600/10 text-blue-600 border border-blue-600/20">
                          {evt.eventType}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                        <div className="space-y-1">
                          <div className="font-mono text-[10px] text-slate-400">{evt.actor?.ip || '—'}</div>
                          <div className="truncate max-w-[240px]">{evt.actor?.user || '—'}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                        <pre className="whitespace-pre-wrap text-[10px] font-mono text-slate-500 dark:text-slate-400 max-h-40 overflow-auto">
                          {JSON.stringify(evt.detail || {}, null, 2)}
                        </pre>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      </main>
    </div>
  );
}

