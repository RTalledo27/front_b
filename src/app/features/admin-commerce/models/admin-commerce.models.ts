import { OrderStatus, PaymentStatus } from '../../../core/api/models/game-api.models';

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