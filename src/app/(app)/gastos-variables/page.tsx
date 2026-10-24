'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { getTransactions, addTransaction, updateTransaction, deleteTransaction, getCategories, addCategory, deleteCategory } from '@/lib/db';
import { getCurrentMonthId, formatCurrency, todayISO } from '@/lib/utils';
import { variableTotal, reimbursedTotal, costByCategory, owedToYou } from '@/lib/totals';
import { categoryBadgeClass } from '@/lib/categoryColors';
import { MonthPicker } from '@/components/layout/MonthPicker';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { reportError, LoadError } from '@/components/ui/ErrorToast';
import { Select } from '@/components/ui/Select';
import type { Transaction, PaymentMethod, Category } from '@/types';
import { PAYMENT_METHODS } from '@/types';
import { Plus, Trash2, X, Pencil, Users, CreditCard, Smartphone, Banknote, Settings2 } from 'lucide-react';

const PAYMENT_ICONS: Record<PaymentMethod, typeof CreditCard> = {
  tarjeta: CreditCard,
  yape: Smartphone,
  efectivo: Banknote,
};

function emptyForm(defaultCategory: string) {
  return {
    date: todayISO(),
    amount: '',
    category: defaultCategory,
    description: '',
    paymentMethod: '' as PaymentMethod | '',
    shared: false,
    myShare: '',
    reimbursedAmount: '',
  };
}

export default function GastosVariablesPage() {
  return (
    <Suspense fallback={<div className="text-stone-500 dark:text-stone-400 text-sm mt-8 text-center">Cargando...</div>}>
      <GastosVariablesContent />
    </Suspense>
  );
}

function GastosVariablesContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [monthId, setMonthId] = useState(getCurrentMonthId());
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [showForm, setShowForm] = useState(() => searchParams.get('quick') === '1');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  useEffect(() => {
    if (searchParams.get('quick') === '1') {
      router.replace('/gastos-variables');
    }
  }, [searchParams, router]);

  // form
  const [form, setForm] = useState(emptyForm(''));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    setLoadError(null);
    Promise.all([getTransactions(user.id, monthId), getCategories(user.id)])
      .then(([txs, cats]) => {
        setTransactions(txs);
        setCategories(cats);
      })
      .catch(setLoadError)
      .finally(() => setLoading(false));
  }, [user, monthId]);

  async function handleAddCategory() {
    if (!user || !newCategoryName.trim()) return;
    try {
      await addCategory(user.id, newCategoryName.trim(), categories.length);
      setCategories(await getCategories(user.id));
      setNewCategoryName('');
    } catch (err) {
      reportError(err);
    }
  }

  async function handleDeleteCategory(id: string) {
    try {
      await deleteCategory(id);
      setCategories((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      reportError(err);
    }
  }

  function openNewForm() {
    setEditingId(null);
    setForm(emptyForm(categories[0]?.name ?? ''));
    setShowForm(true);
  }

  function openEditForm(t: Transaction) {
    setEditingId(t.id);
    setForm({
      date: t.date,
      amount: String(t.amount),
      category: t.category,
      description: t.description,
      paymentMethod: t.paymentMethod ?? '',
      shared: t.shared ?? false,
      myShare: t.myShare != null ? String(t.myShare) : '',
      reimbursedAmount: t.reimbursedAmount ? String(t.reimbursedAmount) : '',
    });
    setShowForm(true);
  }

  async function handleSubmit() {
    if (!user || !form.amount) return;
    setSaving(true);
    const payload = {
      date: form.date,
      amount: Number(form.amount),
      category: form.category,
      description: form.description,
      paymentMethod: form.paymentMethod || undefined,
      shared: form.shared,
      reimbursedAmount: form.shared ? Number(form.reimbursedAmount || 0) : 0,
      myShare: form.shared && form.myShare !== '' ? Number(form.myShare) : null,
    };

    try {
      if (editingId) {
        await updateTransaction(editingId, payload);
      } else {
        await addTransaction({ userId: user.id, monthId, ...payload });
      }
      setShowForm(false);
      setEditingId(null);
      setTransactions(await getTransactions(user.id, monthId));
    } catch (err) {
      // El formulario queda abierto con lo escrito, para reintentar sin perderlo.
      reportError(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteTransaction(id);
      setTransactions((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      reportError(err);
    }
  }

  // Vista previa en el formulario, con la misma regla que la lista.
  const formOwed = owedToYou({
    amount: Number(form.amount || 0),
    shared: true,
    myShare: form.myShare !== '' ? Number(form.myShare) : null,
    reimbursedAmount: Number(form.reimbursedAmount || 0),
  });

  const total = variableTotal(transactions);
  const reimbursed = reimbursedTotal(transactions);

  // group by category
  const totalsByCategory = costByCategory(transactions);
  const byCategory = categories
    .map(({ name: cat }) => ({ cat, total: totalsByCategory[cat] ?? 0 }))
    .filter((x) => x.total > 0);

  if (loading) return <div className="text-stone-500 dark:text-stone-400 text-sm mt-8 text-center">Cargando...</div>;
  if (loadError) return <LoadError error={loadError} />;

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-stone-800 dark:text-stone-100">Gastos Variables</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCategoryManager((p) => !p)}
            aria-label="Editar categorías"
            title="Editar categorías"
            className="text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors p-2 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800"
          >
            <Settings2 size={16} />
          </button>
          <MonthPicker monthId={monthId} onChange={setMonthId} />
        </div>
      </div>

      {/* Gestión de categorías */}
      {showCategoryManager && (
        <Card className="motion-pop">
          <CardHeader>
            <p className="text-sm font-semibold text-stone-700 dark:text-stone-200">Tus categorías</p>
          </CardHeader>
          <CardBody className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <span
                  key={c.id}
                  className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300"
                >
                  {c.name}
                  <button
                    onClick={() => handleDeleteCategory(c.id)}
                    aria-label={`Eliminar categoría ${c.name}`}
                    className="text-stone-500 dark:text-stone-500 hover:text-red-500 dark:hover:text-red-400 p-1 -m-1"
                  >
                    <X size={11} />
                  </button>
                </span>
              ))}
              {categories.length === 0 && <p className="text-sm text-stone-500 dark:text-stone-400">Aún no tienes categorías.</p>}
            </div>
            <div className="flex items-center gap-2">
              <Input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Nueva categoría (ej. Mascotas)"
                onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                className="flex-1"
              />
              <Button size="sm" onClick={handleAddCategory} disabled={!newCategoryName.trim()}>
                <Plus size={14} className="mr-1" /> Agregar
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Totales por categoría */}
      {byCategory.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {byCategory.map(({ cat, total: t }) => (
            <div
              key={cat}
              className={`px-3 py-1.5 rounded-full text-xs font-medium ${categoryBadgeClass(cat)}`}
            >
              {cat}: {formatCurrency(t)}
            </div>
          ))}
        </div>
      )}

      {/* Formulario nuevo / editar gasto */}
      {showForm ? (
        <Card className="motion-pop">
          <CardHeader className="flex items-center justify-between">
            <p className="text-sm font-semibold text-stone-700 dark:text-stone-200">{editingId ? 'Editar gasto' : 'Nuevo gasto'}</p>
            <button
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
              }}
              aria-label="Cerrar formulario"
              className="text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 p-2 -m-2"
            >
              <X size={16} />
            </button>
          </CardHeader>
          <CardBody className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Fecha"
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              />
              <Input
                label="Monto (S/)"
                type="number"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                placeholder="0.00"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Categoría"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                options={categories.map((c) => ({ value: c.name, label: c.name }))}
              />
              <Select
                label="Método de pago"
                value={form.paymentMethod}
                onChange={(e) => setForm((f) => ({ ...f, paymentMethod: e.target.value as PaymentMethod }))}
                options={[{ value: '', label: 'Sin especificar' }, ...PAYMENT_METHODS]}
              />
            </div>
            <Input
              label="Descripción"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="¿En qué fue?"
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />

            <label className="flex items-center gap-2 text-sm text-stone-600 dark:text-stone-300 cursor-pointer">
              <input
                type="checkbox"
                checked={form.shared}
                onChange={(e) => setForm((f) => ({ ...f, shared: e.target.checked }))}
                className="rounded border-stone-300 dark:border-stone-600"
              />
              Gasto compartido (me deben una parte)
            </label>

            {form.shared && (
              <div className="flex flex-col gap-1.5">
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Mi parte"
                    type="number"
                    inputMode="decimal"
                    value={form.myShare}
                    onChange={(e) => setForm((f) => ({ ...f, myShare: e.target.value }))}
                    placeholder="0.00"
                  />
                  <Input
                    label="Ya me pagaron"
                    type="number"
                    inputMode="decimal"
                    value={form.reimbursedAmount}
                    onChange={(e) => setForm((f) => ({ ...f, reimbursedAmount: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
                {form.amount && (
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    {formOwed > 0 ? `Te deben ${formatCurrency(formOwed)}` : 'No te deben nada'}
                    {form.myShare === '' && ' · sin tu parte, se asume que te deben todo'}
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
              >
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={saving || !form.amount}>
                {saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Agregar'}
              </Button>
            </div>
          </CardBody>
        </Card>
      ) : (
        <Button onClick={openNewForm} className="self-start">
          <Plus size={15} className="mr-1.5" /> Registrar gasto
        </Button>
      )}

      {/* Lista de transacciones */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-stone-700 dark:text-stone-200">
              {transactions.length} gastos — {formatCurrency(total)} total
            </p>
            {reimbursed > 0 && (
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                Ya descontados {formatCurrency(reimbursed)} que te devolvieron
              </p>
            )}
          </div>
        </CardHeader>
        <CardBody className="p-0">
          {transactions.length === 0 && (
            <p className="text-sm text-stone-500 dark:text-stone-400 px-5 py-4">Sin gastos registrados este mes.</p>
          )}
          {transactions.map((t, i) => {
            const PaymentIcon = t.paymentMethod ? PAYMENT_ICONS[t.paymentMethod] : null;
            const pending = owedToYou(t);
            return (
              <div
                key={t.id}
                className={`flex items-center gap-4 px-5 py-3 ${
                  i < transactions.length - 1 ? 'border-b border-stone-50 dark:border-stone-800/60' : ''
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${categoryBadgeClass(t.category)}`}
                    >
                      {t.category}
                    </span>
                    {PaymentIcon && (
                      <span className="flex items-center gap-1 text-xs text-stone-500 dark:text-stone-400">
                        <PaymentIcon size={12} />
                      </span>
                    )}
                    {t.shared && (
                      <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
                        <Users size={11} /> Compartido
                      </span>
                    )}
                    <span className="text-xs text-stone-500 dark:text-stone-400">{t.date}</span>
                  </div>
                  {t.description && (
                    <p className="text-sm text-stone-600 dark:text-stone-300 truncate">{t.description}</p>
                  )}
                  {t.shared && (
                    <p className={`text-xs mt-0.5 ${pending > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {pending > 0 ? `Te deben ${formatCurrency(pending)}` : 'Ya te pagaron todo'}
                    </p>
                  )}
                </div>
                <p className="text-sm font-semibold text-stone-700 dark:text-stone-200 shrink-0">
                  {formatCurrency(t.amount)}
                </p>
                <button
                  onClick={() => openEditForm(t)}
                  aria-label="Editar gasto"
                  className="text-stone-400 dark:text-stone-600 hover:text-slate-500 dark:hover:text-slate-400 transition-colors shrink-0 p-2 -m-2"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => handleDelete(t.id)}
                  aria-label="Eliminar gasto"
                  className="text-stone-400 dark:text-stone-600 hover:text-red-400 transition-colors shrink-0 p-2 -m-2"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </CardBody>
      </Card>
    </div>
  );
}
