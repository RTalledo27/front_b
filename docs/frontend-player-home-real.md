# Frontend Player Home Real

## Veredicto

Decisión: `P1 — Home compuesta con endpoints existentes`.

No existe un endpoint agregado tipo `player-summary` en `../backend_rifas_app`. La home se construye únicamente con contratos reales ya expuestos por Laravel:

- `GET /api/v1/auth/me`
- `GET /api/v1/me/orders`
- `GET /api/v1/me/reservations`
- `GET /api/v1/me/entries`

## Auditoría contractual

| Dato de home | Endpoint | Resource | Paginación | Campos | Riesgo | Veredicto |
| --- | --- | --- | --- | --- | --- | --- |
| Identidad del jugador | `GET /api/v1/auth/me` | `AuthUserResource` | No | `id`, `name`, `email`, `role`, `email_verified`, `email_verified_at`, `capabilities` | Bajo | Apto |
| Resumen de órdenes | `GET /api/v1/me/orders` | `PlayerOrderResource` | Laravel `meta/links`, `per_page=20` | `id`, `game_id`, `status`, `subtotal_cents`, `total_cents`, `currency`, `expires_at`, `paid_at`, `cancelled_at`, `expired_at`, `created_at`, `item_count`, `payment` | Bajo | Apto |
| Reservas activas | `GET /api/v1/me/reservations` | `PlayerReservationResource` | Laravel `meta/links`, `per_page=20` | `id`, `order_id`, `game_number_id`, `created_at`, `order`, `game_number` | Medio: el backend ya filtra solo reservas activas | Apto |
| Cartones confirmados | `GET /api/v1/me/entries` | `PlayerEntryResource` | Laravel `meta/links`, `per_page=20` | `id`, `game_id`, `game_number_id`, `status`, `confirmed_at`, `game`, `game_number` | Bajo | Apto |

### Evidencia revisada en backend

- `app/Http/Controllers/Auth/MeController.php`
- `app/Http/Resources/Auth/AuthUserResource.php`
- `app/Modules/Commerce/Presentation/Http/Controllers/Player/ListMyOrdersController.php`
- `app/Modules/Commerce/Presentation/Http/Resources/Player/PlayerOrderResource.php`
- `app/Modules/Commerce/Presentation/Http/Controllers/Player/ListMyReservationsController.php`
- `app/Modules/Commerce/Presentation/Http/Resources/Player/PlayerReservationResource.php`
- `app/Modules/Commerce/Presentation/Http/Controllers/Player/ListMyEntriesController.php`
- `app/Modules/Commerce/Presentation/Http/Resources/Player/PlayerEntryResource.php`
- `tests/Feature/Commerce/PlayerQueriesTest.php`
- `tests/Feature/Commerce/EmailVerificationCommerceTest.php`
- `tests/Feature/Auth/LocalAuthenticationTest.php`

## Datos mostrados

- Saludo real del usuario usando `auth/me`.
- Correo real del usuario.
- Estado real de verificación de correo.
- Totales reales de órdenes, reservas activas y cartones confirmados usando `meta.total`.
- Últimos elementos visibles de cada colección usando la primera página real del backend.
- Enlaces de continuidad a compras, reservas y cartones ya existentes.

## Datos omitidos de forma deliberada

- Premios, montos ganados o “próximo sorteo”.
- Métricas agregadas no expuestas por backend.
- KPIs inventados de actividad o engagement.
- Estados o claims de negocio que no salgan de los resources auditados.

## UX y manejo de errores

- Loading global mientras la composición inicial está en curso.
- Estado `empty` honesto cuando los tres endpoints vuelven sin registros.
- Estado parcial cuando una sección falla pero las demás sí cargan.
- Estado total con retry cuando las tres lecturas fallan.
- CTA de verificación visible solo si `email_verified` es `false`.
- Textos visibles en español correcto y conservados en UTF-8.

## Arquitectura frontend

- `src/app/features/player/data-access/player-home.facade.ts`
  - compone la home con señales;
  - evita dobles requests en vuelo por sección;
  - usa repositorio/mappers ya existentes de `player-commerce`;
  - conserva datos parciales cuando falla solo un endpoint.
- `src/app/features/player/pages/player-home-page/player-home-page.ts`
  - reemplaza por completo el contenido hardcoded;
  - presenta resumen real y paneles por sección;
  - no inventa contenido ni fuerza dependencias nuevas.

## Testing

Cobertura añadida:

- `src/app/features/player/data-access/player-home.facade.spec.ts`
  - carga exitosa compuesta;
  - empty state;
  - error parcial;
  - error total `401`;
  - bloqueo de doble request en vuelo;
  - payload inválido controlado.
- `src/app/features/player/pages/player-home-page/player-home-page.spec.ts`
  - render real sin contenido ficticio previo;
  - CTA de verificación;
  - empty state;
  - estado parcial;
  - error total con retry.

## Smoke y validación final

Comandos ejecutados al cierre:

```bash
npm test -- --watch=false
npm run build
npm run lint
git diff --check
git status --short
```

Resultado final:

- `npm test -- --watch=false`: pasa, `61` archivos y `467` tests.
- `npm run build`: pasa.
- `npm run lint`: no existe script `lint` en este repo.
- `git diff --check`: sin errores de whitespace; Git reporta solo advertencia de fin de línea CRLF en `player-home-page.ts`.
- `git status --short`: quedan únicamente los archivos de este bloque en el working tree.

## Riesgos residuales

- La home depende de cuatro lecturas separadas; no existe todavía un endpoint agregado optimizado.
- `me/reservations` ya viene filtrado a reservas activas, así que la home no puede reconstruir histórico completo desde ese endpoint.
- Si en el futuro cambian los resources de player commerce, esta home debe mantenerse alineada con esos contratos reales.
