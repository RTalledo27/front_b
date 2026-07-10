import { LaravelPaginatedResponse } from '../../../core/api/models/api-response.models';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { PLAYER_COMMERCE_REPOSITORY, PlayerCommerceRepository } from './player-commerce.repository';
import { PlayerEntryApiDto, PlayerReservationApiDto } from '../models/player-commerce.models';
import { PlayerEntriesFacade, PlayerReservationsFacade } from './player-collections.facade';
import {
  PUBLIC_GAMES_REPOSITORY,
  PublicGamesRepository,
} from '../../public-games/data-access/public-games.repository';
import { PublicGame } from '../../public-games/models/public-game.models';

const liveGame: PublicGame = {
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
    sequence: 1,
    number: 7,
    drawnAt: '2026-07-05T12:00:00Z',
  },
  winner: null,
};

describe('player collections facades', () => {
  function configureRepository(overrides?: Partial<PlayerCommerceRepository>) {
    const repository: PlayerCommerceRepository = {
      listOrders: vi.fn(),
      getOrder: vi.fn(),
      cancelOrder: vi.fn(),
      submitEvidence: vi.fn(),
      listReservations: vi.fn(() =>
        of(({ data: [] } as unknown) as LaravelPaginatedResponse<PlayerReservationApiDto>),
      ),
      listEntries: vi.fn(() =>
        of(({ data: [] } as unknown) as LaravelPaginatedResponse<PlayerEntryApiDto>),
      ),
      ...overrides,
    };
    const publicGamesRepository: PublicGamesRepository = {
      list: vi.fn(),
      getBySlug: vi.fn(() => of(liveGame)),
    };

    TestBed.configureTestingModule({
      providers: [
        PlayerReservationsFacade,
        PlayerEntriesFacade,
        { provide: PLAYER_COMMERCE_REPOSITORY, useValue: repository },
        { provide: PUBLIC_GAMES_REPOSITORY, useValue: publicGamesRepository },
      ],
    });

    return { repository, publicGamesRepository };
  }

  it('surfaces malformed reservations payloads as controlled errors', () => {
    configureRepository({
      listReservations: vi.fn(() =>
        of(({ data: {} } as unknown) as LaravelPaginatedResponse<PlayerReservationApiDto>),
      ),
    });

    const facade = TestBed.inject(PlayerReservationsFacade);
    facade.load();

    expect(facade.status()).toBe('unexpectedError');
    expect(facade.error()).toMatchObject({
      code: 'invalid_payload',
      message: 'Recibimos una respuesta incompleta del servidor.',
    });
  });

  it('surfaces malformed entries payloads as controlled errors', () => {
    configureRepository({
      listEntries: vi.fn(() =>
        of(({ data: {} } as unknown) as LaravelPaginatedResponse<PlayerEntryApiDto>),
      ),
    });

    const facade = TestBed.inject(PlayerEntriesFacade);
    facade.load();

    expect(facade.status()).toBe('unexpectedError');
    expect(facade.error()).toMatchObject({
      code: 'invalid_payload',
      message: 'Recibimos una respuesta incompleta del servidor.',
    });
  });

  it('loads public live state for confirmed entries when the contract exposes the game slug', () => {
    configureRepository({
      listEntries: vi.fn(() =>
        of({
          data: [
            {
              id: 'entry-1',
              game_id: 'game-1',
              game_number_id: 'gn-1',
              status: 'confirmed',
              confirmed_at: '2026-07-05T12:00:00Z',
              game: { id: 'game-1', slug: 'bingo-real', name: 'Bingo Real' },
              game_number: { id: 'gn-1', number: 7, status: 'sold' },
            },
          ],
          meta: { total: 1 },
        } as unknown as LaravelPaginatedResponse<PlayerEntryApiDto>),
      ),
    });

    const facade = TestBed.inject(PlayerEntriesFacade);
    facade.load();

    expect(facade.gameLiveState('game-1')?.status).toBe('running');
    expect(facade.gameLiveState('game-1')?.latestDraw?.number).toBe(7);
  });
});
