import { HttpErrorResponse } from '@angular/common/http';

export interface ApiError {
  status: number;
  code: string | null;
  message: string;
  fieldErrors: Record<string, string[]>;
  reason: string | null;
}

interface LaravelErrorPayload {
  error?: unknown;
  message?: unknown;
  reason?: unknown;
  errors?: unknown;
}

export function toApiError(error: unknown): ApiError {
  if (!(error instanceof HttpErrorResponse)) {
    return {
      status: 0,
      code: null,
      message: 'Ocurrió un error inesperado.',
      fieldErrors: {},
      reason: null,
    };
  }

  const payload = isLaravelErrorPayload(error.error) ? error.error : null;

  return {
    status: error.status,
    code: typeof payload?.error === 'string' ? payload.error : null,
    message: resolveMessage(error, payload),
    fieldErrors: resolveFieldErrors(payload),
    reason: typeof payload?.reason === 'string' ? payload.reason : null,
  };
}

function resolveMessage(error: HttpErrorResponse, payload: LaravelErrorPayload | null): string {
  if (typeof payload?.message === 'string' && payload.message.trim()) {
    return payload.message;
  }

  if (error.status === 0) {
    return 'No pudimos conectar con el servidor. Revisa que Laravel esté disponible.';
  }

  if (error.status === 404) {
    return 'El recurso solicitado no está disponible.';
  }

  return 'No pudimos cargar la información. Inténtalo nuevamente.';
}

function isLaravelErrorPayload(value: unknown): value is LaravelErrorPayload {
  return typeof value === 'object' && value !== null;
}

function resolveFieldErrors(payload: LaravelErrorPayload | null): Record<string, string[]> {
  if (payload === null || typeof payload.errors !== 'object' || payload.errors === null) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(payload.errors).flatMap(([field, messages]) => {
      if (!Array.isArray(messages)) {
        return [];
      }

      const validMessages = messages.filter(
        (message): message is string => typeof message === 'string' && message.trim().length > 0,
      );

      return validMessages.length > 0 ? [[field, validMessages]] : [];
    }),
  );
}
