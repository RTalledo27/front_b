# Auditoría de runtime freeze frontend

## Síntoma

- algunos endpoints podían responder `200` correctamente en backend o en Network;
- aun así, la pantalla podía quedar en `loading`, congelada o sin feedback visible;
- el usuario no necesariamente veía un error explícito en UI;
- el ejemplo auditado con más riesgo fue el flujo de player commerce sobre `GET /api/v1/me/orders`.

## Endpoints afectados

Auditados directamente:

- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `GET /api/v1/me/orders`
- `GET /api/v1/me/orders/{order}`
- `GET /api/v1/me/reservations`
- `GET /api/v1/me/entries`

## Evidencia DevTools

No quedó una captura de DevTools completa en esta pasada porque el entorno local actual no permitió una reproducción limpia de login real:

- Angular local sí pudo levantarse;
- Laravel local sí pudo levantarse;
- pero el login del backend respondió `500` por configuración local de base/cache apuntando a host `postgres`, no por un bug del frontend.

Evidencia backend local observada:

- `POST /api/v1/auth/login` falló con `500`;
- `laravel.log` registró `SQLSTATE[08006] [7] could not translate host name "postgres" to address`;
- por eso esta auditoría no atribuye ese fallo local al freeze original reportado por el usuario.

## Causa raíz

La causa raíz encontrada en frontend fue un patrón inseguro en `player-commerce`:

- varios facades hacían el mapeo del payload dentro del `next` del `subscribe`;
- si el backend devolvía `200` pero con shape incompleto o distinto al esperado, el mapper podía lanzar una excepción fuera del flujo controlado de RxJS;
- en ese escenario, la UI podía quedar en `loading` o sin error visible, dando la impresión de freeze aunque el HTTP hubiera sido exitoso.

Este riesgo existía en:

- `PlayerOrdersFacade`
- `PlayerOrderDetailFacade`
- `PlayerReservationsFacade`
- `PlayerEntriesFacade`

## Interceptors auditados

Revisados:

- `api-credentials.interceptor.ts`
- `auth-error.interceptor.ts`

Conclusiones:

- no se encontró retry infinito;
- no se encontró refresh token loop;
- no se encontró Bearer duplicado;
- no se encontró re-disparo automático del mismo request desde `catchError`;
- el problema no nació en interceptors.

## Guards y auth auditados

Revisados:

- `auth.guard.ts`
- `auth-session.service.ts`
- `auth-redirect.service.ts`
- rutas en `app.routes.ts`

Conclusiones:

- no apareció evidencia de loop infinito confirmado en guards;
- `ensureSession()` comparte request pendiente y evita duplicación inmediata de `/auth/me`;
- el riesgo principal no estaba en auth store sino en el manejo posterior de payloads `200` dentro de player commerce.

## Signals y effects auditados

Conclusiones:

- no se detectó un `effect()` autorreferencial en el slice auditado de player commerce;
- no se detectó un `computed()` con side effects como causa del freeze;
- el problema observado fue más consistente con excepción en mapeo fuera del pipeline que con loop de signals.

## Mappers auditados

Hallazgo principal:

- `player-commerce.mapper.ts` no validaba de forma defensiva el shape mínimo del contrato;
- un payload parcial, nullable inesperado o colección malformada podía lanzar errores en tiempo de ejecución;
- ese error no quedaba normalizado como estado de UI.

Corrección aplicada:

- validación explícita del contrato mínimo;
- error estable `invalid_player_commerce_payload`;
- conversión a error de UI controlado con mensaje `Recibimos una respuesta incompleta del servidor.`

## Templates auditados

Revisados:

- `player-orders-page.ts`
- `player-order-detail-page.ts`

Conclusiones:

- no se encontró render masivo ni `@for` sin `track` en las vistas afectadas;
- no se detectó una plantilla como causa primaria del freeze;
- el problema nacía antes, en el paso de mapeo/modelado.

## Archivos corregidos

- `src/app/features/player-commerce/data-access/player-commerce.mapper.ts`
- `src/app/features/player-commerce/data-access/player-orders.facade.ts`
- `src/app/features/player-commerce/data-access/player-order-detail.facade.ts`
- `src/app/features/player-commerce/data-access/player-collections.facade.ts`

## Pruebas añadidas o actualizadas

- `src/app/features/player-commerce/data-access/player-commerce.mapper.spec.ts`
- `src/app/features/player-commerce/data-access/player-orders.facade.spec.ts`
- `src/app/features/player-commerce/data-access/player-order-detail.facade.spec.ts`
- `src/app/features/player-commerce/data-access/player-collections.facade.spec.ts`

Cobertura nueva clave:

- `200` con payload paginado real sigue funcionando;
- `200` con payload incompleto deja error controlado;
- el facade ya no queda colgado en `loading` por excepción de mapper;
- detail/reservations/entries reciben el mismo hardening contractual.

## Validación manual

Validación disponible en esta pasada:

- build frontend verde;
- tests frontend actualizados en ejecución de la auditoría;
- revisión contractual backend solo lectura confirmando `/api/v1/me/orders` y su resource real;
- revisión de log local confirmando que el `500` actual de login es un problema de entorno backend y no del freeze original del frontend.

Validación manual pendiente cuando el backend local vuelva a aceptar login real:

1. iniciar sesión;
2. abrir `/jugador/compras`;
3. confirmar `200` en Network;
4. confirmar que la UI responde y sale de `loading`;
5. confirmar ausencia de requests infinitos;
6. confirmar ausencia de errores nuevos en Console.

## Riesgos pendientes

- no quedó captura de Performance/Memory del freeze original porque el entorno local actual no permitió una reproducción limpia autenticada;
- otros módulos fuera de `player-commerce` todavía usan patrones menos defensivos, pero esta auditoría no los expandió sin evidencia;
- el warning de budget SCSS existente en `number-selection-page` sigue presente y no está relacionado con este freeze.

## Fuera de alcance

- cambios backend productivos;
- pagos/admin/motor/refunds/OAuth como features;
- rediseño de UI;
- actualización de dependencias;
- refactor amplio de arquitectura.
