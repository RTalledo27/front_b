import { inject, Injectable, signal } from '@angular/core';
import { catchError, finalize, of } from 'rxjs';
import { ApiError, toApiError } from '../../../core/api/models/api-error.models';
import { AuthRepository } from '../../../core/auth/data-access/auth.repository';
import { VerifyEmailRequestPayload } from '../../../core/auth/models/auth.models';
import { AuthSessionService } from '../../../core/auth/services/auth-session.service';

export type ResendVerificationStatus =
  | 'idle'
  | 'submitting'
  | 'success'
  | 'unauthorized'
  | 'rateLimited'
  | 'networkError'
  | 'unexpectedError';

export type VerifyEmailStatus =
  | 'idle'
  | 'verifying'
  | 'success'
  | 'invalid'
  | 'unauthorized'
  | 'rateLimited'
  | 'networkError'
  | 'unexpectedError';

@Injectable({ providedIn: 'root' })
export class EmailVerificationFacade {
  private readonly repository = inject(AuthRepository);
  private readonly session = inject(AuthSessionService);

  readonly resendStatus = signal<ResendVerificationStatus>('idle');
  readonly resendMessage = signal<string | null>(null);
  readonly resendError = signal<ApiError | null>(null);

  readonly verifyStatus = signal<VerifyEmailStatus>('idle');
  readonly verifyMessage = signal<string | null>(null);
  readonly verifyError = signal<ApiError | null>(null);

  resend(): void {
    if (this.resendStatus() === 'submitting') {
      return;
    }

    this.resendStatus.set('submitting');
    this.resendMessage.set(null);
    this.resendError.set(null);

    this.repository
      .resendVerificationEmail()
      .pipe(finalize(() => this.finalizeResendState()))
      .subscribe({
        next: (response) => {
          this.resendMessage.set(response.message);
          this.resendStatus.set('success');
        },
        error: (error: unknown) => {
          const apiError = toApiError(error);
          this.resendError.set(apiError);
          this.resendStatus.set(mapResendStatus(apiError));
        },
      });
  }

  verify(payload: VerifyEmailRequestPayload): void {
    if (this.verifyStatus() === 'verifying') {
      return;
    }

    this.verifyStatus.set('verifying');
    this.verifyMessage.set(null);
    this.verifyError.set(null);

    this.repository
      .verifyEmail(payload)
      .pipe(
        catchError((error: unknown) => {
          const apiError = toApiError(error);
          this.verifyError.set(apiError);
          this.verifyStatus.set(mapVerifyStatus(apiError));
          return of(null);
        }),
        finalize(() => this.finalizeVerifyState()),
      )
      .subscribe((response) => {
        if (response === null) {
          return;
        }

        this.verifyMessage.set(response.message);
        this.verifyStatus.set('success');
        this.session
          .refreshSession()
          .pipe(catchError(() => of(null)))
          .subscribe();
      });
  }

  resetVerifyState(): void {
    this.verifyStatus.set('idle');
    this.verifyMessage.set(null);
    this.verifyError.set(null);
  }

  private finalizeResendState(): void {
    if (this.resendStatus() === 'submitting') {
      this.resendStatus.set('idle');
    }
  }

  private finalizeVerifyState(): void {
    if (this.verifyStatus() === 'verifying') {
      this.verifyStatus.set('idle');
    }
  }
}

function mapResendStatus(error: ApiError): ResendVerificationStatus {
  if (error.status === 401) {
    return 'unauthorized';
  }

  if (error.status === 429) {
    return 'rateLimited';
  }

  if (error.status === 0) {
    return 'networkError';
  }

  return 'unexpectedError';
}

function mapVerifyStatus(error: ApiError): VerifyEmailStatus {
  if (error.status === 401) {
    return 'unauthorized';
  }

  if (error.status === 422) {
    return 'invalid';
  }

  if (error.status === 429) {
    return 'rateLimited';
  }

  if (error.status === 0) {
    return 'networkError';
  }

  return 'unexpectedError';
}
