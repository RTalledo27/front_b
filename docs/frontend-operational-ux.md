# Frontend Operational UX

Fecha: `2026-07-10`

## Hallazgos tomados del runbook

- El flujo real del juego es `draft -> published -> sales_open -> sales_closed -> running -> completed`.
- `start` solo es válido desde `sales_closed`, con `scheduled_start_at` vencido, sin comercio pendiente y con al menos una `entry` confirmada.
- Activar invitación crea acceso, pero no verifica correo.
- Jugadores no verificados no pueden reservar ni subir evidencia.
- La ausencia de `winner` por `404` es una rama válida y no un error fatal.
- `Idempotency-Key` sigue siendo contractual en reserva, evidencia y aprobación.

## Cambios UI aplicados

- `admin-game-detail-page`: guía operativa visible para `start`, con condiciones conocidas y límite explícito de validación backend.
- `game-engine-page`: estado honesto de “Sin ganador aún” y guía previa al inicio cuando el botón todavía no corresponde.
- `activate-page` y `email-verification-notice-page`: copy explícito de activación vs verificación.
- `number-selection-page`: CTA a `/verifica-tu-correo` cuando el backend devuelve `email_not_verified`.
- `player-order-detail-page`: error idempotente visible como problema técnico contractual y CTA de verificación para evidencia.
- `game-detail-page`: copy público claro para estados `sales_closed`, `running` y `completed` sin inventar dashboard en vivo.

## Límites

- No se duplicó la lógica backend de readiness como fuente de verdad absoluta.
- El frontend solo explica condiciones conocidas y aclara que Laravel vuelve a validar al iniciar.
- No se cambiaron endpoints, payloads ni middleware.

## Tests cubiertos

- Guía de inicio en admin detail y motor.
- Rama `winner` ausente como empty state.
- Activación no equivale a verificación.
- CTA de verificación en reserva y evidencia.
- Error de `Idempotency-Key` visible en evidencia.
- Copy público honesto para juego `running`.

## Riesgos

- Si el backend cambia los códigos exactos de verificación (`email_not_verified`), los CTAs dependen de ese contrato.
- La guía de readiness se basa en campos hoy expuestos; si Laravel agrega nuevas precondiciones sin exponerlas, la UI seguirá remitiendo al backend como autoridad final.
