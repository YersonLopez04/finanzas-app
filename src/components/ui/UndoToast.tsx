'use client';

import { useEffect, useRef, useState } from 'react';
import { reportError } from './ErrorToast';

const EVENT = 'app-undo';
const UNDO_MS = 5000;

interface UndoRequest {
  message: string;
  // Vuelve a mostrar lo borrado (y, si el borrado ya se hizo, lo revierte).
  onUndo: () => void | Promise<void>;
  // Borrado diferido: se ejecuta recién cuando vence el plazo sin deshacer.
  // Si falla, se restaura con onUndo y se avisa del error.
  onCommit?: () => Promise<void>;
}

// La pantalla quita el elemento de la vista al instante y llama a esto. Con
// onCommit, el borrado real espera unos segundos; si se toca "Deshacer", nunca
// llega a la base.
export function showUndo(request: UndoRequest) {
  window.dispatchEvent(new CustomEvent<UndoRequest>(EVENT, { detail: request }));
}

async function commit(request: UndoRequest) {
  if (!request.onCommit) return;
  try {
    await request.onCommit();
  } catch (err) {
    await request.onUndo();
    reportError(err);
  }
}

export function UndoToast() {
  const [current, setCurrent] = useState<UndoRequest | null>(null);
  const pending = useRef<UndoRequest | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onRequest = (e: Event) => {
      // Un borrado nuevo confirma el anterior de inmediato: solo se puede
      // deshacer el último.
      if (pending.current) commit(pending.current);
      if (timer.current) clearTimeout(timer.current);
      const request = (e as CustomEvent<UndoRequest>).detail;
      pending.current = request;
      setCurrent(request);
      timer.current = setTimeout(() => {
        pending.current = null;
        setCurrent(null);
        commit(request);
      }, UNDO_MS);
    };
    window.addEventListener(EVENT, onRequest);
    return () => window.removeEventListener(EVENT, onRequest);
  }, []);

  async function handleUndo() {
    const request = pending.current;
    if (!request) return;
    if (timer.current) clearTimeout(timer.current);
    pending.current = null;
    setCurrent(null);
    try {
      await request.onUndo();
    } catch (err) {
      reportError(err);
    }
  }

  if (!current) return null;

  return (
    <div className="fixed inset-x-4 bottom-24 md:bottom-6 md:left-auto md:right-6 md:max-w-sm z-[60]">
      <div
        role="status"
        className="motion-pop flex items-center gap-3 rounded-2xl bg-stone-800 pl-4 pr-2 py-2 text-sm text-white shadow-lg dark:bg-stone-100 dark:text-stone-900"
      >
        <p className="flex-1">{current.message}</p>
        <button
          type="button"
          onClick={handleUndo}
          className="shrink-0 rounded-full px-3.5 py-2.5 font-semibold text-sky-300 hover:bg-white/10 dark:text-sky-700 dark:hover:bg-stone-900/10"
        >
          Deshacer
        </button>
      </div>
    </div>
  );
}
