import React from 'react';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { SectionHeader } from '../components/ui/SectionHeader';
import { Button } from '../components/ui/Button';
import { useToast } from '../components/Toast';

/**
 * Premium Error Detail Page
 * Optimized for GIVC-SBS Ultra-Premium Design System
 */
export function ErrorDetailPage() {
  const toast = useToast();

  return (
    <div className="flex-1 overflow-y-auto bg-grid scrollbar-hide">
      <main className="max-w-[1400px] mx-auto p-6 sm:p-12 space-y-12 stagger-children">
        
        {/* Header section with high-contrast error status */}
        <section className="animate-premium-in">
           <div className="flex flex-col md:flex-row md:items-start justify-between gap-8">
              <div className="space-y-4">
                 <div className="flex items-center gap-3">
                    <h1 className="text-4xl font-black tracking-tighter text-slate-900 dark:text-white">Claim ID: CLM-88291</h1>
                    <span className="px-3 py-1 rounded-lg bg-rose-500 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-rose-500/20">Validation Failure</span>
                 </div>
                 <div className="flex items-center gap-6 text-[10px] font-black uppercase tracking-widest text-slate-500">
                    <span className="flex items-center gap-2"><span className="material-symbols-outlined text-sm">corporate_fare</span> Mercy General Hospital</span>
                    <span className="flex items-center gap-2"><span className="material-symbols-outlined text-sm">person</span> Dr. Sarah Jenkins</span>
                    <span className="flex items-center gap-2"><span className="material-symbols-outlined text-sm">calendar_today</span> Oct 12, 2023</span>
                 </div>
              </div>
              <div className="flex gap-3">
                 <Button variant="secondary" icon="history" onClick={() => toast.info('Loading event timeline')}>
                   Event Log
                 </Button>
                 <Button
                   className="bg-rose-500 hover:bg-rose-600 shadow-xl shadow-rose-500/20"
                   icon="block"
                   onClick={() => toast.warning('Payload marked for cancellation review')}
                 >
                   Void Payload
                 </Button>
              </div>
           </div>
        </section>

        <div className="grid lg:grid-cols-3 gap-8">
           <div className="lg:col-span-2 space-y-8 animate-premium-in" style={{ animationDelay: '100ms' }}>
              {/* Error Detail Card */}
              <Card className="border-l-4 border-l-rose-500">
                 <CardBody className="p-10 space-y-10">
                    <div className="flex gap-6">
                       <div className="size-16 rounded-3xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-3xl font-black">report</span>
                       </div>
                       <div className="space-y-2">
                          <h3 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Missing Systemic Diagnosis Code</h3>
                          <p className="text-sm font-bold text-slate-500 leading-relaxed">
                             Relay logic detected a high-value surgical procedure (Bilateral Knee Replacement) but failed to locate the mandatory 
                             <span className="text-rose-500"> ICD-10-AM</span> diagnostic marker within the clinical payload.
                          </p>
                       </div>
                    </div>

                    <div className="space-y-4">
                       <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Payload Insight</p>
                       <div className="bg-slate-950 rounded-[32px] p-8 font-mono text-xs text-blue-400 border border-white/5 relative group">
                          <div className="absolute right-6 top-6 opacity-0 group-hover:opacity-100 transition-opacity">
                             <Button variant="secondary" size="sm" icon="content_copy" onClick={() => {
                               navigator.clipboard.writeText('{"resourceType":"Claim","id":"CLM-88291","error":"MISSING_DIAGNOSIS"}');
                               toast.success('JSON payload copied');
                             }}>
                               Copy JSON
                             </Button>
                          </div>
                          <pre className="space-y-1">
                             <code className="text-slate-500">"procedure": [</code>{"\n"}
                             <code>  <span className="text-white">"display":</span> "Bilateral Knee Replacement Surgery",</code>{"\n"}
                             <code>  <span className="text-white">"dateTime":</span> "2023-10-12T09:30:00Z",</code>{"\n"}
                             <code>  <span className="text-white">"status":</span> "completed"</code>{"\n"}
                             <code className="text-slate-500">]</code>
                          </pre>
                       </div>
                    </div>

                    <div className="space-y-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                       <h4 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">
                          <span className="material-symbols-outlined text-lg">build_circle</span>
                          Resolution Node
                       </h4>
                       <div className="grid gap-6">
                          <div className="space-y-2">
                             <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Inject ICD-10-AM Diagnosis</label>
                             <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined text-[20px]">search</span>
                                <input 
                                   className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl pl-12 pr-40 py-4 text-sm font-bold placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                                   placeholder="Try M17.0 (Primary gonarthrosis)..." 
                                />
                                <div className="absolute right-2 top-1.5 flex gap-1">
                                   <Button variant="secondary" size="sm" className="h-9 px-4 text-[9px] font-black uppercase" onClick={() => window.dispatchEvent(new CustomEvent('sbs:navigate', { detail: { view: 'code-browser' } }))}>
                                     Dictionary Map
                                   </Button>
                                </div>
                             </div>
                          </div>
                          <div className="flex justify-end gap-3">
                             <Button variant="secondary" className="px-8" onClick={() => toast.info('Pending diagnosis edit discarded')}>
                               Discard Change
                             </Button>
                             <Button className="px-10 shadow-xl shadow-blue-600/20" icon="save_as" onClick={() => toast.success('Payload relayed for re-validation')}>
                               Relay & Re-validate
                             </Button>
                          </div>
                       </div>
                    </div>
                 </CardBody>
              </Card>
           </div>

           <div className="space-y-8 animate-premium-in" style={{ animationDelay: '200ms' }}>
              <Card>
                 <CardHeader title="AI Recommended Maps" subtitle="High-confidence predictions based on narrative analysis." />
                 <CardBody className="space-y-4">
                    <SuggestedErrorFix code="M17.0" desc="Bilateral primary osteoarthritis of knee" confidence={98} />
                    <SuggestedErrorFix code="Z96.65" desc="Presence of right artificial knee joint" confidence={64} />
                 </CardBody>
              </Card>

              <Card className="bg-slate-900 text-white">
                 <CardHeader title="Registry Inspection" subtitle="Raw binary payload retrieved from EHR gateway." />
                 <CardBody className="p-4">
                    <div className="bg-slate-950 rounded-2xl p-6 font-mono text-[10px] text-slate-400 max-h-80 overflow-y-auto scrollbar-hide">
                       <pre>
{`{
  "resourceType": "Claim",
  "id": "CLM-88291",
  "status": "active",
  "type": {
    "coding": [
      {
        "system": "claim-type",
        "code": "institutional"
      }
    ]
  },
  "procedure": [
     {
       "sequence": 1,
       "date": "2023-10-12"
     }
  ],
  "error": "MISSING_DIAGNOSIS"
}`}
                       </pre>
                    </div>
                    <Button
                      variant="secondary"
                      className="w-full mt-6 border-white/5 hover:bg-white/5 text-[10px] font-black uppercase tracking-widest"
                      icon="download"
                      onClick={() => {
                        const blob = new Blob(
                          ['{\n  "resourceType": "Claim",\n  "id": "CLM-88291",\n  "error": "MISSING_DIAGNOSIS"\n}'],
                          { type: 'application/json;charset=utf-8;' }
                        );
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = 'claim-error-CLM-88291.json';
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        URL.revokeObjectURL(url);
                        toast.success('Raw JSON downloaded');
                      }}
                    >
                      Download Raw JSON
                    </Button>
                 </CardBody>
              </Card>
           </div>
        </div>
      </main>
    </div>
  );
}

function SuggestedErrorFix({ code, desc, confidence }) {
  return (
    <div className="glass-card p-5 rounded-3xl border border-slate-100 dark:border-slate-800 hover:border-blue-600/30 hover:bg-blue-600/5 transition-all cursor-pointer group">
       <div className="flex justify-between items-start mb-2">
          <span className="text-sm font-black text-blue-600 font-mono tracking-tight">{code}</span>
          <span className="text-[9px] font-black px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">{confidence}% Match</span>
       </div>
       <p className="text-xs font-bold text-slate-800 dark:text-gray-200 leading-snug group-hover:text-blue-600 transition-colors">{desc}</p>
    </div>
  );
}
