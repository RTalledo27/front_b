import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiError, toApiError } from '../../../core/api/models/api-error.models';
import { PageInfo, PublicGame, ViewStatus } from '../models/public-game.models';
import { PUBLIC_GAMES_REPOSITORY } from './public-games.repository';

const initialPageInfo: PageInfo = {
  currentPage: 1,
  lastPage: 1,
  perPage: 20,
  total: 0,
};

@Injectable()
export class PublicGamesFacade {
  private readonly repository = inject(PUBLIC_GAMES_REPOSITORY);
  private readonly destroyRef = inject(DestroyRef);

  readonly games = signal<PublicGame[]>([]);
  readonly pageInfo = signal<PageInfo>(initialPageInfo);
  readonly status = signal<ViewStatus>('idle');
  readonly error = signal<ApiError | null>(null);
  readonly hasPreviousPage = computed(() => this.pageInfo().currentPage > 1);
  readonly hasNextPage = computed(
    () => this.pageInfo().currentPage < this.pageInfo().lastPage,
  );

  load(page = 1): void {
    this.status.set('loading');
    this.error.set(null);

    this.repository
      .list(page)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.games.set(result.games);
          this.pageInfo.set(result.pageInfo);
          this.status.set(result.games.length ? 'success' : 'empty');
        },
        error: (error: unknown) => {
          this.games.set([]);
          this.error.set(toApiError(error));
          this.status.set('error');
        },
      });
  }

  previousPage(): void {
    if (this.hasPreviousPage()) {
      this.load(this.pageInfo().currentPage - 1);
    }
  }

  nextPage(): void {
    if (this.hasNextPage()) {
      this.load(this.pageInfo().currentPage + 1);
    }
  }
}