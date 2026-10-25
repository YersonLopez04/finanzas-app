'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  getMonth,
  saveMonth,
  getFixedExpenseEntries,
  getFixedExpenseEntryTotals,
  addFixedExpenseEntry,
  deleteFixedExpenseEntry,
} from '@/lib/db';
import {
  getCurrentMonthId,
  getPreviousMonthId,
  monthIdToLabel,
  formatCurrency,
  todayISO,
  insertAt,
  formatShortDate,
  formatDayMonth,
  defaultDateForMonth,
} from '@/lib/utils';
import { dueStatus } from '@/lib/due';
import { showUndo } from '@/components/ui/UndoToast';
import { MonthPicker } from '@/components/layout/MonthPicker';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Sheet } from '@/components/ui/Sheet';
import { Switch } from '@/components/ui/Switch';
import { AmountInput } from '@/components/ui/AmountInput';
import { reportError, LoadError } from '@/components/ui/ErrorToast';
import type { MonthData, FixedExpense, FixedExpenseEntry } from '@/types';
import { Plus, Trash2, Check, Copy, Target, AlertCircle, RotateCw } from 'lucide-react';

type SheetState = { kind: 'edit'; id: string | null } | { kind: 'carga'; id: string } | null;
type SaveState = 'saved' | 'saving' | 'error';

const sortDay = (e: FixedExpense) => e.dueDay ?? 99;

function DueMeta({ expense, monthId }: { expense: FixedExpense; monthId: string }) {
  const status = dueStatus(expense, monthId);
  const pill = 'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-bold';
  switch (status.kind) {
    case 'paid':
      return (
        <p className="mt-0.5 flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-300">
          <Check size={13} strokeWidth={2.5} />
          {expense.paidDate ? `Pagado el ${formatDayMonth(expense.paidDate)}` : 'Pagado'}
        </p>
      );
    case 'late':
      return (
        <p className="mt-0.5">
          <span className={`${pill} bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300`}>
            <AlertCircle size={12} strokeWidth={2.5} /> Venció el {status.day}
          </span>
        </p>
      );
    case 'today':
      return (
        <p className="mt-0.5">
          <span className={`${pill} bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300`}>Vence hoy</span>
        </p>
      );
    case 'tomorrow':
      return (
        <p className="mt-0.5">
          <span className={`${pill} bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300`}>Vence mañana</span>
        </p>
      );
    case 'upcoming':
      return <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">Vence el {status.day}</p>;
    default:
      return <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">Sin día de pago</p>;
  }
}

function BillRow({
  expense,
  monthId,
  animate,
  onToggle,
  onEdit,
}: {
  expense: FixedExpense;
  monthId: string;
  animate: { x: number; y: number } | null;
  onToggle: (id: string, x: number, y: number) => void;
  onEdit: (id: string) => void;
}) {
  const point = useRef({ x: 50, y: 50 });
  return (
    <div className="flex items-center gap-1 pl-1.5 pr-2">
      <button
        type="button"
        role="checkbox"
        aria-checked={expense.paid}
        aria-label={`${expense.name || 'Gasto fijo'}: ${expense.paid ? 'pagado' : 'pendiente'}`}
        className={`pay-check ${animate ? 'animate' : ''}`}
        style={animate ? ({ '--x': `${animate.x}%`, '--y': `${animate.y}%` } as React.CSSProperties) : undefined}
        onPointerDown={(e) => {
          const r = e.currentTarget.querySelector('.ring')!.getBoundingClientRect();
          point.current = {
            x: Math.round(((e.clientX - r.left) / r.width) * 100),
            y: Math.round(((e.clientY - r.top) / r.height) * 100),
          };
        }}
        onClick={() => {
          onToggle(expense.id, point.current.x, point.current.y);
          point.current = { x: 50, y: 50 };
        }}
      >
        <span className="ring">
          <Check size={15} strokeWidth={3} />
        </span>
      </button>
      <button
        type="button"
        onClick={() => onEdit(expense.id)}
        className="flex min-h-[60px] min-w-0 flex-1 items-center gap-3 rounded-xl py-2 pl-1 text-left active:bg-stone-50 dark:active:bg-stone-800/60"
      >
        <span className="min-w-0 flex-1">
          <span
            className={`line-clamp-2 text-[15px] leading-tight ${
              expense.paid ? 'font-medium text-stone-500 dark:text-stone-400' : 'font-semibold text-stone-800 dark:text-stone-100'
            }`}
          >
            {expense.name || 'Sin nombre'}
          </span>
          <DueMeta expense={expense} monthId={monthId} />
        </span>
        <span
          className={`shrink-0 text-[15px] tabular-nums ${
            expense.paid ? 'font-medium text-stone-500 dark:text-stone-400' : 'font-semibold text-stone-800 dark:text-stone-100'
          }`}
        >
          {formatCurrency(expense.amount || 0)}
        </span>
      </button>
    </div>
  );
}

function BudgetRow({
  expense,
  spent,
  onEdit,
  onAddEntry,
}: {
  expense: FixedExpense;
  spent: number;
  onEdit: (id: string) => void;
  onAddEntry: (id: string) => void;
}) {
  const budget = expense.amount || 0;
  const pct = budget > 0 ? Math.min(spent / budget, 1) : 0;
  const over = spent > budget;
  return (
    <div className="flex items-center gap-1 pl-1.5 pr-2">
      <span className="grid h-11 w-11 shrink-0 place-items-center" aria-hidden="true">
        <span className="grid h-[30px] w-[30px] place-items-center rounded-full bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300">
          <Target size={16} />
        </span>
      </span>
      <button
        type="button"
        onClick={() => onEdit(expense.id)}
        className="flex min-h-[60px] min-w-0 flex-1 items-center gap-3 rounded-xl py-2 pl-1 text-left active:bg-stone-50 dark:active:bg-stone-800/60"
      >
        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 text-[15px] font-semibold leading-tight text-stone-800 dark:text-stone-100">
            {expense.name || 'Sin nombre'}
          </span>
          <span className={`mt-0.5 block text-xs ${over ? 'font-semibold text-amber-800 dark:text-amber-300' : 'text-stone-500 dark:text-stone-400'}`}>
            {over
              ? `Te pasaste por ${formatCurrency(spent - budget)}`
              : `Quedan ${formatCurrency(budget - spent)} de ${formatCurrency(budget)}`}
          </span>
          <span className="mt-1.5 block h-[5px] overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800">
            <span
              className={`block h-full w-full origin-left rounded-full transition-transform duration-300 ease-out ${
                over ? 'bg-amber-500' : 'bg-sky-500 dark:bg-sky-400'
              }`}
              style={{ transform: `scaleX(${pct})` }}
            />
          </span>
        </span>
      </button>
      <button
        type="button"
        onClick={() => onAddEntry(expense.id)}
        className="grid h-11 shrink-0 place-items-center pl-1"
        aria-label={`Registrar carga en ${expense.name || 'presupuesto'}`}
      >
        <span className="rounded-full bg-sky-100 px-3 py-1.5 text-xs font-bold text-sky-800 dark:bg-sky-500/15 dark:text-sky-300">
          + Carga
        </span>
      </button>
    </div>
  );
}

function Section({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mx-1 mb-2 flex justify-between text-xs font-bold uppercase tracking-wide text-stone-600 dark:text-stone-400">
        <span>{title}</span>
        {count !== undefined && <span>{count}</span>}
      </h2>
      <div className="divide-y divide-stone-100 rounded-2xl border border-stone-100 bg-white py-1 shadow-[0_2px_16px_rgba(41,37,36,0.06)] dark:divide-stone-800 dark:border-stone-800 dark:bg-stone-900 dark:shadow-none">
        {children}
      </div>
    </section>
  );
}

function ExpenseSheet({
  expense,
  userId,
  onClose,
  onSave,
  onDelete,
  onSpentDelta,
}: {
  expense: FixedExpense | null;
  userId: string;
  onClose: () => void;
  onSave: (data: Pick<FixedExpense, 'name' | 'amount' | 'dueDay' | 'tracked'>) => void;
  onDelete: (id: string) => void;
  onSpentDelta: (id: string, delta: number) => void;
}) {
  const [name, setName] = useState(expense?.name ?? '');
  const [amount, setAmount] = useState(expense?.amount ? String(expense.amount) : '');
  const [dueDay, setDueDay] = useState(expense?.dueDay ? String(expense.dueDay) : '');
  const [tracked, setTracked] = useState(expense?.tracked ?? false);
  const [entries, setEntries] = useState<FixedExpenseEntry[] | null>(null);

  const expenseId = expense?.id;
  const loadsEntries = !!expense?.tracked;
  useEffect(() => {
    if (!expenseId || !loadsEntries) return;
    getFixedExpenseEntries(userId, expenseId).then(setEntries, reportError);
  }, [userId, expenseId, loadsEntries]);

  function handleDeleteEntry(entry: FixedExpenseEntry) {
    if (!entries || !expenseId) return;
    const index = entries.indexOf(entry);
    setEntries((prev) => prev && prev.filter((e) => e.id !== entry.id));
    onSpentDelta(expenseId, -entry.amount);
    showUndo({
      message: 'Carga borrada',
      onUndo: () => {
        setEntries((prev) => prev && insertAt(prev, index, entry));
        onSpentDelta(expenseId, entry.amount);
      },
      onCommit: () => deleteFixedExpenseEntry(entry.id),
    });
  }

  function handleSave() {
    if (!name.trim()) return;
    const day = dueDay === '' ? undefined : Math.min(31, Math.max(1, Math.round(Number(dueDay)))) || undefined;
    onSave({ name: name.trim(), amount: Number(amount) || 0, dueDay: tracked ? undefined : day, tracked });
  }

  return (
    <Sheet title={expense ? 'Editar gasto fijo' : 'Nuevo gasto fijo'} onClose={onClose}>
      <div className="flex flex-col gap-3">
        <Input label="Nombre" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Internet" autoFocus={!expense} />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label={tracked ? 'Presupuesto (S/)' : 'Monto (S/)'}
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(',', '.').replace(/[^\d.]/g, ''))}
            placeholder="0.00"
          />
          {!tracked && (
            <Input
              label="Día de pago"
              inputMode="numeric"
              value={dueDay}
              onChange={(e) => setDueDay(e.target.value.replace(/\D/g, '').slice(0, 2))}
              placeholder="1 a 31"
            />
          )}
        </div>
        <Switch
          checked={tracked}
          onChange={setTracked}
          label="Lo gasto de a pocos"
          description="Para presupuestos como gasolina: registras cargas y ves cuánto te queda."
        />

        {expense?.tracked && entries && (
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-stone-600 dark:text-stone-300">Cargas del mes</p>
            {entries.length === 0 && <p className="text-xs text-stone-500 dark:text-stone-400">Aún no registras cargas.</p>}
            {entries.map((e) => (
              <div key={e.id} className="flex items-center gap-2 text-sm">
                <span className="w-20 shrink-0 text-xs text-stone-500 dark:text-stone-400">{formatShortDate(e.date)}</span>
                <span className="min-w-0 flex-1 truncate text-stone-600 dark:text-stone-300">{e.note}</span>
                <span className="font-medium tabular-nums text-stone-700 dark:text-stone-200">{formatCurrency(e.amount)}</span>
                <button
                  type="button"
                  onClick={() => handleDeleteEntry(e)}
                  aria-label="Eliminar carga"
                  className="-mr-2 grid h-10 w-10 shrink-0 place-items-center text-stone-400 hover:text-red-500 dark:text-stone-500"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-1 flex gap-2.5">
          {expense && (
            <Button variant="danger" className="h-12 px-5" onClick={() => onDelete(expense.id)}>
              Eliminar
            </Button>
          )}
          <Button variant="cta" className="h-12 flex-1 text-[15px]" onClick={handleSave} disabled={!name.trim()}>
            Guardar
          </Button>
        </div>
      </div>
    </Sheet>
  );
}

function EntrySheet({
  expense,
  spent,
  monthId,
  userId,
  onClose,
  onAdded,
}: {
  expense: FixedExpense;
  spent: number;
  monthId: string;
  userId: string;
  onClose: () => void;
  onAdded: (amount: number, entryId: string) => void;
}) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const value = Number(amount) || 0;
  const left = (expense.amount || 0) - spent - value;

  async function handleSave() {
    if (value <= 0 || saving) return;
    setSaving(true);
    try {
      const id = await addFixedExpenseEntry({
        fixedExpenseId: expense.id,
        userId,
        date: defaultDateForMonth(monthId),
        amount: value,
        note: note.trim(),
      });
      onAdded(value, id);
    } catch (err) {
      reportError(err);
      setSaving(false);
    }
  }

  return (
    <Sheet title={`Carga de ${expense.name || 'presupuesto'}`} onClose={onClose}>
      <AmountInput
        value={amount}
        onChange={setAmount}
        aria-label="Monto de la carga"
        autoFocus
        onKeyDown={(e) => e.key === 'Enter' && handleSave()}
      />
      <div className="flex flex-col gap-3">
        <Input label="Nota (opcional)" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Grifo, lugar…" />
        <p className="text-sm text-stone-500 dark:text-stone-400">
          {left >= 0 ? (
            <>
              Te quedarán <b className="text-sky-700 dark:text-sky-300">{formatCurrency(left)}</b> de {formatCurrency(expense.amount || 0)}
            </>
          ) : (
            <b className="text-rose-700 dark:text-rose-300">Te pasarás por {formatCurrency(-left)}</b>
          )}
        </p>
        <Button variant="cta" className="h-12 text-[15px]" onClick={handleSave} disabled={value <= 0 || saving}>
          {saving ? 'Guardando…' : value > 0 ? `Registrar ${formatCurrency(value)}` : 'Registrar carga'}
        </Button>
      </div>
    </Sheet>
  );
}

export default function GastosFijosPage() {
  const { user } = useAuth();
  const [monthId, setMonthId] = useState(getCurrentMonthId());
  const [expenses, setExpensesState] = useState<FixedExpense[]>([]);
  const [monthData, setMonthData] = useState<MonthData | null>(null);
  const [previousExpenses, setPreviousExpenses] = useState<FixedExpense[]>([]);
  const [spentTotals, setSpentTotals] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [sheet, setSheet] = useState<SheetState>(null);
  const [justPaid, setJustPaid] = useState<{ id: string; x: number; y: number } | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('saved');

  // La lista más reciente, para guardados encadenados y para deshacer.
  const expensesRef = useRef<FixedExpense[]>([]);
  // Gastos borrados que aún se pueden deshacer: siguen en la base (y se reenvían
  // en cada guardado) hasta que vence el plazo, para no perder sus cargas.
  const pendingDeletes = useRef(new Map<string, FixedExpense>());
  const saveChain = useRef<Promise<unknown>>(Promise.resolve());
  const pendingSaves = useRef(0);

  function setExpenses(next: FixedExpense[]) {
    expensesRef.current = next;
    setExpensesState(next);
  }

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    setLoadError(null);
    Promise.all([getMonth(user.id, monthId), getMonth(user.id, getPreviousMonthId(monthId))])
      .then(async ([data, prevData]) => {
        const fixedExpenses = data?.fixedExpenses ?? [];
        const trackedIds = fixedExpenses.filter((e) => e.tracked).map((e) => e.id);
        const totals = await getFixedExpenseEntryTotals(user.id, trackedIds);
        setMonthData(data);
        expensesRef.current = fixedExpenses;
        setExpensesState(fixedExpenses);
        setPreviousExpenses(prevData?.fixedExpenses ?? []);
        setSpentTotals(totals);
      })
      .catch(setLoadError)
      .finally(() => setLoading(false));
  }, [user, monthId]);

  // Cada cambio se guarda solo. Los guardados van en fila para que uno viejo
  // nunca pise a uno nuevo; cada uno manda la lista completa del momento.
  function queueSave(): Promise<boolean> {
    if (!user) return Promise.resolve(false);
    const userId = user.id;
    const month = monthId;
    const base = monthData;
    pendingSaves.current += 1;
    setSaveState('saving');
    const run = saveChain.current.then(async () => {
      try {
        await saveMonth(userId, month, {
          ...base,
          // Esta pantalla no edita ahorros: no reenviarlos evita pisar con una copia vieja.
          savings: undefined,
          fixedExpenses: [...expensesRef.current, ...pendingDeletes.current.values()],
          createdAt: base?.createdAt ?? new Date().toISOString(),
        });
        return true;
      } catch (err) {
        reportError(err);
        return false;
      }
    });
    saveChain.current = run;
    run.then((ok) => {
      pendingSaves.current -= 1;
      if (!ok) setSaveState('error');
      else if (pendingSaves.current === 0) setSaveState((s) => (s === 'error' ? s : 'saved'));
    });
    return run;
  }

  function retrySave() {
    setSaveState('saving');
    queueSave();
  }

  function persist(next: FixedExpense[]) {
    setExpenses(next);
    queueSave();
  }

  function togglePaid(id: string, x: number, y: number) {
    const before = expensesRef.current.find((e) => e.id === id);
    if (!before) return;
    const paid = !before.paid;
    persist(expensesRef.current.map((e) => (e.id === id ? { ...e, paid, paidDate: paid ? todayISO() : undefined } : e)));
    setJustPaid(paid ? { id, x, y } : null);
    const name = before.name || 'Gasto fijo';
    showUndo({
      message: paid ? `«${name}» pagado` : `«${name}» vuelve a pendiente`,
      onUndo: () => {
        setJustPaid(null);
        persist(expensesRef.current.map((e) => (e.id === id ? { ...e, paid: before.paid, paidDate: before.paidDate } : e)));
      },
    });
  }

  function saveFromSheet(id: string | null, data: Pick<FixedExpense, 'name' | 'amount' | 'dueDay' | 'tracked'>) {
    const list = expensesRef.current;
    if (id) {
      persist(list.map((e) => (e.id === id ? { ...e, ...data } : e)));
    } else {
      persist([...list, { id: crypto.randomUUID(), paid: false, order: list.length, ...data }]);
    }
    setSheet(null);
  }

  function removeExpense(id: string) {
    const list = expensesRef.current;
    const index = list.findIndex((e) => e.id === id);
    const removed = list[index];
    if (!removed) return;
    setSheet(null);
    pendingDeletes.current.set(id, removed);
    setExpenses(list.filter((e) => e.id !== id));
    showUndo({
      message: `«${removed.name || 'Gasto fijo'}» eliminado`,
      onUndo: () => {
        pendingDeletes.current.delete(id);
        persist(insertAt(expensesRef.current, index, removed));
      },
      onCommit: async () => {
        pendingDeletes.current.delete(id);
        const ok = await queueSave();
        // El error ya se mostró; se devuelve a la lista porque sigue en la base.
        if (!ok) setExpenses(insertAt(expensesRef.current, index, removed));
      },
    });
  }

  function copyFromPreviousMonth() {
    persist(
      previousExpenses.map((e, i) => ({
        id: crypto.randomUUID(),
        name: e.name,
        amount: e.amount,
        dueDay: e.dueDay,
        tracked: e.tracked,
        paid: false,
        paidDate: undefined,
        order: i,
      }))
    );
    setSpentTotals({});
  }

  function bumpSpent(id: string, delta: number) {
    setSpentTotals((prev) => ({ ...prev, [id]: Math.max((prev[id] ?? 0) + delta, 0) }));
  }

  function handleEntryAdded(expense: FixedExpense, amount: number, entryId: string) {
    bumpSpent(expense.id, amount);
    setSheet(null);
    showUndo({
      message: `Carga de ${formatCurrency(amount)} registrada`,
      onUndo: async () => {
        await deleteFixedExpenseEntry(entryId);
        bumpSpent(expense.id, -amount);
      },
    });
  }

  const bills = expenses.filter((e) => !e.tracked);
  const budgets = expenses.filter((e) => e.tracked);
  const toPay = bills.filter((e) => !e.paid).sort((a, b) => sortDay(a) - sortDay(b));
  const paidBills = bills.filter((e) => e.paid).sort((a, b) => sortDay(a) - sortDay(b));
  const billsTotal = bills.reduce((s, e) => s + (e.amount || 0), 0);
  const paidTotal = paidBills.reduce((s, e) => s + (e.amount || 0), 0);
  const isCurrentMonth = monthId === getCurrentMonthId();
  const monthName = monthIdToLabel(monthId).split(' ')[0];

  const sheetExpense = sheet?.id ? expenses.find((e) => e.id === sheet.id) ?? null : null;

  if (loading) return <div className="text-stone-500 dark:text-stone-400 text-sm mt-8 text-center">Cargando...</div>;
  if (loadError) return <LoadError error={loadError} />;

  const billRow = (e: FixedExpense) => (
    <BillRow
      key={e.id}
      expense={e}
      monthId={monthId}
      animate={justPaid?.id === e.id ? justPaid : null}
      onToggle={togglePaid}
      onEdit={(id) => setSheet({ kind: 'edit', id })}
    />
  );

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-stone-800 dark:text-stone-100">Gastos Fijos</h1>
        <MonthPicker
          monthId={monthId}
          onChange={(m) => {
            setSheet(null);
            setMonthId(m);
          }}
        />
      </div>

      {/* Copiar del mes anterior */}
      {expenses.length === 0 && previousExpenses.length > 0 && (
        <div className="flex items-center justify-between gap-3 bg-sky-50 dark:bg-sky-500/10 border border-sky-100 dark:border-sky-500/20 rounded-2xl px-5 py-3.5">
          <p className="text-sm text-sky-800 dark:text-sky-300">
            Tienes {previousExpenses.length} gasto{previousExpenses.length > 1 ? 's' : ''} fijo{previousExpenses.length > 1 ? 's' : ''} guardado{previousExpenses.length > 1 ? 's' : ''} en {monthIdToLabel(getPreviousMonthId(monthId))}. ¿Los copiamos a este mes?
          </p>
          <Button size="sm" onClick={copyFromPreviousMonth} className="shrink-0">
            <Copy size={13} className="mr-1.5" /> Copiar
          </Button>
        </div>
      )}

      {expenses.length > 0 && (
        <div>
          {bills.length > 0 && (
            <div className="rounded-2xl bg-slate-800 px-5 py-4 text-slate-50">
              <p className="text-xs text-slate-300">{isCurrentMonth ? 'Por pagar este mes' : `Por pagar en ${monthName}`}</p>
              <p className="mb-2.5 mt-0.5 text-[32px] font-bold leading-tight tracking-tight tabular-nums">
                {formatCurrency(billsTotal - paidTotal)}
              </p>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/15">
                <div
                  className="h-full w-full origin-left rounded-full bg-emerald-300 transition-transform duration-300 ease-out"
                  style={{ transform: `scaleX(${billsTotal ? paidTotal / billsTotal : 0})` }}
                />
              </div>
              <div className="mt-2 flex justify-between text-xs text-slate-300">
                <span>Pagado {formatCurrency(paidTotal)}</span>
                <span>
                  {paidBills.length} de {bills.length} pagos
                </span>
              </div>
            </div>
          )}
          <div className="mx-1 mt-2 flex items-center gap-1.5 text-xs text-stone-600 dark:text-stone-400" aria-live="polite">
            {saveState === 'error' ? (
              <button type="button" onClick={retrySave} className="flex items-center gap-1.5 font-semibold text-rose-700 dark:text-rose-300">
                <RotateCw size={13} /> No se guardó el último cambio · Reintentar
              </button>
            ) : saveState === 'saving' ? (
              'Guardando…'
            ) : (
              <>
                <Check size={13} /> Los cambios se guardan solos
              </>
            )}
          </div>
        </div>
      )}

      {bills.length > 0 && (
        <Section title="Por pagar" count={toPay.length}>
          {toPay.length > 0 ? (
            toPay.map(billRow)
          ) : (
            <p className="px-4 py-4 text-sm text-stone-500 dark:text-stone-400">Todo pagado {isCurrentMonth ? 'este mes' : `en ${monthName}`}.</p>
          )}
        </Section>
      )}

      {budgets.length > 0 && (
        <Section title="Presupuestos">
          {budgets.map((e) => (
            <BudgetRow
              key={e.id}
              expense={e}
              spent={spentTotals[e.id] ?? 0}
              onEdit={(id) => setSheet({ kind: 'edit', id })}
              onAddEntry={(id) => setSheet({ kind: 'carga', id })}
            />
          ))}
        </Section>
      )}

      {paidBills.length > 0 && (
        <Section title="Pagados" count={paidBills.length}>
          {paidBills.map(billRow)}
        </Section>
      )}

      {expenses.length === 0 && previousExpenses.length === 0 && (
        <p className="text-center text-sm text-stone-500 dark:text-stone-400">
          Anota tus pagos de cada mes (alquiler, internet, cuotas) y márcalos al pagarlos.
        </p>
      )}

      <button
        type="button"
        onClick={() => setSheet({ kind: 'edit', id: null })}
        className="flex h-12 w-full items-center justify-center gap-1.5 rounded-2xl border-[1.5px] border-dashed border-stone-300 text-sm font-semibold text-stone-600 hover:bg-white dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-900"
      >
        <Plus size={16} /> Agregar gasto fijo
      </button>

      {sheet?.kind === 'edit' && (
        <ExpenseSheet
          key={sheet.id ?? 'new'}
          expense={sheetExpense}
          userId={user!.id}
          onClose={() => setSheet(null)}
          onSave={(data) => saveFromSheet(sheet.id, data)}
          onDelete={removeExpense}
          onSpentDelta={bumpSpent}
        />
      )}
      {sheet?.kind === 'carga' && sheetExpense && (
        <EntrySheet
          expense={sheetExpense}
          spent={spentTotals[sheetExpense.id] ?? 0}
          monthId={monthId}
          userId={user!.id}
          onClose={() => setSheet(null)}
          onAdded={(amount, entryId) => handleEntryAdded(sheetExpense, amount, entryId)}
        />
      )}
    </div>
  );
}
