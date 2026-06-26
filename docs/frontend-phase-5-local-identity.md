# Bloque 1 - Identidad local frontend

## Contrato confirmado con backend

- Autenticacion local basada en bearer token emitido por Sanctum personal access tokens.
- Endpoint canonico de sesion: `GET /api/v1/auth/me`.
- Login: `POST /api/v1/auth/login`.
- Registro de jugador: `POST /api/v1/auth/register`.
- Activacion por invitacion: `POST /api/v1/auth/activate`.
- Logout: `POST /api/v1/auth/logout`.
- Respuesta autenticada: `token_type`, `access_token`, `abilities`, `user`.

## Decisiones frontend del bloque

- El token se guarda en `sessionStorage` para sobrevivir recargas de la pestana actual sin convertir esto en persistencia larga entre navegadores o perfiles.
- Las rutas anonimas quedan agrupadas bajo `anonymousOnlyGuard` para impedir que usuarios autenticados vuelvan a `/login`, `/registro` o `/activar`.
- La restauracion de sesion usa el token almacenado y llama al endpoint canonico `GET /api/v1/auth/me`.
- Las redirecciones posteriores a login, registro o activacion respetan `returnUrl` solo si es una ruta interna segura y no apunta a otra pantalla de autenticacion.
- Los `401` limpian sesion y redirigen a `/login`; los `403` mandan a `/403`.

## Alcance implementado

- Repositorio de autenticacion y modelos alineados al contrato real del backend.
- Servicio de sesion con login, registro, activacion, restauracion de sesion y logout.
- Interceptor para `Authorization: Bearer <token>` solo en endpoints internos que realmente lo requieren.
- Interceptor de errores de auth para forzar recuperacion consistente ante `401` y `403`.
- Paginas reales de `login`, `registro` y `activar` con formularios reactivos, mensajes de error del backend y redirecciones por rol/capacidad.
- Boton de logout funcional tanto en shell admin como player.
- Cobertura de pruebas para repositorio, servicio, guards, interceptores y pantallas del bloque.
