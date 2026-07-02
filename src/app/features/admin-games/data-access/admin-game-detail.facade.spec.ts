import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, throwError } from 'rxjs';
import { AuthSessionService } from '../../../core/auth/services/auth-session.service';
import { AdminGameCommandResultView, AdminGameDetailView } from '../models/admin-games.models';
import { ADMIN_GAMES_REPOSITORY } from './admin-games.repository';
import { AdminGameDetailFacade } from './admin-game-detail.facade';

function createDetail(id: string): AdminGameDetailView {
  return {
    id,
    slug: `${id}-slug`,
    name: `Game ${id}`,
    description: null,
    status: { value: 'draft', label: 'Borrador', tone: 'neutral', isKnown: true },
    numberRange: { min: 1, max: 10, hitsRequired: 3 },
    ticketPrice: { amountCents: 500, currency: 'PEN' },
    prize: { amountCents: 10000, currency: 'PEN' },
    schedule: {
      salesOpensAt: null,
      salesClosesAt: null,
      scheduledStartAt: null,
      drawIntervalSeconds: 30,
      autoDrawEnabled: false,
    },
    lifecycle: { startedAt: null, pausedAt: null, completedAt: null },
    engine: { nextDrawAt: null, lastConsumedTickAt: null },
    numbers: { total: 10, sold: 0, reserved: 0, available: 10 },
    settings: null,
    latestDraw: null,
    winner: null,
    commerce: {
      reservations: { total: 0 },
      orders: { pending: 0, paymentSubmitted: 0, paid: 0, rejected: 0, expired: 0, cancelled: 0, refunded: 0 },
      payments: { pending: 0, underReview: 0, approved: 0, rejected: 0, cancelled: 0, refunded: 0 },
      entries: { confirmed: 0, cancelled: 0, refunded: 0, winner: 0 },
    },
    projection: { drawsTotal: 0, distinctDrawnNumbers: 0, maxCounterHits: 0, lastDrawnNumber: null },
    createdBy: null,
    createdAt: '2026-06-25T09:00:00Z',
  };
}

function createCommandResult(status: string): AdminGameCommandResultView {
  return {
    id: 'game-1',
    slug: 'game-1-slug',
    name: 'Game game-1',
    description: null,
    status: { value: status, label: status, tone: 'neutral', isKnown: true },
    numberRange: { min: 1, max: 10, hitsRequired: 3 },
    ticketPrice: { amountCents: 500, currency: 'PEN' },
    prize: { amountCents: 10000, currency: 'PEN' },
    schedule: {
      salesOpensAt: null,
      salesClosesAt: null,
      scheduledStartAt: null,
      drawIntervalSeconds: 30,
      autoDrawEnabled: false,
    },
    settings: null,
    createdBy: null,
    createdAt: '2026-06-25T09:00:00Z',
    updatedAt: '2026-06-25T09:00:00Z',
    outcome: null,
  };
}

describe('AdminGameDetailFacade', () => {
  it('loads the administrative detail successfully', () => {
    const result$ = new Subject<AdminGameDetailView>();
    const repository = {
      getGame: vi.fn(() => result$),
    };

    TestBed.configureTestingModule({
      providers: [
        AdminGameDetailFacade,
        { provide: ADMIN_GAMES_REPOSITORY, useValue: repository },
        { provide: AuthSessionService, useValue: { user: signal({ id: 7 }) } },
      ],
    });

    const facade = TestBed.inject(AdminGameDetailFacade);
    facade.load('game-1');
    result$.next(createDetail('game-1'));

    expect(facade.status()).toBe('loaded');
    expect(facade.game()?.id).toBe('game-1');
  });

  it('maps 404 to notFound', () => {
    const repository = {
      getGame: vi.fn(() =>
        throwError(
          () =>
            new HttpErrorResponse({
              status: 404,
              error: { message: 'game_not_found' },
            }),
        ),
      ),
    };

    TestBed.configureTestingModule({
      providers: [
        AdminGameDetailFacade,
        { provide: ADMIN_GAMES_REPOSITORY, useValue: repository },
        { provide: AuthSessionService, useValue: { user: signal({ id: 7 }) } },
      ],
    });

    const facade = TestBed.inject(AdminGameDetailFacade);
    facade.load('missing-game');

    expect(facade.status()).toBe('notFound');
  });

  it('ignores late responses after a fast gameId change', () => {
    const first$ = new Subject<AdminGameDetailView>();
    const second$ = new Subject<AdminGameDetailView>();
    const repository = {
      getGame: vi.fn()
        .mockReturnValueOnce(first$)
        .mockReturnValueOnce(second$),
    };

    TestBed.configureTestingModule({
      providers: [
        AdminGameDetailFacade,
        { provide: ADMIN_GAMES_REPOSITORY, useValue: repository },
        { provide: AuthSessionService, useValue: { user: signal({ id: 7 }) } },
      ],
    });

    const facade = TestBed.inject(AdminGameDetailFacade);
    facade.load('game-1');
    facade.load('game-2');
    second$.next(createDetail('game-2'));
    first$.next(createDetail('game-1'));

    expect(facade.game()?.id).toBe('game-2');
  });

  it('ignores late responses after logout', () => {
    const result$ = new Subject<AdminGameDetailView>();
    const user = signal<{ id: number } | null>({ id: 7 });
    const repository = {
      getGame: vi.fn(() => result$),
    };

    TestBed.configureTestingModule({
      providers: [
        AdminGameDetailFacade,
        { provide: ADMIN_GAMES_REPOSITORY, useValue: repository },
        { provide: AuthSessionService, useValue: { user } },
      ],
    });

    const facade = TestBed.inject(AdminGameDetailFacade);
    facade.load('game-logout');
    user.set(null);
    result$.next(createDetail('game-logout'));

    expect(facade.game()).toBeNull();
    expect(facade.status()).toBe('loading');
  });

  it('publishes and refreshes the current game snapshot', () => {
    const detail$ = new Subject<AdminGameDetailView>();
    const publish$ = new Subject<AdminGameCommandResultView>();
    const refresh$ = new Subject<AdminGameDetailView>();
    const repository = {
      getGame: vi.fn()
        .mockReturnValueOnce(detail$)
        .mockReturnValueOnce(refresh$),
      publishGame: vi.fn(() => publish$),
      openGameSales: vi.fn(),
      closeGameSales: vi.fn(),
      scheduleGame: vi.fn(),
      cancelGame: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        AdminGameDetailFacade,
        { provide: ADMIN_GAMES_REPOSITORY, useValue: repository },
        { provide: AuthSessionService, useValue: { user: signal({ id: 7 }) } },
      ],
    });

    const facade = TestBed.inject(AdminGameDetailFacade);
    facade.load('game-1');
    detail$.next(createDetail('game-1'));

    facade.publish();
    publish$.next(createCommandResult('published'));
    refresh$.next({ ...createDetail('game-1'), status: { value: 'published', label: 'Publicado', tone: 'warning', isKnown: true } });

    expect(facade.publishState().status).toBe('success');
    expect(facade.publishState().refreshState).toBe('confirmed');
    expect(facade.game()?.status.value).toBe('published');
  });

  it('ignores double submit for the same lifecycle action', () => {
    const detail$ = new Subject<AdminGameDetailView>();
    const publish$ = new Subject<AdminGameCommandResultView>();
    const repository = {
      getGame: vi.fn(() => detail$),
      publishGame: vi.fn(() => publish$),
      openGameSales: vi.fn(),
      closeGameSales: vi.fn(),
      scheduleGame: vi.fn(),
      cancelGame: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        AdminGameDetailFacade,
        { provide: ADMIN_GAMES_REPOSITORY, useValue: repository },
        { provide: AuthSessionService, useValue: { user: signal({ id: 7 }) } },
      ],
    });

    const facade = TestBed.inject(AdminGameDetailFacade);
    facade.load('game-1');
    detail$.next(createDetail('game-1'));

    facade.publish();
    facade.publish();

    expect(repository.publishGame).toHaveBeenCalledTimes(1);
  });

  it('preserves command success when the post-action refresh fails', () => {
    const detail$ = new Subject<AdminGameDetailView>();
    const command$ = new Subject<AdminGameCommandResultView>();
    const refresh$ = new Subject<AdminGameDetailView>();
    const repository = {
      getGame: vi.fn()
        .mockReturnValueOnce(detail$)
        .mockReturnValueOnce(refresh$),
      publishGame: vi.fn(),
      openGameSales: vi.fn(() => command$),
      closeGameSales: vi.fn(),
      scheduleGame: vi.fn(),
      cancelGame: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        AdminGameDetailFacade,
        { provide: ADMIN_GAMES_REPOSITORY, useValue: repository },
        { provide: AuthSessionService, useValue: { user: signal({ id: 7 }) } },
      ],
    });

    const facade = TestBed.inject(AdminGameDetailFacade);
    facade.load('game-1');
    detail$.next({ ...createDetail('game-1'), status: { value: 'published', label: 'Publicado', tone: 'warning', isKnown: true } });

    facade.openSales();
    command$.next(createCommandResult('sales_open'));
    refresh$.error(new HttpErrorResponse({ status: 0 }));

    expect(facade.openSalesState().status).toBe('success');
    expect(facade.openSalesState().refreshState).toBe('failed');
  });

  it('maps invalid state errors for schedule and ignores late command responses after game change', () => {
    const firstDetail$ = new Subject<AdminGameDetailView>();
    const secondDetail$ = new Subject<AdminGameDetailView>();
    const schedule$ = new Subject<AdminGameCommandResultView>();
    const repository: {
      [key: string]: ReturnType<typeof vi.fn>;
    } = {
      getGame: vi.fn()
        .mockReturnValueOnce(firstDetail$)
        .mockReturnValueOnce(secondDetail$),
      publishGame: vi.fn(),
      openGameSales: vi.fn(),
      closeGameSales: vi.fn(),
      scheduleGame: vi.fn(() => schedule$),
      cancelGame: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        AdminGameDetailFacade,
        { provide: ADMIN_GAMES_REPOSITORY, useValue: repository },
        { provide: AuthSessionService, useValue: { user: signal({ id: 7 }) } },
      ],
    });

    const facade = TestBed.inject(AdminGameDetailFacade);
    facade.load('game-1');
    firstDetail$.next({ ...createDetail('game-1'), status: { value: 'published', label: 'Publicado', tone: 'warning', isKnown: true } });
    facade.schedule({ scheduledStartAt: '2026-07-02T12:00:00.000Z' });
    facade.load('game-2');
    secondDetail$.next(createDetail('game-2'));
    schedule$.next(createCommandResult('sales_closed'));

    expect(facade.game()?.id).toBe('game-2');

    repository['scheduleGame'] = vi.fn(() =>
      throwError(
        () =>
          new HttpErrorResponse({
            status: 422,
            error: {
              message: 'Transition not allowed.',
              error: 'invalid_game_transition',
            },
          }),
      ),
    );
    facade.schedule({ scheduledStartAt: '2026-07-03T12:00:00.000Z' });
    expect(facade.scheduleState().status).toBe('invalidState');
  });
});
