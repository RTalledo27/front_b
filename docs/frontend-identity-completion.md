# Bloque 2 - Identidad completa frontend

## Veredicto

Decisión actual: `I2 — Parcial seguro`.

El backend expone contratos maduros y consistentes para:

- forgot password;
- reset password;
- email verification;
- resend verification email;
- social login;
- social accounts list;
- social unlink.

La vinculación social nueva (`GET /api/v1/auth/social/{provider}/link/redirect`) quedó fuera de implementación activa en esta SPA porque hoy requiere `auth:sanctum` en una navegación/redirección backend->proveedor, mientras el frontend autentica con Bearer en `sessionStorage`. Sin una iniciación stateful compatible con esta SPA o un endpoint puente explícito, no es seguro ni correcto inventar un transporte para abrir el redirect autenticado.

## Auditoría contractual

| Acción | Endpoint | Método | Body | Auth requerida | Middleware | Resource/Response | Errores confirmados | Tests backend | Veredicto |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Forgot password | `/api/v1/auth/forgot-password` | `POST` | `email` | No | `throttle:auth.forgot-password` | `{ message }` | `422`, `429`, red | `PasswordResetTest` | Claro |
| Reset password | `/api/v1/auth/reset-password` | `POST` | `email`, `token`, `password`, `password_confirmation` | No | `throttle:auth.reset-password` | `{ message }` | `422 password_reset_invalid`, `429`, red | `PasswordResetTest` | Claro |
| Resend verification | `/api/v1/auth/email/verification-notification` | `POST` | `{}` | Sí | `auth:sanctum`, `throttle:auth.resend-verification` | `{ message }` | `401`, `429`, red | `EmailVerificationTest` | Claro |
| Verify email | `/api/v1/auth/email/verify/{id}/{hash}` | `POST` | firmado en query: `expires`, `signature` | Sí | `auth:sanctum`, `signed`, `throttle:auth.verify-email` | `{ message, email_verified }` | `401`, `422 email_verification_invalid`, `429`, red | `EmailVerificationTest` | Claro |
| Social login redirect | `/api/v1/auth/social/{provider}/redirect` | `GET` | none | No | throttle social | redirect externo | `404`, `503 provider_not_configured` | `SocialLoginTest` | Claro |
| Social login callback | `/api/v1/auth/social/{provider}/callback` | `GET` | `state`, `code` o `error` | No | throttle social | redirect frontend con `code` o `error` | `invalid_state`, `expired_state`, `callback_already_processed`, `account_link_required`, `verified_email_required`, `oauth_error` | `SocialLoginTest`, `IdentityE2EFlowTest` | Claro |
| Social exchange | `/api/v1/auth/social/exchange` | `POST` | `code` | No | throttle social | `AuthTokenResource` | `422 exchange_code_not_found|expired|consumed`, `429`, red | `SocialLoginTest` | Claro |
| Social accounts list | `/api/v1/auth/social-accounts` | `GET` | none | Sí | `auth:sanctum` | `LinkedSocialAccountResource[]` | `401`, red | `SocialLinkTest` | Claro |
| Social unlink | `/api/v1/auth/social/{provider}` | `DELETE` | `current_password?` | Sí | `auth:sanctum`, throttle social unlink | `{ message, provider }` | `401`, `422 invalid_current_password|reauthentication_required|last_authentication_method|not_linked`, `429`, red | `SocialLinkTest`, `IdentityE2EFlowTest` | Claro |
| Social link redirect | `/api/v1/auth/social/{provider}/link/redirect` | `GET` | none | Sí | `auth:sanctum` | redirect externo | `401`, `404`, provider config | `SocialLinkTest`, `IdentityE2EFlowTest` | Contrato claro, integración SPA pendiente |
| Social link callback | `/api/v1/auth/social/{provider}/link/callback` | `GET` | `state`, `code` o `error` | No (el attempt ya identifica usuario) | throttle social | redirect frontend con `outcome` o `error` | `invalid_state`, `expired_state`, `callback_already_processed`, `social_identity_conflict`, `provider_already_linked`, `oauth_error` | `SocialLinkTest` | Contrato claro |

## Implementado en frontend

- Extensión de `AuthRepository` y `AuthSessionService` para forgot/reset, verify/resend y social exchange.
- Nuevo mapper `auth-identity.mapper` para `LinkedSocialAccountResource` y payload firmado de verificación.
- Nueva UX de:
  - `/recuperar-acceso`
  - `/restablecer-acceso`
  - `/verifica-tu-correo`
  - `/verificar-correo/:id/:hash`
  - `/auth/social/callback`
  - `/jugador/identidad`
- `login` y `registro` ahora muestran accesos sociales públicos reales (`google`, `facebook`) y enlace a recuperación.
- `routeForUser()` envía a usuarios no verificados hacia `/verifica-tu-correo` cuando no existe `returnUrl` seguro.
- El shell del jugador expone acceso a `Identidad`.
- Existe callback frontend para social link (`/auth/social/link/callback`), pero la iniciación de link nueva queda documentada como pendiente de compatibilidad SPA.

## Omitido intencionalmente

- No se modificó backend.
- No se implementó player home nuevo.
- No se inventó endpoint puente para social linking.
- No se usaron cookies stateful ni query params con tokens.
- No se tocaron admin lifecycle ni admin commerce salvo navegación mínima.

## UX y errores

- Forgot password conserva mensaje neutro del backend para no filtrar existencia de correos.
- Reset password exige token+email reales desde query string y no intenta submit cuando el enlace está incompleto.
- Verify email reusa el link firmado real y exige sesión activa; si el usuario llega anónimo, lo manda a login con `returnUrl` seguro a la misma ruta.
- Social callback mapea errores reales del backend y solo completa sesión vía `POST /auth/social/exchange`.
- Linked accounts permite listar y desvincular con `current_password` opcional; si el backend exige reautenticación social reciente o bloquea el último método, la UI lo reporta sin inventar bypasses.

## Testing

- `src/app/core/auth/data-access/auth.repository.spec.ts`
- `src/app/core/auth/services/auth-session.service.spec.ts`
- `src/app/core/auth/services/auth-identity.mapper.spec.ts`
- `src/app/core/auth/services/auth-redirect.service.spec.ts`
- `src/app/core/auth/interceptors/api-credentials.interceptor.spec.ts`
- `src/app/features/auth/data-access/forgot-password.facade.spec.ts`
- `src/app/features/auth/data-access/reset-password.facade.spec.ts`
- `src/app/features/auth/data-access/email-verification.facade.spec.ts`
- `src/app/features/auth/data-access/social-accounts.facade.spec.ts`
- `src/app/features/auth/pages/login-page/login-page.spec.ts`
- `src/app/features/auth/pages/register-page/register-page.spec.ts`
- `src/app/features/auth/pages/activate-page/activate-page.spec.ts`
- `src/app/features/auth/pages/forgot-password-page/forgot-password-page.spec.ts`
- `src/app/features/auth/pages/reset-password-page/reset-password-page.spec.ts`
- `src/app/features/auth/pages/email-verification-notice-page/email-verification-notice-page.spec.ts`
- `src/app/features/auth/pages/email-verification-callback-page/email-verification-callback-page.spec.ts`
- `src/app/features/auth/pages/linked-social-accounts-page/linked-social-accounts-page.spec.ts`
- `src/app/app.spec.ts`

Cobertura validada en este bloque:

- contratos HTTP reales;
- mapper de `LinkedSocialAccountResource`;
- loading que termina;
- doble submit bloqueado;
- errores `401/422/429/0`;
- redirect seguro de verificación;
- redirect post-activación/registro hacia estado de verificación;
- social exchange;
- linked social accounts y unlink;
- formularios accesibles de forgot/reset.

## Smoke

- Smoke técnico local cubierto con `npm test -- --watch=false` y `npm run build`.
- Smoke OAuth real no quedó ejecutado extremo a extremo porque depende de proveedores/configuración externa local.
- La parte social implementada y verificable sin backend nuevo es:
  - redirects públicos construidos con rutas reales;
  - callback frontend;
  - exchange real;
  - lista/unlink de cuentas sociales sobre API real.

## Riesgos pendientes

- La vinculación social nueva desde esta SPA sigue pendiente hasta que backend y frontend compartan un mecanismo explícito para iniciar un redirect autenticado compatible con Bearer-only.
- No se ejecutó smoke real de correo porque depende de entrega de mail/enlace firmado fuera de la suite frontend.
- `npm run lint` debe confirmarse según scripts locales del proyecto; si falta, se documenta como ausencia del script, no como fallo funcional.

## Validación final exacta

- `npm test -- --watch=false`: `59` archivos, `456` tests, todos passing.
- `npm run build`: passing. Se mantiene un warning preexistente de budget SCSS en `number-selection-page` (`4.54 kB` vs budget `4.00 kB`).
- `npm run lint`: el script no existe en `package.json` local (`npm error Missing script: "lint"`).
- `git diff --check`: limpio; solo warnings de Git por normalización futura `LF -> CRLF`, sin errores de whitespace.
- `git status --short`: árbol modificado solo por este bloque frontend/documentación.
- Barrido de hardening:
  - sin `console.debug`;
  - sin `debugger`;
  - sin marcador `[auth-login-debug]`;
  - sin `xit`/`fit`/`fdescribe` ni `it.skip`/`describe.skip`.

## Auth social buttons visual polish

- Login y register ahora muestran los accesos sociales debajo del CTA principal.
- Se añadió separador visual y SVG inline local para Google y Facebook, sin dependencias nuevas.
- Se conservaron las URLs reales de `auth/social/{provider}/redirect` y la lógica funcional existente.
