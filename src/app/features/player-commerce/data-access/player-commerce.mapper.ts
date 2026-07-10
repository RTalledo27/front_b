import { toApiError } from '../../../core/api/models/api-error.models';
import { LaravelPaginatedResponse } from '../../../core/api/models/api-response.models';
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

const INVALID_PAYLOAD_ERROR = 'invalid_player_commerce_payload';

export interface PlayerOrdersResult {
  orders: PlayerOrderSummary[];
  pageInfo: {
    currentPage: number;
    lastPage: number;
    perPage: number;
    total: number;
  };
}

export function mapPlayerOrdersResponse(response: unknown): PlayerOrdersResult {
  if (!isRecord(response) || !Array.isArray(response['data']) || !isPaginationMeta(response['meta'])) {
    throw new Error(INVALID_PAYLOAD_ERROR);
  }

  const meta = readRecord(response['meta']);

  return {
    orders: response['data'].map(mapPlayerOrderSummary),
    pageInfo: {
      currentPage: readNumber(meta['current_page']),
      lastPage: readNumber(meta['last_page']),
      perPage: readNumber(meta['per_page']),
      total: readNumber(meta['total']),
    },
  };
}

export function mapPlayerReservationsResponse(response: unknown): PlayerReservationView[] {
  if (!isRecord(response) || !Array.isArray(response['data'])) {
    throw new Error(INVALID_PAYLOAD_ERROR);
  }

  return response['data'].map(mapPlayerReservation);
}

export function mapPlayerEntriesResponse(response: unknown): PlayerEntryView[] {
  if (!isRecord(response) || !Array.isArray(response['data'])) {
    throw new Error(INVALID_PAYLOAD_ERROR);
  }

  return response['data'].map(mapPlayerEntry);
}

export function mapPlayerOrderSummary(payload: unknown): PlayerOrderSummary {
  const dto = readRecord(payload);

  return {
    id: readString(dto['id']),
    reference: readString(dto['id']),
    status: readOrderStatus(dto['status']),
    subtotalCents: readNumber(dto['subtotal_cents']),
    totalCents: readNumber(dto['total_cents']),
    currency: readString(dto['currency']),
    expiresAt: readNullableIsoDate(dto['expires_at']),
    paidAt: readNullableIsoDate(dto['paid_at']),
    cancelledAt: readNullableIsoDate(dto['cancelled_at']),
    expiredAt: readNullableIsoDate(dto['expired_at']),
    createdAt: readNullableIsoDate(dto['created_at']),
    itemCount: readNumber(dto['item_count']),
    payment: mapPlayerPaymentSummary(dto['payment']),
    validity: deriveOrderValidity(
      readOrderStatus(dto['status']),
      readNullableIsoDate(dto['expires_at']),
      readNullableIsoDate(dto['expired_at']),
      readNullableIsoDate(dto['cancelled_at']),
    ),
  };
}

export function mapPlayerOrderDetail(payload: unknown): PlayerOrderDetailView {
  const dto = readRecord(payload);
  const items = readArray(dto['items']).map((item) => {
    const record = readRecord(item);

    return {
      id: readString(record['id']),
      gameNumberId: readString(record['game_number_id']),
      unitPriceCents: readNumber(record['unit_price_cents']),
      number: readNullableNumber(record['number']),
      numberStatus: readNullableGameNumberStatus(record['number_status']),
    };
  });
  const reservedNumbers = items
    .flatMap((item) => (item.number === null ? [] : [item.number]))
    .sort((left, right) => left - right);

  return {
    id: readString(dto['id']),
    reference: readString(dto['id']),
    status: readOrderStatus(dto['status']),
    subtotalCents: readNumber(dto['subtotal_cents']),
    totalCents: readNumber(dto['total_cents']),
    currency: readString(dto['currency']),
    expiresAt: readNullableIsoDate(dto['expires_at']),
    paidAt: readNullableIsoDate(dto['paid_at']),
    cancelledAt: readNullableIsoDate(dto['cancelled_at']),
    expiredAt: readNullableIsoDate(dto['expired_at']),
    createdAt: null,
    game: mapNullableGame(dto['game']),
    items,
    reservedNumbers,
    payment: mapPlayerPaymentSummary(dto['payment']),
    validity: deriveOrderValidity(
      readOrderStatus(dto['status']),
      readNullableIsoDate(dto['expires_at']),
      readNullableIsoDate(dto['expired_at']),
      readNullableIsoDate(dto['cancelled_at']),
    ),
    nextAction: describeNextAction(readOrderStatus(dto['status'])),
  };
}

export function mapPlayerReservation(payload: unknown): PlayerReservationView {
  const dto = readRecord(payload);
  const order = readRecord(dto['order']);
  const gameNumber = readRecord(dto['game_number']);

  return {
    id: readString(dto['id']),
    orderId: readString(dto['order_id']),
    gameNumberId: readString(dto['game_number_id']),
    createdAt: readNullableIsoDate(dto['created_at']),
    order: {
      id: readString(order['id']),
      status: readOrderStatus(order['status']),
      expiresAt: readNullableIsoDate(order['expires_at']),
      totalCents: readNumber(order['total_cents']),
      currency: readString(order['currency']),
    },
    gameNumber: {
      id: readString(gameNumber['id']),
      number: readNumber(gameNumber['number']),
      status: readGameNumberStatus(gameNumber['status']),
      game: mapNullableGame(gameNumber['game']),
    },
  };
}

export function mapPlayerEntry(payload: unknown): PlayerEntryView {
  const dto = readRecord(payload);

  return {
    id: readString(dto['id']),
    gameId: readString(dto['game_id']),
    gameNumberId: readString(dto['game_number_id']),
    status: readEntryStatus(dto['status']),
    confirmedAt: readNullableIsoDate(dto['confirmed_at']),
    game: mapNullableGame(dto['game']),
    gameNumber: mapNullableEntryGameNumber(dto['game_number']),
    liveProgress: mapNullableEntryLiveProgress(dto['live_progress']),
  };
}

export function isPlayerCommerceInvalidPayloadError(error: unknown): boolean {
  return error instanceof Error && error.message === INVALID_PAYLOAD_ERROR;
}

export function resolvePlayerCommerceError(error: unknown) {
  if (isPlayerCommerceInvalidPayloadError(error)) {
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

function mapPlayerPaymentSummary(dto: unknown): PlayerPaymentSummary | null {
  if (dto === null) {
    return null;
  }

  const record = readRecord(dto);

  return {
    id: readString(record['id']),
    status: readPaymentStatus(record['status']),
    amountCents: readNumber(record['amount_cents']),
    currency: readString(record['currency']),
    submittedAt: readNullableIsoDate(record['submitted_at']),
    reviewedAt: readNullableIsoDate(record['reviewed_at']),
    rejectionReason: readNullableString(record['rejection_reason']),
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

function mapNullableGame(payload: unknown): { id: string; slug: string; name: string } | null {
  if (payload === null) {
    return null;
  }

  const record = readRecord(payload);

  return {
    id: readString(record['id']),
    slug: readString(record['slug']),
    name: readString(record['name']),
  };
}

function mapNullableEntryGameNumber(payload: unknown): { id: string; number: number; status: 'available' | 'reserved' | 'sold' } | null {
  if (payload === null) {
    return null;
  }

  const record = readRecord(payload);

  return {
    id: readString(record['id']),
    number: readNumber(record['number']),
    status: readGameNumberStatus(record['status']),
  };
}

function mapNullableEntryLiveProgress(payload: unknown): PlayerEntryView['liveProgress'] {
  if (payload === null || typeof payload === 'undefined') {
    return null;
  }

  const record = readRecord(payload);

  return {
    entryId: readString(record['entry_id']),
    gameId: readString(record['game_id']),
    gameStatus: readGameStatus(record['game_status']),
    gameNumber: readNullableNumber(record['game_number']),
    hitsCurrent: readNumber(record['hits_current']),
    hitsRequired: readNullableNumber(record['hits_required']),
    latestDrawNumber: readNullableNumber(record['latest_draw_number']),
    latestDrawSequence: readNullableNumber(record['latest_draw_sequence']),
    isWinner: readBoolean(record['is_winner']),
    completedAt: readNullableIsoDate(record['completed_at']),
    wonAt: readNullableIsoDate(record['won_at']),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readRecord(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new Error(INVALID_PAYLOAD_ERROR);
  }

  return value;
}

function readArray(value: unknown): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(INVALID_PAYLOAD_ERROR);
  }

  return value;
}

function readString(value: unknown): string {
  if (typeof value !== 'string') {
    throw new Error(INVALID_PAYLOAD_ERROR);
  }

  return value;
}

function readNullableString(value: unknown): string | null {
  if (value === null || typeof value === 'undefined') {
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

function readBoolean(value: unknown): boolean {
  if (typeof value !== 'boolean') {
    throw new Error(INVALID_PAYLOAD_ERROR);
  }

  return value;
}

function readNullableNumber(value: unknown): number | null {
  if (value === null || typeof value === 'undefined') {
    return null;
  }

  return readNumber(value);
}

function readNullableIsoDate(value: unknown): string | null {
  if (value === null || typeof value === 'undefined') {
    return null;
  }

  return readString(value);
}

function readOrderStatus(value: unknown): PlayerOrderApiDto['status'] {
  const status = readString(value);
  if (
    status === 'pending' ||
    status === 'payment_submitted' ||
    status === 'paid' ||
    status === 'rejected' ||
    status === 'expired' ||
    status === 'cancelled' ||
    status === 'refunded'
  ) {
    return status;
  }

  throw new Error(INVALID_PAYLOAD_ERROR);
}

function readPaymentStatus(value: unknown): NonNullable<PlayerPaymentApiDto['status']> {
  const status = readString(value);
  if (
    status === 'pending' ||
    status === 'under_review' ||
    status === 'approved' ||
    status === 'rejected' ||
    status === 'cancelled' ||
    status === 'refunded'
  ) {
    return status;
  }

  throw new Error(INVALID_PAYLOAD_ERROR);
}

function readGameNumberStatus(value: unknown): 'available' | 'reserved' | 'sold' {
  const status = readString(value);
  if (status === 'available' || status === 'reserved' || status === 'sold') {
    return status;
  }

  throw new Error(INVALID_PAYLOAD_ERROR);
}

function readNullableGameNumberStatus(value: unknown): 'available' | 'reserved' | 'sold' | null {
  if (value === null || typeof value === 'undefined') {
    return null;
  }

  return readGameNumberStatus(value);
}

function readEntryStatus(value: unknown): 'confirmed' | 'winner' | 'cancelled' {
  const status = readString(value);
  if (status === 'confirmed' || status === 'winner' || status === 'cancelled') {
    return status;
  }

  throw new Error(INVALID_PAYLOAD_ERROR);
}

function readGameStatus(
  value: unknown,
): NonNullable<PlayerEntryView['liveProgress']>['gameStatus'] {
  const status = readString(value);

  if (
    status === 'draft' ||
    status === 'published' ||
    status === 'sales_open' ||
    status === 'sales_closed' ||
    status === 'running' ||
    status === 'paused' ||
    status === 'resolving' ||
    status === 'completed' ||
    status === 'cancelled'
  ) {
    return status;
  }

  throw new Error(INVALID_PAYLOAD_ERROR);
}

function isPaginationMeta(value: unknown): value is LaravelPaginatedResponse<unknown>['meta'] {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value['current_page'] === 'number' &&
    typeof value['last_page'] === 'number' &&
    typeof value['per_page'] === 'number' &&
    typeof value['total'] === 'number'
  );
}
