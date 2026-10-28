export function formatCurrency(amount: number, currency: 'PEN' | 'USD' = 'PEN') {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function getCurrentMonthId() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function monthIdToLabel(monthId: string) {
  const [year, month] = monthId.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' });
}

// Fecha local (no UTC): con toISOString, en Perú después de las 7 pm ya era "mañana".
export function toISODate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function todayISO() {
  return toISODate(new Date());
}

// Suma días a una fecha ISO ("2026-10-23" + 1 = "2026-10-24"), en hora local.
export function addDays(iso: string, days: number) {
  const [year, month, day] = iso.split('-').map(Number);
  return toISODate(new Date(year, month - 1, day + days));
}

// Fecha por defecto para registrar algo en un ciclo: hoy si cae dentro; si el
// ciclo ya pasó, su último día; si aún no empieza, el primero. Así la fecha nunca
// queda fuera del ciclo que se está viendo.
export function defaultDateForCycle({ min, max }: { min: string; max: string | null }) {
  const today = todayISO();
  if (today < min) return min;
  if (max !== null && today > max) return max;
  return today;
}

const WEEKDAYS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'dic'];

// "jue 5 jun"; si es de otro año, "5 jun 2025".
export function formatShortDate(iso: string) {
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (year !== new Date().getFullYear()) return `${day} ${MONTHS[month - 1]} ${year}`;
  return `${WEEKDAYS[date.getDay()]} ${day} ${MONTHS[month - 1]}`;
}

// "5 oct", sin día de la semana; si es de otro año, "5 oct 2025".
export function formatDayMonth(iso: string) {
  const [year, month, day] = iso.split('-').map(Number);
  const label = `${day} ${MONTHS[month - 1]}`;
  return year === new Date().getFullYear() ? label : `${label} ${year}`;
}

export function getPreviousMonthId(monthId: string) {
  const [year, month] = monthId.split('-').map(Number);
  const date = new Date(year, month - 2, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

// Devuelve una copia con el elemento en su posición original (para deshacer un borrado).
export function insertAt<T>(list: T[], index: number, item: T) {
  const next = [...list];
  next.splice(Math.min(index, next.length), 0, item);
  return next;
}
