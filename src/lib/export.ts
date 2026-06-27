import { listMonths, getAllTransactions, getAccounts, getMovements } from './db';

function csvEscape(value: string | number | boolean | null | undefined) {
  const s = value === null || value === undefined ? '' : String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsvBlock(title: string, headers: string[], rows: (string | number | boolean | null | undefined)[][]) {
  const lines = [
    `# ${title}`,
    headers.join(','),
    ...rows.map((r) => r.map(csvEscape).join(',')),
  ];
  return lines.join('\n');
}

export async function exportAllData(userId: string) {
  const [months, transactions, accounts] = await Promise.all([
    listMonths(userId),
    getAllTransactions(userId),
    getAccounts(userId),
  ]);

  const movementsByAccount = await Promise.all(accounts.map((a) => getMovements(userId, a.id)));
  const accountNameById = new Map(accounts.map((a) => [a.id, a.name]));

  const blocks = [
    toCsvBlock(
      'Meses',
      ['mes', 'ingreso_fijo', 'ingreso_variable', 'ingreso_extras', 'creado'],
      months.map((m) => [m.id, m.income.fixed, m.income.variable, m.income.extras, m.createdAt])
    ),
    toCsvBlock(
      'Ahorros asignados por mes',
      ['mes', 'cuenta', 'monto'],
      months.flatMap((m) => m.savings.map((s) => [m.id, s.name, s.amount]))
    ),
    toCsvBlock(
      'Gastos fijos por mes',
      ['mes', 'nombre', 'monto', 'pagado', 'fecha_pago'],
      months.flatMap((m) => m.fixedExpenses.map((f) => [m.id, f.name, f.amount, f.paid ? 'si' : 'no', f.paidDate ?? '']))
    ),
    toCsvBlock(
      'Gastos variables',
      ['mes', 'fecha', 'categoria', 'descripcion', 'monto'],
      transactions.map((t) => [t.monthId, t.date, t.category, t.description, t.amount])
    ),
    toCsvBlock(
      'Cuentas de ahorro',
      ['nombre', 'moneda', 'tipo', 'saldo', 'nota'],
      accounts.map((a) => [a.name, a.currency, a.type, a.balance, a.note ?? ''])
    ),
    toCsvBlock(
      'Movimientos de cuentas',
      ['cuenta', 'fecha', 'monto', 'descripcion'],
      movementsByAccount.flat().map((mv) => [accountNameById.get(mv.accountId) ?? mv.accountId, mv.date, mv.amount, mv.description])
    ),
  ];

  const csv = '﻿' + blocks.join('\n\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const date = new Date().toISOString().split('T')[0];
  a.href = url;
  a.download = `finanzas-backup-${date}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
