import { HttpClient, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { API_BASE_URL } from '../../api/api.config';
import { AuthRedirectService } from '../services/auth-redirect.service';
import { AuthSessionService } from '../services/auth-session.service';
import { authErrorInterceptor } from './auth-error.interceptor';

describe('authErrorInterceptor', () => {
  let client: HttpClient;
  let http: HttpTestingController;
  let session: { clearSession: ReturnType<typeof vi.fn> };
  let router: Router;
  const apiBaseUrl = 'http://127.0.0.1:8000/api/v1';

  beforeEach(() => {
    session = { clearSession: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authErrorInterceptor])),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: apiBaseUrl },
        { provide: AuthSessionService, useValue: session },
        AuthRedirectService,
      ],
    });

    client = TestBed.inject(HttpClient);
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => http.verify());

  it('clears the session and redirects to login on 401', () => {
    Object.defineProperty(router, 'url', {
      configurable: true,
      value: '/jugador/compras',
    });
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    client.get(`${apiBaseUrl}/me/orders`).subscribe({ error: () => undefined });
    http.expectOne(`${apiBaseUrl}/me/orders`).flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(session.clearSession).toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/jugador/compras' },
    });
  });

  it('redirects to 403 on forbidden responses', () => {
    const navigateByUrlSpy = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    client.get(`${apiBaseUrl}/admin/orders`).subscribe({ error: () => undefined });
    http.expectOne(`${apiBaseUrl}/admin/orders`).flush({}, { status: 403, statusText: 'Forbidden' });

    expect(navigateByUrlSpy).toHaveBeenCalledWith('/403');
  });

  it('leaves email verification 403 responses to the feature that owns the recovery CTA', () => {
    const navigateByUrlSpy = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    let receivedStatus: number | null = null;

    client.post(`${apiBaseUrl}/games/game-1/reservations`, {}).subscribe({
      error: (error: unknown) => {
        receivedStatus = error instanceof HttpErrorResponse ? error.status : null;
      },
    });
    http.expectOne(`${apiBaseUrl}/games/game-1/reservations`).flush(
      {
        error: 'email_not_verified',
        message: 'Debes verificar tu correo.',
        reason: 'email_not_verified',
      },
      { status: 403, statusText: 'Forbidden' },
    );

    expect(receivedStatus).toBe(403);
    expect(session.clearSession).not.toHaveBeenCalled();
    expect(navigateByUrlSpy).not.toHaveBeenCalled();
  });

  it('does not redirect again when already on login', () => {
    Object.defineProperty(router, 'url', {
      configurable: true,
      value: '/login',
    });
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    client.get(`${apiBaseUrl}/auth/me`).subscribe({ error: () => undefined });
    http.expectOne(`${apiBaseUrl}/auth/me`).flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(session.clearSession).toHaveBeenCalled();
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('ignores external 401 responses', () => {
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    client.get('https://example.com/api').subscribe({ error: () => undefined });
    http.expectOne('https://example.com/api').flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(session.clearSession).not.toHaveBeenCalled();
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('deduplicates concurrent redirects to login', () => {
    Object.defineProperty(router, 'url', {
      configurable: true,
      value: '/jugador/compras',
    });
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    client.get(`${apiBaseUrl}/me/orders`).subscribe({ error: () => undefined });
    client.get(`${apiBaseUrl}/me/entries`).subscribe({ error: () => undefined });
    http.expectOne(`${apiBaseUrl}/me/orders`).flush({}, { status: 401, statusText: 'Unauthorized' });
    http.expectOne(`${apiBaseUrl}/me/entries`).flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(navigateSpy).toHaveBeenCalledTimes(1);
  });
});
