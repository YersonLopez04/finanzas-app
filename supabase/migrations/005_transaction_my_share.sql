-- Ejecutar en Supabase → SQL Editor (una sola vez), ANTES de desplegar la app.
-- Mi parte de un gasto compartido. null = no indicada (gastos anteriores):
-- en ese caso se asume que te deben el monto completo, como hasta ahora.
alter table transactions add column if not exists my_share numeric;
