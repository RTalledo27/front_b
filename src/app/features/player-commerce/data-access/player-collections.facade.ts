import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiError } from '../../../core/api/models/api-error.models';
import { map } from 'rxjs';
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
  private readonly destroyRef = inject(DestroyRef);

  readonly items = signal<PlayerEntryView[]>([]);
  readonly status = signal<PlayerCommerceViewStatus>('idle');
  readonly error = signal<ApiError | null>(null);

  load(): void {
    this.status.set('loading');
    this.error.set(null);

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
