import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../../../core/api/api.config';
import { HttpAdminPlayersRepository } from './admin-players.repository';

describe('HttpAdminPlayersRepository', () => {
  let repository: HttpAdminPlayersRepository;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        HttpAdminPlayersRepository,
        { provide: API_BASE_URL, useValue: '/api/v1' },
      ],
    });

    repository = TestBed.inject(HttpAdminPlayersRepository);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('posts only the real create-player payload to the backend contract', async () => {
    const requestPromise = firstValueFrom(
      repository.createPlayer({
        name: 'Alice',
        email: 'alice@example.com',
      }),
    );

    const request = http.expectOne('/api/v1/admin/players');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      name: 'Alice',
      email: 'alice@example.com',
    });
    request.flush({
      data: {
        outcome: 'invited',
        user: {
          id: 17,
          name: 'Alice',
          email: 'alice@example.com',
          role: 'player',
        },
        invitation: {
          id: '0197-player-invitation',
          expires_at: '2026-07-12T12:00:00Z',
        },
        plain_token: 'plain-token-value',
      },
    });

    await expect(requestPromise).resolves.toMatchObject({
      outcome: 'invited',
      user: { email: 'alice@example.com' },
    });
  });

  it('keeps the already_registered response shape from the backend', async () => {
    const requestPromise = firstValueFrom(
      repository.createPlayer({
        name: 'Registered',
        email: 'registered@example.com',
      }),
    );

    const request = http.expectOne('/api/v1/admin/players');
    expect(request.request.method).toBe('POST');
    request.flush({
      data: {
        outcome: 'already_registered',
        user: {
          id: 3,
          name: 'Registered',
          email: 'registered@example.com',
          role: 'player',
        },
        invitation: null,
      },
    });

    await expect(requestPromise).resolves.toMatchObject({
      outcome: 'already_registered',
      invitation: null,
      plainToken: null,
    });
  });

  it.each([
    [401, 'Unauthorized'],
    [403, 'Forbidden'],
    [422, 'Unprocessable Entity'],
    [429, 'Too Many Requests'],
    [500, 'Internal Server Error'],
  ])('propagates HTTP %i responses from Laravel', async (status, statusText) => {
    const requestPromise = firstValueFrom(
      repository.createPlayer({
        name: 'Alice',
        email: 'alice@example.com',
      }),
    );

    http.expectOne('/api/v1/admin/players').flush({ message: statusText }, { status, statusText });

    await expect(requestPromise).rejects.toBeInstanceOf(HttpErrorResponse);
  });

  it('propagates network errors', async () => {
    const requestPromise = firstValueFrom(
      repository.createPlayer({
        name: 'Alice',
        email: 'alice@example.com',
      }),
    );

    http.expectOne('/api/v1/admin/players').error(new ProgressEvent('error'));

    await expect(requestPromise).rejects.toMatchObject({ status: 0 });
  });

  it('rejects malformed resources safely', async () => {
    const requestPromise = firstValueFrom(
      repository.createPlayer({
        name: 'Alice',
        email: 'alice@example.com',
      }),
    );

    http.expectOne('/api/v1/admin/players').flush({
      data: {
        outcome: 'invited',
        user: { id: 17 },
      },
    });

    await expect(requestPromise).rejects.toBeInstanceOf(Error);
  });
});
