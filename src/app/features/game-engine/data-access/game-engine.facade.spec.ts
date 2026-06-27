import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Observable, Subject, throwError } from 'rxjs';
import { AuthSessionService } from '../../../core/auth/services/auth-session.service';
import { ADMIN_GAMES_REPOSITORY } from '../../admin-games/data-access/admin-games.repository';
import { AdminGameDetailView } from '../../admin-games/models/admin-games.models';
import {
  GameEngineDrawCommandView,
  GameEnginePauseCommandView,
  GameEngineResumeCommandView,
  GameEngineStartCommandView,
} from '../models/game-engine.models';
import { DrawCommandIdService } from './draw-command-id.service';
import { GameEngineFacade } from './game-engine.facade';
import { GAME_ENGINE_REPOSITORY } from './game-engine.repository';

function createContext(
  id: string,
  overrides?: Partial<AdminGameDetailView>,
): AdminGameDetailView {
  return {
    id,
    slug: `${id}-slug`,
    name: `Juego ${id}`,
    description: null,
    status: { value: 'sales_closed', label: 'Ventas cerradas', tone: 'warning', isKnown: true },
    numberRange: { min: 1, max: 90, hitsRequired: 5 },
    ticketPrice: { amountCents: 500, currency: 'PEN' },
    prize: { amountCents: 100000, currency: 'PEN' },
    schedule: {
      salesOpensAt: null,
      salesClosesAt: null,
      scheduledStartAt: '2026-06-27T12:00:00Z',
      drawIntervalSeconds: 30,
      autoDrawEnabled: true,
    },
    lifecycle: { startedAt: null, pausedAt: null, completedAt: null },
    engine: { nextDrawAt: null, lastConsumedTickAt: null },
    numbers: { total: 90, sold: 10, reserved: 5, available: 75 },
    settings: null,
    latestDraw: null,
    winner: null,
    commerce: {
      reservations: { total: 1 },
      orders: {
        pending: 1,
        paymentSubmitted: 0,
        paid: 0,
        rejected: 0,
        expired: 0,
        cancelled: 0,
        refunded: 0,
      },
      payments: {
        pending: 0,
        underReview: 0,
        approved: 0,
        rejected: 0,
        cancelled: 0,
        refunded: 0,
      },
      entries: { confirmed: 1, cancelled: 0, refunded: 0, winner: 0 },
    },
    projection: { drawsTotal: 0, distinctDrawnNumbers: 0, maxCounterHits: 0, lastDrawnNumber: null },
    createdBy: 1,
    createdAt: '2026-06-27T11:00:00Z',
    ...overrides,
  };
}

function settledWinnerRequest() {
  return throwError(
    () => new HttpErrorResponse({ status: 404, error: { message: 'game_winner_not_found' } }),
  );
}

function settledStream<T>(value: T): Observable<T> {
  return new Observable<T>((subscriber) => {
    subscriber.next(value);
    subscriber.complete();
  });
}

type EngineCommand = 'start' | 'pause' | 'resume' | 'draw';

type CommandResultMap = {
  start: GameEngineStartCommandView;
  pause: GameEnginePauseCommandView;
  resume: GameEngineResumeCommandView;
  draw: GameEngineDrawCommandView;
};

type CommandStatus =
  | 'idle'
  | 'submitting'
  | 'success'
  | 'conflict'
  | 'unauthorized'
  | 'forbidden'
  | 'notFound'
  | 'invalidState'
  | 'networkError'
  | 'unexpectedError';

function createLoadedContextForCommand(command: EngineCommand): AdminGameDetailView {
  switch (command) {
    case 'start':
      return createContext('game-1');
    case 'pause':
      return createContext('game-1', {
        status: { value: 'running', label: 'En ejecución', tone: 'info', isKnown: true },
        lifecycle: { startedAt: '2026-06-27T12:05:00Z', pausedAt: null, completedAt: null },
        engine: { nextDrawAt: '2026-06-27T12:15:30Z', lastConsumedTickAt: '2026-06-27T12:09:30Z' },
      });
    case 'resume':
      return createContext('game-1', {
        status: { value: 'paused', label: 'Pausado', tone: 'warning', isKnown: true },
        lifecycle: {
          startedAt: '2026-06-27T12:05:00Z',
          pausedAt: '2026-06-27T12:10:00Z',
          completedAt: null,
        },
      });
    case 'draw':
      return createContext('game-1', {
        status: { value: 'running', label: 'En ejecución', tone: 'info', isKnown: true },
        schedule: {
          salesOpensAt: null,
          salesClosesAt: null,
          scheduledStartAt: '2026-06-27T12:00:00Z',
          drawIntervalSeconds: 30,
          autoDrawEnabled: false,
        },
        lifecycle: { startedAt: '2026-06-27T12:05:00Z', pausedAt: null, completedAt: null },
      });
  }
}

function createRefreshedContext(command: EngineCommand): AdminGameDetailView {
  switch (command) {
    case 'start':
      return createContext('game-1', {
        status: { value: 'running', label: 'En ejecución', tone: 'info', isKnown: true },
        lifecycle: { startedAt: '2026-06-27T12:05:00Z', pausedAt: null, completedAt: null },
      });
    case 'pause':
      return createContext('game-1', {
        status: { value: 'paused', label: 'Pausado', tone: 'warning', isKnown: true },
        lifecycle: {
          startedAt: '2026-06-27T12:05:00Z',
          pausedAt: '2026-06-27T12:10:00Z',
          completedAt: null,
        },
      });
    case 'resume':
      return createContext('game-1', {
        status: { value: 'running', label: 'En ejecución', tone: 'info', isKnown: true },
        lifecycle: { startedAt: '2026-06-27T12:05:00Z', pausedAt: null, completedAt: null },
        engine: { nextDrawAt: '2026-06-27T12:15:30Z', lastConsumedTickAt: null },
      });
    case 'draw':
      return createContext('game-1', {
        status: { value: 'running', label: 'En ejecución', tone: 'info', isKnown: true },
        schedule: {
          salesOpensAt: null,
          salesClosesAt: null,
          scheduledStartAt: '2026-06-27T12:00:00Z',
          drawIntervalSeconds: 30,
          autoDrawEnabled: false,
        },
        lifecycle: { startedAt: '2026-06-27T12:05:00Z', pausedAt: null, completedAt: null },
        latestDraw: {
          number: 19,
          sequence: 1,
          drawnAt: '2026-06-27T12:16:00Z',
        },
        projection: { drawsTotal: 1, distinctDrawnNumbers: 1, maxCounterHits: 1, lastDrawnNumber: 19 },
      });
  }
}

function createSuccessResult(command: EngineCommand): CommandResultMap[EngineCommand] {
  switch (command) {
    case 'start':
      return {
        gameId: 'game-1',
        status: 'running',
        outcome: 'started',
        scheduledStartAt: '2026-06-27T12:00:00Z',
        startedAt: '2026-06-27T12:05:00Z',
        confirmedEntriesCount: 3,
      };
    case 'pause':
      return {
        gameId: 'game-1',
        status: 'paused',
        outcome: 'paused',
        pausedAt: '2026-06-27T12:10:00Z',
      };
    case 'resume':
      return {
        gameId: 'game-1',
        status: 'running',
        outcome: 'resumed',
        resumedAt: '2026-06-27T12:15:00Z',
        nextDrawAt: '2026-06-27T12:15:30Z',
      };
    case 'draw':
      return {
        gameId: 'game-1',
        drawId: 'draw-1',
        gameNumberId: 'number-1',
        sequence: 1,
        drawnNumber: 19,
        currentHits: 1,
        hitsRequired: 5,
        numberIsSold: false,
        winnerCreated: false,
        winnerEntryId: null,
        gameStatus: 'running',
        drawnAt: '2026-06-27T12:16:00Z',
        replay: false,
      };
  }
}

function createReplayResult(command: EngineCommand): CommandResultMap[EngineCommand] {
  switch (command) {
    case 'start':
      return {
        gameId: 'game-1',
        status: 'running',
        outcome: 'already_started',
        scheduledStartAt: '2026-06-27T12:00:00Z',
        startedAt: '2026-06-27T12:05:00Z',
        confirmedEntriesCount: 3,
      };
    case 'pause':
      return {
        gameId: 'game-1',
        status: 'paused',
        outcome: 'already_paused',
        pausedAt: '2026-06-27T12:10:00Z',
      };
    case 'resume':
      return {
        gameId: 'game-1',
        status: 'running',
        outcome: 'already_running',
        resumedAt: '2026-06-27T12:15:00Z',
        nextDrawAt: '2026-06-27T12:15:30Z',
      };
    case 'draw':
      return {
        gameId: 'game-1',
        drawId: 'draw-1',
        gameNumberId: 'number-1',
        sequence: 1,
        drawnNumber: 19,
        currentHits: 1,
        hitsRequired: 5,
        numberIsSold: false,
        winnerCreated: false,
        winnerEntryId: null,
        gameStatus: 'running',
        drawnAt: '2026-06-27T12:16:00Z',
        replay: true,
      };
  }
}

describe('GameEngineFacade', () => {
  function asDrawRequest(
    request: (gameId: string, commandId: string) => Observable<GameEngineDrawCommandView>,
  ): (gameId: string, commandId: string) => Observable<GameEngineDrawCommandView> {
    return request;
  }

  function setup(overrides?: {
    contextRequest?: () => Observable<AdminGameDetailView>;
    drawsRequest?: () => Observable<unknown[]>;
    countersRequest?: () => Observable<unknown[]>;
    winnerRequest?: () => Observable<unknown>;
    startRequest?: () => Observable<GameEngineStartCommandView>;
    pauseRequest?: () => Observable<GameEnginePauseCommandView>;
    resumeRequest?: () => Observable<GameEngineResumeCommandView>;
    drawRequest?: (gameId: string, commandId: string) => Observable<GameEngineDrawCommandView>;
    user?: ReturnType<typeof signal<{ id: number } | null>>;
  }) {
    const user = overrides?.user ?? signal<{ id: number } | null>({ id: 7 });
    const adminRepository = {
      getGame: vi.fn(
        overrides?.contextRequest ??
          (() => new Subject<AdminGameDetailView>() as Observable<AdminGameDetailView>),
      ),
    };
    const engineRepository = {
      listDraws: vi.fn(
        overrides?.drawsRequest ?? (() => new Subject<unknown[]>() as Observable<unknown[]>),
      ),
      listCounters: vi.fn(
        overrides?.countersRequest ?? (() => new Subject<unknown[]>() as Observable<unknown[]>),
      ),
      getWinner: vi.fn(
        overrides?.winnerRequest ?? (() => new Subject<unknown>() as Observable<unknown>),
      ),
      startGame: vi.fn(
        overrides?.startRequest ??
          (() => new Subject<GameEngineStartCommandView>() as Observable<GameEngineStartCommandView>),
      ),
      pauseGame: vi.fn(
        overrides?.pauseRequest ??
          (() => new Subject<GameEnginePauseCommandView>() as Observable<GameEnginePauseCommandView>),
      ),
      resumeGame: vi.fn(
        overrides?.resumeRequest ??
          (() => new Subject<GameEngineResumeCommandView>() as Observable<GameEngineResumeCommandView>),
      ),
      drawNumber: vi.fn(
        overrides?.drawRequest ??
          (() => new Subject<GameEngineDrawCommandView>() as Observable<GameEngineDrawCommandView>),
      ),
    };

    TestBed.configureTestingModule({
      providers: [
        GameEngineFacade,
        DrawCommandIdService,
        { provide: ADMIN_GAMES_REPOSITORY, useValue: adminRepository },
        { provide: GAME_ENGINE_REPOSITORY, useValue: engineRepository },
        { provide: AuthSessionService, useValue: { user } },
      ],
    });

    return {
      facade: TestBed.inject(GameEngineFacade),
      adminRepository,
      engineRepository,
      user,
    };
  }

  function settleLoadedSubjects(params: {
    context$: Subject<AdminGameDetailView>;
    draws$: Subject<unknown[]>;
    counters$: Subject<unknown[]>;
    winner$: Subject<unknown>;
    context: AdminGameDetailView;
  }): void {
    params.context$.next(params.context);
    params.context$.complete();
    params.draws$.next([]);
    params.draws$.complete();
    params.counters$.next([]);
    params.counters$.complete();
    params.winner$.error(
      new HttpErrorResponse({ status: 404, error: { message: 'game_winner_not_found' } }),
    );
  }

  function invokeCommand(facade: GameEngineFacade, command: EngineCommand): void {
    switch (command) {
      case 'start':
        facade.startGame();
        break;
      case 'pause':
        facade.pauseGame();
        break;
      case 'resume':
        facade.resumeGame();
        break;
      case 'draw':
        facade.drawNumber();
        break;
    }
  }

  function commandStatus(facade: GameEngineFacade, command: EngineCommand): CommandStatus {
    switch (command) {
      case 'start':
        return facade.startStatus();
      case 'pause':
        return facade.pauseStatus();
      case 'resume':
        return facade.resumeStatus();
      case 'draw':
        return facade.drawStatus();
    }
  }

  function commandResult(facade: GameEngineFacade, command: EngineCommand) {
    switch (command) {
      case 'start':
        return facade.startResult();
      case 'pause':
        return facade.pauseResult();
      case 'resume':
        return facade.resumeResult();
      case 'draw':
        return facade.drawResult();
    }
  }

  function commandError(facade: GameEngineFacade, command: EngineCommand) {
    switch (command) {
      case 'start':
        return facade.startError();
      case 'pause':
        return facade.pauseError();
      case 'resume':
        return facade.resumeError();
      case 'draw':
        return facade.drawError();
    }
  }

  it('loads the contextual engine snapshot successfully', () => {
    const context$ = new Subject<AdminGameDetailView>();
    const draws$ = new Subject<unknown[]>();
    const counters$ = new Subject<unknown[]>();
    const winner$ = new Subject<unknown>();

    const { facade } = setup({
      contextRequest: () => context$,
      drawsRequest: () => draws$,
      countersRequest: () => counters$,
      winnerRequest: () => winner$,
    });

    facade.load('game-1', 'contextual');
    settleLoadedSubjects({ context$, draws$, counters$, winner$, context: createContext('game-1') });

    expect(facade.status()).toBe('loaded');
    expect(facade.snapshot()?.context.id).toBe('game-1');
    expect(facade.snapshot()?.winner).toBeNull();
  });

  it('maps 403 load failures to forbidden', () => {
    const { facade } = setup({
      contextRequest: () =>
        throwError(() => new HttpErrorResponse({ status: 403, error: { message: 'forbidden' } })),
      drawsRequest: () => throwError(() => new Error('unused')),
      countersRequest: () => throwError(() => new Error('unused')),
      winnerRequest: () => throwError(() => new Error('unused')),
    });

    facade.load('game-1', 'contextual');
    expect(facade.status()).toBe('forbidden');
  });

  it('ignores late load responses after a fast game change', () => {
    const firstContext$ = new Subject<AdminGameDetailView>();
    const secondContext$ = new Subject<AdminGameDetailView>();
    const firstDraws$ = new Subject<unknown[]>();
    const secondDraws$ = new Subject<unknown[]>();
    const firstCounters$ = new Subject<unknown[]>();
    const secondCounters$ = new Subject<unknown[]>();
    const firstWinner$ = new Subject<unknown>();
    const secondWinner$ = new Subject<unknown>();

    const adminRepository = {
      getGame: vi.fn().mockReturnValueOnce(firstContext$).mockReturnValueOnce(secondContext$),
    };
    const engineRepository = {
      listDraws: vi.fn().mockReturnValueOnce(firstDraws$).mockReturnValueOnce(secondDraws$),
      listCounters: vi.fn().mockReturnValueOnce(firstCounters$).mockReturnValueOnce(secondCounters$),
      getWinner: vi.fn().mockReturnValueOnce(firstWinner$).mockReturnValueOnce(secondWinner$),
      startGame: vi.fn(),
      pauseGame: vi.fn(),
      resumeGame: vi.fn(),
      drawNumber: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        GameEngineFacade,
        DrawCommandIdService,
        { provide: ADMIN_GAMES_REPOSITORY, useValue: adminRepository },
        { provide: GAME_ENGINE_REPOSITORY, useValue: engineRepository },
        { provide: AuthSessionService, useValue: { user: signal({ id: 7 }) } },
      ],
    });

    const facade = TestBed.inject(GameEngineFacade);
    facade.load('game-1', 'contextual');
    facade.load('game-2', 'contextual');

    settleLoadedSubjects({
      context$: secondContext$,
      draws$: secondDraws$,
      counters$: secondCounters$,
      winner$: secondWinner$,
      context: createContext('game-2'),
    });

    firstContext$.next(createContext('game-1'));
    firstDraws$.next([]);
    firstCounters$.next([]);
    firstWinner$.next(null);

    expect(facade.snapshot()?.context.id).toBe('game-2');
  });

  it('ignores late load responses after logout', () => {
    const context$ = new Subject<AdminGameDetailView>();
    const draws$ = new Subject<unknown[]>();
    const counters$ = new Subject<unknown[]>();
    const winner$ = new Subject<unknown>();
    const user = signal<{ id: number } | null>({ id: 7 });

    const { facade } = setup({
      contextRequest: () => context$,
      drawsRequest: () => draws$,
      countersRequest: () => counters$,
      winnerRequest: () => winner$,
      user,
    });

    facade.load('game-logout', 'contextual');
    user.set(null);
    settleLoadedSubjects({
      context$,
      draws$,
      counters$,
      winner$,
      context: createContext('game-logout'),
    });

    expect(facade.snapshot()).toBeNull();
    expect(facade.status()).toBe('loading');
  });

  for (const command of ['start', 'pause', 'resume', 'draw'] as const) {
    it(`resets stale ${command} feedback when the user changes to another game`, () => {
      const firstContext$ = new Subject<AdminGameDetailView>();
      const secondContext$ = new Subject<AdminGameDetailView>();
      const thirdContext$ = new Subject<AdminGameDetailView>();
      const firstDraws$ = new Subject<unknown[]>();
      const secondDraws$ = new Subject<unknown[]>();
      const thirdDraws$ = new Subject<unknown[]>();
      const firstCounters$ = new Subject<unknown[]>();
      const secondCounters$ = new Subject<unknown[]>();
      const thirdCounters$ = new Subject<unknown[]>();
      const firstWinner$ = new Subject<unknown>();
      const secondWinner$ = new Subject<unknown>();
      const thirdWinner$ = new Subject<unknown>();
      const command$ = new Subject<CommandResultMap[typeof command]>();

      const adminRepository = {
        getGame: vi
          .fn()
          .mockReturnValueOnce(firstContext$)
          .mockReturnValueOnce(secondContext$)
          .mockReturnValueOnce(thirdContext$),
      };
      const engineRepository = {
        listDraws: vi
          .fn()
          .mockReturnValueOnce(firstDraws$)
          .mockReturnValueOnce(secondDraws$)
          .mockReturnValueOnce(thirdDraws$),
        listCounters: vi
          .fn()
          .mockReturnValueOnce(firstCounters$)
          .mockReturnValueOnce(secondCounters$)
          .mockReturnValueOnce(thirdCounters$),
        getWinner: vi
          .fn()
          .mockReturnValueOnce(firstWinner$)
          .mockReturnValueOnce(secondWinner$)
          .mockReturnValueOnce(thirdWinner$),
        startGame: vi.fn(),
        pauseGame: vi.fn(),
        resumeGame: vi.fn(),
        drawNumber: vi.fn(),
      };

      switch (command) {
        case 'start':
          engineRepository.startGame = vi.fn(() => command$ as Subject<GameEngineStartCommandView>);
          break;
        case 'pause':
          engineRepository.pauseGame = vi.fn(() => command$ as Subject<GameEnginePauseCommandView>);
          break;
        case 'resume':
          engineRepository.resumeGame = vi.fn(() => command$ as Subject<GameEngineResumeCommandView>);
          break;
        case 'draw':
          engineRepository.drawNumber = vi.fn(() => command$ as Subject<GameEngineDrawCommandView>);
          break;
      }

      TestBed.configureTestingModule({
        providers: [
          GameEngineFacade,
          DrawCommandIdService,
          { provide: ADMIN_GAMES_REPOSITORY, useValue: adminRepository },
          { provide: GAME_ENGINE_REPOSITORY, useValue: engineRepository },
          { provide: AuthSessionService, useValue: { user: signal({ id: 7 }) } },
        ],
      });

      const facade = TestBed.inject(GameEngineFacade);
      facade.load('game-1', 'contextual');
      settleLoadedSubjects({
        context$: firstContext$,
        draws$: firstDraws$,
        counters$: firstCounters$,
        winner$: firstWinner$,
        context: createLoadedContextForCommand(command),
      });

      invokeCommand(facade, command);
      command$.next(createSuccessResult(command) as CommandResultMap[typeof command]);

      settleLoadedSubjects({
        context$: secondContext$,
        draws$: secondDraws$,
        counters$: secondCounters$,
        winner$: secondWinner$,
        context: createRefreshedContext(command),
      });

      facade.load('game-2', 'contextual');
      settleLoadedSubjects({
        context$: thirdContext$,
        draws$: thirdDraws$,
        counters$: thirdCounters$,
        winner$: thirdWinner$,
        context: createContext('game-2'),
      });

      expect(commandStatus(facade, command)).toBe('idle');
      expect(commandResult(facade, command)).toBeNull();
      expect(commandError(facade, command)).toBeNull();
    });

    it(`submits ${command} successfully and refreshes the console`, () => {
      const firstContext$ = new Subject<AdminGameDetailView>();
      const secondContext$ = new Subject<AdminGameDetailView>();
      const firstDraws$ = new Subject<unknown[]>();
      const secondDraws$ = new Subject<unknown[]>();
      const firstCounters$ = new Subject<unknown[]>();
      const secondCounters$ = new Subject<unknown[]>();
      const firstWinner$ = new Subject<unknown>();
      const secondWinner$ = new Subject<unknown>();
      const command$ = new Subject<CommandResultMap[typeof command]>();

      const adminRepository = {
        getGame: vi.fn().mockReturnValueOnce(firstContext$).mockReturnValueOnce(secondContext$),
      };
      const engineRepository = {
        listDraws: vi.fn().mockReturnValueOnce(firstDraws$).mockReturnValueOnce(secondDraws$),
        listCounters: vi.fn().mockReturnValueOnce(firstCounters$).mockReturnValueOnce(secondCounters$),
        getWinner: vi.fn().mockReturnValueOnce(firstWinner$).mockReturnValueOnce(secondWinner$),
        startGame: vi.fn(),
        pauseGame: vi.fn(),
        resumeGame: vi.fn(),
        drawNumber: vi.fn(),
      };

      switch (command) {
        case 'start':
          engineRepository.startGame = vi.fn(() => command$ as Subject<GameEngineStartCommandView>);
          break;
        case 'pause':
          engineRepository.pauseGame = vi.fn(() => command$ as Subject<GameEnginePauseCommandView>);
          break;
        case 'resume':
          engineRepository.resumeGame = vi.fn(() => command$ as Subject<GameEngineResumeCommandView>);
          break;
        case 'draw':
          engineRepository.drawNumber = vi.fn(() => command$ as Subject<GameEngineDrawCommandView>);
          break;
      }

      TestBed.configureTestingModule({
        providers: [
          GameEngineFacade,
          DrawCommandIdService,
          { provide: ADMIN_GAMES_REPOSITORY, useValue: adminRepository },
          { provide: GAME_ENGINE_REPOSITORY, useValue: engineRepository },
          { provide: AuthSessionService, useValue: { user: signal({ id: 7 }) } },
        ],
      });

      const facade = TestBed.inject(GameEngineFacade);
      facade.load('game-1', 'contextual');
      settleLoadedSubjects({
        context$: firstContext$,
        draws$: firstDraws$,
        counters$: firstCounters$,
        winner$: firstWinner$,
        context: createLoadedContextForCommand(command),
      });

      invokeCommand(facade, command);
      command$.next(createSuccessResult(command) as CommandResultMap[typeof command]);

      settleLoadedSubjects({
        context$: secondContext$,
        draws$: secondDraws$,
        counters$: secondCounters$,
        winner$: secondWinner$,
        context: createRefreshedContext(command),
      });

      expect(commandStatus(facade, command)).toBe('success');
      expect(facade.status()).toBe('loaded');
      expect(adminRepository.getGame).toHaveBeenCalledTimes(2);
    });

    it(`treats ${command} replay as a successful response and refreshes the console`, () => {
      const firstContext$ = new Subject<AdminGameDetailView>();
      const secondContext$ = new Subject<AdminGameDetailView>();
      const firstDraws$ = new Subject<unknown[]>();
      const secondDraws$ = new Subject<unknown[]>();
      const firstCounters$ = new Subject<unknown[]>();
      const secondCounters$ = new Subject<unknown[]>();
      const firstWinner$ = new Subject<unknown>();
      const secondWinner$ = new Subject<unknown>();
      const command$ = new Subject<CommandResultMap[typeof command]>();

      const adminRepository = {
        getGame: vi.fn().mockReturnValueOnce(firstContext$).mockReturnValueOnce(secondContext$),
      };
      const engineRepository = {
        listDraws: vi.fn().mockReturnValueOnce(firstDraws$).mockReturnValueOnce(secondDraws$),
        listCounters: vi.fn().mockReturnValueOnce(firstCounters$).mockReturnValueOnce(secondCounters$),
        getWinner: vi.fn().mockReturnValueOnce(firstWinner$).mockReturnValueOnce(secondWinner$),
        startGame: vi.fn(),
        pauseGame: vi.fn(),
        resumeGame: vi.fn(),
        drawNumber: vi.fn(),
      };

      switch (command) {
        case 'start':
          engineRepository.startGame = vi.fn(() => command$ as Subject<GameEngineStartCommandView>);
          break;
        case 'pause':
          engineRepository.pauseGame = vi.fn(() => command$ as Subject<GameEnginePauseCommandView>);
          break;
        case 'resume':
          engineRepository.resumeGame = vi.fn(() => command$ as Subject<GameEngineResumeCommandView>);
          break;
        case 'draw':
          engineRepository.drawNumber = vi.fn(() => command$ as Subject<GameEngineDrawCommandView>);
          break;
      }

      TestBed.configureTestingModule({
        providers: [
          GameEngineFacade,
          DrawCommandIdService,
          { provide: ADMIN_GAMES_REPOSITORY, useValue: adminRepository },
          { provide: GAME_ENGINE_REPOSITORY, useValue: engineRepository },
          { provide: AuthSessionService, useValue: { user: signal({ id: 7 }) } },
        ],
      });

      const facade = TestBed.inject(GameEngineFacade);
      facade.load('game-1', 'contextual');
      settleLoadedSubjects({
        context$: firstContext$,
        draws$: firstDraws$,
        counters$: firstCounters$,
        winner$: firstWinner$,
        context: createLoadedContextForCommand(command),
      });

      invokeCommand(facade, command);
      command$.next(createReplayResult(command) as CommandResultMap[typeof command]);

      settleLoadedSubjects({
        context$: secondContext$,
        draws$: secondDraws$,
        counters$: secondCounters$,
        winner$: secondWinner$,
        context: createRefreshedContext(command),
      });

      expect(commandStatus(facade, command)).toBe('success');
      expect(commandResult(facade, command)).not.toBeNull();
    });

    it(`blocks double submit while ${command} is in flight`, () => {
      const context$ = new Subject<AdminGameDetailView>();
      const draws$ = new Subject<unknown[]>();
      const counters$ = new Subject<unknown[]>();
      const winner$ = new Subject<unknown>();
      const command$ = new Subject<CommandResultMap[typeof command]>();
      const engineRepository = {
        listDraws: vi.fn(() => draws$),
        listCounters: vi.fn(() => counters$),
        getWinner: vi.fn(() => winner$),
        startGame: vi.fn(),
        pauseGame: vi.fn(),
        resumeGame: vi.fn(),
        drawNumber: vi.fn(),
      };

      switch (command) {
        case 'start':
          engineRepository.startGame = vi.fn(() => command$ as Subject<GameEngineStartCommandView>);
          break;
        case 'pause':
          engineRepository.pauseGame = vi.fn(() => command$ as Subject<GameEnginePauseCommandView>);
          break;
        case 'resume':
          engineRepository.resumeGame = vi.fn(() => command$ as Subject<GameEngineResumeCommandView>);
          break;
        case 'draw':
          engineRepository.drawNumber = vi.fn(() => command$ as Subject<GameEngineDrawCommandView>);
          break;
      }

      TestBed.configureTestingModule({
        providers: [
          GameEngineFacade,
          DrawCommandIdService,
          { provide: ADMIN_GAMES_REPOSITORY, useValue: { getGame: vi.fn(() => context$) } },
          { provide: GAME_ENGINE_REPOSITORY, useValue: engineRepository },
          { provide: AuthSessionService, useValue: { user: signal({ id: 7 }) } },
        ],
      });

      const facade = TestBed.inject(GameEngineFacade);
      facade.load('game-1', 'contextual');
      settleLoadedSubjects({
        context$,
        draws$,
        counters$,
        winner$,
        context: createLoadedContextForCommand(command),
      });

      invokeCommand(facade, command);
      invokeCommand(facade, command);

      const repositoryMethod =
        command === 'start'
          ? engineRepository.startGame
          : command === 'pause'
            ? engineRepository.pauseGame
            : command === 'resume'
              ? engineRepository.resumeGame
              : engineRepository.drawNumber;

      expect(repositoryMethod).toHaveBeenCalledTimes(1);
      expect(commandStatus(facade, command)).toBe('submitting');
    });

    it(`ignores late ${command} responses after a fast game change`, () => {
      const firstContext$ = new Subject<AdminGameDetailView>();
      const secondContext$ = new Subject<AdminGameDetailView>();
      const drawsA$ = new Subject<unknown[]>();
      const drawsB$ = new Subject<unknown[]>();
      const countersA$ = new Subject<unknown[]>();
      const countersB$ = new Subject<unknown[]>();
      const winnerA$ = new Subject<unknown>();
      const winnerB$ = new Subject<unknown>();
      const command$ = new Subject<CommandResultMap[typeof command]>();

      const adminRepository = {
        getGame: vi.fn().mockReturnValueOnce(firstContext$).mockReturnValueOnce(secondContext$),
      };
      const engineRepository = {
        listDraws: vi.fn().mockReturnValueOnce(drawsA$).mockReturnValueOnce(drawsB$),
        listCounters: vi.fn().mockReturnValueOnce(countersA$).mockReturnValueOnce(countersB$),
        getWinner: vi.fn().mockReturnValueOnce(winnerA$).mockReturnValueOnce(winnerB$),
        startGame: vi.fn(),
        pauseGame: vi.fn(),
        resumeGame: vi.fn(),
        drawNumber: vi.fn(),
      };

      switch (command) {
        case 'start':
          engineRepository.startGame = vi.fn(() => command$ as Subject<GameEngineStartCommandView>);
          break;
        case 'pause':
          engineRepository.pauseGame = vi.fn(() => command$ as Subject<GameEnginePauseCommandView>);
          break;
        case 'resume':
          engineRepository.resumeGame = vi.fn(() => command$ as Subject<GameEngineResumeCommandView>);
          break;
        case 'draw':
          engineRepository.drawNumber = vi.fn(() => command$ as Subject<GameEngineDrawCommandView>);
          break;
      }

      TestBed.configureTestingModule({
        providers: [
          GameEngineFacade,
          DrawCommandIdService,
          { provide: ADMIN_GAMES_REPOSITORY, useValue: adminRepository },
          { provide: GAME_ENGINE_REPOSITORY, useValue: engineRepository },
          { provide: AuthSessionService, useValue: { user: signal({ id: 7 }) } },
        ],
      });

      const facade = TestBed.inject(GameEngineFacade);
      facade.load('game-1', 'contextual');
      settleLoadedSubjects({
        context$: firstContext$,
        draws$: drawsA$,
        counters$: countersA$,
        winner$: winnerA$,
        context: createLoadedContextForCommand(command),
      });

      invokeCommand(facade, command);
      facade.load('game-2', 'contextual');
      settleLoadedSubjects({
        context$: secondContext$,
        draws$: drawsB$,
        counters$: countersB$,
        winner$: winnerB$,
        context: createContext('game-2'),
      });

      command$.next(createSuccessResult(command) as CommandResultMap[typeof command]);

      expect(facade.snapshot()?.context.id).toBe('game-2');
      expect(commandResult(facade, command)).toBeNull();
    });

    it(`ignores late ${command} responses after logout`, () => {
      const context$ = new Subject<AdminGameDetailView>();
      const draws$ = new Subject<unknown[]>();
      const counters$ = new Subject<unknown[]>();
      const winner$ = new Subject<unknown>();
      const command$ = new Subject<CommandResultMap[typeof command]>();
      const user = signal<{ id: number } | null>({ id: 7 });

      const { facade } = setup({
        contextRequest: () => context$,
        drawsRequest: () => draws$,
        countersRequest: () => counters$,
        winnerRequest: () => winner$,
        startRequest:
          command === 'start'
            ? () => command$ as Observable<GameEngineStartCommandView>
            : undefined,
        pauseRequest:
          command === 'pause'
            ? () => command$ as Observable<GameEnginePauseCommandView>
            : undefined,
        resumeRequest:
          command === 'resume'
            ? () => command$ as Observable<GameEngineResumeCommandView>
            : undefined,
        drawRequest:
          command === 'draw'
            ? asDrawRequest(
                () => command$ as Observable<GameEngineDrawCommandView>,
              )
            : undefined,
        user,
      });

      facade.load('game-1', 'contextual');
      settleLoadedSubjects({
        context$,
        draws$,
        counters$,
        winner$,
        context: createLoadedContextForCommand(command),
      });

      invokeCommand(facade, command);
      user.set(null);
      command$.next(createSuccessResult(command) as CommandResultMap[typeof command]);

      expect(commandResult(facade, command)).toBeNull();
      expect(commandStatus(facade, command)).toBe('submitting');
    });

    it(`keeps the ${command} success but surfaces a failed refresh independently`, () => {
      const initialContext$ = new Subject<AdminGameDetailView>();
      const draws$ = new Subject<unknown[]>();
      const counters$ = new Subject<unknown[]>();
      const winner$ = new Subject<unknown>();
      const command$ = new Subject<CommandResultMap[typeof command]>();

      const adminRepository = {
        getGame: vi
          .fn()
          .mockReturnValueOnce(initialContext$)
          .mockReturnValueOnce(
            throwError(() => new HttpErrorResponse({ status: 0, error: new ProgressEvent('error') })),
          ),
      };
      const engineRepository = {
        listDraws: vi.fn(() => draws$),
        listCounters: vi.fn(() => counters$),
        getWinner: vi.fn(() => winner$),
        startGame: vi.fn(),
        pauseGame: vi.fn(),
        resumeGame: vi.fn(),
        drawNumber: vi.fn(),
      };

      switch (command) {
        case 'start':
          engineRepository.startGame = vi.fn(() => command$ as Subject<GameEngineStartCommandView>);
          break;
        case 'pause':
          engineRepository.pauseGame = vi.fn(() => command$ as Subject<GameEnginePauseCommandView>);
          break;
        case 'resume':
          engineRepository.resumeGame = vi.fn(() => command$ as Subject<GameEngineResumeCommandView>);
          break;
        case 'draw':
          engineRepository.drawNumber = vi.fn(() => command$ as Subject<GameEngineDrawCommandView>);
          break;
      }

      TestBed.configureTestingModule({
        providers: [
          GameEngineFacade,
          DrawCommandIdService,
          { provide: ADMIN_GAMES_REPOSITORY, useValue: adminRepository },
          { provide: GAME_ENGINE_REPOSITORY, useValue: engineRepository },
          { provide: AuthSessionService, useValue: { user: signal({ id: 7 }) } },
        ],
      });

      const facade = TestBed.inject(GameEngineFacade);
      facade.load('game-1', 'contextual');
      settleLoadedSubjects({
        context$: initialContext$,
        draws$,
        counters$,
        winner$,
        context: createLoadedContextForCommand(command),
      });

      invokeCommand(facade, command);
      command$.next(createSuccessResult(command) as CommandResultMap[typeof command]);

      expect(commandStatus(facade, command)).toBe('success');
      expect(facade.status()).toBe('networkError');
    });
  }

  for (const command of ['start', 'pause', 'resume', 'draw'] as const) {
    const requestFactoryKey =
      command === 'start'
        ? 'startRequest'
        : command === 'pause'
          ? 'pauseRequest'
          : command === 'resume'
            ? 'resumeRequest'
            : 'drawRequest';

    for (const [httpStatus, expectedStatus] of [
      [409, 'conflict'],
      [401, 'unauthorized'],
      [403, 'forbidden'],
      [404, 'notFound'],
      [422, 'invalidState'],
      [0, 'networkError'],
      [500, 'unexpectedError'],
    ] as const) {
      it(`maps ${command} ${httpStatus} failures to ${expectedStatus}`, () => {
        const { facade } = setup({
          contextRequest: () => settledStream(createLoadedContextForCommand(command)),
          drawsRequest: () => settledStream([]),
          countersRequest: () => settledStream([]),
          winnerRequest: settledWinnerRequest,
          [requestFactoryKey]:
            command === 'draw'
              ? () =>
                  throwError(
                    () =>
                      new HttpErrorResponse({
                        status: httpStatus,
                        error:
                          httpStatus === 0
                            ? new ProgressEvent('error')
                            : { message: `${command}_${httpStatus}` },
                      }),
                  )
              : () =>
                  throwError(
                    () =>
                      new HttpErrorResponse({
                        status: httpStatus,
                        error:
                          httpStatus === 0
                            ? new ProgressEvent('error')
                            : { message: `${command}_${httpStatus}` },
                      }),
                  ),
        } as never);

        facade.load('game-1', 'contextual');
        invokeCommand(facade, command);

        expect(commandStatus(facade, command)).toBe(expectedStatus);
        expect(commandError(facade, command)).not.toBeNull();
      });
    }
  }

  it('retries draw with the same command id after a network failure', () => {
    const capturedCommandIds: string[] = [];
    const { facade } = setup({
      contextRequest: () => settledStream(createLoadedContextForCommand('draw')),
      drawsRequest: () => settledStream([]),
      countersRequest: () => settledStream([]),
      winnerRequest: settledWinnerRequest,
      drawRequest: asDrawRequest((_gameId, commandId): Observable<GameEngineDrawCommandView> => {
        capturedCommandIds.push(commandId);

        if (capturedCommandIds.length === 1) {
          return throwError(
            () => new HttpErrorResponse({ status: 0, error: new ProgressEvent('error') }),
          );
        }

        return settledStream(createSuccessResult('draw') as GameEngineDrawCommandView);
      }),
    });

    facade.load('game-1', 'contextual');
    facade.drawNumber();
    facade.drawNumber();

    expect(capturedCommandIds).toHaveLength(2);
    expect(capturedCommandIds[0]).toBe(capturedCommandIds[1]);
    expect(facade.drawStatus()).toBe('success');
  });

  it('creates a new draw command id after a definitive success', () => {
    const capturedCommandIds: string[] = [];
    const { facade } = setup({
      contextRequest: () => settledStream(createLoadedContextForCommand('draw')),
      drawsRequest: () => settledStream([]),
      countersRequest: () => settledStream([]),
      winnerRequest: settledWinnerRequest,
      drawRequest: asDrawRequest((_gameId, commandId): Observable<GameEngineDrawCommandView> => {
        capturedCommandIds.push(commandId);

        return settledStream(createSuccessResult('draw') as GameEngineDrawCommandView);
      }),
    });

    facade.load('game-1', 'contextual');
    facade.drawNumber();
    facade.drawNumber();

    expect(capturedCommandIds).toHaveLength(2);
    expect(capturedCommandIds[0]).not.toBe(capturedCommandIds[1]);
  });

  it('discards the pending draw command id when the user changes game', () => {
    const capturedCommandIds: string[] = [];
    const firstContext$ = new Subject<AdminGameDetailView>();
    const secondContext$ = new Subject<AdminGameDetailView>();
    const drawsA$ = new Subject<unknown[]>();
    const drawsB$ = new Subject<unknown[]>();
    const countersA$ = new Subject<unknown[]>();
    const countersB$ = new Subject<unknown[]>();
    const winnerA$ = new Subject<unknown>();
    const winnerB$ = new Subject<unknown>();

    const adminRepository = {
      getGame: vi.fn().mockReturnValueOnce(firstContext$).mockReturnValueOnce(secondContext$),
    };
    const engineRepository = {
      listDraws: vi.fn().mockReturnValueOnce(drawsA$).mockReturnValueOnce(drawsB$),
      listCounters: vi.fn().mockReturnValueOnce(countersA$).mockReturnValueOnce(countersB$),
      getWinner: vi.fn().mockReturnValueOnce(winnerA$).mockReturnValueOnce(winnerB$),
      startGame: vi.fn(),
      pauseGame: vi.fn(),
      resumeGame: vi.fn(),
      drawNumber: vi.fn((_gameId: string, commandId: string) => {
        capturedCommandIds.push(commandId);

        return throwError(() => new HttpErrorResponse({ status: 0, error: new ProgressEvent('error') }));
      }),
    };

    TestBed.configureTestingModule({
      providers: [
        GameEngineFacade,
        DrawCommandIdService,
        { provide: ADMIN_GAMES_REPOSITORY, useValue: adminRepository },
        { provide: GAME_ENGINE_REPOSITORY, useValue: engineRepository },
        { provide: AuthSessionService, useValue: { user: signal({ id: 7 }) } },
      ],
    });

    const facade = TestBed.inject(GameEngineFacade);
    facade.load('game-1', 'contextual');
    settleLoadedSubjects({
      context$: firstContext$,
      draws$: drawsA$,
      counters$: countersA$,
      winner$: winnerA$,
      context: createLoadedContextForCommand('draw'),
    });

    facade.drawNumber();
    facade.load('game-2', 'contextual');
    settleLoadedSubjects({
      context$: secondContext$,
      draws$: drawsB$,
      counters$: countersB$,
      winner$: winnerB$,
      context: createLoadedContextForCommand('draw'),
    });
    facade.drawNumber();

    expect(capturedCommandIds).toHaveLength(2);
    expect(capturedCommandIds[0]).not.toBe(capturedCommandIds[1]);
  });

  it('discards the pending draw command id after logout', () => {
    const capturedCommandIds: string[] = [];
    const user = signal<{ id: number } | null>({ id: 7 });

    const { facade } = setup({
      contextRequest: () => settledStream(createLoadedContextForCommand('draw')),
      drawsRequest: () => settledStream([]),
      countersRequest: () => settledStream([]),
      winnerRequest: settledWinnerRequest,
      drawRequest: (_gameId, commandId) => {
        capturedCommandIds.push(commandId);

        return throwError(() => new HttpErrorResponse({ status: 0, error: new ProgressEvent('error') }));
      },
      user,
    });

    facade.load('game-1', 'contextual');
    facade.drawNumber();
    user.set(null);
    user.set({ id: 7 });
    facade.drawNumber();

    expect(capturedCommandIds).toHaveLength(2);
    expect(capturedCommandIds[0]).not.toBe(capturedCommandIds[1]);
  });

  for (const definitiveStatus of [401, 403, 404, 409, 422] as const) {
    it(`clears the draw command id after a definitive ${definitiveStatus} error`, () => {
      const capturedCommandIds: string[] = [];
      const { facade } = setup({
        contextRequest: () => settledStream(createLoadedContextForCommand('draw')),
        drawsRequest: () => settledStream([]),
        countersRequest: () => settledStream([]),
        winnerRequest: settledWinnerRequest,
        drawRequest: (_gameId, commandId) => {
          capturedCommandIds.push(commandId);

          return throwError(
            () =>
              new HttpErrorResponse({
                status: definitiveStatus,
                error: { message: `draw_${definitiveStatus}` },
              }),
          );
        },
      });

      facade.load('game-1', 'contextual');
      facade.drawNumber();
      facade.drawNumber();

      expect(capturedCommandIds).toHaveLength(2);
      expect(capturedCommandIds[0]).not.toBe(capturedCommandIds[1]);
    });
  }

  it('preserves the draw command id after an unexpected 500 so the same intent can retry safely', () => {
    const capturedCommandIds: string[] = [];
    const { facade } = setup({
      contextRequest: () => settledStream(createLoadedContextForCommand('draw')),
      drawsRequest: () => settledStream([]),
      countersRequest: () => settledStream([]),
      winnerRequest: settledWinnerRequest,
      drawRequest: asDrawRequest((_gameId, commandId): Observable<GameEngineDrawCommandView> => {
        capturedCommandIds.push(commandId);

        if (capturedCommandIds.length === 1) {
          return throwError(
            () =>
              new HttpErrorResponse({
                status: 500,
                error: { message: 'Internal draw engine error.', error: 'internal_engine_error' },
              }),
          );
        }

        return settledStream(createReplayResult('draw') as GameEngineDrawCommandView);
      }),
    });

    facade.load('game-1', 'contextual');
    facade.drawNumber();
    facade.drawNumber();

    expect(capturedCommandIds).toHaveLength(2);
    expect(capturedCommandIds[0]).toBe(capturedCommandIds[1]);
    expect(facade.drawStatus()).toBe('success');
    expect(facade.drawResult()?.replay).toBe(true);
  });
});
