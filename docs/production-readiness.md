# Preparación para producción

Esta guía reúne las verificaciones de salida de Fase 9. La app todavía no debe prometer instalación PWA ni recarga offline completa hasta confirmar el comportamiento en navegador real y móvil.

## Ruta rápida

1. Ejecutar los gates automatizados en una copia local limpia.
2. Probar un build de producción local con variables públicas de Supabase de un entorno no productivo.
3. Completar la tabla de evidencia manual antes de desplegar.

## Automatización requerida

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Estos comandos no sustituyen las pruebas manuales de cámara, PWA móvil, HTTPS ni Supabase/RLS.

## Build de producción local

```bash
npm run build
npm run start
```

Usar `.env.local` con un proyecto Supabase de prueba. No usar base productiva para validar compras, RLS o finalización.

## Requisitos móviles, HTTPS y navegador

| Área | Requisito | Estado antes de producción |
|------|-----------|----------------------------|
| PWA/service worker | Servir por HTTPS en móvil; `localhost` solo es válido para desarrollo. | Pendiente de evidencia real en navegador. |
| Cámara | Probar permiso, cierre de cámara y fallback manual en Android/iOS objetivos. | Pendiente. |
| Código de barras | `BarcodeDetector` no existe en todos los navegadores; el campo manual debe seguir usable. | Pendiente por navegador. |
| OCR de precio | La captura es local y puede fallar por luz/calidad; el precio manual debe seguir disponible. | Pendiente por dispositivo. |

## Alcance offline actual

- El service worker cachea solo `/`, `/manifest.json` y `/icons/presucart.svg`.
- Las rutas autenticadas, APIs, RSC y rutas dinámicas no se cachean.
- Si una navegación falla sin conexión, el fallback esperado es el inicio público cacheado.
- No hay cola de mutaciones offline. Los borradores locales ayudan a conservar texto escrito, pero guardar requiere reconexión.

## Supabase antes de producción

Validar en un entorno no productivo con dos cuentas de prueba:

1. Aplicar todas las migraciones de `supabase/migrations/` en orden.
2. Confirmar RLS activo en `profiles`, `stores`, `products`, `purchases` y `purchase_items`.
3. Usuario A crea una compra activa y agrega/edita/borra ítems propios.
4. Usuario B no puede leer ni mutar datos del Usuario A.
5. Usuario A finaliza la compra.
6. Confirmar que la compra finalizada queda solo lectura en UI y que inserts/updates/deletes directos sobre sus ítems fallan por reglas/triggers.
7. Confirmar que una compra finalizada no se puede borrar.

## Checklist de despliegue

- [ ] `NEXT_PUBLIC_SUPABASE_URL` apunta al proyecto correcto.
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` usa la clave pública anon de Supabase.
- [ ] Nunca exponer `service_role` en cliente, hosting, logs ni variables `NEXT_PUBLIC_*`.
- [ ] URLs de Auth configuradas para el dominio HTTPS final y callbacks necesarios.
- [ ] Dominio final servido por HTTPS antes de validar PWA/cámara.
- [ ] Migraciones aplicadas y revisadas en el proyecto objetivo.
- [ ] RLS y guards de compra finalizada validados con cuentas de prueba.
- [ ] No desplegar con cuentas, claves o datos de prueba embebidos.

## Evidencia manual pendiente

| Evidencia | Entorno/cuenta | Resultado | Responsable/fecha |
|-----------|----------------|-----------|-------------------|
| PWA en navegador móvil HTTPS: registro seguro de `/sw.js`, sin afirmar instalación hasta confirmarla. | Pendiente | Pendiente | Pendiente |
| Offline: recarga/navegación falla hacia fallback de inicio público; compras autenticadas no prometen recarga offline. | Pendiente | Pendiente | Pendiente |
| Cámara código de barras: permiso, detección si soportada, cierre de stream y fallback manual. | Pendiente | Pendiente | Pendiente |
| OCR de precio: captura local, candidatos cuando aplica y fallback manual. | Pendiente | Pendiente | Pendiente |
| Flujo de compra móvil completo: crear, agregar, editar, deshacer, finalizar y revisar readonly. | Pendiente | Pendiente | Pendiente |
| Supabase dos usuarios: aislamiento RLS y bloqueo de compra finalizada en entorno no productivo. | Pendiente | Pendiente | Pendiente |
| Auth/deploy: URLs HTTPS finales y variables públicas revisadas sin `service_role`. | Pendiente | Pendiente | Pendiente |

## Siguiente paso

Completar la evidencia manual de la tabla antes de mover Fase 9 tarea 4 a completada.
