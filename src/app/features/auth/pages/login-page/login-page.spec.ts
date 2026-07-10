import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { API_BASE_URL } from '../../../../core/api/api.config';
import { AuthUser } from '../../../../core/auth/models/auth.models';
import { AuthRedirectService } from '../../../../core/auth/services/auth-redirect.service';
import { createInvalidAuthPayloadError } from '../../../../core/auth/services/auth-response.utils';
import { AuthSessionService } from '../../../../core/auth/services/auth-session.service';
import { LoginPage } from './login-page';

const player: AuthUser = {
  id: 1,
  name: 'Player',
  email: 'player@example.com',
  role: 'player',
  emailVerified: false,
  emailVerifiedAt: null,
  capabilities: { canAccessAdmin: false, canUsePlayerFeatures: true },
};

describe('LoginPage', () => {
  let session: {
    login: ReturnType<typeof vi.fn>;
    refreshSession: ReturnType<typeof vi.fn>;
  };
  let router: Router;

  beforeEach(async () => {
    session = {
      login: vi.fn(),
      refreshSession: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [
        provideRouter([]),
        { provide: API_BASE_URL, useValue: 'http://127.0.0.1:8000/api/v1' },
        AuthRedirectService,
        { provide: AuthSessionService, useValue: session },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: new Map([['returnUrl', '/jugador/compras']]) } },
        },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
  });

  function fillValidForm(fixture: ComponentFixture<LoginPage>): void {
    fixture.componentInstance.form.setValue({ email: 'player@example.com', password: 'secret123' });
  }

  async function flushNavigation(): Promise<void> {
    await Promise.resolve();
    await Promise.resolve();
  }

  it('shows validation errors before submit', () => {
    const fixture = TestBed.createComponent(LoginPage);
    fixture.componentInstance.submit();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Ingresa un correo');
  });

  it('renders public social login links from the audited backend routes', () => {
    const fixture = TestBed.createComponent(LoginPage);
    fixture.detectChanges();

    const anchors = (Array.from(
      fixture.nativeElement.querySelectorAll('.social-auth__button'),
    ) as HTMLAnchorElement[]).map((link) => link.getAttribute('href'));

    expect(anchors).toEqual([
      'http://127.0.0.1:8000/api/v1/auth/social/google/redirect',
      'http://127.0.0.1:8000/api/v1/auth/social/facebook/redirect',
    ]);
  });

  it('renders social auth below the primary submit button with icons', () => {
    const fixture = TestBed.createComponent(LoginPage);
    fixture.detectChanges();

    const submitButton = fixture.nativeElement.querySelector('form button[type="submit"]');
    const divider = fixture.nativeElement.querySelector('.social-auth__divider');
    const buttons = fixture.nativeElement.querySelectorAll('.social-auth__button');
    const icons = fixture.nativeElement.querySelectorAll('.social-auth__icon svg');

    expect(submitButton.textContent).toContain('Ingresar a mi cuenta');
    expect(submitButton.compareDocumentPosition(divider) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(divider.textContent).toContain('O continúa con');
    expect(buttons).toHaveLength(2);
    expect(icons).toHaveLength(2);
  });

  it('keeps the forgot-password and activation links visible', () => {
    const fixture = TestBed.createComponent(LoginPage);
    fixture.detectChanges();

    const links = (Array.from(
      fixture.nativeElement.querySelectorAll('.support-links a'),
    ) as HTMLAnchorElement[]).map((link) => link.textContent?.trim());

    expect(links).toEqual(['Olvidé mi contraseña', 'Activar invitación']);
  });

  it('submits credentials, redirects, and clears loading on success', async () => {
    session.login.mockReturnValue(of(player));
    const fixture = TestBed.createComponent(LoginPage);
    fillValidForm(fixture);

    fixture.componentInstance.submit();
    await flushNavigation();

    expect(session.login).toHaveBeenCalledWith({
      email: 'player@example.com',
      password: 'secret123',
    });
    expect(router.navigateByUrl).toHaveBeenCalledWith('/jugador/compras');
    expect(fixture.componentInstance.submitting()).toBe(false);
  });

  it('renders backend field errors', () => {
    session.login.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 422,
            error: {
              message: 'The provided credentials are invalid.',
              errors: { email: ['Credenciales inválidas.'] },
            },
          }),
      ),
    );
    const fixture = TestBed.createComponent(LoginPage);
    fillValidForm(fixture);

    fixture.componentInstance.submit();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Credenciales inválidas.');
    expect(fixture.componentInstance.submitting()).toBe(false);
  });

  it('turns mapper errors into controlled UI errors', () => {
    session.login.mockReturnValue(
      throwError(() => createInvalidAuthPayloadError('access_token is required')),
    );
    const fixture = TestBed.createComponent(LoginPage);
    fillValidForm(fixture);

    fixture.componentInstance.submit();
    fixture.detectChanges();

    expect(fixture.componentInstance.submitting()).toBe(false);
    expect(fixture.nativeElement.textContent).toContain(
      'Recibimos una respuesta de autenticación incompleta.',
    );
  });

  it('handles rejected redirects without leaving the login button loading', async () => {
    vi.spyOn(router, 'navigateByUrl').mockRejectedValueOnce(new Error('NavigationError'));
    session.login.mockReturnValue(of(player));
    const fixture = TestBed.createComponent(LoginPage);
    fillValidForm(fixture);

    fixture.componentInstance.submit();
    await flushNavigation();
    fixture.detectChanges();

    expect(fixture.componentInstance.submitting()).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('No pudimos abrir tu sesión.');
  });

  it('handles cancelled redirects without leaving the login button loading', async () => {
    vi.spyOn(router, 'navigateByUrl').mockResolvedValueOnce(false);
    session.login.mockReturnValue(of(player));
    const fixture = TestBed.createComponent(LoginPage);
    fillValidForm(fixture);

    fixture.componentInstance.submit();
    await flushNavigation();
    fixture.detectChanges();

    expect(fixture.componentInstance.submitting()).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('No pudimos abrir tu sesión.');
  });

  it('blocks double submit while the first login is pending', () => {
    const loginResult = new Subject<AuthUser>();
    session.login.mockReturnValue(loginResult.asObservable());
    const fixture = TestBed.createComponent(LoginPage);
    fillValidForm(fixture);

    fixture.componentInstance.submit();
    fixture.componentInstance.submit();

    expect(session.login).toHaveBeenCalledTimes(1);
  });

  it('reports a session change during a late login response', () => {
    session.login.mockReturnValue(
      throwError(() => new Error('AUTH_SESSION_CHANGED_DURING_LOGIN')),
    );
    const fixture = TestBed.createComponent(LoginPage);
    fillValidForm(fixture);

    fixture.componentInstance.submit();
    fixture.detectChanges();

    expect(fixture.componentInstance.submitting()).toBe(false);
    expect(fixture.nativeElement.textContent).toContain(
      'La sesión cambió antes de terminar el ingreso.',
    );
  });
});
