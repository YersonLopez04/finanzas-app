'use client';

import { InputHTMLAttributes } from 'react';

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: string;
  onChange: (value: string) => void;
}

// Deja solo dígitos y un punto decimal (la coma del teclado también vale).
function cleanAmount(raw: string) {
  const s = raw.replace(',', '.').replace(/[^\d.]/g, '');
  const [whole, ...rest] = s.split('.');
  return rest.length ? `${whole}.${rest.join('').slice(0, 2)}` : whole;
}

// Monto grande al centro de una hoja: es lo primero que se escribe.
export function AmountInput({ value, onChange, className = '', ...props }: Props) {
  return (
    <div className={`flex items-baseline justify-center gap-1.5 pb-4 pt-1 ${className}`}>
      <span className="text-2xl font-semibold text-stone-500 dark:text-stone-400">S/</span>
      <input
        type="text"
        inputMode="decimal"
        autoComplete="off"
        placeholder="0"
        value={value}
        // size da el ancho en navegadores sin field-sizing; con él, el ancho sigue al texto.
        size={Math.max(value.length, 1)}
        onChange={(e) => onChange(cleanAmount(e.target.value))}
        className="min-w-[1.2ch] max-w-[7ch] bg-transparent p-0 text-5xl font-bold tracking-tight text-stone-800 tabular-nums [field-sizing:content] placeholder:text-stone-300 focus:outline-none dark:text-stone-100 dark:placeholder:text-stone-600"
        {...props}
      />
    </div>
  );
}
