'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getCycleStarts, startCycle } from './db';
import { currentCycleId, cycleBounds, pendingCycle, type CycleBounds, type CycleStarts, type PendingCycle } from './cycle';
import { todayISO } from './utils';
import { LoadError } from '@/components/ui/ErrorToast';

interface CycleValue {
  currentMonthId: string;
  boundsOf: (monthId: string) => CycleBounds;
  pending: PendingCycle | null;
  // Confirma el día real de cobro con el que empieza el ciclo pendiente.
  confirmStart: (startDate: string) => Promise<void>;
}

const CycleContext = createContext<CycleValue | null>(null);

export function useCycle() {
  const value = useContext(CycleContext);
  if (!value) throw new Error('useCycle debe usarse dentro de CycleProvider');
  return value;
}

// Carga los inicios de ciclo una vez y los reparte. Las pantallas no se pintan
// hasta tenerlos: todas arrancan en el ciclo vigente, no en el mes calendario.
// Al confirmar un ciclo nuevo se vuelve a montar el contenido (`key`) para que
// cada pantalla arranque de nuevo en él.
export function CycleProvider({ userId, children }: { userId: string; children: (version: number) => React.ReactNode }) {
  const [starts, setStarts] = useState<CycleStarts | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [today, setToday] = useState(todayISO());
  const [version, setVersion] = useState(0);

  useEffect(() => {
    getCycleStarts(userId).then(setStarts).catch(setLoadError);
  }, [userId]);

  // Si la app queda abierta de un día para otro, el ciclo se recalcula al volver.
  useEffect(() => {
    const onVisible = () => document.visibilityState === 'visible' && setToday(todayISO());
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  const confirmStart = useCallback(
    async (startDate: string) => {
      if (!starts) return;
      const pending = pendingCycle(starts, todayISO());
      if (!pending) return;
      await startCycle(userId, pending.monthId, startDate, pending.previousMonthId);
      setStarts({ ...starts, [pending.monthId]: startDate });
      setVersion((v) => v + 1);
    },
    [userId, starts]
  );

  const value = useMemo<CycleValue | null>(() => {
    if (!starts) return null;
    return {
      currentMonthId: currentCycleId(starts, today),
      boundsOf: (monthId) => cycleBounds(monthId, starts, today),
      pending: pendingCycle(starts, today),
      confirmStart,
    };
  }, [starts, today, confirmStart]);

  if (loadError) return <LoadError error={loadError} />;
  if (!value) return null;
  return <CycleContext.Provider value={value}>{children(version)}</CycleContext.Provider>;
}
