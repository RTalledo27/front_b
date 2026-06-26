import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiError, toApiError } from '../../../core/api/models/api-error.models';
import { PageInfo } from '../../public-games/models/public-game.models';
import { mapPlayerOrderSummary } from './player-commerce.mapper';
import { PlayerCommerceViewStatus, PlayerOrderSummary } from '../models/player-commerce-view.models';
import { PLAYER_COMMERCE_REPOSITORY } from './player-commerce.repository';

const initialPage: PageInfo = { currentPage: 1, lastPage: 1, perPage: 20, total: 0 };
@Injectable()
export class PlayerOrdersFacade {
  private readonly repository = inject(PLAYER_COMMERCE_REPOSITORY);
  private readonly destroyRef = inject(DestroyRef);
  readonly orders = signal<PlayerOrderSummary[]>([]);
  readonly pageInfo = signal<PageInfo>(initialPage);
  readonly status = signal<PlayerCommerceViewStatus>('idle');
  readonly error = signal<ApiError | null>(null);
  readonly filter = signal('');
  readonly hasPreviousPage = computed(() => this.pageInfo().currentPage > 1);
  readonly hasNextPage = computed(() => this.pageInfo().currentPage < this.pageInfo().lastPage);

  load(page = 1, status = this.filter()): void {
    this.status.set('loading'); this.error.set(null); this.filter.set(status);
    this.repository.listOrders(page, status || undefined).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        this.orders.set(response.data.map(mapPlayerOrderSummary));
        this.pageInfo.set({ currentPage: response.meta.current_page, lastPage: response.meta.last_page, perPage: response.meta.per_page, total: response.meta.total });
        this.status.set(response.data.length ? 'loaded' : 'empty');
      },
      error: (error: unknown) => {
        const apiError = toApiError(error);
        this.orders.set([]);
        this.error.set(apiError);
        this.status.set(resolveReadStatus(apiError.status));
      },
    });
  }
  previousPage(): void { if (this.hasPreviousPage()) this.load(this.pageInfo().currentPage - 1); }
  nextPage(): void { if (this.hasNextPage()) this.load(this.pageInfo().currentPage + 1); }
}

function resolveReadStatus(status: number): PlayerCommerceViewStatus {
  if (status === 401) {
    return 'unauthorized';
  }

  if (status === 403) {
    return 'forbidden';
  }

  if (status === 404) {
    return 'notFound';
  }

  if (status === 0) {
    return 'networkError';
  }

  return 'unexpectedError';
}
