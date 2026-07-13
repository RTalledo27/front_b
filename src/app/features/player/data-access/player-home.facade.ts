import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiError } from '../../../core/api/models/api-error.models';
import { AuthSessionService } from '../../../core/auth/services/auth-session.service';
import { PUBLIC_GAMES_REPOSITORY } from '../../public-games/data-access/public-games.repository';
import { PublicGame } from '../../public-games/models/public-game.models';
import {
  mapPlayerEntriesResponse,
  mapPlayerOrdersResponse,
  mapPlayerReservationsResponse,
  resolvePlayerCommerceError,
} from '../../player-commerce/data-access/player-commerce.mapper';
import { PLAYER_COMMERCE_REPOSITORY } from '../../player-commerce/data-access/player-commerce.repository';
import {
  PlayerCommerceViewStatus,
  PlayerEntryView,
  PlayerOrderSummary,
  PlayerReservationView,
} from '../../player-commerce/models/player-commerce-view.models';
import { catchError, from, map, mergeMap, of, toArray } from 'rxjs';

export type PlayerHomePageStatus =
  | 'idle'
  | 'loading'
  | 'loaded'
  | 'partial'
  | 'empty'
  | 'unauthorized'
  | 'forbidden'
  | 'networkError'
  | 'unexpectedError';

@Injectable()
export class PlayerHomeFacade {
  private readonly repository = inject(PLAYER_COMMERCE_REPOSITORY);
  private readonly gamesRepository = inject(PUBLIC_GAMES_REPOSITORY);
  private readonly session = inject(AuthSessionService);
  private readonly destroyRef = inject(DestroyRef);
  private liveVersion = 0;
  private composingLoad = false;

  readonly orders = signal<readonly PlayerOrderSummary[]>([]);
  readonly ordersTotal = signal(0);
  readonly ordersStatus = signal<PlayerCommerceViewStatus>('idle');
  readonly ordersError = signal<ApiError | null>(null);

  readonly reservations = signal<readonly PlayerReservationView[]>([]);
  readonly reservationsTotal = signal(0);
  readonly reservationsStatus = signal<PlayerCommerceViewStatus>('idle');
  readonly reservationsError = signal<ApiError | null>(null);

  readonly entries = signal<readonly PlayerEntryView[]>([]);
  readonly entriesTotal = signal(0);
  readonly entriesStatus = signal<PlayerCommerceViewStatus>('idle');
  readonly entriesError = signal<ApiError | null>(null);
  readonly liveGames = signal<Record<string, PublicGame>>({});
  readonly liveGamesStatus = signal<'idle' | 'loading' | 'loaded' | 'error'>('idle');
  readonly liveGamesError = signal<ApiError | null>(null);

  readonly user = computed(() => this.session.user());
  readonly latestOrder = computed(() => this.orders()[0] ?? null);
  readonly latestReservation = computed(() => this.reservations()[0] ?? null);
  readonly latestEntry = computed(() => this.entries()[0] ?? null);
  readonly runningGames = computed(() =>
    Object.values(this.liveGames()).filter((game) => game.status === 'running'),
  );
  readonly completedGames = computed(() =>
    Object.values(this.liveGames()).filter((game) => game.status === 'completed'),
  );
  readonly failedSections = computed(() => {
    const failed: string[] = [];

    if (isFailedStatus(this.ordersStatus())) {
      failed.push('órdenes');
    }

    if (isFailedStatus(this.reservationsStatus())) {
      failed.push('reservas');
    }

    if (isFailedStatus(this.entriesStatus())) {
      failed.push('cartones');
    }

    return failed;
  });

  readonly pageStatus = computed<PlayerHomePageStatus>(() => {
    const statuses = [this.ordersStatus(), this.reservationsStatus(), this.entriesStatus()];
    const loadedOrEmpty = statuses.filter((status) => status === 'loaded' || status === 'empty').length;
    const failed = statuses.filter((status) => isFailedStatus(status));

    if (statuses.some((status) => status === 'loading')) {
      return 'loading';
    }

    if (loadedOrEmpty === 3 && this.totalItems() === 0) {
      return 'empty';
    }

    if (loadedOrEmpty > 0 && failed.length > 0) {
      return 'partial';
    }

    if (loadedOrEmpty > 0) {
      return 'loaded';
    }

    if (failed.length === 3) {
      if (statuses.every((status) => status === 'unauthorized')) {
        return 'unauthorized';
      }

      if (statuses.every((status) => status === 'forbidden')) {
        return 'forbidden';
      }

      if (statuses.every((status) => status === 'networkError')) {
        return 'networkError';
      }

      return 'unexpectedError';
    }

    return 'idle';
  });

  load(): void {
    this.composingLoad = true;
    this.loadOrders();
    this.loadReservations();
    this.loadEntries();
    this.composingLoad = false;
    this.refreshLiveGames();
  }

  reloadOrders(): void {
    this.loadOrders();
  }

  reloadReservations(): void {
    this.loadReservations();
  }

  reloadEntries(): void {
    this.loadEntries();
  }

  primaryErrorMessage(): string {
    return (
      this.ordersError()?.message ??
      this.reservationsError()?.message ??
      this.entriesError()?.message ??
      'Laravel no respondió como esperábamos.'
    );
  }

  private loadOrders(): void {
    if (this.ordersStatus() === 'loading') {
      return;
    }

    this.ordersStatus.set('loading');
    this.ordersError.set(null);

    this.repository
      .listOrders(1)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          try {
            const result = mapPlayerOrdersResponse(response);
            this.orders.set(result.orders.slice(0, 3));
            this.ordersTotal.set(result.pageInfo.total);
            this.ordersStatus.set(result.pageInfo.total > 0 ? 'loaded' : 'empty');
          } catch (error: unknown) {
            this.applyOrdersError(resolvePlayerCommerceError(error));
          }
        },
        error: (error: unknown) => {
          this.applyOrdersError(resolvePlayerCommerceError(error));
        },
      });
  }

  private loadReservations(): void {
    if (this.reservationsStatus() === 'loading') {
      return;
    }

    this.reservationsStatus.set('loading');
    this.reservationsError.set(null);

    this.repository
      .listReservations(1)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          try {
            const items = mapPlayerReservationsResponse(response);
            this.reservations.set(items.slice(0, 3));
            this.reservationsTotal.set(response.meta.total);
            this.reservationsStatus.set(response.meta.total > 0 ? 'loaded' : 'empty');
            this.refreshLiveGames();
          } catch (error: unknown) {
            this.applyReservationsError(resolvePlayerCommerceError(error));
          }
        },
        error: (error: unknown) => {
          this.applyReservationsError(resolvePlayerCommerceError(error));
        },
      });
  }

  private loadEntries(): void {
    if (this.entriesStatus() === 'loading') {
      return;
    }

    this.entriesStatus.set('loading');
    this.entriesError.set(null);

    this.repository
      .listEntries(1)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          try {
            const items = mapPlayerEntriesResponse(response);
            this.entries.set(items.slice(0, 3));
            this.entriesTotal.set(response.meta.total);
            this.entriesStatus.set(response.meta.total > 0 ? 'loaded' : 'empty');
            this.refreshLiveGames();
          } catch (error: unknown) {
            this.applyEntriesError(resolvePlayerCommerceError(error));
          }
        },
        error: (error: unknown) => {
          this.applyEntriesError(resolvePlayerCommerceError(error));
        },
      });
  }

  private totalItems(): number {
    return this.ordersTotal() + this.reservationsTotal() + this.entriesTotal();
  }

  private applyOrdersError(apiError: ApiError): void {
    this.orders.set([]);
    this.ordersTotal.set(0);
    this.ordersError.set(apiError);
    this.ordersStatus.set(resolveReadStatus(apiError.status));
  }

  private applyReservationsError(apiError: ApiError): void {
    this.reservations.set([]);
    this.reservationsTotal.set(0);
    this.reservationsError.set(apiError);
    this.reservationsStatus.set(resolveReadStatus(apiError.status));
    this.refreshLiveGames();
  }

  private applyEntriesError(apiError: ApiError): void {
    this.entries.set([]);
    this.entriesTotal.set(0);
    this.entriesError.set(apiError);
    this.entriesStatus.set(resolveReadStatus(apiError.status));
    this.refreshLiveGames();
  }

  gameLiveState(gameId: string | null | undefined): PublicGame | null {
    if (!gameId) {
      return null;
    }

    return this.liveGames()[gameId] ?? null;
  }

  private refreshLiveGames(): void {
    if (
      this.composingLoad ||
      this.reservationsStatus() === 'loading' ||
      this.entriesStatus() === 'loading'
    ) {
      return;
    }

    const targets = new Map<string, string>();

    for (const reservation of this.reservations()) {
      const game = reservation.gameNumber.game;
      if (game !== null) {
        targets.set(game.id, game.slug);
      }
    }

    for (const entry of this.entries()) {
      if (entry.game !== null) {
        targets.set(entry.game.id, entry.game.slug);
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

function isFailedStatus(status: PlayerCommerceViewStatus): boolean {
  return (
    status === 'unauthorized' ||
    status === 'forbidden' ||
    status === 'networkError' ||
    status === 'unexpectedError' ||
    status === 'notFound'
  );
}
