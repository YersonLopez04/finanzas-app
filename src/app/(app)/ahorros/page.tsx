'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { getAccounts, saveAccount, deleteAccount, getMovements, addMovement, deleteMovement } from '@/lib/db';
import { formatCurrency } from '@/lib/utils';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Sparkline } from '@/components/ui/Sparkline';
import type { Account, AccountMovement, AccountCurrency, AccountType } from '@/types';
import { Plus, Trash2, ChevronDown, ChevronUp, X } from 'lucide-react';

const TYPE_LABELS: Record<AccountType, string> = {
  savings: 'Ahorro',
  cts: 'CTS',
  fund: 'Fondo',
  investment: 'Inversión',
};

const TYPE_OPTIONS = Object.entries(TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }));
const CURRENCY_OPTIONS = [
  { value: 'PEN', label: 'Soles (S/)' },
  { value: 'USD', label: 'Dólares ($)' },
];

function AccountCard({
  account,
  userId,
  onDelete,
  onBalanceChange,
}: {
  account: Account;
  userId: string;
  onDelete: () => void;
  onBalanceChange: (newBalance: number) => void;
}) {
  const [movements, setMovements] = useState<AccountMovement[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [showMovForm, setShowMovForm] = useState(false);
  const [movAmount, setMovAmount] = useState('');
  const [movDesc, setMovDesc] = useState('');
  const [movType, setMovType] = useState<'deposit' | 'withdrawal'>('deposit');
  const [movDate, setMovDate] = useState(new Date().toISOString().split('T')[0]);

  async function loadMovements() {
    const data = await getMovements(userId, account.id);
    setMovements(data);
  }

  async function handleToggle() {
    if (!expanded) await loadMovements();
    setExpanded((p) => !p);
  }

  async function handleAddMovement() {
    if (!movAmount) return;
    const delta = movType === 'deposit' ? Number(movAmount) : -Number(movAmount);
    await addMovement({
      accountId: account.id,
      userId,
      date: movDate,
      amount: delta,
      description: movDesc,
    });
    const newBalance = account.balance + delta;
    await saveAccount(userId, { ...account, balance: newBalance });
    onBalanceChange(newBalance);
    setMovAmount('');
    setMovDesc('');
    setShowMovForm(false);
    await loadMovements();
  }

  async function handleDeleteMovement(id: string, amount: number) {
    await deleteMovement(id);
    const newBalance = account.balance - amount;
    await saveAccount(userId, { ...account, balance: newBalance });
    onBalanceChange(newBalance);
    setMovements((prev) => prev.filter((m) => m.id !== id));
  }

  return (
    <Card>
      <CardBody className="p-0">
        <div className="flex items-center gap-2 px-4 py-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-semibold text-stone-800 truncate">{account.name}</p>
              <span className="text-[10px] bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded-full shrink-0">
                {TYPE_LABELS[account.type]}
              </span>
            </div>
            <p className="text-lg font-bold text-stone-900 leading-tight">
              {formatCurrency(account.balance, account.currency)}
            </p>
            {account.note && <p className="text-xs text-stone-400 leading-tight">{account.note}</p>}
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <button onClick={handleToggle} className="text-stone-400 hover:text-stone-600 transition-colors p-1.5">
              {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>
            <button onClick={onDelete} className="text-stone-300 hover:text-red-400 transition-colors p-1.5">
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {expanded && (
          <div className="border-t border-stone-100 px-5 py-3 flex flex-col gap-3">
            {movements.length >= 2 && (() => {
              const sorted = [...movements].sort((a, b) => a.date.localeCompare(b.date));
              const baseline = account.balance - sorted.reduce((s, m) => s + m.amount, 0);
              const series: number[] = [];
              sorted.forEach((m) => series.push((series[series.length - 1] ?? baseline) + m.amount));
              return (
                <div>
                  <p className="text-xs text-stone-400 mb-1">Evolución del saldo</p>
                  <Sparkline values={series} color={account.currency === 'USD' ? '#10b981' : '#0ea5e9'} />
                </div>
              );
            })()}
            {showMovForm ? (
              <div className="flex flex-col gap-2 bg-stone-50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-semibold text-stone-600">Nuevo movimiento</p>
                  <button onClick={() => setShowMovForm(false)}>
                    <X size={14} className="text-stone-400" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Select
                    value={movType}
                    onChange={(e) => setMovType(e.target.value as 'deposit' | 'withdrawal')}
                    options={[
                      { value: 'deposit', label: 'Ingreso' },
                      { value: 'withdrawal', label: 'Retiro' },
                    ]}
                  />
                  <Input
                    type="date"
                    value={movDate}
                    onChange={(e) => setMovDate(e.target.value)}
                  />
                </div>
                <Input
                  type="number"
                  value={movAmount}
                  onChange={(e) => setMovAmount(e.target.value)}
                  placeholder={`Monto (${account.currency === 'USD' ? '$' : 'S/'})`}
                />
                <Input
                  value={movDesc}
                  onChange={(e) => setMovDesc(e.target.value)}
                  placeholder="Descripción"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddMovement()}
                />
                <Button size="sm" onClick={handleAddMovement} disabled={!movAmount}>
                  Registrar
                </Button>
              </div>
            ) : (
              <Button size="sm" variant="ghost" onClick={() => setShowMovForm(true)} className="self-start">
                <Plus size={13} className="mr-1" /> Movimiento
              </Button>
            )}

            {movements.length === 0 && (
              <p className="text-xs text-stone-400">Sin movimientos registrados.</p>
            )}
            {movements.map((m) => (
              <div key={m.id} className="flex items-center justify-between text-sm">
                <div>
                  <span className="text-stone-400 text-xs mr-2">{m.date}</span>
                  <span className="text-stone-600">{m.description}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={m.amount >= 0 ? 'text-emerald-600 font-medium' : 'text-red-500 font-medium'}>
                    {m.amount >= 0 ? '+' : ''}{formatCurrency(m.amount, account.currency)}
                  </span>
                  <button
                    onClick={() => handleDeleteMovement(m.id, m.amount)}
                    className="text-stone-300 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

const EXCHANGE_RATE_KEY = 'exchange_rate_usd_pen';
const DEFAULT_EXCHANGE_RATE = 3.75;

export default function AhorrosPage() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [exchangeRate, setExchangeRate] = useState(DEFAULT_EXCHANGE_RATE);

  // form
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState<AccountCurrency>('PEN');
  const [type, setType] = useState<AccountType>('savings');
  const [balance, setBalance] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    getAccounts(user.id).then((data) => {
      setAccounts(data);
      setLoading(false);
    });
    const stored = localStorage.getItem(EXCHANGE_RATE_KEY);
    if (stored) setExchangeRate(Number(stored));
  }, [user]);

  function handleRateChange(value: string) {
    const rate = Number(value) || 0;
    setExchangeRate(rate);
    localStorage.setItem(EXCHANGE_RATE_KEY, String(rate));
  }

  async function handleAdd() {
    if (!user || !name) return;
    setSaving(true);
    await saveAccount(user.id, {
      userId: user.id,
      name,
      currency,
      type,
      balance: Number(balance),
      note,
      order: accounts.length,
    });
    const updated = await getAccounts(user.id);
    setAccounts(updated);
    setName('');
    setBalance('');
    setNote('');
    setSaving(false);
    setShowForm(false);
  }

  async function handleDelete(accountId: string) {
    if (!user) return;
    await deleteAccount(user.id, accountId);
    setAccounts((prev) => prev.filter((a) => a.id !== accountId));
  }

  function handleBalanceChange(accountId: string, newBalance: number) {
    setAccounts((prev) =>
      prev.map((a) => (a.id === accountId ? { ...a, balance: newBalance } : a))
    );
  }

  const totalPEN = accounts
    .filter((a) => a.currency === 'PEN')
    .reduce((s, a) => s + a.balance, 0);
  const totalUSD = accounts
    .filter((a) => a.currency === 'USD')
    .reduce((s, a) => s + a.balance, 0);
  const netWorthPEN = totalPEN + totalUSD * exchangeRate;

  const byType = TYPE_OPTIONS.map(({ value, label }) => ({
    type: value as AccountType,
    label,
    total: accounts
      .filter((a) => a.type === value)
      .reduce((s, a) => s + (a.currency === 'USD' ? a.balance * exchangeRate : a.balance), 0),
  })).filter((t) => t.total > 0);

  if (loading) return <div className="text-stone-400 text-sm mt-8 text-center">Cargando...</div>;

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-stone-800">Ahorros y Cuentas</h1>
      </div>

      {/* Patrimonio consolidado */}
      {accounts.length > 0 && (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-800 via-slate-800 to-slate-700 px-6 py-7 text-white">
          <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full bg-white/5" />
          <div className="flex items-center justify-between relative">
            <p className="text-xs text-slate-300">Patrimonio total (en soles)</p>
            <div className="flex items-center gap-1.5 text-xs text-slate-300">
              <span>Tipo de cambio</span>
              <input
                type="number"
                step="0.01"
                value={exchangeRate || ''}
                onChange={(e) => handleRateChange(e.target.value)}
                className="w-16 bg-white/10 rounded-md px-1.5 py-0.5 text-white text-center focus:outline-none focus:ring-1 focus:ring-white/30"
              />
            </div>
          </div>
          <p className="text-4xl font-bold mt-1.5 relative">{formatCurrency(netWorthPEN, 'PEN')}</p>

          {byType.length > 0 && (
            <div className="flex flex-wrap gap-4 mt-5 relative text-sm">
              {byType.map(({ type: t, label, total }) => (
                <div key={t} className="flex items-center gap-1.5">
                  <span className="text-slate-300">{label}</span>
                  <span className="font-medium">{formatCurrency(total, 'PEN')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Totales por moneda */}
      {accounts.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardBody className="py-3.5">
              <p className="text-xs text-stone-400 mb-1">Total en Soles</p>
              <p className="text-lg font-bold text-stone-800">{formatCurrency(totalPEN, 'PEN')}</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="py-3.5">
              <p className="text-xs text-stone-400 mb-1">Total en Dólares</p>
              <p className="text-lg font-bold text-stone-800">{formatCurrency(totalUSD, 'USD')}</p>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Formulario nueva cuenta */}
      {showForm ? (
        <Card>
          <CardHeader className="flex items-center justify-between">
            <p className="text-sm font-semibold text-stone-700">Nueva cuenta</p>
            <button onClick={() => setShowForm(false)}>
              <X size={16} className="text-stone-400" />
            </button>
          </CardHeader>
          <CardBody className="flex flex-col gap-3">
            <Input
              label="Nombre"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ej. Pichincha, CTS BCP..."
            />
            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Tipo"
                value={type}
                onChange={(e) => setType(e.target.value as AccountType)}
                options={TYPE_OPTIONS}
              />
              <Select
                label="Moneda"
                value={currency}
                onChange={(e) => setCurrency(e.target.value as AccountCurrency)}
                options={CURRENCY_OPTIONS}
              />
            </div>
            <Input
              label="Saldo actual"
              type="number"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              placeholder="0.00"
            />
            <Input
              label="Nota (opcional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="ej. fondo para mamá"
            />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAdd} disabled={saving || !name}>
                {saving ? 'Guardando...' : 'Crear cuenta'}
              </Button>
            </div>
          </CardBody>
        </Card>
      ) : (
        <Button onClick={() => setShowForm(true)} className="self-start">
          <Plus size={15} className="mr-1.5" /> Nueva cuenta
        </Button>
      )}

      {/* Lista de cuentas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {accounts.length === 0 && (
          <p className="text-sm text-stone-400">Sin cuentas registradas. Agrega una.</p>
        )}
        {accounts.map((account) => (
          <AccountCard
            key={account.id}
            account={account}
            userId={user!.id}
            onDelete={() => handleDelete(account.id)}
            onBalanceChange={(bal) => handleBalanceChange(account.id, bal)}
          />
        ))}
      </div>
    </div>
  );
}
