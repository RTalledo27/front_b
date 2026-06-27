import { StatusTone } from '../../../shared/ui/status-badge/status-badge';

export interface AdminGameListQuery {
  page: number;
  search: string;
  status: string;
  published: boolean | null;
  autoDrawEnabled: boolean | null;
  createdFrom: string | null;
  createdTo: string | null;
}

export interface AdminGameStatusView {
  value: string;
  label: string;
  tone: StatusTone;
  isKnown: boolean;
}

export interface AdminMoneyView {
  amountCents: number;
  currency: string;
}

export interface AdminGameScheduleView {
  salesOpensAt: string | null;
  salesClosesAt: string | null;
  scheduledStartAt: string | null;
  drawIntervalSeconds: number;
  autoDrawEnabled: boolean;
}

export interface AdminGameLifecycleView {
  startedAt: string | null;
  pausedAt: string | null;
  completedAt: string | null;
}

export interface AdminGameNumberRangeView {
  min: number;
  max: number;
  hitsRequired: number;
}

export interface AdminGameNumbersView {
  total: number;
  sold: number;
  reserved: number;
  available: number;
}

export interface AdminGameOpsView {
  drawsTotal: number;
  ordersPending: number;
  paymentsUnderReview: number;
  entriesConfirmed: number;
}

export interface AdminGamesPageInfo {
  currentPage: number;
  from: number | null;
  lastPage: number;
  path: string;
  perPage: number;
  to: number | null;
  total: number;
}

export interface AdminGamesPaginationLinks {
  first: string | null;
  last: string | null;
  prev: string | null;
  next: string | null;
}

export interface AdminGameSummaryView {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  status: AdminGameStatusView;
  numberRange: AdminGameNumberRangeView;
  ticketPrice: AdminMoneyView;
  prize: AdminMoneyView;
  schedule: AdminGameScheduleView;
  lifecycle: AdminGameLifecycleView;
  numbers: AdminGameNumbersView;
  ops: AdminGameOpsView;
  createdBy: number | null;
  createdAt: string;
}

export interface AdminGameListResult {
  games: AdminGameSummaryView[];
  pageInfo: AdminGamesPageInfo;
  links: AdminGamesPaginationLinks;
}

export interface AdminGameEngineView {
  nextDrawAt: string | null;
  lastConsumedTickAt: string | null;
}

export interface AdminGameLatestDrawView {
  sequence: number;
  number: number;
  drawnAt: string;
}

export interface AdminGameWinnerView {
  userId: number;
  gameNumberId: string;
  winningNumber: number | null;
  gameDrawId: string;
  winningDrawSequence: number | null;
  winningHits: number;
  wonAt: string;
}

export interface AdminGameCommerceReservationsView {
  total: number;
}

export interface AdminGameCommerceOrdersView {
  pending: number;
  paymentSubmitted: number;
  paid: number;
  rejected: number;
  expired: number;
  cancelled: number;
  refunded: number;
}

export interface AdminGameCommercePaymentsView {
  pending: number;
  underReview: number;
  approved: number;
  rejected: number;
  cancelled: number;
  refunded: number;
}

export interface AdminGameCommerceEntriesView {
  confirmed: number;
  cancelled: number;
  refunded: number;
  winner: number;
}

export interface AdminGameCommerceView {
  reservations: AdminGameCommerceReservationsView;
  orders: AdminGameCommerceOrdersView;
  payments: AdminGameCommercePaymentsView;
  entries: AdminGameCommerceEntriesView;
}

export interface AdminGameProjectionView {
  drawsTotal: number;
  distinctDrawnNumbers: number;
  maxCounterHits: number;
  lastDrawnNumber: number | null;
}

export interface AdminGameDetailView {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  status: AdminGameStatusView;
  numberRange: AdminGameNumberRangeView;
  ticketPrice: AdminMoneyView;
  prize: AdminMoneyView;
  schedule: AdminGameScheduleView;
  lifecycle: AdminGameLifecycleView;
  engine: AdminGameEngineView;
  numbers: AdminGameNumbersView;
  settings: unknown;
  latestDraw: AdminGameLatestDrawView | null;
  winner: AdminGameWinnerView | null;
  commerce: AdminGameCommerceView;
  projection: AdminGameProjectionView;
  createdBy: number | null;
  createdAt: string;
}

export type AdminGamesListStatus =
  | 'idle'
  | 'loading'
  | 'refreshing'
  | 'loaded'
  | 'empty'
  | 'unauthorized'
  | 'forbidden'
  | 'validationError'
  | 'networkError'
  | 'unexpectedError';

export type AdminGameDetailStatus =
  | 'idle'
  | 'loading'
  | 'loaded'
  | 'unauthorized'
  | 'forbidden'
  | 'notFound'
  | 'networkError'
  | 'unexpectedError';
