import React from 'react';

export function ErrorDetailPage() {
  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-background-dark relative p-8">
        <div className="max-w-5xl mx-auto w-full">
            <div className="flex flex-wrap items-start justify-between gap-6 mb-8">
                <div>
                    <div className="flex items-center gap-4 mb-2">
                        <h1 className="text-3xl font-bold text-white tracking-tight">Claim ID: CLM-88291</h1>
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-error/10 border border-error/20">
                            <span className="material-symbols-outlined text-error text-lg">error</span>
                            <span className="text-error text-sm font-bold">Validation Failed</span>
                        </div>
                    </div>
                    <p className="text-text-secondary text-sm max-w-2xl">
                        Submitted by <span className="text-white font-medium">Mercy General Hospital</span> • Provider: <span className="text-white font-medium">Dr. Sarah Jenkins</span> • Service Date: <span className="text-white font-medium">Oct 12, 2023</span>
                    </p>
                </div>
                <div className="flex gap-3">
                    <button className="px-4 py-2 rounded-lg border border-border-dark bg-surface-dark text-white text-sm font-medium hover:bg-surface-darker transition-colors flex items-center gap-2">
                        <span className="material-symbols-outlined text-lg">history</span>
                        View History
                    </button>
                    <button className="px-4 py-2 rounded-lg border border-error/50 bg-error/10 text-error text-sm font-medium hover:bg-error/20 transition-colors flex items-center gap-2">
                        <span className="material-symbols-outlined text-lg">block</span>
                        Reject Claim
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-surface-dark rounded-xl border-l-4 border-l-error shadow-lg overflow-hidden border-y border-r border-border-dark">
                        <div className="p-6">
                            <div className="flex items-start gap-4 mb-6">
                                <div className="p-3 rounded-lg bg-error/10 text-error shrink-0">
                                    <span className="material-symbols-outlined text-2xl">report_problem</span>
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white mb-1">Missing Required Clinical Information</h3>
                                    <p className="text-text-secondary text-sm">The payload contains a high-value procedure but lacks the mandatory ICD-10-AM diagnosis code required for payer reimbursement rules.</p>
                                </div>
                            </div>
                            <div className="bg-surface-darker rounded-lg p-4 border border-border-dark mb-6">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Source Data Snippet</span>
                                    <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-0.5 rounded">FHIR: Procedure.code</span>
                                </div>
                                <div className="font-mono text-sm text-white">
                                    <span className="text-text-secondary">"display":</span> "Bilateral Knee Replacement Surgery",<br/>
                                    <span className="text-text-secondary">"performedDateTime":</span> "2023-10-12T09:30:00Z",<br/>
                                    <span className="text-text-secondary">"status":</span> "completed"
                                </div>
                            </div>
                            <div className="flex items-start gap-2 mb-2">
                                <span className="material-symbols-outlined text-text-secondary text-lg mt-0.5">info</span>
                                <p className="text-sm text-text-secondary">Expected <span className="text-white font-mono bg-white/5 px-1.5 py-0.5 rounded text-xs">supportingInfo[0].code</span> matching value set <span className="text-primary hover:underline cursor-pointer">VS-ICD10-ORTHO</span>.</p>
                            </div>
                        </div>

                        <div className="bg-background-dark/50 border-t border-border-dark p-6">
                            <h4 className="text-white text-sm font-bold mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">build_circle</span>
                                Resolution Action
                            </h4>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-1.5">Add Missing ICD-10-AM Diagnosis Code</label>
                                    <div className="relative">
                                        <input className="w-full bg-surface-dark border border-border-dark rounded-lg pl-10 pr-4 py-2.5 text-white placeholder:text-gray-600 focus:ring-1 focus:ring-primary focus:border-primary transition-all text-sm" placeholder="e.g. M17.0 (Primary gonarthrosis, bilateral)" type="text"/>
                                        <span className="material-symbols-outlined absolute left-3 top-2.5 text-text-secondary">search</span>
                                        <button className="absolute right-2 top-1.5 bg-primary/20 hover:bg-primary/30 text-primary text-xs font-medium px-2 py-1 rounded transition-colors">Search Dictionary</button>
                                    </div>
                                </div>
                                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border-dark/50">
                                    <button className="px-5 py-2.5 rounded-lg border border-border-dark text-text-secondary hover:text-white hover:bg-surface-dark transition-colors text-sm font-medium">Cancel</button>
                                    <button className="px-5 py-2.5 rounded-lg bg-primary hover:bg-blue-600 text-white shadow-lg shadow-blue-900/20 transition-all text-sm font-medium flex items-center gap-2">
                                        <span className="material-symbols-outlined text-lg">check</span>
                                        Save & Re-validate
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-surface-dark rounded-xl border border-border-dark p-5">
                        <h4 className="text-white text-sm font-bold mb-4 flex items-center justify-between">
                            Suggested Codes
                            <span className="text-xs font-normal text-primary bg-primary/10 px-2 py-1 rounded-full">AI Confidence: 89%</span>
                        </h4>
                        <div className="space-y-3">
                            <SuggestedCode code="M17.0" desc="Bilateral primary osteoarthritis of knee" />
                            <SuggestedCode code="Z96.65" desc="Presence of right artificial knee joint" />
                        </div>
                    </div>

                    <div className="bg-surface-dark rounded-xl border border-border-dark overflow-hidden">
                        <div className="px-5 py-3 border-b border-border-dark bg-surface-darker flex items-center justify-between">
                            <h4 className="text-white text-sm font-bold">Raw FHIR Payload</h4>
                            <button className="text-primary text-xs hover:underline">Download JSON</button>
                        </div>
                        <div className="p-0 overflow-x-auto">
                            <pre className="text-[11px] leading-relaxed font-mono text-text-secondary p-5 overflow-auto max-h-60 custom-scrollbar">
{`{
  "resourceType": "Claim",
  "id": "CLM-88291",
  "status": "active",
  "type": {
    "coding": [
      {
        "system": "http://terminology.hl7.org/CodeSystem/claim-type",
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
  // Error: Missing supportingInfo block
}`}
                            </pre>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
}

function SuggestedCode({ code, desc }) {
    return (
        <div className="group flex items-start gap-3 p-3 rounded-lg border border-border-dark hover:border-primary/50 hover:bg-surface-darker transition-all cursor-pointer">
            <div className="mt-0.5">
                <div className="size-4 rounded-full border border-text-secondary group-hover:border-primary flex items-center justify-center">
                    <div className="size-2 rounded-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </div>
            </div>
            <div>
                <p className="text-white text-sm font-medium font-mono">{code}</p>
                <p className="text-text-secondary text-xs mt-0.5">{desc}</p>
            </div>
        </div>
    )
}
