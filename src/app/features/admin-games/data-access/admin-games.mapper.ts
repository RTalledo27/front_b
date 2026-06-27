import {
  LaravelDataResponse,
  LaravelPaginatedResponse,
  LaravelPaginationMeta,
} from '../../../core/api/models/api-response.models';
import {
  AdminGameCommerceView,
  AdminGameDetailView,
  AdminGameListResult,
  AdminGameProjectionView,
  AdminGameSummaryView,
} from '../models/admin-games.models';
import { buildAdminGameStatus } from '../utils/admin-games-display';

const INVALID_PAYLOAD_ERROR = 'invalid_admin_games_payload';

export function mapAdminGameListResponse(response: unknown): AdminGameListResult {
  if (!isRecord(response) || !Array.isArray(response['data']) || !isPaginationMeta(response['meta'])) {
    throw new Error(INVALID_PAYLOAD_ERROR);
  }

  const links = readPaginationLinks(response['links']);
  const meta = readRecord(response['meta']);
  const items = response['data'];

  return {
    games: items.map(mapAdminGameSummary),
    pageInfo: {
      currentPage: readNumber(meta['current_page']),
      from: readNullableNumber(meta['from']),
      lastPage: readNumber(meta['last_page']),
      path: readString(meta['path']),
      perPage: readNumber(meta['per_page']),
      to: readNullableNumber(meta['to']),
      total: readNumber(meta['total']),
    },
    links,
  };
}

export function mapAdminGameDetailResponse(response: unknown): AdminGameDetailView {
  if (!isLaravelDataResponse(response)) {
    throw new Error(INVALID_PAYLOAD_ERROR);
  }

  return mapAdminGameDetail(response.data);
}

export function mapAdminGameSummary(payload: unknown): AdminGameSummaryView {
  const record = readRecord(payload);

  return {
    id: readString(record['id']),
    slug: readString(record['slug']),
    name: readString(record['name']),
    description: readNullableString(record['description']),
    status: buildAdminGameStatus(readString(record['status'])),
    numberRange: mapNumberRange(record['number_range']),
    ticketPrice: mapMoney(record['ticket_price']),
    prize: mapMoney(record['prize']),
    schedule: mapSchedule(record['schedule']),
    lifecycle: mapLifecycle(record['lifecycle']),
    numbers: mapNumbers(record['numbers']),
    ops: mapOps(record['ops']),
    createdBy: readNullableNumber(record['created_by']),
    createdAt: readString(record['created_at']),
  };
}

export function mapAdminGameDetail(payload: unknown): AdminGameDetailView {
  const record = readRecord(payload);

  return {
    id: readString(record['id']),
    slug: readString(record['slug']),
    name: readString(record['name']),
    description: readNullableString(record['description']),
    status: buildAdminGameStatus(readString(record['status'])),
    numberRange: mapNumberRange(record['number_range']),
    ticketPrice: mapMoney(record['ticket_price']),
    prize: mapMoney(record['prize']),
    schedule: mapSchedule(record['schedule']),
    lifecycle: mapLifecycle(record['lifecycle']),
    engine: mapEngine(record['engine']),
    numbers: mapNumbers(record['numbers']),
    settings: record['settings'] ?? null,
    latestDraw: mapLatestDraw(record['latest_draw']),
    winner: mapWinner(record['winner']),
    commerce: mapCommerce(record['commerce']),
    projection: mapProjection(record['projection']),
    createdBy: readNullableNumber(record['created_by']),
    createdAt: readString(record['created_at']),
  };
}

export function isAdminGamesInvalidPayloadError(error: unknown): boolean {
  return error instanceof Error && error.message === INVALID_PAYLOAD_ERROR;
}

function mapNumberRange(payload: unknown) {
  const record = readRecord(payload);

  return {
    min: readNumber(record['min']),
    max: readNumber(record['max']),
    hitsRequired: readNumber(record['hits_required']),
  };
}

function mapMoney(payload: unknown) {
  const record = readRecord(payload);

  return {
    amountCents: readNumber(record['amount_cents']),
    currency: readString(record['currency']),
  };
}

function mapSchedule(payload: unknown) {
  const record = readRecord(payload);

  return {
    salesOpensAt: readNullableIsoDate(record['sales_opens_at']),
    salesClosesAt: readNullableIsoDate(record['sales_closes_at']),
    scheduledStartAt: readNullableIsoDate(record['scheduled_start_at']),
    drawIntervalSeconds: readNumber(record['draw_interval_seconds']),
    autoDrawEnabled: readBoolean(record['auto_draw_enabled']),
  };
}

function mapLifecycle(payload: unknown) {
  const record = readRecord(payload);

  return {
    startedAt: readNullableIsoDate(record['started_at']),
    pausedAt: readNullableIsoDate(record['paused_at']),
    completedAt: readNullableIsoDate(record['completed_at']),
  };
}

function mapNumbers(payload: unknown) {
  const record = readRecord(payload);

  return {
    total: readNumber(record['total']),
    sold: readNumber(record['sold']),
    reserved: readNumber(record['reserved']),
    available: readNumber(record['available']),
  };
}

function mapOps(payload: unknown) {
  const record = readRecord(payload);

  return {
    drawsTotal: readNumber(record['draws_total']),
    ordersPending: readNumber(record['orders_pending']),
    paymentsUnderReview: readNumber(record['payments_under_review']),
    entriesConfirmed: readNumber(record['entries_confirmed']),
  };
}

function mapEngine(payload: unknown) {
  const record = readRecord(payload);

  return {
    nextDrawAt: readNullableIsoDate(record['next_draw_at']),
    lastConsumedTickAt: readNullableIsoDate(record['last_consumed_tick_at']),
  };
}

function mapLatestDraw(payload: unknown) {
  if (payload === null) {
    return null;
  }

  const record = readRecord(payload);

  return {
    sequence: readNumber(record['sequence']),
    number: readNumber(record['number']),
    drawnAt: readIsoDate(record['drawn_at']),
  };
}

function mapWinner(payload: unknown) {
  if (payload === null) {
    return null;
  }

  const record = readRecord(payload);

  return {
    userId: readNumber(record['user_id']),
    gameNumberId: readString(record['game_number_id']),
    winningNumber: readNullableNumber(record['winning_number']),
    gameDrawId: readString(record['game_draw_id']),
    winningDrawSequence: readNullableNumber(record['winning_draw_sequence']),
    winningHits: readNumber(record['winning_hits']),
    wonAt: readIsoDate(record['won_at']),
  };
}

function mapCommerce(payload: unknown): AdminGameCommerceView {
  const record = readRecord(payload);
  const reservations = readRecord(record['reservations']);
  const orders = readRecord(record['orders']);
  const payments = readRecord(record['payments']);
  const entries = readRecord(record['entries']);

  return {
    reservations: {
      total: readNumber(reservations['total']),
    },
    orders: {
      pending: readNumber(orders['pending']),
      paymentSubmitted: readNumber(orders['payment_submitted']),
      paid: readNumber(orders['paid']),
      rejected: readNumber(orders['rejected']),
      expired: readNumber(orders['expired']),
      cancelled: readNumber(orders['cancelled']),
      refunded: readNumber(orders['refunded']),
    },
    payments: {
      pending: readNumber(payments['pending']),
      underReview: readNumber(payments['under_review']),
      approved: readNumber(payments['approved']),
      rejected: readNumber(payments['rejected']),
      cancelled: readNumber(payments['cancelled']),
      refunded: readNumber(payments['refunded']),
    },
    entries: {
      confirmed: readNumber(entries['confirmed']),
      cancelled: readNumber(entries['cancelled']),
      refunded: readNumber(entries['refunded']),
      winner: readNumber(entries['winner']),
    },
  };
}

function mapProjection(payload: unknown): AdminGameProjectionView {
  const record = readRecord(payload);

  return {
    drawsTotal: readNumber(record['draws_total']),
    distinctDrawnNumbers: readNumber(record['distinct_drawn_numbers']),
    maxCounterHits: readNumber(record['max_counter_hits']),
    lastDrawnNumber: readNullableNumber(record['last_drawn_number']),
  };
}

function isLaravelDataResponse(value: unknown): value is LaravelDataResponse<unknown> {
  return isRecord(value) && 'data' in value;
}

function isPaginationMeta(value: unknown): value is LaravelPaginationMeta {
  return isRecord(value);
}

function readPaginationLinks(value: unknown) {
  const record = readRecord(value);

  return {
    first: readNullableString(record['first']),
    last: readNullableString(record['last']),
    prev: readNullableString(record['prev']),
    next: readNullableString(record['next']),
  };
}

function readRecord(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new Error(INVALID_PAYLOAD_ERROR);
  }

  return value;
}

function readString(value: unknown): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(INVALID_PAYLOAD_ERROR);
  }

  return value;
}

function readNullableString(value: unknown): string | null {
  if (value === null) {
    return null;
  }

  return readString(value);
}

function readIsoDate(value: unknown): string {
  const date = readString(value);

  if (!isIsoDateString(date)) {
    throw new Error(INVALID_PAYLOAD_ERROR);
  }

  return date;
}

function readNullableIsoDate(value: unknown): string | null {
  if (value === null) {
    return null;
  }

  return readIsoDate(value);
}

function readNumber(value: unknown): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new Error(INVALID_PAYLOAD_ERROR);
  }

  return value;
}

function readNullableNumber(value: unknown): number | null {
  if (value === null) {
    return null;
  }

  return readNumber(value);
}

function readBoolean(value: unknown): boolean {
  if (typeof value !== 'boolean') {
    throw new Error(INVALID_PAYLOAD_ERROR);
  }

  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isIsoDateString(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T/.test(value) && !Number.isNaN(Date.parse(value));
}
