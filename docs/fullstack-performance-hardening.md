# B17 - Performance y experiencia de carga

Fecha: 2026-07-13.

## Veredicto

B17 identifica tres causas medibles y aplica dos mejoras compatibles, sin cambiar
contratos HTTP ni reglas de negocio:

1. El bind mount de Docker Desktop sobre Windows domina el TTFB de Laravel.
2. `php artisan serve` con un solo worker serializaba las lecturas paralelas que
   Angular ya iniciaba correctamente.
3. Player Home podía solicitar dos veces el mismo juego público al componer
   reservas y cartones; ahora espera ambas secciones y consulta cada slug una vez.

Las rutas autenticadas warm dejaron de acercarse a 60 segundos. Para la demo
local más rápida en Windows se recomienda Laravel en el host con PostgreSQL y
Redis en Docker. Docker completo sigue siendo el modo más reproducible y ahora
usa cuatro workers para evitar la serialización total.

## Entornos y metodología

### Modo A - Docker reproducible

- Angular local en `http://localhost:4200`.
- Laravel dentro de `rifas_app`, publicado en `127.0.0.1:8000`.
- PostgreSQL en `postgres:5432` y Redis dentro de Docker.
- `PHP_CLI_SERVER_WORKERS=4`, OPcache CLI activo y `php artisan optimize` al iniciar.

### Modo B - Host rápido para Windows

- Angular local en `http://localhost:4200`.
- Laravel con `php artisan serve` en Windows.
- PostgreSQL en `127.0.0.1:55432`; Redis permanece en Docker.
- Se ejecuta `php artisan config:clear` antes de cambiar de modo.

Cada endpoint se midió de forma serial al menos tres veces con `curl`,
registrando status, TTFB, tiempo total y tamaño. Los lotes player/admin se
midieron además en paralelo para reproducir la carga real de las facades. Los
smokes visuales usaron navegador real y datos B15 desechables.

## Baseline HTTP warm

Todos los registros devolvieron `200`. Los valores son promedio y peor caso de
tres repeticiones, en segundos; TTFB y total difirieron solo por milisegundos.

| Endpoint | Docker 1 worker promedio / peor | Host promedio / peor | Tamaño |
| --- | ---: | ---: | ---: |
| `GET /public/games` | 2.588 / 2.689 | 0.285 / 0.291 | 8961 B |
| `GET /public/games/{slug}` | 2.805 / 2.952 | 0.297 / 0.336 | 810 B |
| `GET /public/games/{slug}/numbers` | 2.312 / 2.375 | 0.238 / 0.252 | 161 B |
| `POST /auth/login` | 2.936 / 2.967 | 0.512 / 0.551 | 398 B |
| `GET /auth/me` | 2.784 / 3.394 | 0.243 / 0.265 | 241 B |
| `GET /me/orders` | 2.758 / 2.943 | 0.288 / 0.336 | 1010 B |
| `GET /me/reservations` | 2.465 / 2.638 | 0.262 / 0.273 | 569 B |
| `GET /me/entries` | 2.717 / 2.943 | 0.278 / 0.323 | 1291 B |
| `GET /admin/games` | 2.570 / 3.176 | 0.362 / 0.440 | 12777 B |
| `GET /admin/games/{game}` | 2.749 / 2.987 | 0.383 / 0.441 | 1560 B |
| `GET /admin/games/{game}/draws` | 2.593 / 3.049 | 0.262 / 0.271 | 2455 B |
| `GET /admin/games/{game}/counters` | 2.723 / 3.058 | 0.279 / 0.312 | 989 B |
| `GET /admin/games/{game}/winner` | 2.365 / 2.844 | 0.254 / 0.274 | 387 B |
| `GET /admin/orders` | 2.484 / 3.094 | 0.331 / 0.405 | 7105 B |
| `GET /admin/payments` | 2.323 / 2.726 | 0.299 / 0.345 | 5947 B |

Cold start de `/public/games`:

- Docker: entre 3.447 y 5.739 s según el worker que recibe el primer hit.
- Host Windows: 0.292 s en la primera petición medida.

El tamaño no correlaciona con la demora: una respuesta de 161 bytes tardaba más
de dos segundos en Docker. La espera ocurre antes del primer byte.

## Profiling y causa raíz

La auditoría backend previa registró entre una y cuatro queries simples por
endpoint y SQL muy por debajo del tiempo total. La revisión actual confirmó:

- `ListMyEntriesQuery` usa subquery para aciertos y eager loading de juego,
  último draw, winner y número; no hay N+1 en `live_progress`.
- `AuthSessionService.ensureSession()` comparte la petición pendiente y no
  duplica `/auth/me` entre bootstrap y guards.
- Player Home dispara orders, reservations y entries de forma independiente y
  paralela.
- El servidor de un worker terminaba el lote player escalonado en 4.38, 6.66 y
  9.07 s: la concurrencia del navegador se convertía en cola.
- Docker Desktop realiza el bootstrap PHP sobre un bind mount de Windows. Ese
  I/O explica que endpoints pequeños y queries triviales tengan TTFB de segundos.
- Cache, sesión y queue siguen en PostgreSQL (`database`). No se cambió a Redis
  porque el baseline no justificaba alterar persistencia o semántica de sesión.

## Cambios

### Backend/runtime

`docker-compose.yml` define `PHP_CLI_SERVER_WORKERS=4` y ejecuta Artisan Serve
con `--no-reload`, requisito de Laravel para respetar múltiples workers. El
valor puede ajustarse con la variable homónima sin editar el compose.

El contenedor validado mostró un proceso padre y cuatro workers, OPcache CLI
activo, PostgreSQL en `postgres:5432` y consumo estable de aproximadamente
86 MiB sin carga.

### Frontend

`PlayerHomeFacade` espera que reservas y cartones terminen antes de componer
estado público live. Un slug compartido se consulta una sola vez por carga. Los
errores parciales siguen terminando loading y conservan la composición posible.

No se cambió App/bootstrap ni `AuthSessionService`: la deduplicación de sesión
ya era correcta y el TTFB medido demostraba que no eran la causa raíz.

## Comparativa antes/después

| Superficie | Modo | Antes | Después | Mejora | Evidencia |
| --- | --- | ---: | ---: | ---: | --- |
| Lote player: orders + reservations + entries | Docker | 9.102 s, 1 worker | 2.322 s promedio warm, 4 workers | 74.5% | tres lotes warm post-fix |
| Lote motor: detail + draws + counters + winner | Docker | 12.046 s, 1 worker | 7.963 s, 4 workers | 33.9% | lote HTTP paralelo |
| `/public/games` warm | Docker vs host | 2.588 s | 0.285 s | 89.0% | tres repeticiones por modo |
| Motor, contenido útil | navegador | 16.870 s Docker | 3.816 s host | 77.4% | misma ruta y dataset |
| Player Home, contenido útil | host | riesgo histórico cercano a 60 s | 2.486 s | no comparable porcentualmente | smoke post-fix |
| Juego público, contenido útil | host | sin baseline comparable | 0.753 s | no se declara porcentaje | smoke post-fix |

Las diferencias Docker/host son comparaciones de modo, no una supuesta mejora
de queries. La mejora de workers sí compara el mismo código y base de datos.

## Experiencia percibida y smoke

Tiempos host warm observados desde navegación hasta contenido útil:

| Ruta | Shell | Contenido útil |
| --- | ---: | ---: |
| `/bingos` | 0.106 s | 0.415 s |
| `/bingos/:slug` | 0.129 s | 0.753 s |
| `/bingos/:slug/numeros` | 0.157 s | 1.080 s |
| `/jugador/inicio` | 0.940 s | 2.486 s |
| `/jugador/cartones` | 0.914 s | 1.967 s |
| `/jugador/compras` | 0.935 s | 1.556 s |
| `/admin/bingos` | 0.931 s | 0.931 s |
| `/admin/bingos/:gameId/motor` | 0.888 s | 3.036 s |

Login player y admin navegaron en aproximadamente 1.5 s. Se validaron
`390`, `768` y `1280` px con `scrollWidth <= clientWidth`; no hubo loader
infinito, request storm, pantalla blanca, error de consola ni regresión del
estado live completado. Los logs mostraron una sola consulta pública al slug
compartido después de cargar Player Home.

## Comandos recomendados

### Demo rápida en Windows

```powershell
docker compose up -d postgres redis mailpit
$env:DB_HOST="127.0.0.1"
$env:DB_PORT="55432"
php artisan config:clear
php artisan serve --host=127.0.0.1 --port=8000
```

### Docker reproducible

```powershell
docker compose up -d --build
docker compose ps
```

Dentro de Docker se mantienen `DB_HOST=postgres` y `DB_PORT=5432`. Al volver
desde host a Docker se debe recrear `app`; su comando de inicio ejecuta
`php artisan optimize` con la configuración interna correcta.

## Tests, límites y riesgos

- El spec de Player Home verifica dos slugs únicos, ausencia de requests live
  mientras las colecciones siguen pendientes y composición al finalizar.
- Frontend: 68 archivos y 530 tests aprobados; `npm run build` aprobado.
- Backend focalizado: 32 tests y 233 assertions aprobadas para auth, player
  queries y lectura pública.
- `npm run lint` no existe en el proyecto frontend.
- `git diff --check` aprobó en ambos repos; Git solo mostró avisos informativos
  LF/CRLF en el frontend.
- El build conserva únicamente el warning histórico de 599 bytes en el SCSS de
  `number-selection-page.ts`.
- El cambio backend es operacional; se valida con `docker compose config`,
  procesos workers, endpoints reales y tests focalizados dentro del contenedor.
- `php artisan serve` continúa siendo un servidor de desarrollo. Cuatro workers
  reducen cola, pero no eliminan el costo del bind mount.
- El modo host es más rápido, mientras Docker es más reproducible entre equipos.
- No se añadieron índices ni cache de payloads porque no había evidencia que lo
  justificara.
- Sigue el warning histórico SCSS de `number-selection-page.ts`; B17 no cambia
  budgets.

## Decisión

B17 puede cerrarse: hay baseline repetido, causa raíz identificada, mejoras
medibles, rutas autenticadas warm por debajo del riesgo histórico, contratos y
seguridad preservados, y experiencia live estable.
