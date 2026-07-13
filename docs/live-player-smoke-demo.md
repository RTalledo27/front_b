# B15 - Live player smoke/demo

Fecha: 2026-07-13

## Veredicto

El contrato vertical B14 funciona extremo a extremo con datos locales desechables. Un jugador autenticado mantuvo abierto `/jugador/cartones` mientras se ejecutaron draws administrativos reales y la UI avanzó por polling de `0/2` a `1/2` y finalmente a `2/2`, ganador y juego completado, sin recarga de la vista player.

No se encontraron bugs funcionales ni se modificó código de aplicación o backend. La automatización disponible expuso un único tab/contexto: el motor admin se validó visualmente antes y después de los draws, pero durante el tramo simultáneo las mutaciones se enviaron mediante el mismo endpoint admin autenticado en lugar de pulsar el botón desde una segunda ventana. B12 y la suite vigente siguen cubriendo el comportamiento local del CTA de draw.

## Entorno

- Frontend Angular: `http://localhost:4200` y servidor aislado de sesión player en `http://localhost:4202`.
- Backend Laravel: `http://127.0.0.1:8000`.
- PostgreSQL Docker: `DB_HOST=127.0.0.1`, `DB_PORT=55432`.
- Navegador automatizado real con viewport controlado.
- Backend sin cambios durante B15.

## Datos desechables

- Juego: `B15 Live Smoke Game`.
- Game ID: `019f4e3a-77be-7280-9ab5-420b5f7216ee`.
- Slug: `b15-live-1783723869`.
- Configuración: dos números, `hits_required=2`, draw manual.
- Player smoke: `b15.player.1783723869@example.com`.
- Entry: `019f4e3a-e175-73eb-b4da-c9e65a55e661`, número `1`.
- La orden, reserva, evidencia PDF y aprobación fueron creadas mediante contratos HTTP reales; la aprobación produjo una entry confirmada.

## Secuencia ejecutada

1. El motor admin cargó el juego en `sales_closed`, mostró `Iniciar juego`, counters reales y el empty state `Sin ganador aún`.
2. `POST /api/v1/admin/games/{game}/start` respondió `200`, `status=running`, `outcome=started` y `confirmed_entries_count=1`.
3. El player cargó `/jugador/cartones` ya en `running`, mostrando `Aciertos reales: 0/2`.
4. Cada draw usó un `X-Draw-Command-Id` UUID nuevo. Las secuencias 1 a 5 sortearon `2`; el player conservó `0/2` y actualizó el último draw por polling.
5. La secuencia 6 sorteó `1`; sin recarga, el player mostró `1/2` y `Último número sorteado: 1 - sorteo #6`.
6. La secuencia 7 sorteó `1`; Laravel creó el winner y completó el juego.
7. Sin recarga, el player mostró `Ganador`, `Juego finalizado`, `2/2`, sorteo `#7` y fecha de victoria.
8. Después de 25 segundos adicionales, la UI permaneció estable y sin indicador de refresh, coherente con el corte del polling en `completed`.

## Resultado admin

- El contexto real cargó sin loader infinito.
- Antes del inicio se mostraron las precondiciones conocidas, el CTA de inicio y `Sin ganador aún` sin error fatal.
- Después de completar, el motor mostró estado `Finalizado`, última extracción `1 / #7`, ganador, siete draws y counters `1: 2 aciertos`, `2: 5 aciertos`.
- No hubo pantalla blanca, overflow horizontal ni errores nuevos de consola.
- Limitación de evidencia: el navegador de automatización solo mantuvo un tab. Los draws simultáneos se enviaron por el endpoint admin real mientras la UI player permanecía abierta; no se repitió el clic visual del CTA ya cubierto en B12.

## Resultado player

- El cartón confirmado mostró exclusivamente `live_progress` devuelto por Laravel.
- Rama sin ganador: `0/2`, último número `2`, secuencias `#1` y `#2`, juego en vivo.
- Progreso parcial: `1/2`, último número `1`, secuencia `#6`.
- Rama ganadora: `2/2`, `is_winner=true`, estado `completed`, último número `1`, secuencia `#7`.
- Durante refresh se mantuvieron el cartón y el valor anterior; solo apareció el aviso no bloqueante de actualización.
- No hubo recarga global, loader infinito ni errores de consola.

## Red y polling

Frecuencia observada en player: refresh controlado aproximadamente cada 10 segundos mientras `game_status=running`. Tras `completed`, la pantalla permaneció estable durante 25 segundos y no volvió a mostrar estado de actualización.

Estado final de endpoints:

| Endpoint | Estado |
| --- | ---: |
| `GET /api/v1/auth/me` | 200 |
| `GET /api/v1/me/entries` | 200 |
| `GET /api/v1/public/games/{slug}` | 200 |
| `GET /api/v1/admin/games/{game}` | 200 |
| `GET /api/v1/admin/games/{game}/draws` | 200 |
| `GET /api/v1/admin/games/{game}/counters` | 200 |
| `GET /api/v1/admin/games/{game}/winner` | 200 después de completar |

El payload final de `live_progress` fue estable: `hits_current=2`, `hits_required=2`, `latest_draw_number=1`, `latest_draw_sequence=7`, `game_status=completed`, `is_winner=true` y timestamps de cierre/victoria presentes.

## Responsive

Se validaron `/jugador/cartones` y `/admin/bingos/{gameId}/motor` en `390`, `768` y `1280` px.

| Ruta | 390 px | 768 px | 1280 px |
| --- | --- | --- | --- |
| Player cartones | `scrollWidth = clientWidth` | `scrollWidth = clientWidth` | `scrollWidth = clientWidth` |
| Motor admin | `scrollWidth = clientWidth` | `scrollWidth = clientWidth` | `scrollWidth = clientWidth` |

El panel de progreso, el resultado final, historial, counters y acciones permanecieron contenidos y legibles. No hubo overflow horizontal ni cards o botones fuera del viewport.

## Bugs y riesgos

- Bugs bloqueantes: ninguno.
- Bugs no bloqueantes: ninguno reproducible.
- Riesgo de demo: la latencia local de autenticación/bootstrap puede acercarse a 60 segundos; no produjo estados infinitos.
- Límite de esta ejecución: no hubo dos ventanas automatizadas simultáneas. Para una demo humana, abrir admin y player en perfiles/contextos separados permite observar también el gesto del botón admin en tiempo real.

## Decisión

B15 queda aceptado para el contrato live player. El progreso, la rama sin ganador, la rama ganadora, el corte de polling y el responsive se comprobaron con datos reales y desechables. No se abre B16 por ausencia de un bug de producto.
