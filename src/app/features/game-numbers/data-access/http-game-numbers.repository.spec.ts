import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../../../core/api/api.config';
import { HttpGameNumbersRepository } from './http-game-numbers.repository';

describe('HttpGameNumbersRepository', () => {
  let repository: HttpGameNumbersRepository;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        HttpGameNumbersRepository,
        { provide: API_BASE_URL, useValue: '/api/v1' },
      ],
    });
    repository = TestBed.inject(HttpGameNumbersRepository);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('maps the public number contract with real backend UUIDs', () => {
    let result:
      | {
          numbers: Array<{
            key: string;
            gameNumberId: string;
            number: number;
            status: 'available' | 'reserved' | 'sold';
          }>;
        }
      | undefined;
    repository.getAvailability('bingo fortuna').subscribe((availability) => (result = availability));

    const request = http.expectOne('/api/v1/public/games/bingo%20fortuna/numbers');
    expect(request.request.method).toBe('GET');
    request.flush({
      data: [
        { id: '01977abc-0000-7000-8000-000000000011', number: 1, status: 'available' },
        { id: '01977abc-0000-7000-8000-000000000012', number: 2, status: 'reserved' },
        { id: '01977abc-0000-7000-8000-000000000013', number: 3, status: 'sold' },
      ],
    });

    expect(result?.numbers).toEqual([
      {
        key: '01977abc-0000-7000-8000-000000000011',
        gameNumberId: '01977abc-0000-7000-8000-000000000011',
        number: 1,
        status: 'available',
      },
      {
        key: '01977abc-0000-7000-8000-000000000012',
        gameNumberId: '01977abc-0000-7000-8000-000000000012',
        number: 2,
        status: 'reserved',
      },
      {
        key: '01977abc-0000-7000-8000-000000000013',
        gameNumberId: '01977abc-0000-7000-8000-000000000013',
        number: 3,
        status: 'sold',
      },
    ]);
  });

  it('rejects payloads without a valid UUID', async () => {
    const promise = firstValueFrom(repository.getAvailability('broken-game'));

    http.expectOne('/api/v1/public/games/broken-game/numbers').flush({
      data: [{ id: '', number: 1, status: 'available' }],
    });

    await expect(promise).rejects.toThrow('Invalid public game number id payload.');
  });

  it('rejects payloads with an unknown status', async () => {
    const promise = firstValueFrom(repository.getAvailability('broken-game'));

    http.expectOne('/api/v1/public/games/broken-game/numbers').flush({
      data: [{ id: '01977abc-0000-7000-8000-000000000011', number: 1, status: 'held' }],
    });

    await expect(promise).rejects.toThrow('Invalid public game number status payload.');
  });

  it('posts a reservation with the exact backend contract', () => {
    let result: unknown;
    repository
      .reserveNumbers({
        gameId: '01977abc-0000-7000-8000-000000000001',
        gameNumberIds: ['01977abc-0000-7000-8000-000000000011'],
        idempotencyKey: 'reserve-12345678_ABCDEFGH',
      })
      .subscribe((response) => (result = response));

    const request = http.expectOne('/api/v1/games/01977abc-0000-7000-8000-000000000001/reservations');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      game_number_ids: ['01977abc-0000-7000-8000-000000000011'],
    });
    expect(request.request.headers.get('Idempotency-Key')).toBe('reserve-12345678_ABCDEFGH');
    expect(request.request.headers.get('Authorization')).toBeNull();
    request.flush({
      data: {
        order: {
          id: '01977abc-0000-7000-8000-000000000101',
          game_id: '01977abc-0000-7000-8000-000000000001',
          status: 'pending',
          subtotal_cents: 500,
          total_cents: 500,
          currency: 'PEN',
          expires_at: '2026-06-25T12:00:00Z',
        },
        numbers: [1],
        game_number_ids: ['01977abc-0000-7000-8000-000000000011'],
        reservation_ids: ['01977abc-0000-7000-8000-000000000201'],
        payment: {
          id: '01977abc-0000-7000-8000-000000000301',
          status: 'pending',
          amount_cents: 500,
          currency: 'PEN',
        },
      },
    });

    expect(result).toEqual({
      order: {
        id: '01977abc-0000-7000-8000-000000000101',
        game_id: '01977abc-0000-7000-8000-000000000001',
        status: 'pending',
        subtotal_cents: 500,
        total_cents: 500,
        currency: 'PEN',
        expires_at: '2026-06-25T12:00:00Z',
      },
      numbers: [1],
      game_number_ids: ['01977abc-0000-7000-8000-000000000011'],
      reservation_ids: ['01977abc-0000-7000-8000-000000000201'],
      payment: {
        id: '01977abc-0000-7000-8000-000000000301',
        status: 'pending',
        amount_cents: 500,
        currency: 'PEN',
      },
    });
  });

  it.each([401, 403, 409, 422, 425, 429])('surfaces backend status %s during reservation', async (status) => {
    const promise = firstValueFrom(
      repository.reserveNumbers({
        gameId: '01977abc-0000-7000-8000-000000000001',
        gameNumberIds: ['01977abc-0000-7000-8000-000000000011'],
        idempotencyKey: 'reserve-12345678_ABCDEFGH',
      }),
    );

    http
      .expectOne('/api/v1/games/01977abc-0000-7000-8000-000000000001/reservations')
      .flush({ message: 'Backend error.' }, { status, statusText: 'Error' });

    await expect(promise).rejects.toBeInstanceOf(HttpErrorResponse);
  });

  it('surfaces network errors during reservation', async () => {
    const promise = firstValueFrom(
      repository.reserveNumbers({
        gameId: '01977abc-0000-7000-8000-000000000001',
        gameNumberIds: ['01977abc-0000-7000-8000-000000000011'],
        idempotencyKey: 'reserve-12345678_ABCDEFGH',
      }),
    );

    http
      .expectOne('/api/v1/games/01977abc-0000-7000-8000-000000000001/reservations')
      .error(new ProgressEvent('network-error'));

    await expect(promise).rejects.toBeInstanceOf(HttpErrorResponse);
  });
});
