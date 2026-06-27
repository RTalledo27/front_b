import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiError, toApiError } from '../../../core/api/models/api-error.models';
import { AuthSessionService } from '../../../core/auth/services/auth-session.service';
import {
  AdminGameListQuery,
  AdminGameListResult,
  AdminGamesListStatus,
  AdminGamesPageInfo,
} from '../models/admin-games.models';
import { isAdminGamesInvalidPayloadError } from './admin-games.mapper';
import { ADMIN_GAMES_REPOSITORY } from './admin-games.repository';

const initialPageInfo: AdminGamesPageInfo = {
  currentPage: 1,
  from: null,
  lastPage: 1,
  path: '',
  perPage: 20,
  to: null,
  total: 0,
};

@Injectable()
export class AdminGamesFacade {
  private readonly repository = inject(ADMIN_GAMES_REPOSITORY);
  private readonly session = inject(AuthSessionService);
  private readonly destroyRef = inject(DestroyRef);

  private loadSequence = 0;
  private activeQueryKey = '';

  readonly games = signal<AdminGameListResult['games']>([]);
  readonly pageInfo = signal<AdminGamesPageInfo>(initialPageInfo);
  readonly status = signal<AdminGamesListStatus>('idle');
  readonly error = signal<ApiError | null>(null);
  readonly query = signal<AdminGameListQuery>(initialAdminGameListQuery());

  readonly hasPreviousPage = computed(() => this.pageInfo().currentPage > 1);
  readonly hasNextPage = computed(() => this.pageInfo().currentPage < this.pageInfo().lastPage);

  load(query: AdminGameListQuery): void {
    const normalizedQuery = normalizeAdminGameListQuery(query);
    const queryKey = serializeAdminGameListQuery(normalizedQuery);
    const shouldRefresh = this.games().length > 0 && this.activeQueryKey !== '';

    this.activeQueryKey = queryKey;
    this.loadSequence += 1;
    this.query.set(normalizedQuery);
    this.error.set(null);
    this.status.set(shouldRefresh ? 'refreshing' : 'loading');

    const sequence = this.loadSequence;
    const requestUserId = this.session.user()?.id ?? null;

    this.repository
      .listGames(normalizedQuery)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          if (!this.isCurrentRequest(sequence, queryKey, requestUserId)) {
            return;
          }

          this.games.set(result.games);
          this.pageInfo.set(result.pageInfo);
          this.error.set(null);
          this.status.set(result.games.length > 0 ? 'loaded' : 'empty');
        },
        error: (error: unknown) => {
          if (!this.isCurrentRequest(sequence, queryKey, requestUserId)) {
            return;
          }

          const apiError = resolveAdminGamesError(error);
          this.games.set([]);
          this.pageInfo.set(initialPageInfo);
          this.error.set(apiError);
          this.status.set(resolveListStatus(apiError));
        },
      });
  }

  private isCurrentRequest(sequence: number, queryKey: string, requestUserId: number | null): boolean {
    return (
      sequence === this.loadSequence &&
      queryKey === this.activeQueryKey &&
      (this.session.user()?.id ?? null) === requestUserId
    );
  }
}

export function initialAdminGameListQuery(): AdminGameListQuery {
  return {
    page: 1,
    search: '',
    status: '',
    published: null,
    autoDrawEnabled: null,
    createdFrom: null,
    createdTo: null,
  };
}

export function normalizeAdminGameListQuery(query: AdminGameListQuery): AdminGameListQuery {
  return {
    page: Number.isInteger(query.page) && query.page > 0 ? query.page : 1,
    search: query.search.trim(),
    status: query.status.trim(),
    published: query.published,
    autoDrawEnabled: query.autoDrawEnabled,
    createdFrom: normalizeOptionalDate(query.createdFrom),
    createdTo: normalizeOptionalDate(query.createdTo),
  };
}

export function serializeAdminGameListQuery(query: AdminGameListQuery): string {
  return JSON.stringify(normalizeAdminGameListQuery(query));
}

export function resolveAdminGamesError(error: unknown): ApiError {
  if (isAdminGamesInvalidPayloadError(error)) {
    return {
      status: 500,
      code: 'invalid_payload',
      message: 'Recibimos una respuesta incompleta del servidor.',
      fieldErrors: {},
      reason: null,
    };
  }

  return toApiError(error);
}

function resolveListStatus(error: ApiError): AdminGamesListStatus {
  switch (error.status) {
    case 401:
      return 'unauthorized';
    case 403:
      return 'forbidden';
    case 422:
      return 'validationError';
    case 0:
      return 'networkError';
    default:
      return 'unexpectedError';
  }
}

function normalizeOptionalDate(value: string | null): string | null {
  if (value === null) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}
