import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AuthRepository } from '../../../core/auth/data-access/auth.repository';
import { SocialAccountsFacade } from './social-accounts.facade';

describe('SocialAccountsFacade', () => {
  let facade: SocialAccountsFacade;
  let repository: {
    socialAccounts: ReturnType<typeof vi.fn>;
    unlinkSocialAccount: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    repository = {
      socialAccounts: vi.fn(),
      unlinkSocialAccount: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [{ provide: AuthRepository, useValue: repository }],
    });

    facade = TestBed.inject(SocialAccountsFacade);
  });

  it('loads the canonical linked social accounts resource', () => {
    repository.socialAccounts.mockReturnValue(
      of({
        data: [
          {
            provider: 'google',
            provider_email_masked: 'jo***@gmail.com',
            provider_email_verified: true,
            linked_at: '2026-07-05T00:00:00Z',
            can_unlink: true,
          },
        ],
      }),
    );

    facade.load();

    expect(facade.status()).toBe('loaded');
    expect(facade.accounts()).toHaveLength(1);
    expect(facade.accounts()[0]?.provider).toBe('google');
  });

  it('maps 401 as unauthorized while loading accounts', () => {
    repository.socialAccounts.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' })),
    );

    facade.load();

    expect(facade.status()).toBe('unauthorized');
  });

  it('reloads accounts after a successful unlink', () => {
    repository.socialAccounts
      .mockReturnValueOnce(
        of({
          data: [
            {
              provider: 'google',
              provider_email_masked: 'jo***@gmail.com',
              provider_email_verified: true,
              linked_at: '2026-07-05T00:00:00Z',
              can_unlink: true,
            },
          ],
        }),
      )
      .mockReturnValueOnce(of({ data: [] }));

    repository.unlinkSocialAccount.mockReturnValue(
      of({ message: 'Social account unlinked successfully.', provider: 'google' }),
    );

    facade.load();
    facade.unlink('google', { current_password: 'secret123' });

    expect(repository.unlinkSocialAccount).toHaveBeenCalledWith('google', {
      current_password: 'secret123',
    });
    expect(repository.socialAccounts).toHaveBeenCalledTimes(2);
  });
});
