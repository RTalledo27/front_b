# Frontend Admin Commerce Completion

## Alcance

Bloque cerrado en `frontend_rifas_app` sin modificar `../backend_rifas_app`.

Incluye:

- refund administrativo de órdenes;
- lectura de refund existente;
- payout administrativo del ganador;
- lectura de payout existente;
- idempotencia frontend para ambos comandos;
- integración desde `/admin/ordenes`, `/admin/pagos/:paymentId` y `/admin/bingos/:gameId`;
- pruebas automáticas y hardening de sesión/contexto.

No incluye:

- cambios backend;
- reportes;
- dashboards;
- nuevas pantallas de identidad;
- descargas inventadas de evidencia privada de payout.

## Decisión

Decisión `C1 — Commerce completion completo`.

Motivo:

- el backend confirma `POST` y `GET` para refund;
- el backend confirma `POST` y `GET` para winner payout;
- ambos contratos tienen tests de feature e integración, más idempotencia real;
- el frontend podía integrarlos sin abrir nuevas features fuera de commerce/admin.

## Contratos auditados

### Refund order

- `POST /api/v1/admin/orders/{order}/refund`
- `GET /api/v1/admin/orders/{order}/refund`
- request real: `reason` obligatorio, `string`, `min:10`, `max:1000`
- header obligatorio: `Idempotency-Key`
- policy: `OrderPolicy::refund` solo admin
- estados válidos:
  - orden `paid`
  - pago `approved`
  - juego `sales_open`, `sales_closed` o `cancelled`
- invariantes:
  - refund total
  - no parcial
  - con motivo
  - idempotente
  - prohibido si la entrada es ganadora
- errores backend confirmados:
  - `400` sin `Idempotency-Key`
  - `401`
  - `403`
  - `404`
  - `409 idempotency_key_mismatch`
  - `422 order_not_refundable` con `reason` como `order_not_paid`, `payment_not_approved`, `game_not_refundable`
  - `422 winner_entry_not_refundable`

### Winner payout

- `POST /api/v1/admin/games/{game}/winner/payout`
- `GET /api/v1/admin/games/{game}/winner/payout`
- request real:
  - `external_reference` obligatorio, `string`, `max:500`
  - `notes` opcional, `string`, `max:2000`
  - `document` obligatorio, `pdf|jpg|jpeg|png`, `max:10240`
- header obligatorio: `Idempotency-Key`
- autorización real: admin (`ProcessWinnerPayoutRequest`)
- estado requerido:
  - juego `completed`
  - ganador real existente
- invariantes:
  - payout único
  - método backend `manual`
  - monto tomado de `game.prize_cents`
  - documento privado, sin exponer disk/path/sha
- errores backend confirmados:
  - `400` sin `Idempotency-Key`
  - `401`
  - `403`
  - `404 payout_not_found` en `GET`
  - `409 idempotency_key_mismatch`
  - `422 payout_not_processable` con `reason` como `game_not_completed` o `winner_not_found`
  - `422` por validación de `external_reference` o `document`

## Payloads

### Refund

```json
{
  "reason": "Texto obligatorio de 10 a 1000 caracteres"
}
```

### Winner payout

`multipart/form-data`

- `external_reference`
- `notes` opcional
- `document`

## Idempotencia

- el frontend genera la clave solo al confirmar el comando;
- reusa la misma clave si ocurre error de red o fallo inesperado;
- limpia la clave en éxito;
- limpia la clave en `401`, `403`, `404`, `409` y `422`;
- bloquea doble submit;
- descarta respuestas tardías si cambia el contexto (`orderId` o `gameId`) o la sesión;
- al cambiar de usuario o hacer logout se limpia el intento pendiente del facade.

## Repository y mappers

Se añadieron:

- `refundOrder(orderId, payload, key)`
- `getOrderRefund(orderId)`
- `processWinnerPayout(gameId, payload, key)`
- `getWinnerPayout(gameId)`

Se añadieron mappers defensivos para:

- `RefundResource`
- `WinnerPayoutResource`

El mapper valida:

- envelope `data`
- enteros y arreglos esperados
- fechas ISO
- nullables reales
- payloads incompletos como error controlado `invalid_payload`

## Facades

Se añadieron dos facades específicos:

- `AdminOrderRefundFacade`
- `AdminWinnerPayoutFacade`

Cobertura de comportamiento:

- carga de snapshot existente;
- submit con estado finito;
- refresh posterior automático;
- fallback seguro si el refresh falla;
- doble submit bloqueado;
- conservación o limpieza correcta de la clave idempotente;
- descarte de respuestas tardías por cambio de ruta o logout.

## UI

### Refund

- botón y panel reusable en `/admin/ordenes`;
- mismo flujo reusable dentro de `/admin/pagos/:paymentId`;
- confirmación fuerte con motivo obligatorio;
- feedback `aria-live`;
- snapshot de refund si ya existe;
- no muestra el botón si la orden/pago no cumplen el contrato visible.

### Winner payout

- panel dedicado dentro de `/admin/bingos/:gameId`;
- separado del lifecycle administrativo y del motor;
- usa el ganador real ya expuesto por el detalle admin del juego;
- muestra premio, usuario ganador y estado de payout;
- usa `multipart/form-data` con archivo real;
- no inventa endpoint de descarga para evidencia privada.

## Autorización

- la UI sigue dentro de rutas admin ya protegidas;
- el backend permanece como autoridad final;
- los errores `401` y `403` quedan diferenciados en el estado del comando.

## Tests

Cobertura añadida:

- `src/app/features/admin-commerce/data-access/admin-commerce.repository.spec.ts`
- `src/app/features/admin-commerce/data-access/admin-commerce.mapper.spec.ts`
- `src/app/features/admin-commerce/data-access/admin-commerce.facades.spec.ts`
- `src/app/features/admin-commerce/components/admin-order-refund-card/admin-order-refund-card.spec.ts`
- `src/app/features/admin-commerce/components/admin-winner-payout-panel/admin-winner-payout-panel.spec.ts`

Se mantuvo en verde la suite completa del frontend.

## Smoke manual

No se ejecutaron mutaciones reales en datos locales porque este bloque se cerró con contratos backend confirmados, build verde y suite completa en verde, y la instrucción del bloque prohíbe acciones mutantes fuera de datos desechables explícitos.

## Riesgos pendientes

- el backend devuelve `400` cuando falta `Idempotency-Key`; el frontend evita ese caso, pero la UI no distingue un estado especial para `400` y lo trata como error inesperado si ocurriera por otra causa;
- `admin-commerce` previo sigue usando DTOs directos para listados y detalle de pago; el hardening nuevo se aplicó a refund y payout, que eran los contratos críticos de este bloque;
- `npm run lint` no existe en el repo.

## Fuera de alcance

- refund parcial;
- payout con descarga de evidencia;
- reportes admin;
- dashboard;
- nuevos endpoints backend;
- cambios en player home o identidad.

## Siguiente bloque recomendado

QA/smoke integral Angular + Laravel con datos desechables explícitos, ahora que lifecycle admin, engine y commerce admin ya están conectados a contratos reales.
