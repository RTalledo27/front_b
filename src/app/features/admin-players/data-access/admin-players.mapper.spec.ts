import {
  isAdminPlayersInvalidPayloadError,
  mapAdminPlayerInvitationResponse,
  resolveAdminPlayersError,
} from './admin-players.mapper';

describe('admin-players.mapper', () => {
  it('maps the real invitation resource without inventing fields', () => {
    const result = mapAdminPlayerInvitationResponse({
      data: {
        outcome: 'invited',
        user: {
          id: 17,
          name: 'Alice',
          email: 'alice@example.com',
          role: 'player',
        },
        invitation: {
          id: '0197-player-invitation',
          expires_at: '2026-07-12T12:00:00Z',
        },
        plain_token: 'plain-token-value',
      },
    });

    expect(result).toEqual({
      outcome: 'invited',
      user: {
        id: 17,
        name: 'Alice',
        email: 'alice@example.com',
        role: 'player',
      },
      invitation: {
        id: '0197-player-invitation',
        expiresAt: '2026-07-12T12:00:00Z',
      },
      plainToken: 'plain-token-value',
    });
  });

  it('accepts the already_registered outcome without invitation or plain token', () => {
    const result = mapAdminPlayerInvitationResponse({
      data: {
        outcome: 'already_registered',
        user: {
          id: 2,
          name: 'Other Admin',
          email: 'otheradmin@example.com',
          role: 'admin',
        },
        invitation: null,
      },
    });

    expect(result.outcome).toBe('already_registered');
    expect(result.invitation).toBeNull();
    expect(result.plainToken).toBeNull();
  });

  it('rejects incomplete payloads safely', () => {
    try {
      mapAdminPlayerInvitationResponse({
        data: {
          outcome: 'invited',
          user: { id: 1 },
        },
      });
    } catch (error) {
      expect(isAdminPlayersInvalidPayloadError(error)).toBe(true);
      expect(resolveAdminPlayersError(error)).toMatchObject({
        code: 'invalid_payload',
      });
      return;
    }

    throw new Error('Expected admin players mapper to reject the payload');
  });
});
