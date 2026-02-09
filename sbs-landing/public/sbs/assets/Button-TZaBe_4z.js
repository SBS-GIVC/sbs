import{j as e}from"./vendor-react-DS7a0TT8.js";function g({children:r,icon:t,variant:l="primary",onClick:o,className:d="",disabled:n=!1,loading:s=!1,size:i="md",type:b="button",...x}){const h={primary:"bg-blue-600 text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 hover:shadow-blue-600/30",secondary:"bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm",ghost:"bg-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800",danger:"bg-rose-500 text-white shadow-lg shadow-rose-500/20 hover:bg-rose-600",success:"bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-600"},a={sm:"px-3 py-2 text-xs rounded-lg",md:"px-5 py-2.5 text-sm rounded-xl",lg:"px-6 py-3 text-base rounded-2xl"};return e.jsxs("button",{...x,type:b,onClick:o,disabled:n||s,className:`
        btn-premium inline-flex items-center justify-center gap-2 
        ${a[i]||a.md} font-bold tracking-tight
        disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100
        ${h[l]}
        ${d}
      `,children:[s?e.jsx("span",{className:"material-symbols-outlined animate-spin text-[18px]",children:"progress_activity"}):t&&e.jsx("span",{className:"material-symbols-outlined text-[18px]",children:t}),e.jsx("span",{children:r})]})}export{g as B};
//# sourceMappingURL=Button-TZaBe_4z.js.map
