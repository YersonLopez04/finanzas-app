'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { User } from 'lucide-react';

export function MobileTopBar() {
  const pathname = usePathname();
  const active = pathname.startsWith('/perfil');

  return (
    <div className="flex md:hidden items-center justify-between px-4 py-3 bg-white/70 dark:bg-stone-950/60 backdrop-blur-xl backdrop-saturate-150 border-b border-stone-200/60 dark:border-white/10 sticky top-0 z-40">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-lg bg-slate-800 flex items-center justify-center text-white text-xs font-bold">F</div>
        <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">Finanzas</p>
      </div>
      <Link
        href="/perfil"
        aria-label="Perfil"
        className={`p-2 rounded-full transition-colors ${active ? 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100' : 'text-stone-500 dark:text-stone-400'}`}
      >
        <User size={18} />
      </Link>
    </div>
  );
}
