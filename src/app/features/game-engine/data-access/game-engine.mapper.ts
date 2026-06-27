import {
  LaravelDataResponse,
  LaravelPaginatedResponse,
  LaravelPaginationMeta,
} from '../../../core/api/models/api-response.models';
import { buildAdminGameNumberStatus } from '../../admin-games/utils/admin-games-display';
import {
  GameEngineCounterView,
  GameEngineDrawView,
  GameEngineWinnerView,
} from '../models/game-engine.models';

const INVALID_PAYLOAD_ERROR = 'invalid_game_engine_payload';

export function mapGameEngineDrawsResponse(response: unknown): GameEngineDrawView[] {
  if (!isPaginatedResponse(response)) {
    throw new Error(INVALID_PAYLOAD_ERROR);
  }

  return response.data.map(mapGameEngineDraw);
}

export function mapGameEngineCountersResponse(response: unknown): GameEngineCounterView[] {
  if (!isPaginatedResponse(response)) {
    throw new Error(INVALID_PAYLOAD_ERROR);
  }

  return response.data.map(mapGameEngineCounter);
}

export function mapGameEngineWinnerResponse(response: unknown): GameEngineWinnerView {
  if (!isDataResponse(response)) {
    throw new Error(INVALID_PAYLOAD_ERROR);
  }

  return mapGameEngineWinner(response.data);
}

export function isGameEngineInvalidPayloadError(error: unknown): boolean {
  return error instanceof Error && error.message === INVALID_PAYLOAD_ERROR;
}

function mapGameEngineDraw(payload: unknown): GameEngineDrawView {
  const record = readRecord(payload);

  return {
    id: readString(record['id']),
    gameId: readString(record['game_id']),
    gameNumberId: readString(record['game_number_id']),
    sequence: readNumber(record['sequence']),
    drawnNumber: readNumber(record['drawn_number']),
    strategy: readString(record['strategy']),
    drawnAt: readIsoDate(record['drawn_at']),
  };
}

function mapGameEngineCounter(payload: unknown): GameEngineCounterView {
  const record = readRecord(payload);
  const status = readString(record['status']);

  return {
    gameNumberId: readString(record['game_number_id']),
    number: readNumber(record['number']),
    status: buildAdminGameNumberStatus(status),
    hitsCount: readNumber(record['hits_count']),
    lastDrawSequence: readNullableNumber(record['last_draw_sequence']),
  };
}

function mapGameEngineWinner(payload: unknown): GameEngineWinnerView {
  const record = readRecord(payload);

  return {
    winnerId: readString(record['winner_id']),
    gameId: readString(record['game_id']),
    gameEntryId: readString(record['game_entry_id']),
    gameNumberId: readString(record['game_number_id']),
    winningNumber: readNullableNumber(record['winning_number']),
    gameDrawId: readString(record['game_draw_id']),
    winningDrawSequence: readNullableNumber(record['winning_draw_sequence']),
    winningHits: readNumber(record['winning_hits']),
    userId: readNumber(record['user_id']),
    wonAt: readIsoDate(record['won_at']),
  };
}

function isDataResponse(value: unknown): value is LaravelDataResponse<unknown> {
  return isRecord(value) && 'data' in value;
}

function isPaginatedResponse(value: unknown): value is LaravelPaginatedResponse<unknown> {
  return isRecord(value) && Array.isArray(value['data']) && isPaginationMeta(value['meta']);
}

function isPaginationMeta(value: unknown): value is LaravelPaginationMeta {
  return isRecord(value);
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

function readIsoDate(value: unknown): string {
  const date = readString(value);

  if (!/^\d{4}-\d{2}-\d{2}T/.test(date) || Number.isNaN(Date.parse(date))) {
    throw new Error(INVALID_PAYLOAD_ERROR);
  }

  return date;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
