import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { ADMIN_PLAYERS_REPOSITORY } from './admin-players.repository';
import { AdminPlayersFacade } from './admin-players.facade';

describe('AdminPlayersFacade', () => {
  function createResult(outcome: 'invited' | 'reinvited' | 'already_registered' = 'invited') {
    return {
      outcome,
      user: {
        id: 17,
        name: 'Alice',
        email: 'alice@example.com',
        role: 'player' as const,
      },
      invitation:
        outcome === 'already_registered'
          ? null
          : {
              id: '0197-player-invitation',
              expiresAt: '2026-07-12T12:00:00Z',
            },
      plainToken: outcome === 'already_registered' ? null : 'plain-token-value',
    };
  }

  function httpError(status: number, body: object) {
    return new HttpErrorResponse({
      status,
      error: body,
    });
  }

  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it('stores the real backend result on success', () => {
    const repository = {
      createPlayer: vi.fn(() => of(createResult('invited'))),
    };

    TestBed.configureTestingModule({
      providers: [
        AdminPlayersFacade,
        { provide: ADMIN_PLAYERS_REPOSITORY, useValue: repository },
      ],
    });

    const facade = TestBed.inject(AdminPlayersFacade);
    facade.submit({ name: 'Alice', email: 'alice@example.com' });

    expect(facade.status()).toBe('success');
    expect(facade.result()?.outcome).toBe('invited');
  });

  it('blocks a second submit while the first request is still pending', () => {
    const pending = new Subject<ReturnType<typeof createResult>>();
    const repository = {
      createPlayer: vi.fn(() => pending.asObservable()),
    };

    TestBed.configureTestingModule({
      providers: [
        AdminPlayersFacade,
        { provide: ADMIN_PLAYERS_REPOSITORY, useValue: repository },
      ],
    });

    const facade = TestBed.inject(AdminPlayersFacade);
    facade.submit({ name: 'Alice', email: 'alice@example.com' });
    facade.submit({ name: 'Alice', email: 'alice@example.com' });

    expect(repository.createPlayer).toHaveBeenCalledTimes(1);
  });

  it('maps 422 field errors and clears the loading state', () => {
    const repository = {
      createPlayer: vi.fn(() =>
        throwError(
          () =>
            httpError(422, {
              message: 'Validation failed.',
              errors: { email: ['Correo inválido.'] },
            }),
        ),
      ),
    };

    TestBed.configureTestingModule({
      providers: [
        AdminPlayersFacade,
        { provide: ADMIN_PLAYERS_REPOSITORY, useValue: repository },
      ],
    });

    const facade = TestBed.inject(AdminPlayersFacade);
    facade.submit({ name: 'Alice', email: 'bad-email' });

    expect(facade.status()).toBe('validationError');
    expect(facade.error()?.fieldErrors['email']).toEqual(['Correo inválido.']);
  });

  it('maps 429 and network failures to stable UI states', () => {
    const rateLimitedRepository = {
      createPlayer: vi.fn(() =>
        throwError(() => httpError(429, { message: 'Too many authentication attempts.' })),
      ),
    };

    TestBed.configureTestingModule({
      providers: [
        AdminPlayersFacade,
        { provide: ADMIN_PLAYERS_REPOSITORY, useValue: rateLimitedRepository },
      ],
    });

    const rateLimitedFacade = TestBed.inject(AdminPlayersFacade);
    rateLimitedFacade.submit({ name: 'Alice', email: 'alice@example.com' });
    expect(rateLimitedFacade.status()).toBe('rateLimited');

    TestBed.resetTestingModule();

    const networkRepository = {
      createPlayer: vi.fn(() => throwError(() => new HttpErrorResponse({ status: 0 }))),
    };

    TestBed.configureTestingModule({
      providers: [
        AdminPlayersFacade,
        { provide: ADMIN_PLAYERS_REPOSITORY, useValue: networkRepository },
      ],
    });

    const networkFacade = TestBed.inject(AdminPlayersFacade);
    networkFacade.submit({ name: 'Alice', email: 'alice@example.com' });
    expect(networkFacade.status()).toBe('networkError');
  });

  it('maps 401 and 403 to authorization-safe states', () => {
    const unauthorizedRepository = {
      createPlayer: vi.fn(() => throwError(() => httpError(401, { message: 'Authentication required.' }))),
    };

    TestBed.configureTestingModule({
      providers: [
        AdminPlayersFacade,
        { provide: ADMIN_PLAYERS_REPOSITORY, useValue: unauthorizedRepository },
      ],
    });

    const unauthorizedFacade = TestBed.inject(AdminPlayersFacade);
    unauthorizedFacade.submit({ name: 'Alice', email: 'alice@example.com' });
    expect(unauthorizedFacade.status()).toBe('unauthorized');

    TestBed.resetTestingModule();

    const forbiddenRepository = {
      createPlayer: vi.fn(() => throwError(() => httpError(403, { message: 'Administrator role required.' }))),
    };

    TestBed.configureTestingModule({
      providers: [
        AdminPlayersFacade,
        { provide: ADMIN_PLAYERS_REPOSITORY, useValue: forbiddenRepository },
      ],
    });

    const forbiddenFacade = TestBed.inject(AdminPlayersFacade);
    forbiddenFacade.submit({ name: 'Alice', email: 'alice@example.com' });
    expect(forbiddenFacade.status()).toBe('forbidden');
  });
});
