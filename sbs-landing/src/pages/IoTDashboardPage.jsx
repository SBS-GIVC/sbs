import React, { useState, useEffect, useCallback } from 'react';
import { 
  Activity, Cpu, Wifi, WifiOff, AlertTriangle, Bell, 
  Check, Clock, RefreshCw, Server, Thermometer, 
  TrendingUp, Radio, ChevronRight, Settings, Zap
} from 'lucide-react';

// API service for IoT endpoints
const IoTService = {
  baseUrl: window.__API_CONFIG__?.baseUrl || '',
  
  async getDashboard() {
    const res = await fetch(`${this.baseUrl}/api/v1/iot/dashboard`);
    if (!res.ok) throw new Error('Failed to fetch dashboard');
    return res.json();
  },
  
  async getDevices() {
    const res = await fetch(`${this.baseUrl}/api/v1/iot/devices`);
    if (!res.ok) throw new Error('Failed to fetch devices');
    return res.json();
  },
  
  async getEvents(params = {}) {
    const queryParams = new URLSearchParams(params).toString();
    const res = await fetch(`${this.baseUrl}/api/v1/iot/events?${queryParams}`);
    if (!res.ok) throw new Error('Failed to fetch events');
    return res.json();
  },
  
  async getAlerts(params = {}) {
    const queryParams = new URLSearchParams(params).toString();
    const res = await fetch(`${this.baseUrl}/api/v1/iot/alerts?${queryParams}`);
    if (!res.ok) throw new Error('Failed to fetch alerts');
    return res.json();
  },
  
  async acknowledgeAlert(eventId) {
    const res = await fetch(`${this.baseUrl}/api/v1/iot/alerts/${eventId}/acknowledge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acknowledged_by: 'dashboard_user' })
    });
    if (!res.ok) throw new Error('Failed to acknowledge alert');
    return res.json();
  },
  
  async getStats() {
    const res = await fetch(`${this.baseUrl}/api/v1/iot/stats`);
    if (!res.ok) throw new Error('Failed to fetch stats');
    return res.json();
  }
};

// Status badge component
function StatusBadge({ status }) {
  const configs = {
    online: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', icon: Wifi },
    idle: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', icon: Clock },
    offline: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', icon: WifiOff },
    healthy: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', icon: Check },
    warning: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', icon: AlertTriangle },
    degraded: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', icon: AlertTriangle }
  };
  
  const config = configs[status] || configs.offline;
  const Icon = config.icon;
  
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      <Icon className="w-3.5 h-3.5" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// Severity badge for alerts
function SeverityBadge({ severity }) {
  const configs = {
    critical: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', ring: 'ring-red-500/20' },
    warning: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', ring: 'ring-amber-500/20' },
    info: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', ring: 'ring-blue-500/20' }
  };
  
  const config = configs[severity] || configs.info;
  
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ring-1 ${config.bg} ${config.text} ${config.ring}`}>
      {severity?.toUpperCase() || 'INFO'}
    </span>
  );
}

// Stats card component
function StatsCard({ title, value, subtitle, icon: Icon, trend, color = 'primary' }) {
  const colorClasses = {
    primary: 'from-primary/10 to-primary/5 border-primary/20',
    emerald: 'from-emerald-500/10 to-emerald-500/5 border-emerald-500/20',
    amber: 'from-amber-500/10 to-amber-500/5 border-amber-500/20',
    red: 'from-red-500/10 to-red-500/5 border-red-500/20',
    blue: 'from-blue-500/10 to-blue-500/5 border-blue-500/20'
  };
  
  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} border rounded-xl p-5 transition-all hover:shadow-lg`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
          <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{value}</p>
          {subtitle && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`p-3 rounded-xl bg-white/50 dark:bg-slate-800/50`}>
          <Icon className="w-6 h-6 text-slate-600 dark:text-slate-300" />
        </div>
      </div>
      {trend !== undefined && (
        <div className={`flex items-center gap-1 mt-3 text-xs ${trend >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
          <TrendingUp className={`w-3 h-3 ${trend < 0 ? 'rotate-180' : ''}`} />
          <span>{Math.abs(trend)}% from last hour</span>
        </div>
      )}
    </div>
  );
}

// Device card component
function DeviceCard({ device, onSelect }) {
  const typeIcons = {
    arduino: '🔌',
    esp32: '📡',
    raspberry_pi: '🍓',
    sensor: '🌡️',
    gateway: '🖥️',
    other: '📦'
  };
  
  return (
    <div 
      onClick={() => onSelect?.(device)}
      className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 cursor-pointer transition-all hover:shadow-lg hover:border-primary/50 group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="text-2xl">{typeIcons[device.device_type] || typeIcons.other}</div>
          <div>
            <h4 className="font-semibold text-slate-900 dark:text-white">{device.node_id}</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">{device.device_name || 'Unknown Device'}</p>
          </div>
        </div>
        <StatusBadge status={device.status} />
      </div>
      
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <span className="text-slate-500 dark:text-slate-400">Events</span>
          <p className="font-medium text-slate-900 dark:text-white">{device.event_count}</p>
        </div>
        <div>
          <span className="text-slate-500 dark:text-slate-400">Last Seen</span>
          <p className="font-medium text-slate-900 dark:text-white">
            {device.seconds_since_last_seen < 60 
              ? 'Just now' 
              : device.seconds_since_last_seen < 3600 
                ? `${Math.floor(device.seconds_since_last_seen / 60)}m ago`
                : `${Math.floor(device.seconds_since_last_seen / 3600)}h ago`
            }
          </p>
        </div>
      </div>
      
      <div className="mt-3 flex flex-wrap gap-1">
        {device.event_types?.slice(0, 3).map((type, i) => (
          <span key={i} className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-slate-600 dark:text-slate-300">
            {type}
          </span>
        ))}
      </div>
      
      <div className="mt-4 flex items-center text-primary text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
        View Details <ChevronRight className="w-4 h-4 ml-1" />
      </div>
    </div>
  );
}

// Event list component
function EventList({ events, onRefresh }) {
  const eventIcons = {
    heartbeat: <Activity className="w-4 h-4 text-emerald-500" />,
    telemetry: <Radio className="w-4 h-4 text-blue-500" />,
    alert: <AlertTriangle className="w-4 h-4 text-amber-500" />,
    status: <Server className="w-4 h-4 text-slate-500" />,
    error: <AlertTriangle className="w-4 h-4 text-red-500" />
  };
  
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
        <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" />
          Recent Events
        </h3>
        <button 
          onClick={onRefresh}
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4 text-slate-500" />
        </button>
      </div>
      
      <div className="max-h-80 overflow-y-auto">
        {events?.length === 0 ? (
          <div className="p-8 text-center text-slate-500 dark:text-slate-400">
            No events recorded yet
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {events?.map((event, i) => (
              <div key={event.event_id || i} className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {eventIcons[event.event_type] || eventIcons.status}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900 dark:text-white text-sm">{event.node}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">•</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">{event.event_type}</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {new Date(event.received_at).toLocaleTimeString()}
                    </p>
                    {event.data && Object.keys(event.data).length > 0 && (
                      <div className="mt-1 text-xs text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded px-2 py-1 inline-block">
                        {Object.entries(event.data).slice(0, 3).map(([k, v]) => `${k}: ${v}`).join(', ')}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Alert panel component
function AlertPanel({ alerts, onAcknowledge, loading }) {
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
        <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <Bell className="w-5 h-5 text-amber-500" />
          Active Alerts
          {alerts?.severity_summary?.critical > 0 && (
            <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse">
              {alerts.severity_summary.critical}
            </span>
          )}
        </h3>
      </div>
      
      <div className="max-h-80 overflow-y-auto">
        {alerts?.alerts?.length === 0 ? (
          <div className="p-8 text-center">
            <Check className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
            <p className="text-slate-500 dark:text-slate-400">No active alerts</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {alerts?.alerts?.slice(0, 10).map((alert, i) => (
              <div key={alert.event_id || i} className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-slate-900 dark:text-white text-sm">{alert.node}</span>
                      <SeverityBadge severity={alert.data?.severity || 'info'} />
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      {alert.data?.message || 'Alert triggered'}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {new Date(alert.received_at).toLocaleString()}
                    </p>
                  </div>
                  {!alert.data?.acknowledged && (
                    <button
                      onClick={() => onAcknowledge(alert.event_id)}
                      disabled={loading}
                      className="px-3 py-1.5 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors disabled:opacity-50"
                    >
                      Acknowledge
                    </button>
                  )}
                  {alert.data?.acknowledged && (
                    <span className="text-xs text-emerald-600 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Acked
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Main IoT Dashboard component
export function IoTDashboardPage() {
  const [dashboard, setDashboard] = useState(null);
  const [devices, setDevices] = useState(null);
  const [events, setEvents] = useState(null);
  const [alerts, setAlerts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [dashboardData, devicesData, eventsData, alertsData] = await Promise.all([
        IoTService.getDashboard(),
        IoTService.getDevices(),
        IoTService.getEvents({ limit: 50 }),
        IoTService.getAlerts({ limit: 20 })
      ]);
      
      setDashboard(dashboardData);
      setDevices(devicesData);
      setEvents(eventsData);
      setAlerts(alertsData);
      setLastRefresh(new Date());
      setError(null);
    } catch (err) {
      console.error('Failed to fetch IoT data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);
  
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  // Auto-refresh every 10 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);
  
  const handleAcknowledge = async (eventId) => {
    try {
      await IoTService.acknowledgeAlert(eventId);
      // Refresh alerts
      const alertsData = await IoTService.getAlerts({ limit: 20 });
      setAlerts(alertsData);
    } catch (err) {
      console.error('Failed to acknowledge alert:', err);
    }
  };
  
  const dashboardStats = dashboard?.dashboard || {};
  
  return (
    <div className="flex-1 overflow-auto p-6 bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-primary to-primary/70 rounded-xl">
                <Cpu className="w-6 h-6 text-white" />
              </div>
              IoT Monitoring Dashboard
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Real-time device monitoring and event streaming
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {lastRefresh && (
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Updated {lastRefresh.toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`p-2 rounded-lg transition-colors ${
                autoRefresh 
                  ? 'bg-primary/10 text-primary' 
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
              }`}
              title={autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
            >
              <Activity className={`w-5 h-5 ${autoRefresh ? 'animate-pulse' : ''}`} />
            </button>
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
        
        {error && (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
            <AlertTriangle className="w-5 h-5 inline-block mr-2" />
            {error}
          </div>
        )}
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatsCard
          title="System Health"
          value={dashboardStats.system_health_score || 100}
          subtitle={dashboardStats.status === 'healthy' ? 'All systems operational' : 'Attention required'}
          icon={Activity}
          color={dashboardStats.status === 'healthy' ? 'emerald' : 'amber'}
        />
        <StatsCard
          title="Active Devices"
          value={dashboardStats.nodes?.active_now || 0}
          subtitle={`of ${dashboardStats.nodes?.total || 0} registered`}
          icon={Cpu}
          color="blue"
        />
        <StatsCard
          title="Events (24h)"
          value={dashboardStats.events?.last_24h || 0}
          subtitle={`${dashboardStats.events?.rate_per_minute || 0}/min rate`}
          icon={Zap}
          color="primary"
        />
        <StatsCard
          title="Active Alerts"
          value={alerts?.severity_summary?.critical || 0}
          subtitle={`${alerts?.total || 0} total alerts`}
          icon={AlertTriangle}
          color={alerts?.severity_summary?.critical > 0 ? 'red' : 'emerald'}
        />
      </div>
      
      {/* Devices Grid */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Server className="w-5 h-5 text-primary" />
          Connected Devices
          <span className="ml-2 text-sm font-normal text-slate-500">
            ({devices?.online || 0} online, {devices?.idle || 0} idle, {devices?.offline || 0} offline)
          </span>
        </h2>
        
        {devices?.devices?.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-8 text-center">
            <Wifi className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-1">No Devices Connected</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
              Start your Arduino IoT Gateway to see devices here
            </p>
            <code className="text-xs bg-slate-100 dark:bg-slate-700 px-3 py-2 rounded-lg text-slate-600 dark:text-slate-300">
              python3 ~/sbs/arduino-iot-gateway/src/serial_gateway.py
            </code>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {devices?.devices?.map((device, i) => (
              <DeviceCard key={device.node_id || i} device={device} />
            ))}
          </div>
        )}
      </div>
      
      {/* Events and Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <EventList events={events?.events} onRefresh={fetchData} />
        <AlertPanel alerts={alerts} onAcknowledge={handleAcknowledge} loading={loading} />
      </div>
      
      {/* Event Type Distribution */}
      {dashboardStats.event_types && Object.keys(dashboardStats.event_types).length > 0 && (
        <div className="mt-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Event Distribution (24h)</h3>
          <div className="flex flex-wrap gap-4">
            {Object.entries(dashboardStats.event_types).map(([type, count]) => (
              <div key={type} className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700 rounded-lg px-4 py-2">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300 capitalize">{type}</span>
                <span className="text-lg font-bold text-slate-900 dark:text-white">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Gateway Status Footer */}
      <div className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
        <p>IoT Gateway Endpoint: <code className="bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">/api/v1/iot/events</code></p>
        <p className="mt-1">Arduino Gateway: <code className="bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">~/sbs/arduino-iot-gateway</code></p>
      </div>
    </div>
  );
}

export default IoTDashboardPage;
