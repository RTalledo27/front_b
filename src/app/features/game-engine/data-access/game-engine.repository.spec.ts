import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../core/api/api.config';
import {
  GameEngineDrawCommandView,
  GameEngineRebuildCountersCommandView,
} from '../models/game-engine.models';
import { HttpGameEngineRepository } from './game-engine.repository';

describe('HttpGameEngineRepository', () => {
  let repository: HttpGameEngineRepository;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        HttpGameEngineRepository,
        { provide: API_BASE_URL, useValue: '/api/v1' },
      ],
    });

    repository = TestBed.inject(HttpGameEngineRepository);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function invokeCommand(command: 'start' | 'pause' | 'resume'): Observable<unknown> {
    switch (command) {
      case 'start':
        return repository.startGame('game-1');
      case 'pause':
        return repository.pauseGame('game-1');
      case 'resume':
        return repository.resumeGame('game-1');
    }
  }

  function invokeDraw(
    commandId = '11111111-1111-4111-8111-111111111111',
  ): Observable<GameEngineDrawCommandView> {
    return repository.drawNumber('game-1', commandId);
  }

  function invokeRebuild(): Observable<GameEngineRebuildCountersCommandView> {
    return repository.rebuildCounters('game-1');
  }

  it('requests the admin draws endpoint with paginated read params', () => {
    repository.listDraws('game-1').subscribe((result) => {
      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.drawnNumber).toBe(12);
      expect(result.pageInfo.currentPage).toBe(1);
    });

    const request = http.expectOne('/api/v1/admin/games/game-1/draws?page=1');
    expect(request.request.method).toBe('GET');
    request.flush({
      data: [
        {
          id: 'draw-1',
          game_id: 'game-1',
          game_number_id: 'number-1',
          sequence: 1,
          drawn_number: 12,
          strategy: 'manual',
          drawn_at: '2026-06-27T12:00:00Z',
        },
      ],
      links: { first: null, last: null, prev: null, next: null },
      meta: { current_page: 1, from: 1, last_page: 1, links: [], path: '/api/v1/admin/games/game-1/draws', per_page: 50, to: 1, total: 1 },
    });
  });

  it('requests the admin counters endpoint with paginated read params', () => {
    repository.listCounters('game-1').subscribe((result) => {
      expect(result.items[0]?.status.label).toBe('Disponible');
      expect(result.pageInfo.currentPage).toBe(1);
    });

    const request = http.expectOne('/api/v1/admin/games/game-1/counters?page=1');
    expect(request.request.method).toBe('GET');
    request.flush({
      data: [
        {
          game_number_id: 'number-1',
          number: 12,
          status: 'available',
          hits_count: 0,
          last_draw_sequence: null,
        },
      ],
      links: { first: null, last: null, prev: null, next: null },
      meta: { current_page: 1, from: 1, last_page: 1, links: [], path: '/api/v1/admin/games/game-1/counters', per_page: 50, to: 1, total: 1 },
    });
  });

  it('unwraps the winner resource envelope', () => {
    repository.getWinner('game-1').subscribe((result) => {
      expect(result.userId).toBe(4);
    });

    const request = http.expectOne('/api/v1/admin/games/game-1/winner');
    expect(request.request.method).toBe('GET');
    request.flush({
      data: {
        winner_id: 'winner-1',
        game_id: 'game-1',
        game_entry_id: 'entry-1',
        game_number_id: 'number-1',
        winning_number: 42,
        game_draw_id: 'draw-1',
        winning_draw_sequence: 7,
        winning_hits: 5,
        user_id: 4,
        won_at: '2026-06-27T13:00:00Z',
      },
    });
  });

  it('posts the start command without a request body payload', () => {
    repository.startGame('game-1').subscribe((result) => {
      expect(result.outcome).toBe('started');
      expect(result.confirmedEntriesCount).toBe(2);
    });

    const request = http.expectOne('/api/v1/admin/games/game-1/start');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toBeNull();
    request.flush({
      data: {
        game_id: 'game-1',
        status: 'running',
        outcome: 'started',
        scheduled_start_at: '2026-06-27T12:00:00Z',
        started_at: '2026-06-27T12:05:00Z',
        confirmed_entries_count: 2,
      },
    });
  });

  it('unwraps an already_started replay as a successful start response', () => {
    repository.startGame('game-1').subscribe((result) => {
      expect(result.outcome).toBe('already_started');
      expect(result.status).toBe('running');
    });

    const request = http.expectOne('/api/v1/admin/games/game-1/start');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toBeNull();
    request.flush({
      data: {
        game_id: 'game-1',
        status: 'running',
        outcome: 'already_started',
        scheduled_start_at: '2026-06-27T12:00:00Z',
        started_at: '2026-06-27T12:05:00Z',
        confirmed_entries_count: 2,
      },
    });
  });

  it('posts the pause command without a request body payload', () => {
    repository.pauseGame('game-1').subscribe((result) => {
      expect(result.outcome).toBe('paused');
      expect(result.pausedAt).toBe('2026-06-27T12:10:00Z');
    });

    const request = http.expectOne('/api/v1/admin/games/game-1/pause');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toBeNull();
    request.flush({
      data: {
        game_id: 'game-1',
        status: 'paused',
        outcome: 'paused',
        paused_at: '2026-06-27T12:10:00Z',
      },
    });
  });

  it('unwraps an already_paused replay as a successful pause response', () => {
    repository.pauseGame('game-1').subscribe((result) => {
      expect(result.outcome).toBe('already_paused');
    });

    const request = http.expectOne('/api/v1/admin/games/game-1/pause');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toBeNull();
    request.flush({
      data: {
        game_id: 'game-1',
        status: 'paused',
        outcome: 'already_paused',
        paused_at: '2026-06-27T12:10:00Z',
      },
    });
  });

  it('posts the resume command without a request body payload', () => {
    repository.resumeGame('game-1').subscribe((result) => {
      expect(result.outcome).toBe('resumed');
      expect(result.nextDrawAt).toBe('2026-06-27T12:15:30Z');
    });

    const request = http.expectOne('/api/v1/admin/games/game-1/resume');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toBeNull();
    request.flush({
      data: {
        game_id: 'game-1',
        status: 'running',
        outcome: 'resumed',
        resumed_at: '2026-06-27T12:15:00Z',
        next_draw_at: '2026-06-27T12:15:30Z',
      },
    });
  });

  it('unwraps an already_running replay as a successful resume response', () => {
    repository.resumeGame('game-1').subscribe((result) => {
      expect(result.outcome).toBe('already_running');
    });

    const request = http.expectOne('/api/v1/admin/games/game-1/resume');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toBeNull();
    request.flush({
      data: {
        game_id: 'game-1',
        status: 'running',
        outcome: 'already_running',
        resumed_at: '2026-06-27T12:15:00Z',
        next_draw_at: '2026-06-27T12:15:30Z',
      },
    });
  });

  it('posts the draw command without a request body payload and with X-Draw-Command-Id', () => {
    repository
      .drawNumber('game-1', '11111111-1111-4111-8111-111111111111')
      .subscribe((result) => {
        expect(result.drawnNumber).toBe(27);
        expect(result.replay).toBe(false);
        expect(result.gameStatus).toBe('running');
      });

    const request = http.expectOne('/api/v1/admin/games/game-1/draws');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toBeNull();
    expect(request.request.headers.get('X-Draw-Command-Id')).toBe(
      '11111111-1111-4111-8111-111111111111',
    );
    request.flush({
      data: {
        game_id: 'game-1',
        draw_id: 'draw-1',
        game_number_id: 'number-1',
        sequence: 1,
        drawn_number: 27,
        current_hits: 1,
        hits_required: 5,
        number_is_sold: false,
        winner_created: false,
        winner_entry_id: null,
        game_status: 'running',
        drawn_at: '2026-06-27T12:15:00Z',
        replay: false,
      },
    });
  });

  it('unwraps a draw replay as a successful draw response', () => {
    invokeDraw().subscribe((result) => {
      expect(result.replay).toBe(true);
      expect(result.winnerCreated).toBe(true);
      expect(result.gameStatus).toBe('completed');
    });

    const request = http.expectOne('/api/v1/admin/games/game-1/draws');
    expect(request.request.headers.get('X-Draw-Command-Id')).toBe(
      '11111111-1111-4111-8111-111111111111',
    );
    request.flush({
      data: {
        game_id: 'game-1',
        draw_id: 'draw-2',
        game_number_id: 'number-1',
        sequence: 3,
        drawn_number: 7,
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
  });

  for (const command of ['start', 'pause', 'resume'] as const) {
    it(`surfaces a 401 ${command} rejection unchanged`, () => {
      invokeCommand(command).subscribe({
        next: () => {
          throw new Error('expected the request to fail');
        },
        error: (error: { status: number }) => {
          expect(error.status).toBe(401);
        },
      });

      const request = http.expectOne(`/api/v1/admin/games/game-1/${command}`);
      request.flush({ message: 'Unauthenticated.' }, { status: 401, statusText: 'Unauthorized' });
    });

    it(`surfaces a 403 ${command} rejection unchanged`, () => {
      invokeCommand(command).subscribe({
        next: () => {
          throw new Error('expected the request to fail');
        },
        error: (error: { status: number }) => {
          expect(error.status).toBe(403);
        },
      });

      const request = http.expectOne(`/api/v1/admin/games/game-1/${command}`);
      request.flush({ message: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });
    });

    it(`surfaces a 404 ${command} rejection unchanged`, () => {
      invokeCommand(command).subscribe({
        next: () => {
          throw new Error('expected the request to fail');
        },
        error: (error: { status: number }) => {
          expect(error.status).toBe(404);
        },
      });

      const request = http.expectOne(`/api/v1/admin/games/game-1/${command}`);
      request.flush({ message: 'Not Found' }, { status: 404, statusText: 'Not Found' });
    });

    it(`surfaces a 409 ${command} rejection unchanged`, () => {
      invokeCommand(command).subscribe({
        next: () => {
          throw new Error('expected the request to fail');
        },
        error: (error: { status: number }) => {
          expect(error.status).toBe(409);
        },
      });

      const request = http.expectOne(`/api/v1/admin/games/game-1/${command}`);
      request.flush({ message: `${command}_conflict` }, { status: 409, statusText: 'Conflict' });
    });

    it(`surfaces a 422 ${command} rejection unchanged`, () => {
      invokeCommand(command).subscribe({
        next: () => {
          throw new Error('expected the request to fail');
        },
        error: (error: { status: number }) => {
          expect(error.status).toBe(422);
        },
      });

      const request = http.expectOne(`/api/v1/admin/games/game-1/${command}`);
      request.flush({ message: `${command}_invalid` }, { status: 422, statusText: 'Unprocessable Content' });
    });

    it(`surfaces a network failure for ${command} unchanged`, () => {
      invokeCommand(command).subscribe({
        next: () => {
          throw new Error('expected the request to fail');
        },
        error: (error: { status: number }) => {
          expect(error.status).toBe(0);
        },
      });

      const request = http.expectOne(`/api/v1/admin/games/game-1/${command}`);
      request.error(new ProgressEvent('error'));
    });
  }

  for (const status of [401, 403, 404, 409, 422] as const) {
    it(`surfaces a ${status} draw rejection unchanged`, () => {
      invokeDraw().subscribe({
        next: () => {
          throw new Error('expected the request to fail');
        },
        error: (error: { status: number }) => {
          expect(error.status).toBe(status);
        },
      });

      const request = http.expectOne('/api/v1/admin/games/game-1/draws');
      request.flush({ message: `draw_${status}` }, { status, statusText: 'Error' });
    });
  }

  it('surfaces a network failure for draw unchanged', () => {
    invokeDraw().subscribe({
      next: () => {
        throw new Error('expected the request to fail');
      },
      error: (error: { status: number }) => {
        expect(error.status).toBe(0);
      },
    });

    const request = http.expectOne('/api/v1/admin/games/game-1/draws');
    request.error(new ProgressEvent('error'));
  });

  it('posts the rebuild command without a request body payload', () => {
    invokeRebuild().subscribe((result) => {
      expect(result.outcome).toBe('rebuilt');
      expect(result.rebuiltRows).toBe(3);
    });

    const request = http.expectOne('/api/v1/admin/games/game-1/counters/rebuild');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toBeNull();
    request.flush({
      data: {
        game_id: 'game-1',
        outcome: 'rebuilt',
        previous_rows: 1,
        previous_hits_total: 2,
        rebuilt_rows: 3,
        rebuilt_hits_total: 7,
        total_draws: 7,
        max_sequence: 7,
        rebuilt_at: '2026-06-27T12:20:00Z',
      },
    });
  });

  it('unwraps an already_consistent rebuild response as a successful command response', () => {
    invokeRebuild().subscribe((result) => {
      expect(result.outcome).toBe('already_consistent');
      expect(result.rebuiltRows).toBe(0);
    });

    const request = http.expectOne('/api/v1/admin/games/game-1/counters/rebuild');
    expect(request.request.method).toBe('POST');
    request.flush({
      data: {
        game_id: 'game-1',
        outcome: 'already_consistent',
        previous_rows: 0,
        previous_hits_total: 0,
        rebuilt_rows: 0,
        rebuilt_hits_total: 0,
        total_draws: 0,
        max_sequence: 0,
        rebuilt_at: '2026-06-27T12:20:00Z',
      },
    });
  });

  for (const status of [401, 403, 404, 409, 422] as const) {
    it(`surfaces a ${status} rebuild rejection unchanged`, () => {
      invokeRebuild().subscribe({
        next: () => {
          throw new Error('expected the request to fail');
        },
        error: (error: { status: number }) => {
          expect(error.status).toBe(status);
        },
      });

      const request = http.expectOne('/api/v1/admin/games/game-1/counters/rebuild');
      request.flush({ message: `rebuild_${status}` }, { status, statusText: 'Error' });
    });
  }

  it('surfaces a network failure for rebuild unchanged', () => {
    invokeRebuild().subscribe({
      next: () => {
        throw new Error('expected the request to fail');
      },
      error: (error: { status: number }) => {
        expect(error.status).toBe(0);
      },
    });

    const request = http.expectOne('/api/v1/admin/games/game-1/counters/rebuild');
    request.error(new ProgressEvent('error'));
  });
});
