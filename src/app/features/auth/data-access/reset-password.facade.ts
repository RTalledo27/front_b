import { inject, Injectable, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { ApiError, toApiError } from '../../../core/api/models/api-error.models';
import { AuthSessionService } from '../../../core/auth/services/auth-session.service';
import { ResetPasswordRequestPayload } from '../../../core/auth/models/auth.models';

export type ResetPasswordStatus =
  | 'idle'
  | 'submitting'
  | 'success'
  | 'validationError'
  | 'rateLimited'
  | 'networkError'
  | 'unexpectedError';

@Injectable({ providedIn: 'root' })
export class ResetPasswordFacade {
  private readonly session = inject(AuthSessionService);

  readonly status = signal<ResetPasswordStatus>('idle');
  readonly message = signal<string | null>(null);
  readonly error = signal<ApiError | null>(null);

  submit(payload: ResetPasswordRequestPayload): void {
    if (this.status() === 'submitting') {
      return;
    }

    this.status.set('submitting');
    this.message.set(null);
    this.error.set(null);

    this.session
      .resetPassword(payload)
      .pipe(finalize(() => this.finalizeIdleState()))
      .subscribe({
        next: (response) => {
          this.message.set(response.message);
          this.status.set('success');
        },
        error: (error: unknown) => {
          const apiError = toApiError(error);
          this.error.set(apiError);
          this.status.set(mapResetPasswordErrorStatus(apiError));
        },
      });
  }

  reset(): void {
    this.status.set('idle');
    this.message.set(null);
    this.error.set(null);
  }

  private finalizeIdleState(): void {
    if (this.status() === 'submitting') {
      this.status.set('idle');
    }
  }
}

function mapResetPasswordErrorStatus(error: ApiError): ResetPasswordStatus {
  if (error.status === 422) {
    return 'validationError';
  }

  if (error.status === 429) {
    return 'rateLimited';
  }

  if (error.status === 0) {
    return 'networkError';
  }

  return 'unexpectedError';
}
