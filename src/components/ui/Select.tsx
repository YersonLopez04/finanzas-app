import { SelectHTMLAttributes, useId } from 'react';

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

export function Select({ label, options, id, className = '', ...props }: Props) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={fieldId} className="text-sm font-medium text-stone-600 dark:text-stone-300">
          {label}
        </label>
      )}
      <select
        id={fieldId}
        className={`w-full px-3.5 py-2.5 text-sm border border-stone-200 dark:border-stone-700 rounded-xl bg-stone-50/60 dark:bg-stone-800/60 text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600 focus:bg-white dark:focus:bg-stone-900 focus:border-transparent transition ${className}`}
        {...props}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
