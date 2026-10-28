'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { onQuickAddState, requestQuickAddClose, requestQuickAddOpen } from '@/lib/quickAdd';
import { LayoutDashboard, Receipt, List, PiggyBank, Plus } from 'lucide-react';

const leftNav = [
  { href: '/dashboard', label: 'Resumen', icon: LayoutDashboard },
  { href: '/gastos-fijos', label: 'Fijos', icon: List },
];

const rightNav = [
  { href: '/gastos-variables', label: 'Variables', icon: Receipt },
  { href: '/ahorros', label: 'Ahorros', icon: PiggyBank },
];

// La barra tiene 5 columnas iguales: cuatro pestañas y el + en el centro.
// `slot` es la columna de cada pestaña; la lente de vidrio se desliza hasta ella.
function NavLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`group relative z-10 flex flex-col items-center justify-center gap-0.5 text-[10.5px] transition-colors duration-200 ${
        active ? 'font-semibold text-slate-800 dark:text-white' : 'font-medium text-stone-500 dark:text-stone-300'
      }`}
    >
      {/* Respuesta al tocar: se hunde al instante, sin esperar a soltar. */}
      <span className="flex flex-col items-center gap-0.5 transition-transform duration-150 ease-out group-active:scale-90">
        <Icon size={21} strokeWidth={active ? 2.3 : 1.8} />
        {label}
      </span>
    </Link>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [quickOpen, setQuickOpen] = useState(false);

  useEffect(() => onQuickAddState(setQuickOpen), []);

  // Abre el registro rápido; si ya está abierto, el mismo botón (ahora ×) lo cierra.
  function handleQuickAdd() {
    if (quickOpen) requestQuickAddClose();
    else if (pathname.startsWith('/gastos-variables')) requestQuickAddOpen();
    else router.push('/gastos-variables?quick=1');
  }

  // Columna de la pestaña activa (la 2 es el +). Sin pestaña activa (Perfil), la lente se oculta.
  const items = [...leftNav, ...rightNav];
  const slots = [0, 1, 3, 4];
  const activeIndex = items.findIndex((item) => pathname.startsWith(item.href));
  const lensSlot = activeIndex >= 0 ? slots[activeIndex] : 0;

  return (
    <nav
      aria-label="Principal"
      className="glass fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-50 grid h-16 grid-cols-5 items-stretch rounded-[2rem] md:hidden"
    >
      {/* Lente: el cristal del botón activo. Resorte crítico (sin rebote): llega suave y se puede redirigir a mitad de camino. */}
      <div
        aria-hidden="true"
        className="nav-lens pointer-events-none absolute inset-y-1.5 left-0 w-1/5 p-0.5 transition-[transform,opacity] duration-[420ms] [transition-timing-function:var(--ease-sheet)]"
        style={{ transform: `translateX(${lensSlot * 100}%)`, opacity: activeIndex >= 0 ? 1 : 0 }}
      >
        <div className="glass-lens h-full w-full rounded-full" />
      </div>

      {leftNav.map((item) => (
        <NavLink key={item.href} {...item} active={pathname.startsWith(item.href)} />
      ))}
      <div className="relative z-10 flex items-center justify-center">
        <button
          type="button"
          onClick={handleQuickAdd}
          aria-label={quickOpen ? 'Cerrar registro de gasto' : 'Registrar gasto'}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-800 text-white shadow-[0_6px_16px_rgba(1,28,64,0.35),inset_0_1px_0_rgba(255,255,255,0.28)] transition-transform duration-150 ease-out active:scale-90 dark:bg-slate-200 dark:text-slate-900"
        >
          <Plus
            size={22}
            strokeWidth={2.5}
            className={`transition-transform duration-[380ms] [transition-timing-function:var(--spring)] ${quickOpen ? 'rotate-45' : ''}`}
          />
        </button>
      </div>
      {rightNav.map((item) => (
        <NavLink key={item.href} {...item} active={pathname.startsWith(item.href)} />
      ))}
    </nav>
  );
}
