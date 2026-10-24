import type { FixedExpense, Income, SavingsAllocation, Transaction } from '@/types';

// Única fuente de verdad para los totales del mes. Resumen, Historial y Gastos
// variables calculan con estas funciones para que nunca muestren cifras distintas.

// Lo que de verdad te costó un gasto: en uno compartido se descuenta lo que ya
// te devolvieron. Lo que aún te deben sigue contando hasta que te lo paguen.
export function transactionCost(t: Pick<Transaction, 'amount' | 'shared' | 'reimbursedAmount'>) {
  if (!t.shared) return t.amount;
  return Math.max(t.amount - (t.reimbursedAmount ?? 0), 0);
}

// Lo que aún te deben de un gasto compartido: el monto menos tu parte y menos
// lo que ya te devolvieron. Sin tu parte indicada, se asume que te deben todo.
export function owedToYou(t: Pick<Transaction, 'amount' | 'shared' | 'reimbursedAmount' | 'myShare'>) {
  if (!t.shared) return 0;
  const myShare = Math.min(t.myShare ?? 0, t.amount);
  return Math.max(t.amount - myShare - (t.reimbursedAmount ?? 0), 0);
}

export function variableTotal(transactions: Transaction[]) {
  return transactions.reduce((s, t) => s + transactionCost(t), 0);
}

export function reimbursedTotal(transactions: Transaction[]) {
  return transactions.reduce((s, t) => s + (t.amount - transactionCost(t)), 0);
}

export function costByCategory(transactions: Transaction[]) {
  return transactions.reduce<Record<string, number>>((acc, t) => {
    acc[t.category] = (acc[t.category] ?? 0) + transactionCost(t);
    return acc;
  }, {});
}

export interface MonthTotals {
  income: number;
  savings: number;
  fixed: number;
  variable: number;
  remaining: number;
}

export function monthTotals(
  month: { income: Income; savings: SavingsAllocation[]; fixedExpenses: FixedExpense[] },
  transactions: Transaction[]
): MonthTotals {
  const income = month.income.fixed + month.income.variable + month.income.extras;
  const savings = month.savings.reduce((s, a) => s + (a.amount || 0), 0);
  const fixed = month.fixedExpenses.reduce((s, f) => s + (f.amount || 0), 0);
  const variable = variableTotal(transactions);
  return { income, savings, fixed, variable, remaining: income - savings - fixed - variable };
}
