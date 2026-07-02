import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../../api/api.config';
import { apiCredentialsInterceptor } from '../interceptors/api-credentials.interceptor';
import { AuthTokenStorageService } from './auth-token-storage.service';
import { AuthTokenApiDto, AuthUserApiDto } from '../models/auth.models';
import { AuthSessionService } from './auth-session.service';

const apiBaseUrl = 'http://127.0.0.1:8000/api/v1';
const userDto: AuthUserApiDto = {
  id: 7,
  name: 'Andrea Rojas',
  email: 'andrea@fortuna.pe',
  email_verified: false,
  email_verified_at: null,
  role: 'admin',
  capabilities: {
    can_access_admin: true,
    can_use_player_features: true,
  },
};
const tokenDto: AuthTokenApiDto = {
  token_type: 'Bearer',
  access_token: 'plain-text-token',
  abilities: ['admin:access', 'auth:logout', 'player:access', 'user:read'],
  user: userDto,
};

describe('AuthSessionService', () => {
  let service: AuthSessionService;
  let http: HttpTestingController;
  let storage: AuthTokenStorageService;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiCredentialsInterceptor])),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: apiBaseUrl },
      ],
    });
    service = TestBed.inject(AuthSessionService);
    http = TestBed.inject(HttpTestingController);
    storage = TestBed.inject(AuthTokenStorageService);
  });

  afterEach(() => {
    sessionStorage.clear();
    http.verify();
  });

  it('starts in unknown state', () => {
    expect(service.status()).toBe('unknown');
    expect(service.user()).toBeNull();
  });

  it('returns anonymous immediately when no token is stored', async () => {
    await expect(firstValueFrom(service.ensureSession())).resolves.toBeNull();
    http.expectNone(`${apiBaseUrl}/auth/me`);
    expect(service.status()).toBe('anonymous');
  });

  it('recovers and maps the canonical authenticated user', async () => {
    storage.write('plain-text-token');
    const resultPromise = firstValueFrom(service.ensureSession());
    const request = http.expectOne(`${apiBaseUrl}/auth/me`);

    expect(request.request.headers.get('Authorization')).toBe('Bearer plain-text-token');
    expect(request.request.headers.get('Accept')).toBe('application/json');
    request.flush({ data: userDto });

    await expect(resultPromise).resolves.toEqual({
      id: 7,
      name: 'Andrea Rojas',
      email: 'andrea@fortuna.pe',
      role: 'admin',
      emailVerified: false,
      emailVerifiedAt: null,
      capabilities: {
        canAccessAdmin: true,
        canUsePlayerFeatures: true,
      },
    });
    expect(service.status()).toBe('authenticated');
    expect(service.isAdmin()).toBe(true);
  });

  it('treats a 401 response as an anonymous session', async () => {
    storage.write('expired-token');
    const resultPromise = firstValueFrom(service.ensureSession());
    http.expectOne(`${apiBaseUrl}/auth/me`).flush({}, { status: 401, statusText: 'Unauthorized' });

    await expect(resultPromise).resolves.toBeNull();
    expect(service.status()).toBe('anonymous');
    expect(service.user()).toBeNull();
    expect(storage.read()).toBeNull();
  });

  it('reuses an authenticated session without repeating the me request', async () => {
    storage.write('plain-text-token');
    const firstPromise = firstValueFrom(service.ensureSession());
    http.expectOne(`${apiBaseUrl}/auth/me`).flush({ data: userDto });
    await firstPromise;

    await expect(firstValueFrom(service.ensureSession())).resolves.toMatchObject({ id: 7 });
    http.expectNone(`${apiBaseUrl}/auth/me`);
  });

  it('logs in and stores the bearer token', async () => {
    const loginPromise = firstValueFrom(
      service.login({ email: 'admin@example.com', password: 'secret123' }),
    );
    const request = http.expectOne(`${apiBaseUrl}/auth/login`);

    request.flush({ data: tokenDto });

    await expect(loginPromise).resolves.toMatchObject({ id: 7 });
    expect(storage.read()).toBe('plain-text-token');
    expect(service.status()).toBe('authenticated');
  });

  it('preserves known abilities when refreshing the authenticated user', async () => {
    const loginPromise = firstValueFrom(
      service.login({ email: 'admin@example.com', password: 'secret123' }),
    );
    http.expectOne(`${apiBaseUrl}/auth/login`).flush({ data: tokenDto });
    await loginPromise;

    const refreshPromise = firstValueFrom(service.refreshSession());
    http.expectOne(`${apiBaseUrl}/auth/me`).flush({ data: userDto });
    await refreshPromise;

    expect(service.abilities()).toEqual(tokenDto.abilities);
  });

  it('registers and stores the bearer token', async () => {
    const registerPromise = firstValueFrom(
      service.register({
        name: 'Andrea',
        email: 'andrea@fortuna.pe',
        password: 'secret123',
        password_confirmation: 'secret123',
      }),
    );

    http.expectOne(`${apiBaseUrl}/auth/register`).flush({ data: tokenDto });
    await expect(registerPromise).resolves.toMatchObject({ id: 7 });
    expect(storage.read()).toBe('plain-text-token');
  });

  it('activates an invitation and stores the bearer token', async () => {
    const activatePromise = firstValueFrom(
      service.activate({
        token: 'invite-token',
        password: 'secret123',
        password_confirmation: 'secret123',
      }),
    );

    http.expectOne(`${apiBaseUrl}/auth/activate`).flush({ data: tokenDto });
    await expect(activatePromise).resolves.toMatchObject({ id: 7 });
    expect(storage.read()).toBe('plain-text-token');
  });

  it('does not persist an incomplete token response', async () => {
    const loginPromise = firstValueFrom(
      service.login({ email: 'admin@example.com', password: 'secret123' }),
    );
    http.expectOne(`${apiBaseUrl}/auth/login`).flush({
      data: {
        token_type: 'Bearer',
        access_token: '',
        abilities: [],
        user: userDto,
      },
    });

    await expect(loginPromise).rejects.toThrow('Invalid auth response payload.');
    expect(storage.read()).toBeNull();
    expect(service.status()).toBe('unknown');
  });

  it('clears invalid restored sessions instead of leaving a token loop', async () => {
    storage.write('plain-text-token');

    const resultPromise = firstValueFrom(service.ensureSession());
    http.expectOne(`${apiBaseUrl}/auth/me`).flush({
      data: {
        ...userDto,
        capabilities: { can_access_admin: true },
      },
    });

    await expect(resultPromise).resolves.toBeNull();
    expect(storage.read()).toBeNull();
    expect(service.status()).toBe('anonymous');
  });

  it('does not let a late login response restore state after logout', async () => {
    const loginPromise = firstValueFrom(
      service.login({ email: 'admin@example.com', password: 'secret123' }),
    );
    const loginRequest = http.expectOne(`${apiBaseUrl}/auth/login`);

    const logoutPromise = firstValueFrom(service.logout());
    http.expectOne(`${apiBaseUrl}/auth/logout`).flush({});
    await logoutPromise;

    loginRequest.flush({ data: tokenDto });

    await expect(loginPromise).rejects.toThrow('AUTH_SESSION_CHANGED_DURING_LOGIN');
    expect(storage.read()).toBeNull();
    expect(service.status()).toBe('anonymous');
  });

  it('deduplicates concurrent session restoration requests', async () => {
    storage.write('plain-text-token');

    const first = firstValueFrom(service.ensureSession());
    const second = firstValueFrom(service.ensureSession());
    const request = http.expectOne(`${apiBaseUrl}/auth/me`);
    request.flush({ data: userDto });

    await expect(first).resolves.toMatchObject({ id: 7 });
    await expect(second).resolves.toMatchObject({ id: 7 });
  });

  it('logs out successfully and clears local state', async () => {
    const loginPromise = firstValueFrom(
      service.login({ email: 'admin@example.com', password: 'secret123' }),
    );
    http.expectOne(`${apiBaseUrl}/auth/login`).flush({ data: tokenDto });
    await loginPromise;

    const logoutPromise = firstValueFrom(service.logout());
    const request = http.expectOne(`${apiBaseUrl}/auth/logout`);
    expect(request.request.headers.get('Authorization')).toBe('Bearer plain-text-token');
    request.flush({});
    await expect(logoutPromise).resolves.toBeUndefined();

    expect(service.status()).toBe('anonymous');
    expect(storage.read()).toBeNull();
  });

  it('clears local state even if logout fails', async () => {
    const loginPromise = firstValueFrom(
      service.login({ email: 'admin@example.com', password: 'secret123' }),
    );
    http.expectOne(`${apiBaseUrl}/auth/login`).flush({ data: tokenDto });
    await loginPromise;

    const logoutPromise = firstValueFrom(service.logout());
    http.expectOne(`${apiBaseUrl}/auth/logout`).flush({}, { status: 401, statusText: 'Unauthorized' });

    await expect(logoutPromise).resolves.toBeUndefined();
    expect(service.status()).toBe('anonymous');
    expect(storage.read()).toBeNull();
  });
});
