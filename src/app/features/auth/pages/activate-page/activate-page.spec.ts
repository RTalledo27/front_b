import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ActivatePage } from './activate-page';
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

describe('ActivatePage', () => {
  let session: { activate: ReturnType<typeof vi.fn> };
  let router: Router;

  beforeEach(async () => {
    session = { activate: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [ActivatePage],
      providers: [
        provideRouter([]),
        AuthRedirectService,
        { provide: AuthSessionService, useValue: session },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: new Map([['token', 'invitation-token']]) } },
        },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
  });

  it('prefills the token from the query string', () => {
    const fixture = TestBed.createComponent(ActivatePage);

    expect(fixture.componentInstance.form.controls.token.value).toBe('invitation-token');
  });

  it('activates the invitation and redirects on success', () => {
    session.activate.mockReturnValue(of(player));
    const fixture = TestBed.createComponent(ActivatePage);
    fixture.componentInstance.form.patchValue({
      password: 'secret123',
      password_confirmation: 'secret123',
    });

    fixture.componentInstance.submit();

    expect(session.activate).toHaveBeenCalled();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/jugador/inicio');
  });

  it('shows a friendly message for expired invitations', () => {
    session.activate.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 422,
            error: {
              message: 'Invalid token.',
              error: 'invalid_activation_token',
              reason: 'expired',
            },
          }),
      ),
    );
    const fixture = TestBed.createComponent(ActivatePage);
    fixture.componentInstance.form.patchValue({
      password: 'secret123',
      password_confirmation: 'secret123',
    });

    fixture.componentInstance.submit();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('La invitacion expiro.');
  });
});
