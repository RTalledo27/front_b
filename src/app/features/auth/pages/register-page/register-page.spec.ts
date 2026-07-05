import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { API_BASE_URL } from '../../../../core/api/api.config';
import { RegisterPage } from './register-page';
import { AuthRedirectService } from '../../../../core/auth/services/auth-redirect.service';
import { AuthSessionService } from '../../../../core/auth/services/auth-session.service';
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

describe('RegisterPage', () => {
  let session: { register: ReturnType<typeof vi.fn> };
  let router: Router;

  beforeEach(async () => {
    session = { register: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [RegisterPage],
      providers: [
        provideRouter([]),
        { provide: API_BASE_URL, useValue: 'http://127.0.0.1:8000/api/v1' },
        AuthRedirectService,
        { provide: AuthSessionService, useValue: session },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
  });

  it('blocks submit when passwords do not match', () => {
    const fixture = TestBed.createComponent(RegisterPage);
    fixture.componentInstance.form.setValue({
      name: 'Player',
      email: 'player@example.com',
      password: 'secret123',
      password_confirmation: 'secret124',
    });

    fixture.componentInstance.submit();
    fixture.detectChanges();

    expect(session.register).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Las contraseñas no coinciden.');
  });

  it('registers and redirects on success', () => {
    session.register.mockReturnValue(of(player));
    const fixture = TestBed.createComponent(RegisterPage);
    fixture.componentInstance.form.setValue({
      name: 'Player',
      email: 'player@example.com',
      password: 'secret123',
      password_confirmation: 'secret123',
    });

    fixture.componentInstance.submit();

    expect(session.register).toHaveBeenCalled();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/verifica-tu-correo');
  });

  it('renders social auth below the primary submit button with real provider links and icons', () => {
    const fixture = TestBed.createComponent(RegisterPage);
    fixture.detectChanges();

    const submitButton = fixture.nativeElement.querySelector('form button[type="submit"]');
    const divider = fixture.nativeElement.querySelector('.social-auth__divider');
    const buttons = Array.from(
      fixture.nativeElement.querySelectorAll('.social-auth__button'),
    ) as HTMLAnchorElement[];
    const hrefs = buttons.map((link) => link.getAttribute('href'));
    const icons = fixture.nativeElement.querySelectorAll('.social-auth__icon svg');

    expect(submitButton.textContent).toContain('Crear cuenta');
    expect(submitButton.compareDocumentPosition(divider) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(divider.textContent).toContain('O regístrate con');
    expect(hrefs).toEqual([
      'http://127.0.0.1:8000/api/v1/auth/social/google/redirect',
      'http://127.0.0.1:8000/api/v1/auth/social/facebook/redirect',
    ]);
    expect(icons).toHaveLength(2);
  });

  it('keeps the login and activation links visible', () => {
    const fixture = TestBed.createComponent(RegisterPage);
    fixture.detectChanges();

    const links = (Array.from(
      fixture.nativeElement.querySelectorAll('.links a'),
    ) as HTMLAnchorElement[]).map((link) => link.textContent?.trim());

    expect(links).toEqual(['Ya tengo cuenta', 'Activar invitación']);
  });

  it('shows backend validation errors', () => {
    session.register.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 422,
            error: {
              message: 'Validation failed.',
              errors: { email: ['El correo ya esta en uso.'] },
            },
          }),
      ),
    );
    const fixture = TestBed.createComponent(RegisterPage);
    fixture.componentInstance.form.setValue({
      name: 'Player',
      email: 'player@example.com',
      password: 'secret123',
      password_confirmation: 'secret123',
    });

    fixture.componentInstance.submit();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('El correo ya esta en uso.');
  });
});
