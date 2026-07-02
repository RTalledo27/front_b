# Auditoría frontend: freeze post-login

Fecha: 2026-06-30
Actualización de reproducción real: 2026-07-01

Antecedente: esta revisión continúa el hardening descrito en `docs/frontend-runtime-freeze-audit.md`, pero el alcance aquí queda limitado al flujo de autenticación/login.

## Síntoma

El navegador enviaba `POST http://localhost:8000/api/v1/auth/login` y el backend podía responder `200 OK`, pero la UI quedaba en `Ingresando...`. La hipótesis validada en código fue un fallo frontend posterior al HTTP 200: mapper, escritura de sesión, navegación o guard.

## Contrato real

Backend inspeccionado en modo solo lectura:

- `POST /api/v1/auth/login` resuelve a `Auth\LoginController`.
- `GET /api/v1/auth/me` resuelve a `Auth\MeController`.
- `AuthTokenResource` devuelve `data.token_type`, `data.access_token`, `data.abilities` y `data.user`.
- `AuthUserResource` devuelve `id`, `name`, `email`, `role`, `email_verified`, `email_verified_at` y `capabilities.can_access_admin/can_use_player_features`.

Shape alineado:

```json
{
  "data": {
    "token_type": "Bearer",
    "access_token": "...",
    "abilities": ["auth:logout", "player:access", "user:read"],
    "user": {
      "id": 1,
      "name": "Jugador",
      "email": "jugador@example.com",
      "role": "player",
      "email_verified": false,
      "email_verified_at": null,
      "capabilities": {
        "can_access_admin": false,
        "can_use_player_features": true
      }
    }
  }
}
```

## Causa raíz frontend

`LoginPage.submit()` ejecutaba `router.navigateByUrl(...)` dentro de `subscribe.next`. Si la navegación era cancelada o rechazada, ese error quedaba fuera del `catchError` del flujo de login y podía dejar errores post-200 sin tratamiento uniforme. Además, el mapper de auth confiaba demasiado en la forma del payload y podía fallar al restaurar sesión si `/auth/me` devolvía capacidades incompletas.

La reproducción real posterior identificó la causa raíz visible del freeze: `anonymousOnlyGuard` estaba configurado en el shell auth padre con `path: ''`. Esa ruta padre puede participar en el matching de prefijos de todo el árbol; después de `POST /auth/login -> 200`, el login guardaba token y usuario, calculaba `/jugador/inicio` y llamaba `router.navigateByUrl('/jugador/inicio')`, pero el router volvía a evaluar el shell auth anónimo y redirigía de nuevo al home del usuario. El resultado era un loop de guard/router que dejaba la pestaña no responsive y el botón visualmente pegado.

## Corrección aplicada

- La navegación post-login y la restauración manual de sesión pasan por `switchMap(() => from(router.navigateByUrl(...)))`.
- Las cancelaciones/rechazos de router se normalizan como `auth_redirect_failed`.
- `catchError` convierte errores de mapper, sesión cambiada y redirect en mensajes controlados.
- `finalize` gobierna siempre `submitting` y `checkingSession`.
- El doble submit queda bloqueado mientras el primer login sigue pendiente.
- El mapper valida runtime el token, usuario, rol, `email_verified`, `email_verified_at` y capabilities antes de escribir sesión.
- `/auth/me` con payload inválido limpia token y vuelve a estado anónimo para evitar loops o pantalla blanca por sesión corrupta.
- Una respuesta tardía de login después de logout ya no puede rehidratar sesión.
- `anonymousOnlyGuard` se movió desde el shell auth padre `path: ''` hacia las rutas hijas `login`, `registro` y `activar`. Así el guard solo protege rutas anónimas reales y ya no intercepta `/jugador/*` ni `/admin/*`.

## Interceptors y guards

`apiCredentialsInterceptor` conserva el comportamiento esperado: agrega `Accept: application/json`, no duplica `Authorization`, y no adjunta Bearer a login/register/activate ni a rutas públicas. `authErrorInterceptor` sigue limpiando sesión en 401 y evitando redirects sobre rutas auth. `authGuard`, `adminGuard` y `anonymousOnlyGuard` ya transforman errores de `ensureSession()` en `UrlTree` seguro.

El punto crítico corregido es estructural: el shell auth padre no debe tener `canMatch`. El guard anónimo pertenece a las rutas terminales de autenticación, no al wrapper `path: ''`.

## Pruebas añadidas o actualizadas

- `src/app/core/auth/services/auth-user.mapper.spec.ts`: contrato válido, `access_token` snake_case, usuario válido, `email_verified=false`, `email_verified_at=null`, capabilities válidas, payload incompleto, capabilities incompletas y rol desconocido.
- `src/app/core/auth/data-access/auth.repository.spec.ts`: endpoint de login, response válido, 401, 422, 500 y error de red.
- `src/app/core/auth/services/auth-session.service.spec.ts`: login guarda token, payload incompleto no persiste, `/auth/me` inválido limpia token, no loop de restauración concurrente y respuesta tardía tras logout no restaura estado.
- `src/app/features/auth/pages/login-page/login-page.spec.ts`: éxito apaga loading y redirige, error de mapper apaga loading y muestra mensaje, redirect rechazado apaga loading y muestra mensaje, 422 apaga loading, doble submit bloqueado y sesión cambiada durante login queda controlada.
- `src/app/app.spec.ts`: el shell auth padre queda sin `canMatch`, mientras `login`, `registro` y `activar` conservan `anonymousOnlyGuard`.

## Reproducción real con credenciales locales

Fecha/hora: 2026-07-01, navegador Edge visible con perfil limpio y DevTools/CDP.

Preparación:

- Se limpió `.angular/cache`.
- Angular se levantó con `npm start -- --host 127.0.0.1 --port 4200`.
- Backend Docker existente respondió en `http://localhost:8000`.
- Se creó un usuario player temporal mediante `POST /api/v1/auth/register`; no se registró contraseña ni token en logs.

Evidencia antes del fix de rutas:

- `POST http://localhost:8000/api/v1/auth/login -> 200`.
- `login:mapped` apareció con `role=player`, `hasToken=true`, `tokenLength=51`.
- `session:save:done` apareció; el token y usuario sí se guardaban.
- `redirect:resolve:done` devolvió `/jugador/inicio`.
- `router:navigate:start /jugador/inicio` apareció.
- A partir de ahí se repitieron entradas de `guard:anonymous:start`, `ensureSession:cached-authenticated` y `guard:anonymous:decision redirect-home`.
- No había `NavigationEnd` estable hacia `/jugador/inicio`; el tab llegó a quedar no responsive y CDP terminó con timeout.

Clasificación: Caso D, `router.navigate:start` ocurre pero la navegación queda atrapada en guard/router loop.

Evidencia después del fix:

- `POST http://localhost:8000/api/v1/auth/login -> 200`.
- `login:mapped`, `session:save:done`, `redirect:resolve:done /jugador/inicio`.
- `guard:auth:start /jugador/inicio`.
- `guard:auth:decision allow`.
- `NavigationEnd /jugador/inicio`.
- URL final: `http://127.0.0.1:4200/jugador/inicio`.
- Título: `Mi inicio | Fortuna`.
- `sessionStorage` contiene la key `stackflow.auth.access-token`; solo se verificó presencia y longitud, no valor.
- Console sin errores nuevos.
- Network sin loop de `/auth/me`; no se observó request loop posterior al login.

## Validación runtime

Smoke con navegador integrado:

- `http://localhost:4200/login` cargó con `document.readyState=complete`.
- Título: `Iniciar sesión | Fortuna`.
- UI visible: `Inicia sesión`, `Correo electrónico`, `Contraseña`, `Ingresar a mi cuenta`.
- Console warnings/errors: ninguno.
- Recarga de `/login`: sin pantalla blanca y sin errores de consola.
- Navegación directa a `/jugador/compras` sin token: redirect seguro a `/login?returnUrl=%2Fjugador%2Fcompras`, sin loop visible y sin errores de consola.
- Navegación autenticada posterior hacia `/jugador/compras`: no se declara cerrada en esta corrida; Edge/CDP quedó bloqueado por diálogo/timeout antes de obtener una evidencia estable de UI y network.

La validación con login real quedó ejecutada con usuario player temporal local. No se documentaron secretos ni tokens completos.

## Seguimiento de sesión y header público

Síntoma adicional observado después del fix de login:

- con sesión iniciada, `/bingos` y `/` podían mostrar mezcla visual de estado anónimo y autenticado;
- el header público pintaba `Ingresar` y `Mi cuenta` al mismo tiempo porque no estaba conectado a la sesión real;
- al recargar `/admin/bingos` y `/jugador/compras`, el guard esperaba `/auth/me` y la app quedaba varios segundos sin una superficie controlada antes de renderizar el shell correspondiente.

Causa raíz encontrada:

- `PublicShell` era completamente estático: siempre renderizaba `Ingresar` en el nav y `Mi cuenta` como CTA, sin consultar `AuthSessionService`;
- la app raíz no disparaba hidratación temprana de sesión al arrancar cuando existía token en `sessionStorage`;
- por esa razón, en rutas protegidas con `canMatch`, la sesión se resolvía recién durante el guard y el usuario veía una pantalla vacía mientras `/auth/me` seguía pendiente.

Correcciones aplicadas:

- `src/app/app.ts`, `src/app/app.html` y `src/app/app.scss` ahora hidratan sesión al arranque cuando hay token almacenado y muestran un overlay transitorio real de `Recuperando tu sesión…` hasta que `ensureSession()` termina o falla;
- `src/app/core/layout/public-shell/public-shell.ts` ahora usa `AuthSessionService` como fuente única de verdad;
- el header público distingue cuatro estados visibles:
  - anónimo: muestra `Ingresar`;
  - autenticado player: muestra `Mi cuenta`;
  - autenticado admin: muestra `Panel admin`;
  - verificando sesión: muestra `Verificando sesión…` sin mezclar ramas incompatibles.

Pruebas añadidas:

- `src/app/core/layout/public-shell/public-shell.spec.ts`: cubre estado anónimo, player, admin, checking y actualización reactiva tras login/logout;
- `src/app/app.spec.ts`: cubre hidratación automática al arranque, overlay temporal y limpieza del overlay si `ensureSession()` falla.

Validación manual posterior:

- player real:
  - login completó en `/jugador/inicio`;
  - `/jugador/compras` disparó `GET /api/v1/me/orders` y terminó en empty state controlado, sin pantalla blanca;
  - `/bingos` mostró `Mi cuenta` y no mostró `Ingresar`;
  - recarga de `/bingos` mantuvo la sesión visual correcta.
- admin real:
  - login completó en `/admin/dashboard`;
  - `/admin/bingos` mostró primero `Recuperando tu sesión…`, luego shell admin y luego estado de datos (`Cargando juegos…` -> `Sin resultados`), sin pantalla blanca pura;
  - `/bingos` y `/` mostraron `Panel admin` y no mostraron `Ingresar`.
- anónimo:
  - después de logout, `/bingos` volvió a mostrar `Ingresar` y no mostró `Mi cuenta` ni `Panel admin`.

Requests observados en backend durante el smoke:

- `/api/v1/auth/me` en recargas protegidas y públicas con sesión, sin loops de redirect;
- `/api/v1/me/orders` al validar `/jugador/compras`;
- `/api/v1/admin/games` al validar `/admin/bingos`;
- `/api/v1/public/games` al validar `/bingos`.

## Riesgos pendientes

- El backend Docker sigue mostrando latencias variables de varios segundos en `/auth/login`, `/auth/me`, `/me/orders`, `/public/games` y `/admin/games`; hoy ya no causan pantalla blanca ni mezcla de header, pero sí afectan la percepción de velocidad.
- El overlay de recuperación aparece en recargas con token mientras `/auth/me` está pendiente; eso es intencional para eliminar el vacío visual, pero conviene seguir vigilando su duración si backend aumenta latencia.
