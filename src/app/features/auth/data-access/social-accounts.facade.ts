import { inject, Injectable, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { ApiError, toApiError } from '../../../core/api/models/api-error.models';
import { AuthRepository } from '../../../core/auth/data-access/auth.repository';
import {
  LinkedSocialAccount,
  SocialProvider,
  UnlinkSocialAccountRequestPayload,
} from '../../../core/auth/models/auth.models';
import { mapLinkedSocialAccountsResponse } from '../../../core/auth/services/auth-identity.mapper';

export type SocialAccountsStatus =
  | 'idle'
  | 'loading'
  | 'loaded'
  | 'empty'
  | 'unauthorized'
  | 'networkError'
  | 'unexpectedError';

@Injectable({ providedIn: 'root' })
export class SocialAccountsFacade {
  private readonly repository = inject(AuthRepository);

  readonly status = signal<SocialAccountsStatus>('idle');
  readonly accounts = signal<readonly LinkedSocialAccount[]>([]);
  readonly error = signal<ApiError | null>(null);
  readonly message = signal<string | null>(null);
  readonly pendingProvider = signal<SocialProvider | null>(null);

  load(): void {
    if (this.status() === 'loading') {
      return;
    }

    this.status.set('loading');
    this.error.set(null);

    this.repository
      .socialAccounts()
      .pipe(finalize(() => this.finalizeLoadState()))
      .subscribe({
        next: (response) => {
          const accounts = mapLinkedSocialAccountsResponse(response);
          this.accounts.set(accounts);
          this.status.set(accounts.length > 0 ? 'loaded' : 'empty');
        },
        error: (error: unknown) => {
          const apiError = toApiError(error);
          this.error.set(apiError);
          this.status.set(mapSocialAccountsStatus(apiError));
        },
      });
  }

  unlink(provider: SocialProvider, payload: UnlinkSocialAccountRequestPayload): void {
    if (this.pendingProvider() !== null) {
      return;
    }

    this.pendingProvider.set(provider);
    this.message.set(null);
    this.error.set(null);

    this.repository
      .unlinkSocialAccount(provider, payload)
      .pipe(finalize(() => this.pendingProvider.set(null)))
      .subscribe({
        next: (response) => {
          this.message.set(response.message);
          this.load();
        },
        error: (error: unknown) => {
          this.error.set(toApiError(error));
        },
      });
  }

  clearFeedback(): void {
    this.message.set(null);
    this.error.set(null);
  }

  private finalizeLoadState(): void {
    if (this.status() === 'loading') {
      this.status.set(this.accounts().length > 0 ? 'loaded' : 'empty');
    }
  }
}

function mapSocialAccountsStatus(error: ApiError): SocialAccountsStatus {
  if (error.status === 401) {
    return 'unauthorized';
  }

  if (error.status === 0) {
    return 'networkError';
  }

  return 'unexpectedError';
}
