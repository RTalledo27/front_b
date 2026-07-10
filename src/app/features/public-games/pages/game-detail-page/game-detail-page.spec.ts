import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { PublicGameDetailFacade } from '../../data-access/public-game-detail.facade';
import { GameDetailPage } from './game-detail-page';
import { PublicGame } from '../../models/public-game.models';

const baseGame: PublicGame = {
  id: '01977abc-0000-7000-8000-000000000001',
  slug: 'bingo-fortuna',
  name: 'Bingo Fortuna',
  description: null,
  status: 'sales_open',
  numberMin: 1,
  numberMax: 90,
  hitsRequired: 15,
  ticketPrice: { amountCents: 500, currency: 'PEN' },
  prize: { amountCents: 100000, currency: 'PEN' },
  schedule: {
    salesOpensAt: null,
    salesClosesAt: null,
    scheduledStartAt: '2026-06-21T21:00:00Z',
    drawIntervalSeconds: 8,
    nextDrawAt: '2026-06-21T21:00:08Z',
  },
  lifecycle: {
    startedAt: '2026-06-21T21:00:00Z',
    pausedAt: null,
    completedAt: null,
  },
  latestDraw: null,
  winner: null,
};

function createFacadeMock() {
  return {
    load: vi.fn(),
    game: signal<PublicGame>(baseGame),
    status: signal<'idle' | 'loading' | 'success' | 'error'>('success'),
    error: signal<{ message: string } | null>(null),
    refreshing: signal(false),
    liveError: signal<{ message: string } | null>(null),
    lastUpdatedAt: signal<string | null>('2026-06-21T21:00:02Z'),
    refresh: vi.fn(),
  };
}

describe('GameDetailPage', () => {
  it('describes the selection flow as real and removes the old blocked-reservation copy', async () => {
    const facade = createFacadeMock();

    await TestBed.configureTestingModule({
      imports: [GameDetailPage],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: new Map([['slug', 'bingo-fortuna']]) } },
        },
      ],
    })
      .overrideComponent(GameDetailPage, {
        set: { providers: [{ provide: PublicGameDetailFacade, useValue: facade }] },
      })
      .compileComponents();

    const fixture = TestBed.createComponent(GameDetailPage);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('La reserva usa contratos reales, autenticación e idempotencia del backend.');
    expect(text).not.toContain('La reserva real permanecerá bloqueada');
    expect(text).not.toContain('vista previa');
  });

  it('renders the public live state for running games with the latest draw when available', async () => {
    const facade = createFacadeMock();
    facade.game.set({
      ...facade.game(),
      status: 'running',
      latestDraw: {
        sequence: 4,
        number: 22,
        drawnAt: '2026-06-21T21:00:24Z',
      },
    });

    await TestBed.configureTestingModule({
      imports: [GameDetailPage],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: new Map([['slug', 'bingo-fortuna']]) } },
        },
      ],
    })
      .overrideComponent(GameDetailPage, {
        set: { providers: [{ provide: PublicGameDetailFacade, useValue: facade }] },
      })
      .compileComponents();

    const fixture = TestBed.createComponent(GameDetailPage);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Juego en vivo');
    expect(text).toContain('Último número sorteado');
    expect(text).toContain('22');
    expect(text).toContain('refrescamos este estado con el contrato público');
  });

  it('shows the public winner details when the game is completed', async () => {
    const facade = createFacadeMock();
    facade.game.set({
      ...facade.game(),
      status: 'completed',
      latestDraw: {
        sequence: 9,
        number: 44,
        drawnAt: '2026-06-21T21:10:00Z',
      },
      winner: {
        number: 44,
        drawSequence: 9,
        hits: 5,
        wonAt: '2026-06-21T21:10:00Z',
      },
      lifecycle: {
        startedAt: '2026-06-21T21:00:00Z',
        pausedAt: null,
        completedAt: '2026-06-21T21:10:00Z',
      },
    });

    await TestBed.configureTestingModule({
      imports: [GameDetailPage],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: new Map([['slug', 'bingo-fortuna']]) } },
        },
      ],
    })
      .overrideComponent(GameDetailPage, {
        set: { providers: [{ provide: PublicGameDetailFacade, useValue: facade }] },
      })
      .compileComponents();

    const fixture = TestBed.createComponent(GameDetailPage);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Juego finalizado');
    expect(text).toContain('Ganador publicado');
    expect(text).toContain('El número 44 ganó con 5 aciertos.');
  });
});
