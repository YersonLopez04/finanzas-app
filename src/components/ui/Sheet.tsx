'use client';

import { useEffect, useId } from 'react';
import { X } from 'lucide-react';

interface Props {
  title: string;
  onClose: () => void;
  // En el teléfono, la hoja que abre el + de la barra queda encima de la barra
  // (para que el + convertido en × la cierre). Las demás la cubren.
  aboveNav?: boolean;
  children: React.ReactNode;
}

// Hoja inferior en el teléfono; ventana centrada en escritorio. Se monta solo
// mientras está abierta.
export function Sheet({ title, onClose, aboveNav = false, children }: Props) {
  const titleId = useId();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className={`fixed inset-x-0 top-0 flex items-end justify-center md:bottom-0 md:z-[55] md:items-center md:p-6 ${
        aboveNav ? 'bottom-[var(--bottom-nav-h)] z-30' : 'bottom-0 z-[55]'
      }`}
    >
      <div className="motion-fade absolute inset-0 bg-stone-900/35 dark:bg-black/55" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`motion-sheet relative w-full max-h-[calc(100%-3rem)] overflow-y-auto overscroll-contain rounded-t-[1.75rem] bg-white px-5 pt-2 shadow-[0_-10px_30px_rgba(0,0,0,0.12)] dark:bg-stone-900 md:max-w-md md:rounded-3xl md:pb-5 md:pt-4 ${
          aboveNav ? 'pb-4' : 'pb-[calc(1.25rem+env(safe-area-inset-bottom))]'
        }`}
      >
        <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-stone-200 dark:bg-stone-700 md:hidden" aria-hidden="true" />
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id={titleId} className="text-base font-semibold text-stone-800 dark:text-stone-100">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-stone-500 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
