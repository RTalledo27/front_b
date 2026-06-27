# Fase 3.2 frontend - Gestión administrativa read-only de números

## Alcance

Este bloque integra la lectura administrativa real de números dentro del detalle administrativo del juego.

Incluye:

- lectura real de `GET /api/v1/admin/games/{game}/numbers`;
- integración dentro de `/admin/bingos/:gameId`;
- modelos, mapper, repositorio y facade explícitos;
- UI read-only;
- manejo de errores y autorización;
- pruebas;
- documentación.

No incluye:

- mutaciones sobre números;
- filtros inventados;
- paginación inventada;
- motor;
- pagos administrativos;
- cambios backend.

## Contrato backend

Decisión contractual: `N2`.

Endpoint confirmado:

- `GET /api/v1/admin/games/{game}/numbers`

Condiciones confirmadas:

- middleware `auth:sanctum` + `admin` por grupo de rutas;
- `{game}` usa route model binding del UUID real del juego;
- sin request dedicado de filtros;
- sin paginación dedicada;
- sin `per_page`;
- orden backend por `number asc`;
- envelope `data` sin `links` ni `meta`.

Shape confirmado por resource:

- `id`
- `number`
- `status`
- `active_reservation`
- `sold_entry`

`active_reservation` puede incluir:

- `id`
- `order_id`
- `user_id`
- `order_status`
- `expires_at`

`sold_entry` puede incluir:

- `id`
- `user_id`
- `user_name`
- `status`
- `confirmed_at`

## Integración elegida

Opción elegida: `A`, sección dentro del detalle.

Motivo:

- el backend devuelve la colección completa sin filtros ni paginación;
- una ruta hija habría añadido complejidad de navegación sin beneficio real;
- la sección puede fallar de forma aislada sin bloquear el detalle principal.

## Endpoints

- `GET /api/v1/admin/games/{game}`
- `GET /api/v1/admin/games/{game}/numbers`

## Filtros

No se implementaron filtros porque el contrato backend actual no los expone.

## Paginación

No se implementó paginación porque el contrato backend actual no pagina esta colección.

## Modelos

Modelos de vista añadidos:

- `AdminGameNumberView`
- `AdminGameNumberReservationView`
- `AdminGameNumberSoldEntryView`
- `AdminGameNumbersResult`
- `AdminGameNumbersStatus`

El mapper elimina PII innecesaria de la vista final:

- no expone `user_name`;
- no expone `user_id`;
- no deriva estados de pago o usuario.

## Autorización

- el detalle sigue protegido por `adminGuard`;
- la sección usa solo el endpoint admin real;
- `401`, `403` y `404` se muestran dentro de la propia sección.

## Estados

- `idle`
- `loading`
- `refreshing`
- `loaded`
- `empty`
- `unauthorized`
- `forbidden`
- `notFound`
- `validationError`
- `networkError`
- `unexpectedError`

## Errores

Mapeos usados:

- `0`: red
- `401`: sesión ausente o expirada
- `403`: prohibido
- `404`: juego inexistente o inaccesible
- `422`: payload o request inválido
- otros: inesperado

Los payloads estructuralmente incompletos se convierten en `invalid_payload`.

## Accesibilidad

- heading propio de la sección;
- `aria-busy` en carga;
- `aria-live` en errores;
- cards semánticas read-only;
- estados con texto además de color;
- navegación por teclado;
- textos UTF-8.

## Pruebas

Cobertura añadida o actualizada:

- `admin-game-numbers.mapper.spec.ts`
- `admin-game-numbers.facade.spec.ts`
- `admin-game-numbers-panel.spec.ts`
- `admin-games.repository.spec.ts`
- `admin-game-detail-page.spec.ts`

## Smoke

Smoke deseado:

1. login admin;
2. abrir `/admin/bingos`;
3. abrir detalle de juego;
4. ver sección de números;
5. recargar URL directa;
6. validar rechazo a player;
7. validar `404`;
8. validar error de red.

## Riesgos

- el backend aún expone PII opcional en el resource (`user_name`, `user_id`), pero el frontend no la usa ni la muestra;
- no hay filtros ni paginación admin de números a esta fecha;
- el smoke real sigue dependiendo de tener Laravel levantado localmente.

## Hardening final

- Causa del OOM: `admin-game-detail-page.spec.ts` estaba importando el panel real de números administrativos dentro del harness del detalle, lo que inflaba innecesariamente el grafo de compilación y empujaba la suite completa a un consumo de memoria acumulado en `ng test --watch=false`.
- Corrección aplicada: el spec del detalle ahora sustituye `AdminGameNumbersPanel` por un stub ligero y mantiene la aserción de integración visible sin arrastrar toda la implementación del panel.
- Comando final verde: `npm test -- --watch=false`
- Build final verde: `npm run build`

## Fuera de alcance

- liberar o reservar números;
- reasignaciones;
- operación de motor;
- ciclo de vida del juego;
- pagos.

## Siguiente bloque

Recomendado: integración del contexto de juego con consola del motor.
ContinuaciÃ³n implementada despuÃ©s de este bloque:

- [Fase 3.3 frontend - IntegraciÃ³n del contexto de juego con la consola del motor](/C:/Users/rogit/proyectos/rifas/frontend_rifas_app/docs/frontend-phase-3-game-engine-context.md)
