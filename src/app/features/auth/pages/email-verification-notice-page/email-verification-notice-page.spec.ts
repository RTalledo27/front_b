import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthSessionService } from '../../../../core/auth/services/auth-session.service';
import { EmailVerificationFacade } from '../../data-access/email-verification.facade';
import { EmailVerificationNoticePage } from './email-verification-notice-page';

describe('EmailVerificationNoticePage', () => {
  let facade: {
    resendStatus: ReturnType<typeof signal<'idle' | 'submitting' | 'success'>>;
    resendMessage: ReturnType<typeof signal<string | null>>;
    resendError: ReturnType<typeof signal<{ message: string } | null>>;
    resend: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    facade = {
      resendStatus: signal<'idle' | 'submitting' | 'success'>('idle'),
      resendMessage: signal<string | null>(null),
      resendError: signal<{ message: string } | null>(null),
      resend: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [EmailVerificationNoticePage],
      providers: [
        provideRouter([]),
        { provide: EmailVerificationFacade, useValue: facade },
        {
          provide: AuthSessionService,
          useValue: {
            user: signal({
              id: 1,
              name: 'Player',
              email: 'player@example.com',
              role: 'player',
              emailVerified: false,
              emailVerifiedAt: null,
              capabilities: { canAccessAdmin: false, canUsePlayerFeatures: true },
            }),
            isAuthenticated: computed(() => true),
          },
        },
      ],
    }).compileComponents();
  });

  it('renders the authenticated email and triggers resend on click', () => {
    const fixture = TestBed.createComponent(EmailVerificationNoticePage);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('player@example.com');
    expect(fixture.nativeElement.textContent).toContain(
      'Activar tu invitación crea tu acceso, pero no reemplaza la verificación del correo.',
    );
    fixture.nativeElement.querySelector('button')?.click();
    expect(facade.resend).toHaveBeenCalledTimes(1);
  });
});
