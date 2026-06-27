import {
  isGameEngineInvalidPayloadError,
  mapGameEngineCountersResponse,
  mapGameEngineDrawCommandResponse,
  mapGameEngineDrawsResponse,
  mapGameEnginePauseResponse,
  mapGameEngineResumeResponse,
  mapGameEngineStartResponse,
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

  it('maps the start command resource envelope', () => {
    const result = mapGameEngineStartResponse({
      data: {
        game_id: 'game-1',
        status: 'running',
        outcome: 'started',
        scheduled_start_at: '2026-06-27T12:00:00Z',
        started_at: '2026-06-27T12:05:00Z',
        confirmed_entries_count: 12,
      },
    });

    expect(result).toEqual({
      gameId: 'game-1',
      status: 'running',
      outcome: 'started',
      scheduledStartAt: '2026-06-27T12:00:00Z',
      startedAt: '2026-06-27T12:05:00Z',
      confirmedEntriesCount: 12,
    });
  });

  it('maps the start replay resource envelope', () => {
    const result = mapGameEngineStartResponse({
      data: {
        game_id: 'game-1',
        status: 'running',
        outcome: 'already_started',
        scheduled_start_at: '2026-06-27T12:00:00Z',
        started_at: '2026-06-27T12:05:00Z',
        confirmed_entries_count: 12,
      },
    });

    expect(result.outcome).toBe('already_started');
  });

  it('maps the pause command resource envelope', () => {
    const result = mapGameEnginePauseResponse({
      data: {
        game_id: 'game-1',
        status: 'paused',
        outcome: 'paused',
        paused_at: '2026-06-27T12:10:00Z',
      },
    });

    expect(result).toEqual({
      gameId: 'game-1',
      status: 'paused',
      outcome: 'paused',
      pausedAt: '2026-06-27T12:10:00Z',
    });
  });

  it('maps the pause replay resource envelope', () => {
    const result = mapGameEnginePauseResponse({
      data: {
        game_id: 'game-1',
        status: 'paused',
        outcome: 'already_paused',
        paused_at: '2026-06-27T12:10:00Z',
      },
    });

    expect(result.outcome).toBe('already_paused');
  });

  it('maps the resume command resource envelope', () => {
    const result = mapGameEngineResumeResponse({
      data: {
        game_id: 'game-1',
        status: 'running',
        outcome: 'resumed',
        resumed_at: '2026-06-27T12:15:00Z',
        next_draw_at: '2026-06-27T12:15:30Z',
      },
    });

    expect(result).toEqual({
      gameId: 'game-1',
      status: 'running',
      outcome: 'resumed',
      resumedAt: '2026-06-27T12:15:00Z',
      nextDrawAt: '2026-06-27T12:15:30Z',
    });
  });

  it('maps the resume replay resource envelope', () => {
    const result = mapGameEngineResumeResponse({
      data: {
        game_id: 'game-1',
        status: 'running',
        outcome: 'already_running',
        resumed_at: '2026-06-27T12:15:00Z',
        next_draw_at: '2026-06-27T12:15:30Z',
      },
    });

    expect(result.outcome).toBe('already_running');
  });

  it('maps the draw command resource envelope', () => {
    const result = mapGameEngineDrawCommandResponse({
      data: {
        game_id: 'game-1',
        draw_id: 'draw-1',
        game_number_id: 'number-8',
        sequence: 4,
        drawn_number: 8,
        current_hits: 3,
        hits_required: 5,
        number_is_sold: false,
        winner_created: false,
        winner_entry_id: null,
        game_status: 'running',
        drawn_at: '2026-06-27T12:15:00Z',
        replay: false,
        ignored_field: 'safe',
      },
    });

    expect(result).toEqual({
      gameId: 'game-1',
      drawId: 'draw-1',
      gameNumberId: 'number-8',
      sequence: 4,
      drawnNumber: 8,
      currentHits: 3,
      hitsRequired: 5,
      numberIsSold: false,
      winnerCreated: false,
      winnerEntryId: null,
      gameStatus: 'running',
      drawnAt: '2026-06-27T12:15:00Z',
      replay: false,
    });
  });

  it('maps the draw replay resource with winner data', () => {
    const result = mapGameEngineDrawCommandResponse({
      data: {
        game_id: 'game-1',
        draw_id: 'draw-2',
        game_number_id: 'number-1',
        sequence: 5,
        drawn_number: 1,
        current_hits: 2,
        hits_required: 2,
        number_is_sold: true,
        winner_created: true,
        winner_entry_id: 'entry-1',
        game_status: 'completed',
        drawn_at: '2026-06-27T12:16:00Z',
        replay: true,
      },
    });

    expect(result.replay).toBe(true);
    expect(result.winnerCreated).toBe(true);
    expect(result.winnerEntryId).toBe('entry-1');
    expect(result.gameStatus).toBe('completed');
  });

  it('rejects malformed payloads', () => {
    expect(() => mapGameEngineCountersResponse({ data: {}, meta: null })).toThrowError();
    expect(() =>
      mapGameEngineStartResponse({
        data: {
          game_id: 'game-1',
          status: 'running',
          outcome: 'unknown_outcome',
          scheduled_start_at: '2026-06-27T12:00:00Z',
          started_at: '2026-06-27T12:05:00Z',
          confirmed_entries_count: 12,
        },
      }),
    ).toThrowError();
    expect(() =>
      mapGameEngineStartResponse({
        data: {
          game_id: 'game-1',
          status: 'running',
          outcome: 'started',
          scheduled_start_at: null,
          started_at: '2026-06-27T12:05:00Z',
          confirmed_entries_count: 12,
        },
      }),
    ).toThrowError();
    expect(() =>
      mapGameEnginePauseResponse({
        data: {
          game_id: 'game-1',
          status: 'paused',
          outcome: 'bad_pause',
          paused_at: '2026-06-27T12:10:00Z',
        },
      }),
    ).toThrowError();
    expect(() =>
      mapGameEngineResumeResponse({
        data: {
          game_id: 'game-1',
          status: 'running',
          outcome: 'already_running',
          resumed_at: '2026-06-27T12:15:00Z',
          next_draw_at: 'not-a-date',
        },
      }),
    ).toThrowError();
    expect(() =>
      mapGameEngineDrawCommandResponse({
        data: {
          game_id: 'game-1',
          draw_id: 'draw-3',
          game_number_id: 'number-1',
          sequence: 0,
          drawn_number: 1,
          current_hits: 1,
          hits_required: 5,
          number_is_sold: false,
          winner_created: false,
          winner_entry_id: null,
          game_status: 'running',
          drawn_at: '2026-06-27T12:15:00Z',
          replay: false,
        },
      }),
    ).toThrowError();
    expect(() =>
      mapGameEngineDrawCommandResponse({
        data: {
          game_id: 'game-1',
          draw_id: 'draw-3',
          game_number_id: 'number-1',
          sequence: 1,
          drawn_number: 1,
          current_hits: 1,
          hits_required: 5,
          number_is_sold: false,
          winner_created: false,
          winner_entry_id: null,
          game_status: 'paused',
          drawn_at: '2026-06-27T12:15:00Z',
          replay: false,
        },
      }),
    ).toThrowError();
    expect(() =>
      mapGameEngineDrawCommandResponse({
        data: {
          game_id: 'game-1',
          draw_id: 'draw-3',
          game_number_id: 'number-1',
          sequence: 1,
          drawn_number: 1,
          current_hits: 1,
          hits_required: 5,
          number_is_sold: false,
          winner_created: false,
          winner_entry_id: null,
          game_status: 'running',
          drawn_at: 'bad-date',
          replay: false,
        },
      }),
    ).toThrowError();

    try {
      mapGameEngineCountersResponse({ data: {}, meta: null });
    } catch (error) {
      expect(isGameEngineInvalidPayloadError(error)).toBe(true);
    }
  });
});
