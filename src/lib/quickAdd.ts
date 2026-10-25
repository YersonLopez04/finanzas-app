// El + de la barra inferior y la hoja de registro rápido se hablan por eventos:
// la hoja avisa si está abierta (el + se vuelve ×) y el × le pide cerrarse.
// En Gastos variables el + pide abrirla sin navegar.

const STATE = 'quick-add-state';
const CLOSE = 'quick-add-close';
const OPEN = 'quick-add-open';

export function announceQuickAdd(open: boolean) {
  window.dispatchEvent(new CustomEvent<boolean>(STATE, { detail: open }));
}

export function onQuickAddState(handler: (open: boolean) => void) {
  const listener = (e: Event) => handler((e as CustomEvent<boolean>).detail);
  window.addEventListener(STATE, listener);
  return () => window.removeEventListener(STATE, listener);
}

function on(name: string, handler: () => void) {
  window.addEventListener(name, handler);
  return () => window.removeEventListener(name, handler);
}

export const requestQuickAddClose = () => window.dispatchEvent(new Event(CLOSE));
export const requestQuickAddOpen = () => window.dispatchEvent(new Event(OPEN));
export const onQuickAddClose = (handler: () => void) => on(CLOSE, handler);
export const onQuickAddOpen = (handler: () => void) => on(OPEN, handler);
