import { signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Subject, throwError } from 'rxjs';
import { AuthSessionService } from '../../../core/auth/services/auth-session.service';
import { AdminGameNumbersResult } from '../models/admin-games.models';
import { ADMIN_GAMES_REPOSITORY } from './admin-games.repository';
import { AdminGameNumbersFacade } from './admin-game-numbers.facade';

function createNumbersResult(): AdminGameNumbersResult {
  return {
    numbers: [
      {
        id: 'number-1',
        number: 1,
        status: { value: 'available', label: 'Disponible', tone: 'success', isKnown: true },
        activeReservation: null,
        soldEntry: null,
      },
    ],
  };
}

describe('AdminGameNumbersFacade', () => {
  it('loads numbers for the selected game', () => {
    const result$ = new Subject<AdminGameNumbersResult>();
    const repository = {
      listGameNumbers: vi.fn(() => result$),
    };

    TestBed.configureTestingModule({
      providers: [
        AdminGameNumbersFacade,
        { provide: ADMIN_GAMES_REPOSITORY, useValue: repository },
        { provide: AuthSessionService, useValue: { user: signal({ id: 7 }) } },
      ],
    });

    const facade = TestBed.inject(AdminGameNumbersFacade);
    facade.load('game-1');
    result$.next(createNumbersResult());

    expect(facade.status()).toBe('loaded');
    expect(facade.numbers()[0]?.number).toBe(1);
  });

  it('uses refreshing when reloading the same game after prior results', () => {
    const first$ = new Subject<AdminGameNumbersResult>();
    const second$ = new Subject<AdminGameNumbersResult>();
    const repository = {
      listGameNumbers: vi.fn()
        .mockReturnValueOnce(first$)
        .mockReturnValueOnce(second$),
    };

    TestBed.configureTestingModule({
      providers: [
        AdminGameNumbersFacade,
        { provide: ADMIN_GAMES_REPOSITORY, useValue: repository },
        { provide: AuthSessionService, useValue: { user: signal({ id: 7 }) } },
      ],
    });

    const facade = TestBed.inject(AdminGameNumbersFacade);
    facade.load('game-1');
    first$.next(createNumbersResult());
    facade.reload();

    expect(facade.status()).toBe('refreshing');
    second$.next(createNumbersResult());
    expect(facade.status()).toBe('loaded');
  });

  it('exposes empty when the backend returns no numbers', () => {
    const repository = {
      listGameNumbers: vi.fn(() => new Subject<AdminGameNumbersResult>()),
    };
    const result$ = new Subject<AdminGameNumbersResult>();
    repository.listGameNumbers.mockReturnValue(result$);

    TestBed.configureTestingModule({
      providers: [
        AdminGameNumbersFacade,
        { provide: ADMIN_GAMES_REPOSITORY, useValue: repository },
        { provide: AuthSessionService, useValue: { user: signal({ id: 7 }) } },
      ],
    });

    const facade = TestBed.inject(AdminGameNumbersFacade);
    facade.load('game-1');
    result$.next({ numbers: [] });

    expect(facade.status()).toBe('empty');
  });

  it('maps 404 to notFound', () => {
    const repository = {
      listGameNumbers: vi.fn(() =>
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
        AdminGameNumbersFacade,
        { provide: ADMIN_GAMES_REPOSITORY, useValue: repository },
        { provide: AuthSessionService, useValue: { user: signal({ id: 7 }) } },
      ],
    });

    const facade = TestBed.inject(AdminGameNumbersFacade);
    facade.load('missing-game');

    expect(facade.status()).toBe('notFound');
  });

  it('maps 422 to validationError', () => {
    const repository = {
      listGameNumbers: vi.fn(() =>
        throwError(
          () =>
            new HttpErrorResponse({
              status: 422,
              error: { message: 'The request is invalid.' },
            }),
        ),
      ),
    };

    TestBed.configureTestingModule({
      providers: [
        AdminGameNumbersFacade,
        { provide: ADMIN_GAMES_REPOSITORY, useValue: repository },
        { provide: AuthSessionService, useValue: { user: signal({ id: 7 }) } },
      ],
    });

    const facade = TestBed.inject(AdminGameNumbersFacade);
    facade.load('game-1');

    expect(facade.status()).toBe('validationError');
  });

  it('maps network failures safely', () => {
    const repository = {
      listGameNumbers: vi.fn(() =>
        throwError(
          () =>
            new HttpErrorResponse({
              status: 0,
            }),
        ),
      ),
    };

    TestBed.configureTestingModule({
      providers: [
        AdminGameNumbersFacade,
        { provide: ADMIN_GAMES_REPOSITORY, useValue: repository },
        { provide: AuthSessionService, useValue: { user: signal({ id: 7 }) } },
      ],
    });

    const facade = TestBed.inject(AdminGameNumbersFacade);
    facade.load('game-1');

    expect(facade.status()).toBe('networkError');
  });

  it('ignores late responses after a fast game change', () => {
    const first$ = new Subject<AdminGameNumbersResult>();
    const second$ = new Subject<AdminGameNumbersResult>();
    const repository = {
      listGameNumbers: vi.fn()
        .mockReturnValueOnce(first$)
        .mockReturnValueOnce(second$),
    };

    TestBed.configureTestingModule({
      providers: [
        AdminGameNumbersFacade,
        { provide: ADMIN_GAMES_REPOSITORY, useValue: repository },
        { provide: AuthSessionService, useValue: { user: signal({ id: 7 }) } },
      ],
    });

    const facade = TestBed.inject(AdminGameNumbersFacade);
    facade.load('game-1');
    facade.load('game-2');
    second$.next(createNumbersResult());
    first$.next({
      numbers: [
        {
          id: 'number-old',
          number: 99,
          status: { value: 'reserved', label: 'Reservado', tone: 'warning', isKnown: true },
          activeReservation: null,
          soldEntry: null,
        },
      ],
    });

    expect(facade.numbers()[0]?.id).toBe('number-1');
  });

  it('ignores late responses after logout', () => {
    const result$ = new Subject<AdminGameNumbersResult>();
    const user = signal<{ id: number } | null>({ id: 7 });
    const repository = {
      listGameNumbers: vi.fn(() => result$),
    };

    TestBed.configureTestingModule({
      providers: [
        AdminGameNumbersFacade,
        { provide: ADMIN_GAMES_REPOSITORY, useValue: repository },
        { provide: AuthSessionService, useValue: { user } },
      ],
    });

    const facade = TestBed.inject(AdminGameNumbersFacade);
    facade.load('game-1');
    user.set(null);
    result$.next(createNumbersResult());

    expect(facade.numbers()).toEqual([]);
    expect(facade.status()).toBe('loading');
  });
});
