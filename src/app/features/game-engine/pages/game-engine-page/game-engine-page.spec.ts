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
    refresh: vi.fn(),
    clear: vi.fn(),
    startGame: vi.fn(),
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
          orders: { pending: 0, paymentSubmitted: 0, paid: 0, rejected: 0, expired: 0, cancelled: 0, refunded: 0 },
          payments: { pending: 0, underReview: 0, approved: 0, rejected: 0, cancelled: 0, refunded: 0 },
          entries: { confirmed: 2, cancelled: 0, refunded: 0, winner: 0 },
        },
        projection: { drawsTotal: 0, distinctDrawnNumbers: 0, maxCounterHits: 0, lastDrawnNumber: null },
        createdBy: 1,
        createdAt: '2026-06-27T11:00:00Z',
      },
      draws: [],
      counters: [],
      winner: null,
    }),
    status: signal<
      'idle' | 'loading' | 'refreshing' | 'loaded' | 'unauthorized' | 'forbidden' | 'notFound' | 'validationError' | 'networkError' | 'unexpectedError'
    >('loaded'),
    error: signal<{ message: string } | null>(null),
    accessMode: signal<'contextual' | 'manual'>('contextual'),
    startStatus: signal<
      'idle' | 'submitting' | 'success' | 'unauthorized' | 'forbidden' | 'notFound' | 'invalidState' | 'networkError' | 'unexpectedError'
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
  };
}

describe('GameEnginePage', () => {
  it('loads the contextual route and shows only the audited start mutation', async () => {
    const facade = createFacadeMock();

    await TestBed.configureTestingModule({
      imports: [GameEnginePage],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ gameId: 'game-1' })),
            queryParamMap: of(convertToParamMap({ page: '2', search: 'central' })),
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
    const text = fixture.nativeElement.textContent;

    expect(facade.load).toHaveBeenCalledWith('game-1', 'contextual');
    expect(text).toContain('Bingo Central');
    expect(text).toContain('Volver al detalle del juego');
    expect(text).toContain('Iniciar juego');
    expect(text).not.toContain('Pausar');
    expect(text).not.toContain('Extraer número');
    expect(text).not.toContain('Reconstruir contadores');
  });

  it('opens confirmation and submits the start mutation once', async () => {
    const facade = createFacadeMock();

    await TestBed.configureTestingModule({
      imports: [GameEnginePage],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ gameId: 'game-1' })),
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

    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    buttons.find((button) => button.textContent?.includes('Iniciar juego'))?.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Confirmar inicio del juego');
    expect(document.activeElement?.textContent).toContain('Confirmar inicio');

    const confirmButtons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    confirmButtons.find((button) => button.textContent?.includes('Confirmar inicio'))?.click();

    expect(facade.startGame).toHaveBeenCalledTimes(1);
  });

  it('cancels the confirmation without mutating and restores focus', async () => {
    const facade = createFacadeMock();

    await TestBed.configureTestingModule({
      imports: [GameEnginePage],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ gameId: 'game-1' })),
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

    const openButton = Array.from(fixture.nativeElement.querySelectorAll('button')).find((button) =>
      (button as HTMLButtonElement).textContent?.includes('Iniciar juego'),
    ) as HTMLButtonElement;
    openButton.click();
    fixture.detectChanges();

    const cancelButton = Array.from(fixture.nativeElement.querySelectorAll('button')).find((button) =>
      (button as HTMLButtonElement).textContent?.includes('Cancelar'),
    ) as HTMLButtonElement;
    cancelButton.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('Confirmar inicio del juego');
    expect(facade.startGame).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(openButton);
  });

  it('closes the confirmation with Escape without mutating', async () => {
    const facade = createFacadeMock();

    await TestBed.configureTestingModule({
      imports: [GameEnginePage],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ gameId: 'game-1' })),
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

    const openButton = Array.from(fixture.nativeElement.querySelectorAll('button')).find((button) =>
      (button as HTMLButtonElement).textContent?.includes('Iniciar juego'),
    ) as HTMLButtonElement;
    openButton.click();
    fixture.detectChanges();

    fixture.nativeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('Confirmar inicio del juego');
    expect(facade.startGame).not.toHaveBeenCalled();
  });

  it('shows mutation feedback when Laravel rejects start by invalid state', async () => {
    const facade = createFacadeMock();
    facade.startStatus.set('invalidState');
    facade.startError.set({ message: 'game_not_ready_for_start' });

    await TestBed.configureTestingModule({
      imports: [GameEnginePage],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ gameId: 'game-1' })),
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

    expect(fixture.nativeElement.textContent).toContain('readiness actual');
  });

  it('shows the secondary manual UUID access when there is no contextual game', async () => {
    const facade = createFacadeMock();
    facade.status.set('idle');
    facade.snapshot.set(null);

    await TestBed.configureTestingModule({
      imports: [GameEnginePage],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({})),
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

    expect(facade.clear).toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('diagnóstico técnico secundario');
  });

  it('hides the start button when the scheduled time has not arrived yet', async () => {
    const facade = createFacadeMock();
    facade.snapshot.set({
      ...facade.snapshot()!,
      context: {
        ...facade.snapshot()!.context,
        schedule: {
          ...facade.snapshot()!.context.schedule,
          scheduledStartAt: '2099-06-27T12:00:00Z',
        },
      },
    });

    await TestBed.configureTestingModule({
      imports: [GameEnginePage],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ gameId: 'game-1' })),
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

    expect(fixture.nativeElement.textContent).not.toContain('Iniciar juego');
  });

  it('shows replay feedback when backend reports already_started', async () => {
    const facade = createFacadeMock();
    facade.startStatus.set('success');
    facade.startResult.set({
      gameId: 'game-1',
      status: 'running',
      outcome: 'already_started',
      scheduledStartAt: '2026-06-27T01:00:00Z',
      startedAt: '2026-06-27T12:05:00Z',
      confirmedEntriesCount: 2,
    });

    await TestBed.configureTestingModule({
      imports: [GameEnginePage],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ gameId: 'game-1' })),
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

    expect(fixture.nativeElement.textContent).toContain('ya estaba iniciado');
  });
});
