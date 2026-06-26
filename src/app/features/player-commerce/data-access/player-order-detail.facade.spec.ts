import { computed, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Observable, of, Subject, throwError } from 'rxjs';
import { AuthSessionService } from '../../../core/auth/services/auth-session.service';
import { PLAYER_COMMERCE_REPOSITORY, PlayerCommerceRepository } from './player-commerce.repository';
import { PaymentEvidenceIdempotencyService } from './payment-evidence-idempotency.service';
import { PlayerOrderDetailFacade } from './player-order-detail.facade';
import { PlayerOrderDetailApiDto, EvidenceSubmissionApiDto } from '../models/player-commerce.models';

const orderDetail: PlayerOrderDetailApiDto = {
  id: 'order-1',
  status: 'pending',
  subtotal_cents: 500,
  total_cents: 500,
  currency: 'PEN',
  expires_at: '2026-06-26T12:00:00Z',
  paid_at: null,
  cancelled_at: null,
  expired_at: null,
  game: { id: 'game-1', slug: 'bingo-fortuna', name: 'Bingo Fortuna' },
  items: [
    {
      id: 'item-1',
      game_number_id: 'gn-1',
      unit_price_cents: 500,
      number: 7,
      number_status: 'reserved',
    },
  ],
  reservations: [],
  payment: {
    id: 'payment-1',
    status: 'pending',
    amount_cents: 500,
    currency: 'PEN',
    submitted_at: null,
    reviewed_at: null,
    rejection_reason: null,
  },
};

const evidenceSuccess: EvidenceSubmissionApiDto = {
  order: { id: 'order-1', status: 'payment_submitted' },
  payment: {
    id: 'payment-1',
    status: 'under_review',
    submitted_at: '2026-06-26T10:00:00Z',
  },
  document: {
    id: 'doc-1',
    original_filename: 'evidence.pdf',
    mime_type: 'application/pdf',
    size_bytes: 512,
    sha256: 'hash',
  },
};

class MockAuthSessionService {
  readonly currentUser = signal<null | { id: number }>(null);
  readonly isAuthenticated = computed(() => this.currentUser() !== null);

  user() {
    return this.currentUser();
  }
}

describe('PlayerOrderDetailFacade', () => {
  async function configureFacade(options?: {
    getOrder$?: Observable<PlayerOrderDetailApiDto>;
    submitEvidence$?: Observable<EvidenceSubmissionApiDto>;
  }) {
    const repository: PlayerCommerceRepository = {
      listOrders: vi.fn(),
      getOrder: vi.fn(() => options?.getOrder$ ?? of(orderDetail)),
      cancelOrder: vi.fn(),
      submitEvidence: vi.fn(() => options?.submitEvidence$ ?? of(evidenceSuccess)),
      listReservations: vi.fn(),
      listEntries: vi.fn(),
    };
    const session = new MockAuthSessionService();
    const idempotency = {
      getOrCreate: vi.fn(() => 'payment-evidence-key-123'),
      clear: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        PlayerOrderDetailFacade,
        { provide: PLAYER_COMMERCE_REPOSITORY, useValue: repository },
        { provide: AuthSessionService, useValue: session },
        { provide: PaymentEvidenceIdempotencyService, useValue: idempotency },
      ],
    });

    return {
      facade: TestBed.inject(PlayerOrderDetailFacade),
      repository,
      session,
      idempotency,
    };
  }

  async function selectValidEvidence(facade: PlayerOrderDetailFacade, file: File): Promise<void> {
    facade.selectEvidence(file);
    await vi.waitFor(() => expect(facade.evidenceStatus()).toBe('ready'));
  }

  async function settleSessionEffects(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  it('loads the order detail and enables evidence upload only for pending orders with pending payment', async () => {
    const { facade } = await configureFacade();

    facade.load('order-1');

    expect(facade.status()).toBe('loaded');
    expect(facade.order()?.id).toBe('order-1');
    expect(facade.canUploadEvidence()).toBe(true);
  });

  it('rejects unsupported files before reaching the backend', async () => {
    const { facade, repository } = await configureFacade();
    facade.load('order-1');

    facade.selectEvidence(new File(['fake'], 'proof.txt', { type: 'text/plain' }));

    expect(facade.evidenceStatus()).toBe('validationError');
    expect(facade.evidenceError()?.code).toBe('unsupported_file_type');
    expect(repository.submitEvidence).not.toHaveBeenCalled();
  });

  it('accepts a file exactly at 5 MB and rejects a file one byte above the limit', async () => {
    const { facade } = await configureFacade();
    facade.load('order-1');

    const maxFile = new File([new Uint8Array(5 * 1024 * 1024)], 'proof.pdf', {
      type: 'application/pdf',
    });
    await selectValidEvidence(facade, maxFile);
    expect(facade.selectedEvidence()?.sizeBytes).toBe(5 * 1024 * 1024);

    const oversizedFile = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'proof.pdf', {
      type: 'application/pdf',
    });
    facade.selectEvidence(oversizedFile);

    expect(facade.evidenceStatus()).toBe('validationError');
    expect(facade.evidenceError()?.code).toBe('file_too_large');
  });

  it('submits a validated file, reuses the logical idempotency key and refreshes the order after success', async () => {
    const { facade, repository, session, idempotency } = await configureFacade();
    session.currentUser.set({ id: 99 });
    await settleSessionEffects();
    facade.load('order-1');

    const file = new File(['%PDF-1.4'], 'evidence.pdf', { type: 'application/pdf' });
    await selectValidEvidence(facade, file);

    facade.submitEvidence();

    expect(idempotency.getOrCreate).toHaveBeenCalledWith({
      userId: 99,
      orderId: 'order-1',
      fingerprint: expect.any(String),
    });
    expect(repository.submitEvidence).toHaveBeenCalledWith('order-1', file, 'payment-evidence-key-123');
    expect(facade.evidenceStatus()).toBe('success');
    expect(facade.submittedEvidence()?.document.originalFilename).toBe('evidence.pdf');
    expect(facade.selectedEvidence()).toBeNull();
    expect(idempotency.clear).toHaveBeenCalled();
    expect(repository.getOrder).toHaveBeenCalledTimes(2);
  });

  it('keeps the same attempt open when the backend reports idempotency still in progress', async () => {
    const { facade, session, idempotency } = await configureFacade({
      submitEvidence$: throwError(
        () =>
          new HttpErrorResponse({
            status: 425,
            error: {
              error: 'idempotency_in_progress',
              message: 'Idempotency-Key is currently in progress. Retry shortly.',
            },
          }),
      ),
    });
    session.currentUser.set({ id: 99 });
    await settleSessionEffects();
    facade.load('order-1');
    await selectValidEvidence(
      facade,
      new File(['%PDF-1.4'], 'evidence.pdf', { type: 'application/pdf' }),
    );
    idempotency.clear.mockClear();

    facade.submitEvidence();

    expect(facade.evidenceStatus()).toBe('inProgress');
    expect(facade.selectedEvidence()?.file.name).toBe('evidence.pdf');
    expect(idempotency.clear).not.toHaveBeenCalled();
  });

  it('clears the current idempotency attempt on a definitive idempotency conflict', async () => {
    const { facade, session, idempotency } = await configureFacade({
      submitEvidence$: throwError(
        () =>
          new HttpErrorResponse({
            status: 409,
            error: {
              error: 'idempotency_key_mismatch',
              message: 'The current payload does not match the original request.',
            },
          }),
      ),
    });
    session.currentUser.set({ id: 99 });
    await settleSessionEffects();
    facade.load('order-1');
    await selectValidEvidence(
      facade,
      new File(['%PDF-1.4'], 'evidence.pdf', { type: 'application/pdf' }),
    );

    facade.submitEvidence();

    expect(facade.evidenceStatus()).toBe('idempotencyConflict');
    expect(idempotency.clear).toHaveBeenCalled();
  });

  it('refreshes the order and clears the key when the backend rejects the evidence state', async () => {
    const { facade, repository, session, idempotency } = await configureFacade({
      submitEvidence$: throwError(
        () =>
          new HttpErrorResponse({
            status: 422,
            error: {
              error: 'evidence_rejected',
              message: 'The order is no longer accepting payment evidence.',
            },
          }),
      ),
    });
    session.currentUser.set({ id: 99 });
    await settleSessionEffects();
    facade.load('order-1');
    await selectValidEvidence(
      facade,
      new File(['%PDF-1.4'], 'evidence.pdf', { type: 'application/pdf' }),
    );

    facade.submitEvidence();

    expect(facade.evidenceStatus()).toBe('evidenceRejected');
    expect(idempotency.clear).toHaveBeenCalled();
    expect(repository.getOrder).toHaveBeenCalledTimes(2);
  });

  it('preserves the selected file and key after a network failure', async () => {
    const { facade, session, idempotency } = await configureFacade({
      submitEvidence$: throwError(
        () => new HttpErrorResponse({ status: 0, error: new ProgressEvent('network') }),
      ),
    });
    session.currentUser.set({ id: 99 });
    await settleSessionEffects();
    facade.load('order-1');
    await selectValidEvidence(
      facade,
      new File(['%PDF-1.4'], 'evidence.pdf', { type: 'application/pdf' }),
    );
    idempotency.clear.mockClear();

    facade.submitEvidence();

    expect(facade.evidenceStatus()).toBe('networkError');
    expect(facade.selectedEvidence()?.file.name).toBe('evidence.pdf');
    expect(idempotency.clear).not.toHaveBeenCalled();
  });

  it('does not start a second POST when submitEvidence is called twice while the first request is still in flight', async () => {
    const pendingSubmit = new Subject<EvidenceSubmissionApiDto>();
    const { facade, repository, session } = await configureFacade({ submitEvidence$: pendingSubmit });
    session.currentUser.set({ id: 99 });
    await settleSessionEffects();
    facade.load('order-1');
    await selectValidEvidence(
      facade,
      new File(['%PDF-1.4'], 'evidence.pdf', { type: 'application/pdf' }),
    );

    facade.submitEvidence();
    facade.submitEvidence();

    expect(repository.submitEvidence).toHaveBeenCalledTimes(1);
    expect(facade.evidenceStatus()).toBe('submitting');
  });

  it('ignores a late success after the user changes to another order', async () => {
    const pendingSubmit = new Subject<EvidenceSubmissionApiDto>();
    const { facade, session } = await configureFacade({ submitEvidence$: pendingSubmit });
    session.currentUser.set({ id: 99 });
    await settleSessionEffects();
    facade.load('order-1');
    await selectValidEvidence(
      facade,
      new File(['%PDF-1.4'], 'evidence.pdf', { type: 'application/pdf' }),
    );

    facade.submitEvidence();
    facade.load('order-2');
    pendingSubmit.next(evidenceSuccess);

    expect(facade.evidenceStatus()).toBe('idle');
    expect(facade.submittedEvidence()).toBeNull();
  });

  it('ignores a late validation result after the player changes order', async () => {
    const { facade } = await configureFacade();
    facade.load('order-1');

    facade.selectEvidence(new File(['proof'], 'proof.pdf', { type: 'application/pdf' }));
    facade.load('order-2');
    await settleSessionEffects();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(facade.evidenceStatus()).toBe('idle');
    expect(facade.selectedEvidence()).toBeNull();
  });

  it('ignores a late validation result after logout', async () => {
    const { facade, session } = await configureFacade();
    session.currentUser.set({ id: 99 });
    await settleSessionEffects();
    facade.load('order-1');

    facade.selectEvidence(new File(['proof'], 'proof.pdf', { type: 'application/pdf' }));
    session.currentUser.set(null);
    await settleSessionEffects();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(facade.evidenceStatus()).toBe('idle');
    expect(facade.selectedEvidence()).toBeNull();
  });

  it('ignores a late success after logout clears the player session', async () => {
    const pendingSubmit = new Subject<EvidenceSubmissionApiDto>();
    const { facade, session } = await configureFacade({ submitEvidence$: pendingSubmit });
    session.currentUser.set({ id: 99 });
    await settleSessionEffects();
    facade.load('order-1');
    await selectValidEvidence(
      facade,
      new File(['%PDF-1.4'], 'evidence.pdf', { type: 'application/pdf' }),
    );

    facade.submitEvidence();
    session.currentUser.set(null);
    await settleSessionEffects();
    expect(facade.evidenceStatus()).toBe('idle');
    pendingSubmit.next(evidenceSuccess);

    expect(facade.evidenceStatus()).toBe('idle');
    expect(facade.submittedEvidence()).toBeNull();
    expect(facade.selectedEvidence()).toBeNull();
  });

  it('ignores a late success if the user changed the selected file while the original submit was in flight', async () => {
    const pendingSubmit = new Subject<EvidenceSubmissionApiDto>();
    const { facade, session } = await configureFacade({ submitEvidence$: pendingSubmit });
    session.currentUser.set({ id: 99 });
    await settleSessionEffects();
    facade.load('order-1');
    await selectValidEvidence(
      facade,
      new File(['first'], 'first.pdf', { type: 'application/pdf' }),
    );

    facade.submitEvidence();
    await selectValidEvidence(
      facade,
      new File(['second'], 'second.pdf', { type: 'application/pdf' }),
    );
    pendingSubmit.next(evidenceSuccess);

    expect(facade.evidenceStatus()).toBe('ready');
    expect(facade.selectedEvidence()?.file.name).toBe('second.pdf');
    expect(facade.submittedEvidence()).toBeNull();
  });
});
