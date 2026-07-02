import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiError, toApiError } from '../../../core/api/models/api-error.models';
import { AuthSessionService } from '../../../core/auth/services/auth-session.service';
import {
  AdminGameCommandState,
  AdminGameListQuery,
  AdminGameListResult,
  AdminGamesListStatus,
  AdminGamesPageInfo,
  CreateAdminGamePayload,
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

const initialCommandState = (): AdminGameCommandState => ({
  status: 'idle',
  errorMessage: null,
  fieldErrors: {},
  result: null,
  refreshState: 'idle',
  refreshMessage: null,
});

@Injectable()
export class AdminGamesFacade {
  private readonly repository = inject(ADMIN_GAMES_REPOSITORY);
  private readonly session = inject(AuthSessionService);
  private readonly destroyRef = inject(DestroyRef);

  private loadSequence = 0;
  private createSequence = 0;
  private activeQueryKey = '';

  readonly games = signal<AdminGameListResult['games']>([]);
  readonly pageInfo = signal<AdminGamesPageInfo>(initialPageInfo);
  readonly status = signal<AdminGamesListStatus>('idle');
  readonly error = signal<ApiError | null>(null);
  readonly query = signal<AdminGameListQuery>(initialAdminGameListQuery());
  readonly createState = signal<AdminGameCommandState>(initialCommandState());

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

  createGame(payload: CreateAdminGamePayload): void {
    if (this.createState().status === 'submitting') {
      return;
    }

    this.createSequence += 1;
    this.createState.set({
      status: 'submitting',
      errorMessage: null,
      fieldErrors: {},
      result: null,
      refreshState: 'idle',
      refreshMessage: null,
    });

    const sequence = this.createSequence;
    const requestUserId = this.session.user()?.id ?? null;

    this.repository
      .createGame(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          if (!this.isCurrentCreateRequest(sequence, requestUserId)) {
            return;
          }

          this.createState.set({
            status: 'success',
            errorMessage: null,
            fieldErrors: {},
            result,
            refreshState: 'refreshing',
            refreshMessage: null,
          });
          this.reloadAfterCreate(sequence, requestUserId);
        },
        error: (error: unknown) => {
          if (!this.isCurrentCreateRequest(sequence, requestUserId)) {
            return;
          }

          this.createState.set(mapCommandErrorState(resolveAdminGamesError(error)));
        },
      });
  }

  clearCreateFeedback(): void {
    this.createState.set(initialCommandState());
  }

  private reloadAfterCreate(sequence: number, requestUserId: number | null): void {
    const query = this.query();
    const queryKey = serializeAdminGameListQuery(query);

    this.activeQueryKey = queryKey;
    this.loadSequence += 1;
    const loadSequence = this.loadSequence;
    this.error.set(null);
    this.status.set(this.games().length > 0 ? 'refreshing' : 'loading');

    this.repository
      .listGames(query)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          if (
            !this.isCurrentRequest(loadSequence, queryKey, requestUserId) ||
            !this.isCurrentCreateRequest(sequence, requestUserId)
          ) {
            return;
          }

          this.games.set(result.games);
          this.pageInfo.set(result.pageInfo);
          this.error.set(null);
          this.status.set(result.games.length > 0 ? 'loaded' : 'empty');
          this.createState.update((state) => ({
            ...state,
            refreshState: 'confirmed',
            refreshMessage: null,
          }));
        },
        error: (error: unknown) => {
          if (!this.isCurrentCreateRequest(sequence, requestUserId)) {
            return;
          }

          const apiError = resolveAdminGamesError(error);

          if (this.isCurrentRequest(loadSequence, queryKey, requestUserId)) {
            this.error.set(apiError);
            this.status.set(resolveListStatus(apiError));
          }

          this.createState.update((state) => ({
            ...state,
            refreshState: 'failed',
            refreshMessage: 'El bingo se creó, pero no pudimos refrescar el listado automáticamente.',
          }));
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

  private isCurrentCreateRequest(sequence: number, requestUserId: number | null): boolean {
    return sequence === this.createSequence && (this.session.user()?.id ?? null) === requestUserId;
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

export function mapCommandErrorState(error: ApiError): AdminGameCommandState {
  return {
    status: resolveCommandStatus(error),
    errorMessage: error.message,
    fieldErrors: error.fieldErrors,
    result: null,
    refreshState: 'idle',
    refreshMessage: null,
  };
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

function resolveCommandStatus(error: ApiError): AdminGameCommandState['status'] {
  switch (error.status) {
    case 401:
      return 'unauthorized';
    case 403:
      return 'forbidden';
    case 404:
      return 'notFound';
    case 409:
      return 'conflict';
    case 422:
      return error.code === 'invalid_game_transition' || error.code === 'invalid_game_configuration'
        ? 'invalidState'
        : 'validationError';
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
