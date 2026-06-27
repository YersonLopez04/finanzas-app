-- Ejecutar en Supabase → SQL Editor (una sola vez)
alter table fixed_expenses add column if not exists due_day smallint;
