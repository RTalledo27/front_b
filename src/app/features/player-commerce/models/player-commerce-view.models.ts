import { OrderStatus, PaymentStatus } from '../../../core/api/models/game-api.models';

export type PlayerCommerceViewStatus =
  | 'idle'
  | 'loading'
  | 'loaded'
  | 'empty'
  | 'unauthorized'
  | 'forbidden'
  | 'notFound'
  | 'networkError'
  | 'unexpectedError';

export type OrderValidityState =
  | 'active'
  | 'expired'
  | 'cancelled'
  | 'completed'
  | 'not_applicable';

export interface PlayerPaymentSummary {
  id: string;
  status: PaymentStatus;
  amountCents: number;
  currency: string;
  submittedAt: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
}

export interface PlayerOrderSummary {
  id: string;
  reference: string;
  status: OrderStatus;
  subtotalCents: number;
  totalCents: number;
  currency: string;
  expiresAt: string | null;
  paidAt: string | null;
  cancelledAt: string | null;
  expiredAt: string | null;
  createdAt: string | null;
  itemCount: number;
  payment: PlayerPaymentSummary | null;
  validity: OrderValidityState;
}

export interface PlayerOrderNumberLine {
  id: string;
  gameNumberId: string;
  unitPriceCents: number;
  number: number | null;
  numberStatus: 'available' | 'reserved' | 'sold' | null;
}

export interface PlayerOrderDetailView {
  id: string;
  reference: string;
  status: OrderStatus;
  subtotalCents: number;
  totalCents: number;
  currency: string;
  expiresAt: string | null;
  paidAt: string | null;
  cancelledAt: string | null;
  expiredAt: string | null;
  createdAt: string | null;
  game: { id: string; slug: string; name: string } | null;
  items: PlayerOrderNumberLine[];
  reservedNumbers: number[];
  payment: PlayerPaymentSummary | null;
  validity: OrderValidityState;
  nextAction: string;
}

export interface PlayerReservationView {
  id: string;
  orderId: string;
  gameNumberId: string;
  createdAt: string | null;
  order: {
    id: string;
    status: OrderStatus;
    expiresAt: string | null;
    totalCents: number;
    currency: string;
  };
  gameNumber: {
    id: string;
    number: number;
    status: 'available' | 'reserved' | 'sold';
    game: { id: string; slug: string; name: string } | null;
  };
}

export interface PlayerEntryView {
  id: string;
  gameId: string;
  gameNumberId: string;
  status: 'confirmed' | 'winner' | 'cancelled';
  confirmedAt: string | null;
  game: { id: string; slug: string; name: string } | null;
  gameNumber: { id: string; number: number; status: 'available' | 'reserved' | 'sold' } | null;
}
