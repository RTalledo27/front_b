import {
  PlayerEntryApiDto,
  PlayerOrderApiDto,
  PlayerOrderDetailApiDto,
  PlayerPaymentApiDto,
  PlayerReservationApiDto,
} from '../models/player-commerce.models';
import {
  OrderValidityState,
  PlayerEntryView,
  PlayerOrderDetailView,
  PlayerOrderSummary,
  PlayerPaymentSummary,
  PlayerReservationView,
} from '../models/player-commerce-view.models';

export function mapPlayerOrderSummary(dto: PlayerOrderApiDto): PlayerOrderSummary {
  return {
    id: dto.id,
    reference: dto.id,
    status: dto.status,
    subtotalCents: dto.subtotal_cents,
    totalCents: dto.total_cents,
    currency: dto.currency,
    expiresAt: dto.expires_at,
    paidAt: dto.paid_at,
    cancelledAt: dto.cancelled_at,
    expiredAt: dto.expired_at,
    createdAt: dto.created_at,
    itemCount: dto.item_count,
    payment: mapPlayerPaymentSummary(dto.payment),
    validity: deriveOrderValidity(dto.status, dto.expires_at, dto.expired_at, dto.cancelled_at),
  };
}

export function mapPlayerOrderDetail(dto: PlayerOrderDetailApiDto): PlayerOrderDetailView {
  const items = dto.items.map((item) => ({
    id: item.id,
    gameNumberId: item.game_number_id,
    unitPriceCents: item.unit_price_cents,
    number: item.number,
    numberStatus: item.number_status,
  }));
  const reservedNumbers = items
    .flatMap((item) => (item.number === null ? [] : [item.number]))
    .sort((left, right) => left - right);

  return {
    id: dto.id,
    reference: dto.id,
    status: dto.status,
    subtotalCents: dto.subtotal_cents,
    totalCents: dto.total_cents,
    currency: dto.currency,
    expiresAt: dto.expires_at,
    paidAt: dto.paid_at,
    cancelledAt: dto.cancelled_at,
    expiredAt: dto.expired_at,
    createdAt: null,
    game: dto.game,
    items,
    reservedNumbers,
    payment: mapPlayerPaymentSummary(dto.payment),
    validity: deriveOrderValidity(dto.status, dto.expires_at, dto.expired_at, dto.cancelled_at),
    nextAction: describeNextAction(dto.status),
  };
}

export function mapPlayerReservation(dto: PlayerReservationApiDto): PlayerReservationView {
  return {
    id: dto.id,
    orderId: dto.order_id,
    gameNumberId: dto.game_number_id,
    createdAt: dto.created_at,
    order: {
      id: dto.order.id,
      status: dto.order.status,
      expiresAt: dto.order.expires_at,
      totalCents: dto.order.total_cents,
      currency: dto.order.currency,
    },
    gameNumber: {
      id: dto.game_number.id,
      number: dto.game_number.number,
      status: dto.game_number.status,
      game: dto.game_number.game,
    },
  };
}

export function mapPlayerEntry(dto: PlayerEntryApiDto): PlayerEntryView {
  return {
    id: dto.id,
    gameId: dto.game_id,
    gameNumberId: dto.game_number_id,
    status: dto.status,
    confirmedAt: dto.confirmed_at,
    game: dto.game,
    gameNumber: dto.game_number,
  };
}

function mapPlayerPaymentSummary(dto: PlayerPaymentApiDto | null): PlayerPaymentSummary | null {
  if (dto === null) {
    return null;
  }

  return {
    id: dto.id,
    status: dto.status,
    amountCents: dto.amount_cents,
    currency: dto.currency,
    submittedAt: dto.submitted_at,
    reviewedAt: dto.reviewed_at ?? null,
    rejectionReason: dto.rejection_reason ?? null,
  };
}

function deriveOrderValidity(
  status: PlayerOrderApiDto['status'],
  expiresAt: string | null,
  expiredAt: string | null,
  cancelledAt: string | null,
): OrderValidityState {
  if (status === 'expired' || expiredAt !== null) {
    return 'expired';
  }

  if (status === 'cancelled' || cancelledAt !== null) {
    return 'cancelled';
  }

  if (status === 'paid' || status === 'rejected' || status === 'refunded') {
    return 'completed';
  }

  return expiresAt === null ? 'not_applicable' : 'active';
}

function describeNextAction(status: PlayerOrderDetailApiDto['status']): string {
  switch (status) {
    case 'pending':
      return 'Si ya pagaste, envia una sola evidencia antes del vencimiento para que el equipo la revise.';
    case 'payment_submitted':
      return 'Tu orden sigue activa mientras el pago está en revisión.';
    case 'paid':
      return 'La compra quedó confirmada. Puedes revisar tus números en el área del jugador.';
    case 'rejected':
      return 'La orden fue rechazada. Revisa el detalle del pago asociado si existe.';
    case 'expired':
      return 'La reserva expiró y los números ya no están apartados.';
    case 'cancelled':
      return 'La orden fue cancelada y los números volvieron a quedar disponibles.';
    case 'refunded':
      return 'La orden fue reembolsada.';
  }
}
