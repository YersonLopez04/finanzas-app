'use client';

import { useState } from 'react';
import { useCycle } from '@/lib/cycle-context';
import { formatShortDate, monthIdToLabel } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Sheet } from '@/components/ui/Sheet';
import { reportError } from '@/components/ui/ErrorToast';

// Aviso de que llegó el cobro: el dueño confirma el día real y empieza el ciclo
// siguiente. Hasta entonces la app sigue en el ciclo actual.
export function CycleNotice() {
  const { pending, confirmStart } = useCycle();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [date, setDate] = useState('');
  const [saving, setSaving] = useState(false);

  if (!pending) return null;
  const name = monthIdToLabel(pending.monthId).split(' ')[0];
  const arrived = pending.proposed <= pending.max;

  async function start(startDate: string) {
    if (saving || !startDate) return;
    setSaving(true);
    try {
      await confirmStart(startDate);
    } catch (err) {
      reportError(err);
      setSaving(false);
    }
  }

  return (
    <>
      <div className="mx-auto mb-4 max-w-2xl rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3.5 dark:border-sky-500/20 dark:bg-sky-500/10">
        <p className="text-sm font-semibold text-sky-800 dark:text-sky-300">Empieza {name}</p>
        <p className="mb-3 mt-0.5 text-sm text-sky-800 dark:text-sky-300">
          {arrived
            ? `Tu cobro previsto era el ${formatShortDate(pending.proposed)}. ¿Cobraste ese día?`
            : `Tu cobro está previsto para el ${formatShortDate(pending.proposed)}. ¿Ya cobraste?`}{' '}
          Tus gastos desde entonces pasarán a {name}.
        </p>
        <div className="flex gap-2">
          <Button variant="cta" className="flex-1" disabled={saving} onClick={() => start(pending.suggestedStart)}>
            {saving ? 'Guardando…' : arrived ? `Sí, el ${formatShortDate(pending.suggestedStart)}` : 'Sí, cobré hoy'}
          </Button>
          <Button
            variant="secondary"
            disabled={saving}
            onClick={() => {
              setDate(pending.suggestedStart);
              setSheetOpen(true);
            }}
          >
            Otro día
          </Button>
        </div>
      </div>

      {sheetOpen && (
        <Sheet title="¿Qué día cobraste?" onClose={() => setSheetOpen(false)}>
          <div className="flex flex-col gap-3">
            <p className="text-sm text-stone-500 dark:text-stone-400">Ese día empieza {name}.</p>
            <Input
              type="date"
              aria-label="Día de cobro"
              min={pending.min}
              max={pending.max}
              value={date}
              onChange={(e) => e.target.value && setDate(e.target.value)}
            />
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Puedes elegir desde el {formatShortDate(pending.min)} hasta hoy. Los gastos con fecha desde ese día pasan a {name}.
            </p>
            <Button variant="cta" className="h-12 text-[15px]" disabled={saving || !date} onClick={() => start(date)}>
              {saving ? 'Guardando…' : `Empezar ${name}`}
            </Button>
          </div>
        </Sheet>
      )}
    </>
  );
}
