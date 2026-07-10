# QA integral frontend-backend

Fecha base: `2026-07-05`
Última revalidación: `2026-07-09`

## Estado actual

El frontend quedó técnicamente estable para reintentar el smoke integral, pero el cierre total de B8 sigue bloqueado por el entorno local del backend en la última pasada.

## Qué sí quedó verificado en frontend

### Validación local exacta

- `npm test -- --watch=false` → `66` archivos, `500` tests `passed`
- `npm run build` → `passed`
  - warning no bloqueante: `number-selection-page.ts` excede presupuesto SCSS por `535 bytes`
- `npm run lint` → no existe script `lint`
- `git diff --check` → sin errores de whitespace; solo warnings CRLF de Git
- `rg "\b(skip|xit|fit|fdescribe|it\.skip)\b" src -g "*.spec.ts"` → sin coincidencias
- `rg -n "console\.log|console\.debug|debugger|\[b8-data-debug\]" src docs`
  - sin hallazgos en `src`
  - coincidencias solo documentales en `docs/frontend-identity-completion.md`

### Hallazgos frontend corregidos

- bootstrap anónimo honesto en `src/app/app.ts` sin tocar la semántica de `AuthSessionService`
- catálogo público ya no muestra `0 opciones encontradas` mientras aún está cargando
- admin games ya no muestra contadores falsos durante loading
- `PlayerShell` dejó de generar overflow horizontal real en ancho tablet

## Qué era latencia y no bug real

Con esperas más largas, estas rutas sí llegaron a estado estable usando datos reales:

- `/bingos`
- `/jugador/compras`
- `/jugador/reservas`
- `/jugador/cartones`
- `/admin/bingos`
- `/admin/bingos/:gameId`
- `/admin/ordenes`
- `/admin/pagos`
- `/admin/pagos/:paymentId`

También se confirmó una pasada estable de `/admin/bingos/:gameId/motor` con los endpoints reales de detalle, draws, counters y winner completando tras varios segundos. Es decir: parte del “freeze” inicial era smoke demasiado temprano sobre Laravel local lento.

## Qué quedó pendiente de revalidar

La instrucción final de B8.2 pedía repetir:

- `/jugador/inicio` a `360px` con espera mínima de `60s` y captura de:
  - `/auth/me`
  - `/me/orders`
  - `/me/reservations`
  - `/me/entries`
- `/admin/bingos/:gameId/motor` aislado con espera mínima de `60s`

Estas dos revalidaciones no pudieron completarse en la última pasada porque el entorno backend local dejó de responder sanamente.

## Bloqueo actual del entorno

Al reiniciar Laravel local en `http://127.0.0.1:8000`, el backend pasó a devolver `500` incluso en `GET /api/v1/public/games`.

Evidencia:

- respuesta `500` directa desde PowerShell
- excepción mostrada por Laravel:
  - `Illuminate\Database\QueryException`
  - `SQLSTATE[08006] [7] could not translate host name "postgres" to address`

Esto bloquea el smoke real porque ya no hay fuente de datos confiable ni siquiera para catálogo público.

## Veredicto actualizado

- `B8 frontend`: técnicamente estabilizado y listo para reintento
- `B8 smoke integral`: todavía no cerrable hoy por caída del backend local

## Decisión

Estado final: `B8 listo para reintento, no para cierre definitivo`.

Próximo paso sano:

1. restaurar el backend local para que PostgreSQL vuelva a resolver;
2. repetir solo las dos pasadas largas pendientes;
3. si ambas resuelven y salen de loading, cerrar B8 sin abrir más fixes.
