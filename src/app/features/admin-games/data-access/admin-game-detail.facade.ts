import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';
import { ApiError } from '../../../core/api/models/api-error.models';
import { AuthSessionService } from '../../../core/auth/services/auth-session.service';
import {
  AdminGameCommandState,
  AdminGameCommandResultView,
  AdminGameDetailStatus,
  AdminGameDetailView,
  AdminGameLifecycleAction,
  CancelGamePayload,
  ScheduleGamePayload,
} from '../models/admin-games.models';
import { ADMIN_GAMES_REPOSITORY } from './admin-games.repository';
import { mapCommandErrorState, resolveAdminGamesError } from './admin-games.facade';

const initialCommandState = (): AdminGameCommandState => ({
  status: 'idle',
  errorMessage: null,
  fieldErrors: {},
  result: null,
  refreshState: 'idle',
  refreshMessage: null,
});

@Injectable()
export class AdminGameDetailFacade {
  private readonly repository = inject(ADMIN_GAMES_REPOSITORY);
  private readonly session = inject(AuthSessionService);
  private readonly destroyRef = inject(DestroyRef);

  private loadSequence = 0;
  private actionSequence = 0;
  private activeGameId = '';

  readonly game = signal<AdminGameDetailView | null>(null);
  readonly status = signal<AdminGameDetailStatus>('idle');
  readonly error = signal<ApiError | null>(null);
  readonly publishState = signal<AdminGameCommandState>(initialCommandState());
  readonly openSalesState = signal<AdminGameCommandState>(initialCommandState());
  readonly closeSalesState = signal<AdminGameCommandState>(initialCommandState());
  readonly scheduleState = signal<AdminGameCommandState>(initialCommandState());
  readonly cancelState = signal<AdminGameCommandState>(initialCommandState());

  load(gameId: string): void {
    const normalizedGameId = gameId.trim();
    this.activeGameId = normalizedGameId;
    this.loadSequence += 1;
    this.actionSequence += 1;
    this.game.set(null);
    this.error.set(null);
    this.status.set('loading');
    this.resetActionStates();

    const sequence = this.loadSequence;
    const requestUserId = this.session.user()?.id ?? null;

    this.repository
      .getGame(normalizedGameId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (game) => {
          if (!this.isCurrentRequest(sequence, normalizedGameId, requestUserId)) {
            return;
          }

          this.game.set(game);
          this.error.set(null);
          this.status.set('loaded');
        },
        error: (error: unknown) => {
          if (!this.isCurrentRequest(sequence, normalizedGameId, requestUserId)) {
            return;
          }

          const apiError = resolveAdminGamesError(error);
          this.game.set(null);
          this.error.set(apiError);
          this.status.set(resolveDetailStatus(apiError));
        },
      });
  }

  publish(): void {
    this.runLifecycleAction('publish', (gameId) => this.repository.publishGame(gameId));
  }

  openSales(): void {
    this.runLifecycleAction('openSales', (gameId) => this.repository.openGameSales(gameId));
  }

  closeSales(): void {
    this.runLifecycleAction('closeSales', (gameId) => this.repository.closeGameSales(gameId));
  }

  schedule(payload: ScheduleGamePayload): void {
    this.runLifecycleAction('schedule', (gameId) => this.repository.scheduleGame(gameId, payload));
  }

  cancel(payload: CancelGamePayload): void {
    this.runLifecycleAction('cancel', (gameId) => this.repository.cancelGame(gameId, payload));
  }

  retry(): void {
    if (this.activeGameId !== '') {
      this.load(this.activeGameId);
    }
  }

  clearActionFeedback(action: AdminGameLifecycleAction): void {
    this.actionState(action).set(initialCommandState());
  }

  private runLifecycleAction(
    action: AdminGameLifecycleAction,
    requestFactory: (gameId: string) => Observable<AdminGameCommandResultView>,
  ): void {
    const gameId = this.game()?.id ?? this.activeGameId;

    if (gameId === '') {
      return;
    }

    const state = this.actionState(action);
    if (state().status === 'submitting') {
      return;
    }

    this.actionSequence += 1;
    state.set({
      status: 'submitting',
      errorMessage: null,
      fieldErrors: {},
      result: null,
      refreshState: 'idle',
      refreshMessage: null,
    });

    const actionSequence = this.actionSequence;
    const requestUserId = this.session.user()?.id ?? null;

    requestFactory(gameId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          if (!this.isCurrentActionRequest(actionSequence, gameId, requestUserId)) {
            return;
          }

          state.set({
            status: 'success',
            errorMessage: null,
            fieldErrors: {},
            result,
            refreshState: 'refreshing',
            refreshMessage: null,
          });
          this.refreshAfterAction(action, actionSequence, gameId, requestUserId);
        },
        error: (error: unknown) => {
          if (!this.isCurrentActionRequest(actionSequence, gameId, requestUserId)) {
            return;
          }

          state.set(mapCommandErrorState(resolveAdminGamesError(error)));
        },
      });
  }

  private refreshAfterAction(
    action: AdminGameLifecycleAction,
    actionSequence: number,
    gameId: string,
    requestUserId: number | null,
  ): void {
    const state = this.actionState(action);
    this.loadSequence += 1;
    const loadSequence = this.loadSequence;

    this.repository
      .getGame(gameId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (game) => {
          if (
            !this.isCurrentRequest(loadSequence, gameId, requestUserId) ||
            !this.isCurrentActionRequest(actionSequence, gameId, requestUserId)
          ) {
            return;
          }

          this.game.set(game);
          this.error.set(null);
          this.status.set('loaded');
          state.update((current) => ({
            ...current,
            refreshState: 'confirmed',
            refreshMessage: null,
          }));
        },
        error: () => {
          if (!this.isCurrentActionRequest(actionSequence, gameId, requestUserId)) {
            return;
          }

          state.update((current) => ({
            ...current,
            refreshState: 'failed',
            refreshMessage:
              'La acción se aplicó, pero no pudimos confirmar el snapshot actualizado del juego.',
          }));
        },
      });
  }

  private isCurrentRequest(sequence: number, gameId: string, requestUserId: number | null): boolean {
    return (
      sequence === this.loadSequence &&
      gameId === this.activeGameId &&
      (this.session.user()?.id ?? null) === requestUserId
    );
  }

  private isCurrentActionRequest(sequence: number, gameId: string, requestUserId: number | null): boolean {
    return (
      sequence === this.actionSequence &&
      gameId === this.activeGameId &&
      (this.session.user()?.id ?? null) === requestUserId
    );
  }

  private actionState(action: AdminGameLifecycleAction) {
    switch (action) {
      case 'publish':
        return this.publishState;
      case 'openSales':
        return this.openSalesState;
      case 'closeSales':
        return this.closeSalesState;
      case 'schedule':
        return this.scheduleState;
      case 'cancel':
        return this.cancelState;
    }
  }

  private resetActionStates(): void {
    this.publishState.set(initialCommandState());
    this.openSalesState.set(initialCommandState());
    this.closeSalesState.set(initialCommandState());
    this.scheduleState.set(initialCommandState());
    this.cancelState.set(initialCommandState());
  }
}

function resolveDetailStatus(error: ApiError): AdminGameDetailStatus {
  switch (error.status) {
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
