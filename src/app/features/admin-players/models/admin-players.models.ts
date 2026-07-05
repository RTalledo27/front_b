export type AdminPlayerInviteOutcome = 'invited' | 'reinvited' | 'already_registered';

export interface CreateAdminPlayerPayload {
  name: string;
  email: string;
}

export interface AdminPlayerInvitationView {
  outcome: AdminPlayerInviteOutcome;
  user: {
    id: number;
    name: string;
    email: string;
    role: 'admin' | 'player';
  };
  invitation: {
    id: string;
    expiresAt: string;
  } | null;
  plainToken: string | null;
}
