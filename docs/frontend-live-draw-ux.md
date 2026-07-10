# B12 — Live Draw UX

Fecha: `2026-07-10`

## Problema detectado

El sorteo manual en `/admin/bingos/:gameId/motor` se sentía como una recarga completa del motor.

Causa real en frontend:

- después de `POST /api/v1/admin/games/{game}/draws`, el `GameEngineFacade` llamaba `refresh()`;
- ese refresh reutilizaba `status='refreshing'` como estado global de la página;
- la página renderizaba nuevamente el bloque `Cargando contexto del motor…` y ocultaba header, contexto, historial y counters.

El backend no era la causa del “reload visual”. El problema era de presentación y orquestación de estado en la SPA.

## Decisión UX

Se mantuvo el mismo contrato backend, pero se cambió la experiencia del draw manual:

- no hay loading global después de sortear;
- el contexto del juego permanece visible;
- el botón `Sortear número` pasa a `Sorteando…` mientras corre la sincronización;
- el último draw se muestra inmediatamente en un bloque destacado;
- historial, counters y winner se sincronizan en segundo plano;
- los errores de draw mantienen el snapshot previo y se muestran inline.

## Contrato usado

Endpoint auditado:

- `POST /api/v1/admin/games/{game}/draws`

Header contractual:

- `X-Draw-Command-Id`

Campos confirmados del draw manual:

- `sequence`
- `drawn_number`
- `current_hits`
- `hits_required`
- `number_is_sold`
- `winner_created`
- `winner_entry_id`
- `game_status`
- `replay`

Ejemplo real validado en el runbook:

```json
{
  "sequence": 3,
  "drawn_number": 1,
  "current_hits": 2,
  "hits_required": 2,
  "number_is_sold": true,
  "winner_created": true,
  "winner_entry_id": "019f49a4-283f-71ff-8dd7-238b8773a68c",
  "game_status": "completed",
  "replay": false
}
```

## Cambios aplicados

### Facade

- se añadió `lastDrawResult` para conservar el último sorteo visible aunque llegue otro submit o falle un refresh posterior;
- se añadió `drawSyncPending` para separar el submit del sorteo de la sincronización silenciosa posterior;
- se añadieron señales de refresh silencioso:
  - `silentRefreshing`
  - `silentRefreshError`
  - `drawsRefreshing`
  - `countersRefreshing`
  - `winnerRefreshing`
- `refresh()` pasó a preservar el snapshot previo y a refrescar en segundo plano;
- en éxito de draw se parchea localmente el snapshot:
  - `latestDraw`
  - historial visible
  - counter afectado
  - estado `completed` inmediato si `winner_created=true`

### UI

- el loader global solo aparece en carga inicial del motor;
- se agregó el bloque visible `Número sorteado`;
- el número sale destacado con microinteracción ligera y respeto por `prefers-reduced-motion`;
- el historial resalta el draw recién agregado;
- los counters resaltan el número afectado;
- si `winner_created=true` y la ficha final aún no llegó, la UI muestra `Ganador detectado` en vez de un error o un vacío engañoso;
- si la sincronización de fondo falla, la consola conserva el estado previo y muestra un aviso honesto.

## Tests

Cobertura añadida o ajustada:

- `game-engine.facade.spec.ts`
  - draw success no activa loading global destructivo
  - draw success guarda `lastDrawResult`
  - draw success parchea snapshot local
  - draw success dispara refresh silencioso
  - draw refresh fallido conserva snapshot previo
  - `winner_created=true` marca `completed` inmediatamente
  - replay e idempotencia siguen vigentes
- `game-engine-page.spec.ts`
  - `Sorteando…` queda solo en el botón
  - no reaparece `Cargando contexto del motor…` tras draw
  - se muestra bloque `Número sorteado`
  - se muestran `drawnNumber` y `sequence`
  - se muestra `Sin ganador aún` o `Ganador detectado` según response
  - errores inline previos siguen vigentes

Resultado exacto final del bloque:

- `npm test -- --watch=false` → `66` files, `513` tests passed
- `npm run build` → passed
  - solo queda el warning histórico de `number-selection-page.ts` por `535 bytes`

## Límites

- no se agregaron WebSockets;
- no se inventaron endpoints nuevos;
- winner final sigue viniendo de `GET /winner`;
- el parche local del snapshot es optimista pero limitado al contrato real del draw.

## Riesgos

- si el backend cambia el shape del draw manual, el panel visible depende de esos campos;
- el parche local no pretende reemplazar la verdad del backend, solo evitar el salto visual mientras llega la sincronización completa;
- el warning histórico de `number-selection-page.ts` sigue fuera de alcance de B12.
