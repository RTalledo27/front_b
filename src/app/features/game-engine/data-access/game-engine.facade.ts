import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ApiError, toApiError } from '../../../core/api/models/api-error.models';
import { AuthSessionService } from '../../../core/auth/services/auth-session.service';
import { AdminGameDetailView } from '../../admin-games/models/admin-games.models';
import { ADMIN_GAMES_REPOSITORY } from '../../admin-games/data-access/admin-games.repository';
import {
  GameEngineAccessMode,
  GameEngineConsoleView,
  GameEngineCounterView,
  GameEngineCountersPageView,
  GameEngineDrawCommandView,
  GameEngineDrawView,
  GameEngineDrawsPageView,
  GameEngineDrawStatus,
  GameEnginePauseCommandView,
  GameEnginePauseStatus,
  GameEnginePageStatus,
  GameEngineRebuildCountersCommandView,
  GameEngineRebuildStatus,
  GameEngineResumeCommandView,
  GameEngineResumeStatus,
  GameEngineStartCommandView,
  GameEngineStartStatus,
  GameEngineWinnerView,
} from '../models/game-engine.models';
import { DrawCommandIdService } from './draw-command-id.service';
import { GAME_ENGINE_REPOSITORY } from './game-engine.repository';

const FALLBACK_PAGE_INFO = {
  currentPage: 1,
  from: null,
  lastPage: 1,
  path: '',
  perPage: 50,
  to: null,
  total: 0,
} as const;

const FALLBACK_LINKS = {
  first: null,
  last: null,
  prev: null,
  next: null,
} as const;

@Injectable()
export class GameEngineFacade {
  private readonly adminGamesRepository = inject(ADMIN_GAMES_REPOSITORY);
  private readonly repository = inject(GAME_ENGINE_REPOSITORY);
  private readonly session = inject(AuthSessionService);
  private readonly drawCommandIds = inject(DrawCommandIdService);
  private readonly destroyRef = inject(DestroyRef);

  private loadSequence = 0;
  private activeGameId = '';
  private activeDrawsPage = 1;
  private activeCountersPage = 1;
  private startSequence = 0;
  private pauseSequence = 0;
  private resumeSequence = 0;
  private drawSequence = 0;
  private rebuildSequence = 0;

  readonly snapshot = signal<GameEngineConsoleView | null>(null);
  readonly status = signal<GameEnginePageStatus>('idle');
  readonly error = signal<ApiError | null>(null);
  readonly accessMode = signal<GameEngineAccessMode>('contextual');
  readonly startStatus = signal<GameEngineStartStatus>('idle');
  readonly startError = signal<ApiError | null>(null);
  readonly startResult = signal<GameEngineStartCommandView | null>(null);
  readonly pauseStatus = signal<GameEnginePauseStatus>('idle');
  readonly pauseError = signal<ApiError | null>(null);
  readonly pauseResult = signal<GameEnginePauseCommandView | null>(null);
  readonly resumeStatus = signal<GameEngineResumeStatus>('idle');
  readonly resumeError = signal<ApiError | null>(null);
  readonly resumeResult = signal<GameEngineResumeCommandView | null>(null);
  readonly drawStatus = signal<GameEngineDrawStatus>('idle');
  readonly drawError = signal<ApiError | null>(null);
  readonly drawResult = signal<GameEngineDrawCommandView | null>(null);
  readonly rebuildStatus = signal<GameEngineRebuildStatus>('idle');
  readonly rebuildError = signal<ApiError | null>(null);
  readonly rebuildResult = signal<GameEngineRebuildCountersCommandView | null>(null);

  load(
    gameId: string,
    accessMode: GameEngineAccessMode,
    pages?: { drawsPage?: number; countersPage?: number },
  ): void {
    const normalizedGameId = gameId.trim();
    if (normalizedGameId === '') {
      this.clear();
      return;
    }

    const isGameChanged = normalizedGameId !== this.activeGameId;
    const hasLoadedSnapshot = this.snapshot()?.context.id === normalizedGameId;
    const nextDrawsPage = sanitizePage(pages?.drawsPage ?? (isGameChanged ? 1 : this.activeDrawsPage));
    const nextCountersPage = sanitizePage(
      pages?.countersPage ?? (isGameChanged ? 1 : this.activeCountersPage),
    );

    if (isGameChanged) {
      this.resetCommandState();
    }

    this.activeGameId = normalizedGameId;
    this.activeDrawsPage = nextDrawsPage;
    this.activeCountersPage = nextCountersPage;
    this.loadSequence += 1;
    this.accessMode.set(accessMode);
    this.error.set(null);
    this.status.set(hasLoadedSnapshot ? 'refreshing' : 'loading');

    if (!hasLoadedSnapshot) {
      this.snapshot.set(null);
    }

    const sequence = this.loadSequence;
    const requestUserId = this.session.user()?.id ?? null;

    forkJoin({
      context: this.adminGamesRepository.getGame(normalizedGameId),
      draws: this.repository.listDraws(normalizedGameId, nextDrawsPage),
      counters: this.repository.listCounters(normalizedGameId, nextCountersPage),
      winner: this.loadWinnerOrNull(normalizedGameId),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ context, draws, counters, winner }) => {
          if (!this.isCurrentRequest(sequence, normalizedGameId, requestUserId)) {
            return;
          }

          const normalizedDraws = normalizeDrawsPage(draws);
          const normalizedCounters = normalizeCountersPage(counters);
          this.snapshot.set({
            context,
            draws: normalizedDraws.items,
            drawsPageInfo: normalizedDraws.pageInfo,
            drawsLinks: normalizedDraws.links,
            counters: normalizedCounters.items,
            countersPageInfo: normalizedCounters.pageInfo,
            countersLinks: normalizedCounters.links,
            winner,
          });
          this.error.set(null);
          this.status.set('loaded');
        },
        error: (error: unknown) => {
          if (!this.isCurrentRequest(sequence, normalizedGameId, requestUserId)) {
            return;
          }

          const apiError = toApiError(error);
          this.snapshot.set(null);
          this.error.set(apiError);
          this.status.set(resolveGameEngineStatus(apiError));
        },
      });
  }

  refresh(): void {
    if (this.activeGameId !== '') {
      this.load(this.activeGameId, this.accessMode(), {
        drawsPage: this.activeDrawsPage,
        countersPage: this.activeCountersPage,
      });
    }
  }

  loadDrawsPage(page: number): void {
    if (this.activeGameId === '') {
      return;
    }

    const targetPage = sanitizePage(page);
    if (targetPage === this.activeDrawsPage) {
      return;
    }

    this.load(this.activeGameId, this.accessMode(), {
      drawsPage: targetPage,
      countersPage: this.activeCountersPage,
    });
  }

  loadCountersPage(page: number): void {
    if (this.activeGameId === '') {
      return;
    }

    const targetPage = sanitizePage(page);
    if (targetPage === this.activeCountersPage) {
      return;
    }

    this.load(this.activeGameId, this.accessMode(), {
      drawsPage: this.activeDrawsPage,
      countersPage: targetPage,
    });
  }

  clear(): void {
    this.activeGameId = '';
    this.activeDrawsPage = 1;
    this.activeCountersPage = 1;
    this.loadSequence += 1;
    this.startSequence += 1;
    this.pauseSequence += 1;
    this.resumeSequence += 1;
    this.drawSequence += 1;
    this.rebuildSequence += 1;
    this.snapshot.set(null);
    this.error.set(null);
    this.status.set('idle');
    this.accessMode.set('contextual');
    this.resetCommandState();
  }

  private resetCommandState(): void {
    this.drawCommandIds.clear();
    this.startStatus.set('idle');
    this.startError.set(null);
    this.startResult.set(null);
    this.pauseStatus.set('idle');
    this.pauseError.set(null);
    this.pauseResult.set(null);
    this.resumeStatus.set('idle');
    this.resumeError.set(null);
    this.resumeResult.set(null);
    this.drawStatus.set('idle');
    this.drawError.set(null);
    this.drawResult.set(null);
    this.rebuildStatus.set('idle');
    this.rebuildError.set(null);
    this.rebuildResult.set(null);
  }

  startGame(): void {
    if (!this.canSubmitCommand(this.startStatus())) {
      return;
    }

    const sequence = this.startSequence + 1;
    this.startSequence = sequence;
    const gameId = this.activeGameId;
    const requestUserId = this.session.user()?.id ?? null;

    this.startStatus.set('submitting');
    this.startError.set(null);
    this.startResult.set(null);

    this.repository
      .startGame(gameId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          if (!this.isCurrentStartRequest(sequence, gameId, requestUserId)) {
            return;
          }

          this.startResult.set(result);
          this.startError.set(null);
          this.startStatus.set('success');
          this.refresh();
        },
        error: (error: unknown) => {
          if (!this.isCurrentStartRequest(sequence, gameId, requestUserId)) {
            return;
          }

          const apiError = toApiError(error);
          this.startResult.set(null);
          this.startError.set(apiError);
          this.startStatus.set(resolveStartStatus(apiError));
        },
      });
  }

  pauseGame(): void {
    if (!this.canSubmitCommand(this.pauseStatus())) {
      return;
    }

    const sequence = this.pauseSequence + 1;
    this.pauseSequence = sequence;
    const gameId = this.activeGameId;
    const requestUserId = this.session.user()?.id ?? null;

    this.pauseStatus.set('submitting');
    this.pauseError.set(null);
    this.pauseResult.set(null);

    this.repository
      .pauseGame(gameId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          if (!this.isCurrentPauseRequest(sequence, gameId, requestUserId)) {
            return;
          }

          this.pauseResult.set(result);
          this.pauseError.set(null);
          this.pauseStatus.set('success');
          this.refresh();
        },
        error: (error: unknown) => {
          if (!this.isCurrentPauseRequest(sequence, gameId, requestUserId)) {
            return;
          }

          const apiError = toApiError(error);
          this.pauseResult.set(null);
          this.pauseError.set(apiError);
          this.pauseStatus.set(resolveCommandStatus(apiError));
        },
      });
  }

  resumeGame(): void {
    if (!this.canSubmitCommand(this.resumeStatus())) {
      return;
    }

    const sequence = this.resumeSequence + 1;
    this.resumeSequence = sequence;
    const gameId = this.activeGameId;
    const requestUserId = this.session.user()?.id ?? null;

    this.resumeStatus.set('submitting');
    this.resumeError.set(null);
    this.resumeResult.set(null);

    this.repository
      .resumeGame(gameId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          if (!this.isCurrentResumeRequest(sequence, gameId, requestUserId)) {
            return;
          }

          this.resumeResult.set(result);
          this.resumeError.set(null);
          this.resumeStatus.set('success');
          this.refresh();
        },
        error: (error: unknown) => {
          if (!this.isCurrentResumeRequest(sequence, gameId, requestUserId)) {
            return;
          }

          const apiError = toApiError(error);
          this.resumeResult.set(null);
          this.resumeError.set(apiError);
          this.resumeStatus.set(resolveCommandStatus(apiError));
        },
      });
  }

  drawNumber(): void {
    if (!this.canSubmitCommand(this.drawStatus())) {
      return;
    }

    const userId = this.session.user()?.id ?? null;
    if (userId === null || this.activeGameId === '') {
      return;
    }

    const sequence = this.drawSequence + 1;
    this.drawSequence = sequence;
    const gameId = this.activeGameId;
    const commandId = this.drawCommandIds.getOrCreate({ userId, gameId });

    this.drawStatus.set('submitting');
    this.drawError.set(null);
    this.drawResult.set(null);

    this.repository
      .drawNumber(gameId, commandId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          if (!this.isCurrentDrawRequest(sequence, gameId, userId)) {
            return;
          }

          this.drawCommandIds.clear();
          this.drawResult.set(result);
          this.drawError.set(null);
          this.drawStatus.set('success');
          this.refresh();
        },
        error: (error: unknown) => {
          if (!this.isCurrentDrawRequest(sequence, gameId, userId)) {
            return;
          }

          const apiError = toApiError(error);
          this.drawResult.set(null);
          this.drawError.set(apiError);
          this.drawStatus.set(resolveCommandStatus(apiError));

          if (shouldClearDrawCommandId(apiError)) {
            this.drawCommandIds.clear();
          }
        },
      });
  }

  rebuildCounters(): void {
    if (!this.canSubmitCommand(this.rebuildStatus())) {
      return;
    }

    const sequence = this.rebuildSequence + 1;
    this.rebuildSequence = sequence;
    const gameId = this.activeGameId;
    const requestUserId = this.session.user()?.id ?? null;

    this.rebuildStatus.set('submitting');
    this.rebuildError.set(null);
    this.rebuildResult.set(null);

    this.repository
      .rebuildCounters(gameId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          if (!this.isCurrentRebuildRequest(sequence, gameId, requestUserId)) {
            return;
          }

          this.rebuildResult.set(result);
          this.rebuildError.set(null);
          this.rebuildStatus.set('success');
          this.refresh();
        },
        error: (error: unknown) => {
          if (!this.isCurrentRebuildRequest(sequence, gameId, requestUserId)) {
            return;
          }

          const apiError = toApiError(error);
          this.rebuildResult.set(null);
          this.rebuildError.set(apiError);
          this.rebuildStatus.set(resolveCommandStatus(apiError));
        },
      });
  }

  private loadWinnerOrNull(gameId: string) {
    return this.repository.getWinner(gameId).pipe(
      catchError((error: unknown) => {
        const apiError = toApiError(error);
        if (apiError.status === 404) {
          return of<GameEngineWinnerView | null>(null);
        }

        throw error;
      }),
    );
  }

  private isCurrentRequest(sequence: number, gameId: string, requestUserId: number | null): boolean {
    return (
      sequence === this.loadSequence &&
      gameId === this.activeGameId &&
      (this.session.user()?.id ?? null) === requestUserId
    );
  }

  private isCurrentStartRequest(sequence: number, gameId: string, requestUserId: number | null): boolean {
    return (
      sequence === this.startSequence &&
      gameId === this.activeGameId &&
      (this.session.user()?.id ?? null) === requestUserId
    );
  }

  private isCurrentPauseRequest(sequence: number, gameId: string, requestUserId: number | null): boolean {
    return (
      sequence === this.pauseSequence &&
      gameId === this.activeGameId &&
      (this.session.user()?.id ?? null) === requestUserId
    );
  }

  private isCurrentResumeRequest(sequence: number, gameId: string, requestUserId: number | null): boolean {
    return (
      sequence === this.resumeSequence &&
      gameId === this.activeGameId &&
      (this.session.user()?.id ?? null) === requestUserId
    );
  }

  private isCurrentDrawRequest(sequence: number, gameId: string, requestUserId: number | null): boolean {
    return (
      sequence === this.drawSequence &&
      gameId === this.activeGameId &&
      (this.session.user()?.id ?? null) === requestUserId
    );
  }

  private isCurrentRebuildRequest(
    sequence: number,
    gameId: string,
    requestUserId: number | null,
  ): boolean {
    return (
      sequence === this.rebuildSequence &&
      gameId === this.activeGameId &&
      (this.session.user()?.id ?? null) === requestUserId
    );
  }

  private canSubmitCommand(status: 'idle' | 'submitting' | 'success' | 'conflict' | 'unauthorized' | 'forbidden' | 'notFound' | 'invalidState' | 'networkError' | 'unexpectedError'): boolean {
    return this.activeGameId !== '' && status !== 'submitting';
  }
}

function sanitizePage(page: number): number {
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function normalizeDrawsPage(draws: GameEngineDrawsPageView | GameEngineDrawView[]): GameEngineDrawsPageView {
  if (Array.isArray(draws)) {
    return {
      items: draws,
      pageInfo: { ...FALLBACK_PAGE_INFO, total: draws.length, to: draws.length === 0 ? null : draws.length },
      links: FALLBACK_LINKS,
    };
  }

  return draws;
}

function normalizeCountersPage(
  counters: GameEngineCountersPageView | GameEngineCounterView[],
): GameEngineCountersPageView {
  if (Array.isArray(counters)) {
    return {
      items: counters,
      pageInfo: {
        ...FALLBACK_PAGE_INFO,
        total: counters.length,
        to: counters.length === 0 ? null : counters.length,
      },
      links: FALLBACK_LINKS,
    };
  }

  return counters;
}

function resolveGameEngineStatus(error: ApiError): GameEnginePageStatus {
  switch (error.status) {
    case 401:
      return 'unauthorized';
    case 403:
      return 'forbidden';
    case 404:
      return 'notFound';
    case 422:
      return 'validationError';
    case 0:
      return 'networkError';
    default:
      return 'unexpectedError';
  }
}

function resolveStartStatus(error: ApiError): GameEngineStartStatus {
  return resolveCommandStatus(error);
}

function resolveCommandStatus(error: ApiError): GameEngineStartStatus {
  switch (error.status) {
    case 409:
      return 'conflict';
    case 401:
      return 'unauthorized';
    case 403:
      return 'forbidden';
    case 404:
      return 'notFound';
    case 422:
      return 'invalidState';
    case 0:
      return 'networkError';
    default:
      return 'unexpectedError';
  }
}

function shouldClearDrawCommandId(error: ApiError): boolean {
  return error.status > 0 && error.status < 500;
}
