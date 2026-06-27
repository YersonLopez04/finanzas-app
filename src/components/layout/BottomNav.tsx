'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Receipt, List, PiggyBank, Plus } from 'lucide-react';

const leftNav = [
  { href: '/dashboard', label: 'Resumen', icon: LayoutDashboard },
  { href: '/gastos-fijos', label: 'Fijos', icon: List },
];

const rightNav = [
  { href: '/gastos-variables', label: 'Variables', icon: Receipt },
  { href: '/ahorros', label: 'Ahorros', icon: PiggyBank },
];

function NavLink({ href, label, icon: Icon, active }: { href: string; label: string; icon: typeof LayoutDashboard; active: boolean }) {
  return (
    <Link
      href={href}
      className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-[11px] transition-colors ${
        active ? 'text-slate-800 font-semibold' : 'text-stone-400'
      }`}
    >
      <div className={`rounded-full p-1.5 transition-colors ${active ? 'bg-slate-100' : ''}`}>
        <Icon size={19} strokeWidth={active ? 2.3 : 1.8} />
      </div>
      {label}
    </Link>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-100 flex items-center md:hidden z-50 shadow-[0_-4px_16px_rgba(41,37,36,0.04)]">
      {leftNav.map((item) => (
        <NavLink key={item.href} {...item} active={pathname.startsWith(item.href)} />
      ))}
      <div className="flex-1 flex justify-center">
        <Link
          href="/gastos-variables?quick=1"
          className="-translate-y-4 bg-slate-800 text-white rounded-full p-3.5 shadow-lg shadow-slate-800/30 active:scale-95 transition-transform"
        >
          <Plus size={22} strokeWidth={2.5} />
        </Link>
      </div>
      {rightNav.map((item) => (
        <NavLink key={item.href} {...item} active={pathname.startsWith(item.href)} />
      ))}
    </nav>
  );
}
