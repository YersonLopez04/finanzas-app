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

export function todayISO() {
  return new Date().toISOString().split('T')[0];
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
