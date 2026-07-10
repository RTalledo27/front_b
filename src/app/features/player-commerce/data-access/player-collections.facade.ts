import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiError } from '../../../core/api/models/api-error.models';
import { map } from 'rxjs';
import { PUBLIC_GAMES_REPOSITORY } from '../../public-games/data-access/public-games.repository';
import { PublicGame } from '../../public-games/models/public-game.models';
import {
  PlayerCommerceViewStatus,
  PlayerEntryView,
  PlayerReservationView,
} from '../models/player-commerce-view.models';
import {
  mapPlayerEntriesResponse,
  mapPlayerReservationsResponse,
  resolvePlayerCommerceError,
} from './player-commerce.mapper';
import { PLAYER_COMMERCE_REPOSITORY } from './player-commerce.repository';
import { catchError, from, mergeMap, of, toArray } from 'rxjs';

@Injectable()
export class PlayerReservationsFacade {
  private readonly repository = inject(PLAYER_COMMERCE_REPOSITORY);
  private readonly destroyRef = inject(DestroyRef);

  readonly items = signal<PlayerReservationView[]>([]);
  readonly status = signal<PlayerCommerceViewStatus>('idle');
  readonly error = signal<ApiError | null>(null);

  load(): void {
    this.status.set('loading');
    this.error.set(null);

    this.repository
      .listReservations()
      .pipe(
        map((response) => mapPlayerReservationsResponse(response)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (items) => {
          this.items.set(items);
          this.status.set(items.length > 0 ? 'loaded' : 'empty');
        },
        error: (error: unknown) => {
          const apiError = resolvePlayerCommerceError(error);
          this.items.set([]);
          this.error.set(apiError);
          this.status.set(resolveReadStatus(apiError.status));
        },
      });
  }
}

@Injectable()
export class PlayerEntriesFacade {
  private readonly repository = inject(PLAYER_COMMERCE_REPOSITORY);
  private readonly gamesRepository = inject(PUBLIC_GAMES_REPOSITORY);
  private readonly destroyRef = inject(DestroyRef);
  private liveVersion = 0;
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;

  readonly items = signal<PlayerEntryView[]>([]);
  readonly status = signal<PlayerCommerceViewStatus>('idle');
  readonly error = signal<ApiError | null>(null);
  readonly liveGames = signal<Record<string, PublicGame>>({});
  readonly liveGamesStatus = signal<'idle' | 'loading' | 'loaded' | 'error'>('idle');
  readonly liveGamesError = signal<ApiError | null>(null);
  readonly refreshing = signal(false);
  readonly refreshError = signal<ApiError | null>(null);
  readonly lastUpdatedAt = signal<string | null>(null);

  constructor() {
    this.destroyRef.onDestroy(() => this.stopPolling());
  }

  load(): void {
    this.stopPolling();
    this.status.set('loading');
    this.error.set(null);
    this.refreshError.set(null);

    this.fetchEntries(false);
  }

  refresh(): void {
    if (this.refreshing() || this.status() === 'loading') {
      return;
    }

    this.fetchEntries(true);
  }

  gameLiveState(gameId: string | null | undefined): PublicGame | null {
    if (!gameId) {
      return null;
    }

    return this.liveGames()[gameId] ?? null;
  }

  private loadLiveGames(items: readonly PlayerEntryView[]): void {
    const targets = new Map<string, string>();

    for (const item of items) {
      if (item.game !== null) {
        targets.set(item.game.id, item.game.slug);
      }
    }

    if (targets.size === 0) {
      this.liveVersion += 1;
      this.liveGames.set({});
      this.liveGamesStatus.set('idle');
      this.liveGamesError.set(null);
      return;
    }

    const version = ++this.liveVersion;
    this.liveGamesStatus.set('loading');
    this.liveGamesError.set(null);

    from([...targets.entries()])
      .pipe(
        mergeMap(([gameId, slug]) =>
          this.gamesRepository.getBySlug(slug).pipe(
            map((game) => ({ gameId, game, error: null as ApiError | null })),
            catchError((error: unknown) =>
              of({ gameId, game: null, error: resolvePlayerCommerceError(error) }),
            ),
          ),
        ),
        toArray(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((results) => {
        if (version !== this.liveVersion) {
          return;
        }

        const nextGames: Record<string, PublicGame> = {};
        let firstError: ApiError | null = null;

        for (const result of results) {
          if (result.game !== null) {
            nextGames[result.gameId] = result.game;
          } else if (firstError === null) {
            firstError = result.error;
          }
        }

        this.liveGames.set(nextGames);
        this.liveGamesError.set(firstError);
        this.liveGamesStatus.set(Object.keys(nextGames).length > 0 ? 'loaded' : 'error');
      });
  }

  private fetchEntries(preserveData: boolean): void {
    if (preserveData) {
      this.refreshing.set(true);
      this.refreshError.set(null);
    }

    this.repository
      .listEntries()
      .pipe(
        map((response) => mapPlayerEntriesResponse(response)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (items) => {
          this.items.set(items);
          this.status.set(items.length > 0 ? 'loaded' : 'empty');
          this.error.set(null);
          this.refreshing.set(false);
          this.refreshError.set(null);
          this.lastUpdatedAt.set(new Date().toISOString());
          this.loadLiveGames(items);
          this.schedulePolling(items);
        },
        error: (error: unknown) => {
          const apiError = resolvePlayerCommerceError(error);

          if (preserveData && this.items().length > 0) {
            this.refreshing.set(false);
            this.refreshError.set(apiError);
            this.schedulePolling(this.items());
            return;
          }

          this.items.set([]);
          this.error.set(apiError);
          this.status.set(resolveReadStatus(apiError.status));
          this.refreshing.set(false);
          this.refreshError.set(null);
          this.loadLiveGames([]);
          this.stopPolling();
        },
      });
  }

  private schedulePolling(items: readonly PlayerEntryView[]): void {
    this.stopPolling();

    if (!items.some((item) => item.liveProgress?.gameStatus === 'running')) {
      return;
    }

    this.refreshTimer = setTimeout(() => this.refresh(), 10000);
  }

  private stopPolling(): void {
    if (this.refreshTimer !== null) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }
}

function resolveReadStatus(status: number): PlayerCommerceViewStatus {
  switch (status) {
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
