import React, { useState } from 'react';

export function SettingsPage() {
  const [darkMode, setDarkMode] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [autoMapping, setAutoMapping] = useState(true);
  const [confidenceThreshold, setConfidenceThreshold] = useState(85);

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-background-light dark:bg-background-dark">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Settings</h1>
          <p className="text-slate-500 dark:text-slate-400">Manage your application preferences and configurations</p>
        </div>

        {/* Appearance Section */}
        <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm mb-6">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">palette</span>
              Appearance
            </h2>
          </div>
          <div className="p-6 space-y-6">
            <SettingToggle
              label="Dark Mode"
              description="Use dark theme throughout the application"
              enabled={darkMode}
              onToggle={() => setDarkMode(!darkMode)}
            />
          </div>
        </div>

        {/* Notifications Section */}
        <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm mb-6">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">notifications</span>
              Notifications
            </h2>
          </div>
          <div className="p-6 space-y-6">
            <SettingToggle
              label="Email Notifications"
              description="Receive email alerts for claim status updates"
              enabled={emailNotifications}
              onToggle={() => setEmailNotifications(!emailNotifications)}
            />
          </div>
        </div>

        {/* AI Configuration Section */}
        <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm mb-6">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">smart_toy</span>
              AI Configuration
            </h2>
          </div>
          <div className="p-6 space-y-6">
            <SettingToggle
              label="Automatic Mapping"
              description="Automatically map codes above the confidence threshold"
              enabled={autoMapping}
              onToggle={() => setAutoMapping(!autoMapping)}
            />
            
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">Confidence Threshold</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Minimum confidence for auto-mapping ({confidenceThreshold}%)</p>
              </div>
              <div className="w-48">
                <input
                  type="range"
                  min="50"
                  max="100"
                  value={confidenceThreshold}
                  onChange={(e) => setConfidenceThreshold(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>
            </div>
          </div>
        </div>

        {/* API Configuration Section */}
        <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm mb-6">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">api</span>
              API Configuration
            </h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-900 dark:text-white mb-1">
                n8n Webhook URL
              </label>
              <input
                type="text"
                placeholder="https://n8n.example.com/webhook/..."
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#182430] border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-900 dark:text-white mb-1">
                NPHIES Environment
              </label>
              <select className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#182430] border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50">
                <option value="sandbox">Sandbox (Testing)</option>
                <option value="production">Production</option>
              </select>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end gap-3">
          <button className="px-6 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-medium transition-colors">
            Reset to Defaults
          </button>
          <button className="px-6 py-2.5 rounded-lg bg-primary hover:bg-blue-600 text-white text-sm font-medium shadow-lg shadow-blue-500/20 transition-colors flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">save</span>
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

function SettingToggle({ label, description, enabled, onToggle }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-slate-900 dark:text-white">{label}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>
      </div>
      <button
        onClick={onToggle}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          enabled ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-600'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            enabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}
