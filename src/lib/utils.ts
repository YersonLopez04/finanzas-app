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

// Fecha por defecto para registrar algo en un mes: hoy si es el mes actual; si
// no, el último día del mes (pasado) o el primero (futuro), para que la fecha
// nunca caiga fuera del mes que se está viendo.
export function defaultDateForMonth(monthId: string) {
  const current = getCurrentMonthId();
  if (monthId === current) return todayISO();
  const [year, month] = monthId.split('-').map(Number);
  return monthId < current ? toISODate(new Date(year, month, 0)) : `${monthId}-01`;
}

export function monthBounds(monthId: string) {
  const [year, month] = monthId.split('-').map(Number);
  return { min: `${monthId}-01`, max: toISODate(new Date(year, month, 0)) };
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
