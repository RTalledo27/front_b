import {
  LaravelDataResponse,
  LaravelPaginatedResponse,
  LaravelPaginationMeta,
} from '../../../core/api/models/api-response.models';
import { buildAdminGameNumberStatus } from '../../admin-games/utils/admin-games-display';
import {
  GameEngineCounterView,
  GameEngineCountersPageView,
  GameEngineDrawCommandView,
  GameEngineDrawView,
  GameEngineDrawsPageView,
  GameEnginePageInfo,
  GameEnginePaginationLinks,
  GameEnginePauseCommandView,
  GameEngineRebuildCountersCommandView,
  GameEngineResumeCommandView,
  GameEngineStartCommandView,
  GameEngineWinnerView,
} from '../models/game-engine.models';

const INVALID_PAYLOAD_ERROR = 'invalid_game_engine_payload';

export function mapGameEngineDrawsResponse(response: unknown): GameEngineDrawsPageView {
  if (!isPaginatedResponse(response)) {
    throw new Error(INVALID_PAYLOAD_ERROR);
  }

  return {
    items: response.data.map(mapGameEngineDraw),
    pageInfo: mapPageInfo(response.meta),
    links: mapPaginationLinks(response.links),
  };
}

export function mapGameEngineCountersResponse(response: unknown): GameEngineCountersPageView {
  if (!isPaginatedResponse(response)) {
    throw new Error(INVALID_PAYLOAD_ERROR);
  }

  return {
    items: response.data.map(mapGameEngineCounter),
    pageInfo: mapPageInfo(response.meta),
    links: mapPaginationLinks(response.links),
  };
}

export function mapGameEngineWinnerResponse(response: unknown): GameEngineWinnerView {
  if (!isDataResponse(response)) {
    throw new Error(INVALID_PAYLOAD_ERROR);
  }

  return mapGameEngineWinner(response.data);
}

export function mapGameEngineStartResponse(response: unknown): GameEngineStartCommandView {
  if (!isDataResponse(response)) {
    throw new Error(INVALID_PAYLOAD_ERROR);
  }

  return mapGameEngineStart(response.data);
}

export function mapGameEnginePauseResponse(response: unknown): GameEnginePauseCommandView {
  if (!isDataResponse(response)) {
    throw new Error(INVALID_PAYLOAD_ERROR);
  }

  return mapGameEnginePause(response.data);
}

export function mapGameEngineResumeResponse(response: unknown): GameEngineResumeCommandView {
  if (!isDataResponse(response)) {
    throw new Error(INVALID_PAYLOAD_ERROR);
  }

  return mapGameEngineResume(response.data);
}

export function mapGameEngineDrawCommandResponse(response: unknown): GameEngineDrawCommandView {
  if (!isDataResponse(response)) {
    throw new Error(INVALID_PAYLOAD_ERROR);
  }

  return mapGameEngineDrawCommand(response.data);
}

export function mapGameEngineRebuildCountersResponse(
  response: unknown,
): GameEngineRebuildCountersCommandView {
  if (!isDataResponse(response)) {
    throw new Error(INVALID_PAYLOAD_ERROR);
  }

  return mapGameEngineRebuildCounters(response.data);
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

function mapGameEngineStart(payload: unknown): GameEngineStartCommandView {
  const record = readRecord(payload);
  const outcome = readString(record['outcome']);

  if (outcome !== 'started' && outcome !== 'already_started') {
    throw new Error(INVALID_PAYLOAD_ERROR);
  }

  return {
    gameId: readString(record['game_id']),
    status: readString(record['status']),
    outcome,
    scheduledStartAt: readIsoDate(record['scheduled_start_at']),
    startedAt: readIsoDate(record['started_at']),
    confirmedEntriesCount: readNumber(record['confirmed_entries_count']),
  };
}

function mapGameEnginePause(payload: unknown): GameEnginePauseCommandView {
  const record = readRecord(payload);
  const outcome = readString(record['outcome']);

  if (outcome !== 'paused' && outcome !== 'already_paused') {
    throw new Error(INVALID_PAYLOAD_ERROR);
  }

  if (readString(record['status']) !== 'paused') {
    throw new Error(INVALID_PAYLOAD_ERROR);
  }

  return {
    gameId: readString(record['game_id']),
    status: 'paused',
    outcome,
    pausedAt: readIsoDate(record['paused_at']),
  };
}

function mapGameEngineResume(payload: unknown): GameEngineResumeCommandView {
  const record = readRecord(payload);
  const outcome = readString(record['outcome']);

  if (outcome !== 'resumed' && outcome !== 'already_running') {
    throw new Error(INVALID_PAYLOAD_ERROR);
  }

  if (readString(record['status']) !== 'running') {
    throw new Error(INVALID_PAYLOAD_ERROR);
  }

  return {
    gameId: readString(record['game_id']),
    status: 'running',
    outcome,
    resumedAt: readIsoDate(record['resumed_at']),
    nextDrawAt: readIsoDate(record['next_draw_at']),
  };
}

function mapGameEngineDrawCommand(payload: unknown): GameEngineDrawCommandView {
  const record = readRecord(payload);
  const gameStatus = readString(record['game_status']);

  if (gameStatus !== 'running' && gameStatus !== 'completed') {
    throw new Error(INVALID_PAYLOAD_ERROR);
  }

  return {
    gameId: readString(record['game_id']),
    drawId: readString(record['draw_id']),
    gameNumberId: readString(record['game_number_id']),
    sequence: readPositiveNumber(record['sequence']),
    drawnNumber: readPositiveNumber(record['drawn_number']),
    currentHits: readPositiveNumber(record['current_hits']),
    hitsRequired: readPositiveNumber(record['hits_required']),
    numberIsSold: readBoolean(record['number_is_sold']),
    winnerCreated: readBoolean(record['winner_created']),
    winnerEntryId: readNullableString(record['winner_entry_id']),
    gameStatus,
    drawnAt: readIsoDate(record['drawn_at']),
    replay: readBoolean(record['replay']),
  };
}

function mapGameEngineRebuildCounters(payload: unknown): GameEngineRebuildCountersCommandView {
  const record = readRecord(payload);
  const outcome = readString(record['outcome']);

  if (outcome !== 'rebuilt' && outcome !== 'already_consistent') {
    throw new Error(INVALID_PAYLOAD_ERROR);
  }

  return {
    gameId: readString(record['game_id']),
    outcome,
    previousRows: readNonNegativeNumber(record['previous_rows']),
    previousHitsTotal: readNonNegativeNumber(record['previous_hits_total']),
    rebuiltRows: readNonNegativeNumber(record['rebuilt_rows']),
    rebuiltHitsTotal: readNonNegativeNumber(record['rebuilt_hits_total']),
    totalDraws: readNonNegativeNumber(record['total_draws']),
    maxSequence: readNonNegativeNumber(record['max_sequence']),
    rebuiltAt: readIsoDate(record['rebuilt_at']),
  };
}

function mapPageInfo(meta: LaravelPaginationMeta): GameEnginePageInfo {
  return {
    currentPage: readNumber(meta['current_page']),
    from: readNullableNumber(meta['from']),
    lastPage: readNumber(meta['last_page']),
    path: readString(meta['path']),
    perPage: readNumber(meta['per_page']),
    to: readNullableNumber(meta['to']),
    total: readNumber(meta['total']),
  };
}

function mapPaginationLinks(value: LaravelPaginatedResponse<unknown>['links']): GameEnginePaginationLinks {
  return {
    first: readNullableString(value['first']),
    last: readNullableString(value['last']),
    prev: readNullableString(value['prev']),
    next: readNullableString(value['next']),
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

function readPositiveNumber(value: unknown): number {
  const number = readNumber(value);

  if (number < 1) {
    throw new Error(INVALID_PAYLOAD_ERROR);
  }

  return number;
}

function readNonNegativeNumber(value: unknown): number {
  const number = readNumber(value);

  if (number < 0) {
    throw new Error(INVALID_PAYLOAD_ERROR);
  }

  return number;
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

function readNullableString(value: unknown): string | null {
  if (value === null) {
    return null;
  }

  return readString(value);
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
