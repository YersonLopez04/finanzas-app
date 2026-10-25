'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { getTransactions, addTransaction, updateTransaction, deleteTransaction, getCategories, addCategory, deleteCategory } from '@/lib/db';
import { getCurrentMonthId, formatCurrency, insertAt, defaultDateForMonth, formatShortDate } from '@/lib/utils';
import { announceQuickAdd, onQuickAddClose, onQuickAddOpen } from '@/lib/quickAdd';
import { ExpenseSheet, type ExpenseForm } from './ExpenseSheet';
import { showUndo } from '@/components/ui/UndoToast';
import { variableTotal, reimbursedTotal, costByCategory, owedToYou } from '@/lib/totals';
import { categoryBadgeClass } from '@/lib/categoryColors';
import { MonthPicker } from '@/components/layout/MonthPicker';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { reportError, LoadError } from '@/components/ui/ErrorToast';
import type { Transaction, PaymentMethod, Category } from '@/types';
import { Plus, X, Users, CreditCard, Smartphone, Banknote, Settings2 } from 'lucide-react';

const PAYMENT_ICONS: Record<PaymentMethod, typeof CreditCard> = {
  tarjeta: CreditCard,
  yape: Smartphone,
  efectivo: Banknote,
};

// La categoría empieza vacía: elegirla es un toque y evita guardar en la equivocada.
function emptyForm(monthId: string): ExpenseForm {
  return {
    date: defaultDateForMonth(monthId),
    amount: '',
    category: '',
    description: '',
    paymentMethod: '',
    shared: false,
    myShare: '',
    reimbursedAmount: '',
  };
}

function formFor(t: Transaction): ExpenseForm {
  return {
    date: t.date,
    amount: String(t.amount),
    category: t.category,
    description: t.description,
    paymentMethod: t.paymentMethod ?? '',
    shared: t.shared ?? false,
    myShare: t.myShare != null ? String(t.myShare) : '',
    reimbursedAmount: t.reimbursedAmount ? String(t.reimbursedAmount) : '',
  };
}

// key cambia en cada apertura para que la hoja arranque con su formulario.
type SheetState = { key: number; editing: Transaction | null } | null;

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
  const [sheet, setSheet] = useState<SheetState>(() => (searchParams.get('quick') === '1' ? { key: Date.now(), editing: null } : null));
  const [freshId, setFreshId] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  useEffect(() => {
    if (searchParams.get('quick') === '1') {
      router.replace('/gastos-variables');
    }
  }, [searchParams, router]);

  const [saving, setSaving] = useState(false);

  const closeSheet = useCallback(() => setSheet(null), []);
  const openNew = useCallback(() => setSheet({ key: Date.now(), editing: null }), []);

  // El + de la barra muestra × mientras la hoja nueva está abierta, y la cierra.
  const quickOpen = !!sheet && !sheet.editing;
  useEffect(() => {
    announceQuickAdd(quickOpen);
  }, [quickOpen]);
  useEffect(() => () => announceQuickAdd(false), []);
  useEffect(() => onQuickAddClose(closeSheet), [closeSheet]);
  useEffect(() => onQuickAddOpen(openNew), [openNew]);

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

  function handleDeleteCategory(id: string) {
    const index = categories.findIndex((c) => c.id === id);
    const removed = categories[index];
    if (!removed) return;
    setCategories((prev) => prev.filter((c) => c.id !== id));
    showUndo({
      message: `Categoría "${removed.name}" borrada`,
      onUndo: () => setCategories((prev) => insertAt(prev, index, removed)),
      onCommit: () => deleteCategory(id),
    });
  }

  async function handleSubmit(form: ExpenseForm) {
    if (!user || !sheet) return;
    const editing = sheet.editing;
    setSaving(true);
    const payload = {
      date: form.date,
      amount: Number(form.amount),
      category: form.category,
      description: form.description.trim(),
      paymentMethod: (form.paymentMethod || undefined) as PaymentMethod | undefined,
      shared: form.shared,
      reimbursedAmount: form.shared ? Number(form.reimbursedAmount || 0) : 0,
      myShare: form.shared && form.myShare !== '' ? Number(form.myShare) : null,
    };

    try {
      let id: string;
      if (editing) {
        await updateTransaction(editing.id, payload);
        id = editing.id;
      } else {
        id = await addTransaction({ userId: user.id, monthId, ...payload });
      }
      setSheet(null);
      setFreshId(id);
      setTransactions(await getTransactions(user.id, monthId));
      if (!editing) {
        showUndo({
          message: `Gasto de ${formatCurrency(payload.amount)} guardado`,
          onUndo: async () => {
            await deleteTransaction(id);
            setTransactions((prev) => prev.filter((t) => t.id !== id));
          },
        });
      }
    } catch (err) {
      // La hoja queda abierta con lo escrito, para reintentar sin perderlo.
      reportError(err);
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(id: string) {
    setSheet(null);
    const index = transactions.findIndex((t) => t.id === id);
    const removed = transactions[index];
    if (!removed) return;
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    showUndo({
      message: 'Gasto borrado',
      onUndo: () => setTransactions((prev) => insertAt(prev, index, removed)),
      onCommit: () => deleteTransaction(id),
    });
  }

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
          <MonthPicker
            monthId={monthId}
            onChange={(m) => {
              setSheet(null);
              setMonthId(m);
            }}
          />
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

      <Button onClick={openNew} className="self-start">
        <Plus size={15} className="mr-1.5" /> Registrar gasto
      </Button>

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
              <button
                type="button"
                key={t.id}
                onClick={() => setSheet({ key: Date.now(), editing: t })}
                aria-label={`Editar gasto de ${formatCurrency(t.amount)} en ${t.category}`}
                className={`flex w-full items-center gap-4 px-5 py-3 text-left active:bg-stone-50 dark:active:bg-stone-800/60 ${
                  i < transactions.length - 1 ? 'border-b border-stone-100 dark:border-stone-800/60' : ''
                } ${freshId === t.id ? 'motion-fresh' : ''}`}
              >
                <span className="block flex-1 min-w-0">
                  <span className="flex items-center gap-2 mb-0.5 flex-wrap">
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
                    <span className="text-xs text-stone-500 dark:text-stone-400">{formatShortDate(t.date)}</span>
                  </span>
                  {t.description && (
                    <span className="block text-sm text-stone-600 dark:text-stone-300 truncate">{t.description}</span>
                  )}
                  {t.shared && (
                    <span className={`block text-xs mt-0.5 ${pending > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                      {pending > 0 ? `Te deben ${formatCurrency(pending)}` : 'Ya te pagaron todo'}
                    </span>
                  )}
                </span>
                <span className="text-sm font-semibold tabular-nums text-stone-700 dark:text-stone-200 shrink-0">
                  {formatCurrency(t.amount)}
                </span>
              </button>
            );
          })}
        </CardBody>
      </Card>

      {sheet && (
        <ExpenseSheet
          key={sheet.key}
          initial={sheet.editing ? formFor(sheet.editing) : emptyForm(monthId)}
          editing={!!sheet.editing}
          categories={categories}
          monthId={monthId}
          saving={saving}
          onClose={closeSheet}
          onSubmit={handleSubmit}
          onDelete={sheet.editing ? () => handleDelete(sheet.editing!.id) : undefined}
        />
      )}
    </div>
  );
}
