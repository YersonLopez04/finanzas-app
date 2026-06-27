'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { monthIdToLabel } from '@/lib/utils';

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
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onChange(addMonths(monthId, -1))}
        className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-500 transition-colors"
      >
        <ChevronLeft size={16} />
      </button>
      <span className="text-sm font-medium text-stone-700 capitalize min-w-[140px] text-center">
        {monthIdToLabel(monthId)}
      </span>
      <button
        onClick={() => onChange(addMonths(monthId, 1))}
        className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-500 transition-colors"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
