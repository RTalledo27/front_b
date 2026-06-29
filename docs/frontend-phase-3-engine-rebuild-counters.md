# Fase 3.7 frontend - Rebuild counters como herramienta técnica administrativa

## Alcance

Este bloque habilita `rebuild counters` desde `/admin/bingos/:gameId/motor` como herramienta técnica secundaria, usando el contrato administrativo real de Laravel.

Incluye:

- auditoría contractual de `POST /api/v1/admin/games/{game}/counters/rebuild`;
- integración contextual con UUID real del juego;
- confirmación fuerte y separación visual frente a start, pause, resume y draw;
- refresh seguro de contexto, draws, counters y winner;
- cobertura automatizada en mapper, repository, facade y UI.

No incluye:

- nuevas mutaciones operativas;
- automatización del motor;
- polling agresivo o WebSocket;
- cambios backend;
- pagos, refunds, payouts u OAuth.

## Auditoría rebuild

- endpoint real: `POST /api/v1/admin/games/{game}/counters/rebuild`
- middleware: `auth:sanctum` + `admin`
- policy: `GamePolicy::rebuildCounters`
- request: `RebuildCountersRequest`
- resource: `AdminRebuildCountersResource`
- body requerido: ninguno
- headers requeridos: ninguno
- idempotencia: no usa key dedicada, pero es idempotente por resultado
- outcomes: `rebuilt` y `already_consistent`
- lock principal: `Game FOR UPDATE`
- fuente canónica: `game_draws`
- escritura: solo `game_number_counters`
- side effects: evento `counters_rebuilt` únicamente cuando hay reconstrucción real

## Decisión R1/R2

Decisión final: **R1 - rebuild listo para UI como herramienta técnica**.

Justificación:

- existe ruta real con middleware administrativo;
- existe request real con policy explícita;
- existe resource estable;
- el action documenta tablas tocadas y límites de la mutación;
- los outcomes `rebuilt` y `already_consistent` están cubiertos por tests backend;
- hay cobertura backend de concurrencia, lifecycle e integridad.

## Contrato

`rebuildCounters(gameId: string): Observable<GameEngineRebuildCountersCommandView>`

Resource mapeado:

- `game_id`
- `outcome`
- `previous_rows`
- `previous_hits_total`
- `rebuilt_rows`
- `rebuilt_hits_total`
- `total_draws`
- `max_sequence`
- `rebuilt_at`

## Estados permitidos

Fuente de verdad: backend.

Resumen auditado:

- `draft`, `published`, `sales_open` y `sales_closed`: permitidos si la historia es coherente y no hay violación de lifecycle;
- `running`: permitido;
- `paused`: permitido;
- `completed`: permitido si winner y lifecycle son coherentes;
- `resolving`: rechazado por integridad;
- `cancelled`: depende de la coherencia entre draws, started/completed y winner.

El frontend no inventa más reglas que ocultarlo cuando `status.value === 'resolving'`.

## Visibilidad

Regla frontend aplicada:

1. snapshot administrativo real;
2. `status.value !== 'resolving'`;
3. backend como autoridad final vía `409` y `422`.

La acción aparece en una sección separada de “Herramientas técnicas” y no se mezcla con las mutaciones principales del motor.

## Errores

Mapeo aplicado:

- `0` -> `networkError`
- `401` -> `unauthorized`
- `403` -> `forbidden`
- `404` -> `notFound`
- `409` -> `conflict`
- `422` -> `invalidState`
- otros -> `unexpectedError`

No hay evidencia de `425` ni `429` para este endpoint.

## Concurrencia

- doble submit bloqueado mientras el request está en vuelo;
- respuestas tardías se descartan si cambia el `gameId`;
- respuestas tardías se descartan si cambia la sesión;
- el refresh posterior hereda la misma protección contra respuestas obsoletas.

## UX técnica

- botón secundario `Reconstruir counters`;
- confirmación accesible separada;
- copy explícito sobre recalcular `game_number_counters` desde `game_draws`;
- feedback de éxito distinto para `rebuilt` y `already_consistent`;
- feedback de conflicto e invalid state sin exponer detalles internos de Laravel.

## Autorización

- sigue usando el interceptor Bearer existente;
- no añade headers manuales;
- no usa endpoints públicos;
- player o anónimo quedan protegidos por el backend administrativo.

## Pruebas

Cobertura añadida o actualizada:

- `src/app/features/game-engine/data-access/game-engine.mapper.spec.ts`
- `src/app/features/game-engine/data-access/game-engine.repository.spec.ts`
- `src/app/features/game-engine/data-access/game-engine.facade.spec.ts`
- `src/app/features/game-engine/pages/game-engine-page/game-engine-page.spec.ts`

Casos clave:

- mapper: `rebuilt`, `already_consistent`, payload incompleto, outcome inválido, fecha inválida;
- repository: POST real, body nulo, success, `already_consistent`, `401/403/404/409/422`, red;
- facade: success, `already_consistent`, doble submit, cambio de juego, logout, refresh fallido y mapeo de errores;
- UI: visibilidad técnica, ocultamiento en `resolving`, confirmación, cancelación, foco, success y conflict.

## Smoke

Smoke mutante pendiente solo si existe un juego local seguro y desechable.

Pasos recomendados:

1. login admin;
2. abrir `/admin/bingos/:gameId/motor`;
3. verificar la sección “Herramientas técnicas”;
4. cancelar la confirmación;
5. ejecutar un rebuild único solo sobre datos locales seguros;
6. verificar refresh posterior de counters y contexto.

## Riesgos

- la UI no conoce capabilities dedicadas y depende del snapshot administrativo más el rechazo final del backend;
- el smoke mutante real sigue condicionado por tener un juego local seguro;
- el backend puede rechazar estados coherentes desde UI pero inválidos por integridad más profunda, y el frontend responde mostrando el conflicto sin inventar recovery automático.

## Fuera de alcance

- start, pause, resume o draw adicionales;
- automatización del motor;
- cambios backend;
- player commerce y pagos.

## Siguiente bloque

Bloque recomendado: cierre de Fase 3 con smoke administrativo real Angular + Laravel sobre datos locales desechables, sin abrir nuevas mutaciones.

Resultado del cierre: `docs/frontend-phase-3-engine-integral-smoke.md`.
