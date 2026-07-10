# Runbook operativo del juego

Fecha de validación: `2026-07-10`

## 1. Resumen ejecutivo

Se validó un flujo real desechable extremo a extremo entre frontend y backend:

- creación de juego;
- publicación;
- apertura de ventas;
- invitación y activación de jugador;
- verificación efectiva del jugador;
- reserva real;
- carga de evidencia;
- aprobación administrativa;
- generación de entries;
- cierre de ventas;
- inicio real del juego;
- draws manuales;
- rama sin ganador;
- rama con ganador;
- payout real del ganador.

Backend fuente de verdad auditada: `../backend_rifas_app`.

## 2. Entorno real usado

- Frontend repo: `frontend_rifas_app`
- Backend repo: `../backend_rifas_app`
- URL backend usada en smoke: `http://127.0.0.1:8000`
- Servidor efectivo que respondió:
  - `php.exe -S 127.0.0.1:8000`
- Conexión efectiva de DB en ese proceso local:
  - `DB_HOST=127.0.0.1`
  - `DB_PORT=55432`
  - `DB_DATABASE=backend_rifas_app`
- PostgreSQL desechable detrás del puerto `55432`

Nota importante: el `.env` del backend todavía apunta a `DB_HOST=postgres`, pero el proceso local que respondió en el smoke estaba levantado con variables de entorno sobrescritas. El runbook refleja el entorno que realmente contestó las requests.

## 3. Estados reales del juego

Estados confirmados en código:

- `draft`
- `published`
- `sales_open`
- `sales_closed`
- `running`
- `paused`
- `resolving`
- `completed`
- `cancelled`

No existe un estado `scheduled`. `scheduled_start_at` es un atributo, no un estado.

## 4. Matriz de transición

| Estado actual | Acción | Endpoint | Precondiciones principales | Estado resultante |
|---|---|---|---|---|
| `draft` | publicar | `POST /api/v1/admin/games/{game}/publish` | juego válido en draft | `published` |
| `published` | abrir ventas | `POST /api/v1/admin/games/{game}/open-sales` | transición válida | `sales_open` |
| `sales_open` | cerrar ventas | `POST /api/v1/admin/games/{game}/close-sales` | transición válida | `sales_closed` |
| `published`/`sales_open`/`sales_closed` | programar | `POST /api/v1/admin/games/{game}/schedule` | fecha futura; si existe `sales_closes_at`, debe ser posterior | mismo estado, cambia `scheduled_start_at` |
| `sales_closed` | iniciar | `POST /api/v1/admin/games/{game}/start` | ver sección 5 | `running` |
| `running` | pausar | `POST /api/v1/admin/games/{game}/pause` | solo si `auto_draw_enabled=true` | `paused` |
| `paused` | reanudar | `POST /api/v1/admin/games/{game}/resume` | solo si `auto_draw_enabled=true` | `running` |
| `running` | draw manual | `POST /api/v1/admin/games/{game}/draws` | solo en juego manual o draw automatizado interno | `running` o `completed` |
| `completed` | payout | `POST /api/v1/admin/games/{game}/winner/payout` | ganador real existente | `completed` |

## 5. Precondiciones reales para iniciar un juego

`POST /api/v1/admin/games/{game}/start`

El backend exige:

- estado actual `sales_closed`;
- `scheduled_start_at` no nulo;
- hora actual mayor o igual a `scheduled_start_at`;
- cero órdenes `pending`;
- cero órdenes `payment_submitted`;
- cero pagos `pending`;
- cero pagos `under_review`;
- cero reservas activas;
- cero números `reserved`;
- al menos una entry `confirmed`.

Razones reales de rechazo confirmadas por `CommerceGameStartReadinessChecker`:

- `has_pending_orders`
- `has_payment_submitted_orders`
- `has_pending_payments`
- `has_under_review_payments`
- `has_active_reservations`
- `has_reserved_numbers`
- `no_confirmed_entries`

## 6. Cómo se crea correctamente un bingo

Endpoint real:

- `POST /api/v1/admin/games`

Payload mínimo útil validado en smoke:

```json
{
  "slug": "runbook-1783646823",
  "name": "Runbook Smoke Game",
  "description": "Disposable game for B9",
  "number_min": 1,
  "number_max": 2,
  "hits_required": 2,
  "ticket_price_cents": 500,
  "prize_cents": 1000,
  "currency": "PEN",
  "draw_interval_seconds": 10,
  "auto_draw_enabled": false,
  "sales_opens_at": "2026-07-09T20:25:06+00:00",
  "sales_closes_at": "2026-07-09T20:26:06+00:00",
  "scheduled_start_at": "2026-07-09T20:27:16+00:00"
}
```

Al crear:

- el juego nace en `draft`;
- los `game_numbers` se generan de inmediato;
- todavía no es visible como juego vendible.

## 7. Flujo admin paso a paso

Paso real validado:

1. Crear juego en `draft`.
2. Publicar.
3. Abrir ventas.
4. Esperar a que existan entries confirmadas.
5. Cerrar ventas.
6. Esperar a que `scheduled_start_at` ya haya llegado.
7. Iniciar juego desde motor.
8. Ejecutar draws manuales si el juego es manual.
9. Consultar draws, counters y winner.
10. Si hay ganador real, registrar payout.

## 8. Flujo player paso a paso

Paso real validado:

1. Admin invita jugador con `POST /api/v1/admin/players`.
2. Jugador activa invitación con `POST /api/v1/auth/activate`.
3. Activar invitación no verifica correo.
4. Mientras siga `email_verified=false`, no puede:
   - reservar números;
   - subir evidencia de pago.
5. En smoke se usó `POST /api/v1/auth/reset-password` para completar verificación real del correo, porque ese contrato marca `email_verified_at` cuando está en `null`.
6. Jugador ya verificado reserva con `POST /api/v1/games/{gameId}/reservations`.
7. Jugador sube evidencia con `POST /api/v1/me/orders/{orderId}/payment-evidence`.
8. Cuando admin aprueba, aparecen entries reales en `GET /api/v1/me/entries`.

## 9. Flujo payment / entries

Reserva real:

- endpoint: `POST /api/v1/games/{gameId}/reservations`
- middleware: `auth:sanctum`, `verified`, `idempotent`
- header obligatorio: `Idempotency-Key`

Response real:

```json
{
  "data": {
    "order": {
      "id": "...",
      "game_id": "...",
      "status": "pending"
    },
    "numbers": [1],
    "game_number_ids": ["..."],
    "reservation_ids": ["..."],
    "payment": {
      "id": "...",
      "status": "pending"
    }
  }
}
```

Evidencia:

- endpoint: `POST /api/v1/me/orders/{orderId}/payment-evidence`
- middleware: `auth:sanctum`, `verified`, `idempotent`
- header obligatorio: `Idempotency-Key`
- estado resultante:
  - order `pending -> payment_submitted`
  - payment `pending -> under_review`

Aprobación admin:

- endpoint: `POST /api/v1/admin/payments/{paymentId}/approve`
- middleware: `auth:sanctum`, `admin`, `idempotent`
- header obligatorio: `Idempotency-Key`

Error contractual encontrado en smoke:

- si se omite `Idempotency-Key` en approve, el backend responde `400`.

Resultado aprobado:

- payment `under_review -> approved`
- order `payment_submitted -> paid`
- números `reserved -> sold`
- se crean `game_entries`
- se crean `purchase_allocations`
- se eliminan reservas activas

## 10. Qué pasa exactamente cuando el juego está iniciado

Response real validada de `start`:

```json
{
  "game_id": "019f49a4-2111-717c-9f47-ce04d69c5b27",
  "status": "running",
  "outcome": "started",
  "scheduled_start_at": "2026-07-09T20:28:50+00:00",
  "started_at": "2026-07-10T01:28:55+00:00",
  "confirmed_entries_count": 2
}
```

Al iniciar:

- estado pasa a `running`;
- `started_at` queda definido;
- `next_draw_at` solo aplica si el juego es automático;
- el motor ya acepta draws;
- el detalle admin muestra lifecycle y projection actualizados.

## 11. Sorteo manual

Endpoint real:

- `POST /api/v1/admin/games/{gameId}/draws`

Header obligatorio:

- `X-Draw-Command-Id` con UUID válido

Comportamiento confirmado:

- el backend elige el número;
- crea `game_draws`;
- actualiza `game_number_counters`;
- si el número dibujado pertenece a una entry confirmada, incrementa hits;
- si llega a `hits_required`, crea winner y completa el juego.

Ejemplo real sin ganador todavía:

- juego `runbook-1783646823`
- draw 1: número `2`
- draw 2: número `2`
- único número vendido era `1`
- resultado:
  - juego sigue `running`
  - `GET /winner` devuelve ausencia
  - counters:
    - número `1` vendido con `hits_count=0`
    - número `2` disponible con `hits_count=2`

Ejemplo real con ganador:

- juego `winner-runbook-1783646917`
- draws:
  - seq 1: número `2`, `winner_created=false`
  - seq 2: número `1`, `winner_created=false`
  - seq 3: número `1`, `winner_created=true`

Response real del draw ganador:

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

## 12. Sorteo automático

Existe en backend.

Base contractual confirmada:

- `auto_draw_enabled=true`
- scheduler en `routes/console.php`
- job principal: `DispatchDueGameDrawsJob`
- acción: `ExecuteScheduledGameDrawAction`

Comportamiento esperado:

- el juego corre por ticks;
- `next_draw_at` y `last_consumed_tick_at` se usan como reloj del motor;
- si hay ganador, el juego termina igual que en manual;
- `pause` y `resume` solo aplican a este modo.

En este bloque se validó la rama manual. La automática quedó confirmada por auditoría contractual, no por smoke de scheduler.

## 13. Draws, counters, winner y status

Rama sin ganador:

- status: `running`
- draws aumentan
- counters aumentan aunque el número no esté vendido
- winner sigue ausente

Rama con ganador:

- status final: `completed`
- `completed_at` queda definido
- winner queda embebido en detalle admin
- `GET /admin/games/{game}/winner` devuelve recurso real
- la entry ganadora pasa a estado winner

Winner real validado:

```json
{
  "winner_id": "019f49a4-5fcb-708f-88c0-b2763a8eba2b",
  "game_id": "019f49a4-2111-717c-9f47-ce04d69c5b27",
  "game_entry_id": "019f49a4-283f-71ff-8dd7-238b8773a68c",
  "game_number_id": "019f49a4-2116-7208-b8cd-ca82120eaaf9",
  "winning_number": 1,
  "winning_draw_sequence": 3,
  "winning_hits": 2,
  "user_id": 30
}
```

## 14. Qué ve el admin en `/admin/bingos/:gameId/motor`

Contractualmente, el admin obtiene:

- status real del juego;
- lifecycle (`started_at`, `paused_at`, `completed_at`);
- engine (`next_draw_at`, `last_consumed_tick_at`);
- latest draw;
- winner o ausencia;
- resumen de numbers;
- agregados de commerce;
- projection (`draws_total`, `distinct_drawn_numbers`, `max_counter_hits`, `last_drawn_number`).

Validación real:

- rama 1:
  - juego `running`
  - `winner=null`
  - `draws_total=2`
  - `max_counter_hits=2`
- rama 2:
  - juego `completed`
  - winner presente
  - `draws_total=3`
  - `entries.winner=1`

## 15. Qué ve el jugador antes, durante y después

Antes de pagar:

- catálogo y detalle público accesibles;
- `/public/games/{slug}/numbers` muestra disponibilidad real.

Después de reservar:

- existe order `pending`;
- el número queda `reserved`;
- la reserva aparece operativamente aunque aún no haya cartón confirmado.

Después de aprobar pago:

- `GET /me/orders` muestra order `paid`;
- `GET /me/entries` muestra entries `confirmed`;
- el número pasa a `sold`;
- `GET /me/reservations` termina vacío porque la reserva se consumió.

Durante el juego:

- el detalle público ya muestra `status=running`;
- `latest_draw` avanza;
- el número del jugador sigue `sold`.

Después del ganador:

- el juego público queda `completed`;
- el detalle admin muestra winner y payout ya no depende de mutaciones del jugador.

## 16. Cuándo aparece “Iniciar juego”

La UI sana debe ofrecerlo solo cuando el backend ya permitiría `POST /start`, es decir:

- juego en `sales_closed`;
- `scheduled_start_at` ya vencido;
- sin órdenes/pagos/reservas activas;
- con entries confirmadas.

Si no aparece todavía, la razón real normalmente será una de estas:

- todavía hay ventas abiertas;
- falta cerrar ventas;
- falta que llegue `scheduled_start_at`;
- todavía no hay entries confirmadas;
- queda al menos una order/pago/reserva en curso.

## 17. Cuándo se detecta ganador

Se detecta en el mismo draw que hace que una entry vendida alcance `hits_required`.

En la validación real:

- el ganador apareció en el draw `sequence=3`;
- `current_hits` llegó a `2`;
- `winner_created=true`;
- el juego cambió directamente a `completed`.

## 18. Cómo se conecta con payout

Payout real:

- endpoint: `POST /api/v1/admin/games/{gameId}/winner/payout`
- middleware: `auth:sanctum`, `admin`, `idempotent`
- header obligatorio: `Idempotency-Key`
- requiere:
  - juego `completed`
  - winner real existente

Payload mínimo validado:

```json
{
  "external_reference": "WINNER-PAYOUT-1783646917",
  "notes": "Winner payout runbook",
  "document": "<pdf>"
}
```

Resultado real validado:

- payout creado;
- documento asociado;
- `GET /admin/games/{game}/winner/payout` devuelve el mismo registro;
- replay idempotente devuelve `was_already_processed=true`.

## 19. Errores comunes

- `400` en approve:
  - faltó `Idempotency-Key`
- `403 email_not_verified` en reserva o evidencia:
  - el jugador activó invitación, pero todavía no verificó correo
- `422 game_not_ready_for_start`:
  - todavía existen órdenes, pagos, reservas o faltan entries confirmadas
- `404 game_winner_not_found`:
  - el juego sigue sin ganador

## 20. Datos smoke usados

Rama sin ganador todavía:

- juego: `runbook-1783646823`
- id: `019f49a2-af78-710d-ba8b-74d937395871`
- player: `runbook.player.1783646823@example.com`

Rama con ganador y payout:

- juego: `winner-runbook-1783646917`
- id: `019f49a4-2111-717c-9f47-ce04d69c5b27`
- player: `winner.player.1783646917@example.com`
- payout id: `019f49a4-6586-72e9-b30a-67ba43d98232`

## 21. Recomendaciones UX

- En frontend, el paso “activar invitación” debería dejar explícito que eso no equivale a correo verificado si el backend sigue marcando `email_verified=false`.
- Si admin intenta aprobar pago sin `Idempotency-Key`, conviene mantener el error visible como problema técnico de contrato, no como mensaje genérico.
- En motor, la ausencia de winner debe mostrarse como empty state honesto, no como error fatal.
- El CTA de inicio debe explicitar qué condición falta cuando el juego aún no puede arrancar.

## 22. Veredicto

`B9` quedó validado a nivel contractual y operativo.

Quedó demostrado con smoke real que:

- el juego puede crearse y recorrer su lifecycle sano;
- start depende de condiciones de commerce reales;
- el motor manual actualiza draws y counters correctamente;
- puede existir rama `running` sin winner;
- el winner se crea exactamente al alcanzar `hits_required`;
- el payout real queda disponible solo después de `completed`.
