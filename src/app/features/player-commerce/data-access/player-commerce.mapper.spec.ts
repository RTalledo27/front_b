import {
  mapPlayerEntry,
  mapPlayerOrderDetail,
  mapPlayerOrderSummary,
  mapPlayerReservation,
} from './player-commerce.mapper';

describe('player-commerce.mapper', () => {
  it('maps the order summary without inventing a synthetic reference', () => {
    const result = mapPlayerOrderSummary({
      id: '01977abc-0000-7000-8000-000000000101',
      game_id: '01977abc-0000-7000-8000-000000000001',
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
    });

    expect(result.reference).toBe('01977abc-0000-7000-8000-000000000101');
    expect(result.validity).toBe('active');
    expect(result.itemCount).toBe(2);
  });

  it('maps the order detail with createdAt null when the backend detail resource does not expose it', () => {
    const result = mapPlayerOrderDetail({
      id: '01977abc-0000-7000-8000-000000000102',
      status: 'payment_submitted',
      subtotal_cents: 500,
      total_cents: 500,
      currency: 'PEN',
      expires_at: '2026-06-25T12:00:00Z',
      paid_at: null,
      cancelled_at: null,
      expired_at: null,
      game: { id: 'game-1', slug: 'bingo-fortuna', name: 'Bingo Fortuna' },
      items: [
        { id: 'item-2', game_number_id: 'gn-2', unit_price_cents: 500, number: 8, number_status: 'reserved' },
        { id: 'item-1', game_number_id: 'gn-1', unit_price_cents: 500, number: 4, number_status: 'reserved' },
      ],
      reservations: [],
      payment: {
        id: 'payment-1',
        status: 'under_review',
        amount_cents: 500,
        currency: 'PEN',
        submitted_at: '2026-06-25T10:15:00Z',
      },
    });

    expect(result.createdAt).toBeNull();
    expect(result.reference).toBe('01977abc-0000-7000-8000-000000000102');
    expect(result.reservedNumbers).toEqual([4, 8]);
    expect(result.nextAction).toContain('en revisión');
  });

  it('maps reservations and entries preserving the contract ids and nested game metadata', () => {
    const reservation = mapPlayerReservation({
      id: 'reservation-1',
      order_id: 'order-1',
      game_number_id: 'gn-7',
      created_at: '2026-06-25T10:00:00Z',
      order: {
        id: 'order-1',
        status: 'pending',
        expires_at: '2026-06-25T12:00:00Z',
        total_cents: 700,
        currency: 'PEN',
      },
      game_number: {
        id: 'gn-7',
        number: 7,
        status: 'reserved',
        game: { id: 'game-1', slug: 'bingo-fortuna', name: 'Bingo Fortuna' },
      },
    });

    const entry = mapPlayerEntry({
      id: 'entry-1',
      game_id: 'game-1',
      game_number_id: 'gn-7',
      status: 'confirmed',
      confirmed_at: '2026-06-25T13:00:00Z',
      game: { id: 'game-1', slug: 'bingo-fortuna', name: 'Bingo Fortuna' },
      game_number: { id: 'gn-7', number: 7, status: 'sold' },
    });

    expect(reservation.order.id).toBe('order-1');
    expect(reservation.gameNumber.game?.slug).toBe('bingo-fortuna');
    expect(entry.gameNumber?.number).toBe(7);
    expect(entry.confirmedAt).toBe('2026-06-25T13:00:00Z');
  });
});
