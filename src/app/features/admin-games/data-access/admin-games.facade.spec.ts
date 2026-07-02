import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, throwError } from 'rxjs';
import { AuthSessionService } from '../../../core/auth/services/auth-session.service';
import { AdminGameCommandResultView, AdminGameListResult } from '../models/admin-games.models';
import { ADMIN_GAMES_REPOSITORY } from './admin-games.repository';
import { AdminGamesFacade, initialAdminGameListQuery } from './admin-games.facade';

function createListResult(name: string): AdminGameListResult {
  return {
    games: [
      {
        id: `${name}-id`,
        slug: `${name}-slug`,
        name,
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
        numbers: { total: 10, sold: 0, reserved: 0, available: 10 },
        ops: { drawsTotal: 0, ordersPending: 0, paymentsUnderReview: 0, entriesConfirmed: 0 },
        createdBy: null,
        createdAt: '2026-06-25T09:00:00Z',
      },
    ],
    pageInfo: {
      currentPage: 1,
      from: 1,
      lastPage: 1,
      path: '/api/v1/admin/games',
      perPage: 20,
      to: 1,
      total: 1,
    },
    links: { first: null, last: null, prev: null, next: null },
  };
}

function createCommandResult(status = 'draft'): AdminGameCommandResultView {
  return {
    id: 'game-new',
    slug: 'game-new',
    name: 'Nuevo Bingo',
    description: null,
    status: { value: status, label: 'Borrador', tone: 'neutral', isKnown: true },
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
    createdBy: 7,
    createdAt: '2026-06-25T09:00:00Z',
    updatedAt: '2026-06-25T09:00:00Z',
    outcome: 'created',
  };
}

describe('AdminGamesFacade', () => {
  it('loads data into the read-only administrative list', () => {
    const repository = {
      listGames: vi.fn(() => new Subject<AdminGameListResult>()),
    };
    const result$ = new Subject<AdminGameListResult>();
    repository.listGames.mockReturnValue(result$);

    TestBed.configureTestingModule({
      providers: [
        AdminGamesFacade,
        { provide: ADMIN_GAMES_REPOSITORY, useValue: repository },
        { provide: AuthSessionService, useValue: { user: signal({ id: 7 }) } },
      ],
    });

    const facade = TestBed.inject(AdminGamesFacade);
    facade.load(initialAdminGameListQuery());
    result$.next(createListResult('Fortuna'));

    expect(facade.status()).toBe('loaded');
    expect(facade.games()[0]?.name).toBe('Fortuna');
  });

  it('uses refreshing when a new query arrives after prior results', () => {
    const first$ = new Subject<AdminGameListResult>();
    const second$ = new Subject<AdminGameListResult>();
    const repository = {
      listGames: vi.fn()
        .mockReturnValueOnce(first$)
        .mockReturnValueOnce(second$),
    };

    TestBed.configureTestingModule({
      providers: [
        AdminGamesFacade,
        { provide: ADMIN_GAMES_REPOSITORY, useValue: repository },
        { provide: AuthSessionService, useValue: { user: signal({ id: 7 }) } },
      ],
    });

    const facade = TestBed.inject(AdminGamesFacade);
    facade.load(initialAdminGameListQuery());
    first$.next(createListResult('Primero'));
    facade.load({ ...initialAdminGameListQuery(), search: 'nuevo' });

    expect(facade.status()).toBe('refreshing');
    second$.next(createListResult('Segundo'));
    expect(facade.games()[0]?.name).toBe('Segundo');
  });

  it('ignores late responses from a stale query', () => {
    const first$ = new Subject<AdminGameListResult>();
    const second$ = new Subject<AdminGameListResult>();
    const repository = {
      listGames: vi.fn()
        .mockReturnValueOnce(first$)
        .mockReturnValueOnce(second$),
    };

    TestBed.configureTestingModule({
      providers: [
        AdminGamesFacade,
        { provide: ADMIN_GAMES_REPOSITORY, useValue: repository },
        { provide: AuthSessionService, useValue: { user: signal({ id: 7 }) } },
      ],
    });

    const facade = TestBed.inject(AdminGamesFacade);
    facade.load({ ...initialAdminGameListQuery(), search: 'uno' });
    facade.load({ ...initialAdminGameListQuery(), search: 'dos' });

    second$.next(createListResult('Dos'));
    first$.next(createListResult('Uno'));

    expect(facade.games()[0]?.name).toBe('Dos');
  });

  it('resets to page 1 and exposes validation errors from invalid filters', () => {
    const repository = {
      listGames: vi.fn(() =>
        throwError(() => ({
          status: 422,
        })),
      ),
    };

    TestBed.configureTestingModule({
      providers: [
        AdminGamesFacade,
        { provide: ADMIN_GAMES_REPOSITORY, useValue: repository },
        { provide: AuthSessionService, useValue: { user: signal({ id: 7 }) } },
      ],
    });

    const facade = TestBed.inject(AdminGamesFacade);
    repository.listGames.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 422,
            error: {
              message: 'The selected status is invalid.',
              errors: { status: ['The selected status is invalid.'] },
            },
          }),
      ),
    );
    facade.load({ ...initialAdminGameListQuery(), page: 1, status: 'wrong' });

    expect(facade.status()).toBe('validationError');
    expect(facade.error()?.fieldErrors['status']?.[0]).toContain('invalid');
  });

  it('ignores late success responses after logout', () => {
    const result$ = new Subject<AdminGameListResult>();
    const user = signal<{ id: number } | null>({ id: 7 });
    const repository = {
      listGames: vi.fn(() => result$),
    };

    TestBed.configureTestingModule({
      providers: [
        AdminGamesFacade,
        { provide: ADMIN_GAMES_REPOSITORY, useValue: repository },
        { provide: AuthSessionService, useValue: { user } },
      ],
    });

    const facade = TestBed.inject(AdminGamesFacade);
    facade.load(initialAdminGameListQuery());
    user.set(null);
    result$.next(createListResult('Tardío'));

    expect(facade.games()).toEqual([]);
    expect(facade.status()).toBe('loading');
  });

  it('creates a game and refreshes the list with command feedback', () => {
    const create$ = new Subject<AdminGameCommandResultView>();
    const refresh$ = new Subject<AdminGameListResult>();
    const repository = {
      listGames: vi.fn()
        .mockReturnValueOnce(refresh$),
      createGame: vi.fn(() => create$),
    };

    TestBed.configureTestingModule({
      providers: [
        AdminGamesFacade,
        { provide: ADMIN_GAMES_REPOSITORY, useValue: repository },
        { provide: AuthSessionService, useValue: { user: signal({ id: 7 }) } },
      ],
    });

    const facade = TestBed.inject(AdminGamesFacade);
    facade.createGame({
      slug: 'game-new',
      name: 'Nuevo Bingo',
      description: null,
      numberMin: 1,
      numberMax: 10,
      hitsRequired: 3,
      ticketPriceCents: 500,
      prizeCents: 10000,
      currency: 'PEN',
      drawIntervalSeconds: 30,
      autoDrawEnabled: false,
      salesOpensAt: null,
      salesClosesAt: null,
      scheduledStartAt: null,
    });

    create$.next(createCommandResult());
    refresh$.next(createListResult('Refrescado'));

    expect(facade.createState().status).toBe('success');
    expect(facade.createState().refreshState).toBe('confirmed');
    expect(facade.games()[0]?.name).toBe('Refrescado');
  });

  it('ignores double submit while create is already submitting', () => {
    const create$ = new Subject<AdminGameCommandResultView>();
    const repository = {
      listGames: vi.fn(),
      createGame: vi.fn(() => create$),
    };

    TestBed.configureTestingModule({
      providers: [
        AdminGamesFacade,
        { provide: ADMIN_GAMES_REPOSITORY, useValue: repository },
        { provide: AuthSessionService, useValue: { user: signal({ id: 7 }) } },
      ],
    });

    const facade = TestBed.inject(AdminGamesFacade);
    const payload = {
      slug: 'game-new',
      name: 'Nuevo Bingo',
      description: null,
      numberMin: 1,
      numberMax: 10,
      hitsRequired: 3,
      ticketPriceCents: 500,
      prizeCents: 10000,
      currency: 'PEN',
      drawIntervalSeconds: 30,
      autoDrawEnabled: false,
      salesOpensAt: null,
      salesClosesAt: null,
      scheduledStartAt: null,
    };

    facade.createGame(payload);
    facade.createGame(payload);

    expect(repository.createGame).toHaveBeenCalledTimes(1);
  });

  it('preserves create success when the list refresh fails afterwards', () => {
    const create$ = new Subject<AdminGameCommandResultView>();
    const refresh$ = new Subject<AdminGameListResult>();
    const repository = {
      listGames: vi.fn().mockReturnValueOnce(refresh$),
      createGame: vi.fn(() => create$),
    };

    TestBed.configureTestingModule({
      providers: [
        AdminGamesFacade,
        { provide: ADMIN_GAMES_REPOSITORY, useValue: repository },
        { provide: AuthSessionService, useValue: { user: signal({ id: 7 }) } },
      ],
    });

    const facade = TestBed.inject(AdminGamesFacade);
    facade.createGame({
      slug: 'game-new',
      name: 'Nuevo Bingo',
      description: null,
      numberMin: 1,
      numberMax: 10,
      hitsRequired: 3,
      ticketPriceCents: 500,
      prizeCents: 10000,
      currency: 'PEN',
      drawIntervalSeconds: 30,
      autoDrawEnabled: false,
      salesOpensAt: null,
      salesClosesAt: null,
      scheduledStartAt: null,
    });

    create$.next(createCommandResult());
    refresh$.error(new HttpErrorResponse({ status: 0 }));

    expect(facade.createState().status).toBe('success');
    expect(facade.createState().refreshState).toBe('failed');
  });
});
