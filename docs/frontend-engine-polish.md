# Frontend Engine Polish

## Contratos auditados

Decisión provisional: `E1 — Polish completo`.

Backend auditado en `../backend_rifas_app`:

| Sección | Endpoint | Paginación | Resource | Estados / reglas | Errores | Tests backend | Veredicto |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Contexto admin | `GET /api/v1/admin/games/{game}` | No | `AdminGameDetailResource` | expone slug, estado, engine, lifecycle, commerce, projection y winner resumido | `401`, `403`, `404` | `AdminGameDetail` vía repo/frontend + rutas reales | Contrato claro |
| Draws | `GET /api/v1/admin/games/{game}/draws` | Sí, Laravel `data + links + meta`, `per_page` 1..100, `page` estándar | `AdminGameDrawResource` | filtros reales `number`, `sequence_from`, `sequence_to`, `drawn_from`, `drawn_to`; orden por `sequence` | `401`, `403`, `422` validación | `AdminEngineEndpointsTest`, `AdminEngineFilterValidationTest`, `AdminEngineResponseShapeTest` | Contrato claro |
| Counters | `GET /api/v1/admin/games/{game}/counters` | Sí, Laravel `data + links + meta`, `per_page` 1..100, `page` estándar | `AdminGameCounterResource` | filtros reales `number_from`, `number_to`, `min_hits`, `max_hits`, `status`; orden por `number` | `401`, `403`, `422` validación | `AdminEngineEndpointsTest`, `AdminEngineFilterValidationTest`, `AdminEngineResponseShapeTest` | Contrato claro |
| Winner | `GET /api/v1/admin/games/{game}/winner` | No | `AdminGameWinnerResource` | `404 game_winner_not_found` cuando aún no existe ganador | `401`, `403`, `404` | `AdminEngineEndpointsTest`, `AdminEngineResponseShapeTest` | Contrato claro |
| Start | `POST /api/v1/admin/games/{game}/start` | No | `AdminStartGameResource` | replay seguro `already_started` | `401`, `403`, `404`, `422`, `409` posible por integridad | `AdminEngineEndpointsTest`, `StartGameActionTest` | Contrato claro |
| Pause | `POST /api/v1/admin/games/{game}/pause` | No | `AdminPauseGameResource` | replay seguro `already_paused` | `401`, `403`, `404`, `422`, `409` | `PauseGameActionTest` | Contrato claro |
| Resume | `POST /api/v1/admin/games/{game}/resume` | No | `AdminResumeGameResource` | replay seguro `already_running` | `401`, `403`, `404`, `422`, `409` | `ResumeGameActionTest` | Contrato claro |
| Manual draw | `POST /api/v1/admin/games/{game}/draws` | No | `AdminDrawGameNumberResource` | requiere header `X-Draw-Command-Id`; `201` nuevo, `200` replay | `401`, `403`, `404`, `409`, `422`, red | `AdminEngineEndpointsTest`, `DrawGameNumberIdempotencyTest`, `EngineScheduleTest` | Contrato claro |
| Rebuild counters | `POST /api/v1/admin/games/{game}/counters/rebuild` | No | `AdminRebuildCountersResource` | outcomes `rebuilt` / `already_consistent` | `401`, `403`, `404`, `409`, `422`, red | `AdminEngineEndpointsTest`, `RebuildCountersActionTest` | Contrato claro |

## Endpoints usados

- `GET /api/v1/admin/games/{game}`
- `GET /api/v1/admin/games/{game}/draws?page=...`
- `GET /api/v1/admin/games/{game}/counters?page=...`
- `GET /api/v1/admin/games/{game}/winner`
- `POST /api/v1/admin/games/{game}/start`
- `POST /api/v1/admin/games/{game}/pause`
- `POST /api/v1/admin/games/{game}/resume`
- `POST /api/v1/admin/games/{game}/draws`
- `POST /api/v1/admin/games/{game}/counters/rebuild`

## Cambios UX

- `/admin/bingos/:gameId/motor` se mantiene como flujo principal contextual.
- `/admin/motor` queda explícitamente relegado a acceso técnico secundario.
- La hero del motor ahora expone nombre, slug, estado y modo de acceso.
- Draws y counters muestran paginación visual real basada en `meta.current_page`, `meta.last_page` y `meta.total`.
- Winner `404` se sigue tratando como “sin ganador aún”, no como error fatal.
- Rebuild sigue separado visualmente como herramienta técnica, no como mutación operativa/comercial.

## Paginación draws/counters

- Se retiró la estrategia frontal de `per_page=100`.
- El frontend usa la paginación estándar de Laravel por `page`.
- Se conservan los datos del snapshot visible mientras la consola refresca para evitar parpadeos innecesarios.
- Los filtros backend quedaron auditados, pero no se añadieron controles nuevos de filtrado en esta ronda porque el objetivo es polish del flujo existente, no expansión funcional.

## Winner handling

- `GET winner` con `404` sigue mapeando a `null`.
- La UI comunica “sin ganador todavía” de forma honesta.
- Si el detalle admin ya trae winner resumido, la consola conserva ese fallback sin inventar datos nuevos.

## Acciones

- Start, pause, resume, draw y rebuild conservan confirmación explícita.
- Se mantiene bloqueo de doble submit.
- Se mantiene refresh posterior al éxito.
- Se preserva descarte de respuestas tardías por cambio de juego o logout.
- Manual draw sigue usando `X-Draw-Command-Id`.

## Responsive

- Se reforzó el layout para meta del hero, pagers y acceso técnico secundario.
- Draws y counters siguen contenidos sin promover overflow horizontal.

## Tests

- Repository: paginación real para draws/counters por `page`.
- Mapper: mapeo de `data + links + meta`.
- Page: acceso principal vs. acceso técnico secundario, hero contextual y pagers visibles.
- La facade mantiene compatibilidad de pruebas con shape previo mientras consume el shape paginado real en runtime.

## Riesgos

- Los filtros backend de draws/counters quedaron auditados pero aún no tienen controles UI dedicados.
- La validación visual final en navegador real debe confirmarse junto con la suite completa.

## Fuera de alcance

- Nuevas mutaciones de motor.
- Cambios backend.
- Rediseño del lifecycle admin.
- Cambios en admin commerce, identidad, player home o admin players.

## Validación final

- `npm test -- --watch=false`: `65` files, `495` tests, todo verde.
- `npm run build`: verde. Se mantiene solo el warning histórico de budget SCSS en `number-selection-page` (`4.54 kB`, excede `4.00 kB` por `535 bytes`).
- `npm run lint`: no existe en este repo (`npm error Missing script: "lint"`).
- `git diff --check`: sin errores de whitespace; solo warnings CRLF en archivos modificados.
- `git status --short`: cambios locales solo en archivos del engine polish y `docs/frontend-engine-polish.md`.
