'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { DataError } from '@/lib/db';
import { Button } from './Button';

const EVENT = 'app-error';
const FALLBACK = 'Algo salió mal. Inténtalo de nuevo.';

function messageFor(err: unknown) {
  return err instanceof DataError ? err.message : FALLBACK;
}

// Muestra el error en el aviso global. Las pantallas lo llaman en el catch de
// cada guardado para que un fallo nunca pase en silencio.
export function reportError(err: unknown) {
  if (!(err instanceof DataError)) console.error(err);
  window.dispatchEvent(new CustomEvent(EVENT, { detail: messageFor(err) }));
}

export function ErrorToast() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const onError = (e: Event) => setMessage((e as CustomEvent<string>).detail);
    // Red de seguridad: un error de datos que ninguna pantalla atrapó.
    const onRejection = (e: PromiseRejectionEvent) => {
      if (e.reason instanceof DataError) setMessage(e.reason.message);
    };
    window.addEventListener(EVENT, onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener(EVENT, onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 8000);
    return () => clearTimeout(t);
  }, [message]);

  if (!message) return null;

  return (
    <div className="fixed inset-x-4 top-[calc(env(safe-area-inset-top)+0.75rem)] md:left-auto md:right-6 md:top-6 md:max-w-sm z-[60]">
      <div
        role="alert"
        key={message}
        className="motion-pop flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-lg dark:border-red-500/30 dark:bg-stone-900 dark:text-red-300"
      >
        <AlertCircle size={17} className="mt-0.5 shrink-0" />
        <p className="flex-1">{message}</p>
        <button
          type="button"
          onClick={() => setMessage(null)}
          aria-label="Cerrar aviso"
          className="-m-2.5 shrink-0 rounded-full p-2.5 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-200"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

// Reemplaza el contenido de una pantalla cuando su carga falló. Mostrar el
// formulario vacío sería peligroso: al guardar, pisaría los datos reales.
export function LoadError({ error }: { error: unknown }) {
  return (
    <div className="mt-8 flex flex-col items-center gap-3 text-center">
      <p className="text-sm text-stone-600 dark:text-stone-300 max-w-xs">{messageFor(error)}</p>
      <Button variant="secondary" size="sm" onClick={() => window.location.reload()}>
        Reintentar
      </Button>
    </div>
  );
}
