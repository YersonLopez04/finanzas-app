'use client';

import { useState } from 'react';
import { Calendar, Check, ChevronDown } from 'lucide-react';
import { owedToYou } from '@/lib/totals';
import { categoryBadgeClass } from '@/lib/categoryColors';
import { formatCurrency, formatShortDate, monthBounds, todayISO, toISODate } from '@/lib/utils';
import { Sheet } from '@/components/ui/Sheet';
import { Switch } from '@/components/ui/Switch';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { AmountInput } from '@/components/ui/AmountInput';
import type { Category, PaymentMethod } from '@/types';
import { PAYMENT_METHODS } from '@/types';

export interface ExpenseForm {
  date: string;
  amount: string;
  category: string;
  description: string;
  paymentMethod: PaymentMethod | '';
  shared: boolean;
  myShare: string;
  reimbursedAmount: string;
}

const chip =
  'inline-flex h-10 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold transition-transform duration-150 active:scale-95';
const neutralChip = (on: boolean) =>
  on
    ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
    : 'bg-stone-50 text-stone-700 ring-1 ring-inset ring-stone-200 dark:bg-stone-800 dark:text-stone-200 dark:ring-stone-700';

function yesterdayISO() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return toISODate(d);
}

// Registro de un gasto: primero el monto y la categoría (lo que se usa casi
// siempre); fecha, método, nota y compartido quedan plegados en una fila.
export function ExpenseSheet({
  initial,
  editing,
  categories,
  monthId,
  saving,
  onClose,
  onSubmit,
  onDelete,
}: {
  initial: ExpenseForm;
  editing: boolean;
  categories: Category[];
  monthId: string;
  saving: boolean;
  onClose: () => void;
  onSubmit: (form: ExpenseForm) => void;
  onDelete?: () => void;
}) {
  const [form, setForm] = useState(initial);
  const [showDetails, setShowDetails] = useState(editing);
  const set = <K extends keyof ExpenseForm>(key: K, value: ExpenseForm[K]) => setForm((f) => ({ ...f, [key]: value }));

  const today = todayISO();
  const yesterday = yesterdayISO();
  const quickDates = [
    { value: today, label: 'Hoy' },
    { value: yesterday, label: 'Ayer' },
  ].filter((d) => d.value.startsWith(monthId));
  const isQuickDate = quickDates.some((d) => d.value === form.date);
  const [pickOtherDate, setPickOtherDate] = useState(!isQuickDate);

  const amount = Number(form.amount) || 0;
  const canSave = amount > 0 && !!form.category && !saving;
  const dateLabel = form.date === today ? 'Hoy' : form.date === yesterday ? 'Ayer' : formatShortDate(form.date);
  const methodLabel = PAYMENT_METHODS.find((m) => m.value === form.paymentMethod)?.label ?? 'Sin método';
  const summary = [dateLabel, methodLabel, form.description && `“${form.description}”`, form.shared && 'Compartido']
    .filter(Boolean)
    .join(' · ');
  const owed = owedToYou({
    amount,
    shared: true,
    myShare: form.myShare !== '' ? Number(form.myShare) : null,
    reimbursedAmount: Number(form.reimbursedAmount || 0),
  });

  function submit() {
    if (canSave) onSubmit(form);
  }

  let buttonLabel = editing ? 'Guardar cambios' : `Guardar ${formatCurrency(amount)}`;
  if (saving) buttonLabel = 'Guardando…';
  else if (amount <= 0) buttonLabel = 'Escribe el monto';
  else if (!form.category) buttonLabel = 'Elige una categoría';

  return (
    <Sheet title={editing ? 'Editar gasto' : 'Nuevo gasto'} onClose={onClose} aboveNav>
      <AmountInput
        value={form.amount}
        onChange={(v) => set('amount', v)}
        aria-label="Monto"
        autoFocus={!editing}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
      />

      <p className="mx-0.5 mb-2 text-sm font-semibold text-stone-500 dark:text-stone-400">Categoría</p>
      <div className="mb-4 flex flex-wrap gap-2">
        {categories.map((c) => {
          const on = form.category === c.name;
          return (
            <button
              key={c.id}
              type="button"
              aria-pressed={on}
              onClick={() => set('category', c.name)}
              className={`${chip} ${categoryBadgeClass(c.name)} ${on ? 'ring-2 ring-inset ring-current' : ''}`}
            >
              {on && <Check size={15} strokeWidth={3} />}
              {c.name}
            </button>
          );
        })}
        {categories.length === 0 && (
          <p className="text-sm text-stone-500 dark:text-stone-400">Crea una categoría con el engranaje de arriba.</p>
        )}
      </div>

      <button
        type="button"
        aria-expanded={showDetails}
        onClick={() => setShowDetails((v) => !v)}
        className="mb-4 flex h-12 w-full items-center gap-2 rounded-xl bg-stone-50 px-3 text-left text-sm text-stone-800 ring-1 ring-inset ring-stone-200 dark:bg-stone-800 dark:text-stone-100 dark:ring-stone-700"
      >
        <Calendar size={17} className="shrink-0 text-stone-500 dark:text-stone-400" />
        <span className="min-w-0 flex-1 truncate text-stone-600 dark:text-stone-300">{summary}</span>
        <ChevronDown
          size={17}
          className={`shrink-0 text-stone-500 transition-transform duration-300 ease-out dark:text-stone-400 ${showDetails ? 'rotate-180' : ''}`}
        />
      </button>

      {showDetails && (
        <div className="motion-pop mb-2 flex flex-col gap-3">
          <div>
            <p className="mx-0.5 mb-2 text-sm font-semibold text-stone-500 dark:text-stone-400">Fecha</p>
            {quickDates.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {quickDates.map((d) => {
                  const on = !pickOtherDate && form.date === d.value;
                  return (
                    <button
                      key={d.value}
                      type="button"
                      aria-pressed={on}
                      onClick={() => {
                        setPickOtherDate(false);
                        set('date', d.value);
                      }}
                      className={`${chip} ${neutralChip(on)}`}
                    >
                      {on && <Check size={15} strokeWidth={3} />}
                      {d.label}
                    </button>
                  );
                })}
                <button
                  type="button"
                  aria-pressed={pickOtherDate}
                  onClick={() => setPickOtherDate(true)}
                  className={`${chip} ${neutralChip(pickOtherDate)}`}
                >
                  {pickOtherDate && <Check size={15} strokeWidth={3} />}
                  Otra fecha
                </button>
              </div>
            )}
            {(pickOtherDate || quickDates.length === 0) && (
              <Input
                type="date"
                aria-label="Fecha del gasto"
                {...monthBounds(monthId)}
                value={form.date}
                onChange={(e) => e.target.value && set('date', e.target.value)}
              />
            )}
          </div>

          <div>
            <p className="mx-0.5 mb-2 text-sm font-semibold text-stone-500 dark:text-stone-400">Método de pago</p>
            <div className="flex flex-wrap gap-2">
              {PAYMENT_METHODS.map((m) => {
                const on = form.paymentMethod === m.value;
                return (
                  <button
                    key={m.value}
                    type="button"
                    aria-pressed={on}
                    onClick={() => set('paymentMethod', on ? '' : m.value)}
                    className={`${chip} ${neutralChip(on)}`}
                  >
                    {on && <Check size={15} strokeWidth={3} />}
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          <Input
            label="Descripción (opcional)"
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="¿En qué fue?"
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />

          <Switch
            checked={form.shared}
            onChange={(v) => set('shared', v)}
            label="Gasto compartido"
            description="Pagaste tú y otros te devuelven una parte."
          />

          {form.shared && (
            <div className="flex flex-col gap-1.5">
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Mi parte"
                  inputMode="decimal"
                  value={form.myShare}
                  onChange={(e) => set('myShare', e.target.value.replace(',', '.').replace(/[^\d.]/g, ''))}
                  placeholder="0.00"
                />
                <Input
                  label="Ya me pagaron"
                  inputMode="decimal"
                  value={form.reimbursedAmount}
                  onChange={(e) => set('reimbursedAmount', e.target.value.replace(',', '.').replace(/[^\d.]/g, ''))}
                  placeholder="0.00"
                />
              </div>
              {amount > 0 && (
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  {owed > 0 ? (
                    <>
                      Te deben <b className="text-amber-800 dark:text-amber-300">{formatCurrency(owed)}</b>
                    </>
                  ) : (
                    'No te deben nada'
                  )}
                  {form.myShare === '' && ' · sin tu parte, se asume que te deben todo'}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      <div className="mt-1 flex gap-2.5">
        {onDelete && (
          <Button variant="danger" className="h-12 px-5" onClick={onDelete}>
            Eliminar
          </Button>
        )}
        <Button variant="cta" className="h-12 flex-1 text-[15px]" onClick={submit} disabled={!canSave}>
          {buttonLabel}
        </Button>
      </div>
    </Sheet>
  );
}
