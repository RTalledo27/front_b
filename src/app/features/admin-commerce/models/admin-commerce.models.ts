import { OrderStatus, PaymentStatus } from '../../../core/api/models/game-api.models';
import { StatusTone } from '../../../shared/ui/status-badge/status-badge';

export interface AdminUserSummaryApiDto { id: number; name: string; email: string; }
export interface AdminGameSummaryApiDto { id: string; slug: string; name: string; }
export interface AdminOrderApiDto {
  id: string; user_id: number; game_id: string; status: OrderStatus; subtotal_cents: number;
  total_cents: number; currency: string; expires_at: string | null; paid_at: string | null;
  cancelled_at: string | null; expired_at: string | null; created_at: string | null;
  user: AdminUserSummaryApiDto | null; game: AdminGameSummaryApiDto | null;
  payment: { id: string; status: PaymentStatus; amount_cents: number; currency: string; submitted_at: string | null } | null;
}
export interface AdminPaymentListApiDto {
  id: string; order_id: string; amount_cents: number; currency: string; method: string;
  status: PaymentStatus; submitted_at: string | null; reviewed_at: string | null;
  order: { id: string; user_id: number; game_id: string; status: OrderStatus; total_cents: number; currency: string;
    expires_at: string | null; game: AdminGameSummaryApiDto | null } | null;
}
export interface AdminPaymentDocumentApiDto {
  id: string; original_filename: string; mime_type: string; size_bytes: number; sha256: string;
  uploaded_by: number; created_at: string | null; download_url: string; uploader: AdminUserSummaryApiDto | null;
}
export interface AdminPaymentDetailApiDto {
  id: string; order_id: string; amount_cents: number; currency: string; method: string; status: PaymentStatus;
  submitted_at: string | null; reviewed_at: string | null; reviewed_by: number | null; rejection_reason: string | null;
  reviewer: AdminUserSummaryApiDto | null;
  order: { id: string; status: OrderStatus; subtotal_cents: number; total_cents: number; currency: string;
    expires_at: string | null; paid_at: string | null; created_at: string | null; user: AdminUserSummaryApiDto | null;
    game: AdminGameSummaryApiDto | null; items: Array<{ id: string; game_number_id: string; unit_price_cents: number;
      number: number | null; number_status: string | null }> | null };
  documents: AdminPaymentDocumentApiDto[];
}
export interface AdminPaymentTransitionApiDto {
  payment: { id: string; status: PaymentStatus; reviewed_at: string | null };
  order: { id: string; status: OrderStatus };
}

export interface AdminRefundApiDto {
  id: string;
  order_id: string;
  payment_id: string;
  game_id: string;
  amount_cents: number;
  currency: string;
  reason: string;
  processed_by_user_id: number;
  processed_at: string;
  created_at: string;
  entries: { ids: string[]; count: number };
  numbers: number[];
  game_number_ids: string[];
  was_already_refunded: boolean;
}

export interface AdminWinnerPayoutDocumentApiDto {
  id: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
}

export interface AdminWinnerPayoutApiDto {
  id: string;
  game_id: string;
  game_winner_id: string;
  user_id: number;
  amount_cents: number;
  currency: string;
  method: string;
  external_reference: string;
  notes: string | null;
  processed_by_user_id: number;
  processed_at: string;
  created_at: string;
  document: AdminWinnerPayoutDocumentApiDto;
  was_already_processed: boolean;
}

export interface RefundOrderPayload {
  reason: string;
}

export interface WinnerPayoutPayload {
  externalReference: string;
  notes: string | null;
  document: File;
}

export interface AdminCommerceStatusView {
  value: OrderStatus | PaymentStatus | string;
  label: string;
  tone: StatusTone;
}

export interface AdminRefundView {
  id: string;
  orderId: string;
  paymentId: string;
  gameId: string;
  amountCents: number;
  currency: string;
  reason: string;
  processedByUserId: number;
  processedAt: string;
  createdAt: string;
  entryIds: readonly string[];
  entryCount: number;
  numbers: readonly number[];
  gameNumberIds: readonly string[];
  wasAlreadyRefunded: boolean;
}

export interface AdminWinnerPayoutDocumentView {
  id: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

export interface AdminWinnerPayoutView {
  id: string;
  gameId: string;
  gameWinnerId: string;
  userId: number;
  amountCents: number;
  currency: string;
  method: string;
  externalReference: string;
  notes: string | null;
  processedByUserId: number;
  processedAt: string;
  createdAt: string;
  document: AdminWinnerPayoutDocumentView;
  wasAlreadyProcessed: boolean;
}

export type AdminCommerceSnapshotStatus =
  | 'idle'
  | 'loading'
  | 'loaded'
  | 'notFound'
  | 'networkError'
  | 'unexpectedError';

export type AdminCommerceCommandStatus =
  | 'idle'
  | 'submitting'
  | 'success'
  | 'unauthorized'
  | 'forbidden'
  | 'notFound'
  | 'validationError'
  | 'invalidState'
  | 'conflict'
  | 'networkError'
  | 'unexpectedError';

export interface AdminCommerceCommandState<T> {
  status: AdminCommerceCommandStatus;
  errorMessage: string | null;
  errorCode: string | null;
  errorReason: string | null;
  fieldErrors: Record<string, string[]>;
  result: T | null;
  refreshState: 'idle' | 'refreshing' | 'confirmed' | 'failed';
  refreshMessage: string | null;
}
