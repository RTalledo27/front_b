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
    snapshot: signal<GameEngineConsoleView | null>({
      context: {
        id: 'game-1',
        slug: 'bingo-central',
        name: 'Bingo Central',
        description: null,
        status: { value: 'running', label: 'En ejecución', tone: 'info', isKnown: true },
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
        lifecycle: { startedAt: '2026-06-27T12:01:00Z', pausedAt: null, completedAt: null },
        engine: { nextDrawAt: '2026-06-27T12:02:00Z', lastConsumedTickAt: '2026-06-27T12:01:30Z' },
        numbers: { total: 90, sold: 10, reserved: 3, available: 77 },
        settings: null,
        latestDraw: { sequence: 1, number: 8, drawnAt: '2026-06-27T12:01:30Z' },
        winner: null,
        commerce: {
          reservations: { total: 0 },
          orders: { pending: 0, paymentSubmitted: 0, paid: 0, rejected: 0, expired: 0, cancelled: 0, refunded: 0 },
          payments: { pending: 0, underReview: 0, approved: 0, rejected: 0, cancelled: 0, refunded: 0 },
          entries: { confirmed: 0, cancelled: 0, refunded: 0, winner: 0 },
        },
        projection: { drawsTotal: 1, distinctDrawnNumbers: 1, maxCounterHits: 1, lastDrawnNumber: 8 },
        createdBy: 1,
        createdAt: '2026-06-27T11:00:00Z',
      },
      draws: [
        {
          id: 'draw-1',
          gameId: 'game-1',
          gameNumberId: 'number-1',
          sequence: 1,
          drawnNumber: 8,
          strategy: 'manual',
          drawnAt: '2026-06-27T12:01:30Z',
        },
      ],
      counters: [
        {
          gameNumberId: 'number-1',
          number: 8,
          status: { value: 'sold', label: 'Vendido', tone: 'info', isKnown: true },
          hitsCount: 1,
          lastDrawSequence: 1,
        },
      ],
      winner: null,
    }),
    status: signal<
      'idle' | 'loading' | 'refreshing' | 'loaded' | 'unauthorized' | 'forbidden' | 'notFound' | 'validationError' | 'networkError' | 'unexpectedError'
    >('loaded'),
    error: signal<{ message: string } | null>(null),
    accessMode: signal<'contextual' | 'manual'>('contextual'),
  };
}

describe('GameEnginePage', () => {
  it('loads the contextual route and hides mutation controls', async () => {
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
    expect(text).not.toContain('Iniciar');
    expect(text).not.toContain('Extraer número');
    expect(text).not.toContain('Reconstruir contadores');
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
});
