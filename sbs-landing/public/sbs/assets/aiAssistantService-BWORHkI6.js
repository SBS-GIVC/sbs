import{c as p}from"./main-DTZYqsTu.js";import"./vendor-react-MVSD7VGK.js";import"./vendor-BW1Bdpst.js";const f=typeof window<"u"&&(window.SBS_API_URL||window.location.origin)||"";let d={},u=[];const y={cbc:"complete blood count",ct:"computed tomography",mri:"magnetic resonance imaging",ecg:"electrocardiogram",ekg:"electrocardiogram",us:"ultrasound",xray:"x-ray radiograph",cabg:"coronary artery bypass graft",ptca:"percutaneous transluminal coronary angioplasty",er:"emergency room",icu:"intensive care unit",iv:"intravenous",bp:"blood pressure",hba1c:"glycated haemoglobin",tsh:"thyroid stimulating hormone",ldl:"low density lipoprotein",hdl:"high density lipoprotein"};class S{constructor(){this.cache=new Map,this.cacheTimeout=1e3*60*30,this.catalogPromise=null,this.catalogFetchLimit=200}getCacheKey(t,e){return`${t}:${e.toLowerCase().trim()}`}getFromCache(t){const e=this.cache.get(t);return e&&Date.now()-e.timestamp<this.cacheTimeout?e.data:null}setCache(t,e){this.cache.set(t,{data:e,timestamp:Date.now()})}async fetchCatalogPage(t,e){const n=`${f}/api/sbs/codes?limit=${e}&offset=${t}`,a=await fetch(n,{headers:{Accept:"application/json"}});if(!a.ok)throw new Error(`SBS catalog fetch failed (${a.status})`);return a.json()}async fetchFullCatalog(){const t=`${f}/api/sbs/codes/all`,e=await fetch(t,{headers:{Accept:"application/json"}});if(!e.ok)throw new Error(`SBS full catalog fetch failed (${e.status})`);return e.json()}async ensureCatalogLoaded(){if(!(u.length>0)){if(this.catalogPromise){await this.catalogPromise;return}this.catalogPromise=(async()=>{const t=a=>a.filter(s=>s?.code&&s?.desc).map(s=>({code:s.code,desc:s.desc,descAr:s.descAr||null,category:s.category||null,chapter:s.chapter||null,fee:Number(s.fee||0)}));let e=[],n=null;try{const a=await this.fetchFullCatalog();e=t(Array.isArray(a.codes)?a.codes:[])}catch(a){n=a;let s=0,r=null;try{for(;;){const o=await this.fetchCatalogPage(s,this.catalogFetchLimit),i=Array.isArray(o.codes)?o.codes:[];if(i.length===0||(e.push(...t(i)),r=Number(o.total||0),s+=i.length,r>0&&s>=r))break}}catch(o){n=o}}e.length===0&&n&&console.warn("SBS catalog load unavailable, continuing with empty catalog:",n.message||n),u=e,d=Object.fromEntries(e.map(a=>[a.code,a]))})();try{await this.catalogPromise}finally{this.catalogPromise=null}}}async smartSearch(t,e={}){const{limit:n=20,category:a=null,includeAI:s=!0}=e;try{await this.ensureCatalogLoaded()}catch(i){return console.warn("SBS catalog unavailable during smart search:",i),{results:[],source:"unavailable",query:t.toLowerCase(),aiInsights:null}}let r=t.toLowerCase();for(const[i,c]of Object.entries(y))r=r.replace(new RegExp(`\\b${i}\\b`,"gi"),c);const o=this.localSearch(r,a,n);if(o.length>=5&&!s)return{results:o,source:"local",query:r};if(s&&o.length<10)try{const i=await this.getAISuggestions(t,o);return{results:this.mergeResults(o,i).slice(0,n),source:"ai_enhanced",query:r,aiInsights:i.insights}}catch(i){console.warn("AI enhancement failed, using local results:",i)}return{results:o,source:"local",query:r}}localSearch(t,e=null,n=20){if(!u.length)return[];const a=t.toLowerCase(),s=a.split(/\s+/).filter(o=>o.length>2),r=[];for(const o of u){if(e&&o.category!==e)continue;let i=0;const c=o.desc.toLowerCase(),h=(o.category||"").toLowerCase(),g=o.code.toLowerCase();(g===a||g.startsWith(a))&&(i+=100),c.includes(a)&&(i+=50);for(const l of s)c.includes(l)&&(i+=10,(c.startsWith(l)||c.includes(` ${l}`))&&(i+=5)),h.includes(l)&&(i+=3);i>0&&r.push({...o,score:i})}return r.sort((o,i)=>i.score-o.score),r.slice(0,n)}async getAISuggestions(t,e=[]){try{await this.ensureCatalogLoaded()}catch{return{suggestions:[],insights:null}}const n=this.getCacheKey("suggestions",t),a=this.getFromCache(n);if(a)return a;const s=e.slice(0,5).map(o=>`${o.code}: ${o.desc}`).join(`
`),r=`You are a Saudi healthcare billing expert. Given the search query, suggest the most relevant SBS (Saudi Billing System) procedure codes.

Search Query: "${t}"

Already Found Codes:
${s||"None"}

Based on the query, suggest additional specific SBS procedure codes that might be relevant. Consider:
1. The medical context and intent
2. Related procedures that are often performed together
3. Alternative terminology the user might mean

Return JSON only:
{
  "suggestions": [
    { "code": "XXXXX-XX-XX", "desc": "Description", "confidence": 0.95, "reason": "Why this matches" }
  ],
  "insights": "Brief explanation of the search intent and recommendations"
}`;try{const i=(await p(r,"You are a senior Saudi medical coder expert in SBS V3.1. Return only valid JSON.")).match(/\{[\s\S]*\}/);if(i){const c=JSON.parse(i[0]),g={suggestions:(c.suggestions||[]).map(l=>{const m=d[l.code];return m?{...m,confidence:l.confidence,aiReason:l.reason,source:"ai"}:null}).filter(Boolean),insights:c.insights};return this.setCache(n,g),g}}catch(o){console.error("AI suggestion error:",o)}return{suggestions:[],insights:null}}mergeResults(t,e){const n=new Set(t.map(s=>s.code)),a=[...t];for(const s of e.suggestions||[])n.has(s.code)||(a.push(s),n.add(s.code));return a}async validateClaim(t){const e=t.items||[];if(e.length===0)return{valid:!1,errors:["No items in claim"],warnings:[],suggestions:[]};const n=e.map((s,r)=>`${r+1}. ${s.sbsCode} - ${s.description} (Qty: ${s.quantity}, Price: ${s.unitPrice} SAR)`).join(`
`),a=`You are a Saudi healthcare claims auditor. Validate this claim for NPHIES submission.

Patient ID: ${t.patientId}
Service Date: ${t.serviceDate}
Claim Type: ${t.claimType}
Total Amount: ${t.totalAmount} SAR

Services:
${n}

Check for:
1. Missing required procedures (e.g., anesthesia with surgery)
2. Duplicate or conflicting codes
3. Unusual quantities or pricing
4. Prior authorization requirements
5. Bundle opportunities for cost savings

Return JSON:
{
  "valid": true/false,
  "errors": ["Critical issues that must be fixed"],
  "warnings": ["Non-critical issues to review"],
  "suggestions": [
    { "type": "add", "code": "XXXXX-XX-XX", "reason": "Why to add" },
    { "type": "bundle", "name": "Bundle Name", "savings": 5000 },
    { "type": "priorAuth", "code": "XXXXX-XX-XX", "reason": "Why PA needed" }
  ],
  "summary": "Brief summary of validation"
}`;try{const r=(await p(a,"You are a Saudi healthcare claims auditor. Validate for CHI/NPHIES compliance. Return only JSON.")).match(/\{[\s\S]*\}/);if(r)return JSON.parse(r[0])}catch(s){console.error("Claim validation error:",s)}return{valid:!0,errors:[],warnings:["AI validation unavailable - please review manually"],suggestions:[],summary:"Manual review required"}}async suggestDiagnoses(t,e){const n=this.getCacheKey("diagnosis",`${t}:${e}`),a=this.getFromCache(n);if(a)return a;const s=`You are a Saudi medical coder. Given this SBS procedure, suggest the most appropriate ICD-10 diagnosis codes.

SBS Procedure: ${t}
Description: ${e}

Suggest 3-5 commonly associated ICD-10 diagnosis codes with explanations.

Return JSON:
{
  "diagnoses": [
    { "code": "X00.00", "description": "Diagnosis description", "relevance": "high/medium/low", "reason": "Why associated" }
  ]
}`;try{const o=(await p(s,"You are a Saudi medical coding expert. Suggest ICD-10 diagnoses for SBS procedures. Return only JSON.")).match(/\{[\s\S]*\}/);if(o){const i=JSON.parse(o[0]);return this.setCache(n,i),i}}catch(r){console.error("Diagnosis suggestion error:",r)}return{diagnoses:[]}}async mapInternalCode(t,e,n={}){try{await this.ensureCatalogLoaded()}catch{return{sbsCode:null,confidence:0,rationale:"SBS catalogue is unavailable in this environment",verified:!1}}const a=`You are a Saudi healthcare billing expert. Map this internal hospital code to the official SBS V3.1 code.

Internal Code: ${t}
Description: ${e}
Department: ${n.department||"Unknown"}
Facility Type: ${n.facilityType||"Hospital"}

Find the most accurate SBS V3.1 code. The SBS code format is NNNNN-NN-NN.

Return JSON:
{
  "sbsCode": "NNNNN-NN-NN",
  "sbsDescription": "Official SBS description",
  "confidence": 0.95,
  "rationale": "Why this mapping is correct",
  "alternatives": [
    { "code": "NNNNN-NN-NN", "description": "Alternative", "confidence": 0.85 }
  ]
}`;try{const o=(await p(a,"You are a Saudi SBS V3.1 coding expert. Map internal codes to official SBS codes. Return only JSON.")).match(/\{[\s\S]*\}/);if(o){const i=JSON.parse(o[0]);if(i.sbsCode&&d[i.sbsCode])return{...i,verified:!0,officialDesc:d[i.sbsCode].desc};const c=this.localSearch(i.sbsDescription||e,null,5);if(c.length>0)return{sbsCode:c[0].code,sbsDescription:c[0].desc,confidence:.75,rationale:"AI suggestion validated against SBS catalogue",verified:!0,alternatives:c.slice(1,4).map(h=>({code:h.code,description:h.desc,confidence:.6}))}}}catch(r){console.error("Code mapping error:",r)}const s=this.localSearch(e,null,5);return s.length>0?{sbsCode:s[0].code,sbsDescription:s[0].desc,confidence:.6,rationale:"Matched by description keywords",verified:!0,alternatives:s.slice(1).map(r=>({code:r.code,description:r.desc,confidence:.5}))}:{sbsCode:null,confidence:0,rationale:"No matching SBS code found",verified:!1}}async assistPriorAuth(t,e,n){try{await this.ensureCatalogLoaded()}catch{return{justification:"SBS catalogue unavailable; please provide manual prior-auth rationale.",supportingPoints:["Medical necessity","Clinical history"],requiredDocuments:["Clinical notes","Supporting diagnostics"],estimatedApprovalTime:"48-72 hours",approvalLikelihood:"medium",tips:["Retry when catalog service is available"]}}const a=d[t],s=`You are a Saudi healthcare prior authorization specialist. Help prepare a prior authorization request.

Procedure: ${t} - ${a?.desc||"Unknown procedure"}
Patient Age: ${e.age||"Unknown"}
Patient Gender: ${e.gender||"Unknown"}
Diagnosis: ${e.diagnosis||"Not specified"}
Clinical Notes: ${n||"None provided"}

Generate a professional prior authorization justification that will maximize approval chances with Saudi insurance companies.

Return JSON:
{
  "justification": "Detailed clinical justification text",
  "supportingPoints": ["Key point 1", "Key point 2"],
  "requiredDocuments": ["Document 1", "Document 2"],
  "estimatedApprovalTime": "24-48 hours",
  "approvalLikelihood": "high/medium/low",
  "tips": ["Tip to improve approval chances"]
}`;try{const o=(await p(s,"You are a Saudi healthcare prior authorization expert. Help maximize PA approval chances. Return only JSON.")).match(/\{[\s\S]*\}/);if(o)return JSON.parse(o[0])}catch(r){console.error("PA assistance error:",r)}return{justification:"Please provide clinical justification for this procedure.",supportingPoints:["Medical necessity","Patient history"],requiredDocuments:["Clinical notes","Lab results","Imaging reports"],estimatedApprovalTime:"48-72 hours",approvalLikelihood:"medium",tips:["Include detailed clinical history","Attach supporting documentation"]}}getAllCodes(){return u}getCategories(){const t=new Set;for(const e of u)e.category&&t.add(e.category);return Array.from(t).sort()}getCode(t){return d[t]||null}getTotalCount(){return u.length}}const b=new S;export{S as AIAssistantService,b as aiAssistant};
//# sourceMappingURL=aiAssistantService-BWORHkI6.js.map
