'use client';

import { ButtonHTMLAttributes } from 'react';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'cta' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
}

export function Button({ variant = 'primary', size = 'md', className = '', ...props }: Props) {
  const base = 'inline-flex items-center justify-center font-medium rounded-full transition disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97]';
  const sizes = { sm: 'px-3.5 py-1.5 text-sm', md: 'px-5 py-2.5 text-sm' };
  const variants = {
    primary: 'bg-slate-800 text-white hover:bg-slate-900 dark:hover:bg-slate-700 shadow-sm shadow-slate-800/20',
    // Acción principal de una hoja: en modo noche se aclara para destacar sobre la tarjeta.
    cta: 'bg-slate-800 text-white hover:bg-slate-900 shadow-sm shadow-slate-800/20 dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-white dark:shadow-none',
    secondary: 'bg-stone-100 text-stone-700 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700',
    ghost: 'text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800',
    danger: 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20',
  };
  return (
    <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props} />
  );
}
