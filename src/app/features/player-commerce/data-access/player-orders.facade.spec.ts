import { LaravelPaginatedResponse } from '../../../core/api/models/api-response.models';
import { PlayerOrderApiDto } from '../models/player-commerce.models';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { PLAYER_COMMERCE_REPOSITORY, PlayerCommerceRepository } from './player-commerce.repository';
import { PlayerOrdersFacade } from './player-orders.facade';

describe('PlayerOrdersFacade', () => {
  async function configureFacade(payload?: unknown) {
    const repository: PlayerCommerceRepository = {
      listOrders: vi.fn(() =>
        of(
          ((payload ?? {
            data: [
              {
                id: 'order-1',
                game_id: 'game-1',
                status: 'pending',
                subtotal_cents: 1000,
                total_cents: 1000,
                currency: 'PEN',
                expires_at: '2026-06-25T12:00:00Z',
                paid_at: null,
                cancelled_at: null,
                expired_at: null,
                created_at: '2026-06-25T10:00:00Z',
                item_count: 2,
                payment: null,
              },
            ],
            links: { first: null, last: null, prev: null, next: null },
            meta: {
              current_page: 1,
              from: 1,
              last_page: 1,
              links: [],
              path: '/api/v1/me/orders',
              per_page: 20,
              to: 1,
              total: 1,
            },
          }) as unknown) as LaravelPaginatedResponse<PlayerOrderApiDto>,
        ),
      ),
      getOrder: vi.fn(),
      cancelOrder: vi.fn(),
      submitEvidence: vi.fn(),
      listReservations: vi.fn(),
      listEntries: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        PlayerOrdersFacade,
        { provide: PLAYER_COMMERCE_REPOSITORY, useValue: repository },
      ],
    });

    return { facade: TestBed.inject(PlayerOrdersFacade), repository };
  }

  it('loads paginated orders without repeating requests', async () => {
    const { facade, repository } = await configureFacade();

    facade.load();

    expect(repository.listOrders).toHaveBeenCalledTimes(1);
    expect(facade.status()).toBe('loaded');
    expect(facade.orders()).toHaveLength(1);
    expect(facade.pageInfo().currentPage).toBe(1);
  });

  it('turns a malformed 200 payload into a controlled error instead of leaving loading stuck', async () => {
    const { facade } = await configureFacade({
      data: [{ id: 'order-1', status: 'pending' }],
      links: { first: null, last: null, prev: null, next: null },
      meta: { current_page: 1 },
    });

    facade.load();

    expect(facade.orders()).toEqual([]);
    expect(facade.status()).toBe('unexpectedError');
    expect(facade.error()).toMatchObject({
      code: 'invalid_payload',
      message: 'Recibimos una respuesta incompleta del servidor.',
    });
  });
});
