import { inject, Injectable, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { ApiError } from '../../../core/api/models/api-error.models';
import { AdminPlayerInvitationView, CreateAdminPlayerPayload } from '../models/admin-players.models';
import { resolveAdminPlayersError } from './admin-players.mapper';
import { ADMIN_PLAYERS_REPOSITORY } from './admin-players.repository';

export type AdminPlayerOnboardingStatus =
  | 'idle'
  | 'submitting'
  | 'success'
  | 'unauthorized'
  | 'forbidden'
  | 'validationError'
  | 'rateLimited'
  | 'networkError'
  | 'unexpectedError';

@Injectable()
export class AdminPlayersFacade {
  private readonly repository = inject(ADMIN_PLAYERS_REPOSITORY);

  readonly status = signal<AdminPlayerOnboardingStatus>('idle');
  readonly result = signal<AdminPlayerInvitationView | null>(null);
  readonly error = signal<ApiError | null>(null);

  submit(payload: CreateAdminPlayerPayload): void {
    if (this.status() === 'submitting') {
      return;
    }

    this.status.set('submitting');
    this.result.set(null);
    this.error.set(null);

    this.repository
      .createPlayer(payload)
      .pipe(finalize(() => this.finalizeLoading()))
      .subscribe({
        next: (result) => {
          this.result.set(result);
          this.status.set('success');
        },
        error: (error: unknown) => {
          const apiError = resolveAdminPlayersError(error);
          this.error.set(apiError);
          this.status.set(mapAdminPlayerErrorStatus(apiError.status));
        },
      });
  }

  reset(): void {
    this.status.set('idle');
    this.result.set(null);
    this.error.set(null);
  }

  private finalizeLoading(): void {
    if (this.status() === 'submitting') {
      this.status.set('idle');
    }
  }
}

function mapAdminPlayerErrorStatus(status: number): AdminPlayerOnboardingStatus {
  switch (status) {
    case 401:
      return 'unauthorized';
    case 403:
      return 'forbidden';
    case 422:
      return 'validationError';
    case 429:
      return 'rateLimited';
    case 0:
      return 'networkError';
    default:
      return 'unexpectedError';
  }
}
