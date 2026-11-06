'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { onQuickAddState, requestQuickAddClose, requestQuickAddOpen } from '@/lib/quickAdd';
import { LayoutDashboard, Receipt, List, PiggyBank, Plus } from 'lucide-react';

// La barra tiene 4 columnas iguales, una por pestaña; la lente de vidrio se desliza hasta ellas.
// El + es una acción, no una pestaña: vive afuera, a la derecha de la barra.
// Como en iPhone, la lente también se arrastra con el dedo y al soltar va a la pestaña más cercana.
const tabs = [
  { href: '/dashboard', label: 'Resumen', icon: LayoutDashboard },
  { href: '/gastos-fijos', label: 'Fijos', icon: List },
  { href: '/gastos-variables', label: 'Variables', icon: Receipt },
  { href: '/ahorros', label: 'Ahorros', icon: PiggyBank },
];
const DRAG_START_PX = 8;

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  lit,
}: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  active: boolean;
  lit: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`group relative z-10 flex flex-col items-center justify-center gap-0.5 text-[10.5px] transition-colors duration-200 ${
        lit ? 'font-semibold text-slate-800 dark:text-white' : 'font-medium text-stone-500 dark:text-stone-300'
      }`}
    >
      {/* Respuesta al tocar: se hunde al instante, sin esperar a soltar. */}
      <span className="flex flex-col items-center gap-0.5 transition-transform duration-150 ease-out group-active:scale-90">
        <Icon size={21} strokeWidth={lit ? 2.3 : 1.8} />
        {label}
      </span>
    </Link>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [quickOpen, setQuickOpen] = useState(false);

  const navRef = useRef<HTMLElement>(null);
  const drag = useRef<{ id: number; startX: number; active: boolean; lastX: number; lastT: number } | null>(null);
  const suppressClick = useRef(false);
  // Mientras se arrastra: posición de la lente en px y cuánto se estira con la velocidad.
  const [dragLeft, setDragLeft] = useState<number | null>(null);
  const [dragSlot, setDragSlot] = useState(0);
  const [stretch, setStretch] = useState(0);
  // Pestaña elegida al soltar, hasta que la ruta cambie (si no, la lente volvería un instante a la anterior).
  const [released, setReleased] = useState<{ slot: number; from: string } | null>(null);

  useEffect(() => onQuickAddState(setQuickOpen), []);

  // Abre el registro rápido; si ya está abierto, el mismo botón (ahora ×) lo cierra.
  function handleQuickAdd() {
    if (quickOpen) requestQuickAddClose();
    else if (pathname.startsWith('/gastos-variables')) requestQuickAddOpen();
    else router.push('/gastos-variables?quick=1');
  }

  // Columna de la pestaña activa. Sin pestaña activa (Perfil), la lente se oculta.
  const activeIndex = tabs.findIndex((item) => pathname.startsWith(item.href));
  const releasedSlot = released && released.from === pathname ? released.slot : null;
  const lensSlot = releasedSlot ?? Math.max(activeIndex, 0);

  function lensLeftAt(clientX: number) {
    const rect = navRef.current!.getBoundingClientRect();
    const slotWidth = rect.width / tabs.length;
    return { left: Math.min(Math.max(clientX - rect.left - slotWidth / 2, 0), rect.width - slotWidth), slotWidth };
  }

  function handlePointerDown(e: React.PointerEvent<HTMLElement>) {
    suppressClick.current = false;
    if (e.button > 0) return;
    drag.current = { id: e.pointerId, startX: e.clientX, active: false, lastX: e.clientX, lastT: e.timeStamp };
  }

  function handlePointerMove(e: React.PointerEvent<HTMLElement>) {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    if (!d.active) {
      if (Math.abs(e.clientX - d.startX) < DRAG_START_PX) return;
      d.active = true;
      // Si el dedo ya se fue, se arrastra igual sin captura.
      try {
        navRef.current?.setPointerCapture(e.pointerId);
      } catch {}
    }
    const velocity = Math.abs(e.clientX - d.lastX) / Math.max(e.timeStamp - d.lastT, 1);
    d.lastX = e.clientX;
    d.lastT = e.timeStamp;
    const { left, slotWidth } = lensLeftAt(e.clientX);
    setDragLeft(left);
    setDragSlot(Math.round(left / slotWidth));
    setStretch(Math.min(velocity * 0.12, 0.22));
  }

  function handlePointerEnd(e: React.PointerEvent<HTMLElement>) {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    if (!d.active) return;
    suppressClick.current = true;
    setDragLeft(null);
    setStretch(0);
    if (e.type === 'pointercancel') return;
    const { left, slotWidth } = lensLeftAt(e.clientX);
    const slot = Math.round(left / slotWidth);
    const { href } = tabs[slot];
    setReleased({ slot, from: pathname });
    if (!pathname.startsWith(href)) router.push(href);
  }

  const dragging = dragLeft !== null;
  const litSlot = dragging ? dragSlot : lensSlot;
  const lensVisible = dragging || releasedSlot !== null || activeIndex >= 0;

  return (
    <div className="pointer-events-none fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-50 flex items-center gap-2 md:hidden">
      <nav
        aria-label="Principal"
        ref={navRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onClickCapture={(e) => {
          // Soltar después de arrastrar no cuenta como toque en la pestaña de abajo.
          if (!suppressClick.current) return;
          suppressClick.current = false;
          e.preventDefault();
          e.stopPropagation();
        }}
        className="glass pointer-events-auto relative grid h-16 min-w-0 flex-1 touch-none grid-cols-4 items-stretch rounded-[2rem] select-none"
      >
        {/* Lente: el cristal del botón activo. Resorte crítico (sin rebote): llega suave y se puede redirigir a mitad de camino.
            Al arrastrar sigue al dedo sin transición, crece como una gota y se estira con la velocidad. */}
        <div
          aria-hidden="true"
          className={`nav-lens pointer-events-none absolute inset-y-1.5 left-0 w-1/4 p-0.5 ${
            dragging ? 'transition-opacity' : 'transition-[transform,opacity] duration-[420ms] [transition-timing-function:var(--ease-sheet)]'
          }`}
          style={{
            transform: dragging ? `translateX(${dragLeft}px)` : `translateX(${lensSlot * 100}%)`,
            opacity: lensVisible ? 1 : 0,
          }}
        >
          <div
            className="glass-lens h-full w-full rounded-full transition-transform duration-200 ease-out"
            style={{ transform: dragging ? `scale(${1.12 + stretch}, ${1.12 - stretch * 0.5})` : undefined }}
          />
        </div>

        {tabs.map((item, i) => (
          <NavLink key={item.href} {...item} active={pathname.startsWith(item.href)} lit={lensVisible && litSlot === i} />
        ))}
      </nav>
      <button
        type="button"
        onClick={handleQuickAdd}
        aria-label={quickOpen ? 'Cerrar registro de gasto' : 'Registrar gasto'}
        className="pointer-events-auto flex h-13 w-13 flex-none items-center justify-center rounded-full bg-slate-800 text-white shadow-[0_6px_16px_rgba(1,28,64,0.35),inset_0_1px_0_rgba(255,255,255,0.28)] transition-transform duration-150 ease-out active:scale-90 dark:bg-slate-200 dark:text-slate-900 dark:shadow-[0_6px_16px_rgba(0,0,0,0.4)]"
      >
        <Plus
          size={22}
          strokeWidth={2.5}
          className={`transition-transform duration-[380ms] [transition-timing-function:var(--spring)] ${quickOpen ? 'rotate-45' : ''}`}
        />
      </button>
    </div>
  );
}
