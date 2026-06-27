'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { getMonth, saveMonth } from '@/lib/db';
import { getCurrentMonthId, formatCurrency } from '@/lib/utils';
import { MonthPicker } from '@/components/layout/MonthPicker';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { MonthData, FixedExpense } from '@/types';
import { Plus, Trash2, Check } from 'lucide-react';

function emptyExpense(): FixedExpense {
  return { id: crypto.randomUUID(), name: '', amount: 0, paid: false, order: Date.now() };
}

export default function GastosFijosPage() {
  const { user } = useAuth();
  const [monthId, setMonthId] = useState(getCurrentMonthId());
  const [expenses, setExpenses] = useState<FixedExpense[]>([]);
  const [monthData, setMonthData] = useState<MonthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    getMonth(user.id, monthId).then((data) => {
      setMonthData(data);
      setExpenses(data?.fixedExpenses ?? []);
      setLoading(false);
    });
  }, [user, monthId]);

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    await saveMonth(user.id, monthId, {
      ...monthData,
      fixedExpenses: expenses,
      createdAt: monthData?.createdAt ?? new Date().toISOString(),
    });
    setSaving(false);
  }

  function togglePaid(id: string) {
    setExpenses((prev) =>
      prev.map((e) =>
        e.id === id
          ? { ...e, paid: !e.paid, paidDate: !e.paid ? new Date().toISOString().split('T')[0] : undefined }
          : e
      )
    );
  }

  function updateExpense(id: string, field: keyof FixedExpense, value: string | number | boolean | undefined) {
    setExpenses((prev) => prev.map((e) => (e.id === id ? { ...e, [field]: value } : e)));
  }

  function removeExpense(id: string) {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  }

  const total = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const paid = expenses.filter((e) => e.paid).reduce((s, e) => s + (e.amount || 0), 0);
  const pending = total - paid;

  if (loading) return <div className="text-stone-400 text-sm mt-8 text-center">Cargando...</div>;

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-stone-800">Gastos Fijos</h1>
        <MonthPicker monthId={monthId} onChange={setMonthId} />
      </div>

      {/* Resumen rápido */}
      {expenses.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total', value: total, color: 'text-stone-700' },
            { label: 'Pagado', value: paid, color: 'text-emerald-600' },
            { label: 'Pendiente', value: pending, color: pending > 0 ? 'text-amber-600' : 'text-stone-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-xl border border-stone-200 px-4 py-3">
              <p className="text-xs text-stone-400 mb-1">{label}</p>
              <p className={`text-base font-semibold ${color}`}>{formatCurrency(value)}</p>
            </div>
          ))}
        </div>
      )}

      <Card>
        <CardHeader className="flex items-center justify-between">
          <p className="text-sm font-semibold text-stone-700">Pagos del mes</p>
          <Button size="sm" variant="ghost" onClick={() => setExpenses((p) => [...p, emptyExpense()])}>
            <Plus size={14} className="mr-1" /> Agregar
          </Button>
        </CardHeader>
        <CardBody className="flex flex-col gap-2">
          {expenses.length === 0 && (
            <p className="text-sm text-stone-400">Sin gastos fijos. Agrega uno.</p>
          )}
          {expenses.map((e) => (
            <div
              key={e.id}
              className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${
                e.paid ? 'bg-emerald-50' : 'bg-white'
              }`}
            >
              <button
                onClick={() => togglePaid(e.id)}
                className={`shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                  e.paid
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : 'border-stone-300 hover:border-emerald-400'
                }`}
              >
                {e.paid && <Check size={12} />}
              </button>
              <Input
                value={e.name}
                onChange={(ev) => updateExpense(e.id, 'name', ev.target.value)}
                placeholder="Nombre del gasto"
                className={`flex-1 min-w-0 ${e.paid ? 'line-through text-stone-400' : ''}`}
              />
              <Input
                type="number"
                value={e.dueDay ?? ''}
                onChange={(ev) => {
                  const v = ev.target.value;
                  updateExpense(e.id, 'dueDay', v === '' ? undefined : Math.min(31, Math.max(1, Number(v))));
                }}
                placeholder="Día"
                title="Día del mes en que vence (opcional)"
                min={1}
                max={31}
                className="w-14 shrink-0"
              />
              <Input
                type="number"
                value={e.amount || ''}
                onChange={(ev) => updateExpense(e.id, 'amount', Number(ev.target.value))}
                placeholder="0"
                className="w-20 shrink-0"
              />
              <button
                onClick={() => removeExpense(e.id)}
                className="text-stone-300 hover:text-red-400 transition-colors shrink-0"
              >
                <Trash2 size={15} />
              </button>
            </div>
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
