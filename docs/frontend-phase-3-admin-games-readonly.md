# Fase 3.1 frontend - Administración de juegos read-only

## Alcance

Este bloque alinea `/admin/bingos` con los contratos administrativos reales de Laravel.

Incluye:

- listado administrativo real;
- filtros reales soportados por backend;
- paginación real;
- detalle administrativo read-only;
- navegación listado -> detalle;
- preservación razonable de filtros mediante query params;
- autorización y manejo de errores;
- accesibilidad;
- pruebas;
- documentación.

No incluye:

- creación, edición o cancelación de juegos;
- publicación, apertura o cierre de ventas;
- inicio, pausa o reanudación del bingo;
- draws, counters, winner ops;
- gestión administrativa de números;
- pagos administrativos;
- dashboards;
- OAuth o Socialite;
- cambios backend.

## Contrato backend

Decisión contractual: `A1`.

Endpoints confirmados:

- `GET /api/v1/admin/games`
- `GET /api/v1/admin/games/{game}`

Middleware:

- `auth:sanctum`
- `admin`

Policies:

- `GamePolicy::viewAny`
- `GamePolicy::view`

Resources usados:

- `AdminGameSummaryResource`
- `AdminGameDetailResource`

## Filtros

Filtros soportados por `ListAdminGamesRequest`:

- `search`
- `status`
- `published`
- `auto_draw_enabled`
- `created_from`
- `created_to`
- `page`

No se implementó UI para ordenamiento porque el backend no expone orden configurable.

## Paginación

El listado usa paginación length-aware del backend.

- `per_page` por defecto: `20`
- `per_page` máximo: `100`
- orden por defecto: `created_at desc`, luego `id desc`

El frontend reutiliza el envelope real `data + links + meta`.

## Modelos

Se separaron explícitamente:

- DTO HTTP implícito validado por mapper;
- `AdminGameSummaryView`;
- `AdminGameDetailView`;
- `AdminGameListQuery`;
- `AdminGameStatusView`;
- `AdminGamesPageInfo`.

## Rutas

- `/admin/bingos`
- `/admin/bingos/:gameId`

La navegación conserva filtros mediante query params del listado.

## Autorización

- `adminGuard` protege listado y detalle.
- El backend sigue siendo la autoridad para `401`, `403` y `404`.
- No se usan endpoints públicos para administración.

## Estados

Listado:

- `idle`
- `loading`
- `refreshing`
- `loaded`
- `empty`
- `unauthorized`
- `forbidden`
- `validationError`
- `networkError`
- `unexpectedError`

Detalle:

- `idle`
- `loading`
- `loaded`
- `unauthorized`
- `forbidden`
- `notFound`
- `networkError`
- `unexpectedError`

## Errores

Mapeos usados:

- `401`: sesión ausente o expirada
- `403`: prohibido
- `404`: juego inexistente en detalle
- `422`: filtros inválidos en listado
- `0`: error de red
- otros: error inesperado

Los payloads estructuralmente incompletos del backend se convierten en error seguro `invalid_payload`.

Durante el hardening final también se endureció la validación de fechas ISO-8601 en los mappers y se añadió un estado visible específico para `422` en el listado, evitando una grilla vacía ambigua cuando los filtros son inválidos.

## Accesibilidad

- formularios con labels nativos;
- estados de carga con `aria-busy`;
- feedback con `aria-live`;
- enlaces y botones nativos;
- navegación por teclado;
- contraste y estados no basados solo en color;
- detalle y listado sin depender de UUID manual.

## Pruebas

Cobertura añadida o actualizada:

- `admin-games.mapper.spec.ts`
- `admin-games.repository.spec.ts`
- `admin-games.facade.spec.ts`
- `admin-game-detail.facade.spec.ts`
- `admin-games-page.spec.ts`
- `admin-game-detail-page.spec.ts`
- `auth.guard.spec.ts`

## Smoke

Smoke deseado:

1. login admin;
2. abrir `/admin/bingos`;
3. aplicar filtros reales;
4. paginar;
5. abrir detalle desde una fila;
6. recargar detalle por URL;
7. volver preservando filtros;
8. validar `404` con UUID inexistente;
9. validar rechazo a player.

## Riesgos

- El laboratorio local de testing backend sigue mostrando una divergencia entre `phpunit.xml` y el estado observable por comandos Artisan.
- Por seguridad no se reconstruyó la base de testing desde este bloque.

## Fuera de alcance

- mutaciones administrativas;
- integración con motor;
- gestión administrativa read-only de números;
- integración social.

## Siguiente bloque

Recomendado: gestión administrativa read-only de números desde el detalle del juego.

Continuación implementada después de este bloque:

- [Fase 3.2 frontend - Gestión administrativa read-only de números](/C:/Users/rogit/proyectos/rifas/frontend_rifas_app/docs/frontend-phase-3-admin-game-numbers-readonly.md)
