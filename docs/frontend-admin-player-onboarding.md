# Frontend Admin Player Onboarding

## Veredicto

Decisión: `A1 — Implementar create-player`.

El backend expone un contrato suficientemente claro para crear o reinvitar jugadores desde administración sin modificar Laravel:

- `POST /api/v1/admin/players`

## Auditoría contractual

| Acción | Endpoint | Método | Body | Auth | Middleware | Resource | Errores | Tests | Veredicto |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Crear o reinvitar jugador | `/api/v1/admin/players` | `POST` | `name`, `email` | `auth:sanctum` | `admin`, `throttle:admin.create-player` | `PlayerInvitationResource` | `401`, `403`, `422`, `429`; `200` para `already_registered`; `201` para `invited/reinvited` | `AssistedRegistrationTest`, `IdentityE2EFlowTest`, `PlayerActivationTest`, `PlayerCreationConcurrencyTest` | Apto |

### Evidencia backend revisada

- `routes/api.php`
- `app/Http/Controllers/Admin/CreatePlayerController.php`
- `app/Http/Requests/Admin/CreatePlayerRequest.php`
- `app/Http/Resources/Admin/PlayerInvitationResource.php`
- `app/Actions/Auth/CreatePlayerInvitationAction.php`
- `app/DTOs/Auth/CreatePlayerData.php`
- `app/DTOs/Auth/CreatePlayerResult.php`
- `app/Enums/CreatePlayerOutcome.php`
- `app/Providers/AppServiceProvider.php`
- `tests/Feature/Auth/AssistedRegistrationTest.php`
- `tests/Feature/Auth/IdentityE2EFlowTest.php`
- `tests/Feature/Auth/PlayerActivationTest.php`
- `tests/Integration/Auth/PlayerCreationConcurrencyTest.php`

## Payloads reales

Request:

```json
{
  "name": "Alice",
  "email": "alice@example.com"
}
```

Response `201 invited` o `201 reinvited`:

```json
{
  "data": {
    "outcome": "invited",
    "user": {
      "id": 17,
      "name": "Alice",
      "email": "alice@example.com",
      "role": "player"
    },
    "invitation": {
      "id": "uuid-v7",
      "expires_at": "2026-07-12T12:00:00Z"
    },
    "plain_token": "solo-si-el-backend-lo-expone"
  }
}
```

Response `200 already_registered`:

```json
{
  "data": {
    "outcome": "already_registered",
    "user": {
      "id": 3,
      "name": "Registered",
      "email": "registered@example.com",
      "role": "player"
    },
    "invitation": null
  }
}
```

## UX implementada

- `/admin/participantes` reemplaza el placeholder por una vista real de onboarding.
- `/admin/participants` redirige a `/admin/participantes`.
- Formulario claro con solo `name` y `email`.
- Normalización frontend segura: trim en nombre y trim + lower en email para alinear con Laravel.
- Resultado real del backend:
  - `invited`
  - `reinvited`
  - `already_registered`
- Se muestran únicamente:
  - usuario devuelto;
  - `invitation.id` y `invitation.expires_at` si existen;
  - `plain_token` solo si el backend realmente lo expone.
- No se afirma “correo enviado” porque el contrato no lo devuelve.
- Empty state honesto: no existe todavía listado administrativo paginado de participantes.

## Arquitectura frontend

- `src/app/features/admin-players/models/admin-players.models.ts`
  - payload y view models reales del bloque.
- `src/app/features/admin-players/data-access/admin-players.repository.ts`
  - repository HTTP específico para `POST /admin/players`.
- `src/app/features/admin-players/data-access/admin-players.mapper.ts`
  - mapper defensivo para `PlayerInvitationResource`.
- `src/app/features/admin-players/data-access/admin-players.facade.ts`
  - estado finito;
  - bloqueo de doble submit;
  - mapeo seguro de `401/403/422/429/0/500`.
- `src/app/features/admin-players/pages/admin-players-page/admin-players-page.ts`
  - formulario reactivo accesible;
  - resultado real del backend;
  - responsive básico.

## Errores cubiertos

- `401`: sesión ausente o vencida.
- `403`: usuario autenticado sin acceso admin.
- `422`: validación Laravel.
- `429`: throttle `admin.create-player`.
- `0`: error de red.
- otros: error inesperado.

## Testing

Cobertura añadida:

- `admin-players.repository.spec.ts`
  - endpoint;
  - body real;
  - respuestas `201/200`;
  - `401/403/422/429/500/red`;
  - payload inválido.
- `admin-players.mapper.spec.ts`
  - payload válido;
  - rama `already_registered`;
  - payload incompleto.
- `admin-players.facade.spec.ts`
  - éxito;
  - doble submit;
  - `422`;
  - `429`;
  - red;
  - `401/403`.
- `admin-players-page.spec.ts`
  - validación;
  - canonicalización;
  - success;
  - `already_registered`;
  - estado de error/submitting.
- `app.spec.ts`
  - ruta admin `participantes`;
  - alias `participants`.

## Validación final

Comandos objetivo del cierre:

```bash
npm test -- --watch=false
npm run build
npm run lint
git diff --check
git status --short
```

Resultado final:

- `npm test -- --watch=false`: pasa, `65` archivos y `489` tests.
- `npm run build`: pasa.
- `npm run lint`: no existe script `lint` en este repo.
- `git diff --check`: sin errores de whitespace; Git reporta solo advertencias CRLF en `app.config.ts`, `app.routes.ts` y `app.spec.ts`.
- `git status --short`: quedan únicamente los archivos de este bloque en el working tree.

## Riesgos

- No existe listado admin real de participantes; este bloque cubre solo creación/invitación.
- `plain_token` depende del entorno backend y puede no venir en producción.
- El throttle es por admin autenticado; el frontend solo puede reflejar `429`, no evitar condiciones de backend más allá del doble submit local.
