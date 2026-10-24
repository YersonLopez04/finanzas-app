import { getSupabase } from './supabase';
import type { MonthData, Transaction, Account, AccountMovement, Category, FixedExpenseEntry } from '@/types';
import { DEFAULT_CATEGORIES } from '@/types';

const DEMO_MODE = !process.env.NEXT_PUBLIC_SUPABASE_URL;

// In-memory store for demo mode (no Supabase configured yet)
const demoStore: {
  months: Record<string, MonthData>;
  transactions: Transaction[];
  accounts: Account[];
  movements: AccountMovement[];
  categories: Category[];
  fixedExpenseEntries: FixedExpenseEntry[];
} = {
  months: {
    '2026-06': {
      id: '2026-06',
      income: { fixed: 4500, variable: 0, extras: 0 },
      savings: [
        { id: '1', name: 'Pichincha', amount: 800 },
        { id: '2', name: 'Terreno Ica', amount: 530 },
      ],
      fixedExpenses: [
        { id: '1', name: 'iPhone + Watch', amount: 230, paid: true, order: 1 },
        { id: '2', name: 'Cel mamá', amount: 30, paid: true, order: 2 },
        { id: '3', name: 'Cel papá', amount: 30, paid: false, order: 3 },
        { id: '4', name: 'Spotify + Apple', amount: 15, paid: true, order: 4 },
        { id: '5', name: 'Cuota Depa', amount: 500, paid: false, order: 5 },
        { id: '6', name: 'Cuota Terreno', amount: 481, paid: false, order: 6 },
        { id: '7', name: 'Seguro Depa', amount: 180, paid: true, order: 7 },
        { id: '8', name: 'Internet SMP', amount: 100, paid: false, order: 8 },
        { id: '9', name: 'Gasolina', amount: 200, paid: false, tracked: true, order: 9 },
      ],
      createdAt: new Date().toISOString(),
    },
  },
  transactions: [
    { id: 't1', userId: 'demo-user', monthId: '2026-06', date: '2026-06-05', amount: 35, category: 'Comida', description: 'Almuerzo', createdAt: '' },
    { id: 't2', userId: 'demo-user', monthId: '2026-06', date: '2026-06-04', amount: 22, category: 'Pasajes', description: 'Metro semana', createdAt: '' },
    { id: 't3', userId: 'demo-user', monthId: '2026-06', date: '2026-06-03', amount: 85, category: 'Salidas / Ocio', description: 'Cena con amigos', createdAt: '' },
    { id: 't4', userId: 'demo-user', monthId: '2026-06', date: '2026-06-02', amount: 18, category: 'Taxi', description: 'Uber', createdAt: '' },
  ],
  accounts: [
    { id: 'a1', userId: 'demo-user', name: 'Pichincha', currency: 'PEN', type: 'savings', balance: 3200, order: 0, createdAt: '' },
    { id: 'a2', userId: 'demo-user', name: 'Dólares IBK', currency: 'USD', type: 'savings', balance: 850, order: 1, createdAt: '' },
    { id: 'a3', userId: 'demo-user', name: 'CTS BCP', currency: 'PEN', type: 'cts', balance: 5400, order: 2, createdAt: '' },
    { id: 'a4', userId: 'demo-user', name: 'Fondo mamá', currency: 'PEN', type: 'fund', balance: 1200, note: 'aporte mensual', order: 3, createdAt: '' },
  ],
  movements: [],
  categories: DEFAULT_CATEGORIES.map((name, i) => ({ id: `c${i}`, name, order: i })),
  fixedExpenseEntries: [
    { id: 'fe1', fixedExpenseId: '9', userId: 'demo-user', date: '2026-06-03', amount: 40, note: 'Grifo Primax', createdAt: '' },
    { id: 'fe2', fixedExpenseId: '9', userId: 'demo-user', date: '2026-06-12', amount: 50, note: 'Grifo Repsol', createdAt: '' },
    { id: 'fe3', fixedExpenseId: '9', userId: 'demo-user', date: '2026-06-20', amount: 30, note: 'Grifo Primax', createdAt: '' },
  ],
};

function sb() {
  return getSupabase();
}

// Supabase no lanza excepciones: devuelve { error }. Sin revisarlo, un guardado
// rechazado (sin conexión, sesión vencida, permisos) parece exitoso, y una
// lectura fallida parece "no hay datos" que luego se guarda encima de los reales.
export class DataError extends Error {}

type QueryResult<T> = { data: T; error: null } | { data: null; error: { message: string } };

function check<T>(res: QueryResult<T>, action: string): T {
  if (res.error) {
    console.error(`Supabase: no se pudo ${action}`, res.error);
    throw new DataError(`No se pudo ${action}. Revisa tu conexión e inténtalo de nuevo.`);
  }
  return res.data as T;
}

interface MonthRow { id: string; income_fixed: number | string; income_variable: number | string; income_extras: number | string; created_at: string; }
interface SavingRow { id: string; name: string; amount: number | string; account_id: string | null; }
interface FixedExpenseRow { id: string; name: string; amount: number | string; paid: boolean; paid_date: string | null; due_day: number | null; tracked: boolean | null; order_index: number; }
interface FixedExpenseEntryRow { id: string; fixed_expense_id: string; user_id: string; date: string; amount: number | string; note: string | null; created_at: string; }
interface TransactionRow {
  id: string;
  user_id: string;
  month_id: string;
  date: string;
  amount: number | string;
  category: string;
  description: string;
  payment_method: Transaction['paymentMethod'] | null;
  shared: boolean;
  reimbursed_amount: number | string;
  created_at: string;
}
interface AccountRow { id: string; user_id: string; name: string; currency: 'PEN' | 'USD'; type: Account['type']; balance: number | string; note: string | null; order_index: number; created_at: string; }
interface MovementRow { id: string; account_id: string; user_id: string; date: string; amount: number | string; description: string; created_at: string; }

// ── Months ────────────────────────────────────────────────────────────────────

export async function getMonth(userId: string, monthId: string): Promise<MonthData | null> {
  if (DEMO_MODE) return demoStore.months[monthId] ?? null;

  const month = check<MonthRow | null>(
    await sb().from('months').select('*').eq('user_id', userId).eq('id', monthId).maybeSingle(),
    'cargar el mes'
  );

  if (!month) return null;

  const [savingsRes, fixedRes] = await Promise.all([
    sb().from('savings_allocations').select('*').eq('user_id', userId).eq('month_id', monthId).order('order_index'),
    sb().from('fixed_expenses').select('*').eq('user_id', userId).eq('month_id', monthId).order('order_index'),
  ]);
  const savings = check(savingsRes, 'cargar los ahorros del mes');
  const fixed = check(fixedRes, 'cargar los gastos fijos del mes');

  return {
    id: month.id,
    income: {
      fixed: Number(month.income_fixed),
      variable: Number(month.income_variable),
      extras: Number(month.income_extras),
    },
    savings: ((savings ?? []) as SavingRow[]).map((s) => ({ id: s.id, name: s.name, amount: Number(s.amount), accountId: s.account_id ?? undefined })),
    fixedExpenses: ((fixed ?? []) as FixedExpenseRow[]).map((f) => ({
      id: f.id,
      name: f.name,
      amount: Number(f.amount),
      paid: f.paid,
      paidDate: f.paid_date ?? undefined,
      dueDay: f.due_day ?? undefined,
      tracked: f.tracked ?? false,
      order: f.order_index,
    })),
    createdAt: month.created_at,
  };
}

export async function saveMonth(userId: string, monthId: string, data: Partial<MonthData>) {
  if (DEMO_MODE) {
    demoStore.months[monthId] = { ...demoStore.months[monthId], ...data, id: monthId } as MonthData;
    return;
  }

  check(
    await sb().from('months').upsert({
      user_id: userId,
      id: monthId,
      income_fixed: data.income?.fixed ?? 0,
      income_variable: data.income?.variable ?? 0,
      income_extras: data.income?.extras ?? 0,
      created_at: data.createdAt ?? new Date().toISOString(),
    }),
    'guardar el mes'
  );

  // Ahorros y gastos fijos se guardan igual: primero upsert por id y recién
  // después se borran las filas que el usuario quitó. Si el upsert falla, no se
  // borra nada (antes se borraba todo el mes y luego se reinsertaba, y un fallo
  // entre ambos pasos dejaba el mes sin ahorros). Mantener el id además evita
  // que las cargas de seguimiento (fixed_expense_entries) queden huérfanas.
  if (data.savings) {
    if (data.savings.length > 0) {
      check(
        await sb().from('savings_allocations').upsert(
          data.savings.map((s, i) => ({
            id: s.id,
            user_id: userId,
            month_id: monthId,
            name: s.name,
            amount: s.amount,
            account_id: s.accountId ?? null,
            order_index: i,
          }))
        ),
        'guardar los ahorros'
      );
    }
    check(await deleteMonthRowsExcept('savings_allocations', userId, monthId, data.savings.map((s) => s.id)), 'guardar los ahorros');
  }

  if (data.fixedExpenses) {
    if (data.fixedExpenses.length > 0) {
      check(
        await sb().from('fixed_expenses').upsert(
        data.fixedExpenses.map((f, i) => ({
          id: f.id,
          user_id: userId,
          month_id: monthId,
          name: f.name,
          amount: f.amount,
          paid: f.paid,
          paid_date: f.paidDate ?? null,
          due_day: f.dueDay ?? null,
          tracked: f.tracked ?? false,
          order_index: i,
        }))
        ),
        'guardar los gastos fijos'
      );
    }
    check(await deleteMonthRowsExcept('fixed_expenses', userId, monthId, data.fixedExpenses.map((f) => f.id)), 'guardar los gastos fijos');
  }
}

function deleteMonthRowsExcept(table: 'savings_allocations' | 'fixed_expenses', userId: string, monthId: string, keepIds: string[]) {
  let del = sb().from(table).delete().eq('user_id', userId).eq('month_id', monthId);
  if (keepIds.length > 0) del = del.not('id', 'in', `(${keepIds.join(',')})`);
  return del;
}

export async function listMonths(userId: string): Promise<MonthData[]> {
  if (DEMO_MODE) {
    return Object.values(demoStore.months).sort((a, b) => b.id.localeCompare(a.id));
  }

  const [monthsRes, savingsRes, fixedRes] = await Promise.all([
    sb().from('months').select('*').eq('user_id', userId).order('id', { ascending: false }),
    sb().from('savings_allocations').select('*').eq('user_id', userId).order('order_index'),
    sb().from('fixed_expenses').select('*').eq('user_id', userId).order('order_index'),
  ]);
  const months = check(monthsRes, 'cargar el historial');
  const savings = check(savingsRes, 'cargar el historial');
  const fixed = check(fixedRes, 'cargar el historial');

  type SavingRowWithMonth = SavingRow & { month_id: string };
  type FixedExpenseRowWithMonth = FixedExpenseRow & { month_id: string };

  return ((months ?? []) as MonthRow[]).map((m) => ({
    id: m.id,
    income: {
      fixed: Number(m.income_fixed),
      variable: Number(m.income_variable),
      extras: Number(m.income_extras),
    },
    savings: ((savings ?? []) as SavingRowWithMonth[])
      .filter((s) => s.month_id === m.id)
      .map((s) => ({ id: s.id, name: s.name, amount: Number(s.amount), accountId: s.account_id ?? undefined })),
    fixedExpenses: ((fixed ?? []) as FixedExpenseRowWithMonth[])
      .filter((f) => f.month_id === m.id)
      .map((f) => ({
        id: f.id,
        name: f.name,
        amount: Number(f.amount),
        paid: f.paid,
        paidDate: f.paid_date ?? undefined,
        dueDay: f.due_day ?? undefined,
        tracked: f.tracked ?? false,
        order: f.order_index,
      })),
    createdAt: m.created_at,
  }));
}

// ── Cargas de gastos fijos en seguimiento ───────────────────────────────────────

function mapFixedExpenseEntryRow(e: FixedExpenseEntryRow): FixedExpenseEntry {
  return {
    id: e.id,
    fixedExpenseId: e.fixed_expense_id,
    userId: e.user_id,
    date: e.date,
    amount: Number(e.amount),
    note: e.note || undefined,
    createdAt: e.created_at,
  };
}

export async function getFixedExpenseEntries(userId: string, fixedExpenseId: string): Promise<FixedExpenseEntry[]> {
  if (DEMO_MODE) {
    return demoStore.fixedExpenseEntries
      .filter((e) => e.fixedExpenseId === fixedExpenseId)
      .sort((a, b) => b.date.localeCompare(a.date));
  }
  const data = check(
    await sb()
      .from('fixed_expense_entries')
      .select('*')
      .eq('user_id', userId)
      .eq('fixed_expense_id', fixedExpenseId)
      .order('date', { ascending: false }),
    'cargar las cargas del gasto'
  );
  return ((data ?? []) as FixedExpenseEntryRow[]).map(mapFixedExpenseEntryRow);
}

// Suma de cargas ya registradas por gasto fijo, para pintar el progreso de
// todos los gastos en seguimiento apenas carga la página (sin tener que
// expandir cada uno).
export async function getFixedExpenseEntryTotals(userId: string, fixedExpenseIds: string[]): Promise<Record<string, number>> {
  if (fixedExpenseIds.length === 0) return {};
  if (DEMO_MODE) {
    const totals: Record<string, number> = {};
    demoStore.fixedExpenseEntries
      .filter((e) => fixedExpenseIds.includes(e.fixedExpenseId))
      .forEach((e) => {
        totals[e.fixedExpenseId] = (totals[e.fixedExpenseId] ?? 0) + e.amount;
      });
    return totals;
  }
  const data = check(
    await sb().from('fixed_expense_entries').select('fixed_expense_id, amount').eq('user_id', userId).in('fixed_expense_id', fixedExpenseIds),
    'cargar el avance de los gastos fijos'
  );
  const totals: Record<string, number> = {};
  ((data ?? []) as { fixed_expense_id: string; amount: number | string }[]).forEach((row) => {
    totals[row.fixed_expense_id] = (totals[row.fixed_expense_id] ?? 0) + Number(row.amount);
  });
  return totals;
}

export async function addFixedExpenseEntry(data: Omit<FixedExpenseEntry, 'id' | 'createdAt'>) {
  if (DEMO_MODE) {
    demoStore.fixedExpenseEntries.unshift({ ...data, id: crypto.randomUUID(), createdAt: new Date().toISOString() });
    return;
  }
  check(
    await sb().from('fixed_expense_entries').insert({
      fixed_expense_id: data.fixedExpenseId,
      user_id: data.userId,
      date: data.date,
      amount: data.amount,
      note: data.note ?? '',
    }),
    'guardar la carga'
  );
}

export async function deleteFixedExpenseEntry(id: string) {
  if (DEMO_MODE) {
    demoStore.fixedExpenseEntries = demoStore.fixedExpenseEntries.filter((e) => e.id !== id);
    return;
  }
  check(await sb().from('fixed_expense_entries').delete().eq('id', id), 'borrar la carga');
}

export async function getAllTransactions(userId: string): Promise<Transaction[]> {
  if (DEMO_MODE) {
    return demoStore.transactions.filter((t) => t.userId === userId);
  }
  const data = check(await sb().from('transactions').select('*').eq('user_id', userId), 'cargar los gastos variables');
  return ((data ?? []) as TransactionRow[]).map(mapTransactionRow);
}

function mapTransactionRow(t: TransactionRow): Transaction {
  return {
    id: t.id,
    userId: t.user_id,
    monthId: t.month_id,
    date: t.date,
    amount: Number(t.amount),
    category: t.category,
    description: t.description,
    paymentMethod: t.payment_method ?? undefined,
    shared: t.shared,
    reimbursedAmount: Number(t.reimbursed_amount ?? 0),
    createdAt: t.created_at,
  };
}

// ── Transactions ──────────────────────────────────────────────────────────────

export async function getTransactions(userId: string, monthId: string): Promise<Transaction[]> {
  if (DEMO_MODE) {
    return demoStore.transactions.filter((t) => t.monthId === monthId).sort((a, b) => b.date.localeCompare(a.date));
  }
  const data = check(
    await sb().from('transactions').select('*').eq('user_id', userId).eq('month_id', monthId).order('date', { ascending: false }),
    'cargar los gastos variables'
  );

  return ((data ?? []) as TransactionRow[]).map(mapTransactionRow);
}

export async function addTransaction(data: Omit<Transaction, 'id' | 'createdAt'>) {
  if (DEMO_MODE) {
    demoStore.transactions.unshift({ ...data, id: crypto.randomUUID(), createdAt: new Date().toISOString() });
    return;
  }
  check(
    await sb().from('transactions').insert({
      user_id: data.userId,
      month_id: data.monthId,
      date: data.date,
      amount: data.amount,
      category: data.category,
      description: data.description,
      payment_method: data.paymentMethod ?? null,
      shared: data.shared ?? false,
      reimbursed_amount: data.reimbursedAmount ?? 0,
    }),
    'guardar el gasto'
  );
}

export async function updateTransaction(id: string, data: Partial<Omit<Transaction, 'id' | 'userId' | 'createdAt'>>) {
  if (DEMO_MODE) {
    demoStore.transactions = demoStore.transactions.map((t) => (t.id === id ? { ...t, ...data } : t));
    return;
  }
  const row: Record<string, unknown> = {};
  if (data.monthId !== undefined) row.month_id = data.monthId;
  if (data.date !== undefined) row.date = data.date;
  if (data.amount !== undefined) row.amount = data.amount;
  if (data.category !== undefined) row.category = data.category;
  if (data.description !== undefined) row.description = data.description;
  if (data.paymentMethod !== undefined) row.payment_method = data.paymentMethod ?? null;
  if (data.shared !== undefined) row.shared = data.shared;
  if (data.reimbursedAmount !== undefined) row.reimbursed_amount = data.reimbursedAmount;
  check(await sb().from('transactions').update(row).eq('id', id), 'guardar el gasto');
}

export async function deleteTransaction(id: string) {
  if (DEMO_MODE) {
    demoStore.transactions = demoStore.transactions.filter((t) => t.id !== id);
    return;
  }
  check(await sb().from('transactions').delete().eq('id', id), 'borrar el gasto');
}

// ── Accounts ──────────────────────────────────────────────────────────────────

export async function getAccounts(userId: string): Promise<Account[]> {
  if (DEMO_MODE) return [...demoStore.accounts].sort((a, b) => a.order - b.order);

  const data = check(await sb().from('accounts').select('*').eq('user_id', userId).order('order_index'), 'cargar tus cuentas');

  return ((data ?? []) as AccountRow[]).map((a) => ({
    id: a.id,
    userId: a.user_id,
    name: a.name,
    currency: a.currency,
    type: a.type,
    balance: Number(a.balance),
    note: a.note ?? undefined,
    order: a.order_index,
    createdAt: a.created_at,
  }));
}

export async function saveAccount(userId: string, data: Omit<Account, 'id' | 'createdAt'> & { id?: string }) {
  if (DEMO_MODE) {
    if (data.id) {
      demoStore.accounts = demoStore.accounts.map((a) => (a.id === data.id ? ({ ...a, ...data } as Account) : a));
      return data.id;
    }
    const id = crypto.randomUUID();
    demoStore.accounts.push({ ...data, id, createdAt: new Date().toISOString() } as Account);
    return id;
  }

  const row = {
    user_id: userId,
    name: data.name,
    currency: data.currency,
    type: data.type,
    balance: data.balance,
    note: data.note ?? null,
    order_index: data.order,
  };

  if (data.id) {
    check(await sb().from('accounts').update(row).eq('id', data.id), `actualizar la cuenta ${data.name}`);
    return data.id;
  }
  const inserted = check<{ id: string }>(await sb().from('accounts').insert(row).select('id').single(), `crear la cuenta ${data.name}`);
  return inserted.id;
}

export async function deleteAccount(userId: string, accountId: string) {
  if (DEMO_MODE) {
    demoStore.accounts = demoStore.accounts.filter((a) => a.id !== accountId);
    return;
  }
  check(await sb().from('accounts').delete().eq('id', accountId), 'borrar la cuenta');
}

// ── Account Movements ─────────────────────────────────────────────────────────

export async function getMovements(userId: string, accountId: string): Promise<AccountMovement[]> {
  if (DEMO_MODE) {
    return demoStore.movements.filter((m) => m.accountId === accountId).sort((a, b) => b.date.localeCompare(a.date));
  }
  const data = check(
    await sb().from('account_movements').select('*').eq('user_id', userId).eq('account_id', accountId).order('date', { ascending: false }),
    'cargar los movimientos'
  );

  return ((data ?? []) as MovementRow[]).map((m) => ({
    id: m.id,
    accountId: m.account_id,
    userId: m.user_id,
    date: m.date,
    amount: Number(m.amount),
    description: m.description,
    createdAt: m.created_at,
  }));
}

export async function addMovement(data: Omit<AccountMovement, 'id' | 'createdAt'>) {
  if (DEMO_MODE) {
    demoStore.movements.unshift({ ...data, id: crypto.randomUUID(), createdAt: new Date().toISOString() });
    return;
  }
  check(
    await sb().from('account_movements').insert({
      user_id: data.userId,
      account_id: data.accountId,
      date: data.date,
      amount: data.amount,
      description: data.description,
    }),
    'guardar el movimiento'
  );
}

export async function deleteMovement(id: string) {
  if (DEMO_MODE) {
    demoStore.movements = demoStore.movements.filter((m) => m.id !== id);
    return;
  }
  check(await sb().from('account_movements').delete().eq('id', id), 'borrar el movimiento');
}

// ── Categorías ────────────────────────────────────────────────────────────────

interface CategoryRow { id: string; name: string; order_index: number; }

export async function getCategories(userId: string): Promise<Category[]> {
  if (DEMO_MODE) return [...demoStore.categories].sort((a, b) => a.order - b.order);

  const data = check(await sb().from('categories').select('*').eq('user_id', userId).order('order_index'), 'cargar las categorías');
  let rows = (data ?? []) as CategoryRow[];

  // Primera vez del usuario: precarga las categorías sugeridas.
  if (rows.length === 0) {
    check(
      await sb().from('categories').insert(DEFAULT_CATEGORIES.map((name, i) => ({ user_id: userId, name, order_index: i }))),
      'crear las categorías'
    );
    const seeded = check(await sb().from('categories').select('*').eq('user_id', userId).order('order_index'), 'cargar las categorías');
    rows = (seeded ?? []) as CategoryRow[];
  }

  return rows.map((c) => ({ id: c.id, name: c.name, order: c.order_index }));
}

export async function addCategory(userId: string, name: string, order: number): Promise<string> {
  if (DEMO_MODE) {
    const id = crypto.randomUUID();
    demoStore.categories.push({ id, name, order });
    return id;
  }
  const data = check<{ id: string }>(await sb().from('categories').insert({ user_id: userId, name, order_index: order }).select('id').single(), 'crear la categoría');
  return data.id;
}

export async function deleteCategory(id: string) {
  if (DEMO_MODE) {
    demoStore.categories = demoStore.categories.filter((c) => c.id !== id);
    return;
  }
  check(await sb().from('categories').delete().eq('id', id), 'borrar la categoría');
}
