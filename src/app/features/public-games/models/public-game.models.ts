import { GameStatus } from '../../../core/api/models/game-api.models';

export interface Money {
  amountCents: number;
  currency: string;
}

export interface PublicGameSchedule {
  salesOpensAt: string | null;
  salesClosesAt: string | null;
  scheduledStartAt: string | null;
  drawIntervalSeconds: number;
  nextDrawAt: string | null;
}

export interface PublicGameLifecycle {
  startedAt: string | null;
  pausedAt: string | null;
  completedAt: string | null;
}

export interface PublicGameLatestDraw {
  sequence: number;
  number: number;
  drawnAt: string;
}

export interface PublicGameWinner {
  number: number;
  drawSequence: number;
  hits: number;
  wonAt: string;
}

export interface PublicGame {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  status: GameStatus;
  numberMin: number;
  numberMax: number;
  hitsRequired: number;
  ticketPrice: Money;
  prize: Money;
  schedule: PublicGameSchedule;
  lifecycle: PublicGameLifecycle;
  latestDraw: PublicGameLatestDraw | null;
  winner: PublicGameWinner | null;
}

export interface PageInfo {
  currentPage: number;
  lastPage: number;
  perPage: number;
  total: number;
}

export interface PublicGamesPage {
  games: PublicGame[];
  pageInfo: PageInfo;
}

export type ViewStatus = 'idle' | 'loading' | 'success' | 'empty' | 'error';
