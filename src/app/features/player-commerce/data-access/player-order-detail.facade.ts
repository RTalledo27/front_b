import { DestroyRef, computed, effect, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiError, toApiError } from '../../../core/api/models/api-error.models';
import { AuthSessionService } from '../../../core/auth/services/auth-session.service';
import { map } from 'rxjs';
import { PaymentEvidenceIdempotencyService } from './payment-evidence-idempotency.service';
import { PLAYER_COMMERCE_REPOSITORY } from './player-commerce.repository';
import { PlayerCommerceViewStatus, PlayerOrderDetailView } from '../models/player-commerce-view.models';
import {
  PAYMENT_EVIDENCE_ALLOWED_MIME_TYPES,
  PAYMENT_EVIDENCE_MAX_SIZE_BYTES,
  PaymentEvidenceFlowStatus,
  PaymentEvidenceSelection,
  PaymentEvidenceSuccessView,
} from '../models/player-payment-evidence.models';
import { mapPlayerOrderDetail, resolvePlayerCommerceError } from './player-commerce.mapper';

@Injectable()
export class PlayerOrderDetailFacade {
  private readonly repository = inject(PLAYER_COMMERCE_REPOSITORY);
  private readonly session = inject(AuthSessionService);
  private readonly idempotency = inject(PaymentEvidenceIdempotencyService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly activeOrderId = signal<string | null>(null);
  private loadSequence = 0;
  private validationSequence = 0;
  private submitSequence = 0;
  private lastUserId: number | null = null;
  private destroyed = false;

  readonly order = signal<PlayerOrderDetailView | null>(null);
  readonly status = signal<PlayerCommerceViewStatus>('idle');
  readonly error = signal<ApiError | null>(null);

  readonly selectedEvidence = signal<PaymentEvidenceSelection | null>(null);
  readonly evidenceStatus = signal<PaymentEvidenceFlowStatus>('idle');
  readonly evidenceError = signal<ApiError | null>(null);
  readonly submittedEvidence = signal<PaymentEvidenceSuccessView | null>(null);

  readonly canUploadEvidence = computed(() => {
    const order = this.order();
    return (
      this.submittedEvidence() === null &&
      order?.status === 'pending' &&
      order.payment?.status === 'pending'
    );
  });

  readonly isEvidenceBusy = computed(() => {
    const status = this.evidenceStatus();
    return status === 'validating' || status === 'submitting';
  });

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.destroyed = true;
      this.validationSequence += 1;
      this.submitSequence += 1;
    });

    effect(() => {
      const userId = this.session.user()?.id ?? null;
      if (userId !== this.lastUserId) {
        this.lastUserId = userId;
        this.clearSelectedEvidence();
      }
    });
  }

  load(orderId: string): void {
    this.activeOrderId.set(orderId);
    this.loadOrder(orderId, { resetOrder: true, resetEvidence: true });
  }

  retryLoad(): void {
    const orderId = this.activeOrderId();
    if (orderId !== null) {
      this.loadOrder(orderId, { resetOrder: true, resetEvidence: false });
    }
  }

  clearSelectedEvidence(): void {
    this.validationSequence += 1;
    this.selectedEvidence.set(null);
    this.submittedEvidence.set(null);
    this.evidenceError.set(null);
    this.evidenceStatus.set('idle');
    this.idempotency.clear();
  }

  selectEvidence(file: File | null): void {
    this.validationSequence += 1;
    const validationToken = this.validationSequence;
    this.submittedEvidence.set(null);
    this.evidenceError.set(null);

    if (file === null) {
      this.clearSelectedEvidence();
      return;
    }

    const clientError = validateEvidenceFile(file);
    if (clientError !== null) {
      this.selectedEvidence.set(null);
      this.evidenceError.set(clientError);
      this.evidenceStatus.set('validationError');
      this.idempotency.clear();
      return;
    }

    this.evidenceStatus.set('validating');

    void this.createEvidenceSelection(file)
      .then((selection) => {
        if (!this.isValidationCurrent(validationToken)) {
          return;
        }

        this.selectedEvidence.set(selection);
        this.evidenceError.set(null);
        this.evidenceStatus.set('ready');
      })
      .catch((error: unknown) => {
        if (!this.isValidationCurrent(validationToken)) {
          return;
        }

        this.selectedEvidence.set(null);
        this.evidenceError.set(toApiError(error));
        this.evidenceStatus.set('unexpectedError');
        this.idempotency.clear();
      });
  }

  submitEvidence(): void {
    const order = this.order();
    const selectedEvidence = this.selectedEvidence();
    const userId = this.session.user()?.id ?? null;

    if (
      this.isEvidenceBusy() ||
      order === null ||
      selectedEvidence === null ||
      userId === null ||
      !this.canUploadEvidence()
    ) {
      return;
    }

    const submitContext = {
      orderId: order.id,
      userId,
      fingerprint: selectedEvidence.fingerprint,
      sequence: ++this.submitSequence,
    };
    const idempotencyKey = this.idempotency.getOrCreate({
      userId,
      orderId: submitContext.orderId,
      fingerprint: submitContext.fingerprint,
    });

    this.evidenceError.set(null);
    this.evidenceStatus.set('submitting');

    this.repository
      .submitEvidence(order.id, selectedEvidence.file, idempotencyKey)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          if (!this.isSubmitContextCurrent(submitContext)) {
            return;
          }

          this.submittedEvidence.set({
            orderId: result.order.id,
            paymentId: result.payment.id,
            paymentStatus: result.payment.status,
            submittedAt: result.payment.submitted_at,
            document: {
              originalFilename: result.document.original_filename,
              mimeType: result.document.mime_type,
              sizeBytes: result.document.size_bytes,
            },
          });
          this.selectedEvidence.set(null);
          this.evidenceError.set(null);
          this.evidenceStatus.set('success');
          this.idempotency.clear();
          this.refreshOrder(order.id);
        },
        error: (error: unknown) => {
          if (!this.isSubmitContextCurrent(submitContext)) {
            return;
          }

          const apiError = toApiError(error);
          this.evidenceError.set(apiError);
          this.evidenceStatus.set(resolveEvidenceStatus(apiError));

          if (shouldClearEvidenceKey(apiError)) {
            this.idempotency.clear();
          }

          if (shouldRefreshOrderAfterFailure(apiError)) {
            this.refreshOrder(order.id);
          }
        },
      });
  }

  private loadOrder(
    orderId: string,
    options: { resetOrder: boolean; resetEvidence: boolean; background?: boolean },
  ): void {
    const sequence = ++this.loadSequence;

    if (!options.background) {
      this.status.set('loading');
      this.error.set(null);
    }

    if (options.resetOrder) {
      this.order.set(null);
    }

    if (options.resetEvidence) {
      this.clearSelectedEvidence();
    }

    this.repository
      .getOrder(orderId)
      .pipe(
        map((order) => mapPlayerOrderDetail(order)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (order) => {
          if (!this.isLoadCurrent(sequence, orderId)) {
            return;
          }

          this.order.set(order);
          this.status.set('loaded');
          this.error.set(null);
        },
        error: (error: unknown) => {
          if (!this.isLoadCurrent(sequence, orderId)) {
            return;
          }

          if (options.background) {
            return;
          }

          const apiError = resolvePlayerCommerceError(error);
          this.error.set(apiError);
          this.status.set(resolveReadStatus(apiError.status));
        },
      });
  }

  private refreshOrder(orderId: string): void {
    if (this.activeOrderId() !== orderId) {
      return;
    }

    this.loadOrder(orderId, { resetOrder: false, resetEvidence: false, background: true });
  }

  private isLoadCurrent(sequence: number, orderId: string): boolean {
    return sequence === this.loadSequence && this.activeOrderId() === orderId;
  }

  private isValidationCurrent(sequence: number): boolean {
    return !this.destroyed && sequence === this.validationSequence;
  }

  private isSubmitContextCurrent(context: {
    sequence: number;
    orderId: string;
    userId: number;
    fingerprint: string;
  }): boolean {
    if (context.sequence !== this.submitSequence) {
      return false;
    }

    if (this.activeOrderId() !== context.orderId) {
      return false;
    }

    const currentUserId = this.session.user()?.id ?? null;
    if (currentUserId !== context.userId) {
      return false;
    }

    const selectedEvidence = this.selectedEvidence();
    return selectedEvidence === null || selectedEvidence.fingerprint === context.fingerprint;
  }

  private async createEvidenceSelection(file: File): Promise<PaymentEvidenceSelection> {
    return {
      file,
      fingerprint: await createEvidenceFingerprint(file),
      sizeBytes: file.size,
      mimeType: file.type,
    };
  }
}

function resolveReadStatus(status: number): PlayerCommerceViewStatus {
  switch (status) {
    case 401:
      return 'unauthorized';
    case 403:
      return 'forbidden';
    case 404:
      return 'notFound';
    case 0:
      return 'networkError';
    default:
      return 'unexpectedError';
  }
}

function validateEvidenceFile(file: File): ApiError | null {
  if (!PAYMENT_EVIDENCE_ALLOWED_MIME_TYPES.includes(file.type as (typeof PAYMENT_EVIDENCE_ALLOWED_MIME_TYPES)[number])) {
    return createValidationError(
      'Solo se permiten archivos JPG, PNG, WEBP o PDF.',
      'unsupported_file_type',
    );
  }

  if (file.size > PAYMENT_EVIDENCE_MAX_SIZE_BYTES) {
    return createValidationError(
      'El archivo supera el tamaño máximo permitido de 5 MB.',
      'file_too_large',
    );
  }

  return null;
}

function createValidationError(message: string, code: string): ApiError {
  return {
    status: 422,
    code,
    message,
    fieldErrors: { evidence: [message] },
    reason: null,
  };
}

function resolveEvidenceStatus(error: ApiError): PaymentEvidenceFlowStatus {
  if (error.status === 0) {
    return 'networkError';
  }

  if (error.status === 401) {
    return 'unauthorized';
  }

  if (error.status === 403) {
    return 'forbidden';
  }

  if (error.status === 409 && error.code === 'idempotency_key_mismatch') {
    return 'idempotencyConflict';
  }

  if (error.status === 425 && error.code === 'idempotency_in_progress') {
    return 'inProgress';
  }

  if (error.status === 422) {
    if (
      error.code === 'evidence_validation_failed' ||
      Object.hasOwn(error.fieldErrors, 'evidence')
    ) {
      return 'validationError';
    }

    if (error.code === 'evidence_rejected' || error.code === 'invalid_order_transition') {
      return 'evidenceRejected';
    }
  }

  return 'unexpectedError';
}

function shouldClearEvidenceKey(error: ApiError): boolean {
  return (
    (error.status === 409 && error.code === 'idempotency_key_mismatch') ||
    error.status === 422
  );
}

function shouldRefreshOrderAfterFailure(error: ApiError): boolean {
  return error.status === 422 && (error.code === 'evidence_rejected' || error.code === 'invalid_order_transition');
}

async function createEvidenceFingerprint(file: File): Promise<string> {
  const metadata = [file.name, String(file.size), file.type, String(file.lastModified)].join('|');
  const subtle = globalThis.crypto?.subtle;

  if (typeof subtle?.digest !== 'function') {
    return metadata;
  }

  const digest = await subtle.digest('SHA-256', await file.arrayBuffer());
  const hash = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');

  return `${metadata}|${hash}`;
}
