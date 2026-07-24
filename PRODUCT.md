# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Yerson y su círculo cercano (familia/pareja). Cada persona lleva sus propias finanzas por separado dentro de la app (cuentas individuales vía Supabase Auth), no un presupuesto compartido.

## Product Purpose

Reemplaza una rutina mensual de control de finanzas personales que antes se llevaba en Excel: ingresos, ahorros, gastos fijos y variables, cuentas de ahorro/CTS/fondos en soles y dólares. Éxito = cerrar el mes sabiendo exactamente cuánto queda disponible y no olvidar ningún pago fijo.

## Positioning

Tres cosas que una hoja de Excel o una app genérica de finanzas (Fintonic, Money Manager, etc.) no dan juntas:
- Experiencia hecha a medida de la rutina mensual real del usuario, no un framework genérico de categorías.
- Todo el patrimonio (ahorro, CTS, fondos, inversión, en PEN y USD) consolidado en un solo número.
- Fricción mínima para registrar un gasto variable (segundos, no formularios largos).

## Operating Context

- Rutina mensual: definir ingresos del mes, asignar ahorros, revisar/pagar gastos fijos (con alertas de día de vencimiento), registrar gastos variables según ocurren, cerrar el mes.
- Uso mixto mobile/desktop: mobile es el uso principal día a día (registro rápido de gastos vía FAB), desktop para revisión con Sidebar.
- Backup manual vía export/import CSV, pensado para migrar de cuenta o recuperar acceso.

## Capabilities and Constraints

- Stack: Next.js 16 (App Router, Turbopack) + TypeScript + Tailwind CSS v4 + Supabase (Postgres + Auth vía @supabase/ssr).
- Sin librería de animación (Framer Motion, etc.) — toda la motion es CSS/Tailwind puro.
- Multi-moneda (PEN/USD) con tipo de cambio manual guardado en localStorage.
- Notificaciones vía Web Notifications API (opt-in), no push server-side.
- Sin equipo de diseño — decisiones visuales las toma el usuario junto con el agente.

## Brand Commitments

Nombre del producto: "Finanzas" (uso personal). Sin identidad de marca externa ni assets de marketing — no es un producto que se vende, es una herramienta personal.

## Evidence on Hand

Ninguna evidencia externa (testimonios, casos de estudio, prensa) — no aplica, uso personal/círculo cercano.

## Product Principles

1. La rutina mensual del usuario manda sobre convenciones genéricas de apps de finanzas.
2. Registrar un gasto variable debe sentirse instantáneo — cualquier fricción ahí es el peor pecado de UX del producto.
3. El patrimonio consolidado (multi-cuenta, multi-moneda) es el número que más le importa ver al usuario.
4. Sin restricciones visuales previas — el usuario dio libertad total para proponer una nueva dirección de diseño.

## Accessibility & Inclusion

Sin requisito de accesibilidad específico establecido por el usuario más allá de buenas prácticas estándar (contraste, `prefers-reduced-motion`, soporte táctil en mobile).
