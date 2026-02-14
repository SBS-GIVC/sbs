import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { SectionHeader } from '../components/ui/SectionHeader';
import { Button } from '../components/ui/Button';
import { APIService } from '../services/apiService';
import { useToast } from '../components/Toast';
import { i18n } from '../utils/i18n';

const DEFAULT_CONFIG = {
  autoAcceptMarker: 0.85,
  reviewTrigger: 0.5,
  fuzzyNormalization: true,
  universalSbsPriority: true,
  strictIcd10Enforcement: false
};

/**
 * Premium Mapping Rules Configuration
 * Live governance editor backed by `/api/mappings/config` + `/api/mappings/overrides`.
 */
export function MappingRulesConfig({ lang = 'en' }) {
  const toast = useToast();
  const copy = i18n[lang] || i18n.en;
  const t = copy.pages?.mappingRules || i18n.en.pages.mappingRules;

  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);

  const [overrides, setOverrides] = useState([]);
  const [loadingOverrides, setLoadingOverrides] = useState(true);
  const [overrideEditorOpen, setOverrideEditorOpen] = useState(false);
  const [overrideDraft, setOverrideDraft] = useState({
    facility_id: '1',
    internal_code: '',
    sbs_code: '',
    description: '',
    confidence: '1',
    notes: ''
  });
  const [savingOverride, setSavingOverride] = useState(false);

  const [sim, setSim] = useState({
    facility_id: '1',
    internal_code: 'TEST_CODE',
    description: 'Appendectomy removal with complications',
    loading: false,
    result: null
  });

  const autoPct = Math.round((Number(config.autoAcceptMarker || 0) || 0) * 100);
  const reviewPct = Math.round((Number(config.reviewTrigger || 0) || 0) * 100);
  const autoWindowPct = Math.max(reviewPct, autoPct - 1);

  const decisionKey = useMemo(() => {
    const conf = Number(sim?.result?.confidenceRatio || 0);
    if (conf >= Number(config.autoAcceptMarker || 0.85)) return 'autoAccepted';
    if (conf >= Number(config.reviewTrigger || 0.5)) return 'reviewRequired';
    return 'rejected';
  }, [sim?.result, config]);

  const decisionLabel = t.simulator.decisions[decisionKey] || decisionKey;

  const refreshConfig = async () => {
    setLoadingConfig(true);
    try {
      const data = await APIService.getMappingConfig();
      if (!data?.success) throw new Error(data?.error || 'Failed to load config');
      setConfig({ ...DEFAULT_CONFIG, ...(data.config || {}) });
    } catch (e) {
      toast.warning(e?.message || t.toast.loadConfigFailed);
    } finally {
      setLoadingConfig(false);
    }
  };

  const refreshOverrides = async () => {
    setLoadingOverrides(true);
    try {
      const data = await APIService.listMappingOverrides();
      if (!data?.success) throw new Error(data?.error || 'Failed to load overrides');
      setOverrides(Array.isArray(data.overrides) ? data.overrides : []);
    } catch (e) {
      toast.warning(e?.message || t.toast.loadOverridesFailed);
      setOverrides([]);
    } finally {
      setLoadingOverrides(false);
    }
  };

  useEffect(() => {
    refreshConfig();
    refreshOverrides();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    try {
      const payload = {
        autoAcceptMarker: config.autoAcceptMarker,
        reviewTrigger: config.reviewTrigger,
        fuzzyNormalization: !!config.fuzzyNormalization,
        universalSbsPriority: !!config.universalSbsPriority,
        strictIcd10Enforcement: !!config.strictIcd10Enforcement
      };
      const result = await APIService.updateMappingConfig(payload);
      if (!result?.success) throw new Error(result?.error || 'Save failed');
      setConfig({ ...DEFAULT_CONFIG, ...(result.config || payload) });
      toast.success(t.toast.profileSaved);
    } catch (e) {
      toast.error(e?.message || t.toast.saveConfigFailed);
    } finally {
      setSavingConfig(false);
    }
  };

  const handleReset = async () => {
    setConfig(DEFAULT_CONFIG);
    toast.info(t.toast.defaultStaged);
  };

  const handleAddOverride = async () => {
    const internal_code = String(overrideDraft.internal_code || '').trim();
    const sbs_code = String(overrideDraft.sbs_code || '').trim();
    const facility_id = Number(overrideDraft.facility_id || 1);
    const confidence = Number(overrideDraft.confidence || 1);

    if (!internal_code || !sbs_code) {
      toast.error(t.toast.overrideRequired);
      return;
    }

    setSavingOverride(true);
    try {
      const payload = {
        facility_id: Number.isFinite(facility_id) && facility_id > 0 ? facility_id : 1,
        internal_code,
        sbs_code,
        description: String(overrideDraft.description || '').trim() || null,
        confidence: Number.isFinite(confidence) ? confidence : 1,
        notes: String(overrideDraft.notes || '').trim() || null
      };
      const result = await APIService.createMappingOverride(payload);
      if (!result?.success) throw new Error(result?.error || 'Failed to save override');
      toast.success(t.toast.overrideSaved);
      setOverrideDraft({ facility_id: '1', internal_code: '', sbs_code: '', description: '', confidence: '1', notes: '' });
      setOverrideEditorOpen(false);
      await refreshOverrides();
    } catch (e) {
      toast.error(e?.message || t.toast.overrideSaveFailed);
    } finally {
      setSavingOverride(false);
    }
  };

  const handleDeleteOverride = async (row) => {
    try {
      await APIService.deleteMappingOverride(String(row.internal_code || ''), Number(row.facility_id || 1));
      toast.success(t.toast.overrideDeleted);
      await refreshOverrides();
    } catch (e) {
      toast.error(e?.message || t.toast.deleteFailed);
    }
  };

  const handleSimulate = async () => {
    const internal_code = String(sim.internal_code || '').trim();
    if (!internal_code) {
      toast.error(t.toast.internalCodeRequired);
      return;
    }

    setSim((prev) => ({ ...prev, loading: true }));
    try {
      const facility_id = Number(sim.facility_id || 1);
      const data = await APIService.normalizeCode(internal_code, String(sim.description || '').trim(), Number.isFinite(facility_id) ? facility_id : 1);
      const mappedCode = String(data?.sbs_mapped_code || data?.sbs_code || internal_code).trim();
      const mappedDesc = String(data?.official_description || data?.description || '').trim();
      const confidenceRatio = Math.max(0, Math.min(1, Number(data?.confidence || 0) || 0));
      const mappingSource = String(data?.mapping_source || 'normalizer');
      setSim((prev) => ({
        ...prev,
        loading: false,
        result: {
          mappedCode,
          mappedDesc,
          confidenceRatio,
          confidencePct: Math.round(confidenceRatio * 100),
          mappingSource
        }
      }));
    } catch (e) {
      setSim((prev) => ({
        ...prev,
        loading: false,
        result: {
          mappedCode: t.simulator.resolutionError,
          mappedDesc: '',
          confidenceRatio: 0,
          confidencePct: 0,
          mappingSource: 'error'
        }
      }));
    }
  };

  return (
    <div className="flex-1">
      <main className="max-w-[1400px] mx-auto p-6 sm:p-8 space-y-8 stagger-children">
        <section className="animate-premium-in">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <SectionHeader
              title={t.header.title}
              subtitle={t.header.subtitle}
              badge={loadingConfig ? t.header.badgeLoading : t.header.badgeLive}
            />
            <div className="flex gap-3">
              <Button
                variant="secondary"
                icon="history"
                onClick={() => toast.info(t.toast.versionHistoryUnavailable)}
              >
                {t.actions.versionHistory}
              </Button>
              <Button variant="secondary" icon="restore" onClick={handleReset} data-testid="mappingrules-reset">
                {t.actions.reset}
              </Button>
              <Button icon="save" loading={savingConfig} onClick={handleSaveConfig} data-testid="mappingrules-save">
                {t.actions.save}
              </Button>
            </div>
          </div>
        </section>

        <div className="grid lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 space-y-8 animate-premium-in" style={{ animationDelay: '100ms' }}>
            <Card>
              <CardHeader title={t.thresholds.title} subtitle={t.thresholds.subtitle} />
              <CardBody className="space-y-10 py-6">
                <ConfigSlider
                  testId="mappingrules-autoaccept"
                  unit="%"
                  label={t.thresholds.autoAccept.label}
                  val={autoPct}
                  min={60}
                  max={99}
                  color="emerald"
                  hint={t.thresholds.autoAccept.hint}
                  onChange={(pct) => setConfig((prev) => ({ ...prev, autoAcceptMarker: clamp01(pct / 100) }))}
                />
                <ConfigSlider
                  testId="mappingrules-reviewtrigger"
                  unit="%"
                  label={t.thresholds.reviewTrigger.label}
                  val={reviewPct}
                  min={0}
                  max={95}
                  color="amber"
                  hint={t.thresholds.reviewTrigger.hint}
                  onChange={(pct) => setConfig((prev) => ({ ...prev, reviewTrigger: clamp01(pct / 100) }))}
                />

                <div className="p-6 bg-blue-600/5 rounded-[28px] border border-blue-600/10 flex gap-4">
                  <span className="material-symbols-outlined text-blue-600 font-black">info</span>
                  <p className="text-xs font-bold text-slate-500 leading-relaxed">
                    {t.thresholds.infoTemplate
                      .replace('{review}', String(reviewPct))
                      .replace('{auto}', String(autoWindowPct))}
                  </p>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title={t.heuristics.title} subtitle={t.heuristics.subtitle} />
              <CardBody className="p-0">
                <ToggleRule
                  testId="mappingrules-toggle-fuzzy"
                  label={t.heuristics.toggles.fuzzy.label}
                  sub={t.heuristics.toggles.fuzzy.desc}
                  active={!!config.fuzzyNormalization}
                  onToggle={() => setConfig((prev) => ({ ...prev, fuzzyNormalization: !prev.fuzzyNormalization }))}
                  lang={lang}
                />
                <ToggleRule
                  testId="mappingrules-toggle-universal"
                  label={t.heuristics.toggles.universal.label}
                  sub={t.heuristics.toggles.universal.desc}
                  active={!!config.universalSbsPriority}
                  onToggle={() => setConfig((prev) => ({ ...prev, universalSbsPriority: !prev.universalSbsPriority }))}
                  lang={lang}
                />
                <ToggleRule
                  testId="mappingrules-toggle-icd10"
                  label={t.heuristics.toggles.icd10.label}
                  sub={t.heuristics.toggles.icd10.desc}
                  active={!!config.strictIcd10Enforcement}
                  onToggle={() => setConfig((prev) => ({ ...prev, strictIcd10Enforcement: !prev.strictIcd10Enforcement }))}
                  lang={lang}
                />
              </CardBody>
            </Card>
          </div>

          <div className="lg:col-span-7 space-y-8 animate-premium-in" style={{ animationDelay: '200ms' }}>
            <Card className="flex flex-col">
              <CardHeader
                title={t.overrides.title}
                subtitle={t.overrides.subtitle}
                action={
                  <Button
                    variant="secondary"
                    size="sm"
                    icon="add"
                    data-testid="mappingrules-open-override-editor"
                    onClick={() => setOverrideEditorOpen((v) => !v)}
                  >
                    {t.overrides.add}
                  </Button>
                }
              />
              <CardBody className="p-0">
                {overrideEditorOpen && (
                  <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/20">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field label={t.overrides.editor.facilityId}>
                        <input
                          className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm font-bold"
                          data-testid="mappingrules-override-facility"
                          value={overrideDraft.facility_id}
                          onChange={(e) => setOverrideDraft((p) => ({ ...p, facility_id: e.target.value }))}
                        />
                      </Field>
                      <Field label={t.overrides.editor.confidence}>
                        <input
                          className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm font-bold"
                          data-testid="mappingrules-override-confidence"
                          value={overrideDraft.confidence}
                          onChange={(e) => setOverrideDraft((p) => ({ ...p, confidence: e.target.value }))}
                        />
                      </Field>
                      <Field label={t.overrides.editor.internalCode}>
                        <input
                          className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm font-black font-mono text-blue-600"
                          data-testid="mappingrules-override-internal"
                          value={overrideDraft.internal_code}
                          onChange={(e) => setOverrideDraft((p) => ({ ...p, internal_code: e.target.value }))}
                        />
                      </Field>
                      <Field label={t.overrides.editor.mappedSbsCode}>
                        <input
                          className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm font-black font-mono text-blue-600"
                          data-testid="mappingrules-override-sbs"
                          value={overrideDraft.sbs_code}
                          onChange={(e) => setOverrideDraft((p) => ({ ...p, sbs_code: e.target.value }))}
                        />
                      </Field>
                      <Field label={t.overrides.editor.description}>
                        <input
                          className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm font-bold"
                          data-testid="mappingrules-override-description"
                          value={overrideDraft.description}
                          onChange={(e) => setOverrideDraft((p) => ({ ...p, description: e.target.value }))}
                        />
                      </Field>
                      <Field label={t.overrides.editor.notes}>
                        <input
                          className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm font-bold"
                          data-testid="mappingrules-override-notes"
                          value={overrideDraft.notes}
                          onChange={(e) => setOverrideDraft((p) => ({ ...p, notes: e.target.value }))}
                        />
                      </Field>
                    </div>
                    <div className="mt-4 flex justify-end gap-3">
                      <Button
                        variant="secondary"
                        icon="close"
                        onClick={() => setOverrideEditorOpen(false)}
                      >
                        {t.overrides.editor.cancel}
                      </Button>
                      <Button
                        icon="verified"
                        loading={savingOverride}
                        data-testid="mappingrules-override-save"
                        onClick={handleAddOverride}
                      >
                        {t.overrides.editor.save}
                      </Button>
                    </div>
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table data-testid="mappingrules-overrides-table" className="w-full text-left">
                    <thead className="bg-slate-50 dark:bg-slate-900/40">
                      <tr>
                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500">{t.overrides.table.facility}</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500">{t.overrides.table.internal}</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500">{t.overrides.table.sbs}</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 text-right">{t.overrides.table.conf}</th>
                        <th className="px-6 py-4"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {loadingOverrides ? (
                        <tr>
                          <td className="px-6 py-10 text-center text-xs font-bold text-slate-400" colSpan={5}>
                            {t.overrides.table.loading}
                          </td>
                        </tr>
                      ) : overrides.length === 0 ? (
                        <tr>
                          <td className="px-6 py-10 text-center text-xs font-bold text-slate-400" colSpan={5}>
                            {t.overrides.table.empty}
                          </td>
                        </tr>
                      ) : (
                        overrides.map((o) => (
                          <OverrideRow
                            key={`${o.facility_id}|${o.internal_code}`}
                            row={o}
                            onDelete={() => handleDeleteOverride(o)}
                            t={t}
                          />
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardBody>
            </Card>

            <Card className="bg-slate-900 text-white overflow-hidden relative">
              <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                <span className="material-symbols-outlined text-[100px] font-black">biotech</span>
              </div>
              <CardHeader title={t.simulator.title} subtitle={t.simulator.subtitle} />
              <CardBody className="space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Field label={t.simulator.fields.facilityId}>
                    <input
                      className="w-full bg-slate-950/50 border border-white/10 rounded-2xl px-4 py-3 text-sm font-bold text-white focus:outline-none"
                      data-testid="mappingrules-sim-facility"
                      value={sim.facility_id}
                      onChange={(e) => setSim((p) => ({ ...p, facility_id: e.target.value }))}
                    />
                  </Field>
                  <Field label={t.simulator.fields.internalCode}>
                    <input
                      className="w-full bg-slate-950/50 border border-white/10 rounded-2xl px-4 py-3 text-sm font-black font-mono text-white focus:outline-none"
                      data-testid="mappingrules-sim-internal"
                      value={sim.internal_code}
                      onChange={(e) => setSim((p) => ({ ...p, internal_code: e.target.value }))}
                    />
                  </Field>
                  <Field label={t.simulator.fields.description}>
                    <input
                      className="w-full bg-slate-950/50 border border-white/10 rounded-2xl px-4 py-3 text-sm font-bold text-white focus:outline-none"
                      data-testid="mappingrules-sim-description"
                      value={sim.description}
                      onChange={(e) => setSim((p) => ({ ...p, description: e.target.value }))}
                      placeholder={t.simulator.fields.descriptionPlaceholder}
                    />
                  </Field>
                </div>

                <div className="flex justify-end">
                  <Button
                    loading={sim.loading}
                    icon="play_arrow"
                    className="py-3.5 px-8"
                    data-testid="mappingrules-simulate"
                    onClick={handleSimulate}
                  >
                    {t.simulator.actions.simulate}
                  </Button>
                </div>

                <div className="glass-panel p-8 rounded-[32px] border border-white/5 relative overflow-hidden flex flex-col sm:flex-row gap-8">
                  <div className={`absolute left-0 top-0 bottom-0 w-2 ${decisionKey === 'autoAccepted' ? 'bg-emerald-500' : decisionKey === 'reviewRequired' ? 'bg-amber-500' : 'bg-rose-500'}`}></div>
                  <div className="flex-1 space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{t.simulator.output.predicted}</p>
                    <h4 className={`text-2xl font-black tracking-tight ${sim.loading ? 'animate-pulse opacity-50' : ''}`} data-testid="mappingrules-sim-mapped">
                      {sim.result?.mappedCode || '—'}
                    </h4>
                    <p className="text-[11px] font-bold text-slate-300/80" data-testid="mappingrules-sim-source">
                      {t.simulator.output.sourceLabel}: {sim.result?.mappingSource || '—'}
                    </p>
                  </div>
                  <div className="text-center sm:text-right space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{t.simulator.output.confidenceLabel}</p>
                    <h4 className={`text-3xl font-black tracking-tighter ${decisionKey === 'autoAccepted' ? 'text-emerald-500' : decisionKey === 'reviewRequired' ? 'text-amber-500' : 'text-rose-500'}`} data-testid="mappingrules-sim-confidence">
                      {sim.result ? `${sim.result.confidencePct}%` : '—'}
                    </h4>
                  </div>
                </div>

                <div className="flex justify-center">
                  <span className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full border border-white/10 ${decisionKey === 'autoAccepted' ? 'text-emerald-500 bg-emerald-500/5' : decisionKey === 'reviewRequired' ? 'text-amber-500 bg-amber-500/5' : 'text-rose-500 bg-rose-500/5'}`} data-testid="mappingrules-sim-decision">
                    {t.simulator.output.resultLabel}: {decisionLabel}
                  </span>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

function clamp01(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

function Field({ label, children }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500" style={{ marginInlineStart: '0.25rem' }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function ConfigSlider({ testId, label, val, min, max, color, unit, hint, onChange }) {
  const themes = {
    emerald: 'accent-emerald-500 text-emerald-600',
    amber: 'accent-amber-500 text-amber-600'
  };
  const theme = themes[color] || themes.emerald;
  const pct = Number.isFinite(Number(val)) ? Number(val) : 0;
  return (
    <div className="space-y-4" data-testid={testId}>
      <div className="flex justify-between items-end">
        <div className="space-y-1">
          <label className="text-sm font-black text-slate-800 dark:text-gray-100 leading-none">{label}</label>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{hint}</p>
        </div>
        <span className={`text-xl font-black ${theme.split(' ')[1]}`}>{pct}{unit}</span>
      </div>
      <input
        type="range"
        className={`w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full appearance-none transition-all ${theme.split(' ')[0]}`}
        min={min}
        max={max}
        value={pct}
        onChange={(e) => onChange?.(Number(e.target.value))}
      />
    </div>
  );
}

function ToggleRule({ testId, label, sub, active, onToggle, lang = 'en' }) {
  const copy = i18n[lang] || i18n.en;
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onToggle}
      role="switch"
      aria-checked={!!active}
      aria-label={`${label}: ${active ? copy.common.on : copy.common.off}`}
      className="w-full text-left flex items-center justify-between px-8 py-5 border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors"
    >
      <div className="space-y-1">
        <h4 className="text-sm font-bold text-slate-800 dark:text-gray-100">{label}</h4>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{sub}</p>
      </div>
      <div className={`w-10 h-5 rounded-full transition-colors relative ${active ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'}`}>
        <div
          className="absolute top-1 size-3 bg-white rounded-full transition-all"
          style={active ? { insetInlineEnd: '0.25rem' } : { insetInlineStart: '0.25rem' }}
        ></div>
      </div>
    </button>
  );
}

function OverrideRow({ row, onDelete, t }) {
  const conf = Math.round((Number(row.confidence || 0) || 0) * 100);
  return (
    <tr className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all duration-300">
      <td className="px-6 py-5">
        <p className="text-sm font-bold text-slate-800 dark:text-white leading-none">{row.facility_id}</p>
      </td>
      <td className="px-6 py-5">
        <p className="text-xs font-black font-mono text-blue-600">{row.internal_code}</p>
      </td>
      <td className="px-6 py-5">
        <p className="text-xs font-black font-mono text-slate-700 dark:text-slate-200">{row.sbs_code}</p>
      </td>
      <td className="px-6 py-5 text-right">
        <span className="text-xs font-black text-slate-400">{conf}%</span>
      </td>
      <td className="px-6 py-5 text-right">
        <button
          type="button"
          className="text-slate-300 hover:text-rose-500 transition-colors"
          onClick={onDelete}
          title={t.overrides.row.delete}
          aria-label={t.overrides.row.delete}
        >
          <span className="material-symbols-outlined text-lg">delete</span>
        </button>
      </td>
    </tr>
  );
}
