# Cierre integral de Fase 3 motor - Smoke administrativo Angular + Laravel

## Alcance

Este cierre consolida la validación integral de la Fase 3 del motor administrativo sobre entorno local seguro, usando Angular y Laravel reales.

Incluye:

- preflight de frontend y backend;
- validación de contratos reales del motor administrativo;
- smoke real por HTTP contra Laravel para `start`, `pause`, `resume`, `draw` manual y `rebuild counters`;
- validación de autorización para admin, player y anónimo;
- verificación de regresión básica de rutas y consola administrativa;
- documentación de lo ejecutado y de los bloqueos reales del smoke de navegador;
- segunda pasada de estabilización de la base de testing del backend.

No incluye:

- nuevas funcionalidades;
- cambios backend productivos;
- datos no desechables;
- producción;
- actualización de dependencias;
- refactors.

## Entorno usado

- frontend: `C:\Users\rogit\proyectos\rifas\frontend_rifas_app`
- backend: `C:\Users\rogit\proyectos\rifas\backend_rifas_app`
- Angular dev server: `http://127.0.0.1:4300`
- Laravel API: `http://127.0.0.1:8000`
- proxy frontend: `proxy.conf.json` hacia `/api` y `/sanctum`
- base local backend: `APP_ENV=local`, `DB_HOST=127.0.0.1`, `DB_PORT=55432`, `DB_DATABASE=backend_rifas_app`

## Primera pasada - datos locales seguros usados

Usuarios locales desechables:

- admin: `smoke-motor-admin@example.com` / `secret123`
- player: `smoke-motor-player@example.com` / `secret123`

Juegos locales desechables:

- manual:
  - id: `019f0b23-9b59-7384-9b34-deb1e7637a02`
  - slug: `smoke-motor-manual-xu5scx`
  - estado inicial: `sales_closed`
  - `auto_draw_enabled=false`
  - números: `1..5`
  - vendidos: `1`
  - disponibles: `4`
  - entries confirmadas: `1`
  - no puede producir ganador con un único draw porque `hits_required=5`
- auto:
  - id: `019f0b23-9bab-7352-baab-d2420530279f`
  - slug: `smoke-motor-auto-bxwxhs`
  - estado inicial: `sales_closed`
  - `auto_draw_enabled=true`
  - números: `1..5`
  - vendidos: `1`
  - disponibles: `4`
  - entries confirmadas: `1`
  - no puede producir ganador con un único draw porque `hits_required=5`

## Primera pasada - backend y smoke HTTP

Quedó validado contra Laravel real:

- `GET /api/v1/admin/games`
- `GET /api/v1/admin/games/{game}`
- `GET /api/v1/admin/games/{game}/draws`
- `GET /api/v1/admin/games/{game}/counters`
- `GET /api/v1/admin/games/{game}/winner`
- `POST /api/v1/admin/games/{game}/start`
- `POST /api/v1/admin/games/{game}/pause`
- `POST /api/v1/admin/games/{game}/resume`
- `POST /api/v1/admin/games/{game}/draws`
- `POST /api/v1/admin/games/{game}/counters/rebuild`

Resultados:

- `start` quedó validado sobre juego manual y auto, incluyendo replay `already_started`;
- `pause` y `resume` quedaron validados sobre juego auto;
- `draw` manual quedó validado con `X-Draw-Command-Id` UUID real y replay idempotente;
- `rebuild counters` quedó validado como herramienta técnica separada;
- `winner` devolvió `404` limpio cuando no existía ganador;
- anónimo fue rechazado con `401`;
- player autenticado fue rechazado con `403`.

## Primera pasada - smoke visual

Validación disponible:

- la ruta principal del motor sigue siendo `/admin/bingos/:gameId/motor`;
- el detalle administrativo mantiene el acceso contextual al motor desde UUID real;
- la ruta técnica secundaria `/admin/motor?gameId=...` sigue siendo complementaria;
- la pantalla de login Angular respondió localmente con el formulario esperado.

Límite de la primera pasada:

- la automatización del navegador no se mantuvo estable durante el flujo completo de login, listado, detalle y motor;
- por ello la navegación administrativa quedó validada por render inicial, routing existente y contratos reales, pero no por recorrido E2E visual completo.

## Segunda pasada - estabilización de testing DB

Fecha de la segunda pasada: `2026-06-29`.

Diagnóstico final:

- `phpunit.xml` sí apunta a `APP_ENV=testing`, `DB_CONNECTION=pgsql` y `DB_DATABASE=backend_rifas_app_test`;
- `php artisan ... --env=testing` no heredaba esas variables de PHPUnit y seguía resolviendo `config('database.connections.pgsql.database')` como `backend_rifas_app`;
- el fallo amplio anterior no era un defecto estable del motor frontend, sino una mezcla de esquema de testing desalineado y ejecución de Laravel fuera de la DB de pruebas real.

Comprobación inequívoca previa al reset seguro:

- `APP_ENV=testing`
- `DB_CONNECTION=pgsql`
- `DB_HOST=127.0.0.1`
- `DB_PORT=55432`
- `DB_DATABASE=backend_rifas_app_test`

Reset aplicado solo sobre testing:

- `php artisan config:clear`
- `php artisan cache:clear`
- `php artisan migrate:fresh`

El reset se ejecutó con variables de proceso explícitas apuntando a `backend_rifas_app_test`, nunca sobre `backend_rifas_app`.

Resultado:

- se recreó la base de testing desde cero;
- se aplicaron también las migraciones recientes que antes estaban pendientes en testing:
  - `2026_06_26_100000_create_refunds_table`
  - `2026_06_26_100001_alter_game_events_add_order_refunded_type`
  - `2026_06_27_100000_create_winner_payouts_table`
  - `2026_06_27_100001_create_winner_payout_documents_table`

## Segunda pasada - backend amplio

Comando ejecutado:

`php artisan test --filter "AdminEngineEndpointsTest|StartGameActionTest|PauseGameActionTest|ResumeGameActionTest|DrawGameNumberIdempotencyTest|DrawGameNumberConcurrencyTest|DrawWinnerResolutionTest|RebuildCounters|AdminEngineResponseShapeTest"`

Ejecución final:

- `117` tests
- `420` assertions
- resultado: verde

Conclusión:

- el problema anterior quedó resuelto al estabilizar `backend_rifas_app_test`;
- el backend amplio del motor sí puede declararse sano cuando la suite corre contra la DB de testing correcta y recién migrada.

## Segunda pasada - entorno visual

Entorno revalidado:

- Angular en `http://127.0.0.1:4300`
- Laravel en `http://127.0.0.1:8000`

Datos nuevos desechables usados:

- manual:
  - id: `019f149e-08c0-73a4-b0e4-c42519d447d7`
  - slug: `smoke-motor-visual-manual-alf3pc`
  - estado inicial: `sales_closed`
  - `auto_draw_enabled=false`
- auto:
  - id: `019f149e-0909-716c-b0c6-3708f5078dba`
  - slug: `smoke-motor-visual-auto-0setrr`
  - estado inicial: `sales_closed`
  - `auto_draw_enabled=true`

## Segunda pasada - smoke visual

Resultado de herramienta:

- el browser in-app siguió fallando con timeouts al navegar y al pedir snapshots del DOM;
- como fallback se probó Edge real del sistema mediante Playwright usando `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`, sin instalar dependencias;
- con Edge fue posible abrir `/login` y confirmar el heading `Inicia sesión`;
- el submit visual del login siguió inestable bajo automatización;
- al precargar un token real en `sessionStorage`, la ruta `/admin/bingos` cargó la URL pero dejó `app-root` en un estado mínimo con solo `<router-outlet></router-outlet><!--container-->`, sin renderizar el shell admin de forma confiable para un smoke visual completo.

Conclusión visual:

- la segunda pasada mejora la evidencia de herramienta disponible, pero no alcanza para declarar completado el smoke visual admin de punta a punta;
- el bloqueo ya no está en Laravel ni en la testing DB, sino en la automatización visual del frontend bajo las herramientas disponibles en este entorno.

## Errores seguros

Casos comprobados de forma segura entre ambas pasadas:

- recurso inexistente -> `404`
- `winner` ausente -> `404` tratado como ausencia de ganador
- `pause` sobre juego manual no pausable -> `422`
- `draw` manual con header no UUID -> `422`
- `draw` sobre juego auto -> `422`
- anónimo -> `401`
- player sin permisos admin -> `403`

No se forzó:

- backend apagado;
- conflicto `409` de motor;
- corrupción de datos;
- errores de infraestructura.

## No-regresión

Quedó confirmado:

- siguen existiendo las rutas admin reales bajo `/api/v1/admin/games`;
- el frontend mantiene la consola del motor con UUID real contextual;
- no se agregaron nuevas features durante este cierre;
- el smoke no tocó producción ni juegos no desechables.

Quedó pendiente como smoke navegable real:

- recorrido completo de `/admin/bingos`, detalle y motor;
- smoke básico de player commerce desde navegador.

## Pruebas

Frontend:

- `npm test -- --watch=false`
- `npm run build`
- `git diff --check`

Backend focalizado y amplio:

- primera pasada: validación focalizada y smoke HTTP real;
- segunda pasada: suite amplia del motor en verde sobre `backend_rifas_app_test` recién recreada.

## Resultados

- frontend: tests pasando
- frontend: build pasando
- frontend: `npm run lint` no existe
- backend: suite amplia del motor pasando
- smoke real por API: validado
- smoke visual admin completo: todavía bloqueado por herramienta/automatización

## Riesgos aceptados

- la aceptación final depende de evidencia HTTP real y backend amplio verde, no de un recorrido navegador completamente automatizado;
- la automatización inestable sigue impidiendo verificar visualmente el shell admin y el flujo completo del motor;
- el smoke no incluyó backend apagado ni `409` reproducible de forma segura.

## Pendientes

- repetir el smoke administrativo completo desde navegador cuando el runtime del browser in-app o el fallback automatizado puedan renderizar el shell admin de forma confiable;
- si se quiere cerrar también la regresión funcional visible de Phase 2, ejecutar un smoke UI corto del flujo principal de player commerce en ese mismo entorno.

## Decisión actualizada

Con la segunda pasada:

- backend amplio del motor: aprobado;
- smoke real por HTTP: aprobado;
- smoke visual admin completo: todavía bloqueado por herramienta/automatización;
- cierre integral definitivo: sigue condicionado por la falta de un smoke visual suficientemente confiable.

## Sección final - smoke visual QA 2026-06-29

Fecha del smoke visual: `2026-06-29`

Navegador/runtime usado:

- intento previo con navegador in-app: inestable por timeouts al navegar y al pedir snapshots del DOM;
- reintento con Edge real del sistema vía Playwright dentro del runtime disponible: agotó timeout del runner sin completar un flujo visual confiable;
- reintento con Edge headless nativo: no produjo evidencia utilizable de screenshot en este entorno.

Entorno usado:

- frontend local en `http://127.0.0.1:4300`
- backend local en `http://127.0.0.1:8000`
- worktree frontend: `master`
- backend sin cambios productivos nuevos durante este smoke

Datos usados:

- admin: `smoke-motor-admin@example.com`
- player: `smoke-motor-player@example.com`
- juego manual: `019f149e-08c0-73a4-b0e4-c42519d447d7`
- juego automático: `019f149e-0909-716c-b0c6-3708f5078dba`

Pasos ejecutados:

1. se confirmó que Angular y Laravel seguían respondiendo localmente en `127.0.0.1:4300` y `127.0.0.1:8000`;
2. se reintentó abrir `/login` con runtime visual automatizado;
3. se reintentó login admin controlado;
4. se reintentó navegación hacia `/admin/bingos` y shell administrativo;
5. se validó que el bloqueo persistente seguía estando en la capa de automatización visual y no en la API local.

Resultados:

- el frontend siguió renderizando `/login` como punto de entrada válido;
- el smoke visual administrativo completo no pudo cerrarse de forma confiable;
- no se obtuvo evidencia navegable suficientemente estable para aprobar listado, detalle y motor como recorrido visual final;
- no fue necesario tocar backend testing ni contratos, porque el problema no reapareció allí.

Capturas textuales o evidencia suficiente:

- evidencia previa ya consolidada: apertura correcta de `/login` con heading `Inicia sesión`;
- evidencia técnica de esta pasada: reintentos de runtime visual agotados o sin screenshot utilizable, manteniendo el mismo bloqueo del shell admin bajo automatización.

Skips justificados:

- `start`, `pause/resume`, `draw manual` y `rebuild counters` no se repitieron visualmente en esta tercera pasada porque el prerrequisito de shell admin navegable no llegó a estabilizarse;
- esos flujos sí permanecen cubiertos por smoke HTTP real y backend amplio en verde de las pasadas previas.

Decisión final:

- esta pasada de QA no habilita declarar cierre visual definitivo;
- el cierre integral de Fase 3 motor sigue bloqueado exclusivamente por la falta de un navegador/runtime capaz de renderizar y recorrer de forma confiable la consola admin local.

## Cierre condicionado formal

Fecha: `2026-06-30`

Motivo del cierre condicionado:

- la Fase 3 motor ya quedó validada técnicamente;
- la única evidencia faltante es el smoke visual administrativo completo ejecutado desde un navegador real estable;
- los runtimes automatizados ya probados en este entorno no dieron un recorrido confiable de punta a punta.

Evidencias aprobadas:

- smoke HTTP real contra Laravel local aprobado;
- backend amplio del motor aprobado con `117` tests y `420` assertions;
- frontend tests aprobados con `41` archivos y `353` tests;
- build de frontend aprobado;
- contratos administrativos reales de start, pause, resume, draw manual y rebuild counters ya validados;
- datos desechables y entorno local ya documentados.

Evidencia faltante:

- render confiable del shell admin;
- navegación visual completa `login -> /admin/bingos -> detalle -> /admin/bingos/:gameId/motor -> regreso`;
- validación visual final de las mutaciones principales dentro de ese recorrido humano real.

Por qué el bloqueo no se atribuye al motor:

- Laravel local respondió correctamente en las validaciones HTTP reales;
- la suite backend amplia quedó verde después de estabilizar la DB de testing;
- frontend tests y build siguieron pasando;
- el fallo persistente apareció en la capa de automatización visual, no en las rutas, contratos o mutaciones del motor.

Por qué no se recomienda seguir intentando con el mismo runtime:

- el navegador in-app ya falló por timeouts de navegación y snapshots;
- Edge vía Playwright ya agotó timeout sin estabilizar el shell admin;
- Edge headless nativo tampoco dejó evidencia visual utilizable;
- repetir esos mismos runtimes solo duplicaría intentos fallidos sin agregar señal nueva.

Criterio exacto para convertirlo en cierre definitivo:

- ejecutar la checklist manual pendiente desde un navegador real estable;
- registrar navegador usado, fecha, usuarios y UUIDs de los juegos desechables;
- completar con evidencia suficiente la navegación admin hasta `/admin/bingos/:gameId/motor`;
- validar visualmente lecturas y acciones principales, o justificar skips por estado del juego;
- confirmar que no hay stack traces, errores globales falsos ni exposición de datos administrativos a player/anónimo.

## Checklist manual pendiente

Preparación:

1. levantar Laravel local en `http://127.0.0.1:8000`;
2. levantar Angular local en `http://127.0.0.1:4300`;
3. confirmar que el proxy frontend sigue resolviendo `/api` y `/sanctum` hacia Laravel;
4. usar únicamente DB local;
5. usar `smoke-motor-admin@example.com` como admin y `smoke-motor-player@example.com` como player;
6. usar únicamente juegos desechables:
   manual `019f149e-08c0-73a4-b0e4-c42519d447d7`
   automático `019f149e-0909-716c-b0c6-3708f5078dba`

Navegación admin:

1. abrir `/login`;
2. iniciar sesión como admin;
3. abrir `/admin/bingos`;
4. abrir el detalle del juego manual;
5. abrir `/admin/bingos/:gameId/motor` con el UUID real del juego manual;
6. volver al detalle;
7. volver al listado.

Lecturas motor:

1. confirmar visualmente el contexto del juego;
2. confirmar que `draws` renderiza;
3. confirmar que `counters` renderiza;
4. confirmar `winner` o ausencia de `winner` según el estado del juego;
5. confirmar que no hay stack traces;
6. confirmar que no aparecen errores globales falsos.

Start:

1. verificar que exista el botón cuando el estado del juego lo permita;
2. abrir la confirmación;
3. cancelar y confirmar que no mutó;
4. ejecutar `start`;
5. confirmar feedback visible;
6. confirmar refresh visual del estado.

Pause/resume:

1. abrir el juego automático seguro;
2. ejecutar `pause`;
3. confirmar feedback;
4. ejecutar `resume`;
5. confirmar que no aparecen ambos botones a la vez.

Draw manual:

1. ejecutar un solo draw sobre el juego manual;
2. confirmar número sorteado;
3. confirmar refresh de `draws`;
4. confirmar refresh de `counters`;
5. confirmar `winner` o ausencia de `winner`;
6. confirmar que doble click no duplica el draw.

Rebuild counters:

1. confirmar la sección `Herramientas técnicas`;
2. ejecutar `Reconstruir counters`;
3. confirmar `rebuilt` o `already_consistent`;
4. confirmar refresh posterior de `counters`.

Autorización:

1. probar acceso con player a `/admin/bingos`;
2. probar acceso con player a detalle/motor;
3. probar acceso anónimo a una URL directa del motor;
4. confirmar que no ven datos admin.

Evidencia mínima aceptable:

- navegador usado;
- fecha;
- usuario admin usado;
- UUID del juego manual;
- UUID del juego automático;
- resultado de cada paso;
- capturas o descripción textual suficiente;
- errores encontrados, si aplica.
