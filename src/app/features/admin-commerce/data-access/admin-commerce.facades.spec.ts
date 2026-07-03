import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import {
  AdminOrderRefundFacade,
  AdminWinnerPayoutFacade,
} from './admin-commerce.facades';
import { ADMIN_COMMERCE_REPOSITORY } from './admin-commerce.repository';
import { AuthSessionService } from '../../../core/auth/services/auth-session.service';

function createRefundView() {
  return {
    id: 'refund-1',
    orderId: 'order-1',
    paymentId: 'payment-1',
    gameId: 'game-1',
    amountCents: 5000,
    currency: 'PEN',
    reason: 'Refund total por cierre definitivo.',
    processedByUserId: 1,
    processedAt: '2026-07-03T13:00:00Z',
    createdAt: '2026-07-03T13:00:00Z',
    entryIds: ['entry-1'],
    entryCount: 1,
    numbers: [8],
    gameNumberIds: ['number-1'],
    wasAlreadyRefunded: false,
  } as const;
}

function createPayoutView() {
  return {
    id: 'payout-1',
    gameId: 'game-1',
    gameWinnerId: 'winner-1',
    userId: 25,
    amountCents: 50000,
    currency: 'PEN',
    method: 'manual',
    externalReference: 'OP-777',
    notes: 'Transferencia lista',
    processedByUserId: 1,
    processedAt: '2026-07-03T13:00:00Z',
    createdAt: '2026-07-03T13:00:00Z',
    document: {
      id: 'doc-1',
      originalFilename: 'comprobante.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 100,
      createdAt: '2026-07-03T13:00:00Z',
    },
    wasAlreadyProcessed: false,
  } as const;
}

describe('admin-commerce facades', () => {
  function setup() {
    const repository = {
      listOrders: vi.fn(),
      listPayments: vi.fn(),
      getPayment: vi.fn(),
      approvePayment: vi.fn(),
      rejectPayment: vi.fn(),
      refundOrder: vi.fn(),
      getOrderRefund: vi.fn(),
      processWinnerPayout: vi.fn(),
      getWinnerPayout: vi.fn(),
    };
    const session = {
      user: signal<{ id: number } | null>({ id: 1 }),
    };

    TestBed.configureTestingModule({
      providers: [
        AdminOrderRefundFacade,
        AdminWinnerPayoutFacade,
        { provide: ADMIN_COMMERCE_REPOSITORY, useValue: repository },
        { provide: AuthSessionService, useValue: session },
      ],
    });

    return {
      repository,
      session,
      refundFacade: TestBed.inject(AdminOrderRefundFacade),
      payoutFacade: TestBed.inject(AdminWinnerPayoutFacade),
    };
  }

  it('processes refund success and confirms the refreshed snapshot', () => {
    const { repository, refundFacade } = setup();
    repository.refundOrder.mockReturnValue(of(createRefundView()));
    repository.getOrderRefund.mockReturnValue(of({ ...createRefundView(), wasAlreadyRefunded: true }));

    refundFacade.setContext('order-1');
    refundFacade.refundOrder({ reason: 'Refund total por cierre definitivo.' });

    expect(repository.refundOrder).toHaveBeenCalledTimes(1);
    expect(repository.getOrderRefund).toHaveBeenCalledTimes(1);
    expect(refundFacade.commandState().status).toBe('success');
    expect(refundFacade.commandState().refreshState).toBe('confirmed');
    expect(refundFacade.refund()?.wasAlreadyRefunded).toBe(true);
  });

  it('blocks double submit and retains the same refund command on network error', () => {
    const { repository, refundFacade } = setup();
    const pending$ = new Subject<ReturnType<typeof createRefundView>>();
    repository.refundOrder.mockReturnValue(pending$);

    refundFacade.setContext('order-1');
    refundFacade.refundOrder({ reason: 'Refund total por cierre definitivo.' });
    refundFacade.refundOrder({ reason: 'Refund total por cierre definitivo.' });

    expect(repository.refundOrder).toHaveBeenCalledTimes(1);

    pending$.error(new HttpErrorResponse({ status: 0, error: { message: 'offline' } }));
    expect(refundFacade.commandState().status).toBe('networkError');

    repository.refundOrder.mockReturnValue(of(createRefundView()));
    repository.getOrderRefund.mockReturnValue(of(createRefundView()));
    refundFacade.refundOrder({ reason: 'Refund total por cierre definitivo.' });

    expect(repository.refundOrder).toHaveBeenCalledTimes(2);
    expect(repository.refundOrder.mock.calls[0][2]).toBe(repository.refundOrder.mock.calls[1][2]);
  });

  it('ignores late refund responses after context changes', () => {
    const { repository, refundFacade } = setup();
    const pending$ = new Subject<ReturnType<typeof createRefundView>>();
    repository.refundOrder.mockReturnValue(pending$);

    refundFacade.setContext('order-1');
    refundFacade.refundOrder({ reason: 'Refund total por cierre definitivo.' });
    refundFacade.setContext('order-2');

    pending$.next(createRefundView());

    expect(refundFacade.refund()).toBeNull();
    expect(refundFacade.commandState().status).toBe('idle');
  });

  it('ignores late payout responses after logout', () => {
    const { repository, payoutFacade, session } = setup();
    const pending$ = new Subject<ReturnType<typeof createPayoutView>>();
    repository.processWinnerPayout.mockReturnValue(pending$);

    payoutFacade.setContext('game-1');
    payoutFacade.processPayout({
      externalReference: 'OP-777',
      notes: 'Transferencia lista',
      document: new File(['a'], 'comprobante.pdf', { type: 'application/pdf' }),
    });

    session.user.set(null);
    TestBed.flushEffects();
    pending$.next(createPayoutView());

    expect(payoutFacade.payout()).toBeNull();
    expect(payoutFacade.commandState().status).toBe('idle');
  });

  it('maps payout invalid state and keeps existing snapshot when refresh fails', () => {
    const { repository, payoutFacade } = setup();
    repository.processWinnerPayout.mockReturnValue(of(createPayoutView()));
    repository.getWinnerPayout.mockReturnValue(
      throwError(() =>
        new HttpErrorResponse({
          status: 422,
          error: { error: 'payout_not_processable', reason: 'game_not_completed', message: 'No procesable.' },
        }),
      ),
    );

    payoutFacade.setContext('game-1');
    payoutFacade.processPayout({
      externalReference: 'OP-777',
      notes: 'Transferencia lista',
      document: new File(['a'], 'comprobante.pdf', { type: 'application/pdf' }),
    });

    expect(payoutFacade.commandState().status).toBe('success');
    expect(payoutFacade.commandState().refreshState).toBe('failed');
    expect(payoutFacade.payout()?.id).toBe('payout-1');
  });

  it('maps backend payout conflicts to conflict state', () => {
    const { repository, payoutFacade } = setup();
    repository.processWinnerPayout.mockReturnValue(
      throwError(() =>
        new HttpErrorResponse({
          status: 409,
          error: { error: 'idempotency_key_mismatch', message: 'Conflicto idempotente.' },
        }),
      ),
    );

    payoutFacade.setContext('game-1');
    payoutFacade.processPayout({
      externalReference: 'OP-777',
      notes: null,
      document: new File(['a'], 'comprobante.pdf', { type: 'application/pdf' }),
    });

    expect(payoutFacade.commandState().status).toBe('conflict');
    expect(payoutFacade.commandState().errorCode).toBe('idempotency_key_mismatch');
  });
});
