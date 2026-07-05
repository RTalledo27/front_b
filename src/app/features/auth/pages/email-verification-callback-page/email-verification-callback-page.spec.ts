import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { AuthSessionService } from '../../../../core/auth/services/auth-session.service';
import { EmailVerificationFacade } from '../../data-access/email-verification.facade';
import { EmailVerificationCallbackPage } from './email-verification-callback-page';

describe('EmailVerificationCallbackPage', () => {
  let facade: {
    verifyStatus: ReturnType<typeof signal<'idle' | 'verifying' | 'success'>>;
    verifyMessage: ReturnType<typeof signal<string | null>>;
    verifyError: ReturnType<typeof signal<{ message: string } | null>>;
    verify: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    facade = {
      verifyStatus: signal<'idle' | 'verifying' | 'success'>('idle'),
      verifyMessage: signal<string | null>(null),
      verifyError: signal<{ message: string } | null>(null),
      verify: vi.fn(),
    };
  });

  it('auto-submits the signed verification when the user is authenticated', async () => {
    await TestBed.configureTestingModule({
      imports: [EmailVerificationCallbackPage],
      providers: [
        provideRouter([]),
        { provide: EmailVerificationFacade, useValue: facade },
        {
          provide: AuthSessionService,
          useValue: {
            isAuthenticated: computed(() => true),
          },
        },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: new Map([
                ['id', '12'],
                ['hash', 'email-hash'],
              ]),
              queryParamMap: new Map([
                ['expires', '1234567890'],
                ['signature', 'signed-value'],
              ]),
            },
          },
        },
      ],
    }).compileComponents();

    TestBed.createComponent(EmailVerificationCallbackPage);

    expect(facade.verify).toHaveBeenCalledWith({
      id: '12',
      hash: 'email-hash',
      expires: '1234567890',
      signature: 'signed-value',
    });
  });

  it('renders the login CTA when there is no authenticated session', async () => {
    await TestBed.configureTestingModule({
      imports: [EmailVerificationCallbackPage],
      providers: [
        provideRouter([]),
        { provide: EmailVerificationFacade, useValue: facade },
        {
          provide: AuthSessionService,
          useValue: {
            isAuthenticated: computed(() => false),
          },
        },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: new Map([
                ['id', '12'],
                ['hash', 'email-hash'],
              ]),
              queryParamMap: new Map([
                ['expires', '1234567890'],
                ['signature', 'signed-value'],
              ]),
            },
          },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(EmailVerificationCallbackPage);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Necesitas una sesión activa para completar la verificación de correo.',
    );
  });
});
