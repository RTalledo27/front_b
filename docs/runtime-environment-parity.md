# B18 - Paridad de runtime local, CI y release

Fecha: 2026-07-13.

## Veredicto

B18 define tres modos explícitos y medidos. `php artisan serve` permanece como
servidor de desarrollo; no representa demo ni release. El runtime recomendado
para demo/release es una imagen inmutable PHP 8.3 FPM detrás de Nginx, con
OPcache release, migración one-shot y healthchecks de aplicación y proxy.

FrankenPHP no se incorpora: el repositorio no tiene Octane ni configuración
FrankenPHP existente y no hay evidencia que justifique sumar otro modelo de
ejecución persistente, riesgo de estado entre requests y mantenimiento extra.

## Inventario inicial

| Entorno | Runtime inicial | Base/Redis | Estado |
| --- | --- | --- | --- |
| Windows rápido | Angular y Laravel host | Docker en `127.0.0.1:55432` y `56379` | Más rápido para editar |
| Docker desarrollo | Artisan Serve, 4 workers, bind mount completo | `postgres:5432`, `redis:6379` | Reproducible, I/O lento en Docker Desktop |
| CI | No existía | No definido | Gap corregido |
| Demo/release | No existía | No definido | Gap corregido |

Laravel usa PHP `^8.2`; las imágenes fijan PHP `8.3`. PostgreSQL es 16 y Redis
es 7. La ruta framework `GET /up` ya existía, por lo que no se creó contrato
HTTP nuevo.

## Matriz de runtimes

| Runtime | Uso | Concurrencia | OPcache | Healthcheck | Complejidad | Paridad | Riesgo | Veredicto |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Artisan host | Desarrollo Windows | Servidor dev | timestamps activos | `/up` manual | Baja | Media | No es release | Mantener |
| Artisan Docker, 4 workers | Desarrollo reproducible | 4 workers | CLI, timestamps activos | `/up` | Baja | Media | Bind mount lento | Mantener para edición |
| Nginx + PHP-FPM | Demo/release | Pool FPM + Nginx | timestamps desactivados | FPM y HTTP `/up` | Media | Alta | Operación de dos procesos | Elegido |
| FrankenPHP | No asignado | Compatible en teoría | Disponible | No configurado | Alta hoy | Baja hoy | Modelo nuevo sin pruebas | Omitido |

## Decisión por entorno

### Desarrollo rápido en Windows

```powershell
cd C:\Users\rogit\proyectos\rifas\backend_rifas_app
.\scripts\start-dev-fast.ps1
```

El script inicia PostgreSQL, Redis y Mailpit, resuelve sus puertos publicados,
define `DB_HOST=127.0.0.1`, limpia caches y ejecuta Laravel en host. No modifica
`.env`, no guarda secretos y falla si Docker/PHP faltan o el puerto 8000 está
ocupado.

### Desarrollo Docker reproducible

```powershell
docker compose up -d --build
docker compose ps
```

Usa `DB_HOST=postgres`, `DB_PORT=5432`, bind mount, cuatro workers y OPcache con
timestamps. Es el modo de edición reproducible, no el baseline de release.

### CI

Backend CI usa PHP 8.3, PostgreSQL 16 y Redis 7, aplica migraciones, ejecuta la
suite y Pint. Un job separado construye Nginx/FPM, ejecuta la migración one-shot
y exige healthchecks verdes. Frontend CI usa Node 22, `npm ci`, tests y build.
No existe deployment automático ni se usan secretos reales.

Para tests locales dentro del contenedor optimizado debe usarse:

```powershell
.\scripts\test-backend.ps1
# o una selección focalizada
.\scripts\test-backend.ps1 -Path tests/Feature/Auth/LocalAuthenticationTest.php
```

El script limpia el cache bajo `APP_ENV=testing`, fuerza
`backend_rifas_app_test` y recrea `app` al terminar. Ejecutar `php artisan test`
directamente dentro de un contenedor previamente optimizado puede reutilizar la
configuración de la base principal y no es un flujo seguro.

### Demo/release representativo

```powershell
$env:APP_KEY='<clave temporal segura>'
$env:DB_PASSWORD='<password temporal seguro>'
$env:DB_DATABASE='backend_rifas_app_b181_release_test'
$env:DB_USERNAME='rifas_b181_release'
$env:RELEASE_HTTP_PORT='18081'
$env:RELEASE_APP_URL='http://localhost:18081'
docker compose -p rifas_b181_release -f docker-compose.release.yml up -d --build --wait
docker compose -p rifas_b181_release -f docker-compose.release.yml ps
```

El Compose release es autónomo, no publica PostgreSQL/Redis y crea volúmenes
acotados al project `rifas_b181_release`. La configuración exige `APP_KEY`,
`DB_PASSWORD` y `DB_DATABASE`; el entrypoint bloquea bases vacías o principales.

Rollback:

```powershell
docker compose -p rifas_b181_release -f docker-compose.release.yml down
docker compose up -d app
```

## Docker y filesystem

- Desarrollo conserva el bind mount completo para feedback inmediato.
- Release copia código y `vendor` dentro de la imagen; `.dockerignore` excluye
  `.env`, Git, tests, docs, caches locales y dependencias Node.
- La imagen FPM instala extensiones PHP y `phpredis`; las dependencias de build
  se eliminan antes de exportar la capa.
- Imagen medida: FPM `150,564,459` bytes frente a app dev `622,471,572` bytes.
- Memoria post-smoke: Artisan `90.84 MiB`; FPM `35.82 MiB`; Nginx `12.36 MiB`.
- Release usa autoload classmap authoritative y OPcache sin validación de
  timestamps. Desarrollo conserva validación de archivos.
- El pool FPM es explícito: 2 procesos iniciales, máximo 6 hijos y reciclado
  cada 500 requests para evitar crecimiento indefinido de procesos largos.

## Healthchecks y readiness

Orden de release:

1. PostgreSQL y Redis deben estar healthy.
2. `release-migrate` ejecuta `php artisan migrate --force` y termina en cero.
3. FPM ejecuta `php artisan optimize` con variables release y queda healthy al
   procesar `/up` mediante FastCGI.
4. Nginx arranca después y valida `/up` por HTTP.

`/up` no requiere auth, no usa datos comerciales y respondió en 7 ms en la
validación release. El healthcheck Docker dev usa la misma ruta con timeout de
15 s porque el bootstrap sobre bind mount llegó a 7-8 s. `optimize:clear` se usa
al cambiar a host; `optimize` se usa al arrancar contenedores. No se ejecutan
migraciones desde cada worker FPM.

## Comparación

Dataset local desechable: admin del seeder, player
`b18.player@example.test` y juego `b18-runtime-smoke`. Cuatro muestras por caso;
la primera se registra como cold del endpoint y las tres restantes como warm.
`winner=404` es la ausencia esperada de ganador.

| Runtime | Endpoint/lote | Cold | Warm promedio | Peor | Memoria | Veredicto |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| Docker Artisan 4w | public games | 1.933 s | 2.087 s | 2.401 s | 90.84 MiB | Desarrollo |
| Docker Artisan 4w | auth/me | 1.998 s | 3.362 s | 5.600 s | 90.84 MiB | Variabilidad alta |
| Docker Artisan 4w | me/entries | 2.762 s | 2.199 s | 2.762 s | 90.84 MiB | Desarrollo |
| Docker Artisan 4w | admin/games | 2.940 s | 2.738 s | 2.940 s | 90.84 MiB | Desarrollo |
| Docker Artisan 4w | motor paralelo | 4.743 s | 3.472 s | 6.020 s | 90.84 MiB | No usar como release |
| Nginx + FPM | public games | 0.035 s | 0.023 s | 0.035 s | 48.18 MiB | Release |
| Nginx + FPM | auth/me | 0.025 s | 0.021 s | 0.025 s | 48.18 MiB | Release |
| Nginx + FPM | me/entries | 0.023 s | 0.024 s | 0.026 s | 48.18 MiB | Release |
| Nginx + FPM | admin/games | 0.043 s | 0.035 s | 0.043 s | 48.18 MiB | Release |
| Nginx + FPM | motor paralelo | 0.070 s | 0.071 s | 0.073 s | 48.18 MiB | Release |
| Laravel host B17 | endpoints warm | 0.24-0.38 s | 0.24-0.38 s | 0.44 s | No medido | Referencia rápida |

El benchmark reproducible es `scripts/benchmark-runtime.ps1`; recibe el URL y
game ID, y exige credenciales mediante variables `RUNTIME_BENCHMARK_*` de
proceso. Nunca imprime tokens.

## Seguridad y observabilidad

- Release fija `APP_ENV=production` y `APP_DEBUG=false`.
- Secretos llegan por variables; `.env` no entra en la imagen.
- CORS, Sanctum, autorización y contratos no cambian.
- Nginx oculta `X-Powered-By`, deniega dotfiles y agrega headers básicos.
- Aplicación y Nginx escriben logs en stdout/stderr; no se agregó logging de
  payloads, credenciales o tokens.
- Storage y bootstrap cache pertenecen a `www-data`.
- Trusted proxies requiere decisión específica del proveedor antes de exponer
  el servicio detrás de un balanceador; no se amplió globalmente.

## Smoke y validación

Con Angular `4200` y backend Docker `8000` se revisaron catálogo, login/logout,
Player Home, admin bingos y motor. En `390`, `768` y `1280`,
`scrollWidth <= clientWidth`; todas las vistas salieron de loading con espera
real y la consola quedó sin warnings/errores. El motor devolvió
`200/200/200/404` para detail/draws/counters/winner.

El dataset vacío no contenía un juego running con entries, por lo que no se
mutó artificialmente lifecycle para repetir un sorteo. La estabilidad live y
la detención de polling permanecen cubiertas por la suite frontend y el smoke
B17; B18 no modifica código de producto.

## Troubleshooting y riesgos

- `could not translate host name postgres`: Laravel corre en host con cache de
  Docker; usar `start-dev-fast.ps1` o `php artisan optimize:clear`.
- Tests alteran la base principal: se ejecutaron dentro del contenedor con cache
  local; usar `scripts/test-backend.ps1`. La validación B18 conservó
  `main_before=1` y `main_after=1` al repetir 84 tests sobre la DB testing.
- Puerto 8000 ocupado: detener el otro modo antes de arrancar.
- Puerto release ocupado: cambiar `RELEASE_HTTP_PORT` y `RELEASE_APP_URL`.
- FPM healthy pero login `500 Class Redis not found`: reconstruir la imagen
  actual, que incluye `phpredis`.
- El primer build compila extensiones PHP y es costoso; Docker reutiliza cache.
- Falta validar la configuración concreta de TLS/proxy del futuro proveedor.
- Workers de queue y scheduler siguen siendo una decisión de despliegue; no se
  simulan dentro del proceso web.
