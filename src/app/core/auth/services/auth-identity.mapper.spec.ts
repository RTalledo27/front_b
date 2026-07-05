import { buildVerifyEmailPayload, mapLinkedSocialAccountsResponse } from './auth-identity.mapper';

describe('auth identity mappers', () => {
  it('maps the linked social account resource exposed by Laravel', () => {
    expect(
      mapLinkedSocialAccountsResponse({
        data: [
          {
            provider: 'google',
            provider_email_masked: 'jo***@gmail.com',
            provider_email_verified: true,
            linked_at: '2026-07-05T00:00:00Z',
            can_unlink: true,
          },
        ],
      }),
    ).toEqual([
      {
        provider: 'google',
        providerEmailMasked: 'jo***@gmail.com',
        providerEmailVerified: true,
        linkedAt: '2026-07-05T00:00:00Z',
        canUnlink: true,
      },
    ]);
  });

  it('rejects unsupported providers before they leak into UI state', () => {
    expect(() =>
      mapLinkedSocialAccountsResponse({
        data: [
          {
            provider: 'twitter' as never,
            provider_email_masked: null,
            provider_email_verified: false,
            linked_at: null,
            can_unlink: false,
          },
        ],
      }),
    ).toThrow('Invalid linked social account payload.');
  });

  it('builds a verify-email payload only when all signed params are present', () => {
    expect(
      buildVerifyEmailPayload('12', 'email-hash', '1234567890', 'signed-value'),
    ).toEqual({
      id: '12',
      hash: 'email-hash',
      expires: '1234567890',
      signature: 'signed-value',
    });

    expect(buildVerifyEmailPayload('12', 'email-hash', null, 'signed-value')).toBeNull();
  });
});
