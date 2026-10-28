'use client';

import { useEffect, useId, useRef } from 'react';
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
  const panelRef = useRef<HTMLDivElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ pointerId: number; startY: number; base: number; samples: { y: number; t: number }[] } | null>(null);
  const closing = useRef(false);

  // Arrastrar la manija o el título hacia abajo cierra la hoja (solo en teléfono).
  // La hoja sigue al dedo 1:1; al soltar, la velocidad decide si se cierra o vuelve.
  // Empieza desde donde la hoja está en pantalla, así se puede agarrar a mitad de camino.
  function currentOffset() {
    const transform = panelRef.current ? getComputedStyle(panelRef.current).transform : 'none';
    return transform === 'none' ? 0 : new DOMMatrix(transform).m42;
  }

  function setOffset(offset: number, transition: string) {
    const panel = panelRef.current;
    if (!panel) return;
    panel.style.animation = 'none';
    panel.style.transition = transition;
    panel.style.transform = `translateY(${offset}px)`;
    const height = panel.offsetHeight || 1;
    if (scrimRef.current) {
      scrimRef.current.style.animation = 'none';
      scrimRef.current.style.transition = transition.replace('transform', 'opacity');
      scrimRef.current.style.opacity = String(Math.max(0, 1 - Math.max(offset, 0) / height));
    }
  }

  function onGrab(e: React.PointerEvent) {
    if (closing.current || e.button > 0 || window.matchMedia('(min-width: 768px)').matches) return;
    if ((e.target as Element).closest('button')) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const base = currentOffset();
    setOffset(base, 'none');
    drag.current = { pointerId: e.pointerId, startY: e.clientY, base, samples: [{ y: e.clientY, t: e.timeStamp }] };
  }

  function onDrag(e: React.PointerEvent) {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    d.samples.push({ y: e.clientY, t: e.timeStamp });
    if (d.samples.length > 6) d.samples.shift();
    const raw = d.base + (e.clientY - d.startY);
    // Hacia arriba no hay más hoja: resistencia progresiva en lugar de tope seco.
    const offset = raw >= 0 ? raw : -(Math.abs(raw) * 32) / (Math.abs(raw) + 32 / 0.55);
    setOffset(offset, 'none');
  }

  function onRelease(e: React.PointerEvent) {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    drag.current = null;
    const panel = panelRef.current;
    if (!panel) return;
    const offset = currentOffset();
    // Velocidad de los últimos 100 ms antes de soltar: arrastrar rápido, frenar y
    // soltar no cuenta como un golpe. El instante de soltar también es una muestra.
    d.samples.push({ y: e.clientY, t: e.timeStamp });
    const last = d.samples[d.samples.length - 1];
    const first = d.samples.find((sample) => sample.t >= last.t - 100) ?? last;
    const velocity = last.t > first.t ? (last.y - first.y) / (last.t - first.t) : 0; // px/ms
    // Hasta dónde llegaría con la inercia del gesto (función de proyección de Apple).
    const projected = offset + velocity * 1000 * (0.998 / (1 - 0.998)) / 1000;
    if (projected > panel.offsetHeight * 0.5) {
      closing.current = true;
      setOffset(panel.offsetHeight, 'transform 260ms var(--ease-sheet)');
      window.setTimeout(onClose, 240);
    } else {
      setOffset(0, 'transform 420ms var(--ease-sheet)');
    }
  }

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
      <div ref={scrimRef} className="motion-fade absolute inset-0 bg-stone-950/40 dark:bg-black/60" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`motion-sheet relative w-full max-h-[calc(100%-3rem)] overflow-y-auto overscroll-contain rounded-t-[1.75rem] bg-white px-5 pt-2 shadow-[0_-10px_30px_rgba(1,28,64,0.18)] dark:bg-stone-900 md:max-w-md md:rounded-3xl md:pb-5 md:pt-4 ${
          aboveNav ? 'pb-4' : 'pb-[calc(1.25rem+env(safe-area-inset-bottom))]'
        }`}
      >
        <div
          className="-mx-5 touch-none px-5 md:mx-0 md:touch-auto md:px-0"
          onPointerDown={onGrab}
          onPointerMove={onDrag}
          onPointerUp={onRelease}
          onPointerCancel={onRelease}
        >
        <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-stone-300 dark:bg-stone-700 md:hidden" aria-hidden="true" />
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
        </div>
        {children}
      </div>
    </div>
  );
}
