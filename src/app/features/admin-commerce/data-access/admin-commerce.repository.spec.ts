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
});