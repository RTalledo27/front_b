import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AuthSessionService } from '../../../core/auth/services/auth-session.service';
import { ResetPasswordFacade } from './reset-password.facade';

describe('ResetPasswordFacade', () => {
  let facade: ResetPasswordFacade;
  let session: { resetPassword: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    session = { resetPassword: vi.fn() };

    TestBed.configureTestingModule({
      providers: [{ provide: AuthSessionService, useValue: session }],
    });

    facade = TestBed.inject(ResetPasswordFacade);
  });

  it('stores the backend success message after a valid reset', () => {
    session.resetPassword.mockReturnValue(of({ message: 'Contraseña actualizada correctamente.' }));

    facade.submit({
      email: 'player@example.com',
      token: 'plain-token',
      password: 'secret123',
      password_confirmation: 'secret123',
    });

    expect(facade.status()).toBe('success');
    expect(facade.message()).toBe('Contraseña actualizada correctamente.');
  });

  it('maps invalid reset attempts as validation errors', () => {
    session.resetPassword.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 422,
            error: { error: 'password_reset_invalid', message: 'El token ya no es válido.' },
          }),
      ),
    );

    facade.submit({
      email: 'player@example.com',
      token: 'bad-token',
      password: 'secret123',
      password_confirmation: 'secret123',
    });

    expect(facade.status()).toBe('validationError');
    expect(facade.error()?.code).toBe('password_reset_invalid');
  });
});
