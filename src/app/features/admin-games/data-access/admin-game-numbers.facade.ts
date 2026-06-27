import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiError } from '../../../core/api/models/api-error.models';
import { AuthSessionService } from '../../../core/auth/services/auth-session.service';
import {
  AdminGameNumbersQuery,
  AdminGameNumbersResult,
  AdminGameNumbersStatus,
} from '../models/admin-games.models';
import { isAdminGameNumbersInvalidPayloadError } from './admin-game-numbers.mapper';
import { ADMIN_GAMES_REPOSITORY } from './admin-games.repository';
import { resolveAdminGamesError } from './admin-games.facade';

@Injectable()
export class AdminGameNumbersFacade {
  private readonly repository = inject(ADMIN_GAMES_REPOSITORY);
  private readonly session = inject(AuthSessionService);
  private readonly destroyRef = inject(DestroyRef);

  private loadSequence = 0;
  private activeGameId = '';

  readonly numbers = signal<AdminGameNumbersResult['numbers']>([]);
  readonly status = signal<AdminGameNumbersStatus>('idle');
  readonly error = signal<ApiError | null>(null);
  readonly hasNumbers = computed(() => this.numbers().length > 0);

  load(gameId: string, query: AdminGameNumbersQuery = {}): void {
    const normalizedGameId = gameId.trim();
    const shouldRefresh = this.numbers().length > 0 && this.activeGameId === normalizedGameId;

    this.activeGameId = normalizedGameId;
    this.loadSequence += 1;
    this.numbers.set([]);
    this.error.set(null);
    this.status.set(shouldRefresh ? 'refreshing' : 'loading');

    const sequence = this.loadSequence;
    const requestUserId = this.session.user()?.id ?? null;

    this.repository
      .listGameNumbers(normalizedGameId, query)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          if (!this.isCurrentRequest(sequence, normalizedGameId, requestUserId)) {
            return;
          }

          this.numbers.set(result.numbers);
          this.error.set(null);
          this.status.set(result.numbers.length > 0 ? 'loaded' : 'empty');
        },
        error: (error: unknown) => {
          if (!this.isCurrentRequest(sequence, normalizedGameId, requestUserId)) {
            return;
          }

          const apiError = resolveAdminGameNumbersError(error);
          this.numbers.set([]);
          this.error.set(apiError);
          this.status.set(resolveNumbersStatus(apiError));
        },
      });
  }

  reload(): void {
    if (this.activeGameId !== '') {
      this.load(this.activeGameId);
    }
  }

  reset(): void {
    this.activeGameId = '';
    this.loadSequence += 1;
    this.numbers.set([]);
    this.error.set(null);
    this.status.set('idle');
  }

  private isCurrentRequest(sequence: number, gameId: string, requestUserId: number | null): boolean {
    return (
      sequence === this.loadSequence &&
      gameId === this.activeGameId &&
      (this.session.user()?.id ?? null) === requestUserId
    );
  }
}

export function resolveAdminGameNumbersError(error: unknown): ApiError {
  if (isAdminGameNumbersInvalidPayloadError(error)) {
    return {
      status: 500,
      code: 'invalid_payload',
      message: 'Recibimos una respuesta incompleta de los números administrativos.',
      fieldErrors: {},
      reason: null,
    };
  }

  return resolveAdminGamesError(error);
}

function resolveNumbersStatus(error: ApiError): AdminGameNumbersStatus {
  switch (error.status) {
    case 401:
      return 'unauthorized';
    case 403:
      return 'forbidden';
    case 404:
      return 'notFound';
    case 422:
      return 'validationError';
    case 0:
      return 'networkError';
    default:
      return 'unexpectedError';
  }
}
