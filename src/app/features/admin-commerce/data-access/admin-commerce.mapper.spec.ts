import {
  isAdminCommerceInvalidPayloadError,
  mapAdminRefundResponse,
  mapAdminWinnerPayoutResponse,
} from './admin-commerce.mapper';

describe('admin-commerce mapper', () => {
  it('maps refund resources defensively', () => {
    const refund = mapAdminRefundResponse({
      data: {
        id: 'refund-1',
        order_id: 'order-1',
        payment_id: 'payment-1',
        game_id: 'game-1',
        amount_cents: 5000,
        currency: 'PEN',
        reason: 'Refund total por cierre definitivo.',
        processed_by_user_id: 9,
        processed_at: '2026-07-03T13:00:00Z',
        created_at: '2026-07-03T13:00:00Z',
        entries: { ids: ['entry-1', 'entry-2'], count: 2 },
        numbers: [1, 2],
        game_number_ids: ['number-1', 'number-2'],
        was_already_refunded: false,
      },
    });

    expect(refund.orderId).toBe('order-1');
    expect(refund.entryCount).toBe(2);
    expect(refund.numbers).toEqual([1, 2]);
  });

  it('maps winner payout resources defensively', () => {
    const payout = mapAdminWinnerPayoutResponse({
      data: {
        id: 'payout-1',
        game_id: 'game-1',
        game_winner_id: 'winner-1',
        user_id: 42,
        amount_cents: 50000,
        currency: 'PEN',
        method: 'manual',
        external_reference: 'OP-777',
        notes: null,
        processed_by_user_id: 1,
        processed_at: '2026-07-03T13:00:00Z',
        created_at: '2026-07-03T13:00:00Z',
        document: {
          id: 'doc-1',
          original_filename: 'comprobante.pdf',
          mime_type: 'application/pdf',
          size_bytes: 1024,
          created_at: '2026-07-03T13:00:00Z',
        },
        was_already_processed: true,
      },
    });

    expect(payout.document.originalFilename).toBe('comprobante.pdf');
    expect(payout.wasAlreadyProcessed).toBe(true);
  });

  it('rejects incomplete payloads', () => {
    let thrown: unknown = null;

    try {
      mapAdminRefundResponse({
        data: {
          id: 'refund-1',
          order_id: 'order-1',
          payment_id: 'payment-1',
          game_id: 'game-1',
          amount_cents: 5000,
          currency: 'PEN',
          reason: 'Refund total por cierre definitivo.',
          processed_by_user_id: 9,
          processed_at: 'fecha-invalida',
          created_at: '2026-07-03T13:00:00Z',
          entries: { ids: ['entry-1'], count: 1 },
          numbers: [1],
          game_number_ids: ['number-1'],
          was_already_refunded: false,
        },
      });
    } catch (error) {
      thrown = error;
    }

    expect(isAdminCommerceInvalidPayloadError(thrown)).toBe(true);
  });
});
