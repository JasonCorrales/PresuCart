# PresuCart

PresuCart es una PWA móvil en español para controlar el presupuesto durante compras de supermercado en colones costarricenses (CRC). La Fase 4 agrega captura de precios con cámara y OCR local dentro de la compra activa sin perder la entrada manual.

## Stack

- Next.js + React + TypeScript
- Tailwind CSS para UI mobile-first
- Supabase para autenticación y PostgreSQL
- Tesseract.js para OCR local en el navegador
- Vitest para pruebas de cálculo y parsing

## Configuración local

```bash
npm install
npm run dev
```

Variables esperadas en `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-clave-anonima
```

Si faltan variables, la app no debe romper el build: las pantallas muestran una guía en español para configurar Supabase. Las pruebas de dominio no requieren claves reales.

## Aplicar esquema de Supabase

1. Crear un proyecto en Supabase.
2. Copiar las variables públicas en `.env.local`.
3. Activar Supabase Auth con correo y contraseña en el dashboard.
4. Aplicar `supabase/migrations/20260101000000_initial_schema.sql` desde el SQL editor de Supabase o con Supabase CLI si está configurado.
5. Verificar que RLS quede activo en `profiles`, `stores`, `products`, `purchases` y `purchase_items`.

El esquema usa UUID, `timestamptz`, montos enteros en colones y `purchase_items.subtotal_amount` generado como `unit_price_amount * quantity`.

## Uso de Fase 4

1. Abrir `/auth` y crear cuenta o iniciar sesión con correo y contraseña.
2. Ir a `/purchases/new`, ingresar un presupuesto CRC positivo y, opcionalmente, el nombre del supermercado.
3. La app crea la compra con `owner_id` del usuario autenticado y redirige a `/purchases/[id]`.
4. En la compra activa, el monto disponible queda destacado como dato principal.
5. Ingresar precio unitario manualmente y ajustar cantidad con los botones grandes `−` / `+` o con el campo numérico.
6. Opcionalmente tocar `Escanear precio`, permitir cámara, capturar una etiqueta y esperar `Procesando...` mientras Tesseract.js lee la imagen en el navegador.
7. Si aparecen candidatos, tocar un botón de precio para llenar el campo manual; la app nunca agrega ítems automáticamente desde OCR.
8. Si no hay candidatos o la cámara falla, mantener la entrada manual visible y escribir el precio.
9. Después de agregar, usar `DESHACER` durante unos segundos si el ítem fue registrado por error.
10. Editar un ítem existente para corregir precio unitario o cantidad sin salir de la pantalla.
11. Borrar ítems si se ingresaron por error.

La captura de cámara se usa solo como imagen temporal para OCR local: no se guarda en la base de datos, no se sube a Supabase y no se envía a servidores de PresuCart.

Los totales visibles se recalculan en el cliente desde los ítems usando utilidades de dominio; no se confía únicamente en el total almacenado.

## Verificación manual recomendada

Con Supabase configurado:

1. Crear una cuenta nueva desde `/auth`.
2. Confirmar correo si tu proyecto Supabase lo exige.
3. Crear una compra con presupuesto `75000` y supermercado opcional.
4. Agregar `2500 × 2` usando el botón `+` y confirmar que gastado sea `₡5.000` y disponible `₡70.000`.
5. Agregar otro ítem y presionar `DESHACER`; confirmar que desaparece y que los totales vuelven al valor anterior.
6. Tocar `Escanear precio`, permitir cámara, capturar una etiqueta con un precio claro y confirmar que aparecen candidatos en CRC.
7. Seleccionar un candidato y verificar que solo llena `Precio unitario CRC`; ajustar cantidad y presionar `Agregar al carrito` manualmente.
8. Probar una captura borrosa o sin precio y confirmar que muestra el mensaje de fallback sin ocultar la entrada manual.
9. Cerrar la cámara y confirmar que el indicador del navegador deja de usarla.
10. Agregar un ítem, tocar `Editar`, cambiar precio y cantidad, guardar y confirmar que subtotal, gastado y disponible se actualicen.
11. Agregar montos hasta superar 80%, 95% y 100% para revisar las alertas.
12. Borrar un ítem y confirmar que los totales bajen.
13. Cerrar sesión y verificar que las rutas de compra soliciten autenticación.

## Comandos de verificación

```bash
npm run test
npm run build
```

## Fases implementadas

- Fase 1: base Next.js, Tailwind, Supabase dependency, PWA básica, dominio CRC/presupuesto/OCR y esquema inicial.
- Fase 2: login/sign up con Supabase Auth, creación de compras autenticadas y entrada manual persistida de precios.
- Fase 3: compra activa optimizada para móvil con cantidad rápida, acción `DESHACER` tras agregar y edición persistida de precio/cantidad.
- Fase 4: escáner de cámara en la compra activa con OCR local, botones de candidatos CRC y confirmación manual antes de agregar.
