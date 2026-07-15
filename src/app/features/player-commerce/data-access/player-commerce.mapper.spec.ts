import {
  isPlayerCommerceInvalidPayloadError,
  mapPlayerEntriesResponse,
  mapPlayerEntry,
  mapPlayerOrdersResponse,
  mapPlayerOrderDetail,
  mapPlayerOrderSummary,
  mapPlayerReservationsResponse,
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
    expect(entry.liveProgress).toBeNull();
  });

  it('maps nullable live progress fields and ignores additive backend fields', () => {
    const entry = mapPlayerEntry({
      id: 'entry-1',
      game_id: 'game-1',
      game_number_id: 'gn-7',
      status: 'confirmed',
      confirmed_at: null,
      game: { id: 'game-1', slug: 'bingo-fortuna', name: 'Bingo Fortuna' },
      game_number: { id: 'gn-7', number: 7, status: 'sold' },
      live_progress: {
        entry_id: 'entry-1',
        game_id: 'game-1',
        game_status: 'running',
        game_number: 7,
        hits_current: 0,
        hits_required: null,
        latest_draw_number: null,
        latest_draw_sequence: null,
        is_winner: false,
        completed_at: null,
        won_at: null,
        future_additive_field: 'ignored',
      },
      future_entry_field: { safely: 'ignored' },
    });

    expect(entry.confirmedAt).toBeNull();
    expect(entry.liveProgress).toEqual({
      entryId: 'entry-1',
      gameId: 'game-1',
      gameStatus: 'running',
      gameNumber: 7,
      hitsCurrent: 0,
      hitsRequired: null,
      latestDrawNumber: null,
      latestDrawSequence: null,
      isWinner: false,
      completedAt: null,
      wonAt: null,
    });
  });

  it('maps the paginated orders response using the real Laravel meta shape', () => {
    const result = mapPlayerOrdersResponse({
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
    });

    expect(result.orders).toHaveLength(1);
    expect(result.pageInfo.currentPage).toBe(1);
    expect(result.pageInfo.total).toBe(1);
  });

  it('rejects incomplete list payloads safely', () => {
    try {
      mapPlayerOrdersResponse({
        data: [{ id: 'order-1', status: 'pending' }],
        meta: { current_page: 1 },
      });
    } catch (error) {
      expect(isPlayerCommerceInvalidPayloadError(error)).toBe(true);
      return;
    }

    throw new Error('Expected player commerce mapper to reject the payload');
  });

  it('rejects incomplete detail payloads safely', () => {
    try {
      mapPlayerOrderDetail({
        id: 'order-1',
        status: 'pending',
        items: [],
      });
    } catch (error) {
      expect(isPlayerCommerceInvalidPayloadError(error)).toBe(true);
      return;
    }

    throw new Error('Expected player commerce detail mapper to reject the payload');
  });

  it('rejects invalid reservations and entries collection payloads safely', () => {
    expect(() => mapPlayerReservationsResponse({ data: {} })).toThrow();
    expect(() => mapPlayerEntriesResponse({ data: {} })).toThrow();
  });
});
