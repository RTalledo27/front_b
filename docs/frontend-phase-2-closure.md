# Frontend Phase 2 - Closure Audit

Fecha: 2026-06-26

Base frontend auditada: `0436bcd`
Base backend auditada: `d254118`

## Objetivo

Cerrar Fase 2 frontend sin abrir nuevas pantallas ni nuevos alcances, verificando contra el backend real:

- autenticación local;
- reserva pública con UUIDs reales;
- idempotencia y concurrencia;
- continuidad en órdenes, reservas y participaciones;
- carga de evidencia;
- expiración;
- seguridad y aislamiento;
- accesibilidad;
- smoke real con Angular y Laravel levantados.

## Estado de worktrees al auditar

Frontend:

- branch: `master`
- worktree sucio antes del cierre por trabajo previo de Fase 2
- sin `lint` script en `package.json`

Backend:

- branch: `main`
- worktree sucio antes del cierre por trabajo fuera de este bloque
- no se modificó código backend durante este cierre

## Matriz de subbloques

- Reserva pública con UUIDs reales: aceptado
- Idempotencia de reserva: aceptado
- Concurrencia de reserva: aceptado
- Continuidad post-reserva en órdenes: aceptado
- Reservas activas: aceptado
- Participaciones confirmadas: aceptado
- Evidencia de pago: aceptado
- Expiración: aceptado
- Seguridad frontend y aislamiento de navegación: aceptado con riesgo de entorno backend
- Accesibilidad principal de Fase 2: aceptado

## Contratos revalidados

Backend confirmado contra rutas, requests, resources y tests:

- `GET /api/v1/public/games/{slug}`
- `GET /api/v1/public/games/{slug}/numbers`
- `POST /api/v1/games/{game}/reservations`
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/logout`
- `GET /api/v1/me/orders`
- `GET /api/v1/me/orders/{order}`
- `GET /api/v1/me/reservations`
- `GET /api/v1/me/entries`
- `POST /api/v1/me/orders/{order}/payment-evidence`

Recursos reales usados por frontend:

- público de números: `{ id, number, status }`
- reserva: `ReserveGameNumbersResource`
- detalle player-safe: `PlayerOrderDetailResource`
- evidencia: `SubmitPaymentEvidenceResource`

## Correcciones puntuales de cierre

- Se preserva el draft de selección cuando un submit autenticado falla con `401`, para volver desde login sin perder números.
- Se limpia el draft en logout explícito tanto en `PlayerShell` como en `AdminShell`.
- Se retiró el copy residual que seguía insinuando una “vista previa” o reserva bloqueada.
- Se restauraron textos visibles a UTF-8 correcto; no se aceptó la degradación a ASCII del español de UI.

## Revisión específica del facade de selección

La reescritura completa de `number-selection.facade.ts` fue necesaria porque el archivo había quedado en un estado incómodo para parcheo fino en Windows tras conflictos de contenido y encoding en terminal. En vez de encadenar parches frágiles sobre texto ya degradado, se rehizo el archivo completo conservando la misma lógica y luego se reforzó con regresión explícita.

La cobertura nueva demuestra que no se perdió semántica aprobada:

- replay/retry exitoso con la misma `Idempotency-Key` tras error de red;
- retry seguro con la misma `Idempotency-Key` tras `425 idempotency_in_progress`;
- `409` limpia el intento y obliga a abrir una clave nueva;
- reconciliación parcial tras `422 number_not_available_for_reservation`;
- bloqueo de doble submit concurrente;
- descarte de respuestas tardías tras cambio de juego;
- descarte de respuestas tardías tras logout;
- preservación de draft tras `401`.

## Smoke real

Servicios levantados y respondiendo:

- Angular: `http://localhost:4300`
- Laravel: `http://127.0.0.1:8000`

Smoke contractual confirmado contra backend vivo:

- login real de `smoke-player@example.com`
- `GET /api/v1/auth/me` autenticado y luego `401` tras logout
- lectura pública de juego y números con UUIDs reales
- reserva exitosa con orden `pending` y pago `pending`
- replay lógico con mismo payload y misma clave, devolviendo el mismo resultado
- `409 idempotency_key_mismatch` con misma clave y payload distinto
- `422 number_not_available_for_reservation` al reintentar sobre número ocupado
- detalle de orden real tras reservar
- subida válida de JPEG y PDF
- replay idempotente de evidencia
- `409` de evidencia con misma clave y archivo distinto
- detalle de orden actualizado a `payment_submitted` con pago `under_review`

Smoke visual:

- se había verificado previamente en navegador interno la carga de catálogo, detalle y copy real de selección;
- un rerun automatizado con Playwright no pudo completarse en esta máquina porque falta el binario de Chromium del runtime local.

## Seguridad y aislamiento

Aceptado en frontend:

- la grilla pública sigue siendo pública;
- la mutación real requiere sesión;
- `returnUrl` se mantiene interno;
- la selección anónima vive solo en memoria de la pestaña;
- logout limpia draft e intento idempotente.

Hallazgo de entorno/backend observado durante smoke:

- en respuestas negativas `403` y `404` de evidencia, el backend local devolvió payloads verbosos de excepción propios de modo debug.
- esto no es un bug del frontend, pero sí un riesgo operativo si una configuración equivalente llegara a entornos no locales.

## Accesibilidad

Verificado en el alcance de Fase 2:

- `aria-live` para feedback importante;
- CTA coherente con autenticación y submit;
- navegación con botones reales en la selección;
- copy honesto sin prometer acciones inexistentes;
- shells con etiquetas ARIA visibles en UTF-8 correcto.

## Warning CSS

Permanece un warning preexistente de presupuesto SCSS en `number-selection-page`:

- budget: `4.00 kB`
- total actual: `4.54 kB`
- exceso: `535 bytes`

No se modificó en este cierre porque no afecta el contrato ni el comportamiento de Fase 2.

## Pruebas ejecutadas

Frontend:

- `npm test -- --watch=false`
- `npm run build`

Backend focalizado:

- `php artisan test tests/Feature/Commerce/ReserveGameNumbersTest.php tests/Feature/Commerce/PlayerQueriesTest.php tests/Feature/Commerce/SubmitPaymentEvidenceTest.php tests/Feature/Commerce/ExpireOrderTest.php tests/Feature/Commerce/CancelOrderTest.php tests/Integration/Commerce/ReserveGameNumbersConcurrencyTest.php tests/Integration/Commerce/ExpireOrderConcurrencyTest.php tests/Integration/Commerce/SubmitPaymentEvidenceCompensationTest.php --compact`

Backend integral:

- `php artisan test --compact`

## Riesgos aceptados

- warning SCSS de presupuesto en `number-selection-page`
- limitación local para rerun automatizado visual con Playwright sin Chromium instalado
- respuestas negativas de evidencia con salida verbosa en backend local por configuración/debug del entorno

## Decisión de cierre

Fase 2 frontend queda cerrada para el alcance pedido, con riesgos aceptados no bloqueantes del entorno y sin aperturar nuevas pantallas de continuidad `under_review`.

## Siguiente fase recomendada

La siguiente fase sana debe concentrarse en superficies posteriores a Fase 2 que realmente existan por contrato y producto, sin mezclar pagos nuevos ni mutaciones backend fuera del alcance confirmado.
