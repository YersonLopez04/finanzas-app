-- Ejecutar en Supabase → SQL Editor (una sola vez), ANTES de desplegar la app.
-- Fecha real en que empieza el ciclo de cada mes (el día de cobro, ajustado).
-- El ciclo "2026-11" empieza el día que cobraste en octubre y dura hasta el día
-- anterior al siguiente cobro. null = mes calendario (meses anteriores a esta
-- migración): la app los sigue tratando como del 1 al último día.
alter table months add column if not exists start_date date;
