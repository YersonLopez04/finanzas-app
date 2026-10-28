'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Sidebar } from '@/components/layout/Sidebar';
import { BottomNav } from '@/components/layout/BottomNav';
import { MobileTopBar } from '@/components/layout/MobileTopBar';
import { ErrorToast } from '@/components/ui/ErrorToast';
import { UndoToast } from '@/components/ui/UndoToast';
import { CycleNotice } from '@/components/layout/CycleNotice';
import { CycleProvider } from '@/lib/cycle-context';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  if (loading || !user) return null;

  return (
    <div className="flex min-h-screen">
      {/* Sidebar — solo desktop */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col min-w-0">
        <MobileTopBar />
        <CycleProvider userId={user.id}>
          {(version) => (
            <main key={version} className="flex-1 p-4 md:p-6 pb-24 md:pb-6 overflow-auto">
              <CycleNotice />
              {children}
            </main>
          )}
        </CycleProvider>
      </div>

      {/* Bottom nav — solo mobile */}
      <BottomNav />
      <ErrorToast />
      <UndoToast />
    </div>
  );
}
