import type { FixedExpense } from '@/types';
import { getCurrentMonthId } from './utils';

// Única regla de vencimiento de un gasto fijo. Resumen (avisos) y Gastos fijos
// la usan para que nunca digan cosas distintas del mismo pago.

export type DueStatus =
  | { kind: 'paid' }
  | { kind: 'none' } // sin día de pago, o presupuesto que se gasta de a pocos
  | { kind: 'late'; day: number }
  | { kind: 'today'; day: number }
  | { kind: 'tomorrow'; day: number }
  | { kind: 'upcoming'; day: number };

// Día de pago real en ese mes: un "31" vence el 30 en noviembre.
export function effectiveDueDay(dueDay: number, monthId: string) {
  const [year, month] = monthId.split('-').map(Number);
  return Math.min(dueDay, new Date(year, month, 0).getDate());
}

export function dueStatus(
  expense: Pick<FixedExpense, 'paid' | 'dueDay' | 'tracked'>,
  monthId: string,
  now = new Date()
): DueStatus {
  if (expense.tracked) return { kind: 'none' };
  if (expense.paid) return { kind: 'paid' };
  if (!expense.dueDay) return { kind: 'none' };
  const day = effectiveDueDay(expense.dueDay, monthId);
  const current = getCurrentMonthId();
  if (monthId < current) return { kind: 'late', day };
  if (monthId > current) return { kind: 'upcoming', day };
  const today = now.getDate();
  if (day < today) return { kind: 'late', day };
  if (day === today) return { kind: 'today', day };
  if (day === today + 1) return { kind: 'tomorrow', day };
  return { kind: 'upcoming', day };
}
