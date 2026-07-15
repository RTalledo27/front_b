# B22 - Frontend contract regression & release gate

Fecha: 2026-07-14

## Alcance y decisión

La revisión se ejecutó exclusivamente sobre `frontend_rifas_app`. No se modificó, stageó, probó ni commiteó ningún archivo de `backend_rifas_app`.

**Decisión:** GO frontend. Los contratos consumidos permanecen compatibles, los dos bugs frontend reproducibles fueron corregidos con regresiones automatizadas y no apareció un gap contractual backend. La pasada visual autenticada con datos no pudo repetirse porque la base local no contiene juegos publicados y las cuentas smoke históricas ya no son válidas; esto se clasifica como limitación no bloqueante del entorno porque B22 no cambió las vistas protegidas y esas superficies conservan su cobertura automatizada y los smokes cerrados en B15/B16.

## Preflight

- Rama: `master`.
- Commit inicial: `718ba80 chore: define runtime parity and CI validation`.
- Worktree inicial: limpio.
- Staging inicial: vacío.
- `git diff --check`: limpio.
- `npm test -- --watch=false`: `68 files / 530 tests passed`.
- `npm run build`: correcto.
- `npm run lint`: no existe en `package.json`; no se creó en B22.
- Warning inicial conocido: budget de estilos de `number-selection-page.ts`, `4.60 kB`, excede `4.00 kB` por `599 bytes`.

## Matriz endpoint/superficie

| Endpoint o familia | Repository | API model / mapper | Facade | Página | Evidencia | Riesgo |
| --- | --- | --- | --- | --- | --- | --- |
| `GET /public/games` | `HttpPublicGamesRepository` | `PublicGameApiDto`, `mapPublicGamesPage` | `PublicGamesFacade` | `/bingos` | repository, mapper, facade y page specs | Bajo |
| `GET /public/games/{slug}` | `HttpPublicGamesRepository` | `PublicGameApiDto`, `mapPublicGame` | `PublicGameDetailFacade` | `/bingos/:slug` | optional live fields, polling y refresh specs | Bajo |
| `GET /public/games/{slug}/numbers` | `HttpGameNumbersRepository` | mapping defensivo a `GameNumberOption` | `NumberSelectionFacade` | `/bingos/:slug/numeros` | repository, facade y page specs | Bajo |
| `GET /public/games/{slug}/draws` | Sin consumidor B22 | No aplica | No aplica | No expuesto por la UX actual | El detalle usa `latest_draw` real | Fuera de alcance, no es gap |
| `GET /public/games/{slug}/number-counters` | Sin consumidor B22 | No aplica | No aplica | No expuesto por la UX actual | El progreso privado usa `live_progress` | Fuera de alcance, no es gap |
| Login, registro y activación | `HttpAuthRepository` | auth DTOs y mappers de identidad | `AuthSessionService` / facades auth | `/login`, `/registro`, `/activar` | repository, session, page y mapper specs | Bajo |
| `GET /auth/me`, `POST /auth/logout` | `HttpAuthRepository` | `AuthUserApiDto` | `AuthSessionService` | shells y rutas protegidas | deduplicación, 401, red, logout y respuesta tardía | Bajo |
| Forgot/reset/verificación | `HttpAuthRepository` | message/verification DTOs | facades de identidad | `/recuperar-acceso`, reset y `/verifica-tu-correo` | repository, facade y page specs | Bajo |
| `GET /me/orders`, `GET /me/orders/{order}` | `HttpPlayerCommerceRepository` | `PlayerOrder*ApiDto`, player mapper | orders/detail facades | compras y detalle | listas, empty, detalle y errores | Bajo |
| `POST /me/orders/{order}/cancel` | `HttpPlayerCommerceRepository` | `OrderCancellationApiDto` | detail facade | detalle de orden | doble submit, sesión y respuesta tardía | Bajo |
| Upload evidence | `HttpPlayerCommerceRepository` | `EvidenceSubmissionApiDto` | detail facade + idempotencia | detalle de orden | MIME/tamaño, replay, 409/422/425/red | Bajo |
| `GET /me/reservations` | `HttpPlayerCommerceRepository` | `PlayerReservationApiDto` | collection facade | `/jugador/reservas` | mapper, collection y page specs | Bajo |
| `GET /me/entries` | `HttpPlayerCommerceRepository` | `PlayerEntryApiDto.live_progress` | entries facade | `/jugador/cartones` | ausencia/progreso/polling/cleanup/stale data | Bajo |
| Admin games/lifecycle/numbers | `HttpAdminGamesRepository` | admin game/number mappers | list/detail/numbers facades | `/admin/bingos*` | late responses, refresh, commands y errores | Bajo |
| Admin engine/draws/counters/winner | `HttpGameEngineRepository` | engine mappers | `GameEngineFacade` | motor contextual | draw optimista, replay, 404 winner, completed | Bajo |
| Admin orders/payments/refund/payout | `HttpAdminCommerceRepository` | commerce mappers | commerce facades | órdenes, pagos y payout | idempotencia, refresh, confirmación y errores | Bajo |
| `POST /admin/players` | `HttpAdminPlayersRepository` | invitation mapper | `AdminPlayersFacade` | `/admin/participantes` | 401/403/422/429/red y doble submit | Bajo |

Las rutas se expresan relativas a `/api/v1`.

## Compatibilidad de payloads

- `latest_draw`, `winner`, `lifecycle` y `live_progress` ausentes se normalizan a `null`, no a datos inventados.
- `completed_at`, `won_at`, fechas de pago y metadatos relacionados conservan `null` cuando el backend no los informa.
- Arrays y páginas vacías permanecen vacíos; catálogo y listas solo muestran cero después de resolver la respuesta real.
- Los mappers defensivos de player/admin rechazan requeridos incompletos con un estado controlado `invalid_payload`.
- Los campos aditivos desconocidos se ignoran. B22 añadió regresiones explícitas para public game, player entry y error Laravel.
- `toApiError` conserva `error`, `message`, `reason` y únicamente arrays válidos de `errors`; no propaga campos aditivos internos a la vista.
- Las apariciones de `null` y las non-null assertions existentes fueron interpretadas: las de producción encontradas en payout están protegidas por el bloque de template que ya comprobó `winner() !== null`; no se detectó dereferencia insegura reproducible.

## Auth y sesión

- `ensureSession()` comparte una única petición pendiente de `/auth/me` y libera el intento tras error para permitir retry.
- `401` limpia sesión y redirige una vez a login con `returnUrl` interno seguro.
- `403` genérico lleva a `/403` sin limpiar sesión.
- Fix B22: `403 email_not_verified` ya no es interceptado como prohibición global; llega a reserva/evidencia para mostrar el CTA de verificación.
- Los errores de red de restauración no se presentan como credenciales inválidas.
- Logout limpia token, usuario e intentos asociados; las respuestas tardías no restauran una sesión anterior.
- En navegador, todas las rutas protegidas anónimas conservaron su `returnUrl` y no generaron loops.

## Live admin

- El draw exitoso publica `lastDrawResult` y actualiza el snapshot antes del refresh silencioso.
- El refresh conserva contexto, draws y counters; un fallo se muestra inline.
- `winner 404` se normaliza a ausencia honesta; `winner_created=true` se refleja sin esperar un reload global.
- `X-Draw-Command-Id` se mantiene para retry de red/replay y se limpia en conflictos definitivos según la regla existente.
- Doble submit está bloqueado y `completed` deshabilita acciones inválidas.
- No fue necesario modificar el motor en B22.

## Live player y selección

- `X/Y` solo aparece con `live_progress.hits_required` real; `0/X` se conserva como progreso válido.
- Sin `live_progress` la tarjeta mantiene un fallback honesto, sin inventar aciertos.
- El polling de entries solo continúa mientras existe un juego `running`; se detiene en `completed`, al cambiar de vista y al destruir la facade.
- Los errores de refresh conservan cartones y estado público ya visible.
- Fix B22: una caída al refrescar disponibilidad mantiene juego, grilla y selección. La página presenta stale data con una acción de reintento, en lugar de reemplazar todo por un error global.
- Los mensajes de conflicto ya no afirman que la grilla se actualizó antes de recibir una respuesta correcta.
- Replay, `409`, `425`, retry de red, reconciliación parcial, doble submit, cambio de juego, logout y descarte de respuestas tardías continúan cubiertos.

## Commerce y onboarding

- Listas vacías, estados `pending`, `payment_submitted`, `paid`, `expired`, `cancelled`, `rejected` y `refunded` provienen del contrato; no se sintetiza aprobación.
- Evidencia y reservas conservan las claves idempotentes en red/`425` y abren un intento nuevo tras conflictos definitivos.
- Archivo inválido o mayor a 5 MB falla antes del POST y reactiva la acción.
- Admin approve/reject/refund/payout usa `Idempotency-Key`, mantiene el resultado de la mutación si falla el refresh y descarta respuestas tardías.
- Payout/refund mantienen confirmación explícita y feedback inline. Onboarding solo muestra token/invitación cuando el resource lo entrega.

## Matriz transversal de errores

| HTTP / condición | Contexto | UX / acción | ¿Preserva data? |
| --- | --- | --- | --- |
| `400` | contrato o transición | mensaje backend si es seguro y específico; permite corregir/reintentar | Sí, si ya existe snapshot |
| `401` | sesión expirada | limpia sesión y login con `returnUrl` | No conserva datos privados |
| `403` genérico | autorización | `/403`, sin fingir logout | La sesión se conserva |
| `403 email_not_verified` | reserva/evidencia | feedback inline + CTA de verificación | Sí |
| `404` esperado | winner | “Sin ganador aún” | Sí |
| `404` real | recurso | estado not found con retorno/retry apropiado | Según superficie |
| `409` | idempotencia/conflicto | mensaje específico y nuevo intento cuando corresponde | Sí |
| `422` | validación/dominio | `message`, `reason` y errores de campo | Sí |
| `425` | intento en proceso | conserva la clave y permite retry seguro | Sí |
| `429` | rate limit | espera y reintento, acción reactivada | Sí |
| `500`, `502`, `503` | servidor | error inesperado; refresh silencioso conserva snapshot | Sí en refresh |
| timeout/offline (`status 0`) | red | mensaje de conexión y retry | Sí en refresh |

## Estados visuales y accesibilidad

- Initial loading, refreshing, submitting, empty, partial, success, error, stale y completed tienen estados finitos; no se detectaron loaders sin salida en las pruebas.
- `aria-busy` se limita a regiones/acciones activas y el feedback dinámico usa `aria-live` o `role=status/alert`.
- Botones de mutación se deshabilitan solo durante su request y recuperan disponibilidad tras error.
- Los estados no dependen solo de color y los estilos globales respetan `prefers-reduced-motion`.
- El aviso stale de disponibilidad reutiliza estilos existentes; B22 no añadió CSS ni incrementó budgets.

## Navegador y responsive

Navegador automatizado: Codex in-app browser sobre `http://localhost:4200`.

Breakpoints: `360`, `390`, `768`, `1024`, `1280`, `1440` px.

Resultados:

- `/bingos`, `/login`, `/registro` y `/recuperar-acceso`: contenido visible y `scrollWidth <= clientWidth` en los seis anchos.
- `/bingos/:slug` y `/bingos/:slug/numeros`: loading y error 404 controlados, sin overflow. El catálogo actual devolvió cero juegos, por lo que no hubo slug vigente con data para el estado loaded.
- `/verifica-tu-correo` anónimo: redirección única y segura a login con `returnUrl`.
- Las cuatro rutas player y seis rutas admin requeridas redirigieron una sola vez a login, conservaron el `returnUrl` y no desbordaron en los seis anchos.
- No hubo pantalla blanca, error de consola ni excepción no controlada capturada.
- Los dos logins con cuentas smoke históricas terminaron después de la latencia local con credenciales inválidas; el botón salió de `Ingresando…`, por lo que no se reprodujo loader infinito.

Limitación: sin cuentas smoke válidas ni juegos publicados no se repitió la inspección visual autenticada de shells, tablas y motor. No se crearon usuarios ni datos porque B22 prohíbe ampliar el alcance y la base está siendo trabajada en paralelo.

## Bugs y clasificación

| Hallazgo | Clasificación | Resolución |
| --- | --- | --- |
| Interceptor global redirigía `email_not_verified` a `/403` antes del CTA contextual | Bug frontend bloqueante para recuperación | Excepción estrecha por código/reason y test de integración del interceptor |
| Refresh de disponibilidad fallido ocultaba una grilla válida | Bug frontend importante | Snapshot/selección preservados, warning stale y retry |
| Faltaban regresiones explícitas de campos aditivos/nullable/error payload | Brecha de test | Specs añadidos sin alterar contratos |
| Base local sin datos ni cuentas smoke vigentes | Limitación de entorno | Documentada; no se inventaron ni mutaron datos |

## Tests y build

- Final `npm test -- --watch=false`: `69 files / 538 tests passed`.
- Las pruebas nuevas cubren: 403 contextual, grilla stale, retry visual, campos live nullable/aditivos, live fields públicos ausentes, página vacía y payload Laravel parcial/aditivo.
- `npm run build`: correcto; output generado en `dist/frontend_rifas_app`.
- `npm run lint`: falla únicamente con `Missing script: "lint"`; el script no existe y no se añadió.
- `git diff --check`: limpio.
- `rg` sobre `src` no encontró `console.log`, `console.debug`, `debugger` ni la marca temporal B22.
- `rg` no encontró `skip`, `xit`, `fit`, `fdescribe` ni `it.skip` en specs.
- `rg` no encontró `TODO` ni `FIXME` en `src/app`.
- La búsqueda ampliada a `docs` solo encontró menciones históricas de esos comandos, no instrumentación ejecutable.

## Warnings

El único warning esperado es el histórico de `number-selection-page.ts`: budget `4.00 kB`, tamaño `4.60 kB`, exceso `599 bytes`. B22 no modificó estilos ni budgets, por lo que no debe crecer ni aparecer un warning nuevo.

## Handoff para chat backend

No se detectó un gap de endpoint, método, campo o comportamiento backend durante B22. No se requiere handoff contractual.

La reposición de datos smoke desechables pertenece a preparación operativa del entorno, no a una modificación de contrato, y debe coordinarse fuera de este bloque sin tocar backend desde este chat.

## Release gate

B22 queda apto para cierre si el gate final conserva:

- suite completa verde;
- build verde con solo el warning histórico;
- diff-check limpio;
- ausencia de instrumentación temporal y tests enfocados/omitidos;
- staging limitado a los archivos frontend B22 enumerados explícitamente.
