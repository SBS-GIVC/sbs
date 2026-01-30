import React from 'react';

export function DashboardPage() {
  return (
    <>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-8 pb-0">
            <StatCard 
                title="Total Claims Processed" 
                value="1,240" 
                trend="12%" 
                trendUp={true} 
                icon="dataset" 
                iconColor="text-primary" 
                iconBg="bg-primary/10" 
            />
            <StatCard 
                title="Auto-Mapped Rate" 
                value="94%" 
                trend="2%" 
                trendUp={true} 
                icon="auto_fix_high" 
                iconColor="text-primary" 
                iconBg="bg-primary/10" 
            />
            <StatCard 
                title="Pending Validation" 
                value="45" 
                trend="5%" 
                trendUp={false} 
                icon="hourglass_top" 
                iconColor="text-orange-500" 
                iconBg="bg-orange-500/10" 
            />
            <StatCard 
                title="Critical Errors" 
                value="3" 
                trend="1%" 
                trendUp={true} 
                trendBad={true}
                icon="error" 
                iconColor="text-red-500" 
                iconBg="bg-red-500/10" 
            />
        </div>

        <div className="p-8">
            <div className="relative group cursor-pointer mb-8">
                <div className="absolute inset-0 bg-primary/5 dark:bg-primary/5 rounded-xl border-2 border-dashed border-primary/30 dark:border-primary/20 group-hover:border-primary/60 transition-colors"></div>
                <div className="relative flex flex-col items-center justify-center py-10 px-4 text-center">
                    <div className="size-12 rounded-full bg-surface-light dark:bg-[#111a22] shadow-sm flex items-center justify-center mb-4 text-primary">
                        <span className="material-symbols-outlined text-3xl">cloud_upload</span>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">Upload Claim Batch</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md">Drag & drop your files here or click to browse. System supports standard JSON schemas <span className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300">FHIR R4</span> / <span className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300">HL7 v2</span></p>
                    <button className="mt-4 px-4 py-2 bg-primary hover:bg-primary/90 text-white text-sm font-medium rounded-lg shadow-sm transition-colors">
                        Select Files
                    </button>
                </div>
            </div>

            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Recent Claims Data</h2>
                    <div className="flex gap-2">
                        <ActionButton icon="filter_list" label="Filter" />
                        <ActionButton icon="download" label="Export" />
                    </div>
                </div>
                <div className="w-full overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-surface-light dark:bg-surface-dark shadow-sm">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#151e29]">
                                <Th>Internal Code</Th>
                                <Th>Description</Th>
                                <Th>AI Suggested SBS</Th>
                                <Th>Confidence Score</Th>
                                <Th>Status</Th>
                                <Th align="right">Actions</Th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                             <TableRow 
                                code="CLM-2023-889"
                                desc="Fracture of radius, closed"
                                sbs="47903-00-00"
                                confidence={98}
                                status="mapped"
                             />
                             <TableRow 
                                code="CLM-2023-890"
                                desc="Chest pain, unspecified"
                                sbs="11700-00-00"
                                confidence={72}
                                status="pending"
                             />
                             <TableRow 
                                code="CLM-2023-891"
                                desc="Appendectomy, laparoscopic"
                                sbs="30571-00-00"
                                confidence={95}
                                status="mapped"
                             />
                             <TableRow 
                                code="CLM-2023-892"
                                desc="Routine general medical exam"
                                sbs="10951-00-00"
                                confidence={95}
                                status="mapped"
                             />
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </>
  );
}

function StatCard({ title, value, trend, trendUp, trendBad, icon, iconColor, iconBg }) {
    const trendColor = trendBad ? 'text-red-500' : 'text-green-500';
    return (
        <div className="p-5 rounded-xl bg-surface-light dark:bg-surface-dark border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex justify-between items-start mb-4">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
                <span className={`material-symbols-outlined ${iconColor} ${iconBg} p-1 rounded-md text-[20px]`}>{icon}</span>
            </div>
            <div className="flex items-end gap-3">
                <p className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{value}</p>
                <span className={`text-xs font-medium ${trendColor} mb-1.5 flex items-center`}>
                    <span className="material-symbols-outlined text-[16px]">{trendUp ? 'trending_up' : 'trending_down'}</span> {trend}
                </span>
            </div>
        </div>
    )
}

function ActionButton({ icon, label }) {
    return (
        <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-[#1c2630] border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-[#253240] transition-colors">
            <span className="material-symbols-outlined text-[18px]">{icon}</span>
            {label}
        </button>
    )
}

function Th({ children, align }) {
    return (
        <th className={`p-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 ${align === 'right' ? 'text-right' : ''}`}>
            {children}
        </th>
    )
}

function TableRow({ code, desc, sbs, confidence, status }) {
    let statusClass = "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400";
    let statusLabel = "Mapped";
    let statusDot = "bg-green-500";
    let progressColor = "bg-green-500";
    
    if (status === 'pending') {
        statusClass = "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400";
        statusLabel = "Pending Review";
        statusDot = "bg-yellow-500";
        progressColor = "bg-yellow-400";
    } else if (status === 'error') {
        statusClass = "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400 border border-transparent hover:border-red-200 dark:hover:border-red-800 transition-colors";
        statusLabel = "Validation Failure";
        progressColor = "bg-red-500";
    }

    const isError = status === 'error';

    return (
        <tr className={`group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${isError ? 'bg-red-50/30 dark:bg-red-900/5' : ''}`}>
            <td className="p-4 font-mono text-sm text-slate-600 dark:text-slate-300">{code}</td>
            <td className="p-4 text-sm font-medium text-slate-900 dark:text-white">{desc}</td>
            <td className={`p-4 font-mono text-sm ${sbs === '--' ? 'text-slate-400 italic' : 'text-primary'}`}>{sbs}</td>
            <td className="p-4 align-middle">
                <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden w-24">
                        <div className={`h-full ${progressColor} rounded-full`} style={{ width: `${confidence}%` }}></div>
                    </div>
                    <span className={`text-xs font-medium ${confidence === 0 ? 'text-slate-400' : 'text-slate-700 dark:text-slate-300'}`}>
                        {confidence > 0 ? `${confidence}%` : 'N/A'}
                    </span>
                </div>
            </td>
            <td className="p-4 relative">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusClass} ${isError ? 'cursor-help' : ''}`}>
                     {!isError ? <span className={`size-1.5 rounded-full ${statusDot}`}></span> : <span className="material-symbols-outlined text-[14px]">report</span>}
                     {statusLabel}
                </span>
            </td>
            <td className="p-4 text-right">
                <button className={`transition-colors ${isError ? 'text-slate-400 hover:text-red-500' : 'text-slate-400 hover:text-primary'}`}>
                    <span className="material-symbols-outlined text-[20px]">{isError ? 'edit_note' : 'more_vert'}</span>
                </button>
            </td>
        </tr>
    )
}
