# Frontend Player Live Game

## Problema detectado

Las vistas públicas y del jugador ya consumían contratos reales para catálogo, detalle, reservas y cartones, pero no explicaban bien qué estaba ocurriendo cuando un juego pasaba a `running` o `completed`. El jugador veía estado comercial y cartones confirmados, pero no el último sorteo público, la ausencia de ganador o la expectativa de actualización.

## Contratos auditados

| Dato deseado | Endpoint real | Campo real | Público/player | ¿Apto? | Riesgo |
| --- | --- | --- | --- | --- | --- |
| Estado del juego | `GET /api/v1/public/games/{slug}` | `status` | Público | Sí | Bajo |
| Lifecycle | `GET /api/v1/public/games/{slug}` | `lifecycle.started_at`, `paused_at`, `completed_at` | Público | Sí | Bajo |
| Último sorteo | `GET /api/v1/public/games/{slug}` | `latest_draw.sequence`, `number`, `drawn_at` | Público | Sí | Bajo |
| Próxima referencia | `GET /api/v1/public/games/{slug}` | `schedule.next_draw_at`, `draw_interval_seconds` | Público | Sí | Bajo |
| Ganador público | `GET /api/v1/public/games/{slug}` | `winner.number`, `draw_sequence`, `hits`, `won_at` | Público | Sí | Bajo |
| Historial de sorteos | `GET /api/v1/public/games/{slug}/draws` | `sequence`, `number`, `drawn_at` | Público | Sí | Medio: no fue necesario para esta UX |
| Contadores por número | `GET /api/v1/public/games/{slug}/number-counters` | `number`, `hits_count`, `last_draw_sequence` | Público | Parcial | Medio: no exponen progreso privado del cartón |
| Cartón/número confirmado del jugador | `GET /api/v1/me/entries` | `game`, `game_number`, `status`, `confirmed_at` | Player | Sí | Bajo |
| Reserva activa del jugador | `GET /api/v1/me/reservations` | `game_number.game`, `order` | Player | Sí | Bajo |
| Orden del jugador | `GET /api/v1/me/orders` | `status`, `totals`, `item_count`, `payment` | Player | Parcial | Medio: el listado no trae slug del juego |
| Aciertos actuales del cartón | Ninguno auditado | No expuesto | Player/Público | No | Alto |

## Decisión

`L2 — Live player parcial`

El backend ya expone suficiente estado público para mostrar juego en vivo, último sorteo, lifecycle, siguiente referencia y ganador público. No expone aciertos actuales del cartón en endpoints player, así que el frontend no inventa progreso `X/Y`.

## Qué ve el jugador

- `/bingos/:slug`
  - Estado claro para `sales_open`, `sales_closed`, `running` y `completed`.
  - Panel de estado publicado con último sorteo, siguiente referencia y ganador si existe.
  - Polling silencioso sólo mientras el juego está `running`.
- `/bingos/:slug/numeros`
  - Banner honesto cuando ya no corresponde reservar.
  - Último sorteo y ganador público si el contrato ya lo expone.
  - Sin CTA engañoso cuando el juego ya está corriendo o terminó.
- `/jugador/inicio`
  - Destacado de “Juego en vivo” para juegos relacionados a reservas/cartones visibles.
  - Links claros al detalle público y a cartones.
- `/jugador/cartones`
  - Cartón confirmado más estado público del juego.
  - Último sorteo y próxima referencia cuando el juego está `running`.
  - Resultado final cuando el juego está `completed`.
  - Mensaje honesto: la actualización de aciertos depende del estado publicado por el juego.

## Qué todavía no se puede mostrar

- Aciertos actuales por cartón o progreso `X/Y` del jugador.
- Un tablero live privado por jugador.
- Conteos confiables desde el listado de órdenes, porque `/me/orders` no trae slug del juego en el listado.

## Polling

- Implementado en `PublicGameDetailFacade`.
- Activo sólo cuando `game.status === 'running'`.
- Intervalo basado en `draw_interval_seconds`, acotado entre 5 y 15 segundos.
- Refresh silencioso:
  - conserva datos visibles;
  - actualiza `lastUpdatedAt`;
  - conserva el último estado si falla el refresh;
  - se limpia al salir de la página o cuando el juego deja de estar `running`.

## Tests

- `public-game.mapper.spec.ts`
  - mapea `lifecycle`, `latest_draw`, `winner`, `next_draw_at`.
- `public-game-detail.facade.spec.ts`
  - carga inicial;
  - polling sólo en `running`;
  - stop en `completed`;
  - refresh con error conserva data previa.
- `game-detail-page.spec.ts`
  - “Juego en vivo” con último sorteo;
  - “Juego finalizado” con ganador público.
- `number-selection-page.spec.ts`
  - banner honesto cuando el juego ya está `running`.
- `player-home.facade.spec.ts` y `player-home-page.spec.ts`
  - destacan juego en vivo sin inventar aciertos.
- `player-collections.facade.spec.ts` y `player-entries-page.spec.ts`
  - componen cartones con estado público real del juego.

## Validación

- `npm test -- --watch=false`: `68 files / 529 tests passed`
- `npm run build`: OK
- `npm run lint`: no existe script `lint`
- Warning conocido:
- `number-selection-page.ts` sigue excediendo su budget histórico, ahora `4.60 kB` sobre budget `4.00 kB`
- Sin warning nuevo en `game-detail-page.ts`

## Actualización B14

- `B14` extendió `GET /api/v1/me/entries` con `live_progress`.
- `/jugador/cartones` ahora muestra `X/Y` real cuando el backend lo expone.
- `/jugador/inicio` reutiliza ese progreso real en el resumen de cartones.
- El fallback honesto anterior se conserva para compatibilidad.
- Polling liviano agregado en cartones sólo mientras exista al menos un juego `running`.

## Riesgos

- Si el backend deja de incluir `latest_draw` o `winner` en ciertos estados, la UI cae al copy honesto sin dashboard inventado.
- Home y cartones dependen de `slug` presente en `entries/reservations`; si un payload futuro omite ese dato, se perderá el enriquecimiento live de esa tarjeta.

## Próximos endpoints recomendados

- Un endpoint player que exponga aciertos actuales por entry/cartón.
- Un resumen player live agregado para evitar múltiples lecturas públicas cuando el jugador tiene varios juegos activos.
