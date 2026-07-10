import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiError, toApiError } from '../../../core/api/models/api-error.models';
import { PublicGame, ViewStatus } from '../models/public-game.models';
import { PUBLIC_GAMES_REPOSITORY } from './public-games.repository';

@Injectable()
export class PublicGameDetailFacade {
  private readonly repository = inject(PUBLIC_GAMES_REPOSITORY);
  private readonly destroyRef = inject(DestroyRef);
  private currentSlug = '';
  private pollTimer: ReturnType<typeof setTimeout> | null = null;

  readonly game = signal<PublicGame | null>(null);
  readonly status = signal<ViewStatus>('idle');
  readonly error = signal<ApiError | null>(null);
  readonly refreshing = signal(false);
  readonly liveError = signal<ApiError | null>(null);
  readonly lastUpdatedAt = signal<string | null>(null);

  constructor() {
    this.destroyRef.onDestroy(() => this.stopPolling());
  }

  load(slug: string): void {
    this.currentSlug = slug;
    this.stopPolling();
    this.status.set('loading');
    this.error.set(null);
    this.liveError.set(null);
    this.refreshing.set(false);
    this.lastUpdatedAt.set(null);
    this.game.set(null);

    this.fetchGame(slug, false);
  }

  refresh(): void {
    if (!this.currentSlug || this.refreshing()) {
      return;
    }

    this.fetchGame(this.currentSlug, true);
  }

  private fetchGame(slug: string, preserveData: boolean): void {
    if (preserveData) {
      this.refreshing.set(true);
      this.liveError.set(null);
    }

    this.repository
      .getBySlug(slug)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (game) => {
          if (slug !== this.currentSlug) {
            return;
          }

          this.game.set(game);
          this.status.set('success');
          this.error.set(null);
          this.refreshing.set(false);
          this.liveError.set(null);
          this.lastUpdatedAt.set(new Date().toISOString());
          this.schedulePolling(game);
        },
        error: (error: unknown) => {
          if (slug !== this.currentSlug) {
            return;
          }

          if (preserveData && this.game() !== null) {
            this.refreshing.set(false);
            this.liveError.set(toApiError(error));
            this.schedulePolling(this.game());
            return;
          }

          this.error.set(toApiError(error));
          this.status.set('error');
          this.refreshing.set(false);
          this.stopPolling();
        },
      });
  }

  private schedulePolling(game: PublicGame | null): void {
    this.stopPolling();

    if (game?.status !== 'running') {
      return;
    }

    this.pollTimer = setTimeout(() => this.refresh(), resolvePollingIntervalMs(game));
  }

  private stopPolling(): void {
    if (this.pollTimer !== null) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
  }
}

function resolvePollingIntervalMs(game: PublicGame): number {
  const drawIntervalSeconds = game.schedule.drawIntervalSeconds;
  const boundedSeconds =
    Number.isFinite(drawIntervalSeconds) && drawIntervalSeconds > 0
      ? Math.min(Math.max(drawIntervalSeconds, 5), 15)
      : 10;

  return boundedSeconds * 1000;
}
