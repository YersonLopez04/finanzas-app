'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { User } from 'lucide-react';

export function MobileTopBar() {
  const pathname = usePathname();
  const active = pathname.startsWith('/perfil');

  return (
    <div className="flex md:hidden items-center justify-between px-4 py-3 bg-white border-b border-stone-100 sticky top-0 z-40">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-lg bg-slate-800 flex items-center justify-center text-white text-xs font-bold">F</div>
        <p className="text-sm font-semibold text-stone-800">Finanzas</p>
      </div>
      <Link
        href="/perfil"
        className={`p-1.5 rounded-full transition-colors ${active ? 'bg-slate-100 text-slate-800' : 'text-stone-400'}`}
      >
        <User size={18} />
      </Link>
    </div>
  );
}
