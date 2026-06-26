# Frontend Phase 2 - Payment Evidence

## Alcance

Este bloque conecta el detalle de orden del jugador con la carga real de evidencia de pago ya soportada por backend.

Incluye:

- consumo exacto de `GET /api/v1/me/orders/{order}` y `POST /api/v1/me/orders/{order}/payment-evidence`;
- carga `multipart/form-data` con el campo real `evidence`;
- validacion local de tipo y tamano antes del submit;
- estrategia de `Idempotency-Key` por usuario, orden y archivo logico;
- manejo explicito de `409`, `425`, `422`, `401`, `403`, red e inesperado;
- refresh del detalle despues de exito o rechazo definitivo;
- descarte de respuestas tardias cuando cambia la orden, la sesion o el archivo;
- cobertura automatizada del flujo.

No incluye descarga, reemplazo o eliminacion de documentos, pagos, aprobaciones, dashboards, OAuth ni cambios backend.

## Contrato backend revalidado

- `GET /api/v1/me/orders/{order}`
- `POST /api/v1/me/orders/{order}/payment-evidence`
- `SubmitPaymentEvidenceRequest` exige `required|file|mimetypes:image/jpeg,image/png,image/webp,application/pdf|max:5120`
- `SubmitPaymentEvidenceResource` devuelve solo:
  - `order { id, status }`
  - `payment { id, status, submitted_at }`
  - `document { id, original_filename, mime_type, size_bytes, sha256 }`
- el frontend no expone ni depende de `disk`, `path` ni rutas internas del documento

## Multipart

- el submit usa `FormData`
- el request adjunta exactamente un archivo en la clave `evidence`
- el frontend no fuerza manualmente el header `Content-Type`
- el archivo se conserva solo en memoria de la pestana actual

## Reglas de validacion local

- tipos aceptados: `image/jpeg`, `image/png`, `image/webp`, `application/pdf`
- tamano maximo aceptado: `5 MiB` exactos
- `5 MiB + 1 byte` se rechaza antes del POST
- el mensaje de error local participa en `aria-describedby` y marca `aria-invalid`

## Idempotencia

La clave idempotente se modela por:

- usuario autenticado
- orden
- archivo logico canonico

La firma logica incluye:

- nombre original normalizado
- tipo MIME
- tamano
- huella local del archivo

Matriz:

- mismo usuario + misma orden + mismo archivo logico: reutiliza la misma clave
- distinto archivo: genera una clave nueva
- distinta orden: genera una clave nueva
- logout o cambio de usuario: limpia la clave pendiente
- exito: limpia la clave
- `409 idempotency_key_mismatch`: limpia la clave
- `425 idempotency_in_progress`: conserva la clave para retry seguro
- error de red: conserva la clave

## Replay y respuestas tardias

- el facade ignora dobles submits directos mientras la validacion o el submit siguen en curso
- las respuestas tardias se descartan si cambia la orden activa
- las respuestas tardias se descartan si cambia la sesion
- limpiar el archivo seleccionado invalida validaciones asincronas viejas para que no reaparezcan selecciones descartadas

## Estados y UX

- la zona de carga solo aparece cuando la orden y el pago siguen en `pending`
- despues de un exito local, la UI oculta el formulario aunque el refresh del detalle llegue tarde
- el feedback importante usa `aria-live="polite"`
- el detalle sigue siendo honesto sobre la continuidad: el estado posterior lo representan la orden y el pago, no una pantalla nueva paralela

## Errores manejados

- `401`: sesion ausente o expirada
- `403`: acceso prohibido
- `409`: conflicto idempotente definitivo
- `425`: intento idempotente aun en progreso
- `422`: validacion o dominio
- `0`: error de red
- otros: error inesperado

Cuando backend rechaza definitivamente la evidencia:

- no se marca exito
- se refresca el detalle
- la clave idempotente se limpia cuando corresponde

## Limites conocidos

- el frontend de este bloque no implementa descarga del documento cargado
- el frontend de este bloque no implementa reemplazo ni borrado de evidencia
- el detalle muestra el estado operativo disponible desde backend, sin prometer acciones no expuestas por contrato

## Hardening aplicado

Durante la revision final se corrigieron estos puntos:

- guard clause adicional en `submitEvidence()` para bloquear doble POST concurrente
- invalidacion explicita de validaciones asincronas al limpiar archivo
- ocultamiento del formulario tras exito local, incluso si el refresh posterior falla o se retrasa
- cableado accesible de `aria-describedby` y `aria-invalid` en el input de archivo

## Pruebas

Cobertura anadida o actualizada:

- `http-player-commerce.repository.spec.ts`
- `payment-evidence-idempotency.service.spec.ts`
- `player-order-detail.facade.spec.ts`
- `player-order-detail-page.spec.ts`

Casos reforzados en hardening:

- `5 MiB` exactos aceptados
- `5 MiB + 1 byte` rechazados
- doble submit directo dispara un solo POST
- validacion tardia ignorada tras cambio de orden
- validacion tardia ignorada tras logout
- input accesible enlazado correctamente con ayuda y error
- formulario oculto tras exito local antes de que llegue el refresh de orden
- request multipart sin campos extra
- passthrough de `409 idempotency_key_mismatch`

## Resultados verificados

- `npm test -- --watch=false`
- `npm run build`
- `git diff --check`
- `git status --short`

Observacion:

- el build mantiene una advertencia preexistente e independiente en el presupuesto SCSS de `number-selection-page`; no pertenece a este bloque

## Riesgos aceptados

- la validacion local mejora UX, pero la decision final sigue perteneciendo al backend
- la smoke real local confirmo login y uploads validos, pero las pruebas manuales con clientes multipart ad hoc en Windows no fueron una via suficientemente confiable para concluir sobre todos los errores negativos desde CLI
- la descarga de evidencia y cualquier continuidad operativa extra quedan fuera del alcance de este bloque

## Siguiente paso recomendado

No abrir otra pantalla de continuidad `under_review`.

El siguiente paso sano es una auditoria integral de cierre de Fase 2 frontend, incluyendo un smoke test real con Angular y Laravel levantados, validando de punta a punta autenticacion, reserva, detalle de orden y carga de evidencia contra contratos vivos.

## Cierre integral

El cierre integral de Fase 2 quedó documentado en `docs/frontend-phase-2-closure.md`.
