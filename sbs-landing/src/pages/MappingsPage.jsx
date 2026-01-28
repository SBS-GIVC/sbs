import React from 'react';

export function MappingsPage() {
  return (
    <div className="flex-1 overflow-y-auto p-6 scroll-smooth bg-background-light dark:bg-background-dark">
        <div className="max-w-[1400px] mx-auto flex flex-col gap-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Total Claims Processed" value="142,890" trend="12%" isUp={true} isSuccess={true} icon="topic" />
                <StatCard title="Auto-Mapping Rate" value="94.2%" trend="2.4%" isUp={true} isSuccess={true} icon="smart_toy" />
                <StatCard title="Validation Pass Rate" value="98.5%" trend="0.5%" isUp={true} isSuccess={true} icon="check_circle" />
                <StatCard title="Avg Processing Time" value="1.2s" trend="0.1s" isUp={false} isSuccess={true} icon="timer" isWarning={true} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-surface-dark p-6 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                        <div>
                            <h3 className="text-slate-900 dark:text-white text-lg font-semibold leading-tight">Mapping Accuracy Trends</h3>
                            <p className="text-secondary-text text-sm mt-1">Comparison: Auto-Maps vs Manual Adjustments</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <LegendDot color="bg-primary" label="Auto-Maps" />
                            <LegendDot color="bg-orange-500" label="Manual Review" />
                        </div>
                    </div>
                    <div className="relative w-full h-[280px] mt-2 flex items-center justify-center border border-dashed border-slate-700 rounded bg-slate-900/50">
                        <span className="text-slate-500 text-sm">Chart Visualization Placeholder</span>
                    </div>
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-surface-dark p-6 shadow-sm flex flex-col">
                    <h3 className="text-slate-900 dark:text-white text-lg font-semibold leading-tight mb-6">Error Distribution</h3>
                    <div className="flex-1 flex flex-col items-center justify-center gap-6">
                        <div className="relative size-48 rounded-full shadow-lg border-8 border-slate-800 flex items-center justify-center">
                             <div className="text-center">
                                <p className="text-secondary-text text-sm font-medium">Total Errors</p>
                                <p className="text-slate-900 dark:text-white text-3xl font-bold">842</p>
                             </div>
                        </div>
                        <div className="w-full grid grid-cols-1 gap-3 mt-2">
                             <LegendBar color="bg-blue-500" label="Missing ICD-10" percent="45%" />
                             <LegendBar color="bg-orange-500" label="Schema Mismatch" percent="30%" />
                             <LegendBar color="bg-red-500" label="Invalid Internal Code" percent="25%" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-surface-dark overflow-hidden shadow-sm">
                <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                    <h3 className="text-slate-900 dark:text-white text-lg font-semibold">Top Facilities by Accuracy</h3>
                    <button className="text-primary text-sm font-medium hover:text-primary/80">View All</button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-[#111a22] border-b border-slate-200 dark:border-slate-800">
                                <Th>Facility Name</Th>
                                <Th>Region</Th>
                                <Th align="right">Volume</Th>
                                <Th>Mapping Accuracy</Th>
                                <Th align="right">Action</Th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                            <FacilityRow name="Mercy General Hospital" code="MG" region="North America" volume="12,405" accuracy={98} color="primary" />
                            <FacilityRow name="St. Jude Medical Center" code="SJ" region="Europe West" volume="8,230" accuracy={95} color="indigo" />
                            <FacilityRow name="Central Health Clinic" code="CH" region="Asia Pacific" volume="5,102" accuracy={82} color="orange" isWarning />
                            <FacilityRow name="Valley Heights Info" code="VH" region="North America" volume="3,890" accuracy={91} color="pink" />
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
  );
}

function StatCard({ title, value, trend, isUp, isSuccess, isWarning, icon }) {
    const iconColor = isWarning ? 'text-orange-500' : 'text-primary';
    const iconBg = isWarning ? 'bg-orange-500/10' : 'bg-primary/10';
    const trendColor = isSuccess ? 'text-green-500' : 'text-red-500';

    return (
       <div className="flex flex-col gap-2 rounded-xl p-5 border border-slate-200 dark:border-slate-800 bg-surface-dark shadow-sm">
            <div className="flex items-center justify-between">
                <p className="text-secondary-text text-sm font-medium">{title}</p>
                <span className={`material-symbols-outlined ${iconColor} ${iconBg} p-1.5 rounded-md`}>{icon}</span>
            </div>
            <div className="flex items-end gap-2 mt-1">
                <p className="text-slate-900 dark:text-white text-2xl font-bold leading-tight">{value}</p>
                <span className={`flex items-center ${trendColor} text-xs font-medium mb-1 bg-green-500/10 px-1.5 py-0.5 rounded`}>
                    <span className="material-symbols-outlined text-[14px] mr-0.5">{isUp ? 'trending_up' : 'trending_down'}</span> {trend}
                </span>
            </div>
        </div>
    )
}

function LegendDot({ color, label }) {
    return (
        <div className="flex items-center gap-2">
            <div className={`size-3 rounded-full ${color}`}></div>
            <span className="text-secondary-text text-xs font-medium">{label}</span>
        </div>
    )
}

function LegendBar({ color, label, percent }) {
    return (
        <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-[#111a22]/50 border border-slate-200 dark:border-slate-800/50">
            <div className="flex items-center gap-2">
                <div className={`size-3 rounded-full ${color}`}></div>
                <span className="text-secondary-text text-xs font-medium">{label}</span>
            </div>
            <span className="text-slate-900 dark:text-white text-xs font-bold">{percent}</span>
        </div>
    )
}

function Th({ children, align }) {
    return (
        <th className={`p-4 text-secondary-text text-xs font-semibold uppercase tracking-wider ${align === 'right' ? 'text-right' : ''}`}>
            {children}
        </th>
    )
}

function FacilityRow({ name, code, region, volume, accuracy, color, isWarning }) {
    const barColor = isWarning ? 'bg-orange-500' : 'bg-green-500';
    const textColor = isWarning ? 'text-orange-500' : 'text-green-500';
    const bgColors = {
        primary: 'bg-primary/20 text-primary',
        indigo: 'bg-indigo-500/20 text-indigo-400',
        orange: 'bg-orange-500/20 text-orange-400',
        pink: 'bg-pink-500/20 text-pink-400'
    };
    return (
        <tr className="group hover:bg-slate-50 dark:hover:bg-[#233648] transition-colors cursor-pointer">
            <td className="p-4">
                <div className="flex items-center gap-3">
                    <div className={`size-8 rounded flex items-center justify-center font-bold text-xs ${bgColors[color]}`}>{code}</div>
                    <span className="text-slate-900 dark:text-white text-sm font-medium">{name}</span>
                </div>
            </td>
            <td className="p-4 text-secondary-text text-sm">{region}</td>
            <td className="p-4 text-slate-900 dark:text-white text-sm font-medium text-right">{volume}</td>
            <td className="p-4">
                <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-slate-200 dark:bg-[#111a22] rounded-full overflow-hidden w-24">
                        <div className={`h-full ${barColor} rounded-full`} style={{ width: `${accuracy}%` }}></div>
                    </div>
                    <span className={`${textColor} text-sm font-bold`}>{accuracy}%</span>
                </div>
            </td>
            <td className="p-4 text-right">
                <button className="p-1 rounded hover:bg-slate-200 dark:hover:bg-[#324d67] text-secondary-text group-hover:text-white transition-colors">
                    <span className="material-symbols-outlined text-lg">more_vert</span>
                </button>
            </td>
        </tr>
    )
}
