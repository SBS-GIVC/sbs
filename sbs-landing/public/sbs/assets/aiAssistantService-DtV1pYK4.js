import{c as p}from"./main-CrAJ0RmW.js";import"./vendor-react-DS7a0TT8.js";import"./vendor-hzXslIYo.js";const f=typeof window<"u"&&(window.SBS_API_URL||window.location.origin)||"";let d={},u=[];const y={cbc:"complete blood count",ct:"computed tomography",mri:"magnetic resonance imaging",ecg:"electrocardiogram",ekg:"electrocardiogram",us:"ultrasound",xray:"x-ray radiograph",cabg:"coronary artery bypass graft",ptca:"percutaneous transluminal coronary angioplasty",er:"emergency room",icu:"intensive care unit",iv:"intravenous",bp:"blood pressure",hba1c:"glycated haemoglobin",tsh:"thyroid stimulating hormone",ldl:"low density lipoprotein",hdl:"high density lipoprotein"};class S{constructor(){this.cache=new Map,this.cacheTimeout=1e3*60*30,this.catalogPromise=null,this.catalogFetchLimit=200}getCacheKey(t,e){return`${t}:${e.toLowerCase().trim()}`}getFromCache(t){const e=this.cache.get(t);return e&&Date.now()-e.timestamp<this.cacheTimeout?e.data:null}setCache(t,e){this.cache.set(t,{data:e,timestamp:Date.now()})}async fetchCatalogPage(t,e){const o=`${f}/api/sbs/codes?limit=${e}&offset=${t}`,s=await fetch(o,{headers:{Accept:"application/json"}});if(!s.ok)throw new Error(`SBS catalog fetch failed (${s.status})`);return s.json()}async fetchFullCatalog(){const t=`${f}/api/sbs/codes/all`,e=await fetch(t,{headers:{Accept:"application/json"}});if(!e.ok)throw new Error(`SBS full catalog fetch failed (${e.status})`);return e.json()}async ensureCatalogLoaded(){if(!(u.length>0)){if(this.catalogPromise){await this.catalogPromise;return}this.catalogPromise=(async()=>{const t=o=>o.filter(s=>s?.code&&s?.desc).map(s=>({code:s.code,desc:s.desc,descAr:s.descAr||null,category:s.category||null,chapter:s.chapter||null,fee:Number(s.fee||0)}));let e=[];try{const o=await this.fetchFullCatalog();e=t(Array.isArray(o.codes)?o.codes:[])}catch{let o=0,s=null;for(;;){const a=await this.fetchCatalogPage(o,this.catalogFetchLimit),i=Array.isArray(a.codes)?a.codes:[];if(i.length===0||(e.push(...t(i)),s=Number(a.total||0),o+=i.length,s>0&&o>=s))break}}u=e,d=Object.fromEntries(e.map(o=>[o.code,o]))})();try{await this.catalogPromise}finally{this.catalogPromise=null}}}async smartSearch(t,e={}){const{limit:o=20,category:s=null,includeAI:a=!0}=e;await this.ensureCatalogLoaded();let i=t.toLowerCase();for(const[n,c]of Object.entries(y))i=i.replace(new RegExp(`\\b${n}\\b`,"gi"),c);const r=this.localSearch(i,s,o);if(r.length>=5&&!a)return{results:r,source:"local",query:i};if(a&&r.length<10)try{const n=await this.getAISuggestions(t,r);return{results:this.mergeResults(r,n).slice(0,o),source:"ai_enhanced",query:i,aiInsights:n.insights}}catch(n){console.warn("AI enhancement failed, using local results:",n)}return{results:r,source:"local",query:i}}localSearch(t,e=null,o=20){if(!u.length)return[];const s=t.toLowerCase(),a=s.split(/\s+/).filter(r=>r.length>2),i=[];for(const r of u){if(e&&r.category!==e)continue;let n=0;const c=r.desc.toLowerCase(),h=(r.category||"").toLowerCase(),g=r.code.toLowerCase();(g===s||g.startsWith(s))&&(n+=100),c.includes(s)&&(n+=50);for(const l of a)c.includes(l)&&(n+=10,(c.startsWith(l)||c.includes(` ${l}`))&&(n+=5)),h.includes(l)&&(n+=3);n>0&&i.push({...r,score:n})}return i.sort((r,n)=>n.score-r.score),i.slice(0,o)}async getAISuggestions(t,e=[]){await this.ensureCatalogLoaded();const o=this.getCacheKey("suggestions",t),s=this.getFromCache(o);if(s)return s;const a=e.slice(0,5).map(r=>`${r.code}: ${r.desc}`).join(`
`),i=`You are a Saudi healthcare billing expert. Given the search query, suggest the most relevant SBS (Saudi Billing System) procedure codes.

Search Query: "${t}"

Already Found Codes:
${a||"None"}

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
}`;try{const n=(await p(i,"You are a senior Saudi medical coder expert in SBS V3.1. Return only valid JSON.")).match(/\{[\s\S]*\}/);if(n){const c=JSON.parse(n[0]),g={suggestions:(c.suggestions||[]).map(l=>{const m=d[l.code];return m?{...m,confidence:l.confidence,aiReason:l.reason,source:"ai"}:null}).filter(Boolean),insights:c.insights};return this.setCache(o,g),g}}catch(r){console.error("AI suggestion error:",r)}return{suggestions:[],insights:null}}mergeResults(t,e){const o=new Set(t.map(a=>a.code)),s=[...t];for(const a of e.suggestions||[])o.has(a.code)||(s.push(a),o.add(a.code));return s}async validateClaim(t){const e=t.items||[];if(e.length===0)return{valid:!1,errors:["No items in claim"],warnings:[],suggestions:[]};const o=e.map((a,i)=>`${i+1}. ${a.sbsCode} - ${a.description} (Qty: ${a.quantity}, Price: ${a.unitPrice} SAR)`).join(`
`),s=`You are a Saudi healthcare claims auditor. Validate this claim for NPHIES submission.

Patient ID: ${t.patientId}
Service Date: ${t.serviceDate}
Claim Type: ${t.claimType}
Total Amount: ${t.totalAmount} SAR

Services:
${o}

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
}`;try{const i=(await p(s,"You are a Saudi healthcare claims auditor. Validate for CHI/NPHIES compliance. Return only JSON.")).match(/\{[\s\S]*\}/);if(i)return JSON.parse(i[0])}catch(a){console.error("Claim validation error:",a)}return{valid:!0,errors:[],warnings:["AI validation unavailable - please review manually"],suggestions:[],summary:"Manual review required"}}async suggestDiagnoses(t,e){const o=this.getCacheKey("diagnosis",`${t}:${e}`),s=this.getFromCache(o);if(s)return s;const a=`You are a Saudi medical coder. Given this SBS procedure, suggest the most appropriate ICD-10 diagnosis codes.

SBS Procedure: ${t}
Description: ${e}

Suggest 3-5 commonly associated ICD-10 diagnosis codes with explanations.

Return JSON:
{
  "diagnoses": [
    { "code": "X00.00", "description": "Diagnosis description", "relevance": "high/medium/low", "reason": "Why associated" }
  ]
}`;try{const r=(await p(a,"You are a Saudi medical coding expert. Suggest ICD-10 diagnoses for SBS procedures. Return only JSON.")).match(/\{[\s\S]*\}/);if(r){const n=JSON.parse(r[0]);return this.setCache(o,n),n}}catch(i){console.error("Diagnosis suggestion error:",i)}return{diagnoses:[]}}async mapInternalCode(t,e,o={}){await this.ensureCatalogLoaded();const s=`You are a Saudi healthcare billing expert. Map this internal hospital code to the official SBS V3.1 code.

Internal Code: ${t}
Description: ${e}
Department: ${o.department||"Unknown"}
Facility Type: ${o.facilityType||"Hospital"}

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
}`;try{const r=(await p(s,"You are a Saudi SBS V3.1 coding expert. Map internal codes to official SBS codes. Return only JSON.")).match(/\{[\s\S]*\}/);if(r){const n=JSON.parse(r[0]);if(n.sbsCode&&d[n.sbsCode])return{...n,verified:!0,officialDesc:d[n.sbsCode].desc};const c=this.localSearch(n.sbsDescription||e,null,5);if(c.length>0)return{sbsCode:c[0].code,sbsDescription:c[0].desc,confidence:.75,rationale:"AI suggestion validated against SBS catalogue",verified:!0,alternatives:c.slice(1,4).map(h=>({code:h.code,description:h.desc,confidence:.6}))}}}catch(i){console.error("Code mapping error:",i)}const a=this.localSearch(e,null,5);return a.length>0?{sbsCode:a[0].code,sbsDescription:a[0].desc,confidence:.6,rationale:"Matched by description keywords",verified:!0,alternatives:a.slice(1).map(i=>({code:i.code,description:i.desc,confidence:.5}))}:{sbsCode:null,confidence:0,rationale:"No matching SBS code found",verified:!1}}async assistPriorAuth(t,e,o){await this.ensureCatalogLoaded();const s=d[t],a=`You are a Saudi healthcare prior authorization specialist. Help prepare a prior authorization request.

Procedure: ${t} - ${s?.desc||"Unknown procedure"}
Patient Age: ${e.age||"Unknown"}
Patient Gender: ${e.gender||"Unknown"}
Diagnosis: ${e.diagnosis||"Not specified"}
Clinical Notes: ${o||"None provided"}

Generate a professional prior authorization justification that will maximize approval chances with Saudi insurance companies.

Return JSON:
{
  "justification": "Detailed clinical justification text",
  "supportingPoints": ["Key point 1", "Key point 2"],
  "requiredDocuments": ["Document 1", "Document 2"],
  "estimatedApprovalTime": "24-48 hours",
  "approvalLikelihood": "high/medium/low",
  "tips": ["Tip to improve approval chances"]
}`;try{const r=(await p(a,"You are a Saudi healthcare prior authorization expert. Help maximize PA approval chances. Return only JSON.")).match(/\{[\s\S]*\}/);if(r)return JSON.parse(r[0])}catch(i){console.error("PA assistance error:",i)}return{justification:"Please provide clinical justification for this procedure.",supportingPoints:["Medical necessity","Patient history"],requiredDocuments:["Clinical notes","Lab results","Imaging reports"],estimatedApprovalTime:"48-72 hours",approvalLikelihood:"medium",tips:["Include detailed clinical history","Attach supporting documentation"]}}getAllCodes(){return u}getCategories(){const t=new Set;for(const e of u)e.category&&t.add(e.category);return Array.from(t).sort()}getCode(t){return d[t]||null}getTotalCount(){return u.length}}const A=new S;export{S as AIAssistantService,A as aiAssistant};
//# sourceMappingURL=aiAssistantService-DtV1pYK4.js.map
