import { describe, expect, it } from 'vitest';
import {
  isAdminGameNumbersInvalidPayloadError,
  mapAdminGameNumber,
  mapAdminGameNumbersResponse,
} from './admin-game-numbers.mapper';

describe('admin-game-numbers mapper', () => {
  it('maps a valid admin game number payload and drops unnecessary PII from the view model', () => {
    const number = mapAdminGameNumber({
      id: 'number-1',
      number: 7,
      status: 'reserved',
      active_reservation: {
        id: 'reservation-1',
        order_id: 'order-1',
        user_id: 25,
        order_status: 'pending',
        expires_at: '2026-06-27T10:00:00Z',
      },
      sold_entry: {
        id: 'entry-1',
        user_id: 25,
        user_name: 'Jane Doe',
        status: 'confirmed',
        confirmed_at: '2026-06-27T09:55:00Z',
      },
    });

    expect(number.number).toBe(7);
    expect(number.status.label).toBe('Reservado');
    expect(number.activeReservation?.orderId).toBe('order-1');
    expect(number.soldEntry?.status).toBe('confirmed');
    expect('userId' in (number.activeReservation ?? {})).toBe(false);
    expect('userName' in (number.soldEntry ?? {})).toBe(false);
  });

  it('maps unknown number statuses neutrally without failing the whole section', () => {
    const number = mapAdminGameNumber({
      id: 'number-2',
      number: 8,
      status: 'blocked',
      active_reservation: null,
      sold_entry: null,
    });

    expect(number.status.isKnown).toBe(false);
    expect(number.status.tone).toBe('neutral');
  });

  it('maps the collection envelope returned by Laravel resources', () => {
    const result = mapAdminGameNumbersResponse({
      data: [
        {
          id: 'number-3',
          number: 9,
          status: 'available',
          active_reservation: null,
          sold_entry: null,
        },
      ],
    });

    expect(result.numbers).toHaveLength(1);
    expect(result.numbers[0]?.status.label).toBe('Disponible');
  });

  it('rejects invalid date strings safely', () => {
    expect(() =>
      mapAdminGameNumber({
        id: 'number-4',
        number: 10,
        status: 'sold',
        active_reservation: null,
        sold_entry: {
          id: 'entry-2',
          status: 'confirmed',
          confirmed_at: 'not-a-date',
        },
      }),
    ).toThrowError(/invalid_admin_game_numbers_payload/);
  });

  it('rejects incomplete payloads safely', () => {
    try {
      mapAdminGameNumbersResponse({ data: [{ id: 'number-5' }] });
    } catch (error: unknown) {
      expect(isAdminGameNumbersInvalidPayloadError(error)).toBe(true);
      return;
    }

    throw new Error('Expected mapper to reject the payload');
  });
});
