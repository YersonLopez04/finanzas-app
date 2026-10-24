'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  getMonth,
  saveMonth,
  getFixedExpenseEntries,
  getFixedExpenseEntryTotals,
  addFixedExpenseEntry,
  deleteFixedExpenseEntry,
} from '@/lib/db';
import { getCurrentMonthId, getPreviousMonthId, monthIdToLabel, formatCurrency, todayISO } from '@/lib/utils';
import { MonthPicker } from '@/components/layout/MonthPicker';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { reportError, LoadError } from '@/components/ui/ErrorToast';
import type { MonthData, FixedExpense, FixedExpenseEntry } from '@/types';
import { Plus, Trash2, Check, Copy, Target, ChevronDown, ChevronUp, X } from 'lucide-react';

function emptyExpense(): FixedExpense {
  return { id: crypto.randomUUID(), name: '', amount: 0, paid: false, order: Date.now() };
}

function FixedExpenseRow({
  expense,
  userId,
  spent,
  onUpdate,
  onRemove,
  onToggleTracked,
  onSpentDelta,
}: {
  expense: FixedExpense;
  userId: string;
  spent: number;
  onUpdate: (id: string, field: keyof FixedExpense, value: string | number | boolean | undefined) => void;
  onRemove: (id: string) => void;
  onToggleTracked: (id: string) => void;
  onSpentDelta: (id: string, delta: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [entries, setEntries] = useState<FixedExpenseEntry[]>([]);
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [entryDate, setEntryDate] = useState(todayISO());
  const [entryAmount, setEntryAmount] = useState('');
  const [entryNote, setEntryNote] = useState('');

  async function loadEntries() {
    const data = await getFixedExpenseEntries(userId, expense.id);
    setEntries(data);
  }

  async function handleToggleExpand() {
    try {
      if (!expanded) await loadEntries();
      setExpanded((p) => !p);
    } catch (err) {
      reportError(err);
    }
  }

  async function handleAddEntry() {
    if (!entryAmount) return;
    const amount = Number(entryAmount);
    try {
      await addFixedExpenseEntry({ fixedExpenseId: expense.id, userId, date: entryDate, amount, note: entryNote });
      onSpentDelta(expense.id, amount);
      setEntryAmount('');
      setEntryNote('');
      setShowEntryForm(false);
      await loadEntries();
    } catch (err) {
      reportError(err);
    }
  }

  async function handleDeleteEntry(id: string, amount: number) {
    try {
      await deleteFixedExpenseEntry(id);
      onSpentDelta(expense.id, -amount);
      setEntries((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      reportError(err);
    }
  }

  const pct = expense.amount > 0 ? Math.min(spent / expense.amount, 1) : 0;
  const over = spent > expense.amount;

  return (
    <div
      className={`rounded-lg transition-colors ${
        !expense.tracked && expense.paid ? 'bg-emerald-50 dark:bg-emerald-500/10' : 'bg-white dark:bg-transparent'
      }`}
    >
      <div className="flex items-center gap-2 p-2">
        {expense.tracked ? (
          <button
            onClick={handleToggleExpand}
            aria-label={expanded ? 'Ocultar cargas registradas' : 'Ver cargas registradas'}
            className="shrink-0 w-6 h-6 flex items-center justify-center text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        ) : (
          <button
            onClick={() => onUpdate(expense.id, 'paid', !expense.paid)}
            aria-label={expense.paid ? 'Marcar como pendiente' : 'Marcar como pagado'}
            className={`shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
              expense.paid
                ? 'bg-emerald-500 border-emerald-500 text-white'
                : 'border-stone-300 dark:border-stone-600 hover:border-emerald-400 dark:hover:border-emerald-500'
            }`}
          >
            {expense.paid && <Check size={12} />}
          </button>
        )}
        <Input
          value={expense.name}
          onChange={(ev) => onUpdate(expense.id, 'name', ev.target.value)}
          placeholder="Nombre del gasto"
          className={`flex-1 min-w-0 ${!expense.tracked && expense.paid ? 'line-through text-stone-500 dark:text-stone-400' : ''}`}
        />
        <Input
          type="number"
          value={expense.dueDay ?? ''}
          onChange={(ev) => {
            const v = ev.target.value;
            onUpdate(expense.id, 'dueDay', v === '' ? undefined : Math.min(31, Math.max(1, Number(v))));
          }}
          placeholder="Día"
          title="Día del mes en que vence (opcional)"
          min={1}
          max={31}
          className="w-14 shrink-0"
        />
        <Input
          type="number"
          value={expense.amount || ''}
          onChange={(ev) => onUpdate(expense.id, 'amount', Number(ev.target.value))}
          placeholder="0"
          title={expense.tracked ? 'Presupuesto del mes' : undefined}
          className="w-20 shrink-0"
        />
        <button
          onClick={() => onToggleTracked(expense.id)}
          aria-label={expense.tracked ? 'Cambiar a pago único' : 'Activar seguimiento (presupuesto que se gasta de a pocos)'}
          title={expense.tracked ? 'Seguimiento activado — clic para volver a pago único' : 'Activar seguimiento: presupuesto que gastas de a pocos (ej. gasolina)'}
          className={`shrink-0 p-2 -m-2 transition-colors ${
            expense.tracked ? 'text-sky-500 dark:text-sky-400' : 'text-stone-400 dark:text-stone-600 hover:text-sky-500 dark:hover:text-sky-400'
          }`}
        >
          <Target size={15} />
        </button>
        <button
          onClick={() => onRemove(expense.id)}
          aria-label="Eliminar gasto fijo"
          className="text-stone-400 dark:text-stone-600 hover:text-red-400 transition-colors shrink-0 p-2 -m-2"
        >
          <Trash2 size={15} />
        </button>
      </div>

      {expense.tracked && (
        <div className="px-2 pb-2 flex flex-col gap-1">
          <div className="h-1.5 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
            <div
              className={`h-full w-full rounded-full origin-left transition-transform duration-200 ease-out ${
                over ? 'bg-amber-400 dark:bg-amber-500' : pct >= 1 ? 'bg-emerald-400 dark:bg-emerald-500' : 'bg-sky-400 dark:bg-sky-500'
              }`}
              style={{ transform: `scaleX(${pct})` }}
            />
          </div>
          <p className={`text-xs ${over ? 'text-amber-600 dark:text-amber-400' : 'text-stone-500 dark:text-stone-400'}`}>
            {formatCurrency(spent)} de {formatCurrency(expense.amount)} usado
            {over ? ` — te pasaste por ${formatCurrency(spent - expense.amount)}` : ''}
          </p>
        </div>
      )}

      {expense.tracked && expanded && (
        <div className="motion-pop px-2 pb-3 pt-1 flex flex-col gap-2 border-t border-stone-100 dark:border-stone-800">
          {showEntryForm ? (
            <div className="motion-pop flex flex-col gap-2 bg-stone-50 dark:bg-stone-800/60 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-semibold text-stone-600 dark:text-stone-300">Nueva carga</p>
                <button onClick={() => setShowEntryForm(false)} aria-label="Cerrar formulario" className="p-2 -m-2">
                  <X size={14} className="text-stone-500 dark:text-stone-400" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
                <Input
                  type="number"
                  value={entryAmount}
                  onChange={(e) => setEntryAmount(e.target.value)}
                  placeholder="Monto (S/)"
                  autoFocus
                />
              </div>
              <Input
                value={entryNote}
                onChange={(e) => setEntryNote(e.target.value)}
                placeholder="Nota (ej. Grifo Primax)"
                onKeyDown={(e) => e.key === 'Enter' && handleAddEntry()}
              />
              <Button size="sm" onClick={handleAddEntry} disabled={!entryAmount}>
                Registrar
              </Button>
            </div>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => setShowEntryForm(true)} className="self-start">
              <Plus size={13} className="mr-1" /> Registrar carga
            </Button>
          )}

          {entries.length === 0 && (
            <p className="text-xs text-stone-500 dark:text-stone-400">Sin cargas registradas.</p>
          )}
          {entries.map((e) => (
            <div key={e.id} className="flex items-center justify-between text-sm">
              <div className="min-w-0">
                <span className="text-stone-500 dark:text-stone-400 text-xs mr-2">{e.date}</span>
                <span className="text-stone-600 dark:text-stone-300">{e.note}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-stone-700 dark:text-stone-200 font-medium">{formatCurrency(e.amount)}</span>
                <button
                  onClick={() => handleDeleteEntry(e.id, e.amount)}
                  aria-label="Eliminar carga"
                  className="text-stone-400 dark:text-stone-600 hover:text-red-400 transition-colors p-2 -m-2"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function GastosFijosPage() {
  const { user } = useAuth();
  const [monthId, setMonthId] = useState(getCurrentMonthId());
  const [expenses, setExpenses] = useState<FixedExpense[]>([]);
  const [monthData, setMonthData] = useState<MonthData | null>(null);
  const [previousExpenses, setPreviousExpenses] = useState<FixedExpense[]>([]);
  const [spentTotals, setSpentTotals] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    setLoadError(null);
    Promise.all([getMonth(user.id, monthId), getMonth(user.id, getPreviousMonthId(monthId))])
      .then(async ([data, prevData]) => {
        const fixedExpenses = data?.fixedExpenses ?? [];
        setMonthData(data);
        setExpenses(fixedExpenses);
        setPreviousExpenses(prevData?.fixedExpenses ?? []);
        const trackedIds = fixedExpenses.filter((e) => e.tracked).map((e) => e.id);
        setSpentTotals(await getFixedExpenseEntryTotals(user.id, trackedIds));
      })
      .catch(setLoadError)
      .finally(() => setLoading(false));
  }, [user, monthId]);

  function copyFromPreviousMonth() {
    setExpenses(
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

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    try {
      await saveMonth(user.id, monthId, {
        ...monthData,
        // Esta pantalla no edita ahorros: no reenviarlos evita pisar con una copia vieja.
        savings: undefined,
        fixedExpenses: expenses,
        createdAt: monthData?.createdAt ?? new Date().toISOString(),
      });
    } catch (err) {
      reportError(err);
    } finally {
      setSaving(false);
    }
  }

  function updateExpense(id: string, field: keyof FixedExpense, value: string | number | boolean | undefined) {
    setExpenses((prev) => prev.map((e) => (e.id === id ? { ...e, [field]: value } : e)));
  }

  function toggleTracked(id: string) {
    setExpenses((prev) => prev.map((e) => (e.id === id ? { ...e, tracked: !e.tracked } : e)));
  }

  function removeExpense(id: string) {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  }

  function bumpSpent(id: string, delta: number) {
    setSpentTotals((prev) => ({ ...prev, [id]: Math.max((prev[id] ?? 0) + delta, 0) }));
  }

  const total = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const paid = expenses.reduce((s, e) => {
    if (e.tracked) return s + Math.min(spentTotals[e.id] ?? 0, e.amount || 0);
    return s + (e.paid ? e.amount || 0 : 0);
  }, 0);
  const pending = total - paid;

  if (loading) return <div className="text-stone-500 dark:text-stone-400 text-sm mt-8 text-center">Cargando...</div>;
  if (loadError) return <LoadError error={loadError} />;

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-stone-800 dark:text-stone-100">Gastos Fijos</h1>
        <MonthPicker monthId={monthId} onChange={setMonthId} />
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

      {/* Resumen rápido */}
      {expenses.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total', value: total, color: 'text-stone-700 dark:text-stone-200' },
            { label: 'Pagado', value: paid, color: 'text-emerald-600 dark:text-emerald-400' },
            { label: 'Pendiente', value: pending, color: pending > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-stone-500 dark:text-stone-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 px-4 py-3">
              <p className="text-xs text-stone-500 dark:text-stone-400 mb-1">{label}</p>
              <p className={`text-base font-semibold ${color}`}>{formatCurrency(value)}</p>
            </div>
          ))}
        </div>
      )}

      <Card>
        <CardHeader className="flex items-center justify-between">
          <p className="text-sm font-semibold text-stone-700 dark:text-stone-200">Pagos del mes</p>
          <Button size="sm" variant="ghost" onClick={() => setExpenses((p) => [...p, emptyExpense()])}>
            <Plus size={14} className="mr-1" /> Agregar
          </Button>
        </CardHeader>
        <CardBody className="flex flex-col gap-2">
          {expenses.length === 0 && (
            <p className="text-sm text-stone-500 dark:text-stone-400">Sin gastos fijos. Agrega uno.</p>
          )}
          {expenses.map((e) => (
            <FixedExpenseRow
              key={e.id}
              expense={e}
              userId={user!.id}
              spent={spentTotals[e.id] ?? 0}
              onUpdate={updateExpense}
              onRemove={removeExpense}
              onToggleTracked={toggleTracked}
              onSpentDelta={bumpSpent}
            />
          ))}
        </CardBody>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Guardando...' : 'Guardar'}
        </Button>
      </div>
    </div>
  );
}
