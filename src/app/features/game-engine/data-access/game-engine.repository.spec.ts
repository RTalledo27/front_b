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
});
