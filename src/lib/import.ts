import { saveMonth, addTransaction, saveAccount, addMovement } from './db';
import type { SavingsAllocation, FixedExpense, PaymentMethod, AccountCurrency, AccountType } from '@/types';

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      fields.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  fields.push(current);
  return fields;
}

interface CsvBlock {
  title: string;
  rows: Record<string, string>[];
}

function parseCsvBlocks(text: string): CsvBlock[] {
  const clean = text.replace(/^﻿/, '');
  const blocks = clean.split(/\n\s*\n/).filter((b) => b.trim());

  return blocks.map((block) => {
    const lines = block.split('\n').filter((l) => l.trim());
    const title = lines[0].replace(/^#\s*/, '').trim();
    const headers = parseCsvLine(lines[1]);
    const rows = lines.slice(2).map((line) => {
      const values = parseCsvLine(line);
      const row: Record<string, string> = {};
      headers.forEach((h, i) => (row[h] = values[i] ?? ''));
      return row;
    });
    return { title, rows };
  });
}

export interface ImportSummary {
  months: number;
  fixedExpenses: number;
  savings: number;
  transactions: number;
  accounts: number;
  movements: number;
}

export async function importAllData(userId: string, file: File): Promise<ImportSummary> {
  const text = await file.text();
  const blocks = parseCsvBlocks(text);
  const byTitle = new Map(blocks.map((b) => [b.title, b.rows]));

  const monthsRows = byTitle.get('Meses') ?? [];
  const savingsRows = byTitle.get('Ahorros asignados por mes') ?? [];
  const fixedRows = byTitle.get('Gastos fijos por mes') ?? [];
  const transactionRows = byTitle.get('Gastos variables') ?? [];
  const accountRows = byTitle.get('Cuentas de ahorro') ?? [];
  const movementRows = byTitle.get('Movimientos de cuentas') ?? [];

  // 1. Cuentas primero, para poder enlazar ahorros y movimientos por nombre
  const accountIdByName = new Map<string, string>();
  for (let i = 0; i < accountRows.length; i++) {
    const r = accountRows[i];
    if (!r.nombre) continue;
    const id = await saveAccount(userId, {
      userId,
      name: r.nombre,
      currency: (r.moneda as AccountCurrency) || 'PEN',
      type: (r.tipo as AccountType) || 'savings',
      balance: Number(r.saldo) || 0,
      note: r.nota || undefined,
      order: i,
    });
    accountIdByName.set(r.nombre, id);
  }

  // 2. Agrupar ahorros y gastos fijos por mes
  const savingsByMonth = new Map<string, SavingsAllocation[]>();
  savingsRows.forEach((r) => {
    if (!r.mes) return;
    const list = savingsByMonth.get(r.mes) ?? [];
    list.push({
      id: crypto.randomUUID(),
      name: r.cuenta,
      amount: Number(r.monto) || 0,
      accountId: accountIdByName.get(r.cuenta),
    });
    savingsByMonth.set(r.mes, list);
  });

  const fixedByMonth = new Map<string, FixedExpense[]>();
  fixedRows.forEach((r, i) => {
    if (!r.mes) return;
    const list = fixedByMonth.get(r.mes) ?? [];
    list.push({
      id: crypto.randomUUID(),
      name: r.nombre,
      amount: Number(r.monto) || 0,
      paid: r.pagado === 'si',
      paidDate: r.fecha_pago || undefined,
      dueDay: r.dia_pago ? Number(r.dia_pago) : undefined,
      order: i,
    });
    fixedByMonth.set(r.mes, list);
  });

  // 3. Guardar cada mes (ingresos + ahorros + gastos fijos)
  const monthIds = new Set([...monthsRows.map((r) => r.mes), ...savingsByMonth.keys(), ...fixedByMonth.keys()]);
  for (const monthId of monthIds) {
    if (!monthId) continue;
    const monthRow = monthsRows.find((r) => r.mes === monthId);
    await saveMonth(userId, monthId, {
      income: {
        fixed: Number(monthRow?.ingreso_fijo) || 0,
        variable: Number(monthRow?.ingreso_variable) || 0,
        extras: Number(monthRow?.ingreso_extras) || 0,
      },
      savings: savingsByMonth.get(monthId) ?? [],
      fixedExpenses: fixedByMonth.get(monthId) ?? [],
      createdAt: monthRow?.creado || new Date().toISOString(),
    });
  }

  // 4. Gastos variables
  for (const r of transactionRows) {
    if (!r.mes || !r.fecha) continue;
    await addTransaction({
      userId,
      monthId: r.mes,
      date: r.fecha,
      amount: Number(r.monto) || 0,
      category: r.categoria || 'Otros',
      description: r.descripcion || '',
      paymentMethod: (r.metodo_pago as PaymentMethod) || undefined,
      shared: r.compartido === 'si',
      reimbursedAmount: Number(r.monto_recibido) || 0,
    });
  }

  // 5. Movimientos de cuentas
  for (const r of movementRows) {
    const accountId = accountIdByName.get(r.cuenta);
    if (!accountId || !r.fecha) continue;
    await addMovement({
      accountId,
      userId,
      date: r.fecha,
      amount: Number(r.monto) || 0,
      description: r.descripcion || '',
    });
  }

  return {
    months: monthIds.size,
    fixedExpenses: fixedRows.length,
    savings: savingsRows.length,
    transactions: transactionRows.length,
    accounts: accountRows.length,
    movements: movementRows.length,
  };
}
