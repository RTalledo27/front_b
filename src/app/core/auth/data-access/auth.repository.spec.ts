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

  it('posts forgot-password to the backend contract', () => {
    repository.forgotPassword({ email: 'user@example.com' }).subscribe();

    const request = http.expectOne(`${apiBaseUrl}/auth/forgot-password`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ email: 'user@example.com' });
    request.flush({ message: 'Secure reset message.' });
  });

  it('posts reset-password to the backend contract', () => {
    repository
      .resetPassword({
        email: 'user@example.com',
        token: 'plain-reset-token',
        password: 'secret123',
        password_confirmation: 'secret123',
      })
      .subscribe();

    const request = http.expectOne(`${apiBaseUrl}/auth/reset-password`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      email: 'user@example.com',
      token: 'plain-reset-token',
      password: 'secret123',
      password_confirmation: 'secret123',
    });
    request.flush({ message: 'Password updated.' });
  });

  it('loads the canonical me endpoint', () => {
    repository.me().subscribe();

    const request = http.expectOne(`${apiBaseUrl}/auth/me`);
    expect(request.request.method).toBe('GET');
    request.flush({ data: {} });
  });

  it('posts the resend-verification endpoint', () => {
    repository.resendVerificationEmail().subscribe();

    const request = http.expectOne(`${apiBaseUrl}/auth/email/verification-notification`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({});
    request.flush({ message: 'Verification sent.' });
  });

  it('posts the signed verify-email endpoint', () => {
    repository
      .verifyEmail({
        id: '12',
        hash: 'email-hash',
        expires: '1234567890',
        signature: 'signed-value',
      })
      .subscribe();

    const request = http.expectOne(
      `${apiBaseUrl}/auth/email/verify/12/email-hash?expires=1234567890&signature=signed-value`,
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({});
    request.flush({ message: 'Correo verificado correctamente.', email_verified: true });
  });

  it('posts the social exchange endpoint', () => {
    repository.socialExchange({ code: 'x'.repeat(64) }).subscribe();

    const request = http.expectOne(`${apiBaseUrl}/auth/social/exchange`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ code: 'x'.repeat(64) });
    request.flush({ data: tokenDto });
  });

  it('loads linked social accounts from the protected contract', () => {
    repository.socialAccounts().subscribe();

    const request = http.expectOne(`${apiBaseUrl}/auth/social-accounts`);
    expect(request.request.method).toBe('GET');
    request.flush({
      data: [
        {
          provider: 'google',
          provider_email_masked: 'jo***@gmail.com',
          provider_email_verified: true,
          linked_at: '2026-07-05T00:00:00Z',
          can_unlink: true,
        },
      ],
    });
  });

  it('deletes unlink-social with an optional current password body', () => {
    repository.unlinkSocialAccount('google', { current_password: 'secret123' }).subscribe();

    const request = http.expectOne(`${apiBaseUrl}/auth/social/google`);
    expect(request.request.method).toBe('DELETE');
    expect(request.request.body).toEqual({ current_password: 'secret123' });
    request.flush({ message: 'Social account unlinked successfully.', provider: 'google' });
  });

  it('posts logout to the backend contract', () => {
    repository.logout().subscribe();

    const request = http.expectOne(`${apiBaseUrl}/auth/logout`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({});
    request.flush({});
  });
});
