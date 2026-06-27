'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { getSupabase } from '@/lib/supabase';
import { exportAllData } from '@/lib/export';
import { notificationsSupported, notificationsEnabled, requestNotificationPermission } from '@/lib/notifications';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { User, Download, LogOut, Bell, BellOff } from 'lucide-react';

export default function PerfilPage() {
  const { user } = useAuth();
  const [exporting, setExporting] = useState(false);
  const [notifEnabled, setNotifEnabled] = useState(false);

  useEffect(() => {
    setNotifEnabled(notificationsEnabled());
  }, []);

  async function handleEnableNotifications() {
    const granted = await requestNotificationPermission();
    setNotifEnabled(granted);
  }

  async function handleExport() {
    if (!user) return;
    setExporting(true);
    try {
      await exportAllData(user.id);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
          <User size={15} className="text-slate-600" />
        </div>
        <h1 className="text-lg font-semibold text-stone-800">Perfil</h1>
      </div>

      <Card>
        <CardHeader>
          <p className="text-sm font-semibold text-stone-700">Cuenta</p>
        </CardHeader>
        <CardBody>
          <p className="text-sm text-stone-600">{user?.email}</p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <p className="text-sm font-semibold text-stone-700">Notificaciones</p>
        </CardHeader>
        <CardBody className="flex flex-col gap-3">
          {!notificationsSupported() ? (
            <p className="text-sm text-stone-500">Tu navegador no soporta notificaciones.</p>
          ) : notifEnabled ? (
            <p className="text-sm text-emerald-600 flex items-center gap-2">
              <Bell size={15} /> Activadas — te avisaremos un día antes y el mismo día que venza un gasto fijo.
            </p>
          ) : (
            <>
              <p className="text-sm text-stone-500">
                Recibe un aviso 1 día antes y el mismo día en que venza un gasto fijo (necesitas definir el &quot;día de pago&quot; en cada gasto, desde Gastos Fijos).
              </p>
              <Button onClick={handleEnableNotifications} className="self-start">
                <BellOff size={15} className="mr-1.5" /> Activar notificaciones
              </Button>
            </>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <p className="text-sm font-semibold text-stone-700">Backup de datos</p>
        </CardHeader>
        <CardBody className="flex flex-col gap-3">
          <p className="text-sm text-stone-500">
            Descarga toda tu información (ingresos, ahorros, gastos fijos, gastos variables, cuentas y movimientos) en un archivo CSV que puedes abrir con Excel.
          </p>
          <Button onClick={handleExport} disabled={exporting} className="self-start">
            <Download size={15} className="mr-1.5" />
            {exporting ? 'Generando...' : 'Exportar a Excel (CSV)'}
          </Button>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <button
            onClick={() => getSupabase().auth.signOut()}
            className="flex items-center gap-2 text-sm text-red-500 hover:text-red-600 transition-colors"
          >
            <LogOut size={15} />
            Cerrar sesión
          </button>
        </CardBody>
      </Card>
    </div>
  );
}
