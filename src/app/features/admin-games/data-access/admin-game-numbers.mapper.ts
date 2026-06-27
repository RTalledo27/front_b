import { LaravelDataResponse } from '../../../core/api/models/api-response.models';
import {
  AdminGameNumberReservationView,
  AdminGameNumbersResult,
  AdminGameNumberSoldEntryView,
  AdminGameNumberView,
} from '../models/admin-games.models';
import { buildAdminGameNumberStatus } from '../utils/admin-games-display';

const INVALID_PAYLOAD_ERROR = 'invalid_admin_game_numbers_payload';

export function mapAdminGameNumbersResponse(response: unknown): AdminGameNumbersResult {
  if (!isRecord(response) || !Array.isArray(response['data'])) {
    throw new Error(INVALID_PAYLOAD_ERROR);
  }

  return {
    numbers: response['data'].map(mapAdminGameNumber),
  };
}

export function mapAdminGameNumber(payload: unknown): AdminGameNumberView {
  const record = readRecord(payload);

  return {
    id: readString(record['id']),
    number: readNumber(record['number']),
    status: buildAdminGameNumberStatus(readString(record['status'])),
    activeReservation: mapReservation(record['active_reservation']),
    soldEntry: mapSoldEntry(record['sold_entry']),
  };
}

export function isAdminGameNumbersInvalidPayloadError(error: unknown): boolean {
  return error instanceof Error && error.message === INVALID_PAYLOAD_ERROR;
}

function mapReservation(payload: unknown): AdminGameNumberReservationView | null {
  if (payload === null) {
    return null;
  }

  const record = readRecord(payload);

  return {
    id: readString(record['id']),
    orderId: readString(record['order_id']),
    orderStatus: readNullableString(record['order_status']),
    expiresAt: readNullableIsoDate(record['expires_at']),
  };
}

function mapSoldEntry(payload: unknown): AdminGameNumberSoldEntryView | null {
  if (payload === null) {
    return null;
  }

  const record = readRecord(payload);

  return {
    id: readString(record['id']),
    status: readString(record['status']),
    confirmedAt: readNullableIsoDate(record['confirmed_at']),
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

function readNumber(value: unknown): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new Error(INVALID_PAYLOAD_ERROR);
  }

  return value;
}

function readNullableIsoDate(value: unknown): string | null {
  if (value === null) {
    return null;
  }

  const date = readString(value);

  if (!/^\d{4}-\d{2}-\d{2}T/.test(date) || Number.isNaN(Date.parse(date))) {
    throw new Error(INVALID_PAYLOAD_ERROR);
  }

  return date;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
