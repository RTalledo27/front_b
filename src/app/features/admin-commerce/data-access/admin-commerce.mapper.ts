import { LaravelDataResponse } from '../../../core/api/models/api-response.models';
import {
  AdminRefundView,
  AdminWinnerPayoutView,
} from '../models/admin-commerce.models';

const INVALID_PAYLOAD_ERROR = 'invalid_admin_commerce_payload';

export function mapAdminRefundResponse(response: unknown): AdminRefundView {
  if (!isLaravelDataResponse(response)) {
    throw new Error(INVALID_PAYLOAD_ERROR);
  }

  return mapAdminRefund(response.data);
}

export function mapAdminWinnerPayoutResponse(response: unknown): AdminWinnerPayoutView {
  if (!isLaravelDataResponse(response)) {
    throw new Error(INVALID_PAYLOAD_ERROR);
  }

  return mapAdminWinnerPayout(response.data);
}

export function mapAdminRefund(payload: unknown): AdminRefundView {
  const record = readRecord(payload);
  const entries = readRecord(record['entries']);

  return {
    id: readString(record['id']),
    orderId: readString(record['order_id']),
    paymentId: readString(record['payment_id']),
    gameId: readString(record['game_id']),
    amountCents: readNumber(record['amount_cents']),
    currency: readString(record['currency']),
    reason: readString(record['reason']),
    processedByUserId: readNumber(record['processed_by_user_id']),
    processedAt: readIsoDate(record['processed_at']),
    createdAt: readIsoDate(record['created_at']),
    entryIds: readStringArray(entries['ids']),
    entryCount: readNumber(entries['count']),
    numbers: readNumberArray(record['numbers']),
    gameNumberIds: readStringArray(record['game_number_ids']),
    wasAlreadyRefunded: readBoolean(record['was_already_refunded']),
  };
}

export function mapAdminWinnerPayout(payload: unknown): AdminWinnerPayoutView {
  const record = readRecord(payload);
  const document = readRecord(record['document']);

  return {
    id: readString(record['id']),
    gameId: readString(record['game_id']),
    gameWinnerId: readString(record['game_winner_id']),
    userId: readNumber(record['user_id']),
    amountCents: readNumber(record['amount_cents']),
    currency: readString(record['currency']),
    method: readString(record['method']),
    externalReference: readString(record['external_reference']),
    notes: readNullableString(record['notes']),
    processedByUserId: readNumber(record['processed_by_user_id']),
    processedAt: readIsoDate(record['processed_at']),
    createdAt: readIsoDate(record['created_at']),
    document: {
      id: readString(document['id']),
      originalFilename: readString(document['original_filename']),
      mimeType: readString(document['mime_type']),
      sizeBytes: readNumber(document['size_bytes']),
      createdAt: readIsoDate(document['created_at']),
    },
    wasAlreadyProcessed: readBoolean(record['was_already_processed']),
  };
}

export function isAdminCommerceInvalidPayloadError(error: unknown): boolean {
  return error instanceof Error && error.message === INVALID_PAYLOAD_ERROR;
}

function isLaravelDataResponse(value: unknown): value is LaravelDataResponse<unknown> {
  return isRecord(value) && 'data' in value;
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

function readBoolean(value: unknown): boolean {
  if (typeof value !== 'boolean') {
    throw new Error(INVALID_PAYLOAD_ERROR);
  }

  return value;
}

function readIsoDate(value: unknown): string {
  const date = readString(value);

  if (!/^\d{4}-\d{2}-\d{2}T/.test(date) || Number.isNaN(Date.parse(date))) {
    throw new Error(INVALID_PAYLOAD_ERROR);
  }

  return date;
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    throw new Error(INVALID_PAYLOAD_ERROR);
  }

  return value.map(readString);
}

function readNumberArray(value: unknown): number[] {
  if (!Array.isArray(value)) {
    throw new Error(INVALID_PAYLOAD_ERROR);
  }

  return value.map(readNumber);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
