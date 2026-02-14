import{j as e}from"./vendor-react-MVSD7VGK.js";function x({children:r,icon:s,variant:l="primary",onClick:o,className:i="",disabled:d=!1,loading:t=!1,size:n="md",type:b="button",...h}){const u={primary:"bg-blue-600 text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 hover:shadow-blue-600/30",secondary:"bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm",ghost:"bg-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800",danger:"bg-rose-500 text-white shadow-lg shadow-rose-500/20 hover:bg-rose-600",success:"bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-600"},a={sm:"px-3 py-2 text-xs rounded-lg",md:"px-5 py-2.5 text-sm rounded-xl",lg:"px-6 py-3 text-base rounded-2xl"};return e.jsxs("button",{...h,type:b,onClick:o,disabled:d||t,className:`
        btn-premium relative isolate overflow-hidden inline-flex items-center justify-center gap-2 
        ${a[n]||a.md} font-bold tracking-tight
        disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white
        dark:focus-visible:ring-offset-slate-900
        ${u[l]}
        ${i}
      `,children:[t?e.jsx("span",{"aria-hidden":"true",className:"material-symbols-outlined animate-spin text-[18px]",children:"progress_activity"}):s&&e.jsx("span",{"aria-hidden":"true",className:"material-symbols-outlined text-[18px]",children:s}),e.jsx("span",{children:r})]})}export{x as B};
//# sourceMappingURL=Button-BDY0gMZ-.js.map
