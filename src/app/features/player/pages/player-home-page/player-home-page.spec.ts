import '@angular/compiler';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import { PlayerHomeFacade } from '../../data-access/player-home.facade';
import { PlayerHomePage } from './player-home-page';
import { PublicGame } from '../../../public-games/models/public-game.models';

const runningGame: PublicGame = {
  id: 'game-1',
  slug: 'bingo-real',
  name: 'Bingo Real',
  description: null,
  status: 'running',
  numberMin: 1,
  numberMax: 90,
  hitsRequired: 5,
  ticketPrice: { amountCents: 500, currency: 'PEN' },
  prize: { amountCents: 10000, currency: 'PEN' },
  schedule: {
    salesOpensAt: null,
    salesClosesAt: null,
    scheduledStartAt: '2026-07-05T12:00:00Z',
    drawIntervalSeconds: 8,
    nextDrawAt: '2026-07-05T12:00:08Z',
  },
  lifecycle: {
    startedAt: '2026-07-05T12:00:00Z',
    pausedAt: null,
    completedAt: null,
  },
  latestDraw: {
    sequence: 2,
    number: 11,
    drawnAt: '2026-07-05T12:00:08Z',
  },
  winner: null,
};

function createFacadeMock() {
  const latestOrder = signal<{
    id: string;
    reference: string;
    status: 'pending';
    subtotalCents: number;
    totalCents: number;
    currency: string;
    expiresAt: string | null;
    paidAt: string | null;
    cancelledAt: string | null;
    expiredAt: string | null;
    createdAt: string | null;
    itemCount: number;
    payment: null;
    validity: 'active';
  } | null>({
    id: 'order-1',
    reference: 'order-1',
    status: 'pending',
    subtotalCents: 2500,
    totalCents: 2500,
    currency: 'PEN',
    expiresAt: '2026-07-05T12:00:00Z',
    paidAt: null,
    cancelledAt: null,
    expiredAt: null,
    createdAt: '2026-07-05T10:00:00Z',
    itemCount: 2,
    payment: null,
    validity: 'active',
  });
  const latestReservation = signal<{
    id: string;
    orderId: string;
    gameNumberId: string;
    createdAt: string | null;
    order: {
      id: string;
      status: 'pending';
      expiresAt: string | null;
      totalCents: number;
      currency: string;
    };
    gameNumber: {
      id: string;
      number: number;
      status: 'reserved';
      game: { id: string; slug: string; name: string } | null;
    };
  } | null>({
    id: 'reservation-1',
    orderId: 'order-1',
    gameNumberId: 'gn-1',
    createdAt: '2026-07-05T10:05:00Z',
    order: {
      id: 'order-1',
      status: 'pending',
      expiresAt: '2026-07-05T12:00:00Z',
      totalCents: 2500,
      currency: 'PEN',
    },
    gameNumber: {
      id: 'gn-1',
      number: 7,
      status: 'reserved',
      game: { id: 'game-1', slug: 'bingo-real', name: 'Bingo Real' },
    },
  });
  const latestEntry = signal<{
    id: string;
    gameId: string;
    gameNumberId: string;
    status: 'confirmed';
    confirmedAt: string | null;
    game: { id: string; slug: string; name: string } | null;
    gameNumber: { id: string; number: number; status: 'sold' } | null;
  } | null>({
    id: 'entry-1',
    gameId: 'game-9',
    gameNumberId: 'gn-9',
    status: 'confirmed',
    confirmedAt: '2026-07-04T18:00:00Z',
    game: { id: 'game-9', slug: 'fortuna-final', name: 'Fortuna Final' },
    gameNumber: { id: 'gn-9', number: 19, status: 'sold' },
  });

  return {
    load: vi.fn(),
    reloadOrders: vi.fn(),
    reloadReservations: vi.fn(),
    reloadEntries: vi.fn(),
    primaryErrorMessage: vi.fn(() => 'Laravel no respondió como esperábamos.'),
    failedSections: signal<string[]>([]),
    pageStatus: signal<
      'idle' | 'loading' | 'loaded' | 'partial' | 'empty' | 'unauthorized' | 'forbidden' | 'networkError' | 'unexpectedError'
    >('loaded'),
    user: signal({
      id: 7,
      name: 'Andrea Real',
      email: 'andrea@example.com',
      role: 'player' as const,
      emailVerified: true,
      emailVerifiedAt: '2026-07-05T10:00:00Z' as string | null,
      capabilities: {
        canAccessAdmin: false,
        canUsePlayerFeatures: true,
      },
    }),
    orders: signal([
      {
        id: 'order-1',
        reference: 'order-1',
        status: 'pending' as const,
        subtotalCents: 2500,
        totalCents: 2500,
        currency: 'PEN',
        expiresAt: '2026-07-05T12:00:00Z',
        paidAt: null,
        cancelledAt: null,
        expiredAt: null,
        createdAt: '2026-07-05T10:00:00Z',
        itemCount: 2,
        payment: null,
        validity: 'active' as const,
      },
    ]),
    ordersTotal: signal(3),
    ordersStatus: signal<'loaded' | 'empty' | 'unauthorized' | 'forbidden' | 'networkError' | 'unexpectedError' | 'notFound'>('loaded'),
    ordersError: signal<{ message: string } | null>(null),
    reservations: signal([
      {
        id: 'reservation-1',
        orderId: 'order-1',
        gameNumberId: 'gn-1',
        createdAt: '2026-07-05T10:05:00Z',
        order: {
          id: 'order-1',
          status: 'pending' as const,
          expiresAt: '2026-07-05T12:00:00Z',
          totalCents: 2500,
          currency: 'PEN',
        },
        gameNumber: {
          id: 'gn-1',
          number: 7,
          status: 'reserved' as const,
          game: { id: 'game-1', slug: 'bingo-real', name: 'Bingo Real' },
        },
      },
    ]),
    reservationsTotal: signal(1),
    reservationsStatus: signal<'loaded' | 'empty' | 'unauthorized' | 'forbidden' | 'networkError' | 'unexpectedError' | 'notFound'>('loaded'),
    reservationsError: signal<{ message: string } | null>(null),
    entries: signal([
      {
        id: 'entry-1',
        gameId: 'game-9',
        gameNumberId: 'gn-9',
        status: 'confirmed' as const,
        confirmedAt: '2026-07-04T18:00:00Z',
        game: { id: 'game-9', slug: 'fortuna-final', name: 'Fortuna Final' },
        gameNumber: { id: 'gn-9', number: 19, status: 'sold' as const },
      },
    ]),
    entriesTotal: signal(1),
    entriesStatus: signal<'loaded' | 'empty' | 'unauthorized' | 'forbidden' | 'networkError' | 'unexpectedError' | 'notFound'>('loaded'),
    entriesError: signal<{ message: string } | null>(null),
    liveGames: signal<Record<string, PublicGame>>({ [runningGame.id]: runningGame }),
    liveGamesStatus: signal<'idle' | 'loading' | 'loaded' | 'error'>('loaded'),
    liveGamesError: signal<{ message: string } | null>(null),
    runningGames: signal([runningGame]),
    completedGames: signal([]),
    latestOrder,
    latestReservation,
    latestEntry,
  };
}

describe('PlayerHomePage', () => {
  async function renderPage(facade = createFacadeMock()) {
    await TestBed.configureTestingModule({
      imports: [PlayerHomePage],
      providers: [provideRouter([])],
    })
      .overrideComponent(PlayerHomePage, {
        set: {
          providers: [{ provide: PlayerHomeFacade, useValue: facade }],
        },
      })
      .compileComponents();

    const fixture = TestBed.createComponent(PlayerHomePage);
    fixture.detectChanges();
    return { fixture, facade };
  }

  it('renders a real player home without the previous hardcoded claims', async () => {
    const { fixture, facade } = await renderPage();

    const text = fixture.nativeElement.textContent;

    expect(facade.load).toHaveBeenCalledTimes(1);
    expect(text).toContain('Hola, Andrea Real');
    expect(text).toContain('Tu actividad real en Fortuna');
    expect(text).toContain('Bingo Real');
    expect(text).not.toContain('S/ 2,000');
    expect(text).not.toContain('Noche de Fortuna');
  });

  it('shows the verification CTA when the backend session says the email is still pending', async () => {
    const facade = createFacadeMock();
    facade.user.set({
      ...facade.user(),
      emailVerified: false,
      emailVerifiedAt: null,
    });

    const { fixture } = await renderPage(facade);

    expect(fixture.nativeElement.textContent).toContain('Correo pendiente');
    expect(fixture.nativeElement.textContent).toContain('Verificar mi correo');
  });

  it('highlights a running public game without inventing player hit counts', async () => {
    const { fixture } = await renderPage();

    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Juego en vivo');
    expect(text).toContain('Último número sorteado: 11');
    expect(text).toContain('Ver mis cartones');
    expect(text).not.toContain('Aciertos:');
  });

  it('shows an honest empty state when there is no player activity', async () => {
    const facade = createFacadeMock();
    facade.pageStatus.set('empty');
    facade.orders.set([]);
    facade.reservations.set([]);
    facade.entries.set([]);
    facade.ordersTotal.set(0);
    facade.reservationsTotal.set(0);
    facade.entriesTotal.set(0);
    facade.latestOrder.set(null);
    facade.latestReservation.set(null);
    facade.latestEntry.set(null);
    facade.ordersStatus.set('empty');
    facade.reservationsStatus.set('empty');
    facade.entriesStatus.set('empty');

    const { fixture } = await renderPage(facade);

    expect(fixture.nativeElement.textContent).toContain('Aún no tienes actividad disponible');
    expect(fixture.nativeElement.textContent).toContain('datos reales');
  });

  it('keeps visible partial data and names the failed sections when one endpoint falls back to error', async () => {
    const facade = createFacadeMock();
    facade.pageStatus.set('partial');
    facade.failedSections.set(['reservas']);
    facade.reservations.set([]);
    facade.latestReservation.set(null);
    facade.reservationsStatus.set('networkError');
    facade.reservationsError.set({ message: 'No pudimos conectar con el servidor.' });

    const { fixture } = await renderPage(facade);

    expect(fixture.nativeElement.textContent).toContain('Carga parcial');
    expect(fixture.nativeElement.textContent).toContain('reservas');
    expect(fixture.nativeElement.textContent).toContain('Reintentar reservas');
  });

  it('shows the top-level retry state when the three sections fail', async () => {
    const facade = createFacadeMock();
    facade.pageStatus.set('networkError');
    facade.orders.set([]);
    facade.reservations.set([]);
    facade.entries.set([]);
    facade.latestOrder.set(null);
    facade.latestReservation.set(null);
    facade.latestEntry.set(null);

    const { fixture } = await renderPage(facade);

    expect(fixture.nativeElement.textContent).toContain('No pudimos construir tu home real');
    expect(fixture.nativeElement.textContent).toContain('Reintentar');
  });
});
