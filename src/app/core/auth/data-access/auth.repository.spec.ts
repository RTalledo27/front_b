import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../../api/api.config';
import { AuthRepository } from './auth.repository';
import { AuthTokenApiDto } from '../models/auth.models';

const tokenDto: AuthTokenApiDto = {
  token_type: 'Bearer',
  access_token: 'plain-token',
  abilities: ['auth:logout', 'player:access', 'user:read'],
  user: {
    id: 1,
    name: 'Jugador',
    email: 'jugador@example.com',
    role: 'player',
    email_verified: false,
    email_verified_at: null,
    capabilities: {
      can_access_admin: false,
      can_use_player_features: true,
    },
  },
};

describe('AuthRepository', () => {
  let repository: AuthRepository;
  let http: HttpTestingController;
  const apiBaseUrl = 'http://127.0.0.1:8000/api/v1';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: apiBaseUrl },
      ],
    });

    repository = TestBed.inject(AuthRepository);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('posts login to the backend contract and returns the valid response', async () => {
    const responsePromise = firstValueFrom(
      repository.login({ email: 'user@example.com', password: 'secret123' }),
    );

    const request = http.expectOne(`${apiBaseUrl}/auth/login`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ email: 'user@example.com', password: 'secret123' });
    request.flush({ data: tokenDto });

    await expect(responsePromise).resolves.toEqual({ data: tokenDto });
  });

  it.each([
    [401, 'Unauthorized'],
    [422, 'Unprocessable Entity'],
    [500, 'Internal Server Error'],
  ])('propagates login HTTP %i responses', async (status, statusText) => {
    const responsePromise = firstValueFrom(
      repository.login({ email: 'user@example.com', password: 'secret123' }),
    );

    http
      .expectOne(`${apiBaseUrl}/auth/login`)
      .flush({ message: statusText }, { status, statusText });

    await expect(responsePromise).rejects.toMatchObject({ status });
  });

  it('propagates login network errors', async () => {
    const responsePromise = firstValueFrom(
      repository.login({ email: 'user@example.com', password: 'secret123' }),
    );

    http.expectOne(`${apiBaseUrl}/auth/login`).error(new ProgressEvent('error'));

    await expect(responsePromise).rejects.toMatchObject({ status: 0 });
  });

  it('posts register to the backend contract', () => {
    repository
      .register({
        name: 'User',
        email: 'user@example.com',
        password: 'secret123',
        password_confirmation: 'secret123',
      })
      .subscribe();

    const request = http.expectOne(`${apiBaseUrl}/auth/register`);
    expect(request.request.method).toBe('POST');
    request.flush({ data: {} });
  });

  it('posts activation to the backend contract', () => {
    repository
      .activate({
        token: 'plain-token',
        password: 'secret123',
        password_confirmation: 'secret123',
      })
      .subscribe();

    const request = http.expectOne(`${apiBaseUrl}/auth/activate`);
    expect(request.request.method).toBe('POST');
    request.flush({ data: {} });
  });

  it('loads the canonical me endpoint', () => {
    repository.me().subscribe();

    const request = http.expectOne(`${apiBaseUrl}/auth/me`);
    expect(request.request.method).toBe('GET');
    request.flush({ data: {} });
  });

  it('posts logout to the backend contract', () => {
    repository.logout().subscribe();

    const request = http.expectOne(`${apiBaseUrl}/auth/logout`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({});
    request.flush({});
  });
});
