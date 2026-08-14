-- ════════════════════════════════════════════════════════════════════════════
-- Seguimiento de gastos fijos tipo presupuesto (ej. gasolina: S/200 que se
-- gasta gradualmente durante el mes en vez de pagarse de una sola vez).
-- Ejecutar en Supabase → SQL Editor
-- ════════════════════════════════════════════════════════════════════════════

alter table fixed_expenses add column if not exists tracked boolean not null default false;

create table if not exists fixed_expense_entries (
  id uuid primary key default gen_random_uuid(),
  fixed_expense_id uuid not null references fixed_expenses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  amount numeric not null default 0,
  note text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists idx_fixed_expense_entries_expense on fixed_expense_entries(fixed_expense_id);

alter table fixed_expense_entries enable row level security;

create policy "own fixed_expense_entries" on fixed_expense_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
