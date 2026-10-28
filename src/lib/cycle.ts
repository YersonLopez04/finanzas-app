import { addDays, toISODate } from './utils';

// Ciclos de cobro. El "mes" de la app no es el calendario: el ciclo "2026-11" es
// el dinero de noviembre, que se cobra a fines de octubre. Empieza el día que
// cobraste y dura hasta el día anterior al siguiente cobro.
//
// Cada ciclo guarda su fecha real de inicio (la que el dueño confirma). Mientras
// no haya una confirmada, la app propone el 25 del mes anterior, corrido al día
// hábil anterior si cae sábado, domingo o feriado fijo. Los feriados que se
// mueven cada año no se conocen: por eso el dueño confirma el día real.

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

const PAY_DAY = 25;
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

// Día de cobro previsto de un mes calendario: el 25, o el día hábil anterior.
export function payDate(monthId: string) {
  const [y, m] = monthId.split('-').map(Number);
  const d = new Date(y, m - 1, PAY_DAY);
  while (!isBusinessDay(d)) d.setDate(d.getDate() - 1);
  return toISODate(d);
}

// Inicio previsto del ciclo de un mes: el cobro del mes anterior.
export function proposedStart(monthId: string) {
  return payDate(shiftMonth(monthId, -1));
}

// Ciclo vigente: el último con inicio confirmado que ya empezó. Sin ninguno
// (cuenta anterior a los ciclos), el mes calendario de hoy.
export function currentCycleId(starts: CycleStarts, today: string) {
  const started = Object.keys(starts).filter((id) => starts[id] <= today).sort();
  return started.length > 0 ? started[started.length - 1] : today.slice(0, 7);
}

// Inicio de un ciclo: el confirmado; si no hay, el 1 del mes (meses viejos,
// calendario) o el previsto (ciclos futuros).
export function cycleStart(monthId: string, starts: CycleStarts, today: string) {
  if (starts[monthId]) return starts[monthId];
  return monthId <= currentCycleId(starts, today) ? `${monthId}-01` : proposedStart(monthId);
}

export function cycleBounds(monthId: string, starts: CycleStarts, today: string): CycleBounds {
  const min = cycleStart(monthId, starts, today);
  const next = shiftMonth(monthId, 1);
  if (starts[next]) return { min, max: addDays(starts[next], -1) };
  if (monthId === currentCycleId(starts, today)) {
    // Ciclo vigente: abierto hasta que se confirme el siguiente cobro. Si ya pasó
    // la fecha prevista, no se pone tope: lo de hoy aún se registra aquí.
    const proposed = proposedStart(next);
    return { min, max: proposed > today ? addDays(proposed, -1) : null };
  }
  return { min, max: addDays(cycleStart(next, starts, today), -1) };
}

// El siguiente ciclo está por empezar y falta que el dueño confirme el día.
export function pendingCycle(starts: CycleStarts, today: string): PendingCycle | null {
  const previousMonthId = currentCycleId(starts, today);
  const monthId = shiftMonth(previousMonthId, 1);
  if (starts[monthId]) return null;
  const proposed = proposedStart(monthId);
  if (addDays(proposed, -PENDING_LEAD_DAYS) > today) return null;
  const min = addDays(cycleStart(previousMonthId, starts, today), 1);
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
