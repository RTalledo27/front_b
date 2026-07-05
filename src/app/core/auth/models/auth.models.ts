import { UserRole } from '../../api/models/game-api.models';

export interface AuthCapabilitiesApiDto {
  can_access_admin: boolean;
  can_use_player_features: boolean;
}

export interface AuthUserApiDto {
  id: number;
  name: string;
  email: string;
  email_verified_at: string | null;
  email_verified: boolean;
  role: UserRole;
  capabilities: AuthCapabilitiesApiDto;
}

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  emailVerified: boolean;
  emailVerifiedAt: string | null;
  capabilities: {
    canAccessAdmin: boolean;
    canUsePlayerFeatures: boolean;
  };
}

export type SessionStatus = 'unknown' | 'loading' | 'authenticated' | 'anonymous' | 'error';

export interface AuthTokenApiDto {
  token_type: 'Bearer';
  access_token: string;
  abilities: string[];
  user: AuthUserApiDto;
}

export interface AuthTokenSession {
  tokenType: 'Bearer';
  accessToken: string;
  abilities: string[];
  user: AuthUser;
}

export interface LoginRequestPayload {
  email: string;
  password: string;
}

export interface RegisterRequestPayload {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
}

export interface ActivateRequestPayload {
  token: string;
  password: string;
  password_confirmation: string;
}

export interface ForgotPasswordRequestPayload {
  email: string;
}

export interface ResetPasswordRequestPayload {
  email: string;
  token: string;
  password: string;
  password_confirmation: string;
}

export interface SocialExchangeRequestPayload {
  code: string;
}

export interface VerifyEmailRequestPayload {
  id: string;
  hash: string;
  expires: string;
  signature: string;
}

export interface UnlinkSocialAccountRequestPayload {
  current_password?: string;
}

export interface AuthMessageResponseDto {
  message: string;
}

export interface VerifyEmailResponseDto extends AuthMessageResponseDto {
  email_verified: boolean;
}

export type SocialProvider = 'google' | 'facebook';

export interface LinkedSocialAccountApiDto {
  provider: SocialProvider;
  provider_email_masked: string | null;
  provider_email_verified: boolean;
  linked_at: string | null;
  can_unlink: boolean;
}

export interface LinkedSocialAccount {
  provider: SocialProvider;
  providerEmailMasked: string | null;
  providerEmailVerified: boolean;
  linkedAt: string | null;
  canUnlink: boolean;
}
