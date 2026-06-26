import { AuthTokenApiDto } from '../models/auth.models';

export function isValidAuthTokenResponse(dto: AuthTokenApiDto | null | undefined): dto is AuthTokenApiDto {
  return (
    dto !== null &&
    dto !== undefined &&
    dto.token_type === 'Bearer' &&
    typeof dto.access_token === 'string' &&
    dto.access_token.trim().length > 0 &&
    Array.isArray(dto.abilities) &&
    dto.user !== null &&
    dto.user !== undefined &&
    typeof dto.user.id === 'number' &&
    typeof dto.user.name === 'string' &&
    typeof dto.user.email === 'string' &&
    typeof dto.user.role === 'string' &&
    typeof dto.user.email_verified === 'boolean' &&
    Object.hasOwn(dto.user, 'email_verified_at') &&
    dto.user.capabilities !== null &&
    dto.user.capabilities !== undefined &&
    typeof dto.user.capabilities.can_access_admin === 'boolean' &&
    typeof dto.user.capabilities.can_use_player_features === 'boolean'
  );
}
