# Frontend Phase 2 - Post Reservation Continuity

## Alcance

Este bloque conecta el resultado exitoso de la reserva con las superficies existentes de `player-commerce`, sin agregar mutaciones nuevas ni cambiar el backend.

Incluye:

- continuidad desde `ReserveGameNumbersResource` hacia una orden real;
- listado de compras con contrato backend confirmado;
- detalle player-safe de orden/reserva;
- vistas honestas para reservas activas y participaciones confirmadas;
- manejo explicito de `401`, `403`, `404`, red y error inesperado;
- endurecimiento del enlace desde la reserva solo cuando `order.id` es utilizable;
- cobertura automatizada de mappers y paginas clave.

No incluye pagos, evidencias, cancelaciones, aprobaciones administrativas, OAuth ni cambios backend.

## Contrato backend consumido

- `GET /api/v1/me/orders`
- `GET /api/v1/me/orders/{order}`
- `GET /api/v1/me/reservations`
- `GET /api/v1/me/entries`
- `ReserveGameNumbersResource`

## Decision funcional

Se aplica `Caso A`:

- la respuesta de reserva ya entrega `order.id` real;
- existe un endpoint player-safe de detalle para esa orden;
- la continuidad debe reutilizar esas superficies en modo lectura.

## Modelos frontend

- `PlayerOrderSummary`
- `PlayerOrderDetailView`
- `PlayerReservationView`
- `PlayerEntryView`
- `PlayerCommerceViewStatus`

Todos derivan de DTOs reales y evitan inventar referencias sinteticas o campos no expuestos por el backend.

## Reglas de honestidad contractual

- el listado de ordenes muestra `reference = id` real;
- el detalle de orden no inventa `created_at`, porque el backend no lo expone en `PlayerOrderDetailResource`;
- el listado de ordenes no inventa nombre de juego cuando solo existe `game_id`;
- el enlace post-reserva al detalle solo aparece si `order.id` existe y no esta vacio.

## Estados frontend

Lectura:

- `idle`
- `loading`
- `loaded`
- `empty`
- `unauthorized`
- `forbidden`
- `notFound`
- `networkError`
- `unexpectedError`

## UI

- las vistas de compras y detalle son solo lectura;
- se retiraron de este bloque las acciones de evidencia y cancelacion;
- el detalle muestra continuidad operativa con el siguiente paso contractual;
- se mantiene `aria-live` en el feedback importante de la reserva;
- las vistas de error diferencian autenticacion, prohibicion y recurso no disponible.

## Pruebas

Cobertura añadida o actualizada:

- `player-commerce.mapper.spec.ts`
- `player-orders-page.spec.ts`
- `player-order-detail-page.spec.ts`
- `number-selection-page.spec.ts`

## Comandos

- `npm test -- --watch=false`
- `npm run build`
- `git diff --check`
- `git status --short`

## Siguiente bloque

El siguiente bloque recomendado debe concentrarse en el flujo operativo posterior ya soportado por backend, pero solo si se define explicitamente que mutaciones player-safe siguen dentro de alcance.

Para la carga real de evidencia de pago en Fase 2, consultar `docs/frontend-phase-2-payment-evidence.md`.

## Cierre integral

El cierre integral de Fase 2 quedó documentado en `docs/frontend-phase-2-closure.md`.
