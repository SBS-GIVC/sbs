import React from 'react';

export function FacilityUsagePage() {
  return (
    <div className="flex-1 px-4 py-8 md:px-8 lg:px-12 xl:px-40 bg-background-light dark:bg-background-dark overflow-y-auto w-full">
        <div className="mx-auto max-w-7xl">
            {/* Page Heading */}
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl">Facility Usage & Quota Management</h1>
                    <p className="mt-2 text-base text-slate-500 dark:text-slate-400">Monitor API limits, adjust throughput quotas, and configure burst settings across hospital nodes.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => alert("Usage Report Exported.")} className="flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:border-border-dark dark:bg-surface-dark dark:text-slate-200 dark:hover:bg-slate-800 transition-all">
                        <span className="material-symbols-outlined text-[18px]">file_download</span>
                        Export Report
                    </button>
                    <button className="flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-600 transition-all">
                        <span className="material-symbols-outlined text-[18px]">add_circle</span>
                        Add Facility
                    </button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                 <StatCard title="Global Throughput" val="1.2M" sub="req/day" trend="12%" icon="network_check" color="primary" />
                 <StatCard title="Avg Quota Usage" val="64%" sub="across all nodes" trend="5%" icon="pie_chart" color="indigo" />
                 <StatCard title="Active Facilities" val="142" sub="connected nodes" trend="+2 new" icon="domain" color="emerald" />
                 <StatCard title="Critical Alerts" val="3" sub="near quota limits" trend="Action needed" icon="warning" color="red" />
            </div>

            <div className="flex flex-col gap-6 lg:flex-row">
                {/* Main Facility List */}
                <div className="flex-1">
                    {/* Controls & Filters */}
                    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                        <div className="relative w-full max-w-md">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-slate-400">search</span>
                            <input className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary dark:border-border-dark dark:bg-surface-dark dark:text-white dark:placeholder-slate-500" placeholder="Search facilities by Name or ID..." type="text"/>
                        </div>
                        <div className="flex items-center gap-2">
                             <FilterBtn icon="filter_list" label="Filters" />
                             <FilterBtn icon="sort" label="Sort: Usage High to Low" />
                        </div>
                    </div>
                    {/* Grid of Facility Cards */}
                    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                        <FacilityCard name="Dammam General" id="HOSP-DAM-003" usage={95} current="95,000" max="100,000" status="Critical Usage" color="red" cap={100000} rpm={300} />
                        <FacilityCard name="King Fahd Medical City" id="HOSP-RIY-001" usage={45} current="45,200" max="100,000" status="Healthy" color="emerald" cap={100000} rpm={500} />
                        <FacilityCard name="Jeddah Clinic Main" id="CLINIC-JED-05" usage={82} current="41,000" max="50,000" status="Warning" color="orange" cap={50000} rpm={250} />
                        <FacilityCard name="Riyadh Specialized" id="HOSP-RIY-004" usage={14} current="28,000" max="200,000" status="Healthy" color="emerald" cap={200000} rpm={1000} />
                    </div>

                    <div className="mt-8 flex items-center justify-between border-t border-slate-200 pt-4 dark:border-border-dark">
                         <p className="text-sm text-slate-500 dark:text-slate-400">Showing <span className="font-medium text-slate-900 dark:text-white">1</span> to <span className="font-medium text-slate-900 dark:text-white">4</span> of <span className="font-medium text-slate-900 dark:text-white">142</span> results</p>
                         <div className="flex items-center gap-2">
                            <button className="rounded-lg border border-slate-200 px-3 py-1 text-sm font-medium text-slate-500 hover:bg-slate-50 dark:border-border-dark dark:text-slate-400 dark:hover:bg-slate-800">Previous</button>
                            <button className="rounded-lg border border-slate-200 px-3 py-1 text-sm font-medium text-slate-500 hover:bg-slate-50 dark:border-border-dark dark:text-slate-400 dark:hover:bg-slate-800">Next</button>
                         </div>
                    </div>
                </div>

                {/* Right Sidebar: Quota Alerting */}
                <div className="lg:w-80">
                    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-border-dark dark:bg-surface-dark sticky top-24">
                        <div className="mb-5 flex items-center justify-between">
                            <h3 className="font-bold text-slate-900 dark:text-white">Quota Alerting</h3>
                            <span className="material-symbols-outlined text-slate-400">notifications_active</span>
                        </div>
                        <div className="space-y-6">
                            <div>
                                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500">Triggers</p>
                                <SliderRange label="Warning Threshold" val="80%" color="orange" />
                                <SliderRange label="Critical Threshold" val="90%" color="red" />
                            </div>
                            <div>
                                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500">Notifications</p>
                                <div className="space-y-3">
                                    <CheckItem label="Email Admins" desc="Send alerts to system administrators." checked />
                                    <CheckItem label="Webhook" desc="POST to Slack/Teams integration." />
                                </div>
                            </div>
                            <div>
                                <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-slate-500">Recipients</label>
                                <textarea className="block w-full rounded-lg border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 focus:border-primary focus:ring-primary dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500" placeholder="admin@gateway.health, alerts@hospital.com" rows="3"></textarea>
                            </div>
                            <button className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-600 transition-colors">Save Configuration</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
}

function StatCard({ title, val, sub, trend, icon, color }) {
    const bgMap = {
        primary: "bg-primary/10 text-primary border-primary/20",
        indigo: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
        emerald: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
        red: "bg-red-500/10 text-red-500 border-red-500/20",
    }
    const barMap = {
        primary: "bg-primary",
        indigo: "bg-indigo-500",
        emerald: "bg-emerald-500",
        red: "bg-red-500"
    }

    // simplified trend color
    const trendColor = color === 'red' ? 'text-red-500' : 'text-emerald-500';

    return (
        <div className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-border-dark dark:bg-surface-dark transition-all hover:border-primary/50">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
                    <div className="mt-2 flex items-baseline gap-2">
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{val}</p>
                        <span className={`text-xs font-medium ${trendColor} flex items-center`}>
                             {trend.includes('new') || trend.includes('needed') ? '' : <span className="material-symbols-outlined text-[14px] mr-0.5">trending_up</span>} {trend}
                        </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{sub}</p>
                </div>
                <div className={`rounded-lg p-2 ${bgMap[color].split(' ')[0]} ${bgMap[color].split(' ')[1]}`}>
                    <span className="material-symbols-outlined">{icon}</span>
                </div>
            </div>
            <div className={`absolute bottom-0 left-0 h-1 w-full ${bgMap[color].split(' ')[0]}`}>
                <div className={`h-full ${barMap[color]} w-[65%]`}></div>
            </div>
        </div>
    )
}

function FilterBtn({ icon, label }) {
    return (
        <button className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-border-dark dark:bg-surface-dark dark:text-slate-300 dark:hover:bg-slate-800">
            <span className="material-symbols-outlined text-[18px]">{icon}</span>
            {label}
        </button>
    )
}

function FacilityCard({ name, id, usage, current, max, status, color, cap, rpm }) {
    const statusMap = {
        red: "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-500/30",
        emerald: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 border-slate-200",
        orange: "bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 border-slate-200"
    };
    const iconMap = {
        red: "bg-red-500/10 text-red-500",
        emerald: "bg-blue-500/10 text-primary",
        orange: "bg-orange-500/10 text-orange-500"
    };
    const barMap = {
        red: "bg-red-500",
        emerald: "bg-primary",
        orange: "bg-orange-500"
    };

    return (
        <div className={`flex flex-col rounded-xl border ${color === 'red' ? 'border-red-500/30' : 'border-slate-200'} bg-white p-5 shadow-sm dark:bg-surface-dark dark:border-border-dark`}>
            <div className="mb-4 flex items-start justify-between">
                <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconMap[color]}`}>
                        <span className="material-symbols-outlined">local_hospital</span>
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900 dark:text-white">{name}</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">ID: {id}</p>
                    </div>
                </div>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusMap[color]}`}>
                    {status}
                </span>
            </div>
            <div className="mb-6 flex items-center justify-center gap-8 py-2">
                {/* Simple Circle Gauge Rep */}
                 <div className="flex flex-col items-center justify-center rounded-full border-4 border-slate-200 dark:border-slate-700 size-32 relative">
                    <div className="absolute top-0 left-0 w-full h-full rounded-full border-4 border-transparent border-t-primary" style={{transform:`rotate(${usage * 3.6}deg)`}}></div> 
                    <span className="text-2xl font-bold text-slate-900 dark:text-white">{usage}%</span>
                    <span className="text-[10px] text-slate-500">USAGE</span>
                 </div>

                 <div className="flex-1 space-y-4">
                    <div>
                        <div className="flex justify-between text-xs mb-1">
                            <span className="text-slate-500">Current</span>
                            <span className="text-slate-900 dark:text-white">{current}</span>
                        </div>
                         <div className="flex justify-between text-xs mb-1">
                            <span className="text-slate-500">Max Cap</span>
                            <span className="text-slate-900 dark:text-white">{max}</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                            <div className={`h-full ${barMap[color]} rounded-full`} style={{ width: `${usage}%` }}></div>
                        </div>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500">Burst Mode</span>
                         <label className="relative inline-flex cursor-pointer items-center">
                            <input defaultChecked={color === 'red'} className="peer sr-only" type="checkbox"/>
                            <div className={`peer h-5 w-9 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:${barMap[color]} peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:border-slate-600 dark:bg-slate-700`}></div>
                        </label>
                    </div>
                 </div>
            </div>
             <div className="mt-auto grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 dark:border-slate-700">
                 <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">Monthly Cap</label>
                    <input className="block w-full rounded-md border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white" type="number" defaultValue={cap}/>
                 </div>
                 <div>
                    <label className="mb-1 flex justify-between text-xs font-medium text-slate-500">
                        <span>Rate Limit</span>
                        <span className={iconMap[color].split(' ')[1]}>{rpm} RPM</span>
                    </label>
                    <input className={`h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 dark:bg-slate-700 accent-${color === 'emerald' ? 'primary' : (color === 'orange' ? 'orange-500': 'red-500')}`} max="1000" min="100" type="range" defaultValue={rpm}/>
                 </div>
             </div>
        </div>
    )
}

function SliderRange({ label, val, color }) {
    const accent = color === 'orange' ? 'accent-orange-500' : 'accent-red-500';
    return (
        <div className="mb-4">
            <div className="flex justify-between text-sm text-slate-700 dark:text-slate-300 mb-1">
                <span>{label}</span>
                <span className="font-bold">{val}</span>
            </div>
            <input className={`h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 dark:bg-slate-700 ${accent}`} type="range" defaultValue={parseInt(val)}/>
        </div>
    )
}

function CheckItem({ label, desc, checked }) {
    return (
        <div className="flex items-start gap-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
            <input defaultChecked={checked} className="mt-1 rounded border-slate-300 text-primary focus:ring-primary dark:border-slate-600 dark:bg-slate-700" type="checkbox"/>
            <div className="text-sm">
                <p className="font-medium text-slate-900 dark:text-white">{label}</p>
                <p className="text-xs text-slate-500">{desc}</p>
            </div>
        </div>
    )
}
