'use client';

import { ButtonHTMLAttributes } from 'react';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
}

export function Button({ variant = 'primary', size = 'md', className = '', ...props }: Props) {
  const base = 'inline-flex items-center justify-center font-medium rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97]';
  const sizes = { sm: 'px-3.5 py-1.5 text-sm', md: 'px-5 py-2.5 text-sm' };
  const variants = {
    primary: 'bg-slate-800 text-white hover:bg-slate-900 shadow-sm shadow-slate-800/20',
    secondary: 'bg-stone-100 text-stone-700 hover:bg-stone-200',
    ghost: 'text-stone-600 hover:bg-stone-100',
    danger: 'bg-red-50 text-red-600 hover:bg-red-100',
  };
  return (
    <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props} />
  );
}
