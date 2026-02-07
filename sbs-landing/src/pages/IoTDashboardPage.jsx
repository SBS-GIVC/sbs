import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { SectionHeader } from '../components/ui/SectionHeader';
import { Button } from '../components/ui/Button';

// Mock API service for IoT endpoints
const IoTService = {
  baseUrl: window.__API_CONFIG__?.baseUrl || '',
  async getDashboard() { return { dashboard: { system_health_score: 98, status: 'healthy', nodes: { active_now: 12, total: 15 }, events: { last_24h: 1240, rate_per_minute: 4.2 } } }; },
  async getDevices() { return { online: 12, idle: 2, offline: 1, devices: [
    { node_id: 'SBS-NODE-01', device_name: 'Main Gateway', status: 'online', device_type: 'gateway', event_count: 450, seconds_since_last_seen: 2 },
    { node_id: 'SBS-NODE-02', device_name: 'Patient Monitor A', status: 'online', device_type: 'sensor', event_count: 120, seconds_since_last_seen: 5 },
    { node_id: 'SBS-NODE-03', device_name: 'Lab Analyzer X', status: 'idle', device_type: 'raspberry_pi', event_count: 85, seconds_since_last_seen: 120 }
  ] }; },
  async getEvents() { return { events: [
    { event_id: 'EVT-001', node: 'SBS-NODE-01', event_type: 'heartbeat', received_at: new Date().toISOString(), data: { cpu: '12%', mem: '45%' } },
    { event_id: 'EVT-002', node: 'SBS-NODE-02', event_type: 'telemetry', received_at: new Date().toISOString(), data: { temp: '37.2C', pulse: '72' } }
  ] }; },
  async getAlerts() { return { alerts: [], severity_summary: { critical: 0 }, total: 0 }; }
};

/**
 * Premium IoT Monitoring Dashboard
 * Optimized for GIVC-SBS Ultra-Premium Design System
 */
export function IoTDashboardPage() {
  const [dashboard, setDashboard] = useState(null);
  const [devices, setDevices] = useState(null);
  const [events, setEvents] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [d, dv, e] = await Promise.all([
        IoTService.getDashboard(),
        IoTService.getDevices(),
        IoTService.getEvents()
      ]);
      setDashboard(d.dashboard);
      setDevices(dv);
      setEvents(e.events);
      setLastRefresh(new Date());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (!dashboard) return <LoadingScreen />;

  return (
    <div className="flex-1 overflow-y-auto bg-grid scrollbar-hide">
      <main className="max-w-[1400px] mx-auto p-6 sm:p-12 space-y-12 stagger-children">
        
        {/* Header Section */}
        <section className="animate-premium-in">
           <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
              <SectionHeader 
                title="Active Telemetry" 
                subtitle="Real-time device monitoring and event ingestion from the clinical edge registry."
                badge="Edge Computing"
              />
              <div className="flex items-center gap-4">
                 <div className="text-right">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Registry Sync</p>
                    <p className="text-xs font-bold text-slate-800 dark:text-gray-100 italic">Last signal: {lastRefresh.toLocaleTimeString()}</p>
                 </div>
                 <Button icon="refresh" loading={loading} onClick={fetchData}>Manual Probe</Button>
              </div>
           </div>
        </section>

        {/* Global Stats Row */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-6 animate-premium-in" style={{ animationDelay: '100ms' }}>
           <TelemetryKpiCard label="System Integrity" value={`${dashboard.system_health_score}%`} icon="memory" status="Optimal" color="blue" />
           <TelemetryKpiCard label="Active Nodes" value={devices?.online || 0} icon="hub" status={`of ${devices?.online + devices?.idle + devices?.offline}`} color="indigo" />
           <TelemetryKpiCard label="Event Density" value={`${dashboard.events.rate_per_minute}/m`} icon="bolt" status="Last 24h" color="emerald" />
           <TelemetryKpiCard label="Registry Errors" value="0" icon="database" status="None Detected" color="rose" />
        </section>

        <div className="grid lg:grid-cols-12 gap-8">
           {/* Connected Devices Grid */}
           <div className="lg:col-span-8 space-y-8 animate-premium-in" style={{ animationDelay: '200ms' }}>
              <div className="flex items-center justify-between px-2">
                 <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-gray-100 flex items-center gap-2">
                    <span className="material-symbols-outlined text-blue-600 font-black">devices</span>
                    Active Edge Nodes
                 </h3>
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{devices?.online} Online</span>
              </div>
              
              <div className="grid sm:grid-cols-2 gap-6">
                 {devices?.devices.map((device, i) => (
                    <EdgeNodeCard key={device.node_id} device={device} />
                 ))}
                 <div className="border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-[32px] p-8 flex flex-col items-center justify-center text-center space-y-4 group hover:border-blue-600/30 transition-colors cursor-pointer">
                    <div className="size-12 rounded-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-300 group-hover:text-blue-600 group-hover:bg-blue-600/5 transition-all">
                       <span className="material-symbols-outlined text-3xl">add</span>
                    </div>
                    <div>
                       <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Enroll New Node</p>
                       <p className="text-[10px] font-bold text-slate-300 italic">Provision hardware ID</p>
                    </div>
                 </div>
              </div>
           </div>

           {/* Event Log & Alerts */}
           <div className="lg:col-span-4 space-y-8 animate-premium-in" style={{ animationDelay: '300ms' }}>
              <Card>
                 <CardHeader title="Real-time Stream" subtitle="Live ingestion audit log." icon="data_exploration" />
                 <CardBody className="p-0 overflow-hidden">
                    <div className="max-h-[500px] overflow-y-auto scrollbar-hide divide-y divide-slate-100 dark:divide-slate-800">
                       {events?.map((evt, i) => (
                          <EventLogItem key={evt.event_id} evt={evt} />
                       ))}
                    </div>
                 </CardBody>
              </Card>

              <Card className="bg-slate-900 border-rose-500/20">
                 <CardHeader title="Gateway Matrix" subtitle="Internal services status." />
                 <CardBody className="space-y-4">
                    <ServiceIndicator label="Neural Gateway" status="Active" />
                    <ServiceIndicator label="n8n Orchestrator" status="Active" />
                    <ServiceIndicator label="Registry Cache" status="Degraded" warning />
                 </CardBody>
              </Card>
           </div>
        </div>
      </main>
    </div>
  );
}

function TelemetryKpiCard({ label, value, icon, status, color }) {
  const themes = {
    blue: 'text-blue-600 bg-blue-600/5 border-blue-600/10 shadow-blue-600/5',
    indigo: 'text-indigo-600 bg-indigo-600/5 border-indigo-600/10 shadow-indigo-600/5',
    emerald: 'text-emerald-500 bg-emerald-500/5 border-emerald-500/10 shadow-emerald-500/5',
    rose: 'text-rose-600 bg-rose-600/5 border-rose-600/10 shadow-rose-600/5',
  };
  return (
    <Card className={`group hover:scale-[1.02] transition-all ${themes[color]}`}>
       <CardBody className="p-8 space-y-6">
          <div className="flex justify-between items-center">
             <div className="size-12 rounded-2xl bg-white dark:bg-slate-900 border border-current opacity-20 flex items-center justify-center">
                <span className="material-symbols-outlined font-black text-2xl">{icon}</span>
             </div>
             <span className="text-[10px] font-black uppercase tracking-widest text-current/60">{status}</span>
          </div>
          <div>
             <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">{label}</p>
             <h4 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter group-hover:text-current transition-colors">{value}</h4>
          </div>
       </CardBody>
    </Card>
  );
}

function EdgeNodeCard({ device }) {
  return (
    <Card className="relative overflow-hidden group">
       <div className={`absolute top-4 right-4 size-2 rounded-full animate-pulse ${device.status === 'online' ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]' : 'bg-amber-500'}`}></div>
       <CardBody className="p-8 space-y-6">
          <div className="flex gap-4">
             <div className="size-14 rounded-3xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-3xl grayscale group-hover:grayscale-0 transition-all border border-slate-100 dark:border-slate-800">
                {device.device_type === 'gateway' ? '🖥️' : device.device_type === 'sensor' ? '🌡️' : '🍓'}
             </div>
             <div className="space-y-1">
                <h4 className="text-lg font-black tracking-tight text-slate-800 dark:text-white leading-none">{device.node_id}</h4>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{device.device_name}</p>
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 space-y-1">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Events</p>
                <p className="text-sm font-black text-slate-800 dark:text-gray-100 tracking-tight">{device.event_count}</p>
             </div>
             <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 space-y-1">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Latency</p>
                <p className="text-sm font-black text-slate-800 dark:text-gray-100 tracking-tight">{device.seconds_since_last_seen}s</p>
             </div>
          </div>

          <div className="pt-4 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
             <button className="text-[10px] font-black uppercase text-blue-600">Diagnostics Remote</button>
             <span className="material-symbols-outlined text-slate-300 text-lg">chevron_right</span>
          </div>
       </CardBody>
    </Card>
  );
}

function EventLogItem({ evt }) {
  return (
    <div className="px-8 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors flex gap-4">
       <div className={`w-1 self-stretch rounded-full ${evt.event_type === 'telemetry' ? 'bg-blue-600' : 'bg-emerald-500'}`}></div>
       <div className="flex-1 space-y-1">
          <div className="flex justify-between items-center">
             <span className="text-[10px] font-black text-slate-800 dark:text-white uppercase tracking-widest">{evt.node}</span>
             <span className="text-[9px] font-bold text-slate-400 uppercase">{new Date(evt.received_at).toLocaleTimeString()}</span>
          </div>
          <p className="text-[11px] font-bold text-slate-500 leading-snug">
             Inbound <span className="text-blue-600">{evt.event_type}</span>: {Object.entries(evt.data).map(([k, v]) => `${k}=${v}`).join(', ')}
          </p>
       </div>
    </div>
  );
}

function ServiceIndicator({ label, status, warning }) {
  return (
    <div className="flex items-center justify-between p-4 bg-white/5 dark:bg-white/5 rounded-2xl border border-white/5">
       <div className="space-y-0.5">
          <p className="text-xs font-black text-white leading-none">{label}</p>
          <p className={`text-[9px] font-bold uppercase tracking-widest ${warning ? 'text-amber-500' : 'text-emerald-500'}`}>{status}</p>
       </div>
       <div className={`size-2 rounded-full ${warning ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'}`}></div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center space-y-6">
       <div className="size-16 relative">
          <div className="absolute inset-0 rounded-full border-4 border-blue-600/20 border-t-blue-600 animate-spin"></div>
       </div>
       <div className="text-center">
          <p className="text-sm font-black text-slate-800 dark:text-gray-100 uppercase tracking-widest">Handshaking Edge Network</p>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Acquiring Signal...</p>
       </div>
    </div>
  );
}
