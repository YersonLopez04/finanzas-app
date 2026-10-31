'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { Moon, Smartphone, Sun } from 'lucide-react';
import { getTheme, getThemeMode, onThemeChange, setThemeMode, takeThemeHint, type Theme, type ThemeMode } from '@/lib/theme';

const HINT_MS = 4000;

// Modo y tema actuales, al día con el botón, Perfil y el modo del teléfono.
// En el servidor no se conocen: se asume día en "auto" y se corrige al hidratar.
export function useTheme(): { mode: ThemeMode; theme: Theme } {
  const snapshot = useSyncExternalStore(
    onThemeChange,
    () => `${getThemeMode()}:${getTheme()}`,
    () => 'auto:light'
  );
  const [mode, theme] = snapshot.split(':') as [ThemeMode, Theme];
  return { mode, theme };
}

// Botón sol/luna: muestra el modo al que vas a cambiar (de día una luna, de noche un sol).
// "icon" va en la cabecera del Resumen (teléfono); "row" al pie de la barra lateral.
export function ThemeButton({ variant = 'icon', className = '' }: { variant?: 'icon' | 'row'; className?: string }) {
  const { mode, theme } = useTheme();
  const [hint, setHint] = useState<Theme | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const next: Theme = theme === 'light' ? 'dark' : 'light';
  const Icon = next === 'dark' ? Moon : Sun;
  const label = next === 'dark' ? 'Modo noche' : 'Modo día';

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function toggle() {
    setThemeMode(next);
    if (mode === 'auto' && takeThemeHint()) {
      setHint(next);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setHint(null), HINT_MS);
    }
  }

  return (
    <>
      {variant === 'icon' ? (
        <button
          type="button"
          onClick={toggle}
          aria-label={`Cambiar a ${label.toLowerCase()}`}
          className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-stone-200 bg-white text-slate-600 transition-transform duration-150 ease-out after:absolute after:-inset-1.5 active:scale-90 dark:border-stone-800 dark:bg-stone-900 dark:text-slate-300 ${className}`}
        >
          <Icon key={next} size={15} strokeWidth={2} className="motion-spin-in" />
        </button>
      ) : (
        <button
          type="button"
          onClick={toggle}
          className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm text-stone-500 transition-colors hover:bg-stone-50 hover:text-stone-700 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-200 ${className}`}
        >
          <Icon key={next} size={17} className="motion-spin-in" />
          {label}
          {mode === 'auto' && <span className="ml-auto text-xs text-stone-500 dark:text-stone-400">auto</span>}
        </button>
      )}

      {hint && (
        <div className="fixed inset-x-4 bottom-24 z-[60] md:bottom-6 md:left-auto md:right-6 md:max-w-sm">
          <div
            role="status"
            className="motion-pop flex items-center gap-3 rounded-2xl bg-stone-800 py-2 pl-4 pr-2 text-sm text-white shadow-lg dark:bg-stone-100 dark:text-stone-900"
          >
            <p className="flex-1">Modo {hint === 'dark' ? 'noche' : 'día'} fijo. Ya no sigue al teléfono.</p>
            <Link
              href="/perfil"
              onClick={() => setHint(null)}
              className="shrink-0 rounded-full px-3.5 py-2.5 font-semibold text-sky-300 hover:bg-white/10 dark:text-sky-700 dark:hover:bg-stone-900/10"
            >
              Perfil
            </Link>
          </div>
        </div>
      )}
    </>
  );
}

const options: { mode: ThemeMode; label: string; icon: typeof Sun }[] = [
  { mode: 'auto', label: 'Automático', icon: Smartphone },
  { mode: 'light', label: 'Día', icon: Sun },
  { mode: 'dark', label: 'Noche', icon: Moon },
];

// Selector de Perfil. "Automático" vuelve a seguir al teléfono.
export function ThemeSelector() {
  const { mode } = useTheme();

  return (
    <div className="flex flex-col gap-2.5">
      <div role="group" aria-label="Apariencia" className="grid grid-cols-3 gap-0.5 rounded-xl border border-stone-200 bg-stone-100 p-[3px] dark:border-stone-800 dark:bg-stone-950">
        {options.map((o) => (
          <button
            key={o.mode}
            type="button"
            aria-pressed={mode === o.mode}
            onClick={() => setThemeMode(o.mode)}
            className={`flex min-h-10 items-center justify-center gap-1.5 rounded-[9px] text-sm font-semibold transition-colors ${
              mode === o.mode
                ? 'bg-white text-stone-900 shadow-[0_1px_2px_rgba(1,28,64,0.12)] dark:bg-stone-800 dark:text-stone-100'
                : 'text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200'
            }`}
          >
            <o.icon size={15} />
            {o.label}
          </button>
        ))}
      </div>
      <p className="text-xs text-stone-500 dark:text-stone-400">
        {mode === 'auto' ? 'Sigue el modo de tu teléfono.' : `Siempre en modo ${mode === 'light' ? 'día' : 'noche'}, sin importar el teléfono.`}
      </p>
    </div>
  );
}
