import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../../../core/api/api.config';
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

  it('requests the admin draws endpoint with paginated read params', () => {
    repository.listDraws('game-1').subscribe((result) => {
      expect(result).toHaveLength(1);
      expect(result[0]?.drawnNumber).toBe(12);
    });

    const request = http.expectOne('/api/v1/admin/games/game-1/draws?per_page=100');
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
      meta: { current_page: 1, from: 1, last_page: 1, links: [], path: '', per_page: 100, to: 1, total: 1 },
    });
  });

  it('requests the admin counters endpoint with paginated read params', () => {
    repository.listCounters('game-1').subscribe((result) => {
      expect(result[0]?.status.label).toBe('Disponible');
    });

    const request = http.expectOne('/api/v1/admin/games/game-1/counters?per_page=100');
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
      meta: { current_page: 1, from: 1, last_page: 1, links: [], path: '', per_page: 100, to: 1, total: 1 },
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

  it('surfaces a 401 start rejection unchanged', () => {
    repository.startGame('game-1').subscribe({
      next: () => {
        throw new Error('expected the request to fail');
      },
      error: (error) => {
        expect(error.status).toBe(401);
      },
    });

    const request = http.expectOne('/api/v1/admin/games/game-1/start');
    request.flush({ message: 'Unauthenticated.' }, { status: 401, statusText: 'Unauthorized' });
  });

  it('surfaces a 403 start rejection unchanged', () => {
    repository.startGame('game-1').subscribe({
      next: () => {
        throw new Error('expected the request to fail');
      },
      error: (error) => {
        expect(error.status).toBe(403);
      },
    });

    const request = http.expectOne('/api/v1/admin/games/game-1/start');
    request.flush({ message: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });
  });

  it('surfaces a 404 start rejection unchanged', () => {
    repository.startGame('game-1').subscribe({
      next: () => {
        throw new Error('expected the request to fail');
      },
      error: (error) => {
        expect(error.status).toBe(404);
      },
    });

    const request = http.expectOne('/api/v1/admin/games/game-1/start');
    request.flush({ message: 'Not Found' }, { status: 404, statusText: 'Not Found' });
  });

  it('surfaces a 422 start rejection unchanged', () => {
    repository.startGame('game-1').subscribe({
      next: () => {
        throw new Error('expected the request to fail');
      },
      error: (error) => {
        expect(error.status).toBe(422);
      },
    });

    const request = http.expectOne('/api/v1/admin/games/game-1/start');
    request.flush({ message: 'game_not_ready_for_start' }, { status: 422, statusText: 'Unprocessable Content' });
  });

  it('surfaces a network failure for start unchanged', () => {
    repository.startGame('game-1').subscribe({
      next: () => {
        throw new Error('expected the request to fail');
      },
      error: (error) => {
        expect(error.status).toBe(0);
      },
    });

    const request = http.expectOne('/api/v1/admin/games/game-1/start');
    request.error(new ProgressEvent('error'));
  });
});
