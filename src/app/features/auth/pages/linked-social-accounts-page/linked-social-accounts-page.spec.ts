import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { AuthSessionService } from '../../../../core/auth/services/auth-session.service';
import { SocialAccountsFacade } from '../../data-access/social-accounts.facade';
import { LinkedSocialAccountsPage } from './linked-social-accounts-page';

describe('LinkedSocialAccountsPage', () => {
  let facade: {
    status: ReturnType<typeof signal<'loaded' | 'idle'>>;
    accounts: ReturnType<
      typeof signal<
        readonly {
          provider: 'google';
          providerEmailMasked: string | null;
          providerEmailVerified: boolean;
          linkedAt: string | null;
          canUnlink: boolean;
        }[]
      >
    >;
    error: ReturnType<typeof signal<{ message: string; code?: string | null } | null>>;
    message: ReturnType<typeof signal<string | null>>;
    pendingProvider: ReturnType<typeof signal<'google' | 'facebook' | null>>;
    load: ReturnType<typeof vi.fn>;
    unlink: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    facade = {
      status: signal<'loaded' | 'idle'>('loaded'),
      accounts: signal([
        {
          provider: 'google' as const,
          providerEmailMasked: 'jo***@gmail.com',
          providerEmailVerified: true,
          linkedAt: '2026-07-05T00:00:00Z',
          canUnlink: true,
        },
      ]),
      error: signal<{ message: string; code?: string | null } | null>(null),
      message: signal<string | null>(null),
      pendingProvider: signal<'google' | 'facebook' | null>(null),
      load: vi.fn(),
      unlink: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [LinkedSocialAccountsPage],
      providers: [
        provideRouter([]),
        { provide: SocialAccountsFacade, useValue: facade },
        {
          provide: AuthSessionService,
          useValue: {
            abilities: signal(['social_reauth']),
            user: signal(null),
            isAuthenticated: computed(() => true),
          },
        },
        {
          provide: ActivatedRoute,
          useValue: {
            queryParamMap: ofQueryParamMap(),
          },
        },
      ],
    }).compileComponents();
  });

  it('loads the façade on init and submits unlink with the provider password field', () => {
    const fixture = TestBed.createComponent(LinkedSocialAccountsPage);
    fixture.detectChanges();

    expect(facade.load).toHaveBeenCalledTimes(1);
    fixture.componentInstance.form.controls.google.setValue('secret123');
    fixture.componentInstance.unlink('google');

    expect(facade.unlink).toHaveBeenCalledWith('google', { current_password: 'secret123' });
  });
});

function ofQueryParamMap() {
  return {
    pipe: () => ({
      subscribe: (callback: (params: { get(name: string): string | null }) => void) => {
        callback({ get: () => null });
      },
    }),
  };
}
