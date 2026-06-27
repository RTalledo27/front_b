import { AdminGameDetailView, AdminGameNumberStatusView } from '../../admin-games/models/admin-games.models';

export interface GameEngineDrawView {
  id: string;
  gameId: string;
  gameNumberId: string;
  sequence: number;
  drawnNumber: number;
  strategy: string;
  drawnAt: string;
}

export interface GameEngineCounterView {
  gameNumberId: string;
  number: number;
  status: AdminGameNumberStatusView;
  hitsCount: number;
  lastDrawSequence: number | null;
}

export interface GameEngineWinnerView {
  winnerId: string;
  gameId: string;
  gameEntryId: string;
  gameNumberId: string;
  winningNumber: number | null;
  gameDrawId: string;
  winningDrawSequence: number | null;
  winningHits: number;
  userId: number;
  wonAt: string;
}

export interface GameEngineStartCommandView {
  gameId: string;
  status: string;
  outcome: 'started' | 'already_started';
  scheduledStartAt: string;
  startedAt: string;
  confirmedEntriesCount: number;
}

export interface GameEnginePauseCommandView {
  gameId: string;
  status: 'paused';
  outcome: 'paused' | 'already_paused';
  pausedAt: string;
}

export interface GameEngineResumeCommandView {
  gameId: string;
  status: 'running';
  outcome: 'resumed' | 'already_running';
  resumedAt: string;
  nextDrawAt: string;
}

export interface GameEngineDrawCommandView {
  gameId: string;
  drawId: string;
  gameNumberId: string;
  sequence: number;
  drawnNumber: number;
  currentHits: number;
  hitsRequired: number;
  numberIsSold: boolean;
  winnerCreated: boolean;
  winnerEntryId: string | null;
  gameStatus: 'running' | 'completed';
  drawnAt: string;
  replay: boolean;
}

export interface GameEngineConsoleView {
  context: AdminGameDetailView;
  draws: GameEngineDrawView[];
  counters: GameEngineCounterView[];
  winner: GameEngineWinnerView | null;
}

export type GameEngineAccessMode = 'contextual' | 'manual';

export type GameEngineCommandStatus =
  | 'idle'
  | 'submitting'
  | 'success'
  | 'conflict'
  | 'unauthorized'
  | 'forbidden'
  | 'notFound'
  | 'invalidState'
  | 'networkError'
  | 'unexpectedError';

export type GameEngineStartStatus = GameEngineCommandStatus;
export type GameEnginePauseStatus = GameEngineCommandStatus;
export type GameEngineResumeStatus = GameEngineCommandStatus;
export type GameEngineDrawStatus = GameEngineCommandStatus;

export type GameEnginePageStatus =
  | 'idle'
  | 'loading'
  | 'refreshing'
  | 'loaded'
  | 'unauthorized'
  | 'forbidden'
  | 'notFound'
  | 'validationError'
  | 'networkError'
  | 'unexpectedError';
