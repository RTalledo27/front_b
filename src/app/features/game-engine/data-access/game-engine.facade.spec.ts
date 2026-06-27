import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subject, throwError } from 'rxjs';
import { AuthSessionService } from '../../../core/auth/services/auth-session.service';
import { ADMIN_GAMES_REPOSITORY } from '../../admin-games/data-access/admin-games.repository';
import { AdminGameDetailView } from '../../admin-games/models/admin-games.models';
import { GameEngineFacade } from './game-engine.facade';
import { GAME_ENGINE_REPOSITORY } from './game-engine.repository';

function createContext(id: string): AdminGameDetailView {
  return {
    id,
    slug: `${id}-slug`,
    name: `Juego ${id}`,
    description: null,
    status: { value: 'running', label: 'En ejecución', tone: 'info', isKnown: true },
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
    lifecycle: { startedAt: '2026-06-27T12:01:00Z', pausedAt: null, completedAt: null },
    engine: { nextDrawAt: '2026-06-27T12:02:00Z', lastConsumedTickAt: '2026-06-27T12:01:30Z' },
    numbers: { total: 90, sold: 10, reserved: 5, available: 75 },
    settings: null,
    latestDraw: { sequence: 1, number: 8, drawnAt: '2026-06-27T12:01:30Z' },
    winner: null,
    commerce: {
      reservations: { total: 1 },
      orders: { pending: 1, paymentSubmitted: 0, paid: 0, rejected: 0, expired: 0, cancelled: 0, refunded: 0 },
      payments: { pending: 0, underReview: 0, approved: 0, rejected: 0, cancelled: 0, refunded: 0 },
      entries: { confirmed: 1, cancelled: 0, refunded: 0, winner: 0 },
    },
    projection: { drawsTotal: 1, distinctDrawnNumbers: 1, maxCounterHits: 1, lastDrawnNumber: 8 },
    createdBy: 1,
    createdAt: '2026-06-27T11:00:00Z',
  };
}

describe('GameEngineFacade', () => {
  function setup(overrides?: {
    contextRequest?: () => unknown;
    drawsRequest?: () => unknown;
    countersRequest?: () => unknown;
    winnerRequest?: () => unknown;
    user?: ReturnType<typeof signal<{ id: number } | null>>;
  }) {
    const user = overrides?.user ?? signal<{ id: number } | null>({ id: 7 });
    const adminRepository = {
      getGame: vi.fn(overrides?.contextRequest ?? (() => new Subject<AdminGameDetailView>())),
    };
    const engineRepository = {
      listDraws: vi.fn(overrides?.drawsRequest ?? (() => new Subject())),
      listCounters: vi.fn(overrides?.countersRequest ?? (() => new Subject())),
      getWinner: vi.fn(overrides?.winnerRequest ?? (() => new Subject())),
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
    draws$.next([
      {
        id: 'draw-1',
        gameId: 'game-1',
        gameNumberId: 'number-1',
        sequence: 1,
        drawnNumber: 8,
        strategy: 'manual',
        drawnAt: '2026-06-27T12:01:30Z',
      },
    ]);
    draws$.complete();
    counters$.next([
      {
        gameNumberId: 'number-1',
        number: 8,
        status: { value: 'sold', label: 'Vendido', tone: 'info', isKnown: true },
        hitsCount: 1,
        lastDrawSequence: 1,
      },
    ]);
    counters$.complete();
    winner$.error(new HttpErrorResponse({ status: 404, error: { message: 'game_winner_not_found' } }));

    expect(facade.status()).toBe('loaded');
    expect(facade.snapshot()?.context.id).toBe('game-1');
    expect(facade.snapshot()?.winner).toBeNull();
  });

  it('maps 403 to forbidden', () => {
    const { facade } = setup({
      contextRequest: () =>
        throwError(
          () =>
            new HttpErrorResponse({
              status: 403,
              error: { message: 'forbidden' },
            }),
        ),
      drawsRequest: () => throwError(() => new Error('unused')),
      countersRequest: () => throwError(() => new Error('unused')),
      winnerRequest: () => throwError(() => new Error('unused')),
    });

    facade.load('game-1', 'contextual');
    expect(facade.status()).toBe('forbidden');
  });

  it('ignores late responses after a fast game change', () => {
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

  it('ignores late responses after logout', () => {
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
});
