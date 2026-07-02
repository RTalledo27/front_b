import { provideHttpClient } from '@angular/common/http';
import { HttpErrorResponse } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../../../core/api/api.config';
import { HttpAdminGamesRepository } from './admin-games.repository';

describe('HttpAdminGamesRepository', () => {
  let repository: HttpAdminGamesRepository;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        HttpAdminGamesRepository,
        { provide: API_BASE_URL, useValue: '/api/v1' },
      ],
    });

    repository = TestBed.inject(HttpAdminGamesRepository);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('uses the list endpoint without inventing filters', async () => {
    const requestPromise = firstValueFrom(
      repository.listGames({
        page: 1,
        search: '',
        status: '',
        published: null,
        autoDrawEnabled: null,
        createdFrom: null,
        createdTo: null,
      }),
    );

    const request = http.expectOne('/api/v1/admin/games?page=1');
    expect(request.request.method).toBe('GET');
    request.flush({
      data: [],
      links: { first: null, last: null, prev: null, next: null },
      meta: {
        current_page: 1,
        from: null,
        last_page: 1,
        links: [],
        path: '/api/v1/admin/games',
        per_page: 20,
        to: null,
        total: 0,
      },
    });

    await expect(requestPromise).resolves.toMatchObject({ games: [] });
  });

  it('serializes only supported backend filters and omits empty values', async () => {
    const requestPromise = firstValueFrom(
      repository.listGames({
        page: 3,
        search: 'fortuna',
        status: 'sales_open',
        published: true,
        autoDrawEnabled: false,
        createdFrom: '2026-06-01',
        createdTo: '2026-06-30',
      }),
    );

    const request = http.expectOne(
      '/api/v1/admin/games?page=3&search=fortuna&status=sales_open&published=1&auto_draw_enabled=0&created_from=2026-06-01&created_to=2026-06-30',
    );

    expect(request.request.method).toBe('GET');
    request.flush({
      data: [],
      links: { first: null, last: null, prev: null, next: null },
      meta: {
        current_page: 3,
        from: null,
        last_page: 3,
        links: [],
        path: '/api/v1/admin/games',
        per_page: 20,
        to: null,
        total: 0,
      },
    });

    await expect(requestPromise).resolves.toMatchObject({
      pageInfo: { currentPage: 3, lastPage: 3 },
    });
  });

  it('loads the detail resource with the real UUID route parameter', async () => {
    const requestPromise = firstValueFrom(repository.getGame('game id'));

    const request = http.expectOne('/api/v1/admin/games/game%20id');
    expect(request.request.method).toBe('GET');
    request.flush({
      data: {
        id: 'game id',
        slug: 'game-id',
        name: 'Game ID',
        description: null,
        status: 'draft',
        number_range: { min: 1, max: 10, hits_required: 3 },
        ticket_price: { amount_cents: 100, currency: 'PEN' },
        prize: { amount_cents: 1000, currency: 'PEN' },
        schedule: {
          sales_opens_at: null,
          sales_closes_at: null,
          scheduled_start_at: null,
          draw_interval_seconds: 30,
          auto_draw_enabled: false,
        },
        lifecycle: { started_at: null, paused_at: null, completed_at: null },
        engine: { next_draw_at: null, last_consumed_tick_at: null },
        numbers: { total: 10, sold: 0, reserved: 0, available: 10 },
        settings: null,
        latest_draw: null,
        winner: null,
        commerce: {
          reservations: { total: 0 },
          orders: { pending: 0, payment_submitted: 0, paid: 0, rejected: 0, expired: 0, cancelled: 0, refunded: 0 },
          payments: { pending: 0, under_review: 0, approved: 0, rejected: 0, cancelled: 0, refunded: 0 },
          entries: { confirmed: 0, cancelled: 0, refunded: 0, winner: 0 },
        },
        projection: { draws_total: 0, distinct_drawn_numbers: 0, max_counter_hits: 0, last_drawn_number: null },
        created_by: null,
        created_at: '2026-06-25T09:00:00Z',
      },
    });

    await expect(requestPromise).resolves.toMatchObject({ id: 'game id' });
  });

  it('loads admin game numbers from the real game context without invented filters', async () => {
    const requestPromise = firstValueFrom(repository.listGameNumbers('game 1', {}));

    const request = http.expectOne('/api/v1/admin/games/game%201/numbers');
    expect(request.request.method).toBe('GET');
    expect(request.request.params.keys()).toEqual([]);
    request.flush({
      data: [
        {
          id: 'number-1',
          number: 1,
          status: 'available',
          active_reservation: null,
          sold_entry: null,
        },
      ],
    });

    await expect(requestPromise).resolves.toMatchObject({
      numbers: [{ id: 'number-1', number: 1 }],
    });
  });

  it('posts the real create payload and maps the command resource', async () => {
    const requestPromise = firstValueFrom(
      repository.createGame({
        slug: 'bingo-fortuna',
        name: 'Bingo Fortuna',
        description: 'Creado desde frontend',
        numberMin: 1,
        numberMax: 90,
        hitsRequired: 5,
        ticketPriceCents: 500,
        prizeCents: 100000,
        currency: 'PEN',
        drawIntervalSeconds: 30,
        autoDrawEnabled: false,
        salesOpensAt: '2026-07-02T10:00:00.000Z',
        salesClosesAt: null,
        scheduledStartAt: null,
      }),
    );

    const request = http.expectOne('/api/v1/admin/games');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      slug: 'bingo-fortuna',
      name: 'Bingo Fortuna',
      description: 'Creado desde frontend',
      number_min: 1,
      number_max: 90,
      hits_required: 5,
      ticket_price_cents: 500,
      prize_cents: 100000,
      currency: 'PEN',
      draw_interval_seconds: 30,
      auto_draw_enabled: false,
      sales_opens_at: '2026-07-02T10:00:00.000Z',
      sales_closes_at: null,
      scheduled_start_at: null,
    });
    request.flush({
      data: {
        id: 'game-new',
        slug: 'bingo-fortuna',
        name: 'Bingo Fortuna',
        description: 'Creado desde frontend',
        status: 'draft',
        number_range: { min: 1, max: 90, hits_required: 5 },
        ticket_price: { amount_cents: 500, currency: 'PEN' },
        prize: { amount_cents: 100000, currency: 'PEN' },
        schedule: {
          sales_opens_at: '2026-07-02T10:00:00Z',
          sales_closes_at: null,
          scheduled_start_at: null,
          draw_interval_seconds: 30,
          auto_draw_enabled: false,
        },
        settings: null,
        created_by: 7,
        created_at: '2026-07-02T09:00:00Z',
        updated_at: '2026-07-02T09:00:00Z',
      },
      status: 'created',
    });

    await expect(requestPromise).resolves.toMatchObject({
      id: 'game-new',
      outcome: 'created',
    });
  });

  it('posts publish, open-sales, close-sales, schedule and cancel to the real admin endpoints', async () => {
    const publishPromise = firstValueFrom(repository.publishGame('game-1'));
    const publishRequest = http.expectOne('/api/v1/admin/games/game-1/publish');
    expect(publishRequest.request.method).toBe('POST');
    expect(publishRequest.request.body).toEqual({});
    publishRequest.flush(validCommandPayload('published'));
    await expect(publishPromise).resolves.toMatchObject({ status: { value: 'published' } });

    const openSalesPromise = firstValueFrom(repository.openGameSales('game-1'));
    const openSalesRequest = http.expectOne('/api/v1/admin/games/game-1/open-sales');
    expect(openSalesRequest.request.method).toBe('POST');
    expect(openSalesRequest.request.body).toEqual({});
    openSalesRequest.flush(validCommandPayload('sales_open'));
    await expect(openSalesPromise).resolves.toMatchObject({ status: { value: 'sales_open' } });

    const closeSalesPromise = firstValueFrom(repository.closeGameSales('game-1'));
    const closeSalesRequest = http.expectOne('/api/v1/admin/games/game-1/close-sales');
    expect(closeSalesRequest.request.method).toBe('POST');
    expect(closeSalesRequest.request.body).toEqual({});
    closeSalesRequest.flush(validCommandPayload('sales_closed'));
    await expect(closeSalesPromise).resolves.toMatchObject({ status: { value: 'sales_closed' } });

    const schedulePromise = firstValueFrom(
      repository.scheduleGame('game-1', { scheduledStartAt: '2026-07-02T12:00:00.000Z' }),
    );
    const scheduleRequest = http.expectOne('/api/v1/admin/games/game-1/schedule');
    expect(scheduleRequest.request.method).toBe('POST');
    expect(scheduleRequest.request.body).toEqual({
      scheduled_start_at: '2026-07-02T12:00:00.000Z',
    });
    scheduleRequest.flush(validCommandPayload('sales_closed'));
    await expect(schedulePromise).resolves.toMatchObject({ status: { value: 'sales_closed' } });

    const cancelPromise = firstValueFrom(repository.cancelGame('game-1', { reason: 'Descartado' }));
    const cancelRequest = http.expectOne('/api/v1/admin/games/game-1/cancel');
    expect(cancelRequest.request.method).toBe('POST');
    expect(cancelRequest.request.body).toEqual({ reason: 'Descartado' });
    cancelRequest.flush(validCommandPayload('cancelled'));
    await expect(cancelPromise).resolves.toMatchObject({ status: { value: 'cancelled' } });
  });

  it('rejects structurally invalid list payloads safely', async () => {
    const requestPromise = firstValueFrom(
      repository.listGames({
        page: 1,
        search: '',
        status: '',
        published: null,
        autoDrawEnabled: null,
        createdFrom: null,
        createdTo: null,
      }),
    );

    http.expectOne('/api/v1/admin/games?page=1').flush({ data: [] });

    await expect(requestPromise).rejects.toBeInstanceOf(Error);
  });

  it('passes through 401, 403, 404 and 422 responses from the backend', async () => {
    const unauthorizedPromise = firstValueFrom(
      repository.listGames({
        page: 1,
        search: '',
        status: '',
        published: null,
        autoDrawEnabled: null,
        createdFrom: null,
        createdTo: null,
      }),
    );
    http.expectOne('/api/v1/admin/games?page=1').flush(
      { message: 'Authentication required.' },
      { status: 401, statusText: 'Unauthorized' },
    );
    await expect(unauthorizedPromise).rejects.toBeInstanceOf(HttpErrorResponse);

    const forbiddenPromise = firstValueFrom(repository.getGame('forbidden-game'));
    http.expectOne('/api/v1/admin/games/forbidden-game').flush(
      { message: 'Administrator role required.' },
      { status: 403, statusText: 'Forbidden' },
    );
    await expect(forbiddenPromise).rejects.toBeInstanceOf(HttpErrorResponse);

    const notFoundPromise = firstValueFrom(repository.getGame('missing-game'));
    http.expectOne('/api/v1/admin/games/missing-game').flush(
      { message: 'game_not_found' },
      { status: 404, statusText: 'Not Found' },
    );
    await expect(notFoundPromise).rejects.toBeInstanceOf(HttpErrorResponse);

    const validationPromise = firstValueFrom(
      repository.listGames({
        page: 1,
        search: '',
        status: 'nope',
        published: null,
        autoDrawEnabled: null,
        createdFrom: null,
        createdTo: null,
      }),
    );
    http.expectOne('/api/v1/admin/games?page=1&status=nope').flush(
      { message: 'The selected status is invalid.', errors: { status: ['The selected status is invalid.'] } },
      { status: 422, statusText: 'Unprocessable Entity' },
    );
    await expect(validationPromise).rejects.toBeInstanceOf(HttpErrorResponse);

    const numbersNotFoundPromise = firstValueFrom(repository.listGameNumbers('missing-game', {}));
    http.expectOne('/api/v1/admin/games/missing-game/numbers').flush(
      { message: 'game_not_found' },
      { status: 404, statusText: 'Not Found' },
    );
    await expect(numbersNotFoundPromise).rejects.toBeInstanceOf(HttpErrorResponse);

    const conflictPromise = firstValueFrom(repository.publishGame('conflict-game'));
    http.expectOne('/api/v1/admin/games/conflict-game/publish').flush(
      { message: 'Game lifecycle integrity check failed.', error: 'game_lifecycle_integrity_violation' },
      { status: 409, statusText: 'Conflict' },
    );
    await expect(conflictPromise).rejects.toBeInstanceOf(HttpErrorResponse);
  });

  it('rejects invalid admin numbers payloads safely', async () => {
    const requestPromise = firstValueFrom(repository.listGameNumbers('broken-game', {}));

    http.expectOne('/api/v1/admin/games/broken-game/numbers').flush({
      data: [{ id: 'number-1' }],
    });

    await expect(requestPromise).rejects.toBeInstanceOf(Error);
  });
});

function validCommandPayload(status: string) {
  return {
    data: {
      id: 'game-1',
      slug: 'bingo-fortuna',
      name: 'Bingo Fortuna',
      description: null,
      status,
      number_range: { min: 1, max: 90, hits_required: 5 },
      ticket_price: { amount_cents: 500, currency: 'PEN' },
      prize: { amount_cents: 100000, currency: 'PEN' },
      schedule: {
        sales_opens_at: null,
        sales_closes_at: null,
        scheduled_start_at: null,
        draw_interval_seconds: 30,
        auto_draw_enabled: false,
      },
      settings: null,
      created_by: 7,
      created_at: '2026-07-02T09:00:00Z',
      updated_at: '2026-07-02T09:15:00Z',
    },
  };
}
