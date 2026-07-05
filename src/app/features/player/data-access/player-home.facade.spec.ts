import '@angular/compiler';
import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Observable, of, Subject, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { AuthUser } from '../../../core/auth/models/auth.models';
import { AuthSessionService } from '../../../core/auth/services/auth-session.service';
import {
  PlayerEntryApiDto,
  PlayerOrderApiDto,
  PlayerReservationApiDto,
} from '../../player-commerce/models/player-commerce.models';
import {
  PLAYER_COMMERCE_REPOSITORY,
  PlayerCommerceRepository,
} from '../../player-commerce/data-access/player-commerce.repository';
import { PlayerHomeFacade } from './player-home.facade';

describe('PlayerHomeFacade', () => {
  function createUser(): AuthUser {
    return {
      id: 7,
      name: 'Andrea Real',
      email: 'andrea@example.com',
      role: 'player',
      emailVerified: true,
      emailVerifiedAt: '2026-07-05T10:00:00Z',
      capabilities: {
        canAccessAdmin: false,
        canUsePlayerFeatures: true,
      },
    };
  }

  function buildOrdersResponse(total = 2) {
    const data: PlayerOrderApiDto[] = [
      {
        id: 'order-1',
        game_id: 'game-1',
        status: 'pending',
        subtotal_cents: 2500,
        total_cents: 2500,
        currency: 'PEN',
        expires_at: '2026-07-05T12:00:00Z',
        paid_at: null,
        cancelled_at: null,
        expired_at: null,
        created_at: '2026-07-05T10:00:00Z',
        item_count: 2,
        payment: null,
      },
      {
        id: 'order-2',
        game_id: 'game-2',
        status: 'paid',
        subtotal_cents: 4000,
        total_cents: 4000,
        currency: 'PEN',
        expires_at: null,
        paid_at: '2026-07-04T09:00:00Z',
        cancelled_at: null,
        expired_at: null,
        created_at: '2026-07-04T08:00:00Z',
        item_count: 1,
        payment: {
          id: 'payment-2',
          status: 'approved',
          amount_cents: 4000,
          currency: 'PEN',
          submitted_at: '2026-07-04T08:10:00Z',
        },
      },
    ];

    return {
      data: data.slice(0, total),
      links: { first: null, last: null, prev: null, next: null },
      meta: {
        current_page: 1,
        from: total === 0 ? null : 1,
        last_page: 1,
        links: [],
        path: '/api/v1/me/orders',
        per_page: 20,
        to: total === 0 ? null : total,
        total,
      },
    };
  }

  function buildReservationsResponse(total = 1) {
    const data: PlayerReservationApiDto[] = [
      {
        id: 'reservation-1',
        order_id: 'order-1',
        game_number_id: 'gn-1',
        created_at: '2026-07-05T10:05:00Z',
        order: {
          id: 'order-1',
          status: 'pending',
          expires_at: '2026-07-05T12:00:00Z',
          total_cents: 2500,
          currency: 'PEN',
        },
        game_number: {
          id: 'gn-1',
          number: 7,
          status: 'reserved',
          game: { id: 'game-1', slug: 'bingo-real', name: 'Bingo Real' },
        },
      },
    ];

    return {
      data: data.slice(0, total),
      links: { first: null, last: null, prev: null, next: null },
      meta: {
        current_page: 1,
        from: total === 0 ? null : 1,
        last_page: 1,
        links: [],
        path: '/api/v1/me/reservations',
        per_page: 20,
        to: total === 0 ? null : total,
        total,
      },
    };
  }

  function buildEntriesResponse(total = 1) {
    const data: PlayerEntryApiDto[] = [
      {
        id: 'entry-1',
        game_id: 'game-9',
        game_number_id: 'gn-9',
        status: 'confirmed',
        confirmed_at: '2026-07-04T18:00:00Z',
        game: { id: 'game-9', slug: 'fortuna-final', name: 'Fortuna Final' },
        game_number: { id: 'gn-9', number: 19, status: 'sold' },
      },
    ];

    return {
      data: data.slice(0, total),
      links: { first: null, last: null, prev: null, next: null },
      meta: {
        current_page: 1,
        from: total === 0 ? null : 1,
        last_page: 1,
        links: [],
        path: '/api/v1/me/entries',
        per_page: 20,
        to: total === 0 ? null : total,
        total,
      },
    };
  }

  function createRepository(overrides?: Partial<PlayerCommerceRepository>): PlayerCommerceRepository {
    return {
      listOrders: vi.fn(() => of(buildOrdersResponse())),
      getOrder: vi.fn(),
      cancelOrder: vi.fn(),
      submitEvidence: vi.fn(),
      listReservations: vi.fn(() => of(buildReservationsResponse())),
      listEntries: vi.fn(() => of(buildEntriesResponse())),
      ...overrides,
    };
  }

  async function configureFacade(overrides?: Partial<PlayerCommerceRepository>) {
    const repository = createRepository(overrides);
    const session = {
      user: signal<AuthUser | null>(createUser()),
    };

    await TestBed.configureTestingModule({
      providers: [
        PlayerHomeFacade,
        { provide: PLAYER_COMMERCE_REPOSITORY, useValue: repository },
        { provide: AuthSessionService, useValue: session },
      ],
    }).compileComponents();

    return {
      facade: TestBed.inject(PlayerHomeFacade),
      repository,
      session,
    };
  }

  function httpError(status: number, message: string) {
    return new HttpErrorResponse({
      status,
      error: { message },
    });
  }

  it('loads a real composed home with totals from Laravel pagination metadata', async () => {
    const { facade, repository } = await configureFacade();

    facade.load();

    expect(repository.listOrders).toHaveBeenCalledTimes(1);
    expect(repository.listReservations).toHaveBeenCalledTimes(1);
    expect(repository.listEntries).toHaveBeenCalledTimes(1);
    expect(facade.pageStatus()).toBe('loaded');
    expect(facade.ordersTotal()).toBe(2);
    expect(facade.reservationsTotal()).toBe(1);
    expect(facade.entriesTotal()).toBe(1);
    expect(facade.latestOrder()?.id).toBe('order-1');
    expect(facade.latestReservation()?.gameNumber.number).toBe(7);
    expect(facade.latestEntry()?.game?.name).toBe('Fortuna Final');
  });

  it('shows an honest empty state when the three player endpoints return zero records', async () => {
    const { facade } = await configureFacade({
      listOrders: vi.fn(() => of(buildOrdersResponse(0))),
      listReservations: vi.fn(() => of(buildReservationsResponse(0))),
      listEntries: vi.fn(() => of(buildEntriesResponse(0))),
    });

    facade.load();

    expect(facade.pageStatus()).toBe('empty');
    expect(facade.ordersStatus()).toBe('empty');
    expect(facade.reservationsStatus()).toBe('empty');
    expect(facade.entriesStatus()).toBe('empty');
  });

  it('keeps partial data visible when one secondary endpoint fails', async () => {
    const { facade } = await configureFacade({
      listReservations: vi.fn(() =>
        throwError(() => httpError(0, 'No pudimos conectar con el servidor.')),
      ),
    });

    facade.load();

    expect(facade.pageStatus()).toBe('partial');
    expect(facade.ordersStatus()).toBe('loaded');
    expect(facade.reservationsStatus()).toBe('networkError');
    expect(facade.entriesStatus()).toBe('loaded');
    expect(facade.failedSections()).toEqual(['reservas']);
  });

  it('reports a full unauthorized state when the three endpoints require a valid session', async () => {
    const failingRequest = () =>
      throwError(() => httpError(401, 'Inicia sesión para continuar.'));

    const { facade } = await configureFacade({
      listOrders: vi.fn(failingRequest),
      listReservations: vi.fn(failingRequest),
      listEntries: vi.fn(failingRequest),
    });

    facade.load();

    expect(facade.pageStatus()).toBe('unauthorized');
    expect(facade.primaryErrorMessage()).toBe('Inicia sesión para continuar.');
  });

  it('avoids duplicate in-flight requests when load is triggered twice before the first response resolves', async () => {
    const orders$ = new Subject<ReturnType<typeof buildOrdersResponse>>();
    const reservations$ = new Subject<ReturnType<typeof buildReservationsResponse>>();
    const entries$ = new Subject<ReturnType<typeof buildEntriesResponse>>();

    const { facade, repository } = await configureFacade({
      listOrders: vi.fn(() => orders$.asObservable()),
      listReservations: vi.fn(() => reservations$.asObservable()),
      listEntries: vi.fn(() => entries$.asObservable()),
    });

    facade.load();
    facade.load();

    expect(repository.listOrders).toHaveBeenCalledTimes(1);
    expect(repository.listReservations).toHaveBeenCalledTimes(1);
    expect(repository.listEntries).toHaveBeenCalledTimes(1);

    orders$.next(buildOrdersResponse());
    orders$.complete();
    reservations$.next(buildReservationsResponse());
    reservations$.complete();
    entries$.next(buildEntriesResponse());
    entries$.complete();

    expect(facade.pageStatus()).toBe('loaded');
  });

  it('turns malformed payloads into a controlled unexpected error instead of leaving loading stuck', async () => {
    const { facade } = await configureFacade({
      listOrders: vi.fn(
        () =>
          of({
            data: [{ id: 'broken' }],
            meta: { current_page: 1 },
          } as unknown as ReturnType<typeof buildOrdersResponse>),
      ),
      listReservations: vi.fn(() => of(buildReservationsResponse())),
      listEntries: vi.fn(() => of(buildEntriesResponse())),
    });

    facade.load();

    expect(facade.orders()).toEqual([]);
    expect(facade.ordersStatus()).toBe('unexpectedError');
    expect(facade.ordersError()).toMatchObject({
      code: 'invalid_payload',
      message: 'Recibimos una respuesta incompleta del servidor.',
    });
    expect(facade.pageStatus()).toBe('partial');
  });
});
