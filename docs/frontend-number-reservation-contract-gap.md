# Bloque 2 - Brecha contractual para reserva real de numeros

## Estado actual

El frontend ya consume contratos reales del backend vecino `../backend_rifas_app`:

- `GET /api/v1/public/games/{slug}` expone el UUID real del juego publico.
- `GET /api/v1/public/games/{slug}/numbers` expone solamente `{ number, status }`.
- `POST /api/v1/games/{game}/reservations` exige autenticacion Sanctum, header `Idempotency-Key` y `game_number_ids` como UUIDs reales.

Con el contrato publico actual, el frontend puede conocer:

- el `game.id` real del bingo;
- el numero visible (`number`);
- el estado visible (`status`).

Pero no puede conocer:

- el `game_number_id` real de cada casilla disponible.

## Evidencia backend

1. El recurso publico del juego si expone `id`:
   - `../backend_rifas_app/app/Modules/RepeatNumberBingo/Presentation/Http/Resources/PublicGameResource.php`
2. El recurso publico de numeros omite deliberadamente `id` y `game_id`:
   - `../backend_rifas_app/app/Modules/Commerce/Presentation/Http/Resources/Public/PublicGameNumberResource.php`
3. El test del backend fija esa omision como contrato:
   - `../backend_rifas_app/tests/Feature/Commerce/PublicGameNumbersTest.php`
4. La reserva valida `game_number_ids.*` como UUIDs distintos:
   - `../backend_rifas_app/app/Modules/Commerce/Presentation/Http/Requests/Player/ReserveGameNumbersRequest.php`
5. La ruta de reserva es autenticada e idempotente:
   - `../backend_rifas_app/routes/api.php`
   - `../backend_rifas_app/app/Http/Middleware/EnsureIdempotencyKeyHeader.php`

## Por que no se puede implementar desde frontend

No es valido derivar `game_number_id` desde el numero visible. El numero visible es un valor de negocio (`1`, `2`, `3`, etc.) y el backend trabaja con UUIDs internos de `game_numbers`.

Tampoco es aceptable:

- usar endpoints admin para poblar el flujo del jugador;
- inventar UUIDs;
- mapear `number -> uuid` con suposiciones locales;
- cambiar backend desde este bloque frontend.

Eso convertiria la reserva en un flujo falso y romperia el objetivo del bloque.

## Cambio minimo requerido en backend

Se necesita un contrato publico o player-safe que entregue, como minimo, para cada numero reservable:

```json
{
  "id": "uuid-real-de-game-number",
  "number": 17,
  "status": "available"
}
```

Opciones validas:

1. Extender `PublicGameNumberResource` para incluir `id`.
2. Crear un endpoint publico/player-safe especifico para seleccion autenticada que entregue `id`, `number` y `status`, sin filtrar datos sensibles.

El cambio minimo recomendado es exponer solo `id`, `number` y `status`. No hace falta exponer `game_id`, `order_id`, `payment_id`, `reservation_id`, identidad del usuario ni timestamps.

## Pruebas backend requeridas para cerrar la brecha

- Actualizar `PublicGameNumbersTest` para reflejar el nuevo contrato permitido.
- Mantener aserciones que sigan prohibiendo fugas de `user_id`, `order_id`, `payment_id`, `reservation_id` e identidad del propietario.
- Agregar o ajustar cobertura para confirmar que el frontend puede reservar usando los UUIDs reales entregados por el contrato publico/player-safe.

## Impacto frontend cuando exista el contrato

Cuando backend exponga los `game_number_id` reales:

1. `HttpGameNumbersRepository` podra mapear `gameNumberId` con un valor real.
2. `reservationSupported` podra pasar a `true` solo cuando el contrato lo garantice.
3. El facade podra habilitar el CTA de reserva sin relajar validaciones.
4. Recién ahi se implementara el POST autenticado con `Idempotency-Key`, manejo de `401/403/409/422` y bloqueo optimista del CTA.

## Punto exacto de corte

La implementacion del Bloque 2 debe detenerse aqui.

El frontend actual ya hace lo correcto:

- muestra disponibilidad real;
- bloquea el CTA de reserva;
- no inventa `game_number_id`;
- deja visible la razon contractual del bloqueo.

Hasta que backend entregue los IDs reales permitidos para cada numero, no existe base tecnica segura para implementar la reserva real de numeros.

## Resolucion del bloqueo

- Fecha de resolucion: 2026-06-25, Bloque 2 frontend.
- Cambio backend aplicado en `../backend_rifas_app`:
  - `GET /api/v1/public/games/{slug}/numbers` ahora devuelve `{ id, number, status }`.
  - El `id` expuesto es el UUID real de `game_numbers` aceptado por `game_number_ids`.
- Contrato nuevo confirmado:

```json
{
  "id": "uuid-real-de-game-number",
  "number": 17,
  "status": "available"
}
```

- Estado de implementacion frontend:
  - el mapper publico ya consume `id`, `number` y `status`;
  - la seleccion conserva UUIDs reales;
  - la reserva real usa `POST /api/v1/games/{game}/reservations`;
  - el submit envia `game_number_ids` reales e `Idempotency-Key`;
  - la pagina ya no muestra el mensaje de contrato bloqueado.
