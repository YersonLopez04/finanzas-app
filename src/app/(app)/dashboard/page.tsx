'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { getMonth, saveMonth, getTransactions, getAccounts, saveAccount, addMovement } from '@/lib/db';
import { getCurrentMonthId, formatCurrency, monthIdToLabel, todayISO } from '@/lib/utils';
import { notifyOncePerDay } from '@/lib/notifications';
import { monthTotals } from '@/lib/totals';
import { MonthPicker } from '@/components/layout/MonthPicker';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { reportError, LoadError } from '@/components/ui/ErrorToast';
import { Select } from '@/components/ui/Select';
import type { MonthData, Income, SavingsAllocation, Transaction, Account } from '@/types';
import { Plus, Trash2, Wallet, PiggyBank, PieChart, History, AlertCircle } from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();
  const [monthId, setMonthId] = useState(getCurrentMonthId());
  const [monthData, setMonthData] = useState<MonthData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [saving, setSaving] = useState(false);

  // edit states
  const [income, setIncome] = useState<Income>({ fixed: 0, variable: 0, extras: 0 });
  const [savings, setSavings] = useState<SavingsAllocation[]>([]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    setLoadError(null);
    Promise.all([getMonth(user.id, monthId), getTransactions(user.id, monthId), getAccounts(user.id)])
      .then(([data, txs, accs]) => {
        if (data) {
          setIncome(data.income ?? { fixed: 0, variable: 0, extras: 0 });
          setSavings(data.savings ?? []);
          setMonthData(data);
        } else {
          setIncome({ fixed: 0, variable: 0, extras: 0 });
          setSavings([]);
          setMonthData(null);
        }
        setTransactions(txs);
        setAccounts(accs);
      })
      .catch(setLoadError)
      .finally(() => setLoading(false));
  }, [user, monthId]);

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    try {
      await saveMonthAndAccounts(user.id);
    } catch (err) {
      reportError(err);
    } finally {
      setSaving(false);
    }
  }

  async function saveMonthAndAccounts(userId: string) {
    // Aplicar a las cuentas vinculadas solo la diferencia respecto a lo ya guardado,
    // para no duplicar el monto si se guarda el mismo mes varias veces.
    const sumByAccount = (list: SavingsAllocation[]) =>
      list.reduce<Record<string, number>>((acc, s) => {
        if (!s.accountId) return acc;
        acc[s.accountId] = (acc[s.accountId] ?? 0) + (s.amount || 0);
        return acc;
      }, {});
    const oldSums = sumByAccount(monthData?.savings ?? []);
    const newSums = sumByAccount(savings);
    const accountIds = new Set([...Object.keys(oldSums), ...Object.keys(newSums)]);

    // Primero el mes y luego las cuentas. Al revés, si el mes fallaba después de
    // mover saldos, reintentar volvía a sumar la misma diferencia.
    const saved: MonthData = {
      id: monthId,
      income,
      savings,
      fixedExpenses: monthData?.fixedExpenses ?? [],
      createdAt: monthData?.createdAt ?? new Date().toISOString(),
    };
    // Esta pantalla no edita gastos fijos: no reenviarlos evita pisarlos con una copia vieja.
    await saveMonth(userId, monthId, { ...saved, fixedExpenses: undefined });
    // La base para la próxima diferencia pasa a ser lo recién guardado.
    setMonthData(saved);

    for (const accountId of accountIds) {
      const delta = (newSums[accountId] ?? 0) - (oldSums[accountId] ?? 0);
      if (!delta) continue;
      const account = accounts.find((a) => a.id === accountId);
      if (!account) continue;
      const balance = account.balance + delta;
      await saveAccount(userId, { ...account, balance });
      // Al momento, por si una cuenta siguiente falla: el próximo guardado debe
      // partir del saldo ya actualizado.
      setAccounts((prev) => prev.map((a) => (a.id === accountId ? { ...a, balance } : a)));
      await addMovement({
        accountId,
        userId,
        date: todayISO(),
        amount: delta,
        description: `Ahorro de ${monthIdToLabel(monthId)}`,
      });
    }

    if (accountIds.size > 0) setAccounts(await getAccounts(userId));
  }

  const {
    income: totalIncome,
    savings: totalSavings,
    fixed: totalGF,
    variable: totalGV,
    remaining,
  } = monthTotals({ income, savings, fixedExpenses: monthData?.fixedExpenses ?? [] }, transactions);
  const pendingFixed = (monthData?.fixedExpenses ?? []).filter((f) => !f.paid);
  const isCurrentMonth = monthId === getCurrentMonthId();
  const today = new Date().getDate();
  const dueToday = isCurrentMonth ? pendingFixed.filter((f) => f.dueDay === today) : [];
  const dueTomorrow = isCurrentMonth ? pendingFixed.filter((f) => f.dueDay === today + 1) : [];

  useEffect(() => {
    if (!user || !isCurrentMonth) return;
    dueToday.forEach((f) =>
      notifyOncePerDay(`${user.id}_today_${f.id}`, 'Pago vence hoy', `${f.name} — ${formatCurrency(f.amount)}`)
    );
    dueTomorrow.forEach((f) =>
      notifyOncePerDay(`${user.id}_tomorrow_${f.id}`, 'Pago vence mañana', `${f.name} — ${formatCurrency(f.amount)}`)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isCurrentMonth, dueToday.length, dueTomorrow.length]);

  function addSaving() {
    setSavings((prev) => [...prev, { id: crypto.randomUUID(), name: '', amount: 0 }]);
  }

  function removeSaving(id: string) {
    setSavings((prev) => prev.filter((s) => s.id !== id));
  }

  if (loading) {
    return <div className="text-stone-500 dark:text-stone-400 text-sm mt-8 text-center">Cargando...</div>;
  }

  if (loadError) return <LoadError error={loadError} />;

  const pct = (v: number) => (totalIncome > 0 ? Math.round((v / totalIncome) * 100) : 0);

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-stone-800 dark:text-stone-100">Resumen</h1>
          <Link
            href="/historial"
            className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-100 px-3 py-1.5 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <History size={14} /> Historial
          </Link>
        </div>
        <MonthPicker monthId={monthId} onChange={setMonthId} />
      </div>

      {/* Hero: restante del mes */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-800 via-slate-800 to-slate-700 px-6 py-7 text-white">
        <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full bg-white/5" />
        <div className="absolute -bottom-14 -right-4 w-32 h-32 rounded-full bg-white/5" />
        <p className="text-xs text-slate-300 relative">
          {isCurrentMonth ? 'Restante este mes' : `Restante de ${monthIdToLabel(monthId).split(' ')[0]}`}
        </p>
        <p className={`text-4xl font-bold mt-1.5 relative ${remaining < 0 ? 'text-rose-300' : 'text-white'}`}>
          {formatCurrency(remaining)}
        </p>

        {totalIncome > 0 && (
          <div className="mt-5 relative">
            <div className="h-2 bg-white/15 rounded-full overflow-hidden">
              <div
                className={`h-full w-full rounded-full origin-left transition-transform duration-200 ease-out ${remaining < 0 ? 'bg-rose-300' : 'bg-emerald-300'}`}
                style={{ transform: `scaleX(${Math.min(Math.max((totalIncome - remaining) / totalIncome, 0), 1)})` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-300 mt-1.5">
              <span>Usado: {formatCurrency(totalIncome - remaining)}</span>
              <span>Total: {formatCurrency(totalIncome)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Alertas: gastos fijos por vencer / pendientes */}
      {isCurrentMonth && dueToday.length > 0 && (
        <Link
          href="/gastos-fijos"
          className="motion-pop flex items-center justify-between gap-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 rounded-2xl px-5 py-3.5 hover:bg-rose-100/60 dark:hover:bg-rose-500/15 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-500/20 flex items-center justify-center shrink-0">
              <AlertCircle size={15} className="text-rose-700 dark:text-rose-400" />
            </div>
            <p className="text-sm text-rose-800 dark:text-rose-300">
              Vence <span className="font-semibold">hoy</span>: {dueToday.map((f) => f.name).join(', ')} — {formatCurrency(dueToday.reduce((s, f) => s + f.amount, 0))}
            </p>
          </div>
          <span className="text-xs text-rose-700 dark:text-rose-400 font-medium shrink-0">Ver →</span>
        </Link>
      )}
      {isCurrentMonth && dueTomorrow.length > 0 && (
        <Link
          href="/gastos-fijos"
          className="motion-pop flex items-center justify-between gap-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 rounded-2xl px-5 py-3.5 hover:bg-amber-100/60 dark:hover:bg-amber-500/15 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center shrink-0">
              <AlertCircle size={15} className="text-amber-700 dark:text-amber-400" />
            </div>
            <p className="text-sm text-amber-800 dark:text-amber-300">
              Vence <span className="font-semibold">mañana</span>: {dueTomorrow.map((f) => f.name).join(', ')} — {formatCurrency(dueTomorrow.reduce((s, f) => s + f.amount, 0))}
            </p>
          </div>
          <span className="text-xs text-amber-700 dark:text-amber-400 font-medium shrink-0">Ver →</span>
        </Link>
      )}
      {isCurrentMonth && pendingFixed.length > 0 && (
        <Link
          href="/gastos-fijos"
          className="motion-pop flex items-center justify-between gap-3 bg-stone-50 dark:bg-stone-800/50 border border-stone-100 dark:border-stone-800 rounded-2xl px-5 py-3.5 hover:bg-stone-100/60 dark:hover:bg-stone-800 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center shrink-0">
              <AlertCircle size={15} className="text-stone-600 dark:text-stone-300" />
            </div>
            <p className="text-sm text-stone-700 dark:text-stone-300">
              Tienes <span className="font-semibold">{pendingFixed.length}</span> gasto{pendingFixed.length > 1 ? 's' : ''} fijo{pendingFixed.length > 1 ? 's' : ''} pendiente{pendingFixed.length > 1 ? 's' : ''} por {formatCurrency(pendingFixed.reduce((s, f) => s + f.amount, 0))}
            </p>
          </div>
          <span className="text-xs text-stone-600 dark:text-stone-300 font-medium shrink-0">Ver →</span>
        </Link>
      )}

      {/* Ingresos */}
      <Card>
        <CardHeader className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
            <Wallet size={15} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="text-sm font-semibold text-stone-700 dark:text-stone-200">Ingresos</p>
        </CardHeader>
        <CardBody className="flex flex-col gap-3">
          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Sueldo fijo"
              type="number"
              value={income.fixed || ''}
              onChange={(e) => setIncome({ ...income, fixed: Number(e.target.value) })}
              placeholder="0"
            />
            <Input
              label="Variable"
              type="number"
              value={income.variable || ''}
              onChange={(e) => setIncome({ ...income, variable: Number(e.target.value) })}
              placeholder="0"
            />
            <Input
              label="Extras"
              type="number"
              value={income.extras || ''}
              onChange={(e) => setIncome({ ...income, extras: Number(e.target.value) })}
              placeholder="0"
            />
          </div>
          {totalIncome > 0 && (
            <p className="text-right text-sm font-semibold text-stone-700 dark:text-stone-200">
              Total: {formatCurrency(totalIncome)}
            </p>
          )}
        </CardBody>
      </Card>

      {/* Ahorros */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center">
              <PiggyBank size={15} className="text-sky-600 dark:text-sky-400" />
            </div>
            <p className="text-sm font-semibold text-stone-700 dark:text-stone-200">Ahorros e Inversión</p>
          </div>
          <Button size="sm" variant="ghost" onClick={addSaving}>
            <Plus size={14} className="mr-1" /> Agregar
          </Button>
        </CardHeader>
        <CardBody className="flex flex-col gap-2">
          {savings.length === 0 && (
            <p className="text-sm text-stone-500 dark:text-stone-400">Sin asignaciones. Agrega una.</p>
          )}
          {accounts.length === 0 && savings.length > 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Aún no tienes cuentas creadas. <Link href="/ahorros" className="underline">Crea una en Ahorros</Link> para poder elegirla aquí.
            </p>
          )}
          {savings.map((s) => (
            <div key={s.id} className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <Select
                  aria-label="Cuenta"
                  value={s.accountId ?? ''}
                  onChange={(e) => {
                    const acc = accounts.find((a) => a.id === e.target.value);
                    setSavings((prev) =>
                      prev.map((x) => (x.id === s.id ? { ...x, accountId: acc?.id, name: acc?.name ?? '' } : x))
                    );
                  }}
                  options={[
                    { value: '', label: accounts.length ? 'Elige cuenta' : 'Sin cuentas creadas' },
                    ...accounts.map((a) => ({ value: a.id, label: a.name })),
                  ]}
                />
              </div>
              <div className="w-28 shrink-0">
                <Input
                  type="number"
                  inputMode="decimal"
                  value={s.amount || ''}
                  onChange={(e) =>
                    setSavings((prev) => prev.map((x) => (x.id === s.id ? { ...x, amount: Number(e.target.value) } : x)))
                  }
                  placeholder="0"
                  aria-label="Monto"
                />
              </div>
              <button
                onClick={() => removeSaving(s.id)}
                aria-label="Eliminar asignación de ahorro"
                className="text-stone-500 dark:text-stone-400 hover:text-red-500 dark:hover:text-red-400 transition-colors p-2 -m-2"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
          {savings.length > 0 && (
            <>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Al guardar, el monto se suma automáticamente al saldo de la cuenta elegida.
              </p>
              <p className="text-right text-sm font-semibold text-stone-700 dark:text-stone-200 mt-1">
                Total: {formatCurrency(totalSavings)}
              </p>
            </>
          )}
        </CardBody>
      </Card>

      {/* Resumen */}
      {totalIncome > 0 && (
        <Card>
          <CardHeader className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center">
              <PieChart size={15} className="text-amber-600 dark:text-amber-400" />
            </div>
            <p className="text-sm font-semibold text-stone-700 dark:text-stone-200">Distribución del mes</p>
          </CardHeader>
          <CardBody className="flex flex-col gap-3">
            {[
              { label: 'Ahorros', value: totalSavings, color: 'bg-emerald-400 dark:bg-emerald-500' },
              { label: 'Gastos Fijos', value: totalGF, color: 'bg-slate-400 dark:bg-slate-500' },
              { label: 'Gastos Variables', value: totalGV, color: 'bg-amber-400 dark:bg-amber-500' },
            ].map(({ label, value, color }) => (
              <div key={label}>
                <div className="flex justify-between text-sm text-stone-600 dark:text-stone-300 mb-1">
                  <span>{label}</span>
                  <span>
                    {formatCurrency(value)} — {pct(value)}%
                  </span>
                </div>
                <div className="h-2 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full w-full ${color} rounded-full origin-left transition-transform duration-200 ease-out`}
                    style={{ transform: `scaleX(${Math.min(pct(value), 100) / 100})` }}
                  />
                </div>
              </div>
            ))}
            <div className="flex justify-between text-sm font-semibold text-stone-700 dark:text-stone-200 pt-2 border-t border-stone-100 dark:border-stone-800">
              <span>Restante</span>
              <span className={remaining < 0 ? 'text-red-500 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}>
                {formatCurrency(remaining)}
              </span>
            </div>
          </CardBody>
        </Card>
      )}

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Guardando...' : 'Guardar mes'}
        </Button>
      </div>
    </div>
  );
}
