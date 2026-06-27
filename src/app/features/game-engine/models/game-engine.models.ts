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

export interface GameEngineConsoleView {
  context: AdminGameDetailView;
  draws: GameEngineDrawView[];
  counters: GameEngineCounterView[];
  winner: GameEngineWinnerView | null;
}

export type GameEngineAccessMode = 'contextual' | 'manual';

export type GameEngineStartStatus =
  | 'idle'
  | 'submitting'
  | 'success'
  | 'unauthorized'
  | 'forbidden'
  | 'notFound'
  | 'invalidState'
  | 'networkError'
  | 'unexpectedError';

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
