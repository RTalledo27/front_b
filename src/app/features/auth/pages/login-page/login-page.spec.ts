import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { LoginPage } from './login-page';
import { AuthSessionService } from '../../../../core/auth/services/auth-session.service';
import { AuthRedirectService } from '../../../../core/auth/services/auth-redirect.service';
import { AuthUser } from '../../../../core/auth/models/auth.models';

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

  it('shows validation errors before submit', () => {
    const fixture = TestBed.createComponent(LoginPage);
    fixture.componentInstance.submit();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Ingresa un correo');
  });

  it('submits credentials and redirects on success', () => {
    session.login.mockReturnValue(of(player));
    const fixture = TestBed.createComponent(LoginPage);
    fixture.componentInstance.form.setValue({ email: 'player@example.com', password: 'secret123' });

    fixture.componentInstance.submit();

    expect(session.login).toHaveBeenCalledWith({
      email: 'player@example.com',
      password: 'secret123',
    });
    expect(router.navigateByUrl).toHaveBeenCalledWith('/jugador/compras');
  });

  it('renders backend field errors', () => {
    session.login.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 422,
            error: {
              message: 'The provided credentials are invalid.',
              errors: { email: ['Credenciales invalidas.'] },
            },
          }),
      ),
    );
    const fixture = TestBed.createComponent(LoginPage);
    fixture.componentInstance.form.setValue({ email: 'player@example.com', password: 'secret123' });

    fixture.componentInstance.submit();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Credenciales invalidas.');
  });
});
