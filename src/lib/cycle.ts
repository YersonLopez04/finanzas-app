import { addDays, toISODate } from './utils';

// Ciclos de cobro. El "mes" de la app no es el calendario: el ciclo "2026-11" es
// el dinero de noviembre, que se cobra a fines de octubre. Empieza el día que
// cobraste y dura hasta el día anterior al siguiente cobro.
//
// Cada ciclo guarda su fecha real de inicio (la que el dueño confirma). Mientras
// no haya una confirmada, la app propone el día de cobro de cada persona (25 si
// no eligió otro), corrido al día hábil anterior si cae sábado, domingo o feriado
// fijo. Los feriados que se mueven cada año no se conocen: por eso se confirma el
// día real.

export type CycleStarts = Record<string, string>; // { "2026-11": "2026-10-23" }
export interface CycleBounds {
  min: string;
  max: string | null; // null = ciclo abierto: aún no se sabe cuándo termina
}
export interface PendingCycle {
  monthId: string; // el ciclo que está por empezar
  previousMonthId: string; // el ciclo que termina
  proposed: string; // cobro previsto
  suggestedStart: string; // el previsto si ya llegó; si no, hoy
  min: string; // primer día que se puede elegir como inicio
  max: string; // hoy: no se puede empezar un ciclo en el futuro
}

export const DEFAULT_PAY_DAY = 25;
// Quien cobra hasta el 15 cobra el dinero de ese mismo mes; desde el 16, el del
// mes siguiente. Así el ciclo lleva el nombre del mes en el que pasa más días.
const LAST_SAME_MONTH_PAY_DAY = 15;
// Avisar de un cobro unos días antes de lo previsto, por si cae antes.
const PENDING_LEAD_DAYS = 2;
// Feriados de fecha fija en Perú (mes-día).
const FIXED_HOLIDAYS = new Set(['01-01', '05-01', '06-29', '07-28', '07-29', '08-30', '10-08', '11-01', '12-08', '12-09', '12-25']);

export function shiftMonth(monthId: string, delta: number) {
  const [y, m] = monthId.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function isBusinessDay(d: Date) {
  const weekday = d.getDay();
  if (weekday === 0 || weekday === 6) return false;
  const key = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return !FIXED_HOLIDAYS.has(key);
}

// Día de cobro previsto de un mes calendario: el elegido, o el día hábil anterior.
// Un 31 cae el último día en los meses cortos.
export function payDate(monthId: string, payDay: number) {
  const [y, m] = monthId.split('-').map(Number);
  const d = new Date(y, m - 1, Math.min(payDay, new Date(y, m, 0).getDate()));
  while (!isBusinessDay(d)) d.setDate(d.getDate() - 1);
  return toISODate(d);
}

// Inicio previsto del ciclo de un mes: el cobro que paga ese mes.
export function proposedStart(monthId: string, payDay: number) {
  return payDate(payDay <= LAST_SAME_MONTH_PAY_DAY ? monthId : shiftMonth(monthId, -1), payDay);
}

// Ciclo vigente: el último con inicio confirmado que ya empezó. Sin ninguno
// (cuenta sin ciclos), el mes calendario de hoy. Quien cobra en la primera
// quincena sigue en el mes anterior hasta confirmar: su cobro cae dentro del mes
// calendario, y si ya estuviera en él, el aviso apuntaría al mes siguiente.
export function currentCycleId(starts: CycleStarts, today: string, payDay: number) {
  const started = Object.keys(starts).filter((id) => starts[id] <= today).sort();
  if (started.length > 0) return started[started.length - 1];
  const calendar = today.slice(0, 7);
  return payDay <= LAST_SAME_MONTH_PAY_DAY ? shiftMonth(calendar, -1) : calendar;
}

// Inicio de un ciclo: el confirmado; si no hay, el 1 del mes (meses viejos,
// calendario) o el previsto (ciclos futuros).
export function cycleStart(monthId: string, starts: CycleStarts, today: string, payDay: number) {
  if (starts[monthId]) return starts[monthId];
  return monthId <= currentCycleId(starts, today, payDay) ? `${monthId}-01` : proposedStart(monthId, payDay);
}

export function cycleBounds(monthId: string, starts: CycleStarts, today: string, payDay: number): CycleBounds {
  const min = cycleStart(monthId, starts, today, payDay);
  const next = shiftMonth(monthId, 1);
  if (starts[next]) return { min, max: addDays(starts[next], -1) };
  if (monthId === currentCycleId(starts, today, payDay)) {
    // Ciclo vigente: abierto hasta que se confirme el siguiente cobro. Si ya pasó
    // la fecha prevista, no se pone tope: lo de hoy aún se registra aquí.
    const proposed = proposedStart(next, payDay);
    return { min, max: proposed > today ? addDays(proposed, -1) : null };
  }
  return { min, max: addDays(cycleStart(next, starts, today, payDay), -1) };
}

// El siguiente ciclo está por empezar y falta que el dueño confirme el día.
export function pendingCycle(starts: CycleStarts, today: string, payDay: number): PendingCycle | null {
  const previousMonthId = currentCycleId(starts, today, payDay);
  const monthId = shiftMonth(previousMonthId, 1);
  if (starts[monthId]) return null;
  const proposed = proposedStart(monthId, payDay);
  if (addDays(proposed, -PENDING_LEAD_DAYS) > today) return null;
  const min = addDays(cycleStart(previousMonthId, starts, today, payDay), 1);
  const suggested = proposed <= today ? proposed : today;
  return { monthId, previousMonthId, proposed, suggestedStart: suggested < min ? min : suggested, min, max: today };
}

// Fecha real de un vencimiento. "Día 5" es el 5 del calendario, no el día 5 del
// ciclo: es la primera vez que ese día ocurre desde que empezó el ciclo. Un 31
// vence el 30 en los meses cortos.
export function dueDateInCycle(dueDay: number, cycleMin: string) {
  const [y, m] = cycleMin.split('-').map(Number);
  for (let i = 0; i < 3; i++) {
    const daysInMonth = new Date(y, m + i, 0).getDate();
    const iso = toISODate(new Date(y, m - 1 + i, Math.min(dueDay, daysInMonth)));
    if (iso >= cycleMin) return iso;
  }
  return cycleMin;
}

// "23 oct – 24 nov"; el fin abierto se muestra como "en curso".
export function cycleRangeLabel(bounds: CycleBounds, format: (iso: string) => string) {
  return bounds.max ? `${format(bounds.min)} – ${format(bounds.max)}` : `desde ${format(bounds.min)}`;
}
