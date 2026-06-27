import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiError } from '../../../core/api/models/api-error.models';
import { AuthSessionService } from '../../../core/auth/services/auth-session.service';
import {
  AdminGameDetailStatus,
  AdminGameDetailView,
} from '../models/admin-games.models';
import { ADMIN_GAMES_REPOSITORY } from './admin-games.repository';
import { resolveAdminGamesError } from './admin-games.facade';

@Injectable()
export class AdminGameDetailFacade {
  private readonly repository = inject(ADMIN_GAMES_REPOSITORY);
  private readonly session = inject(AuthSessionService);
  private readonly destroyRef = inject(DestroyRef);

  private loadSequence = 0;
  private activeGameId = '';

  readonly game = signal<AdminGameDetailView | null>(null);
  readonly status = signal<AdminGameDetailStatus>('idle');
  readonly error = signal<ApiError | null>(null);

  load(gameId: string): void {
    const normalizedGameId = gameId.trim();
    this.activeGameId = normalizedGameId;
    this.loadSequence += 1;
    this.game.set(null);
    this.error.set(null);
    this.status.set('loading');

    const sequence = this.loadSequence;
    const requestUserId = this.session.user()?.id ?? null;

    this.repository
      .getGame(normalizedGameId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (game) => {
          if (!this.isCurrentRequest(sequence, normalizedGameId, requestUserId)) {
            return;
          }

          this.game.set(game);
          this.error.set(null);
          this.status.set('loaded');
        },
        error: (error: unknown) => {
          if (!this.isCurrentRequest(sequence, normalizedGameId, requestUserId)) {
            return;
          }

          const apiError = resolveAdminGamesError(error);
          this.game.set(null);
          this.error.set(apiError);
          this.status.set(resolveDetailStatus(apiError));
        },
      });
  }

  retry(): void {
    if (this.activeGameId !== '') {
      this.load(this.activeGameId);
    }
  }

  private isCurrentRequest(sequence: number, gameId: string, requestUserId: number | null): boolean {
    return (
      sequence === this.loadSequence &&
      gameId === this.activeGameId &&
      (this.session.user()?.id ?? null) === requestUserId
    );
  }
}

function resolveDetailStatus(error: ApiError): AdminGameDetailStatus {
  switch (error.status) {
    case 401:
      return 'unauthorized';
    case 403:
      return 'forbidden';
    case 404:
      return 'notFound';
    case 0:
      return 'networkError';
    default:
      return 'unexpectedError';
  }
}
