import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiError, toApiError } from '../../../core/api/models/api-error.models';
import { PublicGame, ViewStatus } from '../models/public-game.models';
import { PUBLIC_GAMES_REPOSITORY } from './public-games.repository';

@Injectable()
export class PublicGameDetailFacade {
  private readonly repository = inject(PUBLIC_GAMES_REPOSITORY);
  private readonly destroyRef = inject(DestroyRef);

  readonly game = signal<PublicGame | null>(null);
  readonly status = signal<ViewStatus>('idle');
  readonly error = signal<ApiError | null>(null);

  load(slug: string): void {
    this.status.set('loading');
    this.error.set(null);
    this.game.set(null);

    this.repository
      .getBySlug(slug)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (game) => {
          this.game.set(game);
          this.status.set('success');
        },
        error: (error: unknown) => {
          this.error.set(toApiError(error));
          this.status.set('error');
        },
      });
  }
}