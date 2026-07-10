import '@angular/compiler';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import { PlayerEntriesFacade } from '../../data-access/player-collections.facade';
import { PlayerEntriesPage } from './player-entries-page';

function createFacadeMock() {
  return {
    load: vi.fn(),
    items: signal([
      {
        id: 'entry-1',
        gameId: 'game-1',
        gameNumberId: 'gn-1',
        status: 'confirmed' as const,
        confirmedAt: '2026-07-05T12:00:00Z',
        game: { id: 'game-1', slug: 'bingo-real', name: 'Bingo Real' },
        gameNumber: { id: 'gn-1', number: 7, status: 'sold' as const },
        liveProgress: {
          entryId: 'entry-1',
          gameId: 'game-1',
          gameStatus: 'running' as const,
          gameNumber: 7,
          hitsCurrent: 1,
          hitsRequired: 5,
          latestDrawNumber: 11,
          latestDrawSequence: 2,
          isWinner: false,
          completedAt: null,
          wonAt: null,
        },
      },
    ]),
    status: signal<
      'loaded' | 'loading' | 'empty' | 'unauthorized' | 'forbidden' | 'networkError' | 'unexpectedError' | 'notFound'
    >('loaded'),
    error: signal<{ message: string } | null>(null),
    refreshing: signal(false),
    refreshError: signal<{ message: string } | null>(null),
    lastUpdatedAt: signal<string | null>('2026-07-05T12:00:08Z'),
    liveGames: signal({
      'game-1': {
        id: 'game-1',
        slug: 'bingo-real',
        name: 'Bingo Real',
        description: null,
        status: 'running' as const,
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
      },
    }),
    liveGamesStatus: signal<'idle' | 'loading' | 'loaded' | 'error'>('loaded'),
    liveGamesError: signal<{ message: string } | null>(null),
    gameLiveState: vi.fn((gameId: string) =>
      gameId === 'game-1'
        ? {
            id: 'game-1',
            slug: 'bingo-real',
            name: 'Bingo Real',
            description: null,
            status: 'running' as const,
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
          }
        : null,
    ),
  };
}

describe('PlayerEntriesPage', () => {
  it('shows X/Y real when the backend exposes live_progress', async () => {
    const facade = createFacadeMock();

    await TestBed.configureTestingModule({
      imports: [PlayerEntriesPage],
      providers: [provideRouter([])],
    })
      .overrideComponent(PlayerEntriesPage, {
        set: { providers: [{ provide: PlayerEntriesFacade, useValue: facade }] },
      })
      .compileComponents();

    const fixture = TestBed.createComponent(PlayerEntriesPage);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Progreso en vivo');
    expect(text).toContain('1/5');
    expect(text).toContain('Último número sorteado: 11');
  });

  it('keeps the last visible data when a silent refresh fails', async () => {
    const facade = createFacadeMock();
    facade.refreshError.set({ message: 'Sin conexión' });

    await TestBed.configureTestingModule({
      imports: [PlayerEntriesPage],
      providers: [provideRouter([])],
    })
      .overrideComponent(PlayerEntriesPage, {
        set: { providers: [{ provide: PlayerEntriesFacade, useValue: facade }] },
      })
      .compileComponents();

    const fixture = TestBed.createComponent(PlayerEntriesPage);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Conservamos el último avance visible.',
    );
  });
});
