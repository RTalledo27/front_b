import { LaravelPaginatedResponse } from '../../../core/api/models/api-response.models';
import { PublicGameApiDto } from '../../../core/api/models/game-api.models';
import { mapPublicGame, mapPublicGamesPage } from './public-game.mapper';

const gameDto: PublicGameApiDto = {
  id: 'game-1',
  slug: 'bingo-fortuna',
  name: 'Bingo Fortuna',
  description: 'Premio especial',
  status: 'sales_open',
  number_range: { min: 1, max: 90, hits_required: 15 },
  ticket_price: { amount_cents: 500, currency: 'PEN' },
  prize: { amount_cents: 100_000, currency: 'PEN' },
  schedule: {
    sales_opens_at: '2026-06-20T10:00:00Z',
    sales_closes_at: '2026-06-21T20:00:00Z',
    scheduled_start_at: '2026-06-21T21:00:00Z',
    draw_interval_seconds: 8,
    next_draw_at: '2026-06-21T21:00:08Z',
  },
  lifecycle: {
    started_at: '2026-06-21T21:00:00Z',
    paused_at: null,
    completed_at: null,
  },
  latest_draw: {
    sequence: 14,
    number: 32,
    drawn_at: '2026-06-21T21:01:52Z',
  },
  winner: null,
};

describe('public game mapper', () => {
  it('maps the backend snake_case contract to the frontend model', () => {
    const game = mapPublicGame(gameDto);

    expect(game.slug).toBe('bingo-fortuna');
    expect(game.numberMin).toBe(1);
    expect(game.hitsRequired).toBe(15);
    expect(game.ticketPrice.amountCents).toBe(500);
    expect(game.schedule.drawIntervalSeconds).toBe(8);
    expect(game.schedule.nextDrawAt).toBe('2026-06-21T21:00:08Z');
    expect(game.lifecycle.startedAt).toBe('2026-06-21T21:00:00Z');
    expect(game.latestDraw?.number).toBe(32);
    expect(game.winner).toBeNull();
  });

  it('maps a completed winner payload when the backend exposes it publicly', () => {
    const game = mapPublicGame({
      ...gameDto,
      status: 'completed',
      schedule: {
        ...gameDto.schedule,
        next_draw_at: null,
      },
      lifecycle: {
        started_at: '2026-06-21T21:00:00Z',
        paused_at: null,
        completed_at: '2026-06-21T21:30:00Z',
      },
      winner: {
        number: 44,
        draw_sequence: 28,
        hits: 5,
        won_at: '2026-06-21T21:30:00Z',
      },
    });

    expect(game.winner).toEqual({
      number: 44,
      drawSequence: 28,
      hits: 5,
      wonAt: '2026-06-21T21:30:00Z',
    });
    expect(game.schedule.nextDrawAt).toBeNull();
    expect(game.lifecycle.completedAt).toBe('2026-06-21T21:30:00Z');
  });

  it('preserves Laravel pagination metadata', () => {
    const response: LaravelPaginatedResponse<PublicGameApiDto> = {
      data: [gameDto],
      links: { first: '/games?page=1', last: '/games?page=3', prev: null, next: '/games?page=2' },
      meta: {
        current_page: 1,
        from: 1,
        last_page: 3,
        links: [],
        path: '/games',
        per_page: 12,
        to: 1,
        total: 25,
      },
    };

    const page = mapPublicGamesPage(response);

    expect(page.games).toHaveLength(1);
    expect(page.pageInfo).toEqual({ currentPage: 1, lastPage: 3, perPage: 12, total: 25 });
  });
});
