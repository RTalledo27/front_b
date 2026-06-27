# Fase 3.4 frontend - Primera mutación administrativa del motor

## Alcance

Este bloque audita las mutaciones administrativas reales del motor y habilita una sola en frontend: iniciar el juego desde la consola contextual `/admin/bingos/:gameId/motor`.

Incluye:

- auditoría contractual de `start`, `pause`, `resume`, `draw` y `rebuild counters`;
- selección de una única mutación;
- consumo del endpoint admin real `POST /api/v1/admin/games/{game}/start`;
- uso exclusivo del UUID real del contexto administrativo;
- confirmación accesible antes del submit;
- prevención de doble submit;
- refresh seguro del contexto tras éxito;
- manejo de `401`, `403`, `404`, `422`, red e inesperados;
- descarte de respuestas tardías por cambio de juego o logout;
- pruebas automatizadas y validación de build.

No incluye:

- `pause`, `resume`, `draw` o `rebuild counters` desde UI;
- polling agresivo;
- WebSocket;
- automatización del motor;
- cambios backend;
- pagos, refunds, payouts u OAuth.

## Mutaciones auditadas

| Candidato | Endpoint | Estado requerido | Policy | Request | Resource | Concurrencia | Idempotencia | Tests | Riesgo | Veredicto |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Start | `POST /api/v1/admin/games/{game}/start` | `sales_closed` y readiness válida | `start` | `StartGameRequest` | `AdminStartGameResource` | lock `FOR UPDATE`, replay controlado | replay funcional con `already_started` | `AdminEngineEndpointsTest`, `StartGameActionTest`, `TwoSimultaneousStartsConcurrencyTest` | medio | elegido |
| Pause | `POST /api/v1/admin/games/{game}/pause` | `running` con `auto_draw_enabled=true` | `pause` | `PauseGameRequest` | `AdminPauseGameResource` | transición operativa sensible | replay `already_paused` | `AdminEngineEndpointsTest` y tests de acción | medio-alto | rechazado |
| Resume | `POST /api/v1/admin/games/{game}/resume` | `paused` con `auto_draw_enabled=true` | `resume` | `ResumeGameRequest` | `AdminResumeGameResource` | recalcula `next_draw_at` | replay `already_running` | `AdminEngineEndpointsTest` y tests de acción | medio-alto | rechazado |
| Draw | `POST /api/v1/admin/games/{game}/draws` | juego corriendo y modo manual | `draw` | `DrawGameNumberRequest` | `AdminDrawGameNumberResource` | alta, afecta operación en vivo | exige `X-Draw-Command-Id` | `AdminEngineEndpointsTest`, tests de shape e integración | alto | rechazado |
| Rebuild counters | `POST /api/v1/admin/games/{game}/counters/rebuild` | juego existente | `rebuildCounters` | `RebuildCountersRequest` | `AdminRebuildGameCountersResource` | sensible a integridad | resultado técnico `rebuilt/already_consistent` | `AdminEngineEndpointsTest` y tests de acción | alto | rechazado |

## Decisión

Decisión final: **E1 - Start**.

Motivos:

- es la primera transición operacional natural después de Fase 3.3;
- el backend la respalda con policy clara, request vacío, resource estable y pruebas de concurrencia;
- no exige header técnico adicional;
- su replay `already_started` permite feedback seguro sin inventar semántica frontend.

## Endpoint elegido

- `POST /api/v1/admin/games/{game}/start`

Response real esperada:

```json
{
  "data": {
    "game_id": "uuid",
    "status": "running",
    "outcome": "started",
    "scheduled_start_at": "2026-06-27T12:00:00Z",
    "started_at": "2026-06-27T12:05:00Z",
    "confirmed_entries_count": 12
  }
}
```

También puede devolver `outcome: "already_started"` como replay válido.

## Contratos

- método frontend: `startGame(gameId: string): Observable<GameEngineStartCommandView>`;
- endpoint admin real, sin body de negocio y sin Bearer manual;
- el interceptor de autenticación existente sigue siendo el único encargado del token;
- el mapper valida el envelope `data` y restringe `outcome` a `started | already_started`.

## Estados permitidos

Estados de submit cubiertos en frontend:

- `idle`
- `submitting`
- `success`
- `unauthorized`
- `forbidden`
- `notFound`
- `invalidState`
- `networkError`
- `unexpectedError`

Hardening de aceptación:

- `AdminGameDetailResource` no expone capability explícita para `start`;
- por eso la fuente de verdad de visibilidad quedó limitada a propiedades reales del snapshot admin: `status.value === sales_closed`, `lifecycle.started_at === null` y `schedule.scheduled_start_at <= now`;
- la readiness comercial completa sigue siendo responsabilidad exclusiva del backend y puede devolver `422` aunque el botón sea visible.

## Errores

Mapeo implementado:

- `0` -> `networkError`
- `401` -> `unauthorized`
- `403` -> `forbidden`
- `404` -> `notFound`
- `422` -> `invalidState`
- otros -> `unexpectedError`

`409`, `425` y `429` no se activaron en esta fase porque no forman parte del contrato auditado de `start`.

## Idempotencia y concurrencia

- el backend protege `start` con locking y replay explícito `already_started`;
- el frontend bloquea doble click mientras `startStatus === 'submitting'`;
- la facade descarta respuestas tardías si cambió el `gameId`, cambió la sesión o el componente ya no es vigente;
- el replay `already_started` se trata como éxito coherente y también dispara refresh seguro del contexto;
- el refresh posterior reutiliza la misma estrategia defensiva ya existente en Fase 3.3.

## UX

- el botón `Iniciar juego` aparece solo cuando el juego cumple las precondiciones visibles y autoritativas del snapshot admin;
- el submit pasa por confirmación accesible con foco inicial en confirmar, Escape para cerrar y retorno de foco al disparador al cancelar;
- el CTA cambia a `Iniciando…` mientras el request está en vuelo;
- el éxito informa si el backend inició realmente o si respondió `already_started`;
- el error de `422` muestra un mensaje orientado a readiness/estado, sin exponer payloads internos;
- `pause`, `resume`, `draw` y `rebuild` siguen fuera de la UI principal.

## Autorización

- la pantalla sigue protegida por `adminGuard`;
- el backend conserva la autoridad final sobre `401`, `403` y `404`;
- no se usan endpoints públicos ni UUID manual como flujo principal;
- el acceso manual por `?gameId=` permanece solo como diagnóstico técnico secundario.

## Pruebas

Cobertura añadida o actualizada:

- `game-engine.mapper.spec.ts`
- `game-engine.repository.spec.ts`
- `game-engine.facade.spec.ts`
- `game-engine-page.spec.ts`

Casos nuevos relevantes tras hardening:

- mapper: `started`, `already_started` y rechazo de payloads inválidos;
- repository: endpoint, método, body nulo, replay `already_started` y propagación de `401`, `403`, `404`, `422` y red;
- facade: éxito con refresh, replay `already_started`, doble submit bloqueado, `401`, `403`, `404`, `422`, red, logout, cambio de juego y refresh fallido;
- UI: visibilidad endurecida, confirmación, cancelación, Escape, foco, submit único y feedback de replay/error.

## Smoke

Smoke deseado si Angular y Laravel están levantados localmente:

1. login admin;
2. abrir `/admin/bingos/:gameId/motor`;
3. validar visibilidad de `Iniciar juego` solo en `sales_closed`;
4. confirmar inicio;
5. verificar refresh del contexto a `running`;
6. intentar doble click;
7. validar rechazo a player;
8. validar logout durante submit.

No se ejecutó mutación real contra datos de desarrollo en esta entrega. Sí se revalidó el backend con tests focalizados de `start` para confirmar replay, `422` y concurrencia real.

## Riesgos

- la visibilidad no puede ser perfecta mientras el backend no exponga una capability explícita para `start`; el frontend solo puede endurecerse con señales reales del snapshot admin;
- `start` no expone un contrato de idempotency key dedicado, así que el replay depende enteramente del backend;
- el smoke integral queda pendiente hasta levantar Angular y Laravel juntos.

## Fuera de alcance

- habilitar más mutaciones del motor;
- automatización temporal;
- observabilidad avanzada;
- cambios backend;
- dashboards adicionales.

## Siguiente bloque

Continuación implementada: `docs/frontend-phase-3-engine-pause-resume.md`.

Bloque recomendado: seleccionar una segunda mutación operativa del motor, idealmente `pause` o `resume`, solo después de una auditoría dedicada de estados y de `auto_draw_enabled`.
