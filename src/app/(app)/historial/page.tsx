'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { listMonths, getAllTransactions } from '@/lib/db';
import { formatCurrency, monthIdToLabel } from '@/lib/utils';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import type { MonthData, Transaction } from '@/types';
import { History, Tags } from 'lucide-react';

interface MonthSummary {
  id: string;
  income: number;
  savings: number;
  fixed: number;
  variable: number;
  remaining: number;
}

const CAT_COLORS: Record<string, string> = {
  Comida: 'bg-amber-400',
  Pasajes: 'bg-blue-400',
  Taxi: 'bg-sky-400',
  Casa: 'bg-stone-400',
  'Salidas / Ocio': 'bg-purple-400',
  Salud: 'bg-green-400',
  Ropa: 'bg-rose-400',
  Otros: 'bg-gray-400',
};

const RANGE_OPTIONS = [
  { value: '3', label: 'Últimos 3 meses' },
  { value: '6', label: 'Últimos 6 meses' },
  { value: '12', label: 'Último año' },
  { value: 'all', label: 'Todos' },
];

export default function HistorialPage() {
  const { user } = useAuth();
  const [summaries, setSummaries] = useState<MonthSummary[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('6');

  useEffect(() => {
    if (!user) return;
    Promise.all([listMonths(user.id), getAllTransactions(user.id)]).then(([months, txs]) => {
      const gvByMonth = txs.reduce<Record<string, number>>((acc, t) => {
        acc[t.monthId] = (acc[t.monthId] ?? 0) + t.amount;
        return acc;
      }, {});

      const rows: MonthSummary[] = months.map((m: MonthData) => {
        const income = m.income.fixed + m.income.variable + m.income.extras;
        const savings = m.savings.reduce((s, a) => s + (a.amount || 0), 0);
        const fixed = m.fixedExpenses.reduce((s, f) => s + (f.amount || 0), 0);
        const variable = gvByMonth[m.id] ?? 0;
        return { id: m.id, income, savings, fixed, variable, remaining: income - savings - fixed - variable };
      });

      setSummaries(rows);
      setTransactions(txs);
      setLoading(false);
    });
  }, [user]);

  const rangedSummaries = useMemo(() => {
    if (range === 'all') return summaries;
    return summaries.slice(0, Number(range));
  }, [summaries, range]);

  const rangedMonthIds = useMemo(() => new Set(rangedSummaries.map((m) => m.id)), [rangedSummaries]);

  const categoryTotals = useMemo(() => {
    const filtered = transactions.filter((t) => rangedMonthIds.has(t.monthId));
    const totals = filtered.reduce<Record<string, number>>((acc, t) => {
      acc[t.category] = (acc[t.category] ?? 0) + t.amount;
      return acc;
    }, {});
    return Object.entries(totals)
      .map(([cat, total]) => ({ cat, total }))
      .sort((a, b) => b.total - a.total);
  }, [transactions, rangedMonthIds]);

  if (loading) return <div className="text-stone-400 text-sm mt-8 text-center">Cargando...</div>;

  const avg = (key: keyof Omit<MonthSummary, 'id'>) =>
    rangedSummaries.length ? rangedSummaries.reduce((s, m) => s + m[key], 0) / rangedSummaries.length : 0;

  const maxIncome = Math.max(...rangedSummaries.map((m) => m.income), 1);
  const maxCategoryTotal = Math.max(...categoryTotals.map((c) => c.total), 1);

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
            <History size={15} className="text-slate-600" />
          </div>
          <h1 className="text-lg font-semibold text-stone-800">Historial mensual</h1>
        </div>
        <Select value={range} onChange={(e) => setRange(e.target.value)} options={RANGE_OPTIONS} className="w-44" />
      </div>

      {summaries.length === 0 ? (
        <p className="text-sm text-stone-400">Aún no tienes meses guardados. Guarda tu primer mes desde Resumen.</p>
      ) : (
        <>
          {/* Promedios */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Prom. Ingresos', value: avg('income'), color: 'text-stone-700' },
              { label: 'Prom. Ahorros', value: avg('savings'), color: 'text-sky-600' },
              { label: 'Prom. Gastos Fijos', value: avg('fixed'), color: 'text-slate-600' },
              { label: 'Prom. Gastos Variables', value: avg('variable'), color: 'text-amber-600' },
            ].map(({ label, value, color }) => (
              <Card key={label}>
                <CardBody className="py-3.5">
                  <p className="text-xs text-stone-400">{label}</p>
                  <p className={`text-sm font-semibold mt-1 ${color}`}>{formatCurrency(value)}</p>
                </CardBody>
              </Card>
            ))}
          </div>

          {/* Por categoría */}
          <Card>
            <CardHeader className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center">
                <Tags size={15} className="text-purple-600" />
              </div>
              <p className="text-sm font-semibold text-stone-700">Gasto por categoría</p>
            </CardHeader>
            <CardBody className="flex flex-col gap-3">
              {categoryTotals.length === 0 ? (
                <p className="text-sm text-stone-400">Sin gastos variables en este periodo.</p>
              ) : (
                categoryTotals.map(({ cat, total }) => (
                  <div key={cat}>
                    <div className="flex justify-between text-sm text-stone-600 mb-1">
                      <span>{cat}</span>
                      <span className="font-medium">{formatCurrency(total)}</span>
                    </div>
                    <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${CAT_COLORS[cat] ?? 'bg-gray-400'}`}
                        style={{ width: `${(total / maxCategoryTotal) * 100}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </CardBody>
          </Card>

          {/* Por mes */}
          <Card>
            <CardHeader>
              <p className="text-sm font-semibold text-stone-700">Detalle por mes</p>
            </CardHeader>
            <CardBody className="flex flex-col gap-5">
              {rangedSummaries.map((m) => (
                <div key={m.id} className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-stone-800 capitalize">{monthIdToLabel(m.id)}</p>
                    <span className={`text-sm font-semibold ${m.remaining < 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                      {formatCurrency(m.remaining)}
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-stone-100 overflow-hidden flex">
                    <div className="h-full bg-sky-400" style={{ width: `${(m.savings / maxIncome) * 100}%` }} />
                    <div className="h-full bg-slate-400" style={{ width: `${(m.fixed / maxIncome) * 100}%` }} />
                    <div className="h-full bg-amber-400" style={{ width: `${(m.variable / maxIncome) * 100}%` }} />
                  </div>
                  <div className="flex items-center gap-4 text-xs text-stone-500">
                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-sky-400" /> Ahorro {formatCurrency(m.savings)}</span>
                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-slate-400" /> Fijos {formatCurrency(m.fixed)}</span>
                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Variables {formatCurrency(m.variable)}</span>
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>
        </>
      )}
    </div>
  );
}
