# Cierre integral de Fase 3 motor - Smoke administrativo Angular + Laravel

## Alcance

Este cierre consolida la validación integral de la Fase 3 del motor administrativo sobre entorno local seguro, usando Angular y Laravel reales.

Incluye:

- preflight de frontend y backend;
- validación de contratos reales del motor administrativo;
- smoke real por API contra Laravel para `start`, `pause`, `resume`, `draw` manual y `rebuild counters`;
- validación de autorización para admin, player y anónimo;
- verificación de regresión básica de rutas y consola administrativa;
- documentación de lo ejecutado y de los bloqueos reales del smoke de navegador.

No incluye:

- nuevas funcionalidades;
- cambios backend;
- datos no desechables;
- producción;
- actualización de dependencias;
- refactors.

## Entorno usado

- frontend: `C:\Users\rogit\proyectos\rifas\frontend_rifas_app`
- backend: `C:\Users\rogit\proyectos\rifas\backend_rifas_app`
- Angular dev server: `http://127.0.0.1:4300`
- Laravel API: `http://127.0.0.1:8000`
- proxy frontend: `proxy.conf.json` hacia `/api` y `/sanctum`
- base local backend: `APP_ENV=local`, `APP_URL=http://localhost:8000`, `DB_HOST=127.0.0.1`, `DB_PORT=55432`, `DB_DATABASE=backend_rifas_app`

## Datos locales seguros usados

Usuarios locales desechables:

- admin: `smoke-motor-admin@example.com` / `secret123`
- player: `smoke-motor-player@example.com` / `secret123`

Juegos locales desechables:

- manual:
  - id: `019f0b23-9b59-7384-9b34-deb1e7637a02`
  - slug: `smoke-motor-manual-xu5scx`
  - estado inicial: `sales_closed`
  - `auto_draw_enabled=false`
  - números: `1..5`
  - vendidos: `1`
  - disponibles: `4`
  - entries confirmadas: `1`
  - no puede producir ganador con un único draw porque `hits_required=5`
- auto:
  - id: `019f0b23-9bab-7352-baab-d2420530279f`
  - slug: `smoke-motor-auto-bxwxhs`
  - estado inicial: `sales_closed`
  - `auto_draw_enabled=true`
  - números: `1..5`
  - vendidos: `1`
  - disponibles: `4`
  - entries confirmadas: `1`
  - no puede producir ganador con un único draw porque `hits_required=5`

## Navegación administrativa

Validación disponible:

- la ruta principal del motor sigue siendo `/admin/bingos/:gameId/motor`;
- el detalle administrativo mantiene el acceso contextual al motor desde UUID real;
- la ruta técnica secundaria `/admin/motor?gameId=...` sigue siendo complementaria;
- la pantalla de login Angular respondió localmente con el formulario esperado.

Límite del smoke:

- la automatización del navegador no se mantuvo estable durante el flujo completo de login, listado, detalle y motor;
- por ello la navegación administrativa quedó validada por render inicial, routing existente y contratos reales, pero no por recorrido E2E completo automatizado.

## Lecturas del motor

Quedó validado contra Laravel real:

- `GET /api/v1/admin/games`
- `GET /api/v1/admin/games/{game}`
- `GET /api/v1/admin/games/{game}/draws`
- `GET /api/v1/admin/games/{game}/counters`
- `GET /api/v1/admin/games/{game}/winner`

Resultados:

- la consola puede leer contexto real de juego;
- `draws` lista correctamente el histórico;
- `counters` devuelve `{ game_number_id, number, status, hits_count, last_draw_sequence }`;
- `winner` devuelve `404` limpio cuando todavía no existe ganador;
- después del draw real, `draws` y `counters` reflejaron el refresh esperado sin duplicación.

## Start

Validado sobre los juegos locales seguros:

- el juego manual pasó a `running`;
- el juego auto pasó a `running`;
- el replay seguro de `start` sobre el juego manual respondió `200` con `outcome: "already_started"`;
- eso confirma que el frontend puede refrescar sin abrir una segunda mutación efectiva.

## Pause y resume

Validado sobre el juego auto:

- `pause` respondió `200` con `outcome: "paused"`;
- `resume` respondió `200` con `outcome: "resumed"` y `next_draw_at`;
- un `resume` adicional sobre el juego ya corriendo respondió `200` con `outcome: "already_running"`;
- el juego manual rechazó `pause` con `422`, lo que confirma el guardado de estado/capacidad en backend.

## Draw manual

Validado sobre el juego manual ya iniciado y con `auto_draw_enabled=false`.

Evidencia:

- el endpoint exige `X-Draw-Command-Id` con UUID real;
- un header no UUID devolvió `422` con mensaje contractual;
- con `X-Draw-Command-Id: 550e8400-e29b-41d4-a716-446655440000` el primer draw respondió `200` con:
  - `sequence: 1`
  - `drawn_number: 1`
  - `current_hits: 1`
  - `winner_created: false`
  - `replay: false`
- el replay inmediato con el mismo UUID respondió el mismo snapshot con `replay: true`;
- `draws` quedó con un solo registro;
- `counters` reflejó `hits_count: 1` y `last_draw_sequence: 1` para el número sorteado;
- `winner` siguió devolviendo `404`, consistente con `hits_required=5`.

## Rebuild counters

Validado como herramienta técnica separada:

- antes del draw, `rebuild` respondió `already_consistent` con cero filas;
- después del draw, `rebuild` volvió a responder `already_consistent`, esta vez con:
  - `previous_rows: 1`
  - `previous_hits_total: 1`
  - `rebuilt_rows: 1`
  - `rebuilt_hits_total: 1`
  - `total_draws: 1`
  - `max_sequence: 1`

Eso confirma que la herramienta puede ejecutarse sin mezclar su semántica con las mutaciones operativas del motor.

## Autorización

Validado por contrato real:

- anónimo hacia `GET /api/v1/admin/games` -> `401`
- player autenticado hacia `GET /api/v1/admin/games` -> `403`
- admin autenticado -> acceso correcto a lecturas y mutaciones del motor

La parte frontend de redirección/guard para player y anónimo no pudo completarse como E2E de navegador por la inestabilidad del runtime de automatización.

## Errores

Casos comprobados de forma segura:

- recurso inexistente -> `404`
- `winner` ausente -> `404` tratado como ausencia de ganador
- `pause` sobre juego manual no pausable -> `422`
- `draw` manual con header no UUID -> `422`
- `draw` sobre juego auto -> `422`
- anónimo -> `401`
- player sin permisos admin -> `403`

No se forzó:

- backend apagado;
- conflicto `409` de motor;
- corrupción de datos;
- errores de infraestructura.

## No-regresión

Quedó confirmado:

- siguen existiendo las rutas admin reales bajo `/api/v1/admin/games`;
- el frontend mantiene la consola del motor con UUID real contextual;
- no se agregaron nuevas features durante este cierre;
- el smoke no tocó producción ni juegos no desechables.

Quedó pendiente como smoke navegable real:

- recorrido completo de `/admin/bingos`, detalle y motor;
- smoke básico de player commerce desde navegador.

## Pruebas

Frontend:

- `npm test -- --watch=false`
- `npm run build`
- `git diff --check`

Backend focalizado:

- `php artisan test --filter "AdminEngineEndpointsTest|StartGameActionTest|PauseGameActionTest|ResumeGameActionTest|DrawGameNumberIdempotencyTest|DrawGameNumberConcurrencyTest|DrawWinnerResolutionTest|RebuildCounters|AdminEngineResponseShapeTest"`

## Resultados

- frontend: tests pasando
- frontend: build pasando
- frontend: `npm run lint` no existe
- backend: suite focalizada del motor pasando
- smoke real por API: validado
- smoke real de navegador: parcial por bloqueo de automatización

## Riesgos aceptados

- la aceptación final depende de evidencia HTTP real y no de un recorrido navegador completamente automatizado;
- la automatización inestable impidió verificar visualmente algunos estados de confirmación, foco y regreso entre pantallas;
- el smoke no incluyó backend apagado ni `409` reproducible de forma segura.

## Pendientes

- repetir el smoke administrativo completo desde navegador cuando el runtime del browser in-app esté estable o exista un navegador Playwright ya instalado en local;
- si se quiere cerrar también la regresión funcional visible de Phase 2, ejecutar un smoke UI corto del flujo principal de player commerce en ese mismo entorno.
