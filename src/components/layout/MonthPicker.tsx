'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDayMonth, monthIdToLabel } from '@/lib/utils';
import { useCycle } from '@/lib/cycle-context';
import { cycleRangeLabel } from '@/lib/cycle';

interface Props {
  monthId: string;
  onChange: (monthId: string) => void;
}

function addMonths(monthId: string, delta: number) {
  const [y, m] = monthId.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function MonthPicker({ monthId, onChange }: Props) {
  const range = cycleRangeLabel(useCycle().boundsOf(monthId), formatDayMonth);
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onChange(addMonths(monthId, -1))}
        aria-label="Mes anterior"
        className="p-2 -m-0.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500 dark:text-stone-400 transition-colors"
      >
        <ChevronLeft size={16} />
      </button>
      <span className="min-w-[140px] text-center leading-tight">
        <span className="block text-sm font-medium text-stone-700 dark:text-stone-200 first-letter:uppercase">
          {monthIdToLabel(monthId)}
        </span>
        <span className="mt-0.5 block text-[11.5px] tabular-nums text-stone-500 dark:text-stone-400">{range}</span>
      </span>
      <button
        onClick={() => onChange(addMonths(monthId, 1))}
        aria-label="Mes siguiente"
        className="p-2 -m-0.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500 dark:text-stone-400 transition-colors"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
