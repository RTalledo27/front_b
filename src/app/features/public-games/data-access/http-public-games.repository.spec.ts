import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../../../core/api/api.config';
import { LaravelPaginatedResponse } from '../../../core/api/models/api-response.models';
import { PublicGameApiDto } from '../../../core/api/models/game-api.models';
import { HttpPublicGamesRepository } from './http-public-games.repository';

const gameDto: PublicGameApiDto = {
  id: 'game-1',
  slug: 'bingo-fortuna',
  name: 'Bingo Fortuna',
  description: null,
  status: 'published',
  number_range: { min: 1, max: 90, hits_required: 15 },
  ticket_price: { amount_cents: 500, currency: 'PEN' },
  prize: { amount_cents: 100_000, currency: 'PEN' },
  schedule: {
    sales_opens_at: null,
    sales_closes_at: null,
    scheduled_start_at: '2026-06-21T21:00:00Z',
    draw_interval_seconds: 8,
  },
};

describe('HttpPublicGamesRepository', () => {
  let repository: HttpPublicGamesRepository;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        HttpPublicGamesRepository,
        { provide: API_BASE_URL, useValue: '/api/v1' },
      ],
    });

    repository = TestBed.inject(HttpPublicGamesRepository);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads and maps a requested catalog page', () => {
    let total = 0;
    repository.list(2).subscribe((page) => (total = page.pageInfo.total));

    const request = http.expectOne('/api/v1/public/games?page=2');
    expect(request.request.method).toBe('GET');

    const response: LaravelPaginatedResponse<PublicGameApiDto> = {
      data: [gameDto],
      links: { first: null, last: null, prev: null, next: null },
      meta: {
        current_page: 2,
        from: 1,
        last_page: 2,
        links: [],
        path: '/api/v1/public/games',
        per_page: 20,
        to: 1,
        total: 21,
      },
    };
    request.flush(response);

    expect(total).toBe(21);
  });

  it('encodes the slug and unwraps the detail response', () => {
    let gameName = '';
    repository.getBySlug('bingo fortuna').subscribe((game) => (gameName = game.name));

    const request = http.expectOne('/api/v1/public/games/bingo%20fortuna');
    expect(request.request.method).toBe('GET');
    request.flush({ data: gameDto });

    expect(gameName).toBe('Bingo Fortuna');
  });
});