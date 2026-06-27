# Fase 3.6 frontend - Draw manual con idempotencia

## Alcance

Este bloque habilita el draw manual desde `/admin/bingos/:gameId/motor` usando el endpoint administrativo real y el `X-Draw-Command-Id` exigido por Laravel.

Incluye:

- auditoría contractual de `POST /api/v1/admin/games/{game}/draws`;
- command id idempotente por intento lógico de draw;
- bloqueo de doble submit;
- replay coherente del mismo draw;
- refresh seguro de contexto, draws, counters y winner;
- cobertura automatizada de repository, mapper, facade, servicio de command id y UI.

No incluye:

- `POST /api/v1/admin/games/{game}/counters/rebuild`;
- nuevas mutaciones de lifecycle;
- cambios backend;
- polling agresivo, WebSocket ni automatización.

## Auditoría draw

- endpoint real: `POST /api/v1/admin/games/{game}/draws`
- middleware: `auth:sanctum` + `admin`
- policy: `GamePolicy::draw`
- request: `DrawGameNumberRequest`
- resource: `AdminDrawGameNumberResource`
- body: ninguno
- header requerido: `X-Draw-Command-Id`
- formato del command id: UUID
- idempotencia: `draw_commands` con `UNIQUE(game_id, command_id)`
- replay: mismo `command_id` devuelve el snapshot histórico y `replay: true`
- status HTTP: `201` draw fresco, `200` replay
- locks: `Game FOR UPDATE`, luego `GameNumber FOR UPDATE`, luego `GameEntry FOR UPDATE`
- concurrencia: dos command ids distintos producen draws consecutivos; el mismo command id produce un único draw y un replay

## Decisión D1/D2

Decisión final: **D1 - Draw listo para UI**.

Justificación:

- existe ruta real;
- existe request real con validación explícita del header;
- existe policy real;
- existe resource real;
- la idempotencia está documentada y probada vía `draw_commands`;
- hay replay seguro;
- hay tests backend de endpoint, idempotencia, winner y concurrencia real entre procesos.

## Endpoint

- `POST /api/v1/admin/games/{game}/draws`

## Header de idempotencia

- `X-Draw-Command-Id: <uuid>`
- el frontend genera un UUID por intento lógico;
- un retry de red reutiliza el mismo UUID;
- un éxito definitivo limpia el intento;
- cambio de juego o logout descartan el UUID pendiente.

## Command id

Servicio frontend: `DrawCommandIdService`.

Reglas:

- mismo usuario + mismo juego reutilizan el mismo command id mientras el intento siga pendiente;
- error de red conserva el command id;
- `500 internal_engine_error` conserva el command id para reintentar el mismo intento lógico con replay seguro si Laravel ya persistió el snapshot;
- éxito, `409`, `422`, `401`, `403` y `404` limpian el intento;
- logout y login del mismo usuario no reciclan el command id previo;
- `load()` con otro juego y `clear()` también limpian el intento.

## Contrato

`drawNumber(gameId: string, commandId: string): Observable<GameEngineDrawCommandView>`

Resource mapeado:

- `game_id`
- `draw_id`
- `game_number_id`
- `sequence`
- `drawn_number`
- `current_hits`
- `hits_required`
- `number_is_sold`
- `winner_created`
- `winner_entry_id`
- `game_status`
- `drawn_at`
- `replay`

## Estados permitidos

- `idle`
- `submitting`
- `success`
- `conflict`
- `unauthorized`
- `forbidden`
- `notFound`
- `invalidState`
- `networkError`
- `unexpectedError`

## Visibilidad

Fuente de verdad frontend:

1. snapshot admin real;
2. `status.value`;
3. `schedule.autoDrawEnabled`;
4. `lifecycle.startedAt`;
5. `lifecycle.pausedAt`;
6. `lifecycle.completedAt`;
7. winner proyectado;
8. backend como autoridad final vía `422` y `409`.

Regla aplicada:

- `Sortear número` solo aparece con `status.value === 'running'`, `autoDrawEnabled === false`, `startedAt !== null`, `pausedAt === null`, `completedAt === null` y sin winner cargado.

## Errores

Mapeo aplicado:

- `0` -> `networkError`
- `401` -> `unauthorized`
- `403` -> `forbidden`
- `404` -> `notFound`
- `409` -> `conflict`
- `422` -> `invalidState`
- otros -> `unexpectedError`

No hay evidencia de `425` ni `429` en este endpoint.

Hardening final:

- `409/422` se tratan como definitivos y descartan el command id pendiente;
- `500 internal_engine_error` se trata como error no concluyente para conservar el mismo command id y evitar que un retry abra otro draw lógico;
- el refresh posterior sigue siendo independiente: el comando puede quedar aceptado aunque el snapshot refrescado falle.

## Replay y concurrencia

- replay con el mismo `command_id` se trata como éxito coherente;
- doble submit bloqueado mientras el request está en vuelo;
- respuestas tardías se descartan si cambia el `gameId`;
- respuestas tardías se descartan si cambia la sesión;
- el refresh posterior reutiliza la misma protección contra respuestas obsoletas.

## UX

- botón nativo `Sortear número`;
- confirmación accesible separada;
- copy de riesgo operativo explícito;
- loading específico `Sorteando…`;
- success con número sorteado;
- replay anunciado sin duplicar éxito falso;
- rebuild sigue fuera de UI.

## Autorización

- la ruta administrativa mantiene guard de admin;
- draw no usa endpoints públicos;
- el flujo principal sigue usando el UUID contextual real.

## Pruebas

Cobertura añadida o actualizada:

- `src/app/features/game-engine/data-access/draw-command-id.service.spec.ts`
- `src/app/features/game-engine/data-access/game-engine.mapper.spec.ts`
- `src/app/features/game-engine/data-access/game-engine.repository.spec.ts`
- `src/app/features/game-engine/data-access/game-engine.facade.spec.ts`
- `src/app/features/game-engine/pages/game-engine-page/game-engine-page.spec.ts`

Casos clave:

- repository: POST real, header `X-Draw-Command-Id`, success, replay y errores;
- mapper: success, replay, winner nullable y payload inválido;
- facade: success, replay, doble submit, retry de red y `500` con el mismo command id, limpieza por `401/403/404/409/422`, cambio de juego y logout;
- UI: visibilidad, confirmación, Escape, foco, success, replay y errores.

## Smoke

Smoke recomendado con Angular + Laravel locales y datos seguros:

1. login admin;
2. abrir un juego `running` con `auto_draw_enabled=false`;
3. abrir `/admin/bingos/:gameId/motor`;
4. validar visibilidad de `Sortear número`;
5. cancelar confirmación;
6. ejecutar un draw;
7. validar refresh de draws, counters y winner;
8. probar doble click;
9. validar rechazo para anónimo o player.

## Riesgos

- la UI infiere capacidad operativa desde el snapshot porque no hay capabilities dedicadas;
- el backend no documenta `425` ni `429` para draw manual, así que el frontend no inventa estados intermedios adicionales;
- el smoke mutante real sigue dependiendo de un entorno local seguro y no productivo.

## Fuera de alcance

- rebuild de counters;
- draw múltiple;
- “sortear todos”;
- automatización del motor;
- cambios backend.

## Siguiente bloque

Bloque recomendado: `rebuild counters como herramienta técnica`.
