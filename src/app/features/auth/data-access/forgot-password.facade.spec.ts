import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { AuthSessionService } from '../../../core/auth/services/auth-session.service';
import { ForgotPasswordFacade } from './forgot-password.facade';

describe('ForgotPasswordFacade', () => {
  let facade: ForgotPasswordFacade;
  let session: { forgotPassword: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    session = { forgotPassword: vi.fn() };

    TestBed.configureTestingModule({
      providers: [{ provide: AuthSessionService, useValue: session }],
    });

    facade = TestBed.inject(ForgotPasswordFacade);
  });

  it('stores the secure success message from backend', () => {
    session.forgotPassword.mockReturnValue(
      of({
        message: 'Si el correo existe, enviaremos instrucciones para restablecer la contraseña.',
      }),
    );

    facade.submit('player@example.com');

    expect(facade.status()).toBe('success');
    expect(facade.message()).toContain('Si el correo existe');
  });

  it('maps validation errors and clears the loading state', () => {
    session.forgotPassword.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 422,
            error: { message: 'Validation failed.', errors: { email: ['Correo inválido.'] } },
          }),
      ),
    );

    facade.submit('bad-email');

    expect(facade.status()).toBe('validationError');
    expect(facade.error()?.fieldErrors['email']).toEqual(['Correo inválido.']);
  });

  it('blocks a second submit while the first request is still pending', () => {
    const pending = new Subject<{ message: string }>();
    session.forgotPassword.mockReturnValue(pending.asObservable());

    facade.submit('player@example.com');
    facade.submit('player@example.com');

    expect(session.forgotPassword).toHaveBeenCalledTimes(1);
  });
});
