import React from 'react';

export function FacilityPerformanceReport() {
  return (
    <div className="flex-1 flex flex-col overflow-hidden h-full bg-background-light dark:bg-background-dark">
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
            <div className="max-w-[1600px] mx-auto flex flex-col gap-6">
                {/* Header & Filters */}
                <div className="flex flex-col gap-6">
                    <div className="flex flex-wrap justify-between items-end gap-4">
                        <div className="flex flex-col gap-1">
                            <h1 className="text-slate-900 dark:text-white text-3xl font-bold tracking-tight">Facility Performance Comparison</h1>
                            <p className="text-secondary-text text-sm">Analyze and compare operational metrics across network hospitals.</p>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => alert("Report Exported to CSV.")} className="flex items-center gap-2 h-10 px-4 bg-surface-dark border border-border-dark rounded-lg text-white text-sm font-medium hover:bg-border-dark transition-colors">
                                <span className="material-symbols-outlined text-[18px]">download</span>
                                <span>Export Report</span>
                            </button>
                            <button onClick={() => window.location.reload()} className="flex items-center gap-2 h-10 px-4 bg-primary text-white rounded-lg text-sm font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-colors">
                                <span className="material-symbols-outlined text-[18px]">refresh</span>
                                <span>Refresh Data</span>
                            </button>
                        </div>
                    </div>
                    {/* Filter Bar */}
                    <div className="p-4 bg-surface-dark border border-border-dark rounded-xl flex flex-wrap gap-4 items-center">
                        <div className="flex flex-col gap-1.5 min-w-[200px] flex-1">
                            <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">Date Range</label>
                            <div className="relative">
                                <select className="w-full h-10 bg-background-dark border border-border-dark rounded-lg px-3 text-sm text-white appearance-none focus:ring-1 focus:ring-primary focus:border-primary">
                                    <option>Last 30 Days</option>
                                    <option>Last Quarter</option>
                                    <option>Year to Date</option>
                                </select>
                                <span className="material-symbols-outlined absolute right-3 top-2.5 text-text-secondary pointer-events-none text-[20px]">calendar_today</span>
                            </div>
                        </div>
                        <div className="flex flex-col gap-1.5 min-w-[200px] flex-1">
                            <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">Facility Type</label>
                            <div className="relative">
                                <select className="w-full h-10 bg-background-dark border border-border-dark rounded-lg px-3 text-sm text-white appearance-none focus:ring-1 focus:ring-primary focus:border-primary">
                                    <option>All Facility Types</option>
                                    <option>General Hospital</option>
                                    <option>Specialized Clinic</option>
                                    <option>Pharmacy</option>
                                </select>
                                <span className="material-symbols-outlined absolute right-3 top-2.5 text-text-secondary pointer-events-none text-[20px]">expand_more</span>
                            </div>
                        </div>
                        <div className="flex flex-col gap-1.5 min-w-[200px] flex-1">
                            <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">Region</label>
                            <div className="relative">
                                <select className="w-full h-10 bg-background-dark border border-border-dark rounded-lg px-3 text-sm text-white appearance-none focus:ring-1 focus:ring-primary focus:border-primary">
                                    <option>All Regions</option>
                                    <option>Riyadh Region</option>
                                    <option>Jeddah Region</option>
                                    <option>Eastern Province</option>
                                </select>
                                <span className="material-symbols-outlined absolute right-3 top-2.5 text-text-secondary pointer-events-none text-[20px]">location_on</span>
                            </div>
                        </div>
                        <div className="flex flex-col gap-1.5 w-full sm:w-auto self-end">
                            <button className="h-10 px-6 bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 rounded-lg text-sm font-semibold transition-colors">Apply Filters</button>
                        </div>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <KpiCard title="Network Avg Accuracy" value="94%" trend="2.1%" isUp={true} color="emerald" />
                    <KpiCard title="Total Claims Processed" value="12,450" trend="8.4%" isUp={true} color="emerald" />
                    <KpiCard title="Avg Failure Rate" value="3.2%" trend="0.5%" isUp={true} color="red" /> {/* Higher failure is 'up' trend but bad, handled by color logic ideally */}
                    <KpiCard title="Avg Resolve Time" value="8m 12s" trend="12s" isUp={false} color="emerald" />
                </div>

                {/* Split Content Area */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    {/* Left Column: Data Table */}
                    <div className="xl:col-span-2 flex flex-col rounded-xl border border-border-dark bg-surface-dark overflow-hidden shadow-sm">
                         <div className="px-6 py-4 border-b border-border-dark flex justify-between items-center">
                            <h3 className="text-white text-base font-bold">Facility Metrics Detail</h3>
                            <button className="p-2 hover:bg-background-dark rounded-lg text-text-secondary transition-colors">
                                <span className="material-symbols-outlined text-[20px]">more_horiz</span>
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-background-dark/50 border-b border-border-dark">
                                        <Th width="25%">Facility Name/ID</Th>
                                        <Th width="15%">Claims</Th>
                                        <Th width="30%">Auto-Mapping Acc.</Th>
                                        <Th width="15%">Failure Rate</Th>
                                        <Th width="15%">Resolve Time</Th>
                                        <th className="px-4 py-4 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border-dark">
                                    <FacilityRow name="King Salman Hospital" id="HOSP-RIY-001" claims="1,240" accuracy={98} failure="1.2%" time="4m" />
                                    <FacilityRow name="Jeddah Specialized Clinic" id="CLINIC-JED-05" claims="850" accuracy={92} failure="4.5%" time="12m" barColor="bg-primary/80" />
                                    <FacilityRow name="Dammam Central" id="HOSP-DAM-02" claims="3,100" accuracy={85} failure="12%" time="24m" isWarning barColor="bg-yellow-500" />
                                    <FacilityRow name="Al-Amal Medical Center" id="MED-CENTER-09" claims="1,050" accuracy={95} failure="2.1%" time="6m" />
                                    <FacilityRow name="North Region Hospital" id="HOSP-NORTH-04" claims="2,200" accuracy={91} failure="5.6%" time="15m" barColor="bg-primary/80" />
                                </tbody>
                            </table>
                        </div>
                        <div className="px-6 py-4 border-t border-border-dark flex justify-between items-center bg-background-dark/20">
                            <span className="text-text-secondary text-xs">Showing 1-5 of 24 facilities</span>
                            <div className="flex gap-2">
                                <button className="px-3 py-1 text-xs font-medium text-text-secondary hover:text-white hover:bg-border-dark rounded transition-colors disabled:opacity-50">Previous</button>
                                <button className="px-3 py-1 text-xs font-medium text-text-secondary hover:text-white hover:bg-border-dark rounded transition-colors">Next</button>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Charts & Insights */}
                    <div className="flex flex-col gap-6">
                        {/* Vertical Bar Chart Placeholder (Visual Code was complex, simplifying for React) */}
                        <div className="rounded-xl border border-border-dark bg-surface-dark p-6 shadow-sm flex flex-col h-[320px]">
                            <div className="flex justify-between items-start mb-6">
                                <h3 className="text-white text-base font-bold">Top 5 Auto-Mapping Rates</h3>
                                <button className="text-text-secondary hover:text-white">
                                    <span className="material-symbols-outlined text-[20px]">filter_list</span>
                                </button>
                            </div>
                            <div className="flex-1 flex items-end justify-between gap-2 px-2 pb-2 border-b border-border-dark/50">
                                <Bar height="98%" label="RIY-001" val="98%" color="bg-primary" />
                                <Bar height="95%" label="MED-09" val="95%" color="bg-primary/80" />
                                <Bar height="92%" label="JED-05" val="92%" color="bg-primary/70" />
                                <Bar height="91%" label="NTH-04" val="91%" color="bg-primary/60" />
                                <Bar height="85%" label="DAM-02" val="85%" color="bg-yellow-500" />
                            </div>
                        </div>

                        {/* AI Insights Card */}
                        <div className="relative overflow-hidden rounded-xl border border-primary/30 bg-gradient-to-br from-surface-dark to-primary/5 p-6 shadow-md">
                            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-primary/10 blur-xl"></div>
                            <div className="flex items-start gap-4">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                    <span className="material-symbols-outlined">auto_awesome</span>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Comparative Insights</h3>
                                    <p className="text-sm leading-relaxed text-gray-300">
                                        <span className="font-semibold text-white">HOSP-DAM-02</span> has a <span className="text-red-400 font-medium">15% higher error rate</span> compared to the network average. AI analysis indicates this is primarily driven by missing <span className="text-white bg-white/10 px-1 rounded">ICD-10</span> codes in ER admissions.
                                    </p>
                                    <div className="mt-2 flex gap-3">
                                        <button className="text-xs font-medium text-primary hover:text-white transition-colors">View Root Cause Analysis →</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
}

function KpiCard({ title, value, trend, isUp, color }) {
    const trendTextColor = color === 'red' ? 'text-red-400' : 'text-emerald-400';
    const trendBgColor = color === 'red' ? 'bg-red-400/10' : 'bg-emerald-400/10';
    
    return (
        <div className="flex flex-col gap-2 rounded-xl border border-border-dark bg-surface-dark p-5 shadow-sm">
            <h3 className="text-text-secondary text-sm font-medium">{title}</h3>
            <div className="flex items-baseline gap-2">
                <span className="text-white text-3xl font-bold">{value}</span>
                <span className={`${trendTextColor} text-xs font-medium flex items-center ${trendBgColor} px-1.5 py-0.5 rounded`}>
                    <span className="material-symbols-outlined text-[14px] mr-0.5">{isUp ? 'trending_up' : 'trending_down'}</span> {trend}
                </span>
            </div>
        </div>
    )
}

function Th({ children, width }) {
    return (
        <th className="px-6 py-4 text-xs font-medium text-text-secondary uppercase tracking-wider" style={{ width }}>
            {children}
        </th>
    )
}

function FacilityRow({ name, id, claims, accuracy, failure, time, barColor = "bg-primary", isWarning }) {
    return (
        <tr className={`group hover:bg-background-dark/30 transition-colors ${isWarning ? 'border-l-4 border-l-red-500 bg-red-500/5' : ''}`}>
            <td className="px-6 py-3">
                <div className="flex flex-col">
                    <span className="text-white text-sm font-semibold">{name}</span>
                    <span className="text-text-secondary text-xs">{id}</span>
                </div>
            </td>
            <td className="px-6 py-3 text-white text-sm tabular-nums">{claims}</td>
            <td className="px-6 py-3">
                <div className="flex items-center gap-3">
                    <span className="text-white text-sm font-medium w-8 text-right">{accuracy}%</span>
                    <div className="flex-1 h-2 bg-background-dark rounded-full overflow-hidden">
                        <div className={`h-full ${barColor} rounded-full`} style={{ width: `${accuracy}%` }}></div>
                    </div>
                </div>
            </td>
            <td className={`px-6 py-3 ${isWarning ? 'text-red-400 font-bold' : 'text-text-secondary'} text-sm tabular-nums`}>{failure}</td>
            <td className="px-6 py-3 text-text-secondary text-sm tabular-nums">{time}</td>
            <td className="px-4 py-3 text-right">
                <button className="text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity hover:text-white">
                    <span className="material-symbols-outlined text-[20px]">more_vert</span>
                </button>
            </td>
        </tr>
    )
}

function Bar({ height, label, val, color }) {
    return (
        <div className="flex flex-col items-center gap-2 group w-1/5">
            <div className="text-xs text-white font-bold opacity-0 group-hover:opacity-100 transition-opacity mb-1">{val}</div>
            <div className="w-full bg-border-dark/30 rounded-t-sm h-40 relative group-hover:bg-border-dark/50 transition-colors">
                <div className={`absolute bottom-0 w-full ${color} rounded-t-sm transition-all duration-500`} style={{ height }}></div>
            </div>
            <span className="text-[10px] text-text-secondary uppercase truncate max-w-full text-center">{label}</span>
        </div>
    )
}
