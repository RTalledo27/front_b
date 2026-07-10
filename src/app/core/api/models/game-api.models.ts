export type GameStatus =
  | 'draft'
  | 'published'
  | 'sales_open'
  | 'sales_closed'
  | 'running'
  | 'paused'
  | 'resolving'
  | 'completed'
  | 'cancelled';

export type OrderStatus =
  | 'pending'
  | 'payment_submitted'
  | 'paid'
  | 'rejected'
  | 'expired'
  | 'cancelled'
  | 'refunded';

export type PaymentStatus =
  | 'pending'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'cancelled'
  | 'refunded';

export type UserRole = 'admin' | 'player';

export interface MoneyApiDto {
  amount_cents: number;
  currency: string;
}

export interface GameScheduleApiDto {
  sales_opens_at: string | null;
  sales_closes_at: string | null;
  scheduled_start_at: string | null;
  draw_interval_seconds: number;
  next_draw_at?: string | null;
}

export interface GameLifecycleApiDto {
  started_at: string | null;
  paused_at: string | null;
  completed_at: string | null;
}

export interface PublicGameLatestDrawApiDto {
  sequence: number;
  number: number;
  drawn_at: string;
}

export interface PublicGameWinnerApiDto {
  number: number;
  draw_sequence: number;
  hits: number;
  won_at: string;
}

export interface PublicGameApiDto {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  status: GameStatus;
  number_range: {
    min: number;
    max: number;
    hits_required: number;
  };
  ticket_price: MoneyApiDto;
  prize: MoneyApiDto;
  schedule: GameScheduleApiDto;
  lifecycle?: GameLifecycleApiDto;
  latest_draw?: PublicGameLatestDrawApiDto | null;
  winner?: PublicGameWinnerApiDto | null;
}
