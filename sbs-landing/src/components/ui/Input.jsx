import React, { useId } from 'react';

/**
 * Premium Input Component
 * Optimized for GIVC-SBS Ultra-Premium Design System
 */
export function Input({
  label,
  hint,
  icon,
  error,
  required = false,
  id,
  className = '',
  ...props
}) {
  const autoId = useId();
  const inputId = id || props.id || autoId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = [
    props['aria-describedby'],
    errorId,
    hintId
  ].filter(Boolean).join(' ') || undefined;

  const ariaLabel =
    props['aria-label'] ||
    (!label && typeof props.placeholder === 'string' ? props.placeholder : undefined);

  const paddingInlineStart = icon ? '3rem' : '1rem';
  const paddingInlineEnd = '1rem';

  return (
    <div className="flex flex-col gap-2 w-full group">
      {label && (
        <label
          htmlFor={inputId}
          className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500"
          style={{ marginInlineStart: '0.25rem' }}
        >
          {label}
          {required && (
            <span aria-hidden="true" className="text-rose-500">{' '}*</span>
          )}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span
            className="absolute top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors material-symbols-outlined text-[20px]"
            style={{ insetInlineStart: '1rem' }}
          >
            {icon}
          </span>
        )}
        <input
          {...props}
          id={inputId}
          required={required}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          aria-label={ariaLabel}
          style={{
            ...(props.style || {}),
            paddingInlineStart,
            paddingInlineEnd
          }}
          className={`
            w-full py-3.5 
            bg-slate-50 dark:bg-slate-900/50 
            border border-slate-200 dark:border-slate-800 
            rounded-2xl text-sm font-bold 
            text-slate-900 dark:text-white 
            placeholder:text-slate-400 dark:placeholder:text-slate-600
            focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600/50
            shadow-inner transition-all duration-300
            ${error ? 'border-rose-500/60 focus:ring-rose-500/20 focus:border-rose-500/70' : ''}
            ${className}
          `}
        />
      </div>
      {error && (
        <span
          id={errorId}
          role="alert"
          className="text-[10px] font-bold text-rose-600 mt-1"
          style={{ marginInlineStart: '0.25rem' }}
        >
          {error}
        </span>
      )}
      {hint && (
        <span
          id={hintId}
          className="text-[10px] font-bold text-slate-400 mt-1"
          style={{ marginInlineStart: '0.25rem' }}
        >
          {hint}
        </span>
      )}
    </div>
  );
}
