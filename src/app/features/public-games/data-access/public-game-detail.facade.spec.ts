import '@angular/compiler';
import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { PUBLIC_GAMES_REPOSITORY, PublicGamesRepository } from './public-games.repository';
import { PublicGameDetailFacade } from './public-game-detail.facade';
import { PublicGame } from '../models/public-game.models';

const baseGame: PublicGame = {
  id: 'game-1',
  slug: 'bingo-fortuna',
  name: 'Bingo Fortuna',
  description: null,
  status: 'running',
  numberMin: 1,
  numberMax: 90,
  hitsRequired: 5,
  ticketPrice: { amountCents: 500, currency: 'PEN' },
  prize: { amountCents: 100000, currency: 'PEN' },
  schedule: {
    salesOpensAt: '2026-06-21T18:00:00Z',
    salesClosesAt: '2026-06-21T20:50:00Z',
    scheduledStartAt: '2026-06-21T21:00:00Z',
    drawIntervalSeconds: 8,
    nextDrawAt: '2026-06-21T21:00:08Z',
  },
  lifecycle: {
    startedAt: '2026-06-21T21:00:00Z',
    pausedAt: null,
    completedAt: null,
  },
  latestDraw: {
    sequence: 1,
    number: 7,
    drawnAt: '2026-06-21T21:00:00Z',
  },
  winner: null,
};

describe('PublicGameDetailFacade', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function setup(repository: PublicGamesRepository) {
    await TestBed.configureTestingModule({
      providers: [
        PublicGameDetailFacade,
        { provide: PUBLIC_GAMES_REPOSITORY, useValue: repository },
      ],
    }).compileComponents();

    return TestBed.inject(PublicGameDetailFacade);
  }

  it('loads the initial public game detail successfully', async () => {
    const facade = await setup({
      list: vi.fn(),
      getBySlug: vi.fn(() => of(baseGame)),
    });

    facade.load('bingo-fortuna');

    expect(facade.status()).toBe('success');
    expect(facade.game()?.latestDraw?.number).toBe(7);
    expect(facade.lastUpdatedAt()).not.toBeNull();
  });

  it('polls again only while the game stays running', async () => {
    const repository = {
      list: vi.fn(),
      getBySlug: vi
        .fn()
        .mockReturnValueOnce(of(baseGame))
        .mockReturnValueOnce(of({ ...baseGame, latestDraw: { sequence: 2, number: 8, drawnAt: '2026-06-21T21:00:08Z' } })),
    };
    const facade = await setup(repository);

    facade.load('bingo-fortuna');
    vi.advanceTimersByTime(8000);

    expect(repository.getBySlug).toHaveBeenCalledTimes(2);
    expect(facade.game()?.latestDraw?.number).toBe(8);
  });

  it('stops polling when the refreshed game becomes completed', async () => {
    const repository = {
      list: vi.fn(),
      getBySlug: vi
        .fn()
        .mockReturnValueOnce(of(baseGame))
        .mockReturnValueOnce(
          of({
            ...baseGame,
            status: 'completed',
            schedule: { ...baseGame.schedule, nextDrawAt: null },
            lifecycle: { ...baseGame.lifecycle, completedAt: '2026-06-21T21:02:00Z' },
          }),
        ),
    };
    const facade = await setup(repository);

    facade.load('bingo-fortuna');
    vi.advanceTimersByTime(8000);
    vi.advanceTimersByTime(30000);

    expect(repository.getBySlug).toHaveBeenCalledTimes(2);
    expect(facade.game()?.status).toBe('completed');
  });

  it('keeps previous data if a silent refresh fails', async () => {
    const repository = {
      list: vi.fn(),
      getBySlug: vi
        .fn()
        .mockReturnValueOnce(of(baseGame))
        .mockReturnValueOnce(
          throwError(() => ({
            status: 0,
            error: { message: 'Sin conexión.' },
          })),
        ),
    };
    const facade = await setup(repository);

    facade.load('bingo-fortuna');
    vi.advanceTimersByTime(8000);

    expect(facade.status()).toBe('success');
    expect(facade.game()?.latestDraw?.number).toBe(7);
    expect(facade.liveError()).not.toBeNull();
    expect(facade.refreshing()).toBe(false);
  });

  it('does not create duplicate polling when refresh is already in progress', async () => {
    const refresh$ = new Subject<PublicGame>();
    const repository = {
      list: vi.fn(),
      getBySlug: vi
        .fn()
        .mockReturnValueOnce(of(baseGame))
        .mockReturnValueOnce(refresh$.asObservable()),
    };
    const facade = await setup(repository);

    facade.load('bingo-fortuna');
    vi.advanceTimersByTime(8000);
    facade.refresh();

    expect(repository.getBySlug).toHaveBeenCalledTimes(2);

    refresh$.next(baseGame);
    refresh$.complete();
  });
});
