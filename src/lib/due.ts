import type { FixedExpense } from '@/types';
import { addDays, todayISO } from './utils';
import { dueDateInCycle } from './cycle';

// Única regla de vencimiento de un gasto fijo. Resumen (avisos) y Gastos fijos
// la usan para que nunca digan cosas distintas del mismo pago.

export type DueStatus =
  | { kind: 'paid' }
  | { kind: 'none' } // sin día de pago, o presupuesto que se gasta de a pocos
  | { kind: 'late'; date: string }
  | { kind: 'today'; date: string }
  | { kind: 'tomorrow'; date: string }
  | { kind: 'upcoming'; date: string };

// `cycleMin` es el primer día del ciclo que se está viendo. El día de pago es
// una fecha de calendario: no depende de cuándo cobras.
export function dueStatus(
  expense: Pick<FixedExpense, 'paid' | 'dueDay' | 'tracked'>,
  cycleMin: string,
  today = todayISO()
): DueStatus {
  if (expense.tracked) return { kind: 'none' };
  if (expense.paid) return { kind: 'paid' };
  if (!expense.dueDay) return { kind: 'none' };
  const date = dueDateInCycle(expense.dueDay, cycleMin);
  if (date < today) return { kind: 'late', date };
  if (date === today) return { kind: 'today', date };
  if (date === addDays(today, 1)) return { kind: 'tomorrow', date };
  return { kind: 'upcoming', date };
}
