# Frontend Admin Games Lifecycle

## Alcance

Bloque 1 de lifecycle administrativo de bingos en `frontend_rifas_app`, usando únicamente contratos reales de `../backend_rifas_app`.

Incluye:

- crear bingo;
- publicar bingo;
- abrir ventas;
- cerrar ventas;
- programar inicio;
- cancelar bingo;
- integración desde `/admin/bingos` y `/admin/bingos/:gameId`;
- refresh seguro de listado y detalle;
- pruebas automatizadas de repository, mappers, facades y páginas.

No incluye:

- cambios backend;
- acciones técnicas del motor más allá del enlace existente;
- refunds;
- winner payout;
- reporting;
- player home;
- identity/social.

## Decisión

Decisión tomada: `L1 — Lifecycle completo listo`.

Justificación:

- los seis endpoints auditados tienen request, policy, transiciones y tests backend claros;
- `AdminGameResource` entrega un contrato estable para create y mutaciones;
- no fue necesario inventar campos ni estados adicionales.

## Endpoints auditados

- `POST /api/v1/admin/games`
- `POST /api/v1/admin/games/{game}/publish`
- `POST /api/v1/admin/games/{game}/open-sales`
- `POST /api/v1/admin/games/{game}/close-sales`
- `POST /api/v1/admin/games/{game}/schedule`
- `POST /api/v1/admin/games/{game}/cancel`

## Matriz contractual

| Acción | Endpoint | Request | Body requerido | Resource | Estado origen | Estado destino | Policy | Errores | Tests | Riesgo | Veredicto |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Create | `POST /admin/games` | `CreateGameRequest` | `slug`, `name`, `number_min`, `number_max`, `hits_required`, `ticket_price_cents`, `prize_cents`, `currency`, `draw_interval_seconds`, `auto_draw_enabled`; opcionales `description`, `sales_opens_at`, `sales_closes_at`, `scheduled_start_at`, `settings` | `AdminGameResource` + `status=created` | n/a | `draft` | `GamePolicy::create` | `401`, `403`, `422` | `CreateGameTest` | Medio | Implementado |
| Publish | `POST /admin/games/{game}/publish` | sin request body | `{}` | `AdminGameResource` | `draft` | `published` | `GamePolicy::publish` | `401`, `403`, `404`, `422 invalid_game_transition`, `409` | `GameLifecycleTest` | Bajo | Implementado |
| Open sales | `POST /admin/games/{game}/open-sales` | sin request body | `{}` | `AdminGameResource` | `published` | `sales_open` | `GamePolicy::openSales` | `401`, `403`, `404`, `422 invalid_game_transition`, `409` | `GameLifecycleTest` | Bajo | Implementado |
| Close sales | `POST /admin/games/{game}/close-sales` | sin request body | `{}` | `AdminGameResource` | `sales_open` | `sales_closed` | `GamePolicy::closeSales` | `401`, `403`, `404`, `422 invalid_game_transition`, `409` | `GameLifecycleTest` | Bajo | Implementado |
| Schedule | `POST /admin/games/{game}/schedule` | `ScheduleGameRequest` | `scheduled_start_at` ISO | `AdminGameResource` | `published`, `sales_open`, `sales_closed` | sin cambio de estado | `GamePolicy::schedule` | `401`, `403`, `404`, `422 invalid_game_configuration`, `422 validation` | `GameLifecycleTest`, `AdminGameE2EFlowTest` | Medio | Implementado |
| Cancel | `POST /admin/games/{game}/cancel` | `CancelGameRequest` | `reason` nullable | `AdminGameResource` | `draft`, `published`, `sales_open`, `sales_closed`, `paused` | `cancelled` | `GamePolicy::cancel` | `401`, `403`, `404`, `422 invalid_game_transition`, `409` | `GameLifecycleTest`, `AdminGameE2EFlowTest` | Medio | Implementado |

## Payloads frontend

### Create

```ts
{
  slug: string;
  name: string;
  description: string | null;
  numberMin: number;
  numberMax: number;
  hitsRequired: number;
  ticketPriceCents: number;
  prizeCents: number;
  currency: string;
  drawIntervalSeconds: number;
  autoDrawEnabled: boolean;
  salesOpensAt: string | null;
  salesClosesAt: string | null;
  scheduledStartAt: string | null;
}
```

### Schedule

```ts
{
  scheduledStartAt: string;
}
```

### Cancel

```ts
{
  reason: string | null;
}
```

## Estados frontend

Estado finito usado por cada mutación:

- `idle`
- `submitting`
- `success`
- `unauthorized`
- `forbidden`
- `notFound`
- `validationError`
- `invalidState`
- `conflict`
- `networkError`
- `unexpectedError`

Además cada acción conserva:

- `result` del comando exitoso;
- `refreshState`: `idle | refreshing | confirmed | failed`;
- `refreshMessage` si la mutación fue exitosa pero el snapshot posterior no pudo confirmarse.

## UX administrativa

### `/admin/bingos`

- se añadió CTA `Crear bingo`;
- el formulario usa solo campos reales del backend;
- el submit muestra feedback de éxito/error en `aria-live`;
- tras crear, el listado se refresca con la query actual;
- si el refresh falla, se conserva el éxito del comando y el enlace al detalle creado.

### `/admin/bingos/:gameId`

- se añadió panel `Lifecycle administrativo`;
- solo muestra acciones válidas según el estado visible;
- mantiene el motor técnico separado en su propio enlace;
- usa confirmación explícita para publish, open-sales, close-sales, schedule y cancel;
- schedule usa fecha local y la serializa a ISO;
- cancel permite `reason` opcional.

## Autorización y errores

- todo sigue dependiendo del interceptor Bearer existente;
- no se añade Bearer manual ni headers inventados;
- `401`, `403`, `404`, `409`, `422`, red y errores inesperados se mapean a estados finitos;
- `invalid_game_transition` e `invalid_game_configuration` se muestran como `invalidState`.

## Hardening

- mappers defensivos para `AdminGameResource` y su envelope `data`;
- doble submit bloqueado por acción;
- create bloquea doble submit mientras está en vuelo;
- respuestas tardías se descartan si cambia `gameId` o cambia la sesión;
- al cambiar de juego se limpian estados de acciones pendientes para no dejar `submitting` fantasma;
- si una mutación sale bien y el refresh falla, se conserva el resultado del comando.

## Pruebas añadidas

- `admin-games.repository.spec.ts`
  - create payload real;
  - publish/open-sales/close-sales/schedule/cancel;
  - `409` de lifecycle;
- `admin-games.mapper.spec.ts`
  - command result;
  - envelope con `status=created`;
  - rechazo de payload incompleto;
- `admin-games.facade.spec.ts`
  - create exitoso;
  - doble submit create;
  - create exitoso con refresh fallido;
- `admin-game-detail.facade.spec.ts`
  - publish exitoso con refresh;
  - doble submit por acción;
  - éxito con refresh fallido;
  - descarte de respuesta tardía tras cambio de juego;
  - error `invalidState` en schedule;
- `admin-games-page.spec.ts`
  - botón crear visible;
  - submit del formulario create;
  - validación visual;
- `admin-game-detail-page.spec.ts`
  - visibilidad de acciones por estado;
  - confirmación de publish;
  - formulario de schedule.

## Smoke manual

No ejecutado.

Motivo:

- en esta corrida no se levantaron Angular y Laravel juntos con un juego desechable confirmado;
- por seguridad no se dispararon mutaciones reales sobre datos no verificados como descartables.

Smoke recomendado:

1. Login admin.
2. Abrir `/admin/bingos`.
3. Crear un bingo desechable.
4. Entrar al detalle.
5. Publicar.
6. Abrir ventas.
7. Cerrar ventas.
8. Programar fecha futura.
9. Cancelar solo si sigue siendo un juego seguro para descartar.
10. Confirmar refresh y errores de transición inválida.

## Resultados de validación

- `npm test -- --watch=false` -> `45 passed`, `400 passed`
- `npm run build` -> ok
- warning existente conservado:
  - budget SCSS en `src/app/features/game-numbers/pages/number-selection-page/number-selection-page.ts`, excedido por `535 bytes`
- `npm run lint` -> no existe en `package.json`

## Riesgos pendientes

- falta smoke mutante real con Angular + Laravel levantados;
- la confirmación es inline y accesible, pero no usa modal nativo;
- el listado sigue sin filtros de lifecycle más finos porque el backend no expone otros en este bloque.

## Fuera de alcance

- refunds;
- payout de ganador;
- mutaciones del motor técnico;
- reporting;
- player home;
- cambios backend.

## Siguiente bloque recomendado

Bloque siguiente sugerido: cierre operativo de commerce/admin posterior al lifecycle, especialmente refunds y payout, siempre contra contratos reales ya existentes y sin mezclarlo con reporting ni placeholders.
