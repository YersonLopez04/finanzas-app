-- ════════════════════════════════════════════════════════════════════════════
-- Esquema de base de datos: Finanzas Personales
-- Ejecutar en Supabase → SQL Editor
-- ════════════════════════════════════════════════════════════════════════════

-- ── Meses ─────────────────────────────────────────────────────────────────────
-- Un registro por mes/usuario con los datos de ingresos.
create table months (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null, -- formato "2024-06"
  income_fixed numeric not null default 0,
  income_variable numeric not null default 0,
  income_extras numeric not null default 0,
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

-- ── Cuentas de ahorro ────────────────────────────────────────────────────────────
create table accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  currency text not null default 'PEN' check (currency in ('PEN', 'USD')),
  type text not null default 'savings' check (type in ('savings', 'cts', 'fund', 'investment')),
  balance numeric not null default 0,
  note text,
  order_index integer not null default 0,
  created_at timestamptz not null default now()
);

-- ── Asignaciones de ahorro/inversión por mes ────────────────────────────────────
create table savings_allocations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month_id text not null,
  name text not null default '',
  amount numeric not null default 0,
  account_id uuid references accounts(id) on delete set null,
  order_index integer not null default 0,
  foreign key (user_id, month_id) references months(user_id, id) on delete cascade
);

-- ── Gastos fijos por mes ─────────────────────────────────────────────────────────
create table fixed_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month_id text not null,
  name text not null default '',
  amount numeric not null default 0,
  paid boolean not null default false,
  paid_date date,
  due_day smallint, -- día del mes en que vence (1-31), opcional
  order_index integer not null default 0,
  foreign key (user_id, month_id) references months(user_id, id) on delete cascade
);

-- ── Gastos variables (transacciones) ────────────────────────────────────────────
create table transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month_id text not null,
  date date not null,
  amount numeric not null default 0,
  category text not null default 'Otros',
  description text not null default '',
  payment_method text, -- 'efectivo' | 'yape' | 'tarjeta', opcional
  shared boolean not null default false,
  reimbursed_amount numeric not null default 0,
  created_at timestamptz not null default now()
);

-- ── Movimientos de cuentas ───────────────────────────────────────────────────────
create table account_movements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references accounts(id) on delete cascade,
  date date not null,
  amount numeric not null default 0, -- positivo = ingreso, negativo = retiro
  description text not null default '',
  created_at timestamptz not null default now()
);

-- ── Índices ──────────────────────────────────────────────────────────────────────
create index idx_transactions_user_month on transactions(user_id, month_id);
create index idx_movements_account on account_movements(account_id);
create index idx_savings_month on savings_allocations(user_id, month_id);
create index idx_fixed_month on fixed_expenses(user_id, month_id);

-- ════════════════════════════════════════════════════════════════════════════
-- Row Level Security: cada usuario solo ve y edita sus propios datos
-- ════════════════════════════════════════════════════════════════════════════

alter table months enable row level security;
alter table savings_allocations enable row level security;
alter table fixed_expenses enable row level security;
alter table transactions enable row level security;
alter table accounts enable row level security;
alter table account_movements enable row level security;

create policy "own months" on months
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own savings_allocations" on savings_allocations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own fixed_expenses" on fixed_expenses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own transactions" on transactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own accounts" on accounts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own account_movements" on account_movements
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
