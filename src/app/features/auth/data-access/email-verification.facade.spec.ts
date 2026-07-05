import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AuthRepository } from '../../../core/auth/data-access/auth.repository';
import { AuthSessionService } from '../../../core/auth/services/auth-session.service';
import { EmailVerificationFacade } from './email-verification.facade';

describe('EmailVerificationFacade', () => {
  let facade: EmailVerificationFacade;
  let repository: {
    resendVerificationEmail: ReturnType<typeof vi.fn>;
    verifyEmail: ReturnType<typeof vi.fn>;
  };
  let session: { refreshSession: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    repository = {
      resendVerificationEmail: vi.fn(),
      verifyEmail: vi.fn(),
    };
    session = {
      refreshSession: vi.fn(() => of(null)),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthRepository, useValue: repository },
        { provide: AuthSessionService, useValue: session },
      ],
    });

    facade = TestBed.inject(EmailVerificationFacade);
  });

  it('keeps the secure resend message from backend', () => {
    repository.resendVerificationEmail.mockReturnValue(
      of({
        message: 'Si tu correo aún no está verificado, enviaremos un enlace de verificación.',
      }),
    );

    facade.resend();

    expect(facade.resendStatus()).toBe('success');
    expect(facade.resendMessage()).toContain('aún no está verificado');
  });

  it('marks signed verification as success and refreshes the local session', () => {
    repository.verifyEmail.mockReturnValue(
      of({
        message: 'Correo verificado correctamente.',
        email_verified: true,
      }),
    );

    facade.verify({
      id: '12',
      hash: 'email-hash',
      expires: '1234567890',
      signature: 'signed-value',
    });

    expect(facade.verifyStatus()).toBe('success');
    expect(facade.verifyMessage()).toBe('Correo verificado correctamente.');
    expect(session.refreshSession).toHaveBeenCalledTimes(1);
  });

  it('maps invalid signed URLs to the invalid state', () => {
    repository.verifyEmail.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 422,
            error: { code: 'email_verification_invalid', message: 'Enlace inválido.' },
          }),
      ),
    );

    facade.verify({
      id: '12',
      hash: 'email-hash',
      expires: '1234567890',
      signature: 'signed-value',
    });

    expect(facade.verifyStatus()).toBe('invalid');
  });
});
