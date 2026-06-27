import { describe, expect, it } from 'vitest';
import {
  isAdminGamesInvalidPayloadError,
  mapAdminGameDetail,
  mapAdminGameListResponse,
  mapAdminGameSummary,
} from './admin-games.mapper';

describe('admin-games mappers', () => {
  it('maps a valid summary payload with nullable dates and known status', () => {
    const summary = mapAdminGameSummary({
      id: 'game-1',
      slug: 'bingo-fortuna',
      name: 'Bingo Fortuna',
      description: null,
      status: 'sales_open',
      number_range: { min: 1, max: 90, hits_required: 5 },
      ticket_price: { amount_cents: 500, currency: 'PEN' },
      prize: { amount_cents: 100000, currency: 'PEN' },
      schedule: {
        sales_opens_at: null,
        sales_closes_at: '2026-06-25T10:00:00Z',
        scheduled_start_at: null,
        draw_interval_seconds: 30,
        auto_draw_enabled: false,
      },
      lifecycle: { started_at: null, paused_at: null, completed_at: null },
      numbers: { total: 90, sold: 12, reserved: 5, available: 73 },
      ops: { draws_total: 0, orders_pending: 3, payments_under_review: 2, entries_confirmed: 10 },
      created_by: null,
      created_at: '2026-06-25T09:00:00Z',
    });

    expect(summary.status.label).toBe('Ventas abiertas');
    expect(summary.schedule.salesOpensAt).toBeNull();
    expect(summary.ticketPrice.amountCents).toBe(500);
    expect(summary.ops.ordersPending).toBe(3);
  });

  it('maps an unknown status to a neutral presentation without failing', () => {
    const summary = mapAdminGameSummary({
      id: 'game-2',
      slug: 'mystery-game',
      name: 'Mystery Game',
      description: 'Unknown status',
      status: 'frozen',
      number_range: { min: 1, max: 20, hits_required: 3 },
      ticket_price: { amount_cents: 100, currency: 'PEN' },
      prize: { amount_cents: 1000, currency: 'PEN' },
      schedule: {
        sales_opens_at: null,
        sales_closes_at: null,
        scheduled_start_at: null,
        draw_interval_seconds: 10,
        auto_draw_enabled: true,
      },
      lifecycle: { started_at: null, paused_at: null, completed_at: null },
      numbers: { total: 20, sold: 0, reserved: 0, available: 20 },
      ops: { draws_total: 0, orders_pending: 0, payments_under_review: 0, entries_confirmed: 0 },
      created_by: 1,
      created_at: '2026-06-25T09:00:00Z',
    });

    expect(summary.status.isKnown).toBe(false);
    expect(summary.status.tone).toBe('neutral');
    expect(summary.status.label).toContain('Estado no reconocido');
  });

  it('maps a valid detail payload with detail-only fields', () => {
    const detail = mapAdminGameDetail({
      id: 'game-3',
      slug: 'detail-game',
      name: 'Detail Game',
      description: null,
      status: 'paused',
      number_range: { min: 1, max: 30, hits_required: 4 },
      ticket_price: { amount_cents: 500, currency: 'PEN' },
      prize: { amount_cents: 15000, currency: 'PEN' },
      schedule: {
        sales_opens_at: '2026-06-20T10:00:00Z',
        sales_closes_at: '2026-06-21T10:00:00Z',
        scheduled_start_at: '2026-06-21T12:00:00Z',
        draw_interval_seconds: 20,
        auto_draw_enabled: true,
      },
      lifecycle: {
        started_at: '2026-06-21T12:00:00Z',
        paused_at: '2026-06-21T12:30:00Z',
        completed_at: null,
      },
      engine: {
        next_draw_at: '2026-06-21T12:31:00Z',
        last_consumed_tick_at: '2026-06-21T12:30:59Z',
      },
      numbers: { total: 30, sold: 10, reserved: 5, available: 15 },
      settings: { mode: 'safe' },
      latest_draw: { sequence: 6, number: 18, drawn_at: '2026-06-21T12:30:00Z' },
      winner: null,
      commerce: {
        reservations: { total: 5 },
        orders: {
          pending: 1,
          payment_submitted: 1,
          paid: 2,
          rejected: 0,
          expired: 0,
          cancelled: 0,
          refunded: 0,
        },
        payments: {
          pending: 0,
          under_review: 1,
          approved: 2,
          rejected: 0,
          cancelled: 0,
          refunded: 0,
        },
        entries: {
          confirmed: 2,
          cancelled: 0,
          refunded: 0,
          winner: 0,
        },
      },
      projection: {
        draws_total: 6,
        distinct_drawn_numbers: 6,
        max_counter_hits: 1,
        last_drawn_number: 18,
      },
      created_by: 2,
      created_at: '2026-06-19T10:00:00Z',
    });

    expect(detail.engine.nextDrawAt).toBe('2026-06-21T12:31:00Z');
    expect(detail.latestDraw?.number).toBe(18);
    expect(detail.commerce.orders.paymentSubmitted).toBe(1);
    expect(detail.projection.distinctDrawnNumbers).toBe(6);
  });

  it('maps the paginated list envelope with real links and metadata', () => {
    const response = mapAdminGameListResponse({
      data: [
        {
          id: 'game-4',
          slug: 'envelope-game',
          name: 'Envelope Game',
          description: null,
          status: 'draft',
          number_range: { min: 1, max: 50, hits_required: 5 },
          ticket_price: { amount_cents: 100, currency: 'PEN' },
          prize: { amount_cents: 5000, currency: 'PEN' },
          schedule: {
            sales_opens_at: null,
            sales_closes_at: null,
            scheduled_start_at: null,
            draw_interval_seconds: 20,
            auto_draw_enabled: false,
          },
          lifecycle: { started_at: null, paused_at: null, completed_at: null },
          numbers: { total: 50, sold: 0, reserved: 0, available: 50 },
          ops: { draws_total: 0, orders_pending: 0, payments_under_review: 0, entries_confirmed: 0 },
          created_by: null,
          created_at: '2026-06-25T09:00:00Z',
        },
      ],
      links: { first: '/?page=1', last: '/?page=2', prev: null, next: '/?page=2' },
      meta: {
        current_page: 1,
        from: 1,
        last_page: 2,
        links: [],
        path: '/api/v1/admin/games',
        per_page: 20,
        to: 1,
        total: 21,
      },
    });

    expect(response.pageInfo.currentPage).toBe(1);
    expect(response.links.next).toBe('/?page=2');
    expect(response.games).toHaveLength(1);
  });

  it('rejects incomplete payloads safely', () => {
    try {
      mapAdminGameSummary({
        id: 'broken-game',
        slug: 'broken',
      });
    } catch (error: unknown) {
      expect(isAdminGamesInvalidPayloadError(error)).toBe(true);
      return;
    }

    throw new Error('Expected mapper to reject the payload');
  });

  it('rejects invalid date strings instead of passing them through to the UI', () => {
    expect(() =>
      mapAdminGameSummary({
        id: 'broken-date',
        slug: 'broken-date',
        name: 'Broken Date',
        description: null,
        status: 'draft',
        number_range: { min: 1, max: 20, hits_required: 3 },
        ticket_price: { amount_cents: 100, currency: 'PEN' },
        prize: { amount_cents: 1000, currency: 'PEN' },
        schedule: {
          sales_opens_at: 'not-a-date',
          sales_closes_at: null,
          scheduled_start_at: null,
          draw_interval_seconds: 10,
          auto_draw_enabled: false,
        },
        lifecycle: { started_at: null, paused_at: null, completed_at: null },
        numbers: { total: 20, sold: 0, reserved: 0, available: 20 },
        ops: { draws_total: 0, orders_pending: 0, payments_under_review: 0, entries_confirmed: 0 },
        created_by: null,
        created_at: '2026-06-25T09:00:00Z',
      }),
    ).toThrowError(/invalid_admin_games_payload/);
  });
});
