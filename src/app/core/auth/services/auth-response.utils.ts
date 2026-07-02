import { AuthTokenApiDto } from '../models/auth.models';
import { ApiError, toApiError } from '../../api/models/api-error.models';
import {
  AuthPayloadValidationError,
  isAuthPayloadValidationError,
  mapAuthTokenSession,
} from './auth-user.mapper';

export const AUTH_PAYLOAD_API_ERROR_CODE = 'invalid_auth_response_payload';
export const AUTH_REDIRECT_API_ERROR_CODE = 'auth_redirect_failed';
export const AUTH_SESSION_CHANGED_ERROR_CODE = 'auth_session_changed_during_login';

export function isValidAuthTokenResponse(dto: AuthTokenApiDto | null | undefined): dto is AuthTokenApiDto {
  try {
    mapAuthTokenSession(dto);
    return true;
  } catch {
    return false;
  }
}

export function createAuthRedirectError(): Error {
  return new Error(AUTH_REDIRECT_API_ERROR_CODE);
}

export function toAuthFlowError(error: unknown): ApiError {
  if (isAuthPayloadValidationError(error)) {
    return {
      status: 0,
      code: AUTH_PAYLOAD_API_ERROR_CODE,
      message: 'Recibimos una respuesta de autenticación incompleta. Inténtalo nuevamente.',
      fieldErrors: {},
      reason: error.reason,
    };
  }

  if (isAuthRedirectError(error)) {
    return {
      status: 0,
      code: AUTH_REDIRECT_API_ERROR_CODE,
      message: 'No pudimos abrir tu sesión. Inténtalo nuevamente.',
      fieldErrors: {},
      reason: null,
    };
  }

  if (isAuthSessionChangedError(error)) {
    return {
      status: 0,
      code: AUTH_SESSION_CHANGED_ERROR_CODE,
      message: 'La sesión cambió antes de terminar el ingreso. Inténtalo nuevamente.',
      fieldErrors: {},
      reason: null,
    };
  }

  return toApiError(error);
}

function isAuthRedirectError(error: unknown): boolean {
  return error instanceof Error && error.message === AUTH_REDIRECT_API_ERROR_CODE;
}

function isAuthSessionChangedError(error: unknown): boolean {
  return error instanceof Error && error.message === 'AUTH_SESSION_CHANGED_DURING_LOGIN';
}

export function createInvalidAuthPayloadError(reason: string): AuthPayloadValidationError {
  return new AuthPayloadValidationError(reason);
}
