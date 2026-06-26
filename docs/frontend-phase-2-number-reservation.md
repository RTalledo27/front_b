# Frontend Phase 2 - Number Reservation

## Alcance

Este bloque conecta la pantalla publica `/bingos/:slug/numeros` con la reserva real de numeros del backend.

Incluye:

- consumo del contrato publico `{ id, number, status }`;
- seleccion con UUIDs reales de `game_numbers`;
- submit autenticado de reserva;
- estrategia de `Idempotency-Key`;
- manejo de usuario anonimo con `returnUrl`;
- refresh de disponibilidad despues de exito o conflicto;
- cobertura automatizada del flujo.

No incluye pagos, evidencias, aprobaciones, dashboards, OAuth ni cambios backend.

## Endpoints

- `GET /api/v1/public/games/{slug}`
- `GET /api/v1/public/games/{slug}/numbers`
- `POST /api/v1/games/{gameId}/reservations`
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/logout`

## Modelos

- `PublicGame` conserva el UUID real del juego.
- `GameNumberOption` conserva:
  - `key`
  - `gameNumberId`
  - `number`
  - `status`
- `NumberReservationApiDto` refleja el `ReserveGameNumbersResource` real del backend.

## Autenticacion

- La grilla publica sigue siendo accesible sin sesion.
- La reserva real depende del interceptor Bearer existente.
- Si el usuario es anonimo al intentar reservar:
  - no se ejecuta el POST;
  - se redirige a `/login`;
  - se conserva `returnUrl` interno seguro;
  - la seleccion se guarda solo en memoria de la pestaña actual.

## Idempotencia

- Se usa un servicio centralizado para modelar el intento logico de reserva.
- El intento se define por:
  - usuario;
  - juego;
  - conjunto canonico de `game_number_ids`.
- La misma seleccion reutiliza la misma clave.
- Una seleccion distinta o un juego distinto generan una clave nueva.
- Logout o cambio de usuario limpian el intento pendiente.
- Exito limpia la clave.
- Conflictos definitivos limpian la clave y permiten construir un intento nuevo.
- Errores de red conservan la clave.
- `425 idempotency_in_progress` conserva la clave y permite reintentar el mismo submit logico sin abrir uno nuevo.

## Concurrencia

- El frontend asume que la disponibilidad puede cambiar entre carga y submit.
- Cuando backend responde con no disponibilidad:
  - no se marca exito;
  - se refresca la grilla;
  - se elimina de la seleccion lo que ya no esta disponible;
  - se conservan los numeros aun disponibles.

## Estados frontend

Vista:

- `idle`
- `loading`
- `loaded`
- `refreshing`
- `networkError`
- `unexpectedError`

Reserva:

- `idle`
- `submitting`
- `success`
- `conflict`
- `validationError`
- `unauthorized`
- `forbidden`
- `rateLimited`
- `networkError`
- `unexpectedError`

## Errores

Se mapean solo contratos reales:

- `401`: sesion expirada o ausente;
- `403`: prohibido;
- `409`: conflicto de idempotencia;
- `425`: intento idempotente aun en proceso;
- `422`: validacion o dominio;
- `429`: rate limit;
- `0`: error de red;
- otros: error inesperado.

## UI

- La seleccion usa botones reales con soporte de click y teclado.
- La pagina muestra estados de disponibilidad reales.
- El CTA cambia entre:
  - `Ingresar para reservar`
  - `Reservar selección`
  - `Reservando…`
- El mensaje antiguo de brecha contractual fue retirado.
- Se usa `aria-live` para feedback importante.

## Pruebas

Cobertura añadida o actualizada:

- mapper del contrato publico;
- repo HTTP de reserva;
- servicio de idempotencia;
- facade de seleccion/reserva;
- pagina de seleccion.

## Hardening de aceptacion

- 2026-06-25: la firma idempotente paso a canonizar el conjunto de UUIDs con deduplicacion, para que entradas equivalentes no abran intentos distintos.
- 2026-06-25: el facade ahora ignora respuestas tardias de reserva cuando el usuario ya cambio de juego o la sesion ya no coincide con el submit original.
- 2026-06-25: el frontend distingue `425 idempotency_in_progress` de conflictos reales y conserva la misma clave para retry seguro.
- 2026-06-25: se agregaron pruebas explicitas para replay idempotente exitoso y para respuestas tardias tras cambio de juego o logout.

## Comandos

- `npm test -- --watch=false`
- `npm run build`
- `git diff --check`
- `git status --short`

## Fuera de alcance

- pago de la reserva;
- evidencia de pago;
- aprobacion o rechazo administrativo;
- OAuth y Socialite;
- rediseño general;
- cambios backend.

## Siguiente bloque

El siguiente bloque recomendado debe concentrarse en el detalle operativo posterior a la reserva ya existente en player commerce, sin mezclarlo con pagos u otras mutaciones fuera de Fase 2.

## Continuidad posterior

La continuidad post-reserva de este bloque quedó documentada en `docs/frontend-phase-2-post-reservation.md`.

## Cierre integral

El cierre integral de Fase 2 quedó documentado en `docs/frontend-phase-2-closure.md`.
