import { LaravelDataResponse } from '../../api/models/api-response.models';
import {
  LinkedSocialAccount,
  LinkedSocialAccountApiDto,
  SocialProvider,
  VerifyEmailRequestPayload,
} from '../models/auth.models';

export function mapLinkedSocialAccountsResponse(
  response: LaravelDataResponse<LinkedSocialAccountApiDto[]>,
): LinkedSocialAccount[] {
  return response.data.map(mapLinkedSocialAccount);
}

export function mapLinkedSocialAccount(dto: LinkedSocialAccountApiDto): LinkedSocialAccount {
  assertSocialProvider(dto.provider);
  assertNullableString(dto.provider_email_masked, 'provider_email_masked');
  assertBoolean(dto.provider_email_verified, 'provider_email_verified');
  assertNullableString(dto.linked_at, 'linked_at');
  assertBoolean(dto.can_unlink, 'can_unlink');

  return {
    provider: dto.provider,
    providerEmailMasked: dto.provider_email_masked,
    providerEmailVerified: dto.provider_email_verified,
    linkedAt: dto.linked_at,
    canUnlink: dto.can_unlink,
  };
}

export function buildVerifyEmailPayload(
  id: string | null,
  hash: string | null,
  expires: string | null,
  signature: string | null,
): VerifyEmailRequestPayload | null {
  if (!isNonEmptyString(id) || !isNonEmptyString(hash)) {
    return null;
  }

  if (!isNonEmptyString(expires) || !isNonEmptyString(signature)) {
    return null;
  }

  return {
    id,
    hash,
    expires,
    signature,
  };
}

function assertSocialProvider(value: unknown): asserts value is SocialProvider {
  if (value !== 'google' && value !== 'facebook') {
    throw new Error('Invalid linked social account payload.');
  }
}

function assertNullableString(value: unknown, field: string): asserts value is string | null {
  if (value !== null && typeof value !== 'string') {
    throw new Error(`Invalid ${field} value.`);
  }
}

function assertBoolean(value: unknown, field: string): asserts value is boolean {
  if (typeof value !== 'boolean') {
    throw new Error(`Invalid ${field} value.`);
  }
}

function isNonEmptyString(value: string | null): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}
