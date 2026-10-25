'use client';

interface Props {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
}

// Fila entera tocable con interruptor a la derecha.
export function Switch({ checked, onChange, label, description }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center gap-3 rounded-xl py-2.5 text-left"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-stone-800 dark:text-stone-100">{label}</span>
        {description && <span className="mt-0.5 block text-xs text-stone-500 dark:text-stone-400">{description}</span>}
      </span>
      <span
        aria-hidden="true"
        className={`relative h-7 w-[46px] shrink-0 rounded-full transition-colors duration-200 ${
          checked ? 'bg-slate-800 dark:bg-slate-200' : 'bg-stone-300 dark:bg-stone-600'
        }`}
      >
        <span
          className={`absolute left-[3px] top-[3px] h-[22px] w-[22px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.25)] transition-transform duration-300 [transition-timing-function:var(--spring)] ${
            checked ? 'translate-x-[18px] dark:bg-stone-900' : ''
          }`}
        />
      </span>
    </button>
  );
}
