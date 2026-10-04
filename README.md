# PresuCart

PresuCart es una PWA móvil para controlar el presupuesto durante compras de supermercado. La Fase 1 deja la base técnica lista: Next.js, TypeScript, Tailwind, Supabase, utilidades de dominio y pruebas críticas.

## Stack

- Next.js + React + TypeScript
- Tailwind CSS para UI mobile-first
- Supabase para autenticación y PostgreSQL
- Vitest para pruebas de cálculo y parsing

## Configuración local

```bash
npm install
cp .env.example .env.local
npm run dev
```

Variables esperadas:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-clave-anonima
```

Las pruebas de dominio no requieren claves reales de Supabase.

## Aplicar esquema de Supabase

1. Crear un proyecto en Supabase.
2. Copiar las variables públicas en `.env.local`.
3. Aplicar `supabase/migrations/20260101000000_initial_schema.sql` desde el SQL editor de Supabase o con Supabase CLI si está configurado.
4. Verificar que RLS quede activo en `profiles`, `stores`, `products`, `purchases` y `purchase_items`.

El esquema usa UUID, `timestamptz`, montos enteros en colones y `purchase_items.subtotal_amount` generado como `unit_price_amount * quantity`.

## Comandos de verificación

```bash
npm install
npm run test
npm run build
```

## Fase 1 implementada

- Landing page en español con orientación a los siguientes flujos.
- Manifest PWA básico e ícono SVG.
- Utilidades CRC para formatear/parsear montos enteros.
- Cálculos de presupuesto, disponible, porcentaje y alertas.
- Extracción de candidatos de precio desde texto OCR.
- Esquema Supabase inicial para perfiles, tiendas, productos, compras e ítems.
