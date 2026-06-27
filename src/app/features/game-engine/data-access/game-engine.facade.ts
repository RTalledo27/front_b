import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ApiError, toApiError } from '../../../core/api/models/api-error.models';
import { AuthSessionService } from '../../../core/auth/services/auth-session.service';
import { AdminGameDetailView } from '../../admin-games/models/admin-games.models';
import { ADMIN_GAMES_REPOSITORY } from '../../admin-games/data-access/admin-games.repository';
import {
  GameEngineAccessMode,
  GameEngineConsoleView,
  GameEnginePageStatus,
  GameEngineWinnerView,
} from '../models/game-engine.models';
import { GAME_ENGINE_REPOSITORY } from './game-engine.repository';

@Injectable()
export class GameEngineFacade {
  private readonly adminGamesRepository = inject(ADMIN_GAMES_REPOSITORY);
  private readonly repository = inject(GAME_ENGINE_REPOSITORY);
  private readonly session = inject(AuthSessionService);
  private readonly destroyRef = inject(DestroyRef);

  private loadSequence = 0;
  private activeGameId = '';

  readonly snapshot = signal<GameEngineConsoleView | null>(null);
  readonly status = signal<GameEnginePageStatus>('idle');
  readonly error = signal<ApiError | null>(null);
  readonly accessMode = signal<GameEngineAccessMode>('contextual');

  load(gameId: string, accessMode: GameEngineAccessMode): void {
    const normalizedGameId = gameId.trim();
    if (normalizedGameId === '') {
      this.clear();
      return;
    }

    const hasLoadedSnapshot = this.snapshot()?.context.id === normalizedGameId;

    this.activeGameId = normalizedGameId;
    this.loadSequence += 1;
    this.accessMode.set(accessMode);
    this.error.set(null);
    this.status.set(hasLoadedSnapshot ? 'refreshing' : 'loading');

    if (!hasLoadedSnapshot) {
      this.snapshot.set(null);
    }

    const sequence = this.loadSequence;
    const requestUserId = this.session.user()?.id ?? null;

    forkJoin({
      context: this.adminGamesRepository.getGame(normalizedGameId),
      draws: this.repository.listDraws(normalizedGameId),
      counters: this.repository.listCounters(normalizedGameId),
      winner: this.loadWinnerOrNull(normalizedGameId),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ context, draws, counters, winner }) => {
          if (!this.isCurrentRequest(sequence, normalizedGameId, requestUserId)) {
            return;
          }

          this.snapshot.set({ context, draws, counters, winner });
          this.error.set(null);
          this.status.set('loaded');
        },
        error: (error: unknown) => {
          if (!this.isCurrentRequest(sequence, normalizedGameId, requestUserId)) {
            return;
          }

          const apiError = toApiError(error);
          this.snapshot.set(null);
          this.error.set(apiError);
          this.status.set(resolveGameEngineStatus(apiError));
        },
      });
  }

  refresh(): void {
    if (this.activeGameId !== '') {
      this.load(this.activeGameId, this.accessMode());
    }
  }

  clear(): void {
    this.activeGameId = '';
    this.loadSequence += 1;
    this.snapshot.set(null);
    this.error.set(null);
    this.status.set('idle');
    this.accessMode.set('contextual');
  }

  private loadWinnerOrNull(gameId: string) {
    return this.repository.getWinner(gameId).pipe(
      catchError((error: unknown) => {
        const apiError = toApiError(error);
        if (apiError.status === 404) {
          return of<GameEngineWinnerView | null>(null);
        }

        throw error;
      }),
    );
  }

  private isCurrentRequest(sequence: number, gameId: string, requestUserId: number | null): boolean {
    return (
      sequence === this.loadSequence &&
      gameId === this.activeGameId &&
      (this.session.user()?.id ?? null) === requestUserId
    );
  }
}

function resolveGameEngineStatus(error: ApiError): GameEnginePageStatus {
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
