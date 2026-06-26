import { computed, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Observable, of, Subject, throwError } from 'rxjs';
import {
  PUBLIC_GAMES_REPOSITORY,
  PublicGamesRepository,
} from '../../public-games/data-access/public-games.repository';
import { PublicGame } from '../../public-games/models/public-game.models';
import { AuthRedirectService } from '../../../core/auth/services/auth-redirect.service';
import { AuthSessionService } from '../../../core/auth/services/auth-session.service';
import { GameNumbersAvailability, NumberReservationApiDto } from '../models/game-number.models';
import { GAME_NUMBERS_REPOSITORY, GameNumbersRepository } from './game-numbers.repository';
import { NumberReservationIdempotencyService } from './number-reservation-idempotency.service';
import { NumberSelectionDraftService } from './number-selection-draft.service';
import { NumberSelectionFacade } from './number-selection.facade';

const game: PublicGame = {
  id: '01977abc-0000-7000-8000-000000000001',
  slug: 'bingo-fortuna',
  name: 'Bingo Fortuna',
  description: null,
  status: 'sales_open',
  numberMin: 1,
  numberMax: 3,
  hitsRequired: 3,
  ticketPrice: { amountCents: 500, currency: 'PEN' },
  prize: { amountCents: 10_000, currency: 'PEN' },
  schedule: {
    salesOpensAt: null,
    salesClosesAt: null,
    scheduledStartAt: null,
    drawIntervalSeconds: 10,
  },
};

const availability: GameNumbersAvailability = {
  numbers: [
    {
      key: '01977abc-0000-7000-8000-000000000011',
      gameNumberId: '01977abc-0000-7000-8000-000000000011',
      number: 1,
      status: 'available',
    },
    {
      key: '01977abc-0000-7000-8000-000000000012',
      gameNumberId: '01977abc-0000-7000-8000-000000000012',
      number: 2,
      status: 'reserved',
    },
    {
      key: '01977abc-0000-7000-8000-000000000013',
      gameNumberId: '01977abc-0000-7000-8000-000000000013',
      number: 3,
      status: 'available',
    },
  ],
};

const successResponse: NumberReservationApiDto = {
  order: {
    id: '01977abc-0000-7000-8000-000000000101',
    game_id: game.id,
    status: 'pending',
    subtotal_cents: 500,
    total_cents: 500,
    currency: 'PEN',
    expires_at: '2026-06-25T12:00:00Z',
  },
  numbers: [1],
  game_number_ids: ['01977abc-0000-7000-8000-000000000011'],
  reservation_ids: ['01977abc-0000-7000-8000-000000000201'],
  payment: {
    id: '01977abc-0000-7000-8000-000000000301',
    status: 'pending',
    amount_cents: 500,
    currency: 'PEN',
  },
};

class MockAuthSessionService {
  readonly currentUser = signal<null | { id: number }>(null);
  readonly isAuthenticated = computed(() => this.currentUser() !== null);

  user() {
    return this.currentUser();
  }

  clearSession = vi.fn(() => this.currentUser.set(null));
}

function createApiError(status: number, error: Record<string, unknown>): HttpErrorResponse {
  return new HttpErrorResponse({
    status,
    error,
  });
}

function createIdempotencyMock() {
  let sequence = 0;
  let currentAttempt: { fingerprint: string; key: string } | null = null;
  const issuedKeys: string[] = [];

  return {
    issuedKeys,
    getOrCreate: vi.fn((identity: { userId: number; gameId: string; gameNumberIds: readonly string[] }) => {
      const fingerprint = JSON.stringify({
        userId: identity.userId,
        gameId: identity.gameId,
        gameNumberIds: [...new Set(identity.gameNumberIds)].sort((left, right) =>
          left.localeCompare(right),
        ),
      });

      if (currentAttempt?.fingerprint === fingerprint) {
        return currentAttempt.key;
      }

      sequence += 1;
      currentAttempt = {
        fingerprint,
        key: `reserve-key-${sequence}`,
      };
      issuedKeys.push(currentAttempt.key);
      return currentAttempt.key;
    }),
    clear: vi.fn(() => {
      currentAttempt = null;
    }),
  };
}

function createRepositories(options?: {
  reserve$?: Observable<NumberReservationApiDto>;
  availability$?: Observable<GameNumbersAvailability>;
}) {
  const reserve$ = options?.reserve$ ?? of(successResponse);
  const availability$ = options?.availability$ ?? of(availability);

  const gamesRepository: PublicGamesRepository = {
    list: () =>
      of({
        games: [game],
        pageInfo: { currentPage: 1, lastPage: 1, perPage: 20, total: 1 },
      }),
    getBySlug: () => of(game),
  };
  const numbersRepository: GameNumbersRepository = {
    getAvailability: vi.fn(() => availability$),
    reserveNumbers: vi.fn(() => reserve$),
  };

  return {
    gamesRepository,
    numbersRepository,
  };
}

function configureFacade(options?: {
  reserve$?: Observable<NumberReservationApiDto>;
  availability$?: Observable<GameNumbersAvailability>;
  numbersRepository?: GameNumbersRepository;
  idempotency?: ReturnType<typeof createIdempotencyMock>;
}) {
  const repositories =
    options?.numbersRepository === undefined
      ? createRepositories({
          reserve$: options?.reserve$,
          availability$: options?.availability$,
        })
      : {
          gamesRepository: createRepositories().gamesRepository,
          numbersRepository: options.numbersRepository,
        };

  const redirects = { redirectToLogin: vi.fn() };
  const idempotency = options?.idempotency ?? createIdempotencyMock();
  const draft = { save: vi.fn(), take: vi.fn(() => null), clear: vi.fn() };
  const session = new MockAuthSessionService();

  TestBed.configureTestingModule({
    providers: [
      NumberSelectionFacade,
      { provide: PUBLIC_GAMES_REPOSITORY, useValue: repositories.gamesRepository },
      { provide: GAME_NUMBERS_REPOSITORY, useValue: repositories.numbersRepository },
      { provide: AuthSessionService, useValue: session },
      { provide: AuthRedirectService, useValue: redirects },
      { provide: Router, useValue: { url: `/bingos/${game.slug}/numeros` } },
      { provide: NumberReservationIdempotencyService, useValue: idempotency },
      { provide: NumberSelectionDraftService, useValue: draft },
    ],
  });

  return {
    facade: TestBed.inject(NumberSelectionFacade),
    numbersRepository: repositories.numbersRepository,
    redirects,
    idempotency,
    draft,
    session,
  };
}

describe('NumberSelectionFacade', () => {
  it('loads numbers with real UUIDs and derives totals', () => {
    const { facade } = configureFacade();
    facade.load(game.slug);

    facade.toggle(availability.numbers[0]);
    facade.toggle(availability.numbers[1]);

    expect(facade.viewStatus()).toBe('loaded');
    expect(facade.selectedNumbers().map((item) => item.gameNumberId)).toEqual([
      '01977abc-0000-7000-8000-000000000011',
    ]);
    expect(facade.totalCents()).toBe(500);
    expect(facade.canReserve()).toBe(true);
  });

  it('redirects anonymous users to login and preserves the public selection draft', () => {
    const { facade, redirects, draft, numbersRepository } = configureFacade();
    facade.load(game.slug);
    facade.toggle(availability.numbers[0]);

    facade.submitReservation();

    expect(draft.save).toHaveBeenCalledWith({
      slug: game.slug,
      gameId: game.id,
      selectedGameNumberIds: ['01977abc-0000-7000-8000-000000000011'],
    });
    expect(redirects.redirectToLogin).toHaveBeenCalledWith(
      expect.any(Object),
      `/bingos/${game.slug}/numeros`,
    );
    expect(numbersRepository.reserveNumbers).not.toHaveBeenCalled();
    expect(facade.reservationStatus()).toBe('unauthorized');
  });

  it('submits a real reservation with the game UUID, selected UUIDs and a stable idempotency key', () => {
    const idempotency = createIdempotencyMock();
    const { facade, session, numbersRepository } = configureFacade({ idempotency });
    session.currentUser.set({ id: 99 });
    facade.load(game.slug);
    facade.toggle(availability.numbers[0]);

    facade.submitReservation();

    expect(idempotency.getOrCreate).toHaveBeenCalledWith({
      userId: 99,
      gameId: game.id,
      gameNumberIds: ['01977abc-0000-7000-8000-000000000011'],
    });
    expect(numbersRepository.reserveNumbers).toHaveBeenCalledWith({
      gameId: game.id,
      gameNumberIds: ['01977abc-0000-7000-8000-000000000011'],
      idempotencyKey: 'reserve-key-1',
    });
    expect(facade.reservationStatus()).toBe('success');
    expect(facade.reservationResult()?.order.id).toBe(successResponse.order.id);
  });

  it('treats a successful replayed response as a normal success and clears transient state', () => {
    const { facade, session, idempotency, draft } = configureFacade();
    session.currentUser.set({ id: 99 });
    facade.load(game.slug);
    facade.toggle(availability.numbers[0]);

    facade.submitReservation();

    expect(facade.reservationStatus()).toBe('success');
    expect(idempotency.clear).toHaveBeenCalled();
    expect(draft.clear).toHaveBeenCalled();
    expect(facade.selectedCount()).toBe(0);
    expect(facade.liveMessage()).toContain('reserva');
  });

  it('prevents duplicate submit while a reservation request is in flight', () => {
    const pending = new Subject<NumberReservationApiDto>();
    const { facade, session, numbersRepository } = configureFacade({
      reserve$: pending.asObservable(),
    });
    session.currentUser.set({ id: 99 });
    facade.load(game.slug);
    facade.toggle(availability.numbers[0]);

    facade.submitReservation();
    facade.submitReservation();

    expect(numbersRepository.reserveNumbers).toHaveBeenCalledTimes(1);
    expect(facade.reservationStatus()).toBe('submitting');
  });

  it('refreshes availability and removes numbers that became unavailable after a reservation conflict', () => {
    const refreshedAvailability: GameNumbersAvailability = {
      numbers: [
        {
          key: '01977abc-0000-7000-8000-000000000011',
          gameNumberId: '01977abc-0000-7000-8000-000000000011',
          number: 1,
          status: 'reserved',
        },
        {
          key: '01977abc-0000-7000-8000-000000000012',
          gameNumberId: '01977abc-0000-7000-8000-000000000012',
          number: 2,
          status: 'reserved',
        },
        {
          key: '01977abc-0000-7000-8000-000000000013',
          gameNumberId: '01977abc-0000-7000-8000-000000000013',
          number: 3,
          status: 'available',
        },
      ],
    };
    let availabilityCall = 0;
    const numbersRepository: GameNumbersRepository = {
      getAvailability: vi.fn(() => {
        availabilityCall += 1;
        return of(availabilityCall === 1 ? availability : refreshedAvailability);
      }),
      reserveNumbers: vi.fn(() =>
        throwError(() =>
          createApiError(422, {
            error: 'number_not_available_for_reservation',
            message: 'Uno o más números ya no están disponibles.',
          }),
        ),
      ),
    };
    const { facade, session } = configureFacade({ numbersRepository });
    session.currentUser.set({ id: 99 });
    facade.load(game.slug);
    facade.toggle(availability.numbers[0]);
    facade.toggle(availability.numbers[2]);

    facade.submitReservation();

    expect(facade.reservationStatus()).toBe('conflict');
    expect(facade.selectedNumbers().map((item) => item.number)).toEqual([3]);
    expect(facade.liveMessage()).toContain('selección');
  });

  it('keeps the same key after a network error and reuses it on retry until the replay succeeds', () => {
    const idempotency = createIdempotencyMock();
    const numbersRepository: GameNumbersRepository = {
      getAvailability: vi.fn(() => of(availability)),
      reserveNumbers: vi
        .fn()
        .mockReturnValueOnce(
          throwError(() => new HttpErrorResponse({ status: 0, error: new ProgressEvent('network') })),
        )
        .mockReturnValueOnce(of(successResponse)),
    };
    const { facade, session } = configureFacade({ numbersRepository, idempotency });
    session.currentUser.set({ id: 99 });
    facade.load(game.slug);
    facade.toggle(availability.numbers[0]);
    idempotency.clear.mockClear();

    facade.submitReservation();

    expect(facade.reservationStatus()).toBe('networkError');
    expect(facade.selectedNumbers().map((item) => item.number)).toEqual([1]);
    expect(idempotency.clear).not.toHaveBeenCalled();

    facade.submitReservation();

    expect(numbersRepository.reserveNumbers).toHaveBeenNthCalledWith(1, {
      gameId: game.id,
      gameNumberIds: ['01977abc-0000-7000-8000-000000000011'],
      idempotencyKey: 'reserve-key-1',
    });
    expect(numbersRepository.reserveNumbers).toHaveBeenNthCalledWith(2, {
      gameId: game.id,
      gameNumberIds: ['01977abc-0000-7000-8000-000000000011'],
      idempotencyKey: 'reserve-key-1',
    });
    expect(idempotency.issuedKeys).toEqual(['reserve-key-1']);
    expect(facade.reservationStatus()).toBe('success');
  });

  it('keeps the same idempotency key open on 425 and allows a safe retry of the same logical submit', () => {
    const idempotency = createIdempotencyMock();
    const numbersRepository: GameNumbersRepository = {
      getAvailability: vi.fn(() => of(availability)),
      reserveNumbers: vi
        .fn()
        .mockReturnValueOnce(
          throwError(() =>
            createApiError(425, {
              error: 'idempotency_in_progress',
              message: 'Idempotency-Key is currently in progress. Retry shortly.',
            }),
          ),
        )
        .mockReturnValueOnce(of(successResponse)),
    };
    const { facade, session } = configureFacade({ numbersRepository, idempotency });
    session.currentUser.set({ id: 99 });
    facade.load(game.slug);
    facade.toggle(availability.numbers[0]);
    idempotency.clear.mockClear();

    facade.submitReservation();

    expect(facade.reservationStatus()).toBe('inProgress');
    expect(facade.liveMessage()).toContain('sigue en proceso');
    expect(idempotency.clear).not.toHaveBeenCalled();

    facade.submitReservation();

    expect(numbersRepository.reserveNumbers).toHaveBeenNthCalledWith(1, {
      gameId: game.id,
      gameNumberIds: ['01977abc-0000-7000-8000-000000000011'],
      idempotencyKey: 'reserve-key-1',
    });
    expect(numbersRepository.reserveNumbers).toHaveBeenNthCalledWith(2, {
      gameId: game.id,
      gameNumberIds: ['01977abc-0000-7000-8000-000000000011'],
      idempotencyKey: 'reserve-key-1',
    });
    expect(idempotency.issuedKeys).toEqual(['reserve-key-1']);
    expect(facade.reservationStatus()).toBe('success');
  });

  it('clears the stale key after a 409 and opens a fresh logical attempt on retry', () => {
    const idempotency = createIdempotencyMock();
    const numbersRepository: GameNumbersRepository = {
      getAvailability: vi.fn(() => of(availability)),
      reserveNumbers: vi
        .fn()
        .mockReturnValueOnce(
          throwError(() =>
            createApiError(409, {
              error: 'idempotency_key_mismatch',
              message: 'The provided idempotency key no longer matches this payload.',
            }),
          ),
        )
        .mockReturnValueOnce(of(successResponse)),
    };
    const { facade, session } = configureFacade({ numbersRepository, idempotency });
    session.currentUser.set({ id: 99 });
    facade.load(game.slug);
    facade.toggle(availability.numbers[0]);
    idempotency.clear.mockClear();

    facade.submitReservation();

    expect(facade.reservationStatus()).toBe('conflict');
    expect(idempotency.clear).toHaveBeenCalled();

    facade.submitReservation();

    expect(numbersRepository.reserveNumbers).toHaveBeenNthCalledWith(1, {
      gameId: game.id,
      gameNumberIds: ['01977abc-0000-7000-8000-000000000011'],
      idempotencyKey: 'reserve-key-1',
    });
    expect(numbersRepository.reserveNumbers).toHaveBeenNthCalledWith(2, {
      gameId: game.id,
      gameNumberIds: ['01977abc-0000-7000-8000-000000000011'],
      idempotencyKey: 'reserve-key-2',
    });
    expect(idempotency.issuedKeys).toEqual(['reserve-key-1', 'reserve-key-2']);
    expect(facade.reservationStatus()).toBe('success');
  });

  it('preserves the current draft when a reservation submit fails with 401 so the player can return after login', () => {
    const { facade, session, draft } = configureFacade({
      reserve$: throwError(() =>
        createApiError(401, {
          error: 'unauthenticated',
          message: 'Unauthenticated.',
        }),
      ),
    });
    session.currentUser.set({ id: 99 });
    facade.load(game.slug);
    facade.toggle(availability.numbers[0]);
    facade.toggle(availability.numbers[2]);

    facade.submitReservation();

    expect(facade.reservationStatus()).toBe('unauthorized');
    expect(draft.save).toHaveBeenCalledWith({
      slug: game.slug,
      gameId: game.id,
      selectedGameNumberIds: [
        '01977abc-0000-7000-8000-000000000011',
        '01977abc-0000-7000-8000-000000000013',
      ],
    });
  });

  it('ignores a late reservation success after the player moves to another game', () => {
    const pending = new Subject<NumberReservationApiDto>();
    const { facade, session } = configureFacade({ reserve$: pending.asObservable() });
    session.currentUser.set({ id: 99 });
    facade.load(game.slug);
    facade.toggle(availability.numbers[0]);

    facade.submitReservation();
    facade.load('otro-bingo');
    pending.next(successResponse);

    expect(facade.reservationStatus()).toBe('idle');
    expect(facade.reservationResult()).toBeNull();
    expect(facade.selectedCount()).toBe(0);
  });

  it('ignores a late reservation error after logout', () => {
    const pending = new Subject<NumberReservationApiDto>();
    const { facade, session } = configureFacade({ reserve$: pending.asObservable() });
    session.currentUser.set({ id: 99 });
    facade.load(game.slug);
    facade.toggle(availability.numbers[0]);

    facade.submitReservation();
    session.currentUser.set(null);
    pending.error(
      createApiError(409, {
        error: 'idempotency_key_mismatch',
        message: 'The provided idempotency key no longer matches this payload.',
      }),
    );

    expect(facade.reservationStatus()).toBe('submitting');
    expect(facade.reservationError()).toBeNull();
    expect(facade.liveMessage()).toBe('Enviando reserva al backend.');
  });

  it('clears the previous selection when the player changes to another game', () => {
    const { facade } = configureFacade();
    facade.load(game.slug);
    facade.toggle(availability.numbers[0]);

    facade.load('otro-bingo');

    expect(facade.selectedCount()).toBe(0);
    expect(facade.reservationResult()).toBeNull();
  });
});
