import React from 'react';
import { useToast } from '../components/Toast';
import { Button } from '../components/ui/Button';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { SectionHeader } from '../components/ui/SectionHeader';

export function DashboardPage() {
  const toast = useToast();

  const handleAction = (action) => {
    toast.info(`${action} is ready for integration.`);
  };

  return (
    <>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6 px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-0 animate-slide-up">
            <StatCard 
                title="Total Claims Processed" 
                value="1,240" 
                trend="12%" 
                trendUp={true} 
                icon="dataset" 
                iconColor="text-primary" 
                iconBg="bg-gradient-to-br from-primary/20 to-primary/10" 
                delay="0"
            />
            <StatCard 
                title="Auto-Mapped Rate" 
                value="94%" 
                trend="2%" 
                trendUp={true} 
                icon="auto_fix_high" 
                iconColor="text-emerald-500" 
                iconBg="bg-gradient-to-br from-emerald-500/20 to-emerald-500/10" 
                delay="100"
            />
            <StatCard 
                title="Pending Validation" 
                value="45" 
                trend="5%" 
                trendUp={false} 
                icon="hourglass_top" 
                iconColor="text-orange-500" 
                iconBg="bg-gradient-to-br from-orange-500/20 to-orange-500/10" 
                delay="200"
            />
            <StatCard 
                title="Critical Errors" 
                value="3" 
                trend="1%" 
                trendUp={true} 
                trendBad={true}
                icon="error" 
                iconColor="text-red-500" 
                iconBg="bg-gradient-to-br from-red-500/20 to-red-500/10" 
                delay="300"
            />
        </div>

        <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6 mb-6">
                <Card className="xl:col-span-2 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent"></div>
                    <CardBody className="relative">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="size-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 shadow-medium flex items-center justify-center text-primary">
                                    <span className="material-symbols-outlined text-3xl">cloud_upload</span>
                                </div>
                                <div>
                                    <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Upload Claim Batch</h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">FHIR R4 / HL7 v2 supported</p>
                                </div>
                            </div>
                            <Button icon="upload_file" onClick={() => handleAction('Upload claims')}>
                                Select Files
                            </Button>
                        </div>
                    </CardBody>
                </Card>
                <Card>
                    <CardBody>
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Priority Workflows</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Live service health</p>
                            </div>
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">Operational</span>
                        </div>
                        <div className="space-y-3">
                            {['Eligibility Verification', 'Prior Authorization', 'Claims Normalization'].map((service, idx) => (
                                <div key={service} className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#1b2530] border border-slate-200 dark:border-slate-700">
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-[18px] text-primary">verified</span>
                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{service}</span>
                                    </div>
                                    <span className="text-xs font-semibold text-emerald-600">99%</span>
                                </div>
                            ))}
                        </div>
                    </CardBody>
                </Card>
            </div>

            <Card>
                <CardHeader
                    title="Recent Claims Data"
                    subtitle="Real-time claim throughput with AI mapping confidence"
                    action={
                        <div className="flex flex-wrap gap-2">
                            <Button variant="secondary" icon="filter_list" onClick={() => handleAction('Filter')}>
                                Filter
                            </Button>
                            <Button variant="secondary" icon="download" onClick={() => handleAction('Export')}>
                                Export
                            </Button>
                        </div>
                    }
                />
                <div className="w-full overflow-hidden">
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
            </Card>
        </div>
    </>
  );
}

function StatCard({ title, value, trend, trendUp, trendBad, icon, iconColor, iconBg, delay }) {
    const trendColor = trendBad ? 'text-red-500' : 'text-green-500';
    return (
        <div 
            className="group relative p-6 rounded-2xl bg-surface-light dark:bg-surface-dark border border-slate-200 dark:border-slate-800 shadow-soft hover:shadow-large transition-all duration-300 hover:-translate-y-1 card-hover overflow-hidden"
            style={{ animationDelay: `${delay}ms` }}
        >
            <div className="relative z-10 flex justify-between items-start mb-5">
                <div className="flex flex-col gap-1">
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 leading-snug">{title}</p>
                </div>
                <div className={`relative ${iconBg} p-2.5 rounded-xl shadow-sm group-hover:shadow-md transition-all duration-300 group-hover:scale-110`}>
                    <span className={`material-symbols-outlined ${iconColor} text-[24px]`}>{icon}</span>
                    <div className="absolute inset-0 rounded-xl bg-white dark:bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                </div>
            </div>
            <div className="relative z-10 flex items-end gap-3">
                <p className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white leading-none">{value}</p>
                <div className={`text-xs font-semibold ${trendColor} mb-1.5 flex items-center gap-0.5 px-2 py-1 rounded-lg ${trendBad ? 'bg-red-50 dark:bg-red-500/10' : 'bg-green-50 dark:bg-green-500/10'}`}>
                    <span className="material-symbols-outlined text-[16px]">{trendUp ? 'trending_up' : 'trending_down'}</span>
                    <span>{trend}</span>
                </div>
            </div>
            
            {/* Subtle gradient overlay on hover */}
            <div className="absolute inset-0 z-0 rounded-2xl bg-gradient-to-br from-primary/0 to-primary/0 group-hover:from-primary/5 group-hover:to-transparent transition-all duration-500 pointer-events-none"></div>
        </div>
    )
}

function ActionButton({ icon, label, onClick }) {
    return (
        <button
            onClick={onClick}
            className="group flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-[#1c2630] border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-gradient-to-r hover:from-slate-50 hover:to-white dark:hover:from-[#253240] dark:hover:to-[#1c2630] hover:border-primary/30 hover:shadow-soft transition-all duration-300 hover:scale-105"
        >
            <span className="material-symbols-outlined text-[20px] group-hover:scale-110 transition-transform duration-300">{icon}</span>
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
    let progressColor = "bg-gradient-to-r from-green-500 to-emerald-500";
    
    if (status === 'pending') {
        statusClass = "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400";
        statusLabel = "Pending Review";
        statusDot = "bg-yellow-500";
        progressColor = "bg-gradient-to-r from-yellow-400 to-orange-400";
    } else if (status === 'error') {
        statusClass = "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400 border border-transparent hover:border-red-200 dark:hover:border-red-800 transition-all duration-300";
        statusLabel = "Validation Failure";
        progressColor = "bg-gradient-to-r from-red-500 to-red-600";
    }

    const isError = status === 'error';

    return (
        <tr className={`group hover:bg-gradient-to-r hover:from-slate-50 hover:to-transparent dark:hover:from-slate-800/50 dark:hover:to-transparent transition-all duration-300 ${isError ? 'bg-red-50/30 dark:bg-red-900/5' : ''}`}>
            <td className="p-4 font-mono text-sm text-slate-600 dark:text-slate-300 font-semibold group-hover:text-primary transition-colors">{code}</td>
            <td className="p-4 text-sm font-medium text-slate-900 dark:text-white">{desc}</td>
            <td className={`p-4 font-mono text-sm font-semibold ${sbs === '--' ? 'text-slate-400 italic' : 'text-primary bg-primary/5 dark:bg-primary/10 px-3 py-1.5 rounded-lg inline-block'}`}>{sbs}</td>
            <td className="p-4 align-middle">
                <div className="flex items-center gap-3">
                    <div className="flex-1 h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden w-28 shadow-inner">
                        <div className={`h-full ${progressColor} rounded-full transition-all duration-500 shadow-sm`} style={{ width: `${confidence}%` }}></div>
                    </div>
                    <span className={`text-xs font-bold ${confidence === 0 ? 'text-slate-400' : 'text-slate-700 dark:text-slate-300'} min-w-[3rem] text-right`}>
                        {confidence > 0 ? `${confidence}%` : 'N/A'}
                    </span>
                </div>
            </td>
            <td className="p-4 relative">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold ${statusClass} ${isError ? 'cursor-help' : ''} shadow-sm`}>
                     {!isError ? <span className={`size-2 rounded-full ${statusDot} animate-pulse`}></span> : <span className="material-symbols-outlined text-[14px]">report</span>}
                     {statusLabel}
                </span>
            </td>
            <td className="p-4 text-right">
                <button className={`p-2 rounded-lg transition-all duration-300 ${isError ? 'text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10' : 'text-slate-400 hover:text-primary hover:bg-primary/10'} hover:scale-110`}>
                    <span className="material-symbols-outlined text-[20px]">{isError ? 'edit_note' : 'more_vert'}</span>
                </button>
            </td>
        </tr>
    )
}
