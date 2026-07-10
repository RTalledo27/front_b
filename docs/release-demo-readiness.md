# B11 — Release / Demo Readiness

Fecha: `2026-07-10`

## 1. Resumen ejecutivo del estado del producto

El estado actual del frontend permite preparar una demo local reproducible de punta a punta sobre contratos reales de `../backend_rifas_app`, sin abrir nuevas features.

Bloques ya cerrados y aprovechables en demo:

- B1 `Admin lifecycle`
- B2 `Identidad` en estado `I2 — Parcial seguro`
- B3 `Admin commerce` (`refund` / `payout`)
- B4 `Player Home real`
- B5 `Admin onboarding / crear jugador`
- B6 `Engine polish`
- B8 `QA/smoke integral`
- B9 `Runbook operativo`
- B10 `UX operativo del flujo real`

Estado técnico verificado en este cierre:

- `GET http://127.0.0.1:8000/api/v1/public/games` responde `200`
- `http://127.0.0.1:4200` responde `200`
- `npm test -- --watch=false` pasa con `66` archivos y `509` tests
- `npm run build` pasa
- `git diff --check` pasa

## 2. Qué módulos están listos

- Catálogo público de juegos.
- Detalle público del juego.
- Reserva real de números con idempotencia y refresh.
- Login, registro, activación, recuperación y verificación de correo.
- Player Home basado en datos reales.
- Vistas player de compras, reservas y cartones.
- Admin lifecycle de juegos.
- Admin motor del juego con draws, counters y rama `winner 404` honesta.
- Admin commerce para `approve`, `refund` y `payout`.
- Admin onboarding de jugador desde `/admin/participantes`.

## 3. Qué módulos no deben demostrarse todavía

- Reportes.
- Dashboard analítico como producto final.
- Settings/configuración avanzada.
- Inicio nuevo de social linking autenticado desde SPA (`I2` mantiene esa limitación).
- Flujos que dependan de correo externo u OAuth real si el entorno local no tiene proveedor/configuración disponible.
- Cualquier dato no desechable o no documentado para smoke.

## 4. Cómo levantar backend local

Hay dos modos válidos y deben documentarse sin ambigüedad.

### Opción A — Laravel local + PostgreSQL/Redis en Docker

Usar esta opción si se levanta Laravel con `php artisan serve` o `php.exe -S`.

Variables críticas:

```powershell
$env:DB_HOST="127.0.0.1"
$env:DB_PORT="55432"
```

Pasos sugeridos:

```powershell
cd C:\Users\rogit\proyectos\rifas\backend_rifas_app
php artisan config:clear
$env:DB_HOST="127.0.0.1"
$env:DB_PORT="55432"
php artisan serve --host=127.0.0.1 --port=8000
```

### Opción B — Laravel dentro de Docker

Usar esta opción si todo el backend corre dentro del contenedor del proyecto.

Variables esperadas dentro del contenedor:

```env
DB_HOST=postgres
DB_PORT=5432
```

Estado observado en este cierre:

- `rifas_app` arriba en `0.0.0.0:8000->8000`
- `rifas_postgres` arriba en `0.0.0.0:55432->5432`
- `rifas_redis` arriba

## 5. Cómo levantar frontend local

```powershell
cd C:\Users\rogit\proyectos\rifas\frontend_rifas_app
npm install
npm start -- --host 127.0.0.1 --port 4200
```

Validación mínima:

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:4200
```

Resultado observado en este cierre: `200 OK`.

## 6. Configuración correcta `DB_HOST` según modo Docker/local

- Laravel local fuera de Docker:
  - `DB_HOST=127.0.0.1`
  - `DB_PORT=55432`
- Laravel dentro de Docker:
  - `DB_HOST=postgres`
  - `DB_PORT=5432`

Regla operativa importante:

- no usar `DB_HOST=postgres` cuando Laravel corre fuera de Docker;
- ese error ya fue visto en smoke y termina en `SQLSTATE[08006] could not translate host name "postgres" to address`.

## 7. Usuarios smoke/demo

Usuarios smoke recientes documentados:

- admin: `smoke.admin@example.com`
- player: `smoke.player@example.com`

Usuarios legacy con contraseña explícitamente documentada en smoke de motor:

- admin: `smoke-motor-admin@example.com` / `secret123`
- player: `smoke-motor-player@example.com` / `secret123`

Usuarios del runbook operativo:

- player sin ganador: `runbook.player.1783646823@example.com`
- player con ganador: `winner.player.1783646917@example.com`

Nota:

- si una demo necesita credenciales exactas, usar primero las cuentas provisionadas en el entorno local actual;
- no asumir que todos los usuarios históricos siguen activos si la base fue recreada.

## 8. Datos demo recomendados

Datasets ya documentados y desechables:

- lifecycle:
  - juego: `019f2372-597b-73ba-8a7a-fa55a612b54e`
  - slug: `smoke-bingo-1783006096911`
- refund:
  - `order_id`: `019f2864-bbf4-7166-ae84-36996e95219c`
  - `payment_id`: `019f2864-bc3a-722e-90ba-a56e62d5fc01`
  - juego: `019f23c8-272e-716f-ad02-cb34ec5e1826`
- payout:
  - juego principal: `fd7800f4-88f7-44d3-9ab3-8d6a1518fd95`
  - juego auxiliar responsive: `bd331d69-874e-4e8b-86a6-a0d5ee3f6225`
- runbook sin ganador:
  - slug: `runbook-1783646823`
  - id: `019f49a2-af78-710d-ba8b-74d937395871`
- runbook con ganador:
  - slug: `winner-runbook-1783646917`
  - id: `019f49a4-2111-717c-9f47-ce04d69c5b27`

Recomendación:

- reutilizar datasets ya cerrados cuando sigan existiendo;
- si faltan, recrearlos solo con datos desechables.

## 9. Flujo de demo paso a paso

Flujo mínimo recomendado, de menor a mayor riesgo:

1. Público
   - abrir `/`
   - abrir `/bingos`
   - abrir `/bingos/:slug`
   - abrir `/bingos/:slug/numeros`
2. Auth
   - login player
   - logout
   - login admin
3. Player
   - `/jugador/inicio`
   - `/jugador/compras`
   - `/jugador/reservas`
   - `/jugador/cartones`
4. Admin lifecycle
   - `/admin/bingos`
   - `/admin/bingos/:gameId`
   - mostrar panel `Lifecycle administrativo`
   - explicar guía operativa de `start`
5. Admin motor
   - `/admin/bingos/:gameId/motor`
   - revisar draws, counters y winner
   - si winner responde `404`, mostrar la rama honesta `Sin ganador aún`
6. Admin onboarding
   - `/admin/participantes`
7. Admin commerce
   - `/admin/ordenes`
   - `/admin/pagos`
   - `/admin/pagos/:paymentId` si el dataset existe
8. Flujo operativo explicado con runbook
   - `draft -> published -> sales_open -> sales_closed -> running -> completed`

## 10. Checklist antes de demo

- backend responde `200` en `GET /api/v1/public/games`
- frontend responde en `4200`
- confirmar si se usará Opción A u Opción B de entorno
- confirmar que los usuarios smoke existen
- confirmar que los datasets desechables siguen disponibles
- confirmar que no se usarán datos reales
- revisar `npm test -- --watch=false`
- revisar `npm run build`
- revisar `git diff --check`
- revisar `git status --short`

## 11. Checklist durante demo

- validar que no aparezca pantalla blanca
- validar que no aparezcan loaders infinitos
- validar que `social auth` siga debajo del CTA principal
- validar que el player home salga de loading
- validar que admin detail no entre en loop de `/numbers`
- validar que el motor muestre winner vacío como empty state honesto
- validar que botones principales sigan visibles en móvil
- no ejecutar mutaciones sobre juegos o pagos no desechables

## 12. Checklist post-demo

- logout de admin y player
- verificar que no queden cambios locales accidentales
- registrar si algún dataset quedó mutado
- anotar cualquier bug hallado como:
  - bloqueante para demo
  - no bloqueante
  - recomendación futura

## 13. Errores conocidos

- `SQLSTATE[08006] could not translate host name "postgres" to address`
  - causa: Laravel local fuera de Docker usando `DB_HOST=postgres`
  - acción: cambiar a `DB_HOST=127.0.0.1`, `DB_PORT=55432`
- `winner 404`
  - no es error fatal
  - se trata como ausencia esperada de ganador
- `400` por `Idempotency-Key` faltante en approve/evidence/reservation
  - es un error contractual real y debe mostrarse como tal

## 14. Warnings conocidos

- `npm run lint` no existe en `package.json`
- warning histórico de budget SCSS:
  - `src/app/features/game-numbers/pages/number-selection-page/number-selection-page.ts`
  - excede `4.00 kB` por `535 bytes`

No se corrigen dentro de B11 porque no bloquean la preparación de demo/release local.

## 15. Comandos de validación

Frontend:

```powershell
git status --short
git branch --show-current
git log -1 --oneline
git diff --check
npm test -- --watch=false
npm run build
npm run lint
rg "console\.log|console\.debug|debugger" src
rg "\b(skip|xit|fit|fdescribe|it\.skip)\b" src -g "*.spec.ts"
rg -F "[auth-login-debug]" src docs
rg -F "[b8-data-debug]" src docs
```

Backend:

```powershell
cd C:\Users\rogit\proyectos\rifas\backend_rifas_app
git status --short
git branch --show-current
git log -1 --oneline
git diff --check
php artisan route:list
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8000/api/v1/public/games
```

## 16. Rutas críticas

Público:

- `/`
- `/bingos`
- `/bingos/:slug`
- `/bingos/:slug/numeros`

Auth:

- `/login`
- `/registro`
- `/recuperar-acceso`
- `/restablecer-acceso`
- `/verifica-tu-correo`

Player:

- `/jugador/inicio`
- `/jugador/compras`
- `/jugador/reservas`
- `/jugador/cartones`

Admin:

- `/admin/bingos`
- `/admin/bingos/:gameId`
- `/admin/bingos/:gameId/motor`
- `/admin/motor?gameId=:gameId`
- `/admin/participantes`
- `/admin/ordenes`
- `/admin/pagos`
- `/admin/pagos/:paymentId`

## 17. Riesgos pendientes

- la disponibilidad real de usuarios smoke depende de la base local vigente
- el social linking nuevo sigue limitado por el modelo Bearer-only de la SPA
- el repo backend tiene cambios locales no pertenecientes a B11 y no debe tocarse en este bloque
- el warning histórico de presupuesto SCSS sigue existiendo
- `npm run lint` sigue ausente como script

## 18. Próximos bloques recomendados

Orden sugerido:

1. B12 — endurecimiento de release real y empaquetado operacional
2. smoke guiado final con datos de demo congelados
3. cierre de gaps de entorno externos: correo/OAuth si se necesitarán en demo pública
