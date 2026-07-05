import { toApiError } from '../../../core/api/models/api-error.models';
import { AdminPlayerInvitationView } from '../models/admin-players.models';

const INVALID_PAYLOAD_ERROR = 'invalid_admin_player_payload';

export function mapAdminPlayerInvitationResponse(response: unknown): AdminPlayerInvitationView {
  const root = readRecord(response);
  const data = readRecord(root['data']);
  const user = readRecord(data['user']);

  return {
    outcome: readOutcome(data['outcome']),
    user: {
      id: readNumber(user['id']),
      name: readString(user['name']),
      email: readString(user['email']),
      role: readUserRole(user['role']),
    },
    invitation: mapInvitation(data['invitation']),
    plainToken: readOptionalNullableString(data['plain_token']),
  };
}

export function isAdminPlayersInvalidPayloadError(error: unknown): boolean {
  return error instanceof Error && error.message === INVALID_PAYLOAD_ERROR;
}

export function resolveAdminPlayersError(error: unknown) {
  if (isAdminPlayersInvalidPayloadError(error)) {
    return {
      status: 500,
      code: 'invalid_payload',
      message: 'Recibimos una respuesta incompleta del servidor.',
      fieldErrors: {},
      reason: null,
    };
  }

  return toApiError(error);
}

function mapInvitation(
  value: unknown,
): {
  id: string;
  expiresAt: string;
} | null {
  if (value === null) {
    return null;
  }

  const invitation = readRecord(value);

  return {
    id: readString(invitation['id']),
    expiresAt: readString(invitation['expires_at']),
  };
}

function readRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null) {
    throw new Error(INVALID_PAYLOAD_ERROR);
  }

  return value as Record<string, unknown>;
}

function readString(value: unknown): string {
  if (typeof value !== 'string') {
    throw new Error(INVALID_PAYLOAD_ERROR);
  }

  return value;
}

function readOptionalNullableString(value: unknown): string | null {
  if (typeof value === 'undefined' || value === null) {
    return null;
  }

  return readString(value);
}

function readNumber(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(INVALID_PAYLOAD_ERROR);
  }

  return value;
}

function readOutcome(value: unknown): 'invited' | 'reinvited' | 'already_registered' {
  const outcome = readString(value);

  if (
    outcome === 'invited' ||
    outcome === 'reinvited' ||
    outcome === 'already_registered'
  ) {
    return outcome;
  }

  throw new Error(INVALID_PAYLOAD_ERROR);
}

function readUserRole(value: unknown): 'admin' | 'player' {
  const role = readString(value);

  if (role === 'admin' || role === 'player') {
    return role;
  }

  throw new Error(INVALID_PAYLOAD_ERROR);
}
