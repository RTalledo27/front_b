import { AuthTokenApiDto, AuthTokenSession, AuthUser, AuthUserApiDto } from '../models/auth.models';

export function mapAuthUser(dto: AuthUserApiDto): AuthUser {
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

export function mapAuthTokenSession(dto: AuthTokenApiDto): AuthTokenSession {
  return {
    tokenType: dto.token_type,
    accessToken: dto.access_token,
    abilities: dto.abilities,
    user: mapAuthUser(dto.user),
  };
}
