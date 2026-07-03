import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../../../core/api/api.config';
import { HttpAdminCommerceRepository } from './admin-commerce.repository';

describe('HttpAdminCommerceRepository', () => {
  let repository: HttpAdminCommerceRepository;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        HttpAdminCommerceRepository,
        { provide: API_BASE_URL, useValue: '/api/v1' },
      ],
    });
    repository = TestBed.inject(HttpAdminCommerceRepository);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('sends order pagination, status and game filters', () => {
    repository.listOrders(3, 'paid', 'game-1').subscribe();
    const request = http.expectOne('/api/v1/admin/orders?page=3&status=paid&game_id=game-1');
    expect(request.request.method).toBe('GET');
    request.flush({ data: [], links: { first: null, last: null, prev: null, next: null }, meta: { current_page: 3, from: null, last_page: 3, links: [], path: '/api/v1/admin/orders', per_page: 20, to: null, total: 0 } });
  });

  it('unwraps payment detail responses', () => {
    let paymentId = '';
    repository.getPayment('payment id').subscribe((payment) => paymentId = payment.id);
    http.expectOne('/api/v1/admin/payments/payment%20id').flush({ data: { id: 'payment-1', order_id: 'order-1', amount_cents: 1000, currency: 'PEN', method: 'bank_transfer', status: 'under_review', submitted_at: null, reviewed_at: null, reviewed_by: null, rejection_reason: null, reviewer: null, order: { id: 'order-1', status: 'payment_submitted', subtotal_cents: 1000, total_cents: 1000, currency: 'PEN', expires_at: null, paid_at: null, created_at: null, user: null, game: null, items: [] }, documents: [] } });
    expect(paymentId).toBe('payment-1');
  });

  it('sends approval and rejection commands with their idempotency keys', () => {
    repository.approvePayment('payment-1', 'Validado', 'approve-key-12345678').subscribe();
    const approve = http.expectOne('/api/v1/admin/payments/payment-1/approve');
    expect(approve.request.method).toBe('POST');
    expect(approve.request.body).toEqual({ notes: 'Validado' });
    expect(approve.request.headers.get('Idempotency-Key')).toBe('approve-key-12345678');
    approve.flush({ data: { payment: { id: 'payment-1', status: 'approved', reviewed_at: null }, order: { id: 'order-1', status: 'paid' } } });

    repository.rejectPayment('payment-2', 'Comprobante ilegible', 'reject-key-12345678').subscribe();
    const reject = http.expectOne('/api/v1/admin/payments/payment-2/reject');
    expect(reject.request.method).toBe('POST');
    expect(reject.request.body).toEqual({ reason: 'Comprobante ilegible' });
    expect(reject.request.headers.get('Idempotency-Key')).toBe('reject-key-12345678');
    reject.flush({ data: { payment: { id: 'payment-2', status: 'rejected', reviewed_at: null }, order: { id: 'order-2', status: 'rejected' } } });
  });

  it('sends refund commands with the exact backend body and idempotency key', () => {
    let refundId = '';
    repository.refundOrder('order-1', { reason: 'El sorteo se canceló y corresponde refund total.' }, 'refund-key-12345678')
      .subscribe((refund) => refundId = refund.id);

    const request = http.expectOne('/api/v1/admin/orders/order-1/refund');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ reason: 'El sorteo se canceló y corresponde refund total.' });
    expect(request.request.headers.get('Idempotency-Key')).toBe('refund-key-12345678');
    request.flush({
      data: {
        id: 'refund-1',
        order_id: 'order-1',
        payment_id: 'payment-1',
        game_id: 'game-1',
        amount_cents: 5000,
        currency: 'PEN',
        reason: 'El sorteo se canceló y corresponde refund total.',
        processed_by_user_id: 7,
        processed_at: '2026-07-03T13:00:00Z',
        created_at: '2026-07-03T13:00:00Z',
        entries: { ids: ['entry-1'], count: 1 },
        numbers: [5],
        game_number_ids: ['number-1'],
        was_already_refunded: false,
      },
    });

    expect(refundId).toBe('refund-1');
  });

  it('loads persisted refunds through the show endpoint', () => {
    let amount = 0;
    repository.getOrderRefund('order-1').subscribe((refund) => amount = refund.amountCents);

    const request = http.expectOne('/api/v1/admin/orders/order-1/refund');
    expect(request.request.method).toBe('GET');
    request.flush({
      data: {
        id: 'refund-1',
        order_id: 'order-1',
        payment_id: 'payment-1',
        game_id: 'game-1',
        amount_cents: 5000,
        currency: 'PEN',
        reason: 'Refund confirmado',
        processed_by_user_id: 7,
        processed_at: '2026-07-03T13:00:00Z',
        created_at: '2026-07-03T13:00:00Z',
        entries: { ids: ['entry-1'], count: 1 },
        numbers: [5],
        game_number_ids: ['number-1'],
        was_already_refunded: true,
      },
    });

    expect(amount).toBe(5000);
  });

  it('sends winner payout as multipart form data with its idempotency key', () => {
    const file = new File(['pdf-content'], 'comprobante.pdf', { type: 'application/pdf' });
    let payoutId = '';

    repository.processWinnerPayout('game-1', {
      externalReference: 'OP-777',
      notes: 'Transferencia validada',
      document: file,
    }, 'payout-key-12345678').subscribe((payout) => payoutId = payout.id);

    const request = http.expectOne('/api/v1/admin/games/game-1/winner/payout');
    expect(request.request.method).toBe('POST');
    expect(request.request.headers.get('Idempotency-Key')).toBe('payout-key-12345678');
    expect(request.request.body instanceof FormData).toBe(true);
    const formData = request.request.body as FormData;
    expect(formData.get('external_reference')).toBe('OP-777');
    expect(formData.get('notes')).toBe('Transferencia validada');
    expect(formData.get('document')).toBe(file);
    request.flush({
      data: {
        id: 'payout-1',
        game_id: 'game-1',
        game_winner_id: 'winner-1',
        user_id: 15,
        amount_cents: 50000,
        currency: 'PEN',
        method: 'manual',
        external_reference: 'OP-777',
        notes: 'Transferencia validada',
        processed_by_user_id: 1,
        processed_at: '2026-07-03T13:00:00Z',
        created_at: '2026-07-03T13:00:00Z',
        document: {
          id: 'doc-1',
          original_filename: 'comprobante.pdf',
          mime_type: 'application/pdf',
          size_bytes: 1200,
          created_at: '2026-07-03T13:00:00Z',
        },
        was_already_processed: false,
      },
    });

    expect(payoutId).toBe('payout-1');
  });

  it('loads existing winner payout through the show endpoint', () => {
    let reference = '';
    repository.getWinnerPayout('game-1').subscribe((payout) => reference = payout.externalReference);

    const request = http.expectOne('/api/v1/admin/games/game-1/winner/payout');
    expect(request.request.method).toBe('GET');
    request.flush({
      data: {
        id: 'payout-1',
        game_id: 'game-1',
        game_winner_id: 'winner-1',
        user_id: 15,
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
          size_bytes: 1200,
          created_at: '2026-07-03T13:00:00Z',
        },
        was_already_processed: true,
      },
    });

    expect(reference).toBe('OP-777');
  });
});
