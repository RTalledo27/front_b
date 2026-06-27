import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Observable, Subject, throwError } from 'rxjs';
import { AuthSessionService } from '../../../core/auth/services/auth-session.service';
import { ADMIN_GAMES_REPOSITORY } from '../../admin-games/data-access/admin-games.repository';
import { AdminGameDetailView } from '../../admin-games/models/admin-games.models';
import { GameEngineFacade } from './game-engine.facade';
import { GAME_ENGINE_REPOSITORY } from './game-engine.repository';

function createContext(
  id: string,
  overrides?: Partial<AdminGameDetailView>,
): AdminGameDetailView {
  return {
    id,
    slug: `${id}-slug`,
    name: `Juego ${id}`,
    description: null,
    status: { value: 'sales_closed', label: 'Ventas cerradas', tone: 'warning', isKnown: true },
    numberRange: { min: 1, max: 90, hitsRequired: 5 },
    ticketPrice: { amountCents: 500, currency: 'PEN' },
    prize: { amountCents: 100000, currency: 'PEN' },
    schedule: {
      salesOpensAt: null,
      salesClosesAt: null,
      scheduledStartAt: '2026-06-27T12:00:00Z',
      drawIntervalSeconds: 30,
      autoDrawEnabled: true,
    },
    lifecycle: { startedAt: null, pausedAt: null, completedAt: null },
    engine: { nextDrawAt: null, lastConsumedTickAt: null },
    numbers: { total: 90, sold: 10, reserved: 5, available: 75 },
    settings: null,
    latestDraw: null,
    winner: null,
    commerce: {
      reservations: { total: 1 },
      orders: { pending: 1, paymentSubmitted: 0, paid: 0, rejected: 0, expired: 0, cancelled: 0, refunded: 0 },
      payments: { pending: 0, underReview: 0, approved: 0, rejected: 0, cancelled: 0, refunded: 0 },
      entries: { confirmed: 1, cancelled: 0, refunded: 0, winner: 0 },
    },
    projection: { drawsTotal: 0, distinctDrawnNumbers: 0, maxCounterHits: 0, lastDrawnNumber: null },
    createdBy: 1,
    createdAt: '2026-06-27T11:00:00Z',
    ...overrides,
  };
}

function settledWinnerRequest() {
  return throwError(
    () => new HttpErrorResponse({ status: 404, error: { message: 'game_winner_not_found' } }),
  );
}

function settledStream<T>(value: T): Observable<T> {
  const subject = new Subject<T>();
  queueMicrotask(() => {
    subject.next(value);
    subject.complete();
  });
  return subject;
}

describe('GameEngineFacade', () => {
  function setup(overrides?: {
    contextRequest?: () => Observable<AdminGameDetailView>;
    drawsRequest?: () => Observable<unknown[]>;
    countersRequest?: () => Observable<unknown[]>;
    winnerRequest?: () => Observable<unknown>;
    startRequest?: () => Observable<unknown>;
    user?: ReturnType<typeof signal<{ id: number } | null>>;
  }) {
    const user = overrides?.user ?? signal<{ id: number } | null>({ id: 7 });
    const adminRepository = {
      getGame: vi.fn(
        overrides?.contextRequest ?? (() => new Subject<AdminGameDetailView>() as Observable<AdminGameDetailView>),
      ),
    };
    const engineRepository = {
      listDraws: vi.fn(overrides?.drawsRequest ?? (() => new Subject<unknown[]>() as Observable<unknown[]>)),
      listCounters: vi.fn(
        overrides?.countersRequest ?? (() => new Subject<unknown[]>() as Observable<unknown[]>),
      ),
      getWinner: vi.fn(overrides?.winnerRequest ?? (() => new Subject<unknown>() as Observable<unknown>)),
      startGame: vi.fn(overrides?.startRequest ?? (() => new Subject<unknown>() as Observable<unknown>)),
    };

    TestBed.configureTestingModule({
      providers: [
        GameEngineFacade,
        { provide: ADMIN_GAMES_REPOSITORY, useValue: adminRepository },
        { provide: GAME_ENGINE_REPOSITORY, useValue: engineRepository },
        { provide: AuthSessionService, useValue: { user } },
      ],
    });

    return {
      facade: TestBed.inject(GameEngineFacade),
      adminRepository,
      engineRepository,
      user,
    };
  }

  it('loads the contextual engine snapshot successfully', () => {
    const context$ = new Subject<AdminGameDetailView>();
    const draws$ = new Subject<unknown[]>();
    const counters$ = new Subject<unknown[]>();
    const winner$ = new Subject<unknown>();

    const { facade } = setup({
      contextRequest: () => context$,
      drawsRequest: () => draws$,
      countersRequest: () => counters$,
      winnerRequest: () => winner$,
    });

    facade.load('game-1', 'contextual');
    context$.next(createContext('game-1'));
    context$.complete();
    draws$.next([]);
    draws$.complete();
    counters$.next([]);
    counters$.complete();
    winner$.error(new HttpErrorResponse({ status: 404, error: { message: 'game_winner_not_found' } }));

    expect(facade.status()).toBe('loaded');
    expect(facade.snapshot()?.context.id).toBe('game-1');
    expect(facade.snapshot()?.winner).toBeNull();
  });

  it('maps 403 load failures to forbidden', () => {
    const { facade } = setup({
      contextRequest: () =>
        throwError(
          () => new HttpErrorResponse({ status: 403, error: { message: 'forbidden' } }),
        ),
      drawsRequest: () => throwError(() => new Error('unused')),
      countersRequest: () => throwError(() => new Error('unused')),
      winnerRequest: () => throwError(() => new Error('unused')),
    });

    facade.load('game-1', 'contextual');
    expect(facade.status()).toBe('forbidden');
  });

  it('ignores late load responses after a fast game change', () => {
    const firstContext$ = new Subject<AdminGameDetailView>();
    const secondContext$ = new Subject<AdminGameDetailView>();
    const firstDraws$ = new Subject<unknown[]>();
    const secondDraws$ = new Subject<unknown[]>();
    const firstCounters$ = new Subject<unknown[]>();
    const secondCounters$ = new Subject<unknown[]>();
    const firstWinner$ = new Subject<unknown>();
    const secondWinner$ = new Subject<unknown>();

    const adminRepository = {
      getGame: vi.fn().mockReturnValueOnce(firstContext$).mockReturnValueOnce(secondContext$),
    };
    const engineRepository = {
      listDraws: vi.fn().mockReturnValueOnce(firstDraws$).mockReturnValueOnce(secondDraws$),
      listCounters: vi.fn().mockReturnValueOnce(firstCounters$).mockReturnValueOnce(secondCounters$),
      getWinner: vi.fn().mockReturnValueOnce(firstWinner$).mockReturnValueOnce(secondWinner$),
      startGame: vi.fn(() => new Subject<unknown>()),
    };

    TestBed.configureTestingModule({
      providers: [
        GameEngineFacade,
        { provide: ADMIN_GAMES_REPOSITORY, useValue: adminRepository },
        { provide: GAME_ENGINE_REPOSITORY, useValue: engineRepository },
        { provide: AuthSessionService, useValue: { user: signal({ id: 7 }) } },
      ],
    });

    const facade = TestBed.inject(GameEngineFacade);
    facade.load('game-1', 'contextual');
    facade.load('game-2', 'contextual');

    secondContext$.next(createContext('game-2'));
    secondContext$.complete();
    secondDraws$.next([]);
    secondDraws$.complete();
    secondCounters$.next([]);
    secondCounters$.complete();
    secondWinner$.error(new HttpErrorResponse({ status: 404, error: { message: 'game_winner_not_found' } }));

    firstContext$.next(createContext('game-1'));
    firstDraws$.next([]);
    firstCounters$.next([]);
    firstWinner$.next(null);

    expect(facade.snapshot()?.context.id).toBe('game-2');
  });

  it('ignores late load responses after logout', () => {
    const context$ = new Subject<AdminGameDetailView>();
    const draws$ = new Subject<unknown[]>();
    const counters$ = new Subject<unknown[]>();
    const winner$ = new Subject<unknown>();
    const user = signal<{ id: number } | null>({ id: 7 });

    const { facade } = setup({
      contextRequest: () => context$,
      drawsRequest: () => draws$,
      countersRequest: () => counters$,
      winnerRequest: () => winner$,
      user,
    });

    facade.load('game-logout', 'contextual');
    user.set(null);

    context$.next(createContext('game-logout'));
    context$.complete();
    draws$.next([]);
    draws$.complete();
    counters$.next([]);
    counters$.complete();
    winner$.error(new HttpErrorResponse({ status: 404, error: { message: 'game_winner_not_found' } }));

    expect(facade.snapshot()).toBeNull();
    expect(facade.status()).toBe('loading');
  });

  it('submits start successfully and refreshes the console', () => {
    const firstContext$ = new Subject<AdminGameDetailView>();
    const secondContext$ = new Subject<AdminGameDetailView>();
    const firstDraws$ = new Subject<unknown[]>();
    const secondDraws$ = new Subject<unknown[]>();
    const firstCounters$ = new Subject<unknown[]>();
    const secondCounters$ = new Subject<unknown[]>();
    const firstWinner$ = new Subject<unknown>();
    const secondWinner$ = new Subject<unknown>();
    const start$ = new Subject<unknown>();

    const adminRepository = {
      getGame: vi.fn().mockReturnValueOnce(firstContext$).mockReturnValueOnce(secondContext$),
    };
    const engineRepository = {
      listDraws: vi.fn().mockReturnValueOnce(firstDraws$).mockReturnValueOnce(secondDraws$),
      listCounters: vi.fn().mockReturnValueOnce(firstCounters$).mockReturnValueOnce(secondCounters$),
      getWinner: vi.fn().mockReturnValueOnce(firstWinner$).mockReturnValueOnce(secondWinner$),
      startGame: vi.fn(() => start$),
    };

    TestBed.configureTestingModule({
      providers: [
        GameEngineFacade,
        { provide: ADMIN_GAMES_REPOSITORY, useValue: adminRepository },
        { provide: GAME_ENGINE_REPOSITORY, useValue: engineRepository },
        { provide: AuthSessionService, useValue: { user: signal({ id: 7 }) } },
      ],
    });

    const facade = TestBed.inject(GameEngineFacade);
    facade.load('game-1', 'contextual');
    firstContext$.next(createContext('game-1'));
    firstContext$.complete();
    firstDraws$.next([]);
    firstDraws$.complete();
    firstCounters$.next([]);
    firstCounters$.complete();
    firstWinner$.error(new HttpErrorResponse({ status: 404, error: { message: 'game_winner_not_found' } }));

    facade.startGame();
    start$.next({
      gameId: 'game-1',
      status: 'running',
      outcome: 'started',
      scheduledStartAt: '2026-06-27T12:00:00Z',
      startedAt: '2026-06-27T12:05:00Z',
      confirmedEntriesCount: 3,
    });

    secondContext$.next(
      createContext('game-1', {
        status: { value: 'running', label: 'En ejecución', tone: 'info', isKnown: true },
        lifecycle: { startedAt: '2026-06-27T12:05:00Z', pausedAt: null, completedAt: null },
      }),
    );
    secondContext$.complete();
    secondDraws$.next([]);
    secondDraws$.complete();
    secondCounters$.next([]);
    secondCounters$.complete();
    secondWinner$.error(new HttpErrorResponse({ status: 404, error: { message: 'game_winner_not_found' } }));

    expect(facade.startStatus()).toBe('success');
    expect(facade.startResult()?.outcome).toBe('started');
    expect(facade.status()).toBe('loaded');
    expect(facade.snapshot()?.context.status.value).toBe('running');
    expect(adminRepository.getGame).toHaveBeenCalledTimes(2);
  });

  it('treats already_started as a successful replay and refreshes the console', () => {
    const firstContext$ = new Subject<AdminGameDetailView>();
    const secondContext$ = new Subject<AdminGameDetailView>();
    const firstDraws$ = new Subject<unknown[]>();
    const secondDraws$ = new Subject<unknown[]>();
    const firstCounters$ = new Subject<unknown[]>();
    const secondCounters$ = new Subject<unknown[]>();
    const firstWinner$ = new Subject<unknown>();
    const secondWinner$ = new Subject<unknown>();
    const start$ = new Subject<unknown>();

    const adminRepository = {
      getGame: vi.fn().mockReturnValueOnce(firstContext$).mockReturnValueOnce(secondContext$),
    };
    const engineRepository = {
      listDraws: vi.fn().mockReturnValueOnce(firstDraws$).mockReturnValueOnce(secondDraws$),
      listCounters: vi.fn().mockReturnValueOnce(firstCounters$).mockReturnValueOnce(secondCounters$),
      getWinner: vi.fn().mockReturnValueOnce(firstWinner$).mockReturnValueOnce(secondWinner$),
      startGame: vi.fn(() => start$),
    };

    TestBed.configureTestingModule({
      providers: [
        GameEngineFacade,
        { provide: ADMIN_GAMES_REPOSITORY, useValue: adminRepository },
        { provide: GAME_ENGINE_REPOSITORY, useValue: engineRepository },
        { provide: AuthSessionService, useValue: { user: signal({ id: 7 }) } },
      ],
    });

    const facade = TestBed.inject(GameEngineFacade);
    facade.load(
      'game-1',
      'contextual',
    );
    firstContext$.next(createContext('game-1'));
    firstContext$.complete();
    firstDraws$.next([]);
    firstDraws$.complete();
    firstCounters$.next([]);
    firstCounters$.complete();
    firstWinner$.error(new HttpErrorResponse({ status: 404, error: { message: 'game_winner_not_found' } }));

    facade.startGame();
    start$.next({
      gameId: 'game-1',
      status: 'running',
      outcome: 'already_started',
      scheduledStartAt: '2026-06-27T12:00:00Z',
      startedAt: '2026-06-27T12:05:00Z',
      confirmedEntriesCount: 3,
    });

    secondContext$.next(
      createContext('game-1', {
        status: { value: 'running', label: 'En ejecución', tone: 'info', isKnown: true },
        lifecycle: { startedAt: '2026-06-27T12:05:00Z', pausedAt: null, completedAt: null },
      }),
    );
    secondContext$.complete();
    secondDraws$.next([]);
    secondDraws$.complete();
    secondCounters$.next([]);
    secondCounters$.complete();
    secondWinner$.error(new HttpErrorResponse({ status: 404, error: { message: 'game_winner_not_found' } }));

    expect(facade.startStatus()).toBe('success');
    expect(facade.startResult()?.outcome).toBe('already_started');
    expect(facade.snapshot()?.context.status.value).toBe('running');
  });

  it('blocks double submit while start is in flight', () => {
    const context$ = new Subject<AdminGameDetailView>();
    const draws$ = new Subject<unknown[]>();
    const counters$ = new Subject<unknown[]>();
    const winner$ = new Subject<unknown>();
    const start$ = new Subject<unknown>();
    const engineRepository = {
      listDraws: vi.fn(() => draws$),
      listCounters: vi.fn(() => counters$),
      getWinner: vi.fn(() => winner$),
      startGame: vi.fn(() => start$),
    };

    TestBed.configureTestingModule({
      providers: [
        GameEngineFacade,
        { provide: ADMIN_GAMES_REPOSITORY, useValue: { getGame: vi.fn(() => context$) } },
        { provide: GAME_ENGINE_REPOSITORY, useValue: engineRepository },
        { provide: AuthSessionService, useValue: { user: signal({ id: 7 }) } },
      ],
    });

    const facade = TestBed.inject(GameEngineFacade);
    facade.load('game-1', 'contextual');
    context$.next(createContext('game-1'));
    context$.complete();
    draws$.next([]);
    draws$.complete();
    counters$.next([]);
    counters$.complete();
    winner$.error(new HttpErrorResponse({ status: 404, error: { message: 'game_winner_not_found' } }));

    facade.startGame();
    facade.startGame();

    expect(engineRepository.startGame).toHaveBeenCalledTimes(1);
    expect(facade.startStatus()).toBe('submitting');
  });

  it('maps start 401 to unauthorized', () => {
    const { facade } = setup({
      contextRequest: () => settledStream(createContext('game-1')),
      drawsRequest: () => settledStream([]),
      countersRequest: () => settledStream([]),
      winnerRequest: settledWinnerRequest,
      startRequest: () =>
        throwError(
          () => new HttpErrorResponse({ status: 401, error: { message: 'Unauthenticated.' } }),
        ),
    });

    facade.load('game-1', 'contextual');
    facade.startGame();

    expect(facade.startStatus()).toBe('unauthorized');
  });

  it('maps start 403 to forbidden', () => {
    const { facade } = setup({
      contextRequest: () => settledStream(createContext('game-1')),
      drawsRequest: () => settledStream([]),
      countersRequest: () => settledStream([]),
      winnerRequest: settledWinnerRequest,
      startRequest: () =>
        throwError(() => new HttpErrorResponse({ status: 403, error: { message: 'Forbidden' } })),
    });

    facade.load('game-1', 'contextual');
    facade.startGame();

    expect(facade.startStatus()).toBe('forbidden');
  });

  it('maps start 404 to notFound', () => {
    const { facade } = setup({
      contextRequest: () => settledStream(createContext('game-1')),
      drawsRequest: () => settledStream([]),
      countersRequest: () => settledStream([]),
      winnerRequest: settledWinnerRequest,
      startRequest: () =>
        throwError(() => new HttpErrorResponse({ status: 404, error: { message: 'Game not found' } })),
    });

    facade.load('game-1', 'contextual');
    facade.startGame();

    expect(facade.startStatus()).toBe('notFound');
  });

  it('maps start 422 to invalidState', () => {
    const { facade } = setup({
      contextRequest: () => settledStream(createContext('game-1')),
      drawsRequest: () => settledStream([]),
      countersRequest: () => settledStream([]),
      winnerRequest: settledWinnerRequest,
      startRequest: () =>
        throwError(
          () =>
            new HttpErrorResponse({
              status: 422,
              error: { error: 'game_not_ready_for_start', message: 'game_not_ready_for_start' },
            }),
        ),
    });

    facade.load('game-1', 'contextual');
    facade.startGame();

    expect(facade.startStatus()).toBe('invalidState');
  });

  it('maps start network failures to networkError', () => {
    const { facade } = setup({
      contextRequest: () => settledStream(createContext('game-1')),
      drawsRequest: () => settledStream([]),
      countersRequest: () => settledStream([]),
      winnerRequest: settledWinnerRequest,
      startRequest: () =>
        throwError(() => new HttpErrorResponse({ status: 0, error: new ProgressEvent('error') })),
    });

    facade.load('game-1', 'contextual');
    facade.startGame();

    expect(facade.startStatus()).toBe('networkError');
  });

  it('ignores late start responses after a fast game change', () => {
    const firstContext$ = new Subject<AdminGameDetailView>();
    const secondContext$ = new Subject<AdminGameDetailView>();
    const drawsA$ = new Subject<unknown[]>();
    const drawsB$ = new Subject<unknown[]>();
    const countersA$ = new Subject<unknown[]>();
    const countersB$ = new Subject<unknown[]>();
    const winnerA$ = new Subject<unknown>();
    const winnerB$ = new Subject<unknown>();
    const start$ = new Subject<unknown>();

    const adminRepository = {
      getGame: vi.fn().mockReturnValueOnce(firstContext$).mockReturnValueOnce(secondContext$),
    };
    const engineRepository = {
      listDraws: vi.fn().mockReturnValueOnce(drawsA$).mockReturnValueOnce(drawsB$),
      listCounters: vi.fn().mockReturnValueOnce(countersA$).mockReturnValueOnce(countersB$),
      getWinner: vi.fn().mockReturnValueOnce(winnerA$).mockReturnValueOnce(winnerB$),
      startGame: vi.fn(() => start$),
    };

    TestBed.configureTestingModule({
      providers: [
        GameEngineFacade,
        { provide: ADMIN_GAMES_REPOSITORY, useValue: adminRepository },
        { provide: GAME_ENGINE_REPOSITORY, useValue: engineRepository },
        { provide: AuthSessionService, useValue: { user: signal({ id: 7 }) } },
      ],
    });

    const facade = TestBed.inject(GameEngineFacade);
    facade.load('game-1', 'contextual');
    firstContext$.next(createContext('game-1'));
    firstContext$.complete();
    drawsA$.next([]);
    drawsA$.complete();
    countersA$.next([]);
    countersA$.complete();
    winnerA$.error(new HttpErrorResponse({ status: 404, error: { message: 'game_winner_not_found' } }));

    facade.startGame();
    facade.load('game-2', 'contextual');
    secondContext$.next(createContext('game-2'));
    secondContext$.complete();
    drawsB$.next([]);
    drawsB$.complete();
    countersB$.next([]);
    countersB$.complete();
    winnerB$.error(new HttpErrorResponse({ status: 404, error: { message: 'game_winner_not_found' } }));

    start$.next({
      gameId: 'game-1',
      status: 'running',
      outcome: 'started',
      scheduledStartAt: '2026-06-27T12:00:00Z',
      startedAt: '2026-06-27T12:05:00Z',
      confirmedEntriesCount: 3,
    });

    expect(facade.snapshot()?.context.id).toBe('game-2');
    expect(facade.startResult()).toBeNull();
  });

  it('ignores late start responses after logout', () => {
    const context$ = new Subject<AdminGameDetailView>();
    const draws$ = new Subject<unknown[]>();
    const counters$ = new Subject<unknown[]>();
    const winner$ = new Subject<unknown>();
    const start$ = new Subject<unknown>();
    const user = signal<{ id: number } | null>({ id: 7 });

    const { facade } = setup({
      contextRequest: () => context$,
      drawsRequest: () => draws$,
      countersRequest: () => counters$,
      winnerRequest: () => winner$,
      startRequest: () => start$,
      user,
    });

    facade.load('game-1', 'contextual');
    context$.next(createContext('game-1'));
    context$.complete();
    draws$.next([]);
    draws$.complete();
    counters$.next([]);
    counters$.complete();
    winner$.error(new HttpErrorResponse({ status: 404, error: { message: 'game_winner_not_found' } }));

    facade.startGame();
    user.set(null);
    start$.next({
      gameId: 'game-1',
      status: 'running',
      outcome: 'started',
      scheduledStartAt: '2026-06-27T12:00:00Z',
      startedAt: '2026-06-27T12:05:00Z',
      confirmedEntriesCount: 3,
    });

    expect(facade.startResult()).toBeNull();
    expect(facade.startStatus()).toBe('submitting');
  });

  it('keeps the start success but surfaces a failed refresh independently', () => {
    const initialContext$ = new Subject<AdminGameDetailView>();
    const draws$ = new Subject<unknown[]>();
    const counters$ = new Subject<unknown[]>();
    const winner$ = new Subject<unknown>();
    const start$ = new Subject<unknown>();

    const adminRepository = {
      getGame: vi
        .fn()
        .mockReturnValueOnce(initialContext$)
        .mockReturnValueOnce(
          throwError(() => new HttpErrorResponse({ status: 0, error: new ProgressEvent('error') })),
        ),
    };
    const engineRepository = {
      listDraws: vi.fn(() => draws$),
      listCounters: vi.fn(() => counters$),
      getWinner: vi.fn(() => winner$),
      startGame: vi.fn(() => start$),
    };

    TestBed.configureTestingModule({
      providers: [
        GameEngineFacade,
        { provide: ADMIN_GAMES_REPOSITORY, useValue: adminRepository },
        { provide: GAME_ENGINE_REPOSITORY, useValue: engineRepository },
        { provide: AuthSessionService, useValue: { user: signal({ id: 7 }) } },
      ],
    });

    const facade = TestBed.inject(GameEngineFacade);
    facade.load('game-1', 'contextual');
    initialContext$.next(createContext('game-1'));
    initialContext$.complete();
    draws$.next([]);
    draws$.complete();
    counters$.next([]);
    counters$.complete();
    winner$.error(new HttpErrorResponse({ status: 404, error: { message: 'game_winner_not_found' } }));

    facade.startGame();
    start$.next({
      gameId: 'game-1',
      status: 'running',
      outcome: 'started',
      scheduledStartAt: '2026-06-27T12:00:00Z',
      startedAt: '2026-06-27T12:05:00Z',
      confirmedEntriesCount: 3,
    });

    expect(facade.startStatus()).toBe('success');
    expect(facade.status()).toBe('networkError');
  });
});
