import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { GameEngineFacade } from '../../data-access/game-engine.facade';
import { GameEngineConsoleView } from '../../models/game-engine.models';
import { GameEnginePage } from './game-engine-page';

function createFacadeMock() {
  return {
    load: vi.fn(),
    loadDrawsPage: vi.fn(),
    loadCountersPage: vi.fn(),
    refresh: vi.fn(),
    clear: vi.fn(),
    startGame: vi.fn(),
    pauseGame: vi.fn(),
    resumeGame: vi.fn(),
    drawNumber: vi.fn(),
    rebuildCounters: vi.fn(),
    snapshot: signal<GameEngineConsoleView | null>({
      context: {
        id: 'game-1',
        slug: 'bingo-central',
        name: 'Bingo Central',
        description: null,
        status: { value: 'sales_closed', label: 'Ventas cerradas', tone: 'warning', isKnown: true },
        numberRange: { min: 1, max: 90, hitsRequired: 5 },
        ticketPrice: { amountCents: 500, currency: 'PEN' },
        prize: { amountCents: 100000, currency: 'PEN' },
        schedule: {
          salesOpensAt: null,
          salesClosesAt: null,
          scheduledStartAt: '2026-06-27T01:00:00Z',
          drawIntervalSeconds: 30,
          autoDrawEnabled: true,
        },
        lifecycle: { startedAt: null, pausedAt: null, completedAt: null },
        engine: { nextDrawAt: null, lastConsumedTickAt: null },
        numbers: { total: 90, sold: 10, reserved: 3, available: 77 },
        settings: null,
        latestDraw: null,
        winner: null,
        commerce: {
          reservations: { total: 0 },
          orders: {
            pending: 0,
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
          entries: { confirmed: 2, cancelled: 0, refunded: 0, winner: 0 },
        },
        projection: { drawsTotal: 0, distinctDrawnNumbers: 0, maxCounterHits: 0, lastDrawnNumber: null },
        createdBy: 1,
        createdAt: '2026-06-27T11:00:00Z',
      },
      draws: [],
      drawsPageInfo: {
        currentPage: 1,
        from: null,
        lastPage: 1,
        path: '/api/v1/admin/games/game-1/draws',
        perPage: 50,
        to: null,
        total: 0,
      },
      drawsLinks: { first: null, last: null, prev: null, next: null },
      counters: [],
      countersPageInfo: {
        currentPage: 1,
        from: null,
        lastPage: 1,
        path: '/api/v1/admin/games/game-1/counters',
        perPage: 50,
        to: null,
        total: 0,
      },
      countersLinks: { first: null, last: null, prev: null, next: null },
      winner: null,
    }),
    status: signal<
      | 'idle'
      | 'loading'
      | 'refreshing'
      | 'loaded'
      | 'unauthorized'
      | 'forbidden'
      | 'notFound'
      | 'validationError'
      | 'networkError'
      | 'unexpectedError'
    >('loaded'),
    error: signal<{ message: string } | null>(null),
    accessMode: signal<'contextual' | 'manual'>('contextual'),
    startStatus: signal<
      | 'idle'
      | 'submitting'
      | 'success'
      | 'conflict'
      | 'unauthorized'
      | 'forbidden'
      | 'notFound'
      | 'invalidState'
      | 'networkError'
      | 'unexpectedError'
    >('idle'),
    startError: signal<{ message: string } | null>(null),
    startResult: signal<{
      gameId: string;
      status: string;
      outcome: 'started' | 'already_started';
      scheduledStartAt: string;
      startedAt: string;
      confirmedEntriesCount: number;
    } | null>(null),
    pauseStatus: signal<
      | 'idle'
      | 'submitting'
      | 'success'
      | 'conflict'
      | 'unauthorized'
      | 'forbidden'
      | 'notFound'
      | 'invalidState'
      | 'networkError'
      | 'unexpectedError'
    >('idle'),
    pauseError: signal<{ message: string } | null>(null),
    pauseResult: signal<{
      gameId: string;
      status: 'paused';
      outcome: 'paused' | 'already_paused';
      pausedAt: string;
    } | null>(null),
    resumeStatus: signal<
      | 'idle'
      | 'submitting'
      | 'success'
      | 'conflict'
      | 'unauthorized'
      | 'forbidden'
      | 'notFound'
      | 'invalidState'
      | 'networkError'
      | 'unexpectedError'
    >('idle'),
    resumeError: signal<{ message: string } | null>(null),
    resumeResult: signal<{
      gameId: string;
      status: 'running';
      outcome: 'resumed' | 'already_running';
      resumedAt: string;
      nextDrawAt: string;
    } | null>(null),
    drawStatus: signal<
      | 'idle'
      | 'submitting'
      | 'success'
      | 'conflict'
      | 'unauthorized'
      | 'forbidden'
      | 'notFound'
      | 'invalidState'
      | 'networkError'
      | 'unexpectedError'
    >('idle'),
    drawError: signal<{ message: string } | null>(null),
    drawResult: signal<{
      gameId: string;
      drawId: string;
      gameNumberId: string;
      sequence: number;
      drawnNumber: number;
      currentHits: number;
      hitsRequired: number;
      numberIsSold: boolean;
      winnerCreated: boolean;
      winnerEntryId: string | null;
      gameStatus: 'running' | 'completed';
      drawnAt: string;
      replay: boolean;
    } | null>(null),
    rebuildStatus: signal<
      | 'idle'
      | 'submitting'
      | 'success'
      | 'conflict'
      | 'unauthorized'
      | 'forbidden'
      | 'notFound'
      | 'invalidState'
      | 'networkError'
      | 'unexpectedError'
    >('idle'),
    rebuildError: signal<{ message: string } | null>(null),
    rebuildResult: signal<{
      gameId: string;
      outcome: 'rebuilt' | 'already_consistent';
      previousRows: number;
      previousHitsTotal: number;
      rebuiltRows: number;
      rebuiltHitsTotal: number;
      totalDraws: number;
      maxSequence: number;
      rebuiltAt: string;
    } | null>(null),
  };
}

async function renderPage(facade: ReturnType<typeof createFacadeMock>, routeGameId = 'game-1') {
  await TestBed.configureTestingModule({
    imports: [GameEnginePage],
    providers: [
      provideRouter([]),
      {
        provide: ActivatedRoute,
        useValue: {
          paramMap: of(convertToParamMap(routeGameId === '' ? {} : { gameId: routeGameId })),
          queryParamMap: of(convertToParamMap({})),
        },
      },
    ],
  })
    .overrideComponent(GameEnginePage, {
      set: { providers: [{ provide: GameEngineFacade, useValue: facade }] },
    })
    .compileComponents();

  const fixture = TestBed.createComponent(GameEnginePage);
  fixture.detectChanges();
  return fixture;
}

describe('GameEnginePage', () => {
  it('loads the contextual route and shows the start action when the contract allows it', async () => {
    const facade = createFacadeMock();
    const fixture = await renderPage(facade);
    const text = fixture.nativeElement.textContent;

    expect(facade.load).toHaveBeenCalledWith('game-1', 'contextual');
    expect(text).toContain('Bingo Central');
    expect(text).toContain('Iniciar juego');
    expect(text).toContain('bingo-central');
    expect(text).toContain('Flujo principal desde detalle admin');
    expect(text).not.toContain('Pausar juego');
    expect(text).not.toContain('Reanudar juego');
    expect(text).not.toContain('Sortear número');
    expect(text).toContain('Herramientas técnicas');
    expect(text).toContain('Reconstruir counters');
  });

  it('shows the pause action only when the contextual snapshot is pausable', async () => {
    const facade = createFacadeMock();
    facade.snapshot.set({
      ...facade.snapshot()!,
      context: {
        ...facade.snapshot()!.context,
        status: { value: 'running', label: 'En ejecución', tone: 'info', isKnown: true },
        lifecycle: { startedAt: '2026-06-27T12:05:00Z', pausedAt: null, completedAt: null },
        engine: { nextDrawAt: '2026-06-27T12:15:30Z', lastConsumedTickAt: '2026-06-27T12:09:30Z' },
      },
    });

    const fixture = await renderPage(facade);
    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Pausar juego');
    expect(text).not.toContain('Reanudar juego');
    expect(text).not.toContain('Sortear número');
  });

  it('shows the resume action only when the contextual snapshot is resumable', async () => {
    const facade = createFacadeMock();
    facade.snapshot.set({
      ...facade.snapshot()!,
      context: {
        ...facade.snapshot()!.context,
        status: { value: 'paused', label: 'Pausado', tone: 'warning', isKnown: true },
        lifecycle: {
          startedAt: '2026-06-27T12:05:00Z',
          pausedAt: '2026-06-27T12:10:00Z',
          completedAt: null,
        },
      },
    });

    const fixture = await renderPage(facade);
    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Reanudar juego');
    expect(text).not.toContain('Pausar juego');
  });

  it('shows the draw action only when the contextual snapshot is drawable in manual mode', async () => {
    const facade = createFacadeMock();
    facade.snapshot.set({
      ...facade.snapshot()!,
      context: {
        ...facade.snapshot()!.context,
        status: { value: 'running', label: 'En ejecución', tone: 'info', isKnown: true },
        schedule: {
          ...facade.snapshot()!.context.schedule,
          autoDrawEnabled: false,
        },
        lifecycle: { startedAt: '2026-06-27T12:05:00Z', pausedAt: null, completedAt: null },
      },
    });

    const fixture = await renderPage(facade);
    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Sortear número');
    expect(text).toContain('Reconstruir counters');
  });

  it('hides the draw action when automation is active', async () => {
    const facade = createFacadeMock();
    facade.snapshot.set({
      ...facade.snapshot()!,
      context: {
        ...facade.snapshot()!.context,
        status: { value: 'running', label: 'En ejecución', tone: 'info', isKnown: true },
        lifecycle: { startedAt: '2026-06-27T12:05:00Z', pausedAt: null, completedAt: null },
      },
    });

    const fixture = await renderPage(facade);
    expect(fixture.nativeElement.textContent).not.toContain('Sortear número');
  });

  it('hides the draw action for an invalid completed snapshot', async () => {
    const facade = createFacadeMock();
    facade.snapshot.set({
      ...facade.snapshot()!,
      context: {
        ...facade.snapshot()!.context,
        status: { value: 'running', label: 'En ejecución', tone: 'info', isKnown: true },
        schedule: {
          ...facade.snapshot()!.context.schedule,
          autoDrawEnabled: false,
        },
        lifecycle: {
          startedAt: '2026-06-27T12:05:00Z',
          pausedAt: null,
          completedAt: '2026-06-27T12:20:00Z',
        },
      },
    });

    const fixture = await renderPage(facade);
    expect(fixture.nativeElement.textContent).not.toContain('Sortear número');
  });

  it('hides the draw action when a winner already exists', async () => {
    const facade = createFacadeMock();
    facade.snapshot.set({
      ...facade.snapshot()!,
      context: {
        ...facade.snapshot()!.context,
        status: { value: 'running', label: 'En ejecución', tone: 'info', isKnown: true },
        schedule: {
          ...facade.snapshot()!.context.schedule,
          autoDrawEnabled: false,
        },
        lifecycle: { startedAt: '2026-06-27T12:05:00Z', pausedAt: null, completedAt: null },
      },
      winner: {
        winnerId: 'winner-1',
        gameId: 'game-1',
        gameEntryId: 'entry-1',
        gameNumberId: 'number-1',
        winningNumber: 1,
        gameDrawId: 'draw-1',
        winningDrawSequence: 2,
        winningHits: 2,
        userId: 5,
        wonAt: '2026-06-27T12:20:00Z',
      },
    });

    const fixture = await renderPage(facade);
    expect(fixture.nativeElement.textContent).not.toContain('Sortear número');
  });

  it('opens confirmation and submits the draw mutation once', async () => {
    const facade = createFacadeMock();
    facade.snapshot.set({
      ...facade.snapshot()!,
      context: {
        ...facade.snapshot()!.context,
        status: { value: 'running', label: 'En ejecución', tone: 'info', isKnown: true },
        schedule: {
          ...facade.snapshot()!.context.schedule,
          autoDrawEnabled: false,
        },
        lifecycle: { startedAt: '2026-06-27T12:05:00Z', pausedAt: null, completedAt: null },
      },
    });

    const fixture = await renderPage(facade);
    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    buttons.find((button) => button.textContent?.includes('Sortear número'))?.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Confirmar sorteo manual');
    expect(document.activeElement?.textContent).toContain('Confirmar sorteo');

    const confirmButtons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    confirmButtons.find((button) => button.textContent?.includes('Confirmar sorteo'))?.click();

    expect(facade.drawNumber).toHaveBeenCalledTimes(1);
  });

  it('cancels the draw confirmation with Escape without mutating and restores focus', async () => {
    const facade = createFacadeMock();
    facade.snapshot.set({
      ...facade.snapshot()!,
      context: {
        ...facade.snapshot()!.context,
        status: { value: 'running', label: 'En ejecución', tone: 'info', isKnown: true },
        schedule: {
          ...facade.snapshot()!.context.schedule,
          autoDrawEnabled: false,
        },
        lifecycle: { startedAt: '2026-06-27T12:05:00Z', pausedAt: null, completedAt: null },
      },
    });

    const fixture = await renderPage(facade);
    const openButton = Array.from(fixture.nativeElement.querySelectorAll('button')).find((button) =>
      (button as HTMLButtonElement).textContent?.includes('Sortear número'),
    ) as HTMLButtonElement;
    openButton.click();
    fixture.detectChanges();

    fixture.nativeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('Confirmar sorteo manual');
    expect(facade.drawNumber).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(openButton);
  });

  it('shows draw replay feedback when backend confirms the same command', async () => {
    const facade = createFacadeMock();
    facade.drawStatus.set('success');
    facade.drawResult.set({
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
    });

    const fixture = await renderPage(facade);
    expect(fixture.nativeElement.textContent).toContain('replay del mismo sorteo manual');
  });

  it('shows draw success feedback with the drawn number', async () => {
    const facade = createFacadeMock();
    facade.drawStatus.set('success');
    facade.drawResult.set({
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
    });

    const fixture = await renderPage(facade);
    expect(fixture.nativeElement.textContent).toContain('Se sorteó el número 19');
  });

  it('shows draw conflict feedback when Laravel rejects the manual draw', async () => {
    const facade = createFacadeMock();
    facade.drawStatus.set('conflict');
    facade.drawError.set({ message: 'game_lifecycle_integrity_violation' });

    const fixture = await renderPage(facade);
    expect(fixture.nativeElement.textContent).toContain('conflicto de integridad o concurrencia');
  });

  it('shows draw invalid-state feedback when Laravel rejects the manual draw', async () => {
    const facade = createFacadeMock();
    facade.drawStatus.set('invalidState');
    facade.drawError.set({ message: 'game_engine_automation_active' });

    const fixture = await renderPage(facade);
    expect(fixture.nativeElement.textContent).toContain('ya no admite draw');
  });

  it('shows draw network feedback when the request outcome is unknown', async () => {
    const facade = createFacadeMock();
    facade.drawStatus.set('networkError');
    facade.drawError.set({ message: 'network_error' });

    const fixture = await renderPage(facade);
    expect(fixture.nativeElement.textContent).toContain('Puedes reintentar con seguridad');
  });

  it('shows the rebuild tool as a secondary technical action when the backend contract allows it', async () => {
    const facade = createFacadeMock();
    const fixture = await renderPage(facade);
    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Herramientas técnicas');
    expect(text).toContain('Reconstruir counters');
    expect(text).toContain('No forman parte del flujo operativo principal del juego.');
  });

  it('hides the rebuild action when the snapshot is in resolving state', async () => {
    const facade = createFacadeMock();
    facade.snapshot.set({
      ...facade.snapshot()!,
      context: {
        ...facade.snapshot()!.context,
        status: { value: 'resolving', label: 'Resolviendo', tone: 'warning', isKnown: true },
      },
    });

    const fixture = await renderPage(facade);
    const text = fixture.nativeElement.textContent;

    expect(text).not.toContain('Reconstruir counters');
    expect(text).not.toContain('Herramientas técnicas');
  });

  it('opens confirmation and submits rebuild once', async () => {
    const facade = createFacadeMock();
    const fixture = await renderPage(facade);
    const element = fixture.nativeElement as HTMLElement;

    const openButton = Array.from(element.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Reconstruir counters'),
    ) as HTMLButtonElement | undefined;

    expect(openButton).toBeDefined();
    openButton?.click();
    fixture.detectChanges();

    expect(document.activeElement?.textContent).toContain('Confirmar reconstrucción');

    const confirmButton = Array.from(element.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Confirmar reconstrucción'),
    ) as HTMLButtonElement | undefined;

    expect(confirmButton).toBeDefined();
    confirmButton?.click();

    expect(facade.rebuildCounters).toHaveBeenCalledTimes(1);
  });

  it('cancels rebuild confirmation without mutating and restores focus', async () => {
    const facade = createFacadeMock();
    const fixture = await renderPage(facade);
    const element = fixture.nativeElement as HTMLElement;

    const openButton = Array.from(element.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Reconstruir counters'),
    ) as HTMLButtonElement | undefined;

    expect(openButton).toBeDefined();
    openButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();

    fixture.componentInstance.closeAnyConfirmation();
    fixture.detectChanges();

    expect(facade.rebuildCounters).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(openButton);
    expect(element.textContent).not.toContain('Confirmar reconstrucción técnica');
  });

  it('shows rebuild success feedback for rebuilt counters', async () => {
    const facade = createFacadeMock();
    facade.rebuildStatus.set('success');
    facade.rebuildResult.set({
      gameId: 'game-1',
      outcome: 'rebuilt',
      previousRows: 4,
      previousHitsTotal: 9,
      rebuiltRows: 7,
      rebuiltHitsTotal: 14,
      totalDraws: 7,
      maxSequence: 7,
      rebuiltAt: '2026-06-27T12:20:00Z',
    });

    const fixture = await renderPage(facade);
    expect(fixture.nativeElement.textContent).toContain(
      'Laravel reconstruyó 7 counters con 14 hits acumulados.',
    );
  });

  it('shows rebuild informational success feedback when counters are already consistent', async () => {
    const facade = createFacadeMock();
    facade.rebuildStatus.set('success');
    facade.rebuildResult.set({
      gameId: 'game-1',
      outcome: 'already_consistent',
      previousRows: 7,
      previousHitsTotal: 14,
      rebuiltRows: 7,
      rebuiltHitsTotal: 14,
      totalDraws: 7,
      maxSequence: 7,
      rebuiltAt: '2026-06-27T12:20:00Z',
    });

    const fixture = await renderPage(facade);
    expect(fixture.nativeElement.textContent).toContain(
      'Laravel confirmó que los counters ya estaban consistentes.',
    );
  });

  it('shows rebuild conflict feedback when Laravel rejects the technical command', async () => {
    const facade = createFacadeMock();
    facade.rebuildStatus.set('conflict');
    facade.rebuildError.set({ message: 'rebuild_integrity_violation' });

    const fixture = await renderPage(facade);
    expect(fixture.nativeElement.textContent).toContain(
      'inconsistencia de integridad al reconstruir counters',
    );
  });

  it('shows the secondary manual UUID access when there is no contextual game', async () => {
    const facade = createFacadeMock();
    facade.status.set('idle');
    facade.snapshot.set(null);

    const fixture = await renderPage(facade, '');

    expect(facade.clear).toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('flujo principal vive en');
    expect(fixture.nativeElement.textContent).toContain('diagnóstico técnico opcional');
  });

  it('renders draws pagination controls when Laravel exposes more than one page', async () => {
    const facade = createFacadeMock();
    facade.snapshot.set({
      ...facade.snapshot()!,
      draws: [
        {
          id: 'draw-1',
          gameId: 'game-1',
          gameNumberId: 'number-1',
          sequence: 1,
          drawnNumber: 7,
          strategy: 'manual',
          drawnAt: '2026-06-27T12:00:00Z',
        },
      ],
      drawsPageInfo: {
        currentPage: 2,
        from: 51,
        lastPage: 3,
        path: '/api/v1/admin/games/game-1/draws',
        perPage: 50,
        to: 51,
        total: 101,
      },
      drawsLinks: { first: '?page=1', last: '?page=3', prev: '?page=1', next: '?page=3' },
    });

    const fixture = await renderPage(facade);
    const text = fixture.nativeElement.textContent;
    const pagerButtons = Array.from(fixture.nativeElement.querySelectorAll('.pager button'));

    expect(text).toContain('Mostrando 1 de 101');
    expect(text).toContain('Página 2 de 3');

    (pagerButtons[0] as HTMLButtonElement | undefined)?.click();
    (pagerButtons[1] as HTMLButtonElement | undefined)?.click();

    expect(facade.loadDrawsPage).toHaveBeenNthCalledWith(1, 1);
    expect(facade.loadDrawsPage).toHaveBeenNthCalledWith(2, 3);
  });

  it('renders counters pagination controls when Laravel exposes more than one page', async () => {
    const facade = createFacadeMock();
    facade.snapshot.set({
      ...facade.snapshot()!,
      counters: [
        {
          gameNumberId: 'number-2',
          number: 18,
          status: { value: 'available', label: 'Disponible', tone: 'success', isKnown: true },
          hitsCount: 0,
          lastDrawSequence: null,
        },
      ],
      countersPageInfo: {
        currentPage: 2,
        from: 51,
        lastPage: 4,
        path: '/api/v1/admin/games/game-1/counters',
        perPage: 50,
        to: 51,
        total: 180,
      },
      countersLinks: { first: '?page=1', last: '?page=4', prev: '?page=1', next: '?page=3' },
    });

    const fixture = await renderPage(facade);
    const text = fixture.nativeElement.textContent;
    const pager = fixture.nativeElement.querySelector('.pager') as HTMLElement;
    const counterPagerButtons = Array.from(pager.querySelectorAll('button'));

    expect(text).toContain('Mostrando 1 de 180');
    expect(text).toContain('Página 2 de 4');

    (counterPagerButtons[0] as HTMLButtonElement | undefined)?.click();
    (counterPagerButtons[1] as HTMLButtonElement | undefined)?.click();

    expect(facade.loadCountersPage).toHaveBeenNthCalledWith(1, 1);
    expect(facade.loadCountersPage).toHaveBeenNthCalledWith(2, 3);
  });
});
