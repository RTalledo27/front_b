export type GameNumberStatus = 'available' | 'reserved' | 'sold';

export interface PublicGameNumberApiDto {
  id: string;
  number: number;
  status: GameNumberStatus;
}

export interface GameNumberOption {
  key: string;
  gameNumberId: string;
  number: number;
  status: GameNumberStatus;
}

export interface GameNumbersAvailability {
  numbers: GameNumberOption[];
}

export interface NumberReservationApiDto {
  order: {
    id: string;
    game_id: string;
    status: 'pending';
    subtotal_cents: number;
    total_cents: number;
    currency: string;
    expires_at: string;
  };
  numbers: number[];
  game_number_ids: string[];
  reservation_ids: string[];
  payment: {
    id: string;
    status: 'pending';
    amount_cents: number;
    currency: string;
  };
}

export interface NumberReservationRequest {
  gameId: string;
  gameNumberIds: string[];
  idempotencyKey: string;
}

export interface NumberSelectionDraft {
  slug: string;
  gameId: string;
  selectedGameNumberIds: string[];
}

export type NumberSelectionViewStatus =
  | 'idle'
  | 'loading'
  | 'loaded'
  | 'refreshing'
  | 'networkError'
  | 'unexpectedError';

export type NumberReservationStatus =
  | 'idle'
  | 'submitting'
  | 'success'
  | 'conflict'
  | 'inProgress'
  | 'validationError'
  | 'unauthorized'
  | 'forbidden'
  | 'rateLimited'
  | 'networkError'
  | 'unexpectedError';
