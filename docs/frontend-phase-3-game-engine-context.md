# Fase 3.3 frontend - Integración del contexto de juego con la consola del motor

## Alcance

Este bloque conecta el detalle administrativo del juego con la consola del motor usando el UUID real del juego y contratos admin reales del backend.

Incluye:

- auditoría contractual del motor;
- navegación contextual desde `/admin/bingos/:gameId`;
- ruta contextual `/admin/bingos/:gameId/motor`;
- lectura read-only de draws, counters y winner;
- degradación del UUID manual a diagnóstico secundario;
- autorización admin;
- manejo de errores;
- accesibilidad;
- pruebas;
- documentación.

No incluye:

- start, pause, resume, draw o rebuild desde UI;
- polling agresivo;
- WebSocket;
- cambios backend;
- pagos;
- OAuth.

## Decisión contractual

Caso elegido: `M1 - solo contexto y lectura`.

Justificación:

- el backend ya expone endpoints admin reales de lectura para `draws`, `counters` y `winner`;
- las mutaciones del motor existen, pero son operativas, concurrentes o irreversibles y quedan fuera de esta fase;
- `AdminGameDetailResource` ya aporta contexto real suficiente del juego.

## Rutas auditadas del motor

| Método | URI | Tipo | Mutación | Middleware | Policy | Request | Resource | Tests | Riesgo |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `GET` | `/api/v1/admin/games/{game}/draws` | admin lectura | no | `auth:sanctum` + `admin` | `viewDraws` | `ListGameDrawsRequest` | `AdminGameDrawResource` | `AdminEngineAuthorizationTest`, `AdminEngineFilterValidationTest`, `AdminEngineResponseShapeTest` | medio |
| `GET` | `/api/v1/admin/games/{game}/counters` | admin lectura | no | `auth:sanctum` + `admin` | `viewCounters` | `ListGameCountersRequest` | `AdminGameCounterResource` | `AdminEngineAuthorizationTest`, `AdminEngineFilterValidationTest`, `AdminEngineResponseShapeTest` | medio |
| `GET` | `/api/v1/admin/games/{game}/winner` | admin lectura | no | `auth:sanctum` + `admin` | `viewWinner` | `ShowGameWinnerRequest` | `AdminGameWinnerResource` | `AdminEngineAuthorizationTest`, `AdminEngineResponseShapeTest` | medio |
| `POST` | `/api/v1/admin/games/{game}/start` | admin mutación | sí | `auth:sanctum` + `admin` | `start` | request implícito | resource de comando | `AdminEngineEndpointsTest` | alto |
| `POST` | `/api/v1/admin/games/{game}/pause` | admin mutación | sí | `auth:sanctum` + `admin` | `pause` | request implícito | resource de comando | `AdminEngineEndpointsTest` | alto |
| `POST` | `/api/v1/admin/games/{game}/resume` | admin mutación | sí | `auth:sanctum` + `admin` | `resume` | request implícito | resource de comando | `AdminEngineEndpointsTest` | alto |
| `POST` | `/api/v1/admin/games/{game}/draws` | admin mutación concurrente | sí | `auth:sanctum` + `admin` | `draw` | header `X-Draw-Command-Id` | draw result resource | `AdminEngineEndpointsTest`, `AdminEngineResponseShapeTest` | muy alto |
| `POST` | `/api/v1/admin/games/{game}/counters/rebuild` | admin mutación técnica | sí | `auth:sanctum` + `admin` | `rebuildCounters` | request implícito | rebuild result resource | `AdminEngineEndpointsTest`, `AdminEngineResponseShapeTest` | alto |

## Endpoints usados por el frontend

- `GET /api/v1/admin/games/{game}`
- `GET /api/v1/admin/games/{game}/draws?per_page=100`
- `GET /api/v1/admin/games/{game}/counters?per_page=100`
- `GET /api/v1/admin/games/{game}/winner`

## Rutas frontend

- `/admin/bingos/:gameId`
- `/admin/bingos/:gameId/motor`
- `/admin/motor`

La ruta contextual es el flujo principal. `/admin/motor` se conserva solo como acceso técnico secundario con `?gameId=...`.

## Modelos y mappers

Se mantuvo `AdminGameDetailView` como contexto del juego y se añadieron modelos específicos del motor:

- `GameEngineDrawView`
- `GameEngineCounterView`
- `GameEngineWinnerView`
- `GameEngineConsoleView`
- `GameEnginePageStatus`

Los mappers validan envelopes reales:

- draws y counters usan respuesta paginada `data + links + meta`;
- winner usa respuesta `data`;
- `404` de winner se interpreta como ausencia de ganador, no como caída de toda la consola.

## Autorización

- la navegación sigue protegida por `adminGuard`;
- admin puede entrar;
- player va a `403`;
- anónimo va a `login`;
- el backend sigue siendo la autoridad de `401`, `403` y `404`;
- no se usan endpoints públicos como fallback.

## Estados y errores

Estados cubiertos:

- `idle`
- `loading`
- `refreshing`
- `loaded`
- `unauthorized`
- `forbidden`
- `notFound`
- `validationError`
- `networkError`
- `unexpectedError`

Mapeos cubiertos:

- `0`
- `401`
- `403`
- `404`
- `422`
- otros como inesperados

## Navegación

Estrategia elegida: `Opción A - ruta contextual`.

Motivo:

- hace visible que la consola pertenece a un juego concreto;
- elimina el UUID manual como experiencia principal;
- permite volver al detalle del juego sin perder el contexto administrativo.

## UX y accesibilidad

- heading claro con contexto del juego;
- enlace nativo de regreso al detalle;
- `aria-busy` en carga;
- `aria-live` en feedback relevante;
- formularios con label nativo;
- mensajes seguros sin stack traces;
- textos visibles conservados en UTF-8.

## Respuestas tardías y concurrencia

La facade protege contra:

- cambio rápido de `gameId`;
- navegación entre juegos;
- logout durante requests;
- respuesta vieja después de otra más nueva.

## Mutaciones fuera de alcance

No se implementó ninguna mutación del motor en esta fase.

Quedan fuera:

- start;
- pause;
- resume;
- draw;
- rebuild;
- cualquier automatización.

## Pruebas

Cobertura añadida o actualizada:

- `game-engine.mapper.spec.ts`
- `game-engine.repository.spec.ts`
- `game-engine.facade.spec.ts`
- `game-engine-page.spec.ts`
- `admin-game-detail-page.spec.ts`

## Smoke

Smoke deseado:

1. login admin;
2. abrir `/admin/bingos`;
3. abrir un detalle real;
4. abrir `/admin/bingos/:gameId/motor`;
5. validar UUID real y back link;
6. recargar URL directa;
7. probar `/admin/motor?gameId=...` como acceso técnico secundario;
8. validar rechazo a player;
9. validar logout durante flujo;
10. validar error de red.

## Riesgos

- la lista de draws y counters usa `per_page=100`; si el juego supera ese volumen, la consola seguirá siendo útil como snapshot pero no como historial completo;
- la navegación secundaria `/admin/motor?gameId=...` se conserva para diagnóstico, no para UX principal;
- el smoke integral Angular + Laravel depende de tener ambos servicios levantados localmente.

## Siguiente bloque

Recomendado: primera mutación administrativa de motor.

Continuidad implementada en Fase 3.4:

- ver `docs/frontend-phase-3-engine-first-mutation.md`.
