import React from 'react';

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  icon,
  iconPosition = 'left',
  onClick,
  type = 'button',
  disabled = false,
}) {
  const variants = {
    primary: 'bg-gradient-to-r from-primary to-blue-600 hover:from-primary-hover hover:to-blue-700 text-white shadow-medium hover:shadow-glow',
    secondary: 'bg-white dark:bg-surface-dark text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-primary/30 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-soft',
    ghost: 'bg-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800',
    success: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-medium',
    danger: 'bg-red-600 hover:bg-red-700 text-white shadow-medium',
  };

  const sizes = {
    sm: 'px-3 py-2 text-sm rounded-lg',
    md: 'px-4 py-2.5 text-sm rounded-xl',
    lg: 'px-6 py-3 text-base rounded-2xl',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 font-semibold transition-all duration-300 ${variants[variant]} ${sizes[size]} ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02]'} ${className}`}
    >
      {icon && iconPosition === 'left' && (
        <span className="material-symbols-outlined text-[18px]">{icon}</span>
      )}
      {children}
      {icon && iconPosition === 'right' && (
        <span className="material-symbols-outlined text-[18px]">{icon}</span>
      )}
    </button>
  );
}
