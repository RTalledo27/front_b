import {
  isGameEngineInvalidPayloadError,
  mapGameEngineCountersResponse,
  mapGameEngineDrawsResponse,
  mapGameEngineWinnerResponse,
} from './game-engine.mapper';

describe('game-engine.mapper', () => {
  it('maps the admin draws listing contract', () => {
    const result = mapGameEngineDrawsResponse({
      data: [
        {
          id: 'draw-1',
          game_id: 'game-1',
          game_number_id: 'number-1',
          sequence: 3,
          drawn_number: 17,
          strategy: 'manual',
          drawn_at: '2026-06-27T12:00:00Z',
        },
      ],
      links: { first: null, last: null, prev: null, next: null },
      meta: { current_page: 1, from: 1, last_page: 1, links: [], path: '', per_page: 100, to: 1, total: 1 },
    });

    expect(result).toEqual([
      {
        id: 'draw-1',
        gameId: 'game-1',
        gameNumberId: 'number-1',
        sequence: 3,
        drawnNumber: 17,
        strategy: 'manual',
        drawnAt: '2026-06-27T12:00:00Z',
      },
    ]);
  });

  it('maps the admin counters listing contract with known status labels', () => {
    const result = mapGameEngineCountersResponse({
      data: [
        {
          game_number_id: 'number-7',
          number: 33,
          status: 'reserved',
          hits_count: 2,
          last_draw_sequence: 9,
        },
      ],
      links: { first: null, last: null, prev: null, next: null },
      meta: { current_page: 1, from: 1, last_page: 1, links: [], path: '', per_page: 100, to: 1, total: 1 },
    });

    expect(result[0]).toMatchObject({
      gameNumberId: 'number-7',
      number: 33,
      hitsCount: 2,
      lastDrawSequence: 9,
      status: { value: 'reserved', label: 'Reservado', tone: 'warning', isKnown: true },
    });
  });

  it('maps the winner resource envelope', () => {
    const result = mapGameEngineWinnerResponse({
      data: {
        winner_id: 'winner-1',
        game_id: 'game-1',
        game_entry_id: 'entry-1',
        game_number_id: 'number-1',
        winning_number: 42,
        game_draw_id: 'draw-2',
        winning_draw_sequence: 8,
        winning_hits: 5,
        user_id: 14,
        won_at: '2026-06-27T12:30:00Z',
      },
    });

    expect(result).toEqual({
      winnerId: 'winner-1',
      gameId: 'game-1',
      gameEntryId: 'entry-1',
      gameNumberId: 'number-1',
      winningNumber: 42,
      gameDrawId: 'draw-2',
      winningDrawSequence: 8,
      winningHits: 5,
      userId: 14,
      wonAt: '2026-06-27T12:30:00Z',
    });
  });

  it('rejects malformed payloads', () => {
    expect(() => mapGameEngineCountersResponse({ data: {}, meta: null })).toThrowError();

    try {
      mapGameEngineCountersResponse({ data: {}, meta: null });
    } catch (error) {
      expect(isGameEngineInvalidPayloadError(error)).toBe(true);
    }
  });
});
