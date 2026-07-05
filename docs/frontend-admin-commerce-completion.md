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

## Smoke real local

- Fecha: `2026-07-04` / `2026-07-05` (America/Lima)
- Entorno:
  - frontend: `http://localhost:4200`
  - backend: `http://localhost:8000`
  - DB local: PostgreSQL en Docker (`rifas_postgres`)
  - admin smoke: `smoke.admin@example.com`
  - player smoke: `smoke.player@example.com`
- Dataset desechable:
  - refund:
    - `order_id`: `019f2864-bbf4-7166-ae84-36996e95219c`
    - `payment_id`: `019f2864-bc3a-722e-90ba-a56e62d5fc01`
    - juego: `019f23c8-272e-716f-ad02-cb34ec5e1826`
    - estado inicial: orden `paid`, pago `approved`, sin refund
  - payout:
    - juego principal: `fd7800f4-88f7-44d3-9ab3-8d6a1518fd95`
    - `winner_id`: `5fa00db1-a1df-45a0-8102-4c8d7bc553b1`
    - juego auxiliar responsive: `bd331d69-874e-4e8b-86a6-a0d5ee3f6225`
    - estado inicial: juego `completed`, ganador real, sin payout

### Bug encontrado

- Los formularios de refund y payout hacÃ­an submit nativo.
- La SPA se recargaba.
- No se emitÃ­an los POST reales de refund/payout.

### Causa raÃ­z

- Se usaba `(ngSubmit)` en formularios sin `FormsModule` ni `[formGroup]` sobre el elemento `<form>`.
- El navegador ejecutaba el submit HTML nativo en lugar del flujo Angular controlado.

### Fix aplicado

- Submit controlado con `preventDefault()` en:
  - `admin-order-refund-card`
  - `admin-winner-payout-panel`
  - `admin-orders-page`
  - `admin-payment-detail-page`
- Regresiones explÃ­citas para refund y payout verificando que el submit DOM queda interceptado y no deriva en submit nativo.

### Refund smoke

- CancelaciÃ³n previa:
  - se abriÃ³ el panel en `/admin/ordenes`;
  - se cancelÃ³ sin recarga completa;
  - no hubo persistencia (`refund_count = 0`);
  - la URL permaneciÃ³ en `/admin/ordenes`.
- EjecuciÃ³n real:
  - la UI enviÃ³ el motivo `Smoke refund desde UI para orden descartable local.`;
  - el runtime backend registrÃ³ accesos al recurso `/api/v1/admin/orders/{order}/refund`;
  - la vista refrescÃ³ y la orden pasÃ³ a `Reembolsada`;
  - el botÃ³n cambiÃ³ a `Ver reembolso`;
  - el snapshot posterior mostrÃ³ monto, nÃºmeros `1, 2` y motivo persistido.
- Estado final:
  - orden `refunded`
  - pago `refunded`
  - `refund_id`: `019f3043-543a-7206-826c-bd3a38774926`
  - procesado por `user_id = 4`

### Payout smoke

- ValidaciÃ³n UI tras el fix:
  - el formulario ya no recarga la SPA al confirmar sin archivo;
  - la URL permanece en `/admin/bingos/{gameId}`;
  - aparece el error accesible `Adjunta la evidencia del payout.`
- Cierre UI real:
  - el archivo de evidencia se cargÃ³ manualmente en el navegador real;
  - el submit se ejecutÃ³ desde `/admin/bingos/bd331d69-874e-4e8b-86a6-a0d5ee3f6225` sin recarga completa de la SPA;
  - el botÃ³n pasÃ³ a `Registrando payoutâ€¦`;
  - el backend registrÃ³ el acceso al recurso `/api/v1/admin/games/{game}/winner/payout`;
  - la UI refrescÃ³ a estado `Payout registrado`.
- VerificaciÃ³n posterior en UI:
  - el panel final mostrÃ³ `Payout registrado`;
  - se reflejaron referencia `SMOKE-PAYOUT-UI-MANUAL-001`, mÃ©todo `manual`, fecha procesada, `smoke-payment-evidence.pdf` y las notas persistidas.
- Estado final:
  - `payout_id`: `019f3059-38c3-7344-9fb3-898210bc33b1`
  - `game_winner_id`: `fb0f1970-2306-4983-a595-4974803d3648`
  - `document`: `smoke-payment-evidence.pdf`
  - procesado por `user_id = 4`

### AutorizaciÃ³n

- Verificado por API real local:
  - anÃ³nimo -> `GET /api/v1/auth/me` responde `401`
  - player -> refund admin responde `403`
  - player -> payout admin responde `403`

### Idempotencia

- Refund:
  - la UI terminÃ³ mostrando snapshot persistido del refund;
  - el backend mantuvo un solo registro terminal para la orden.
- Payout:
  - el POST real local se ejecutÃ³ con `Idempotency-Key`;
  - el panel posterior reflejÃ³ un solo payout persistido para el `game_winner_id`.
- No se imprimieron claves completas en el reporte.

### Responsive

- Breakpoints revisados:
  - `360px`
  - `390px`
  - `768px`
  - `1024px`
  - `1280px`
  - `1440px`
- Resultado:
  - sin overflow horizontal global en la mediciÃ³n previa del detalle admin (`360/390/768/1024/1280/1440`);
  - el detalle admin quedÃ³ endurecido con `min-width: 0`, `overflow-wrap: anywhere` y grids `auto-fit`;
  - el panel de payout, refund y nÃºmeros administrativos ahora ocupan mejor el ancho disponible;
  - `ConfiguraciÃ³n tÃ©cnica` ya no muestra `null` crudo y usa un empty state honesto.

## QA visual y responsive

- Rutas objetivo:
  - `/admin/bingos/:gameId`
  - componente `Payout del ganador`
  - secciÃ³n `ConfiguraciÃ³n tÃ©cnica`
  - secciÃ³n `NÃºmeros administrativos`
  - componentes de refund en `/admin/ordenes` y `/admin/pagos/:paymentId`
- Problemas encontrados:
  - el panel `Payout del ganador` distribuÃ­a mal las columnas y partÃ­a pobremente referencia/evidencia;
  - `ConfiguraciÃ³n tÃ©cnica` imprimÃ­a `null` como contenido crudo;
  - `NÃºmeros administrativos` no ocupaba todo el ancho del grid padre;
  - el resumen de refund quedaba demasiado estrecho y con wrapping insuficiente.
- Correcciones aplicadas:
  - `app-admin-game-numbers-panel` ahora ocupa una columna completa del grid padre y expone host block-level;
  - payout/refund usan grids `repeat(auto-fit, minmax(min(100%, 12rem), 1fr))` para tarjetas y resÃºmenes;
  - textos largos y feedbacks quedaron endurecidos con `min-width: 0`, `max-width: 100%`, `overflow-wrap: anywhere` y `word-break: break-word`;
  - `ConfiguraciÃ³n tÃ©cnica` muestra `Sin configuraciÃ³n tÃ©cnica registrada.` cuando backend devuelve `null`;
  - el resumen de capacidad usa `auto-fit` y el detalle admin alinea mejor paneles altos.
- ValidaciÃ³n funcional mantenida:
  - refund sigue usando submit interceptado con `preventDefault()`;
  - payout sigue usando submit interceptado con `preventDefault()`;
  - la UI de payout ya cerrÃ³ en smoke real con `Payout registrado`;
  - no se reabriÃ³ el loop de `/numbers` porque `untracked(...)` sigue presente en `AdminGameNumbersPanel`.

## Validación visual final post-fix

- Fecha: `2026-07-05`
- Navegador usado: `Google Chrome` real local con perfil temporal limpio
- Rutas revisadas:
  - `/admin/bingos/bd331d69-874e-4e8b-86a6-a0d5ee3f6225`
  - `/admin/bingos/fd7800f4-88f7-44d3-9ab3-8d6a1518fd95`
  - `/admin/ordenes`
  - `/admin/pagos`
  - `/admin/pagos/019f2864-bc3a-722e-90ba-a56e62d5fc01`
  - `/admin/bingos/bd331d69-874e-4e8b-86a6-a0d5ee3f6225/motor`
- Breakpoints revisados:
  - `360px`
  - `390px`
  - `768px`
  - `1024px`
  - `1280px`
  - `1440px`
- Resultado visual:
  - sin overflow horizontal en todas las rutas auditadas;
  - `Payout del ganador` quedó visible y estable; el detalle con payout persistido mostró `Payout registrado`;
  - referencia, evidencia y notas quedaron contenidas sin romper layout;
  - `Configuración técnica` ya no muestra `null` crudo y presenta `Sin configuración técnica registrada.`;
  - `Números administrativos` ocupa correctamente el ancho del contenedor;
  - refund card visible en `/admin/ordenes` y en `/admin/pagos/:paymentId`, sin quedar estrecha;
  - el panel de refund se abrió sin cambiar la URL (`/admin/ordenes` se mantuvo estable);
  - lifecycle, payout y motor permanecen separados visualmente;
  - no hubo pantalla blanca.
- Consola:
  - sin errores nuevos de `console`;
  - sin `pageerror` en la pasada final.
- Requests:
  - `/api/v1/admin/games/bd331d69-874e-4e8b-86a6-a0d5ee3f6225/numbers` registró una sola `GET 200` en la comprobación larga, sin loop.

### Resultados finales

- `npm test -- --watch=false`:
  - `49` archivos en verde
  - `421` tests en verde
- `npm run build`:
  - verde
  - se mantiene el warning preexistente de budget SCSS en `number-selection-page`
- `npm run lint`:
  - no existe script `lint`
- `git diff --check`:
  - sin errores de diff; Git mostrÃ³ solo warnings `LF -> CRLF`

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
