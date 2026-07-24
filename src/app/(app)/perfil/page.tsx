'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { getSupabase } from '@/lib/supabase';
import { exportAllData } from '@/lib/export';
import { importAllData, type ImportSummary } from '@/lib/import';
import { notificationsSupported, notificationsEnabled, requestNotificationPermission } from '@/lib/notifications';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { User, Download, Upload, LogOut, Bell, BellOff } from 'lucide-react';

export default function PerfilPage() {
  const { user } = useAuth();
  const [exporting, setExporting] = useState(false);
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportSummary | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  async function handleImport(file: File) {
    if (!user) return;
    const confirmed = window.confirm(
      'Esto agregará los datos del CSV a tu cuenta. Si ya tienes meses o cuentas con el mismo nombre, podrías generar duplicados. Úsalo principalmente para restaurar después de perder acceso. ¿Continuar?'
    );
    if (!confirmed) return;

    setImporting(true);
    setImportError(null);
    setImportResult(null);
    try {
      const summary = await importAllData(user.id, file);
      setImportResult(summary);
    } catch {
      setImportError('No se pudo leer el archivo. Verifica que sea un backup exportado desde esta misma app.');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
          <User size={15} className="text-slate-600 dark:text-slate-300" />
        </div>
        <h1 className="text-lg font-semibold text-stone-800 dark:text-stone-100">Perfil</h1>
      </div>

      <Card>
        <CardHeader>
          <p className="text-sm font-semibold text-stone-700 dark:text-stone-200">Cuenta</p>
        </CardHeader>
        <CardBody>
          <p className="text-sm text-stone-600 dark:text-stone-300">{user?.email}</p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <p className="text-sm font-semibold text-stone-700 dark:text-stone-200">Notificaciones</p>
        </CardHeader>
        <CardBody className="flex flex-col gap-3">
          {!notificationsSupported() ? (
            <p className="text-sm text-stone-500 dark:text-stone-400">Tu navegador no soporta notificaciones.</p>
          ) : notifEnabled ? (
            <p className="text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
              <Bell size={15} /> Activadas — te avisaremos un día antes y el mismo día que venza un gasto fijo.
            </p>
          ) : (
            <>
              <p className="text-sm text-stone-500 dark:text-stone-400">
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
          <p className="text-sm font-semibold text-stone-700 dark:text-stone-200">Backup de datos</p>
        </CardHeader>
        <CardBody className="flex flex-col gap-3">
          <p className="text-sm text-stone-500 dark:text-stone-400">
            Descarga toda tu información (ingresos, ahorros, gastos fijos, gastos variables, cuentas y movimientos) en un archivo CSV que puedes abrir con Excel.
          </p>
          <Button onClick={handleExport} disabled={exporting} className="self-start">
            <Download size={15} className="mr-1.5" />
            {exporting ? 'Generando...' : 'Exportar a Excel (CSV)'}
          </Button>

          <div className="border-t border-stone-100 dark:border-stone-800 pt-3 mt-1 flex flex-col gap-2">
            <p className="text-sm text-stone-500 dark:text-stone-400">
              ¿Perdiste acceso o cambiaste de cuenta? Restaura tus datos a partir de un backup CSV exportado desde aquí.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleImport(e.target.files[0])}
            />
            <Button
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="self-start"
            >
              <Upload size={15} className="mr-1.5" />
              {importing ? 'Importando...' : 'Importar backup (CSV)'}
            </Button>
            {importResult && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400">
                Listo: {importResult.months} meses, {importResult.transactions} gastos variables, {importResult.accounts} cuentas y {importResult.movements} movimientos restaurados.
              </p>
            )}
            {importError && <p className="text-xs text-red-500 dark:text-red-400">{importError}</p>}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <button
            onClick={() => getSupabase().auth.signOut()}
            className="flex items-center gap-2 text-sm text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors"
          >
            <LogOut size={15} />
            Cerrar sesión
          </button>
        </CardBody>
      </Card>
    </div>
  );
}
