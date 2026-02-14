import{r as p,j as e}from"./vendor-react-MVSD7VGK.js";function I({label:l,hint:n,icon:r,error:a,required:i=!1,id:c,className:x="",...t}){const m=p.useId(),s=c||t.id||m,d=n?`${s}-hint`:void 0,o=a?`${s}-error`:void 0,u=[t["aria-describedby"],o,d].filter(Boolean).join(" ")||void 0,b=t["aria-label"]||(!l&&typeof t.placeholder=="string"?t.placeholder:void 0),f=r?"3rem":"1rem";return e.jsxs("div",{className:"flex flex-col gap-2 w-full group",children:[l&&e.jsxs("label",{htmlFor:s,className:"text-[10px] font-black uppercase tracking-[0.2em] text-slate-500",style:{marginInlineStart:"0.25rem"},children:[l,i&&e.jsxs("span",{"aria-hidden":"true",className:"text-rose-500",children:[" ","*"]})]}),e.jsxs("div",{className:"relative",children:[r&&e.jsx("span",{className:"absolute top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors material-symbols-outlined text-[20px]",style:{insetInlineStart:"1rem"},children:r}),e.jsx("input",{...t,id:s,required:i,"aria-invalid":!!a,"aria-describedby":u,"aria-label":b,style:{...t.style||{},paddingInlineStart:f,paddingInlineEnd:"1rem"},className:`
            w-full py-3.5 
            bg-slate-50 dark:bg-slate-900/50 
            border border-slate-200 dark:border-slate-800 
            rounded-2xl text-sm font-bold 
            text-slate-900 dark:text-white 
            placeholder:text-slate-400 dark:placeholder:text-slate-600
            focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600/50
            shadow-inner transition-all duration-300
            ${a?"border-rose-500/60 focus:ring-rose-500/20 focus:border-rose-500/70":""}
            ${x}
          `})]}),a&&e.jsx("span",{id:o,role:"alert",className:"text-[10px] font-bold text-rose-600 mt-1",style:{marginInlineStart:"0.25rem"},children:a}),n&&e.jsx("span",{id:d,className:"text-[10px] font-bold text-slate-400 mt-1",style:{marginInlineStart:"0.25rem"},children:n})]})}export{I};
//# sourceMappingURL=Input-OxrVsoY9.js.map
