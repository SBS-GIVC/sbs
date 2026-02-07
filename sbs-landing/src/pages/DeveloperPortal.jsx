import React, { useState } from 'react';
import { normalizeCode } from '../utils/middleware';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

/**
 * Premium Developer Portal
 * Optimized for GIVC-SBS Ultra-Premium Design System
 */
export function DeveloperPortal() {
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  
  const [requestBody, setRequestBody] = useState(`{
    "facility_id": "HOSP-001",
    "internal_code": "99213",
    "service_date": "2023-10-24",
    "description": "Patient presents with acute bronchitis...",
    "metadata": {
      "department": "Urgent Care"
    }
  }`);

  const handleRunRequest = async () => {
    setLoading(true);
    setResponse(null);
    try {
        const body = JSON.parse(requestBody);
        const result = await normalizeCode(body.internal_code, body.description);
        
        const apiResponse = {
            status: "success",
            request_id: `req_${Math.random().toString(36).substring(7)}`,
            data: {
                claim_id: `clm_${Math.floor(Math.random() * 100000000)}`,
                normalization_score: result.confidence,
                coded_results: [
                    {
                        code: result.sbs_code,
                        system: "SBS-V2",
                        description: result.desc,
                        confidence: result.confidence
                    }
                ],
                processed_at: new Date().toISOString()
            }
        };
        
        setResponse(JSON.stringify(apiResponse, null, 2));
    } catch (error) {
        setResponse(JSON.stringify({
            status: "error",
            message: "Invalid JSON or Server Error",
            details: error.message
        }, null, 2));
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-white dark:bg-slate-950">
        {/* Left Nav */}
        <aside className="w-72 bg-slate-50 dark:bg-slate-900/40 border-r border-slate-200/50 dark:border-slate-800/50 hidden lg:flex flex-col">
           <div className="p-8 space-y-10">
              <NavSection title="Orchestration">
                 <NavItem icon="terminal" label="Introduction" active />
                 <NavItem icon="key" label="Authentication" />
                 <NavItem icon="compress" label="Rate Limits" />
              </NavSection>
              <NavSection title="Endpoints">
                 <NavItem icon="upload_file" label="Submit Claims" />
                 <NavItem icon="troubleshoot" label="Verify Status" />
                 <NavItem icon="history" label="Event Log" />
              </NavSection>
           </div>
           
           <div className="mt-auto p-6">
              <div className="p-4 rounded-3xl bg-blue-600/5 border border-blue-600/10 space-y-3">
                 <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                       <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                       <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Registry Status</span>
                 </div>
                 <p className="text-xs font-bold text-slate-800 dark:text-gray-200">Production Nodes Active</p>
              </div>
           </div>
        </aside>

        {/* Main Doc */}
        <main className="flex-1 overflow-y-auto scrollbar-hide p-8 sm:p-12">
            <div className="max-w-4xl mx-auto space-y-12 animate-premium-in">
               <nav className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Documentation</span>
                  <span className="text-slate-300">/</span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">Normalization API</span>
               </nav>

               <header className="space-y-6">
                  <h1 className="text-5xl font-black tracking-tighter text-slate-900 dark:text-white">Relay Claim Payload</h1>
                  <p className="text-lg font-bold text-slate-500 leading-relaxed">
                     Submit unstructured clinical data for real-time SBS conversion and NPHIES relay. 
                     Our neural engine identifies procedural markers and maps them to official billing schemas with cryptographic certainty.
                  </p>
               </header>

               {/* Endpoint Card */}
               <div className="glass-panel p-2 rounded-[24px] border border-blue-600/10 flex items-center gap-4 group">
                  <div className="px-4 py-2 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-blue-600/20">POST</div>
                  <code className="flex-1 font-mono text-sm font-bold text-slate-600 dark:text-slate-400">https://relay.brainsait.cloud/v1/normalize</code>
                  <button className="p-3 text-slate-300 hover:text-blue-600 transition-colors">
                     <span className="material-symbols-outlined text-lg font-black">content_copy</span>
                  </button>
               </div>

               {/* Parameters */}
               <section className="space-y-6">
                  <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">Body Parameters</h3>
                  <div className="overflow-hidden rounded-[32px] border border-slate-200 dark:border-slate-800">
                     <table className="w-full text-left">
                        <thead className="bg-slate-50 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-800">
                           <tr>
                              <Th>Field</Th><Th>Type</Th><Th>Requirement</Th><Th>Context</Th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                           <ParamRow field="facility_id" type="string" required desc="Universal Facility Entity ID (NPHIES format)." />
                           <ParamRow field="internal_code" type="string" required desc="Source EHR procedural or diagnostic code." />
                           <ParamRow field="description" type="string" desc="Unstructured clinical narrative for neural analysis." />
                           <ParamRow field="service_date" type="iso-date" required desc="Timestamp of clinical encounter (UTC)." />
                        </tbody>
                     </table>
                  </div>
               </section>

               {/* Info Callout */}
               <div className="p-8 rounded-[32px] bg-slate-900 text-white relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-8 text-blue-600 opacity-20 transform translate-x-4 -translate-y-4">
                     <span className="material-symbols-outlined text-[120px] font-black">shield_lock</span>
                  </div>
                  <div className="relative space-y-2">
                     <h4 className="text-lg font-black tracking-tight">Enterprise Security</h4>
                     <p className="text-sm font-bold text-slate-400 max-w-md">All data relayer requests must be signed with your RSA-2048 private key. Unsigned payloads will be dropped by the gateway firewall.</p>
                  </div>
               </div>
            </div>
        </main>

        {/* Sandbox Side */}
        <aside className="w-[500px] bg-slate-900 border-l border-white/5 hidden xl:flex flex-col">
           <div className="h-16 border-b border-white/5 flex items-center px-8 justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Payload Sandbox</span>
              <div className="flex gap-1">
                 {['JSON', 'cURL', 'Node'].map(t => (
                   <button key={t} className={`px-3 py-1 text-[9px] font-black uppercase rounded-lg ${t === 'JSON' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white transition-colors'}`}>{t}</button>
                 ))}
              </div>
           </div>

           <div className="flex-1 overflow-y-auto p-8 space-y-10 scrollbar-hide">
              <div className="space-y-4">
                 <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Request Body</label>
                    <span className="text-[9px] font-bold text-blue-500">Live Editor</span>
                 </div>
                 <div className="relative">
                    <textarea 
                       className="w-full h-48 bg-slate-950 rounded-2xl p-6 font-mono text-xs text-blue-400 border border-white/5 focus:outline-none focus:border-blue-600/50 transition-colors"
                       value={requestBody}
                       onChange={(e) => setRequestBody(e.target.value)}
                       spellCheck="false"
                    />
                 </div>
              </div>

              <div className="space-y-4">
                 <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Neural Response</label>
                    {response && <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500">200 OK</span>}
                 </div>
                 <div className="w-full bg-slate-950 rounded-2xl p-6 font-mono text-xs text-slate-300 border border-white/5 min-h-[120px] relative">
                    {loading ? (
                      <div className="flex items-center gap-2 text-blue-600 animate-pulse">
                         <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                         Transmitting to Relay...
                      </div>
                    ) : (
                      <pre className="whitespace-pre-wrap">{response || '// Execute request to view response payload'}</pre>
                    )}
                 </div>
              </div>
           </div>

           <div className="p-8 border-t border-white/5 backdrop-blur-md">
              <Button loading={loading} icon="bolt" className="w-full py-4 rounded-2xl shadow-2xl shadow-blue-600/20" onClick={handleRunRequest}>Submit to Testing Registry</Button>
           </div>
        </aside>
    </div>
  );
}

function NavSection({ title, children }) {
  return (
    <div className="space-y-4">
      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">{title}</h3>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function NavItem({ icon, label, active }) {
  return (
    <button className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all group ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-500 hover:bg-white dark:hover:bg-slate-800/50'}`}>
       <span className={`material-symbols-outlined text-[20px] ${active ? 'text-white' : 'text-slate-400 group-hover:text-blue-600'}`}>{icon}</span>
       <span className="text-sm font-bold">{label}</span>
    </button>
  );
}

function Th({ children }) {
  return <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">{children}</th>
}

function ParamRow({ field, type, required, desc }) {
  return (
    <tr className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
       <td className="px-6 py-5"><code className="text-sm font-black text-blue-600">{field}</code></td>
       <td className="px-6 py-5 text-xs font-bold text-slate-400">{type}</td>
       <td className="px-6 py-5">
          <span className={`text-[10px] font-black uppercase tracking-widest ${required ? 'text-rose-500' : 'text-slate-400'}`}>{required ? 'Required' : 'Optional'}</span>
       </td>
       <td className="px-6 py-5 text-sm font-bold text-slate-600 dark:text-gray-300">{desc}</td>
    </tr>
  );
}
