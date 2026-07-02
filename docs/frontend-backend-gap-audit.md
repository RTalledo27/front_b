# Frontend-Backend Gap Audit

## Resumen ejecutivo

El frontend ya no está “vacío”: tiene una base real y testeada para identidad local, catálogo público, reserva de números, commerce del jugador, lectura administrativa de juegos, pagos administrativos y consola técnica del motor. La brecha principal ya no es “hacer frontend”, sino completar dominios backend reales que todavía no están expuestos o están expuestos solo en lectura parcial.

La estrategia recomendada es dejar de abrir microbloques inconexos y pasar a bloques verticales por dominio, siempre contra contratos Laravel reales. El backend debe seguir siendo la fuente de verdad; el frontend debe priorizar UX clara, estados finitos, paginación real y hardening de sesión/autorización.

## Estado backend

- Repo: `../backend_rifas_app`
- Branch base: `main`
- Commit base: `6dbf1e3 chore: improve local backend runtime latency`
- Worktree: sucio por trabajo ajeno en outbox/notificaciones/tests; no fue modificado desde esta auditoría
- Rutas API `v1` detectadas: `57`
- Dominios por prefijo:
  - `admin`: `28`
  - `auth`: `16`
  - `games`: `1`
  - `me`: `6`
  - `public`: `5`
  - `user`: `1`
- Middleware reales observados:
  - `auth:sanctum`
  - `admin` (`EnsureUserIsAdmin`)
  - `verified` (`EnsureEmailIsVerified`)
  - `idempotent` (`EnsureIdempotencyKeyHeader`)
  - throttles de auth/social/admin create-player
- Policies reales registradas en `AppServiceProvider`:
  - `GamePolicy`
  - `OrderPolicy`
  - `PaymentPolicy`

## Estado frontend

- Repo: `frontend_rifas_app`
- Branch base: `master`
- Commit base: `16d64e8 fix: stabilize auth session routing and player commerce loading`
- Worktree inicial: limpio
- Features detectadas:
  - `admin`
  - `admin-commerce`
  - `admin-games`
  - `auth`
  - `errors`
  - `game-engine`
  - `game-numbers`
  - `player`
  - `player-commerce`
  - `public-games`
- Specs detectadas: `45`
- Documentación existente relevante:
  - `frontend-phase-2-*`
  - `frontend-phase-3-*`
  - `frontend-runtime-freeze-audit.md`
  - `frontend-auth-login-freeze-audit.md`

## Inventario backend

| Módulo backend | Rutas | Requests | Resources | Policies | Tests | Estado backend | Riesgo |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Auth local + sesión | `/auth/register`, `/auth/login`, `/auth/activate`, `/auth/logout`, `/auth/me`, `/user` | `RegisterRequest`, `LoginRequest`, `ActivateRequest` | `AuthTokenResource`, `AuthUserResource` | auth por Sanctum, roles/capabilities en user | `LocalAuthenticationTest`, `AdminAccessTest`, `IdentityE2EFlowTest` | Maduro | Bajo |
| Recuperación/verificación/email | `/auth/forgot-password`, `/auth/reset-password`, `/auth/email/*` | `ForgotPasswordRequest`, `ResetPasswordRequest` | responses JSON estables | `OrderPolicy` no aplica; auth+signed+throttle | `PasswordResetTest`, `EmailVerificationTest`, `EmailVerificationCommerceTest` | Maduro | Medio |
| Social auth/linking | `/auth/social/*`, `/auth/social-accounts` | `SocialExchangeRequest`, `UnlinkSocialAccountRequest` | `LinkedSocialAccountResource` | auth/throttle | `SocialLoginTest`, `SocialLinkTest`, concurrencia auth | Maduro | Medio |
| Catálogo público | `/public/games`, `/public/games/{slug}`, `/draws`, `/number-counters`, `/numbers` | requests públicas de filtros/paginación puntuales | `PublicGameResource`, recursos públicos de draws/counters/numbers | público | `PublicGameReadApiTest`, `PublicEndpointsTest`, broadcasting tests | Maduro | Bajo |
| Reservas jugador | `/games/{game}/reservations`, `/me/reservations` | `ReserveGameNumbersRequest` | `ReserveGameNumbersResource`, `PlayerReservationResource` | `GamePolicy::reserve` | `ReserveGameNumbersTest`, compatibilidad, concurrencia | Maduro | Bajo |
| Órdenes/entradas jugador | `/me/orders`, `/me/orders/{order}`, `/me/orders/{order}/cancel`, `/me/entries` | `CancelOrderRequest` | `PlayerOrderResource`, `PlayerOrderDetailResource`, `PlayerEntryResource`, `OrderCancelledResource` | `OrderPolicy` | `PlayerQueriesTest`, `CancelOrderTest`, `ExpireOrderTest` | Maduro | Bajo |
| Evidencia de pago jugador | `/me/orders/{order}/payment-evidence` | `SubmitPaymentEvidenceRequest` | `SubmitPaymentEvidenceResource` | `OrderPolicy::submitEvidence` + `verified` + `idempotent` | `SubmitPaymentEvidenceTest` + integración/idempotencia | Maduro | Bajo |
| Admin games lifecycle | `/admin/games`, `/admin/games/{game}`, `publish/open-sales/close-sales/schedule/cancel` | requests admin de juego | `AdminGameSummaryResource`, `AdminGameDetailResource` | `GamePolicy` | `AdminGameListTest`, `AdminGameDetailTest`, `CreateGameTest`, lifecycle tests | Maduro | Medio |
| Admin engine | `/admin/games/{game}/start|pause|resume|draws|counters|winner|counters/rebuild` | requests admin engine | recursos admin start/pause/resume/draw/rebuild/winner/counters | `GamePolicy` | `AdminEngine*`, `DrawGameNumber*`, `RebuildCounters*`, `ExecuteScheduledGameDraw*` | Maduro | Medio |
| Admin commerce | `/admin/orders`, `/admin/payments`, `/admin/payments/{payment}`, `approve`, `reject`, `download` | `ApprovePaymentRequest`, `RejectPaymentRequest` | `AdminOrderResource`, `AdminPaymentListResource`, `AdminPaymentDetailResource`, `PaymentApprovedResource`, `PaymentRejectedResource` | `OrderPolicy`, `PaymentPolicy` | `AdminQueriesTest`, `ApprovePaymentTest`, `RejectPaymentTest` | Maduro | Medio |
| Refunds / payouts | `/admin/orders/{order}/refund`, `/admin/games/{game}/winner/payout` y sus `show` | `RefundOrderRequest`, `ProcessWinnerPayoutRequest` | `RefundResource`, `WinnerPayoutResource` | admin-only | `RefundOrderTest`, `WinnerPayoutTest`, múltiples integraciones | Maduro | Alto |
| Admin players | `/admin/players` | `CreatePlayerRequest` | `PlayerInvitationResource` | admin + throttle | `AssistedRegistrationTest`, identidad | Maduro | Medio |
| Notifications / outbox / jobs | jobs de outbox, handlers, dispatcher, notificaciones auth y dominio | no es UI-first | no hay API directa de dashboard/reporting aún | no UI policy | `Phase83/84/92`, handlers tests | Avanzado, no expuesto al frontend | Medio |

## Inventario frontend

| Feature frontend | Rutas | Repositories | Facades | Mappers | UI | Tests | Estado |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Core auth/session | guards `/login`, `/registro`, `/activar`, gating `admin`/`jugador` | `AuthRepository` | `AuthSessionService` | `auth-user.mapper` | login/register/activate + shells | sí | Parcial fuerte |
| Public shell + catálogo | `/bingos`, `/bingos/:slug` | `HttpPublicGamesRepository` | `PublicGamesFacade`, `PublicGameDetailFacade` | `public-game.mapper` | catálogo/detalle | sí | Alineado |
| Reserva pública autenticada | `/bingos/:slug/numeros` | `HttpGameNumbersRepository` | `NumberSelectionFacade` | mapping defensivo inline | grid y submit con idempotencia | sí | Alineado |
| Player orders/detail/evidence | `/jugador/compras`, `/jugador/compras/:orderId` | `HttpPlayerCommerceRepository` | `PlayerOrdersFacade`, `PlayerOrderDetailFacade` | `player-commerce.mapper` | órdenes y evidencia | sí | Alineado |
| Player reservations/entries | `/jugador/reservas`, `/jugador/cartones` | `HttpPlayerCommerceRepository` | `PlayerReservationsFacade`, `PlayerEntriesFacade` | `player-commerce.mapper` | listas básicas | sí | Alineado |
| Admin games list/detail/numbers | `/admin/bingos`, `/admin/bingos/:gameId` | `HttpAdminGamesRepository` | `AdminGamesFacade`, `AdminGameDetailFacade`, `AdminGameNumbersFacade` | `admin-games.mapper`, `admin-game-numbers.mapper` | read-only fuerte | sí | Parcial |
| Game engine | `/admin/bingos/:gameId/motor`, `/admin/motor` | `HttpGameEngineRepository` | `GameEngineFacade` | `game-engine.mapper` | start/pause/resume/draw/rebuild/winner/draws/counters | sí | Parcial fuerte |
| Admin commerce | `/admin/ordenes`, `/admin/pagos`, `/admin/pagos/:paymentId` | `HttpAdminCommerceRepository` | `AdminOrdersFacade`, `AdminPaymentsFacade`, `AdminPaymentDetailFacade` | directo DTO | pagos/órdenes/approve/reject/download | sí | Parcial |
| Admin placeholder | `/admin/rifas`, `/admin/participantes`, `/admin/reportes`, `/admin/configuracion`, `/admin/dashboard` | placeholder data | no repos de dominio real | no aplica | módulos honestos sin datos inventados | n/a | Placeholder honesto |
| Player home | `/jugador/inicio` | ninguno | ninguno | no aplica | contenido hardcoded | n/a | Placeholder con UX-risk |

## Matriz frontend vs backend

| Dominio | Backend existe | Frontend existe | Brecha | Riesgo | Prioridad | Bloque recomendado |
| --- | --- | --- | --- | --- | --- | --- |
| Auth local + sesión | Sí | Sí | `done` | Bajo | Baja | Mantener |
| Forgot/reset/verificación email | Sí | No | `missing` | Alto | Alta | Bloque identidad completa |
| Social login/linking | Sí | No | `missing` | Medio | Media | Bloque identidad completa |
| Catálogo público / detalle | Sí | Sí | `done` | Bajo | Baja | Mantener |
| Reserva real de números | Sí | Sí | `done` | Bajo | Baja | Mantener |
| Órdenes, reservas, entradas jugador | Sí | Sí | `partial` | Medio | Alta | Bloque commerce completion |
| Evidencia de pago jugador | Sí | Sí | `done` | Bajo | Baja | Mantener |
| Admin games lifecycle draft->sales | Sí | No práctico en UI | `missing` | Alto | Muy alta | Bloque admin lifecycle |
| Admin engine técnico | Sí | Sí | `partial` | Medio | Alta | Bloque admin lifecycle / engine polish |
| Admin orders/payments approve/reject | Sí | Sí | `partial` | Medio | Alta | Bloque admin commerce completion |
| Refunds admin | Sí | No | `missing` | Alto | Media | Bloque refunds |
| Winner payout admin | Sí | No | `missing` | Alto | Media | Bloque payouts |
| Admin create-player | Sí | No | `missing` | Medio | Media | Bloque identity/admin onboarding |
| Participants/reporting/settings | Parcial o no expuesto | Placeholder honesto | `missing` / `done` honesto | Medio | Baja | Esperar endpoint real |
| Notifications/outbox | Sí interno | No | `missing` | Bajo para UI actual | Baja | No priorizar como pantalla |

## Brechas críticas

- El frontend no puede operar el ciclo administrativo completo de un juego aunque el backend sí puede: crear, publicar, abrir/cerrar ventas, programar y cancelar.
- Faltan superficies frontend para recuperación de contraseña, verificación de correo y resend, pese a que el backend ya las expone y algunas mutaciones commerce dependen de `verified`.
- `PlayerHomePage` sigue hardcoded; hoy transmite información ficticia aunque el resto del shell ya está conectado.
- `admin/dashboard` sigue deliberadamente sin agregados reales; es honesto, pero funcionalmente no alcanza el nivel del backend disponible.

## Brechas altas

- Admin commerce no cubre refund ni payout, aunque el backend ya trae contratos idempotentes y tests robustos.
- Admin games/detail es fuerte en lectura, pero sigue anunciando “sin activar mutaciones” y no acompaña el lifecycle real.
- No hay frontend para `admin/players`, social accounts ni unlink/link social.
- No hay superficies para email verification/account recovery dentro del flujo de producto.

## Brechas medias

- `admin/motor` exige UUID manual como entrada técnica; útil para soporte, pero no debe ser el flujo principal.
- `game-engine` lee hasta `per_page=100` para draws/counters; funciona, pero necesitará paginación visual real si crece el volumen.
- Admin commerce usa DTOs directos con menos capa de mapping defensivo que otros dominios.
- Persisten placeholders honestos en `admin/rifas`, `admin/participantes`, `admin/reportes`, `admin/configuracion`.

## Brechas bajas

- El frontend no refleja outbox/jobs/notificaciones, pero tampoco hay evidencia de que hoy requiera superficie de usuario.
- El catálogo público y la reserva ya están bien endurecidos contra payloads raros, auth ausente e idempotencia.

## Arquitectura frontend objetivo

- `core`:
  - sesión centralizada en `AuthSessionService`
  - guards sin side effects ni logs
  - interceptors limitados a bearer, auth-error y URL rules
- `features/<dominio>`:
  - `data-access`: repos, facades, mappers, idempotency helpers
  - `pages` / `components`
  - `models` de vista separados de DTOs
- `repositories`:
  - un repositorio HTTP por dominio
  - mappers defensivos cuando el contrato sea heterogéneo o crítico
- `facades`:
  - estado finito: `idle/loading/success/error`
  - side effects serializados
  - descarte de respuestas tardías cuando cambie ruta/sesión/contexto
- `routing`:
  - lazy routes por feature
  - `adminGuard`, `authGuard`, `anonymousOnlyGuard`
  - `returnUrl` interno seguro
- `UI`:
  - shells separados (`public`, `auth`, `player`, `admin`)
  - tablas/listas paginadas
  - empty states honestos
  - nada de métricas inventadas

## Reglas UX/performance

### Público

- navegación rápida desde catálogo a detalle y selección
- CTA correcto según estado del juego y sesión
- no bloquear la lectura pública por auth

### Jugador

- reservas, órdenes, pagos y entradas con estados claros y diferenciados
- acciones críticas con feedback inmediato y `aria-live`
- nada de payloads malformados rompiendo la vista
- evitar cualquier dato ficticio en home o resumen

### Admin

- paginación real en tablas y listados
- filtros solo cuando el backend los soporte
- mutaciones con confirmación, estado en progreso y respuesta backend visible
- separar claramente lectura operativa, commerce y herramientas técnicas

### Performance/hardening

- `OnPush`, `signals`, `computed`, `takeUntilDestroyed`
- evitar loops de sesión y de carga
- no renderizar listas técnicas completas sin paginación
- mantener mapping defensivo en contratos de alto riesgo
- usar `@for (...; track ...)` de forma consistente

## Orden recomendado

1. Completar lifecycle admin de bingos contra contratos reales.
2. Completar identidad frontend más allá del login local: forgot/reset/verify/resend/social.
3. Cerrar admin commerce operativo: refund y winner payout.
4. Sustituir placeholders del jugador por resúmenes reales donde el backend ya soporte datos.
5. Revaluar participantes/reportes/configuración solo si Laravel expone endpoints específicos.
6. QA integral y smoke frontend-backend completo.
7. Performance polish y budgets después de cerrar dominios.

## Bloques implementables

| Bloque | Nombre | Alcance | Endpoints | Riesgo | Tamaño | Prioridad |
| --- | --- | --- | --- | --- | --- | --- |
| B1 | Admin lifecycle de bingos | crear, publicar, abrir/cerrar ventas, programar, cancelar; conectar desde listado/detalle | `POST /admin/games`, `/publish`, `/open-sales`, `/close-sales`, `/schedule`, `/cancel` | Medio | M | Muy alta |
| B2 | Identidad completa | forgot/reset, verify/resend, social login/link state | `/auth/forgot-password`, `/auth/reset-password`, `/auth/email/*`, `/auth/social*`, `/auth/social-accounts` | Medio | M | Alta |
| B3 | Admin commerce completion | refund y payout con idempotencia y feedback | `/admin/orders/{order}/refund`, `/admin/games/{game}/winner/payout` | Alto | M | Alta |
| B4 | Player home real | reemplazar home hardcoded por datos reales disponibles o empty state honesto | depende de contratos existentes; si no existen, dejar lectura mínima desde módulos actuales | Medio | S | Media |
| B5 | Admin onboarding | crear jugador/invitación asistida | `/admin/players` | Medio | S | Media |
| B6 | Engine polish | paginación/UX para draws y counters, confirmaciones finas | `/admin/games/{game}/draws`, `/counters`, mutaciones engine | Bajo | S | Media |
| B7 | Reporting/participants/settings | solo si aparecen endpoints reales | por definir | Alto por contrato | M | Baja |
| B8 | QA/smoke integral | smoke real Angular + Laravel | todos los bloques cerrados | Medio | M | Muy alta al final |

## Primer bloque recomendado

### Nombre

`Bloque 1 — Admin lifecycle de bingos`

### Por qué primero

- Es el hueco funcional más visible entre backend y frontend actual.
- El backend ya expone el ciclo administrativo completo con policies, requests y tests.
- El frontend ya tiene el contexto base listo: listado admin, detalle admin y consola de motor.
- Permite operar un juego desde draft hasta ventas abiertas antes de entrar a refunds/payouts/reportes.
- Es más estratégico que abrir nuevos dominios secundarios o placeholders.

### Endpoints

- `POST /api/v1/admin/games`
- `POST /api/v1/admin/games/{game}/publish`
- `POST /api/v1/admin/games/{game}/open-sales`
- `POST /api/v1/admin/games/{game}/close-sales`
- `POST /api/v1/admin/games/{game}/schedule`
- `POST /api/v1/admin/games/{game}/cancel`

### Archivos probables

- `src/app/features/admin-games/data-access/admin-games.repository.ts`
- `src/app/features/admin-games/data-access/admin-games.facade.ts`
- `src/app/features/admin-games/data-access/admin-game-detail.facade.ts`
- `src/app/features/admin-games/models/admin-games.models.ts`
- `src/app/features/admin-games/data-access/admin-games.mapper.ts`
- `src/app/features/admin-games/pages/admin-games-page/admin-games-page.ts`
- `src/app/features/admin-games/pages/admin-game-detail-page/admin-game-detail-page.ts`
- nuevos componentes de confirmación/formulario si hacen falta

### Tests requeridos

- repositorio HTTP para cada mutación y shape real
- facade de lifecycle con estados `idle/submitting/success/error`
- páginas admin con confirmación y refresh del contexto
- regresión de 401/403/404/409/422 según contrato real
- build y suite frontend completa

### Riesgos

- no inventar payloads de `create/schedule/cancel`
- no mezclar UI técnica del motor con lifecycle comercial
- no romper el detalle read-only ya aprobado

### Prompt recomendado

“Implementa el Bloque 1 — Admin lifecycle de bingos en `frontend_rifas_app`, usando exclusivamente los contratos reales de `../backend_rifas_app`. Alcance: `POST /api/v1/admin/games`, `publish`, `open-sales`, `close-sales`, `schedule`, `cancel`; integrar desde `admin-games` listado/detalle con confirmación, estados finitos, mappers defensivos, tests y sin tocar backend. Mantén UTF-8, no inventes campos y conserva el motor admin existente separado del lifecycle.”

## Riesgos

- `PlayerHomePage` todavía contiene contenido inventado.
- `anonymousOnlyGuard` tenía logs temporales; se retiraron en esta auditoría.
- `npm run lint` no existe, así que no hay verificación de lint en el estado actual.
- El backend está sucio por trabajo paralelo, así que debe seguir tratándose como fuente de lectura hasta separar esos cambios.
- El build frontend pasa, pero conserva un warning de budget SCSS en `number-selection-page.ts`.

## Fuera de alcance

- Implementar masivamente los bloques aquí definidos.
- Cambiar contratos backend o dependencias.
- Rediseñar toda la UI.
- Inventar endpoints de reportes, participantes o configuración.
