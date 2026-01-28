import React, { useState } from 'react';
import { normalizeCode } from '../utils/middleware';

export function MappingRulesConfig() {
  const [testInput, setTestInput] = useState("Appy removal w/ complications");
  const [testResult, setTestResult] = useState({
      code: "Appendectomy (47562)",
      confidence: 92,
      status: "Auto-Accepted"
  });
  const [loading, setLoading] = useState(false);

  const handleSimulate = async () => {
    setLoading(true);
    try {
        const result = await normalizeCode("TEST_CODE", testInput);
        setTestResult({
            code: `${result.sbs_code} - ${result.desc.substring(0, 20)}...`,
            confidence: Math.round(result.confidence * 100),
            status: result.confidence > 0.85 ? "Auto-Accepted" : "Review Required"
        });
    } catch (e) {
        setTestResult({
            code: "Error",
            confidence: 0,
            status: "Failed"
        });
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="flex-1 w-full max-w-[1440px] mx-auto px-6 py-8 overflow-y-auto">
        {/* Page Heading */}
        <div className="flex flex-wrap justify-between gap-6 mb-8 items-end">
            <div className="flex flex-col gap-2">
                <h1 className="text-slate-900 dark:text-white text-3xl font-black leading-tight tracking-tight">Mapping Rules Configuration</h1>
                <p className="text-secondary-text text-base max-w-2xl">Manage AI normalization logic, confidence thresholds, and facility-specific override rules for claims processing.</p>
            </div>
            <div className="flex gap-3">
                <button onClick={() => alert("Version History (Mock)")} className="flex items-center gap-2 px-4 py-2 bg-surface-light dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <span className="material-symbols-outlined text-[18px]">history</span>
                    View Version History
                </button>
                <button onClick={() => alert("Defaults Reset.")} className="flex items-center gap-2 px-4 py-2 bg-surface-light dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-red-600">
                    <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                    Reset Defaults
                </button>
            </div>
        </div>

        {/* Main Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Global Thresholds & Logic */}
            <div className="lg:col-span-5 flex flex-col gap-6">
                {/* Global Thresholds Card */}
                <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-border-dark shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200 dark:border-border-dark flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">tune</span>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Global Thresholds</h3>
                        </div>
                        <span className="text-xs font-semibold px-2 py-1 rounded bg-blue-100 dark:bg-blue-900 text-primary dark:text-blue-300 uppercase tracking-wide">Active</span>
                    </div>
                    <div className="p-6 flex flex-col gap-8">
                        {/* Auto-Accept Slider */}
                        <div className="flex flex-col gap-3">
                            <div className="flex justify-between items-end">
                                <label className="text-sm font-medium text-slate-900 dark:text-gray-200">
                                    Auto-Accept Threshold
                                    <span className="block text-xs font-normal text-secondary-text mt-0.5">Confidence required to bypass review</span>
                                </label>
                                <div className="px-3 py-1 rounded-md bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-bold font-mono">85%</div>
                            </div>
                            <div className="relative h-6 flex items-center">
                                <input className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary focus:outline-none focus:ring-2 focus:ring-primary/50" max="100" min="0" type="range" defaultValue={85}/>
                            </div>
                        </div>
                        {/* Review Required Slider */}
                        <div className="flex flex-col gap-3">
                            <div className="flex justify-between items-end">
                                <label className="text-sm font-medium text-slate-900 dark:text-gray-200">
                                    Review Required Threshold
                                    <span className="block text-xs font-normal text-secondary-text mt-0.5">Minimum confidence for suggestion</span>
                                </label>
                                <div className="px-3 py-1 rounded-md bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 font-bold font-mono">50%</div>
                            </div>
                            <div className="relative h-6 flex items-center">
                                <input className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50" max="100" min="0" type="range" defaultValue={50}/>
                            </div>
                        </div>
                        {/* Visual Summary */}
                        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg text-sm border border-slate-200 dark:border-border-dark flex gap-3">
                            <span className="material-symbols-outlined text-secondary-text shrink-0">info</span>
                            <p className="text-secondary-text leading-snug">
                                Claims with <span className="font-bold text-slate-900 dark:text-white">50-84%</span> confidence will enter the <span className="font-medium text-orange-600 dark:text-orange-400">Human Review Queue</span>. Below 50% will be rejected automatically.
                            </p>
                        </div>
                    </div>
                </div>

                 {/* Logic Customization Card */}
                 <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-border-dark shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200 dark:border-border-dark flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">rule</span>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Logic Customization</h3>
                        </div>
                    </div>
                    <div className="p-0">
                         <ToggleItem label="Fuzzy Matching" subLabel="Enable approximate string matching for typos." defaultChecked={true} icon="help" />
                         <ToggleItem label="Priority to SBS V3.0" subLabel="Prefer newer Standard Body System ontology." defaultChecked={true} />
                         <ToggleItem label="Enforce ICD-10 Strict" subLabel="Require valid ICD-10 codes for surgical procedures." defaultChecked={false} />
                    </div>
                </div>
            </div>

            {/* Right Column: Facility Overrides & Test Rule */}
            <div className="lg:col-span-7 flex flex-col gap-6">
                 {/* Facility-Specific Overrides */}
                 <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-border-dark shadow-sm flex flex-col h-full min-h-[400px]">
                    <div className="px-6 py-4 border-b border-slate-200 dark:border-border-dark flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">domain_add</span>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Facility-Specific Overrides</h3>
                        </div>
                        <button className="flex items-center gap-1 text-sm font-bold text-primary hover:text-blue-600 transition-colors">
                            <span className="material-symbols-outlined text-lg">add</span>
                            Add Override
                        </button>
                    </div>
                    <div className="p-4 border-b border-slate-200 dark:border-border-dark bg-white dark:bg-surface-dark">
                        <div className="relative w-full">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary-text">search</span>
                            <input className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-slate-200 dark:border-border-dark rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all" placeholder="Search facilities by name or ID..." type="text"/>
                        </div>
                    </div>
                    <div className="flex-1 overflow-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-800/50 sticky top-0 z-10 text-secondary-text uppercase tracking-wider text-xs font-semibold">
                                <tr>
                                    <th className="px-6 py-3 font-medium">Facility</th>
                                    <th className="px-6 py-3 font-medium">Type</th>
                                    <th className="px-6 py-3 font-medium">Override Rule</th>
                                    <th className="px-6 py-3 font-medium text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-border-dark">
                                <OverrideRow name="City General Hospital" id="48291" type="Acute Care" ruleType="warning" ruleText="Threshold +5%" typeColor="purple" />
                                <OverrideRow name="North Surgical Center" id="99210" type="High Risk" ruleType="lock" ruleText="Force ICD-10" typeColor="red" iconColor="blue" />
                                <OverrideRow name="Valley View Clinic" id="11029" type="Outpatient" ruleType="do_not_disturb_on" ruleText="Ignore Typos" typeColor="green" iconColor="gray" />
                            </tbody>
                        </table>
                    </div>
                    <div className="px-6 py-3 border-t border-slate-200 dark:border-border-dark bg-gray-50 dark:bg-gray-900/30 text-xs text-secondary-text flex justify-center">
                        Showing 3 of 12 active overrides
                    </div>
                 </div>

                 {/* Test Playground */}
                 <div className="bg-gradient-to-br from-white to-blue-50 dark:from-surface-dark dark:to-slate-800/50 rounded-xl border border-slate-200 dark:border-border-dark shadow-sm">
                    <div className="px-6 py-4 border-b border-slate-200 dark:border-border-dark flex justify-between items-center">
                         <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">science</span>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Test Rule Playground</h3>
                        </div>
                    </div>
                    <div className="p-6 grid gap-6">
                        <div className="flex flex-col gap-2">
                             <label className="text-sm font-medium text-slate-900 dark:text-gray-200">Test Claim Description</label>
                             <div className="flex gap-3">
                                <input 
                                    className="flex-1 px-4 py-2.5 bg-white dark:bg-gray-800 border border-slate-200 dark:border-border-dark rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all shadow-sm" 
                                    placeholder="e.g. Appy removal w/ complications" 
                                    type="text" 
                                    value={testInput}
                                    onChange={(e) => setTestInput(e.target.value)}
                                />
                                <button 
                                    onClick={handleSimulate}
                                    disabled={loading}
                                    className="px-6 py-2 bg-primary hover:bg-blue-600 text-white font-semibold rounded-lg text-sm transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50"
                                >
                                     <span className="material-symbols-outlined text-lg">play_arrow</span>
                                     {loading ? 'Simulating...' : 'Simulate'}
                                </button>
                             </div>
                        </div>
                        {/* Results Card */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg border border-slate-200 dark:border-border-dark p-5 shadow-sm relative overflow-hidden">
                             <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${testResult.confidence > 85 ? 'bg-green-500' : 'bg-orange-500'}`}></div>
                             <div className="flex justify-between items-start mb-4">
                                <div>
                                    <p className="text-xs font-semibold text-secondary-text uppercase tracking-wide mb-1">Predicted Code</p>
                                    <p className="text-xl font-bold text-slate-900 dark:text-white animate-pulse-once">{testResult.code}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-semibold text-secondary-text uppercase tracking-wide mb-1">Confidence Score</p>
                                    <p className={`text-xl font-black ${testResult.confidence > 85 ? 'text-green-600 dark:text-green-400' : 'text-orange-500'}`}>{testResult.confidence}%</p>
                                </div>
                             </div>
                             <div className="flex items-center gap-2 pt-4 border-t border-slate-200 dark:border-border-dark">
                                <span className={`flex size-6 items-center justify-center rounded-full ${testResult.confidence > 85 ? 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400' : 'bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-400'}`}>
                                    <span className="material-symbols-outlined text-sm">{testResult.confidence > 85 ? 'check' : 'priority_high'}</span>
                                </span>
                                <p className="text-sm text-slate-900 dark:text-gray-200">
                                    Status: <span className="font-bold">{testResult.status}</span> {testResult.confidence > 85 ? '(Above 85% threshold)' : '(Below 85%)'}
                                </p>
                             </div>
                        </div>
                    </div>
                 </div>
            </div>
        </div>
    </div>
  );
}

function ToggleItem({ label, subLabel, defaultChecked, icon }) {
    return (
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-border-dark last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-900 dark:text-white">{label}</span>
                    {icon && <span className="material-symbols-outlined text-base text-secondary-text cursor-help" title={label}>help</span>}
                </div>
                <span className="text-xs text-secondary-text">{subLabel}</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
                <input defaultChecked={defaultChecked} className="sr-only peer" type="checkbox"/>
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 dark:peer-focus:ring-primary/40 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
            </label>
        </div>
    )
}

function OverrideRow({ name, id, type, ruleType, ruleText, typeColor, iconColor }) {
    const bgColors = {
        purple: "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300",
        red: "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300",
        green: "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
    };

    const iconColors = {
        orange: "text-orange-500",
        blue: "text-blue-500",
        gray: "text-gray-500"
    };

    // simplified dynamic class access
    const typeClass = bgColors[typeColor] || bgColors.purple;
    const ruleIconClass = iconColor === 'blue' ? 'text-blue-500' : iconColor === 'gray' ? 'text-gray-500' : 'text-orange-500';

    return (
        <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
            <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex flex-col">
                    <span className="font-medium text-slate-900 dark:text-white">{name}</span>
                    <span className="text-xs text-secondary-text">ID: {id}</span>
                </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${typeClass}`}>
                    {type}
                </span>
            </td>
            <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                    <span className={`material-symbols-outlined ${ruleIconClass} text-sm`}>{ruleType}</span>
                    <span className="text-slate-900 dark:text-gray-200">{ruleText}</span>
                </div>
            </td>
            <td className="px-6 py-4 text-right">
                <button className="text-secondary-text hover:text-primary transition-colors">
                    <span className="material-symbols-outlined text-lg">edit</span>
                </button>
            </td>
        </tr>
    )
}
