import { OrderStatus, PaymentStatus } from '../../../core/api/models/game-api.models';
import { StatusTone } from '../../../shared/ui/status-badge/status-badge';

const orderLabels: Record<OrderStatus, string> = {
  pending: 'Pendiente de pago', payment_submitted: 'Pago en revisión', paid: 'Pagada',
  rejected: 'Rechazada', expired: 'Expirada', cancelled: 'Cancelada', refunded: 'Reembolsada',
};
const paymentLabels: Record<PaymentStatus, string> = {
  pending: 'Pendiente', under_review: 'En revisión', approved: 'Aprobado', rejected: 'Rechazado',
  cancelled: 'Cancelado', refunded: 'Reembolsado',
};
export const orderStatusLabel = (status: OrderStatus): string => orderLabels[status];
export const paymentStatusLabel = (status: PaymentStatus): string => paymentLabels[status];
export function commerceStatusTone(status: OrderStatus | PaymentStatus): StatusTone {
  if (status === 'paid' || status === 'approved') return 'success';
  if (status === 'payment_submitted' || status === 'under_review') return 'info';
  if (status === 'pending') return 'warning';
  if (status === 'rejected' || status === 'expired' || status === 'cancelled') return 'danger';
  return 'neutral';
}
export function formatShortId(id: string): string { return id.slice(0, 8).toUpperCase(); }
export function createIdempotencyKey(prefix: string): string {
  const random = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${random}`;
}