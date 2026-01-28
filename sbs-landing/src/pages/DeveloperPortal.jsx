import React, { useState } from 'react';
import { normalizeCode } from '../utils/middleware';

export function DeveloperPortal() {
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  
  // Default request body for the demo
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
        
        // Simulate a full API response structure
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
    <div className="flex flex-1 overflow-hidden h-full bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-200">
        {/* Left Sidebar (Navigation) */}
        <aside className="w-64 bg-background-light dark:bg-[#111a22] border-r border-slate-200 dark:border-border-dark flex flex-col overflow-y-auto hidden lg:flex shrink-0">
            <div className="p-4 space-y-8">
                <NavSection title="Getting Started">
                     <NavItem icon="home" label="Introduction" href="#" />
                     <NavItem icon="vpn_key" label="Authentication" href="#" />
                     <NavItem icon="speed" label="Rate Limits" href="#" />
                </NavSection>
                <NavSection title="Claims API">
                     <NavItem icon="cloud_upload" label="Upload Claim" href="#" active />
                     <NavItem icon="search_check" label="Check Status" href="#" />
                     <NavItem icon="history" label="History Log" href="#" />
                </NavSection>
                <NavSection title="Schema Definitions">
                     <NavItem icon="data_object" label="Claim Object" href="#" />
                     <NavItem icon="person" label="Patient Object" href="#" />
                </NavSection>
            </div>
             <div className="mt-auto p-4 border-t border-slate-200 dark:border-border-dark">
                <div className="bg-slate-100 dark:bg-[#1e293b] p-3 rounded-lg">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">API Status</p>
                    <div className="flex items-center gap-2">
                        <span className="size-2 rounded-full bg-green-500 animate-pulse"></span>
                        <span className="text-sm font-medium text-slate-900 dark:text-white">All Systems Operational</span>
                    </div>
                </div>
            </div>
        </aside>

        {/* Center Content (Documentation) */}
        <main className="flex-1 overflow-y-auto bg-white dark:bg-[#101922] relative scroll-smooth p-8 pb-24">
            <div className="max-w-4xl mx-auto">
                 {/* Breadcrumbs */}
                <nav className="flex mb-6 text-sm">
                    <ol className="inline-flex items-center space-x-1 md:space-x-2">
                        <li className="text-slate-500 dark:text-[#92adc9]">API Reference</li>
                        <span className="material-symbols-outlined text-slate-400 text-sm">chevron_right</span>
                        <li className="text-slate-500 dark:text-[#92adc9]">Claims</li>
                        <span className="material-symbols-outlined text-slate-400 text-sm">chevron_right</span>
                        <li className="font-medium text-slate-900 dark:text-white">Upload</li>
                    </ol>
                </nav>

                <div className="mb-10">
                    <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-4">Upload Claim Data</h1>
                    <p className="text-lg text-slate-600 dark:text-[#92adc9] leading-relaxed">
                        Submit raw claim data for AI-driven normalization and coding. This endpoint processes unstructured clinical notes and returns standardized ICD-10 and CPT codes.
                    </p>
                </div>

                <div className="mb-10">
                    <div className="flex items-center gap-4 p-4 rounded-lg bg-slate-100 dark:bg-[#1e293b] border border-slate-200 dark:border-border-dark font-mono text-sm overflow-x-auto">
                        <span className="px-2.5 py-1 rounded text-xs font-bold bg-primary text-white uppercase tracking-wide">POST</span>
                        <span className="text-slate-600 dark:text-slate-300">https://api.healthgateway.io/v1/claims/upload</span>
                        <button className="ml-auto text-slate-400 hover:text-white transition-colors">
                            <span className="material-symbols-outlined text-[18px]">content_copy</span>
                        </button>
                    </div>
                </div>

                <div className="mb-12">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Header Parameters</h2>
                    <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-border-dark">
                         <table className="min-w-full divide-y divide-slate-200 dark:divide-border-dark">
                            <thead className="bg-slate-50 dark:bg-[#1e293b]">
                                <tr>
                                    <Th>Field</Th><Th>Type</Th><Th>Required</Th><Th>Description</Th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-border-dark bg-white dark:bg-[#111a22]">
                                <ParamRow field="Authorization" type="string" required desc={<span>Your API Key in the format <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-xs">Bearer sk_live_...</code></span>} />
                                <ParamRow field="Content-Type" type="string" required desc={<span>Must be <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-xs">application/json</code></span>} />
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="mb-12">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">Body Parameters <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">application/json</span></h2>
                     <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-border-dark">
                         <table className="min-w-full divide-y divide-slate-200 dark:divide-border-dark">
                            <thead className="bg-slate-50 dark:bg-[#1e293b]">
                                <tr>
                                    <Th>Field</Th><Th>Type</Th><Th>Required</Th><Th>Description</Th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-border-dark bg-white dark:bg-[#111a22]">
                                <ParamRow field="facility_id" type="string" required desc="The unique identifier for the hospital or clinic facility originating the claim." subDesc='Example: "FAC-NY-001"' isPrim />
                                <ParamRow field="internal_code" type="string" required desc="The specific internal CPT or billing code used by the facility's EHR system." isPrim />
                                <ParamRow field="description" type="string" required={false} desc="Raw clinical notes, physician comments, or procedure descriptions for AI normalization. Maximum 5000 characters." isPrim />
                                <ParamRow field="service_date" type="date (ISO 8601)" required desc="The date the service was performed." subDesc="Format: YYYY-MM-DD" isPrim />
                            </tbody>
                        </table>
                    </div>
                </div>
                
                 <div className="bg-blue-50 dark:bg-[#0d1a29] border-l-4 border-primary p-4 rounded-r-lg">
                    <div className="flex">
                        <div className="flex-shrink-0"><span className="material-symbols-outlined text-primary">info</span></div>
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300">Handling PII Data</h3>
                            <div className="mt-2 text-sm text-blue-700 dark:text-blue-400">
                                <p>Ensure all patient identifiers in the `description` field are de-identified if not explicitly required for processing.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>

        {/* Right Sidebar (Code Sandbox) */}
        <aside className="w-[450px] bg-[#0d1117] border-l border-slate-800 hidden xl:flex flex-col shrink-0">
             <div className="flex items-center justify-between px-4 h-12 border-b border-slate-800 bg-[#161b22]">
                <div className="flex gap-1">
                    <button className="px-3 py-1.5 text-xs font-medium text-white bg-slate-700 rounded-md shadow-sm">cURL</button>
                    <button className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors">Node.js</button>
                    <button className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors">Python</button>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
                <div className="group relative">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Request Body</span>
                    </div>
                    <textarea 
                        className="w-full bg-[#161b22] text-slate-300 font-mono text-xs rounded-lg border border-slate-800 p-4 min-h-[150px] focus:outline-none focus:border-primary/50 resize-y"
                        value={requestBody}
                        onChange={(e) => setRequestBody(e.target.value)}
                        spellCheck="false"
                    />
                </div>

                <div className="group relative">
                    <div className="flex items-center justify-between mb-2">
                         <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Response</span>
                         {response && !loading && <span className="text-xs font-bold text-green-400 bg-green-400/10 px-2 py-0.5 rounded">200 OK</span>}
                    </div>
                    <div className="bg-[#161b22] rounded-lg border border-slate-800 p-4 font-mono text-xs overflow-x-auto shadow-xl min-h-[100px] max-h-[400px]">
                        {loading ? (
                             <div className="flex items-center gap-2 text-slate-400">
                                <span className="size-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></span>
                                Sending request...
                             </div>
                        ) : (
                            <pre><code className="text-slate-300">{response || '// Click "Run Request" to test'}</code></pre>
                        )}
                    </div>
                </div>

                <div className="bg-[#1e293b]/50 border border-[#2d3b4b] rounded-lg p-4 mt-8">
                    <div className="flex items-start gap-3">
                        <span className="material-symbols-outlined text-primary text-[20px] mt-0.5">lightbulb</span>
                        <div>
                            <h4 className="text-sm font-semibold text-gray-200">Test Mode</h4>
                            <p className="text-xs text-slate-400 mt-1 leading-relaxed">Use test keys <code className="bg-[#2d3b4b] px-1 py-0.5 rounded text-slate-300">sk_test_...</code> to simulate responses.</p>
                        </div>
                    </div>
                </div>
            </div>
            <div className="p-4 border-t border-slate-800 bg-[#161b22] sticky bottom-0">
                <button 
                    onClick={handleRunRequest}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                     <span className="material-symbols-outlined text-[20px]">play_arrow</span>
                     {loading ? 'Running...' : 'Run Request'}
                </button>
            </div>
        </aside>
    </div>
  );
}

function NavSection({ title, children }) {
    return (
        <div>
            <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 px-2">{title}</h3>
            <ul className="space-y-1">{children}</ul>
        </div>
    )
}

function NavItem({ icon, label, href, active }) {
    const activeClass = active ? "bg-primary/10 text-primary border-l-2 border-primary" : "text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#1e293b] transition-colors group";
    const iconClass = active ? "text-primary" : "text-slate-400 group-hover:text-primary";
    
    return (
        <li>
            <a className={`flex items-center gap-3 px-2 py-2 text-sm font-medium rounded-md ${activeClass}`} href={href}>
                <span className={`material-symbols-outlined text-[20px] ${iconClass}`}>{icon}</span>
                {label}
            </a>
        </li>
    )
}

function Th({ children }) {
    return <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{children}</th>
}

function ParamRow({ field, type, required, desc, subDesc, isPrim }) {
    const typeClass = isPrim ? "text-primary" : "text-slate-500 dark:text-slate-400";
    return (
        <tr>
            <td className="px-6 py-4 whitespace-nowrap align-top"><div className="text-sm font-mono font-bold text-slate-900 dark:text-white">{field}</div></td>
            <td className={`px-6 py-4 whitespace-nowrap align-top text-sm ${typeClass}`}>{type}</td>
            <td className={`px-6 py-4 whitespace-nowrap align-top text-sm ${required ? 'text-red-500 font-medium' : 'text-slate-500 font-medium'}`}>{required ? 'Yes' : 'Optional'}</td>
            <td className="px-6 py-4 align-top text-sm text-slate-500 dark:text-slate-400">
                {desc}
                {subDesc && <div className="mt-1 text-xs text-slate-400">{subDesc}</div>}
            </td>
        </tr>
    )
}

function CodeBlock({ title, code, badge }) {
    return (
        <div className="group relative">
            <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</span>
                {badge && <span className="text-xs font-bold text-green-400 bg-green-400/10 px-2 py-0.5 rounded">{badge}</span>}
                {!badge && <button className="text-xs text-primary hover:text-white flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><span className="material-symbols-outlined text-[14px]">content_copy</span> Copy</button>}
            </div>
            <div className="bg-[#161b22] rounded-lg border border-slate-800 p-4 font-mono text-xs overflow-x-auto shadow-xl">
                <pre><code className="text-slate-300">{code}</code></pre>
            </div>
        </div>
    )
}
