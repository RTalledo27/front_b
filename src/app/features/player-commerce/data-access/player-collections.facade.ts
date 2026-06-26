import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiError, toApiError } from '../../../core/api/models/api-error.models';
import {
  PlayerCommerceViewStatus,
  PlayerEntryView,
  PlayerReservationView,
} from '../models/player-commerce-view.models';
import { mapPlayerEntry, mapPlayerReservation } from './player-commerce.mapper';
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
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          const items = response.data.map(mapPlayerReservation);
          this.items.set(items);
          this.status.set(items.length > 0 ? 'loaded' : 'empty');
        },
        error: (error: unknown) => {
          this.items.set([]);
          this.error.set(toApiError(error));
          this.status.set(resolveReadStatus(error));
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
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          const items = response.data.map(mapPlayerEntry);
          this.items.set(items);
          this.status.set(items.length > 0 ? 'loaded' : 'empty');
        },
        error: (error: unknown) => {
          this.items.set([]);
          this.error.set(toApiError(error));
          this.status.set(resolveReadStatus(error));
        },
      });
  }
}

function resolveReadStatus(error: unknown): PlayerCommerceViewStatus {
  const apiError = toApiError(error);

  switch (apiError.status) {
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
