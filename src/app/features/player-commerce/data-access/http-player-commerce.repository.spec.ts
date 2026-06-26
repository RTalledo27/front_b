import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../../../core/api/api.config';
import { HttpPlayerCommerceRepository } from './http-player-commerce.repository';

describe('HttpPlayerCommerceRepository', () => {
  let repository: HttpPlayerCommerceRepository;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        HttpPlayerCommerceRepository,
        { provide: API_BASE_URL, useValue: '/api/v1' },
      ],
    });

    repository = TestBed.inject(HttpPlayerCommerceRepository);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('sends pagination and the allow-listed order status filter', () => {
    repository.listOrders(2, 'pending').subscribe();

    const request = http.expectOne('/api/v1/me/orders?page=2&status=pending');
    expect(request.request.method).toBe('GET');
    request.flush({
      data: [],
      links: { first: null, last: null, prev: null, next: null },
      meta: {
        current_page: 2,
        from: null,
        last_page: 2,
        links: [],
        path: '/api/v1/me/orders',
        per_page: 20,
        to: null,
        total: 20,
      },
    });
  });

  it('unwraps order detail and cancellation responses', () => {
    let detailId = '';
    let cancelled = '';

    repository.getOrder('order id').subscribe((order) => (detailId = order.id));
    http.expectOne('/api/v1/me/orders/order%20id').flush({
      data: {
        id: 'order-1',
        status: 'pending',
        subtotal_cents: 500,
        total_cents: 500,
        currency: 'PEN',
        expires_at: null,
        paid_at: null,
        cancelled_at: null,
        expired_at: null,
        game: null,
        items: [],
        reservations: [],
        payment: null,
      },
    });

    repository.cancelOrder('order-1').subscribe((result) => (cancelled = result.order.status));
    const cancel = http.expectOne('/api/v1/me/orders/order-1/cancel');
    expect(cancel.request.method).toBe('POST');
    cancel.flush({
      data: {
        order: { id: 'order-1', status: 'cancelled', cancelled_at: '2026-06-22T10:00:00Z' },
        payment: null,
        released: { numbers: [], game_number_ids: [] },
      },
    });

    expect(detailId).toBe('order-1');
    expect(cancelled).toBe('cancelled');
  });

  it('uploads evidence as multipart with the real field name and idempotency key', () => {
    const file = new File(['%PDF-1.4'], 'evidence.pdf', { type: 'application/pdf' });

    repository.submitEvidence('order-1', file, 'evidence-key-12345678').subscribe();

    const request = http.expectOne('/api/v1/me/orders/order-1/payment-evidence');
    expect(request.request.method).toBe('POST');
    expect(request.request.headers.get('Idempotency-Key')).toBe('evidence-key-12345678');
    expect(request.request.headers.has('Content-Type')).toBe(false);
    expect(request.request.body).toBeInstanceOf(FormData);

    const formData = request.request.body as FormData;
    const uploadedEvidence = formData.get('evidence');
    expect(uploadedEvidence).toBeInstanceOf(File);
    expect((uploadedEvidence as File).name).toBe('evidence.pdf');
    expect((uploadedEvidence as File).type).toBe('application/pdf');
    expect([...formData.entries()]).toHaveLength(1);
    expect(formData.get('extra')).toBeNull();

    request.flush({
      data: {
        order: { id: 'order-1', status: 'payment_submitted' },
        payment: {
          id: 'payment-1',
          status: 'under_review',
          submitted_at: '2026-06-22T10:00:00Z',
        },
        document: {
          id: 'doc-1',
          original_filename: 'evidence.pdf',
          mime_type: 'application/pdf',
          size_bytes: 8,
          sha256: 'hash',
        },
      },
    });
  });

  it('surfaces backend error contracts without mutating the response', () => {
    let receivedError: HttpErrorResponse | undefined;
    const file = new File(['retry'], 'retry.pdf', { type: 'application/pdf' });

    repository.submitEvidence('order-1', file, 'same-key').subscribe({
      error: (error: HttpErrorResponse) => {
        receivedError = error;
      },
    });

    const request = http.expectOne('/api/v1/me/orders/order-1/payment-evidence');
    request.flush(
      {
        error: 'idempotency_in_progress',
        message: 'Idempotency-Key is currently in progress. Retry shortly.',
      },
      { status: 425, statusText: 'Too Early' },
    );

    expect(receivedError).toBeInstanceOf(HttpErrorResponse);
    expect(receivedError).toBeDefined();
    expect(receivedError!.status).toBe(425);
    expect(receivedError!.error.error).toBe('idempotency_in_progress');
  });

  it('surfaces a 409 idempotency mismatch without changing the original payload', () => {
    let receivedError: HttpErrorResponse | undefined;
    const file = new File(['retry'], 'retry.pdf', { type: 'application/pdf' });

    repository.submitEvidence('order-1', file, 'same-key').subscribe({
      error: (error: HttpErrorResponse) => {
        receivedError = error;
      },
    });

    const request = http.expectOne('/api/v1/me/orders/order-1/payment-evidence');
    request.flush(
      {
        error: 'idempotency_key_mismatch',
        message: 'The current payload does not match the original request.',
      },
      { status: 409, statusText: 'Conflict' },
    );

    expect(receivedError).toBeDefined();
    expect(receivedError!.status).toBe(409);
    expect(receivedError!.error.error).toBe('idempotency_key_mismatch');
  });
});
