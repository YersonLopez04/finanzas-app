'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Receipt, List, PiggyBank, History, User, LogOut } from 'lucide-react';
import { getSupabase } from '@/lib/supabase';

const nav = [
  { href: '/dashboard', label: 'Resumen', icon: LayoutDashboard },
  { href: '/gastos-fijos', label: 'Gastos Fijos', icon: List },
  { href: '/gastos-variables', label: 'Gastos Variables', icon: Receipt },
  { href: '/ahorros', label: 'Ahorros', icon: PiggyBank },
  { href: '/historial', label: 'Historial', icon: History },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 shrink-0 min-h-screen bg-white border-r border-stone-100 flex flex-col">
      <div className="px-6 py-6 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-white text-sm font-bold">F</div>
        <div>
          <p className="text-base font-semibold text-stone-800 leading-tight">Finanzas</p>
          <p className="text-xs text-stone-400">uso personal</p>
        </div>
      </div>
      <nav className="flex-1 px-3 py-2 flex flex-col gap-1">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all ${
                active
                  ? 'bg-slate-800 text-white font-medium shadow-sm shadow-slate-800/20'
                  : 'text-stone-500 hover:bg-stone-50 hover:text-stone-800'
              }`}
            >
              <Icon size={17} strokeWidth={active ? 2.2 : 1.8} />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="px-3 py-5 flex flex-col gap-1">
        <Link
          href="/perfil"
          className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all ${
            pathname.startsWith('/perfil')
              ? 'bg-slate-800 text-white font-medium shadow-sm shadow-slate-800/20'
              : 'text-stone-500 hover:bg-stone-50 hover:text-stone-800'
          }`}
        >
          <User size={17} />
          Perfil
        </Link>
        <button
          onClick={() => getSupabase().auth.signOut()}
          className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm text-stone-400 hover:text-stone-700 hover:bg-stone-50 w-full transition-colors"
        >
          <LogOut size={17} />
          Salir
        </button>
      </div>
    </aside>
  );
}
