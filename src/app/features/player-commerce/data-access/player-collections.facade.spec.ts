import { LaravelPaginatedResponse } from '../../../core/api/models/api-response.models';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { PLAYER_COMMERCE_REPOSITORY, PlayerCommerceRepository } from './player-commerce.repository';
import { PlayerEntryApiDto, PlayerReservationApiDto } from '../models/player-commerce.models';
import { PlayerEntriesFacade, PlayerReservationsFacade } from './player-collections.facade';

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

    TestBed.configureTestingModule({
      providers: [
        PlayerReservationsFacade,
        PlayerEntriesFacade,
        { provide: PLAYER_COMMERCE_REPOSITORY, useValue: repository },
      ],
    });

    return repository;
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
});
