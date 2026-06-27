# Fase 3.5 frontend - Pause/Resume del motor

## Alcance

Este bloque audita `pause` y `resume` como segundo paso operativo del motor y habilita ambas transiciones desde la consola contextual `/admin/bingos/:gameId/motor`.

Incluye:

- auditoría contractual de `POST /api/v1/admin/games/{game}/pause`;
- auditoría contractual de `POST /api/v1/admin/games/{game}/resume`;
- uso exclusivo del UUID real del juego contextual;
- confirmaciones accesibles separadas para pausa y reanudación;
- bloqueo de doble submit por acción;
- manejo de replay backend como éxito coherente;
- descarte de respuestas tardías por cambio de juego o logout;
- refresh seguro del contexto tras éxito o replay;
- cobertura automatizada de repository, mapper, facade y UI.

No incluye:

- `POST /api/v1/admin/games/{game}/draws`;
- `POST /api/v1/admin/games/{game}/counters/rebuild`;
- cambios backend;
- polling agresivo, WebSocket o automatización extra;
- pagos, refunds, payouts u OAuth.

## Auditoría pause/resume

| Acción | Endpoint | Estado requerido | auto_draw_enabled | Policy | Request | Resource | Replay | Concurrencia | Tests | Riesgo | Veredicto |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Pause | `POST /api/v1/admin/games/{game}/pause` | `running` | sí | `GamePolicy::pause` | `PauseGameRequest` | `AdminPauseGameResource` | `already_paused` | `FOR UPDATE`, evento y refresh público | `PauseGameActionTest`, `AdminEngineEndpointsTest` | medio | listo |
| Resume | `POST /api/v1/admin/games/{game}/resume` | `paused` | sí | `GamePolicy::resume` | `ResumeGameRequest` | `AdminResumeGameResource` | `already_running` | `FOR UPDATE`, recalcula `next_draw_at` | `ResumeGameActionTest`, `AdminEngineEndpointsTest` | medio | listo |

### Pause

- endpoint real: `POST /api/v1/admin/games/{game}/pause`
- body: ninguno
- headers especiales: ninguno
- policy: solo admin
- request: sin reglas de payload, autorización por policy
- estado exigido: juego `running`
- además exige `auto_draw_enabled = true`
- resource real:
  - `game_id`
  - `status = paused`
  - `outcome = paused | already_paused`
  - `paused_at`
- replay seguro: `already_paused`
- errores auditados: `401`, `403`, `404`, `422`
- `409`: sí aplica para `game_lifecycle_integrity_violation`
- `429`: no aparece en el contrato real auditado
- efectos de dominio:
  - setea `paused_at`
  - limpia `next_draw_at`
  - preserva `last_consumed_tick_at`
  - emite `GamePaused`

### Resume

- endpoint real: `POST /api/v1/admin/games/{game}/resume`
- body: ninguno
- headers especiales: ninguno
- policy: solo admin
- request: sin reglas de payload, autorización por policy
- estado exigido: juego `paused`
- además exige `auto_draw_enabled = true`
- resource real:
  - `game_id`
  - `status = running`
  - `outcome = resumed | already_running`
  - `resumed_at`
  - `next_draw_at`
- replay seguro: `already_running`
- errores auditados: `401`, `403`, `404`, `422`
- `409`: sí aplica para `game_lifecycle_integrity_violation`
- `429`: no aparece en el contrato real auditado
- efectos de dominio:
  - limpia `paused_at`
  - recalcula `next_draw_at`
  - emite `GameResumed`

## Decisión P1/P2/P3/P4

Decisión final: **P1 - Pause y Resume como par operativo**.

Justificación:

- ambos endpoints existen y están documentados en el backend real;
- ambos usan request vacío, policy admin y resource dedicado;
- ambos tienen replay seguro y semántica clara de éxito;
- ambos usan la misma familia de defensas de concurrencia;
- la UX es simétrica y los estados visibles son mutuamente excluyentes.

## Endpoint(s)

- `POST /api/v1/admin/games/{game}/pause`
- `POST /api/v1/admin/games/{game}/resume`

## Contratos

Frontend:

- `pauseGame(gameId: string): Observable<GameEnginePauseCommandView>`
- `resumeGame(gameId: string): Observable<GameEngineResumeCommandView>`

Mappers:

- validan envelope `data`
- restringen `status` esperado
- restringen `outcome` permitido
- validan fechas ISO obligatorias
- rechazan payloads incompletos o inconsistentes

## Estados permitidos

Estados de submit por acción:

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
6. `engine.nextDrawAt`;
7. backend como autoridad final vía `422`.

Reglas:

- `Pausar juego` solo aparece con `status.value === 'running'`, `autoDrawEnabled === true`, `startedAt !== null` y `pausedAt === null`.
- `Reanudar juego` solo aparece con `status.value === 'paused'`, `autoDrawEnabled === true`, `startedAt !== null`, `pausedAt !== null` y `nextDrawAt === null`.
- ambas acciones además exigen `completedAt === null` para no exponer mutaciones sobre snapshots inválidos que el backend rechazaría por integridad.
- no aparecen simultáneamente.

## Errores

Mapeo aplicado:

- `0` -> `networkError`
- `409` -> `conflict`
- `401` -> `unauthorized`
- `403` -> `forbidden`
- `404` -> `notFound`
- `422` -> `invalidState`
- otros -> `unexpectedError`

## Replay y concurrencia

- `already_paused` se trata como éxito coherente
- `already_running` se trata como éxito coherente
- doble submit bloqueado mientras la acción está en vuelo
- respuestas tardías descartadas si cambia el `gameId`
- respuestas tardías descartadas si cambia la sesión
- el hardening final limpia `start/pause/resume` al cambiar de juego para que éxito o error de un juego anterior no quede pegado al nuevo contexto
- refresh posterior reutiliza la misma protección contra respuestas obsoletas

## UX

- confirmaciones accesibles separadas para iniciar, pausar y reanudar
- foco inicial en el botón de confirmar
- Escape cierra la confirmación si la acción no está enviándose
- retorno de foco al disparador al cancelar
- feedback `aria-live` para éxito y error
- no se agregan botones para draw ni rebuild

## Autorización

- la ruta administrativa sigue protegida por el guard de admin
- el backend mantiene la autoridad final sobre `401`, `403` y `404`
- no se usan endpoints públicos
- el flujo principal sigue usando el UUID contextual real

## Pruebas

Cobertura añadida o actualizada:

- `src/app/features/game-engine/data-access/game-engine.mapper.spec.ts`
- `src/app/features/game-engine/data-access/game-engine.repository.spec.ts`
- `src/app/features/game-engine/data-access/game-engine.facade.spec.ts`
- `src/app/features/game-engine/pages/game-engine-page/game-engine-page.spec.ts`

Casos clave:

- repository: success, replay y errores reales para `pause`/`resume`
- mapper: success, replay y rechazo de payloads inválidos
- facade: success, replay, doble submit, cambio de juego, logout y refresh fallido
- UI: visibilidad, confirmación, Escape, foco, feedback y exclusión de draw/rebuild

## Smoke

Smoke deseado con Angular y Laravel locales:

1. login admin;
2. abrir `/admin/bingos/:gameId/motor`;
3. validar visibilidad según estado real;
4. cancelar confirmación;
5. ejecutar pause o resume;
6. validar refresh y cambio del botón visible;
7. intentar doble click;
8. validar rechazo a player/anónimo.

No se ejecutan mutaciones reales si no hay entorno local seguro preparado.

En esta aceptación final no se ejecutó smoke mutante real porque no había confirmación de datos locales seguros dedicados para probar pause/resume end-to-end.

## Backend testing revalidado

Intento ejecutado:

- `php artisan test --filter='PauseGameActionTest|ResumeGameActionTest|AdminEngineEndpointsTest'`

Resultado observado:

- `PASS  Tests\Feature\Game\AdminEngineEndpointsTest`
- `PASS  Tests\Feature\Game\PauseGameActionTest`
- `PASS  Tests\Feature\Game\ResumeGameActionTest`

Conclusión:

- la rotura previa de refunds no bloqueó esta revalidación final
- el backend confirmó en ejecución real los contratos de `pause` y `resume`
- no se modificó backend como parte de Fase 3.5

## Riesgos

- el frontend no dispone de capabilities explícitas desde backend; la visibilidad sigue siendo inferida desde snapshot real y el backend conserva la última palabra con `422` y `409`
- el smoke integral depende de levantar Angular y Laravel juntos con datos seguros

## Fuera de alcance

- draw manual
- rebuild de contadores
- más automatizaciones del motor
- cambios backend

## Siguiente bloque

Bloque recomendado: evaluar `draw` y `rebuild` en una auditoría separada, porque ambos introducen mayor riesgo operativo y contratos distintos a `start/pause/resume`.

Continuación implementada en `docs/frontend-phase-3-engine-manual-draw.md`.
