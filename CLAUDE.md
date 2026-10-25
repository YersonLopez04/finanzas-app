@AGENTS.md

# Finanzas — estado vivo del proyecto

App personal de finanzas de Yerson (y quizá su círculo cercano) que reemplaza su rutina mensual en Excel. Propósito, usuarios y principios de producto: ver [PRODUCT.md](PRODUCT.md). Este archivo guarda lo que cambia: qué está desplegado, decisiones tomadas y pendientes. **Actualizarlo después de cada hito**, no al final.

## Stack y dónde vive

- Next.js 16 (App Router) + TypeScript + Tailwind v4 + Supabase (Postgres + Auth con `@supabase/ssr`). Sin librería de animación: todo es CSS.
- Producción: https://finanzas-app-chi-five.vercel.app — Vercel despliega solo al hacer push a `main`.
- Repo: `YersonLopez04/finanzas-app`. **Push**: el llavero de macOS tiene otra cuenta cacheada; usar `git -c credential.helper= push` desde la terminal del dueño.
- Google Cloud `finanzas-app-512605`: solo sirve para el login con Google. **Sin facturación** a propósito (desvinculada el 2026-10-24) para que nunca cobre. No volver a vincularla sin preguntar.
- `.github/workflows/supabase-keepalive.yml` consulta la base cada 3 días para que el plan gratuito no la pause.

## Mapa del código

- `src/lib/db.ts` — **única** capa de datos. Todo acceso a Supabase pasa por aquí.
- `src/lib/totals.ts` — **única** fuente de los cálculos de dinero (restante, totales, "Te deben").
- `src/components/ui/ErrorToast.tsx` — aviso global de errores (`reportError`) y pantalla de carga fallida (`LoadError`).
- `src/components/ui/UndoToast.tsx` — aviso "Deshacer" de los borrados (`showUndo`).
- `src/lib/due.ts` — **única** regla de vencimiento de gastos fijos (`dueStatus`: venció, hoy, mañana…). La usan Resumen y Gastos fijos.
- `src/components/ui/Sheet.tsx` — hoja inferior (teléfono) / ventana centrada (escritorio). `Switch.tsx` y `AmountInput.tsx` son sus piezas.
- `src/lib/quickAdd.ts` — eventos entre el + de la barra y la hoja de registro rápido (el + se vuelve × y la cierra).
- `src/app/(app)/*` — pantallas: dashboard (Resumen), gastos-fijos, gastos-variables, ahorros, historial, perfil.
- `src/lib/export.ts` / `import.ts` — respaldo CSV.
- `supabase/schema.sql` — esquema completo para una base nueva; `supabase/migrations/` — cambios incrementales.

## Migraciones de Supabase

Se ejecutan a mano en Supabase → SQL Editor. Claude no tiene acceso a la base.

| Migración | Estado |
|---|---|
| 001–004 | Ejecutadas |
| 005_transaction_my_share | **Pendiente.** Ejecutar ANTES de subir los commits que la usan, o guardar gastos variables falla |

Al agregar una columna: migración nueva + actualizar `schema.sql` + tipos + `db.ts` + respaldo CSV (export e import, aceptando backups viejos sin la columna).

## Reglas de datos (no romper)

- **Supabase no lanza excepciones, devuelve `{ error }`.** Toda llamada en `db.ts` pasa por `check()`, que lanza `DataError`. Las pantallas atrapan con `reportError(err)` y resetean su estado de carga en `finally`.
- **Una carga fallida nunca muestra un formulario vacío**: se muestra `LoadError`. Un formulario vacío, al guardarse, pisa los datos reales.
- **Guardar listas = upsert por id primero, borrar las filas quitadas después.** Nunca borrar todo y reinsertar: un fallo en medio deja el mes vacío y rompe llaves foráneas.
- **Cada pantalla guarda solo lo que edita.** Resumen manda `fixedExpenses: undefined`; Gastos fijos manda `savings: undefined`. Reenviar copias viejas pisa cambios.
- **Borrar siempre con deshacer** (`showUndo`): la vista quita el elemento al instante y el borrado real (`onCommit`) espera 5 s. Excepción: los movimientos de cuenta se borran al instante y deshacer los vuelve a registrar, porque también mueven el saldo. Si se cierra la app dentro de esos 5 s, el borrado no ocurre (lado seguro).
- **Gastos fijos se guardan solos**: cada cambio manda la lista completa en una fila de guardados (`queueSave`), para que uno viejo nunca pise a uno nuevo. Un gasto borrado sigue enviándose hasta que vence el deshacer: si no, otro guardado lo borraría antes y se perderían sus cargas (se borran en cascada).
- **Ids estables** (`crypto.randomUUID()`), nunca la posición en un arreglo.
- **Ahorros vinculados a cuentas**: Resumen aplica a la cuenta solo la diferencia contra lo último guardado. Primero se guarda el mes y luego los saldos (al revés, reintentar sumaba dos veces).

## Decisiones del dueño

- **Gasto compartido** (2026-10-24): cuesta `monto − lo que ya me devolvieron`. Lo que aún me deben sigue contando como gasto hasta que me lo paguen. "Te deben" = `monto − mi parte − lo que ya me pagaron`. Sin "mi parte" (gastos antiguos) se asume que te deben todo.
- **Gastos fijos y registro rápido, opción B** (2026-10-25, muestra en `.impeccable/mocks/fijos-y-registro.html`): fijos en secciones Por pagar · Presupuestos · Pagados, sin botón Guardar, editar en hoja. Registro rápido: monto y categoría a la vista; fecha (Hoy), método, nota y compartido plegados en una fila. La categoría empieza sin elegir a propósito.
- Cambios visuales: primero una muestra HTML con modo día y noche a 375 px, aprobada por el dueño; recién después se toca la app.

## Cómo probar

- `npm run dev` usa la cuenta real (`.env.local`). Los flujos que escriben datos los prueba el dueño con su cuenta.
- **Modo demo** (sin Supabase, datos en memoria): `NEXT_PUBLIC_SUPABASE_URL= npm run dev -- -p 3001` (en esta máquina también está como `finanzas-demo` en `.claude/launch.json`, que no se versiona). Los datos se pierden al recargar la página.
- `npx tsc --noEmit` y `npx next build` antes de cada commit. `npx eslint src` tiene 5 errores `react-hooks/set-state-in-effect` que ya existían; no agregar nuevos.
- No hay tests en el repo. La lógica de `totals.ts` se probó con scripts sueltos.

## Despliegue

Claude hace commits pero **no** sube ni despliega. El dueño corre el push; si hay migración, la ejecuta antes. Después, revisar producción.

## Pendientes (en orden)

1. Ejecutar la migración 005 y subir los commits locales.
2. Cabeceras de seguridad en `next.config.ts` (CSP primero en Report-Only), sobre todo si la usan amigos.
3. Tests de `totals.ts` dentro del repo.
4. Diferido: recordatorios por correo de gastos fijos ("no es crítico").
