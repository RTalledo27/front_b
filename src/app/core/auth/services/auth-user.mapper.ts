import { AuthTokenApiDto, AuthTokenSession, AuthUser, AuthUserApiDto } from '../models/auth.models';
import { UserRole } from '../../api/models/game-api.models';

export const AUTH_PAYLOAD_VALIDATION_ERROR = 'AUTH_PAYLOAD_VALIDATION_ERROR';

export class AuthPayloadValidationError extends Error {
  override readonly name = AUTH_PAYLOAD_VALIDATION_ERROR;

  constructor(readonly reason: string) {
    super('Invalid auth response payload.');
  }
}

export function isAuthPayloadValidationError(error: unknown): error is AuthPayloadValidationError {
  return error instanceof AuthPayloadValidationError;
}

export function mapAuthUser(dto: unknown): AuthUser {
  assertAuthUserApiDto(dto);

  return {
    id: dto.id,
    name: dto.name,
    email: dto.email,
    role: dto.role,
    emailVerified: dto.email_verified,
    emailVerifiedAt: dto.email_verified_at,
    capabilities: {
      canAccessAdmin: dto.capabilities.can_access_admin,
      canUsePlayerFeatures: dto.capabilities.can_use_player_features,
    },
  };
}

export function mapAuthTokenSession(dto: unknown): AuthTokenSession {
  assertAuthTokenApiDto(dto);

  return {
    tokenType: dto.token_type,
    accessToken: dto.access_token,
    abilities: dto.abilities,
    user: mapAuthUser(dto.user),
  };
}

function assertAuthTokenApiDto(dto: unknown): asserts dto is AuthTokenApiDto {
  if (!isRecord(dto)) {
    throw new AuthPayloadValidationError('token payload is not an object');
  }

  if (dto['token_type'] !== 'Bearer') {
    throw new AuthPayloadValidationError('token_type must be Bearer');
  }

  if (typeof dto['access_token'] !== 'string' || dto['access_token'].trim().length === 0) {
    throw new AuthPayloadValidationError('access_token is required');
  }

  if (
    !Array.isArray(dto['abilities']) ||
    !dto['abilities'].every((ability) => typeof ability === 'string')
  ) {
    throw new AuthPayloadValidationError('abilities must be a string array');
  }

  assertAuthUserApiDto(dto['user']);
}

function assertAuthUserApiDto(dto: unknown): asserts dto is AuthUserApiDto {
  if (!isRecord(dto)) {
    throw new AuthPayloadValidationError('user payload is not an object');
  }

  if (typeof dto['id'] !== 'number') {
    throw new AuthPayloadValidationError('user.id must be numeric');
  }

  if (typeof dto['name'] !== 'string' || dto['name'].trim().length === 0) {
    throw new AuthPayloadValidationError('user.name is required');
  }

  if (typeof dto['email'] !== 'string' || dto['email'].trim().length === 0) {
    throw new AuthPayloadValidationError('user.email is required');
  }

  if (!isUserRole(dto['role'])) {
    throw new AuthPayloadValidationError('user.role is not supported');
  }

  if (typeof dto['email_verified'] !== 'boolean') {
    throw new AuthPayloadValidationError('user.email_verified must be boolean');
  }

  if (
    !Object.hasOwn(dto, 'email_verified_at') ||
    (dto['email_verified_at'] !== null && typeof dto['email_verified_at'] !== 'string')
  ) {
    throw new AuthPayloadValidationError('user.email_verified_at must be string or null');
  }

  if (!isRecord(dto['capabilities'])) {
    throw new AuthPayloadValidationError('user.capabilities is required');
  }

  if (typeof dto['capabilities']['can_access_admin'] !== 'boolean') {
    throw new AuthPayloadValidationError('user.capabilities.can_access_admin must be boolean');
  }

  if (typeof dto['capabilities']['can_use_player_features'] !== 'boolean') {
    throw new AuthPayloadValidationError(
      'user.capabilities.can_use_player_features must be boolean',
    );
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isUserRole(value: unknown): value is UserRole {
  return value === 'admin' || value === 'player';
}
