import { OrderStatus, PaymentStatus } from '../../../core/api/models/game-api.models';

export type EntryStatus = 'confirmed' | 'winner' | 'cancelled';
export type GameNumberStatus = 'available' | 'reserved' | 'sold';

export interface PlayerPaymentApiDto {
  id: string;
  status: PaymentStatus;
  amount_cents: number;
  currency: string;
  submitted_at: string | null;
  reviewed_at?: string | null;
  rejection_reason?: string | null;
}

export interface PlayerOrderApiDto {
  id: string;
  game_id: string;
  status: OrderStatus;
  subtotal_cents: number;
  total_cents: number;
  currency: string;
  expires_at: string | null;
  paid_at: string | null;
  cancelled_at: string | null;
  expired_at: string | null;
  created_at: string | null;
  item_count: number;
  payment: PlayerPaymentApiDto | null;
}

export interface PlayerOrderDetailApiDto {
  id: string;
  status: OrderStatus;
  subtotal_cents: number;
  total_cents: number;
  currency: string;
  expires_at: string | null;
  paid_at: string | null;
  cancelled_at: string | null;
  expired_at: string | null;
  game: { id: string; slug: string; name: string } | null;
  items: Array<{
    id: string;
    game_number_id: string;
    unit_price_cents: number;
    number: number | null;
    number_status: GameNumberStatus | null;
  }>;
  reservations: Array<{
    id: string;
    game_number_id: string;
    created_at: string | null;
  }>;
  payment: PlayerPaymentApiDto | null;
}

export interface PlayerReservationApiDto {
  id: string;
  order_id: string;
  game_number_id: string;
  created_at: string | null;
  order: {
    id: string;
    status: OrderStatus;
    expires_at: string | null;
    total_cents: number;
    currency: string;
  };
  game_number: {
    id: string;
    number: number;
    status: GameNumberStatus;
    game: { id: string; slug: string; name: string } | null;
  };
}

export interface PlayerEntryApiDto {
  id: string;
  game_id: string;
  game_number_id: string;
  status: EntryStatus;
  confirmed_at: string | null;
  game: { id: string; slug: string; name: string } | null;
  game_number: { id: string; number: number; status: GameNumberStatus } | null;
  live_progress?: {
    entry_id: string;
    game_id: string;
    game_status:
      | 'draft'
      | 'published'
      | 'sales_open'
      | 'sales_closed'
      | 'running'
      | 'paused'
      | 'resolving'
      | 'completed'
      | 'cancelled';
    game_number: number | null;
    hits_current: number;
    hits_required: number | null;
    latest_draw_number: number | null;
    latest_draw_sequence: number | null;
    is_winner: boolean;
    completed_at: string | null;
    won_at: string | null;
  } | null;
}

export interface EvidenceSubmissionApiDto {
  order: { id: string; status: OrderStatus };
  payment: { id: string; status: PaymentStatus; submitted_at: string };
  document: {
    id: string;
    original_filename: string;
    mime_type: string;
    size_bytes: number;
    sha256: string;
  };
}

export interface OrderCancellationApiDto {
  order: { id: string; status: 'cancelled'; cancelled_at: string };
  payment: { id: string; status: 'cancelled' } | null;
  released: { numbers: number[]; game_number_ids: string[] };
}
