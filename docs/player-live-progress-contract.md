# Player Live Progress Contract

## Objetivo

Agregar un contrato autenticado y seguro para que el jugador vea el progreso real de sus propios cartones durante un juego, sin usar endpoints admin ni inventar datos.

## Auditoría backend

Superficies revisadas:

- `game_entries`
- `game_number_counters`
- `game_draws`
- `game_winners`
- `PlayerEntryResource`
- `ListMyEntriesController`
- `ListMyEntriesQuery`
- `tests/Feature/Commerce/PlayerQueriesTest.php`
- `docs/game-operation-runbook.md`

Hallazgos relevantes:

- `GET /api/v1/me/entries` ya filtra por `user_id` en `ListMyEntriesQuery`.
- Cada `entry` ya está ligado a un `game_number_id`, que es suficiente para resolver progreso.
- `game_number_counters.hits_count` es la proyección rápida del número vendido.
- `game.latestDraw` ya existe y expone el último número sorteado.
- `game.winner` ya existe y mantiene la semántica oficial de ganador.
- `game.hits_required`, `game.status` y `game.completed_at` ya están en `games`.

## Decisión

`P1 — extender GET /api/v1/me/entries con live_progress`

Razones:

- El progreso live es parte natural del recurso `entry`.
- No requiere ownership nuevo: la query ya devuelve sólo entries del usuario autenticado.
- Evita roundtrips extra y polling duplicado por cartón.
- Mantiene backward compatibility porque `live_progress` se agrega como campo adicional.

## Contrato final

Endpoint:

- `GET /api/v1/me/entries`

Campo agregado por entry:

```json
{
  "live_progress": {
    "entry_id": "uuid",
    "game_id": "uuid",
    "game_status": "running",
    "game_number": 7,
    "hits_current": 2,
    "hits_required": 5,
    "latest_draw_number": 7,
    "latest_draw_sequence": 2,
    "is_winner": false,
    "completed_at": null,
    "won_at": null
  }
}
```

## Fuente de cada campo

| Campo | Fuente real |
| --- | --- |
| `entry_id` | `game_entries.id` |
| `game_id` | `game_entries.game_id` |
| `game_status` | `games.status` |
| `game_number` | `game_numbers.number` |
| `hits_current` | subquery a `game_number_counters.hits_count` por `game_number_id`, con fallback `0` |
| `hits_required` | `games.hits_required` |
| `latest_draw_number` | `games.latestDraw.drawn_number` |
| `latest_draw_sequence` | `games.latestDraw.sequence` |
| `is_winner` | `game_entries.status === winner` o `game_winners.game_entry_id === entry.id` |
| `completed_at` | `games.completed_at` |
| `won_at` | `game_winners.won_at` sólo si la entry es la ganadora |

## Seguridad y autorización

- No se expone información de otros jugadores.
- No se usan endpoints admin.
- No se exponen user ids ajenos ni datos de otros cartones.
- La semántica de `winner` no cambió: `is_winner` sólo refleja la verdad ya registrada en backend.

## Implementación backend

Archivos tocados:

- `app/Modules/Commerce/Application/Queries/ListMyEntriesQuery.php`
- `app/Modules/Commerce/Presentation/Http/Resources/Player/PlayerEntryResource.php`
- `tests/Feature/Commerce/PlayerQueriesTest.php`

Notas:

- `ListMyEntriesQuery` ahora selecciona `live_hits_current` vía subquery a `game_number_counters`.
- La query eager-loada lo mínimo necesario de `game`, `game.latestDraw`, `game.winner` y `gameNumber`.
- `PlayerEntryResource` agrega `live_progress` sin romper el payload existente.

## Frontend consumidor

Superficies actualizadas:

- `/jugador/cartones`
- `/jugador/inicio`
- mapper/modelos de player commerce

Comportamiento:

- Si `live_progress` existe, se muestra `X/Y` real.
- Si falta, se conserva el fallback honesto anterior.
- El polling del listado de cartones corre sólo mientras exista al menos un `live_progress.game_status === running`.
- En refresh fallido se conserva la data visible.

## Tests validados

Backend focal:

- `php artisan test tests/Feature/Commerce/PlayerQueriesTest.php`
- Resultado: `8 passed (43 assertions)`

Cobertura nueva:

- progreso de entries propias en `running`
- progreso de winner en `completed`
- juego sin draws todavía
- ownership sigue intacto
- payload estable

Frontend:

- `npm test -- --watch=false`
- Resultado: `68 files / 529 tests passed`

Cobertura nueva:

- muestra `X/Y`
- fallback si falta `live_progress`
- polling de cartones se detiene al pasar a `completed`
- refresh error conserva data

## Riesgos

- `hits_current` depende de la consistencia de `game_number_counters`; si esa proyección se corrompe, el contrato reflejará esa proyección hasta reconstrucción.
- Home sigue usando además enriquecimiento público existente para el bloque visual “Juego en vivo”, porque el listado de órdenes no trae suficiente contexto para reemplazarlo todo con datos player-only.
