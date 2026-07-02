import { AuthTokenApiDto, AuthUserApiDto } from '../models/auth.models';
import {
  AuthPayloadValidationError,
  mapAuthTokenSession,
  mapAuthUser,
} from './auth-user.mapper';

const userDto: AuthUserApiDto = {
  id: 1,
  name: 'María López',
  email: 'maria@example.com',
  role: 'player',
  email_verified: false,
  email_verified_at: null,
  capabilities: {
    can_access_admin: false,
    can_use_player_features: true,
  },
};

const tokenDto: AuthTokenApiDto = {
  token_type: 'Bearer',
  access_token: 'plain-token',
  abilities: ['auth:logout', 'player:access', 'user:read'],
  user: userDto,
};

describe('auth user mapper', () => {
  it('maps the real login contract with snake_case token fields', () => {
    expect(mapAuthTokenSession(tokenDto)).toEqual({
      tokenType: 'Bearer',
      accessToken: 'plain-token',
      abilities: ['auth:logout', 'player:access', 'user:read'],
      user: {
        id: 1,
        name: 'María López',
        email: 'maria@example.com',
        role: 'player',
        emailVerified: false,
        emailVerifiedAt: null,
        capabilities: {
          canAccessAdmin: false,
          canUsePlayerFeatures: true,
        },
      },
    });
  });

  it('maps verified users with ISO verification dates', () => {
    expect(
      mapAuthUser({
        ...userDto,
        email_verified: true,
        email_verified_at: '2026-06-20T10:00:00Z',
      }),
    ).toMatchObject({
      emailVerified: true,
      emailVerifiedAt: '2026-06-20T10:00:00Z',
    });
  });

  it('rejects incomplete login payloads before writing session state', () => {
    expect(() => mapAuthTokenSession({ ...tokenDto, access_token: '' })).toThrow(
      AuthPayloadValidationError,
    );
  });

  it('rejects incomplete user capabilities', () => {
    expect(() =>
      mapAuthUser({
        ...userDto,
        capabilities: { can_access_admin: false },
      }),
    ).toThrow(AuthPayloadValidationError);
  });

  it('rejects unsupported roles', () => {
    expect(() => mapAuthUser({ ...userDto, role: 'owner' })).toThrow(
      AuthPayloadValidationError,
    );
  });
});
