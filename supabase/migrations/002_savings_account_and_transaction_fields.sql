-- Ejecutar en Supabase → SQL Editor (una sola vez)
alter table savings_allocations add column if not exists account_id uuid references accounts(id) on delete set null;
alter table transactions add column if not exists payment_method text;
alter table transactions add column if not exists shared boolean not null default false;
alter table transactions add column if not exists reimbursed_amount numeric not null default 0;
