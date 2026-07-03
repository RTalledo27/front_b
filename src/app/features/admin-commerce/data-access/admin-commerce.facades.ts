import { computed, DestroyRef, effect, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';
import { ApiError, toApiError } from '../../../core/api/models/api-error.models';
import { AuthSessionService } from '../../../core/auth/services/auth-session.service';
import { PageInfo, ViewStatus } from '../../public-games/models/public-game.models';
import { createIdempotencyKey } from '../../player-commerce/utils/player-commerce-display';
import {
  AdminCommerceCommandState,
  AdminCommerceCommandStatus,
  AdminCommerceSnapshotStatus,
  AdminOrderApiDto,
  AdminPaymentDetailApiDto,
  AdminPaymentListApiDto,
  AdminRefundView,
  AdminWinnerPayoutView,
  RefundOrderPayload,
  WinnerPayoutPayload,
} from '../models/admin-commerce.models';
import { isAdminCommerceInvalidPayloadError } from './admin-commerce.mapper';
import { ADMIN_COMMERCE_REPOSITORY } from './admin-commerce.repository';

const initialPage: PageInfo = { currentPage: 1, lastPage: 1, perPage: 20, total: 0 };

const initialCommandState = <T>(): AdminCommerceCommandState<T> => ({
  status: 'idle',
  errorMessage: null,
  errorCode: null,
  errorReason: null,
  fieldErrors: {},
  result: null,
  refreshState: 'idle',
  refreshMessage: null,
});

@Injectable()
export class AdminOrdersFacade {
  private readonly repo = inject(ADMIN_COMMERCE_REPOSITORY);
  private readonly destroyRef = inject(DestroyRef);

  readonly orders = signal<AdminOrderApiDto[]>([]);
  readonly pageInfo = signal<PageInfo>(initialPage);
  readonly status = signal<ViewStatus>('idle');
  readonly error = signal<ApiError | null>(null);
  readonly statusFilter = signal('');
  readonly gameFilter = signal('');
  readonly hasPreviousPage = computed(() => this.pageInfo().currentPage > 1);
  readonly hasNextPage = computed(() => this.pageInfo().currentPage < this.pageInfo().lastPage);

  load(page = 1, status = this.statusFilter(), gameId = this.gameFilter()): void {
    this.status.set('loading');
    this.error.set(null);
    this.statusFilter.set(status);
    this.gameFilter.set(gameId.trim());

    this.repo
      .listOrders(page, status || undefined, gameId.trim() || undefined)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.orders.set(response.data);
          this.pageInfo.set({
            currentPage: response.meta.current_page,
            lastPage: response.meta.last_page,
            perPage: response.meta.per_page,
            total: response.meta.total,
          });
          this.status.set(response.data.length > 0 ? 'success' : 'empty');
        },
        error: (error: unknown) => {
          this.orders.set([]);
          this.error.set(toApiError(error));
          this.status.set('error');
        },
      });
  }

  previousPage(): void {
    if (this.hasPreviousPage()) {
      this.load(this.pageInfo().currentPage - 1);
    }
  }

  nextPage(): void {
    if (this.hasNextPage()) {
      this.load(this.pageInfo().currentPage + 1);
    }
  }
}

@Injectable()
export class AdminPaymentsFacade {
  private readonly repo = inject(ADMIN_COMMERCE_REPOSITORY);
  private readonly destroyRef = inject(DestroyRef);

  readonly payments = signal<AdminPaymentListApiDto[]>([]);
  readonly pageInfo = signal<PageInfo>(initialPage);
  readonly status = signal<ViewStatus>('idle');
  readonly error = signal<ApiError | null>(null);
  readonly filter = signal('');
  readonly hasPreviousPage = computed(() => this.pageInfo().currentPage > 1);
  readonly hasNextPage = computed(() => this.pageInfo().currentPage < this.pageInfo().lastPage);

  load(page = 1, status = this.filter()): void {
    this.status.set('loading');
    this.error.set(null);
    this.filter.set(status);

    this.repo
      .listPayments(page, status || undefined)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.payments.set(response.data);
          this.pageInfo.set({
            currentPage: response.meta.current_page,
            lastPage: response.meta.last_page,
            perPage: response.meta.per_page,
            total: response.meta.total,
          });
          this.status.set(response.data.length > 0 ? 'success' : 'empty');
        },
        error: (error: unknown) => {
          this.payments.set([]);
          this.error.set(toApiError(error));
          this.status.set('error');
        },
      });
  }

  previousPage(): void {
    if (this.hasPreviousPage()) {
      this.load(this.pageInfo().currentPage - 1);
    }
  }

  nextPage(): void {
    if (this.hasNextPage()) {
      this.load(this.pageInfo().currentPage + 1);
    }
  }
}

@Injectable()
export class AdminPaymentDetailFacade {
  private readonly repo = inject(ADMIN_COMMERCE_REPOSITORY);
  private readonly destroyRef = inject(DestroyRef);

  private approveKey = createIdempotencyKey('approve-payment');
  private rejectKey = createIdempotencyKey('reject-payment');

  readonly payment = signal<AdminPaymentDetailApiDto | null>(null);
  readonly status = signal<ViewStatus>('idle');
  readonly error = signal<ApiError | null>(null);
  readonly actionStatus = signal<'idle' | 'saving' | 'success' | 'error'>('idle');
  readonly actionError = signal<ApiError | null>(null);

  load(id: string): void {
    this.status.set('loading');
    this.error.set(null);

    this.repo
      .getPayment(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (payment) => {
          this.payment.set(payment);
          this.status.set('success');
        },
        error: (error: unknown) => {
          this.error.set(toApiError(error));
          this.status.set('error');
        },
      });
  }

  approve(notes: string): void {
    const payment = this.payment();
    if (payment === null || this.actionStatus() === 'saving') {
      return;
    }

    this.actionStatus.set('saving');
    this.actionError.set(null);

    this.repo
      .approvePayment(payment.id, notes.trim() || null, this.approveKey)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.approveKey = createIdempotencyKey('approve-payment');
          this.actionStatus.set('success');
          this.load(payment.id);
        },
        error: (error: unknown) => {
          this.actionError.set(toApiError(error));
          this.actionStatus.set('error');
        },
      });
  }

  reject(reason: string): void {
    const payment = this.payment();
    if (payment === null || this.actionStatus() === 'saving') {
      return;
    }

    this.actionStatus.set('saving');
    this.actionError.set(null);

    this.repo
      .rejectPayment(payment.id, reason.trim(), this.rejectKey)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.rejectKey = createIdempotencyKey('reject-payment');
          this.actionStatus.set('success');
          this.load(payment.id);
        },
        error: (error: unknown) => {
          this.actionError.set(toApiError(error));
          this.actionStatus.set('error');
        },
      });
  }
}

@Injectable()
export class AdminOrderRefundFacade {
  private readonly repo = inject(ADMIN_COMMERCE_REPOSITORY);
  private readonly session = inject(AuthSessionService);
  private readonly destroyRef = inject(DestroyRef);

  private loadSequence = 0;
  private commandSequence = 0;
  private activeOrderId = '';
  private commandKey: string | null = null;
  private lastSessionUserId: number | null | undefined = undefined;

  readonly refund = signal<AdminRefundView | null>(null);
  readonly refundStatus = signal<AdminCommerceSnapshotStatus>('idle');
  readonly refundError = signal<ApiError | null>(null);
  readonly commandState = signal<AdminCommerceCommandState<AdminRefundView>>(initialCommandState());

  constructor() {
    effect(() => {
      const userId = this.session.user()?.id ?? null;
      if (this.lastSessionUserId === undefined) {
        this.lastSessionUserId = userId;
        return;
      }

      if (userId !== this.lastSessionUserId) {
        this.lastSessionUserId = userId;
        this.commandKey = null;
        this.commandSequence += 1;
        this.commandState.set(initialCommandState());
      }
    });
  }

  setContext(orderId: string): void {
    const normalizedOrderId = orderId.trim();
    if (normalizedOrderId === this.activeOrderId) {
      return;
    }

    this.activeOrderId = normalizedOrderId;
    this.loadSequence += 1;
    this.commandSequence += 1;
    this.commandKey = null;
    this.refund.set(null);
    this.refundStatus.set('idle');
    this.refundError.set(null);
    this.commandState.set(initialCommandState());
  }

  loadRefund(): void {
    if (this.activeOrderId === '') {
      return;
    }

    this.loadSequence += 1;
    this.refundStatus.set('loading');
    this.refundError.set(null);

    const sequence = this.loadSequence;
    const requestUserId = this.session.user()?.id ?? null;
    const orderId = this.activeOrderId;

    this.repo
      .getOrderRefund(orderId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (refund) => {
          if (!this.isCurrentLoad(sequence, orderId, requestUserId)) {
            return;
          }

          this.refund.set(refund);
          this.refundError.set(null);
          this.refundStatus.set('loaded');
        },
        error: (error: unknown) => {
          if (!this.isCurrentLoad(sequence, orderId, requestUserId)) {
            return;
          }

          const apiError = resolveAdminCommerceError(error);
          this.refund.set(null);
          this.refundError.set(apiError);
          this.refundStatus.set(resolveSnapshotStatus(apiError));
        },
      });
  }

  refundOrder(payload: RefundOrderPayload): void {
    if (this.activeOrderId === '' || this.commandState().status === 'submitting') {
      return;
    }

    const key = this.commandKey ?? createIdempotencyKey('refund-order');
    this.commandKey = key;
    this.commandSequence += 1;
    const sequence = this.commandSequence;
    const orderId = this.activeOrderId;
    const requestUserId = this.session.user()?.id ?? null;

    this.commandState.set({
      status: 'submitting',
      errorMessage: null,
      errorCode: null,
      errorReason: null,
      fieldErrors: {},
      result: null,
      refreshState: 'idle',
      refreshMessage: null,
    });

    this.repo
      .refundOrder(orderId, payload, key)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (refund) => {
          if (this.hasSessionChanged(requestUserId)) {
            this.commandKey = null;
            this.commandState.set(initialCommandState());
            return;
          }

          if (!this.isCurrentCommand(sequence, orderId, requestUserId)) {
            return;
          }

          this.refund.set(refund);
          this.refundStatus.set('loaded');
          this.commandState.set({
            status: 'success',
            errorMessage: null,
            errorCode: null,
            errorReason: null,
            fieldErrors: {},
            result: refund,
            refreshState: 'refreshing',
            refreshMessage: null,
          });
          this.commandKey = null;
          this.refreshRefundAfterCommand(sequence, orderId, requestUserId, refund);
        },
        error: (error: unknown) => {
          if (this.hasSessionChanged(requestUserId)) {
            this.commandKey = null;
            this.commandState.set(initialCommandState());
            return;
          }

          if (!this.isCurrentCommand(sequence, orderId, requestUserId)) {
            return;
          }

          const apiError = resolveAdminCommerceError(error);
          this.commandState.set(mapAdminCommerceCommandError(apiError));
          if (!shouldRetainCommandKey(apiError)) {
            this.commandKey = null;
          }
        },
      });
  }

  clearFeedback(): void {
    this.commandState.set(initialCommandState());
  }

  private refreshRefundAfterCommand(
    sequence: number,
    orderId: string,
    requestUserId: number | null,
    fallback: AdminRefundView,
  ): void {
    this.loadSequence += 1;
    const loadSequence = this.loadSequence;

    this.repo
      .getOrderRefund(orderId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (refund) => {
          if (
            !this.isCurrentLoad(loadSequence, orderId, requestUserId) ||
            !this.isCurrentCommand(sequence, orderId, requestUserId)
          ) {
            return;
          }

          this.refund.set(refund);
          this.refundStatus.set('loaded');
          this.refundError.set(null);
          this.commandState.update((state) => ({
            ...state,
            result: refund,
            refreshState: 'confirmed',
            refreshMessage: null,
          }));
        },
        error: () => {
          if (!this.isCurrentCommand(sequence, orderId, requestUserId)) {
            return;
          }

          this.refund.set(fallback);
          this.refundStatus.set('loaded');
          this.commandState.update((state) => ({
            ...state,
            result: fallback,
            refreshState: 'failed',
            refreshMessage:
              'El reembolso se procesó, pero no pudimos confirmar el snapshot actualizado automáticamente.',
          }));
        },
      });
  }

  private isCurrentLoad(sequence: number, orderId: string, requestUserId: number | null): boolean {
    return (
      sequence === this.loadSequence &&
      orderId === this.activeOrderId &&
      (this.session.user()?.id ?? null) === requestUserId
    );
  }

  private isCurrentCommand(sequence: number, orderId: string, requestUserId: number | null): boolean {
    return (
      sequence === this.commandSequence &&
      orderId === this.activeOrderId &&
      (this.session.user()?.id ?? null) === requestUserId
    );
  }

  private hasSessionChanged(requestUserId: number | null): boolean {
    return (this.session.user()?.id ?? null) !== requestUserId;
  }
}

@Injectable()
export class AdminWinnerPayoutFacade {
  private readonly repo = inject(ADMIN_COMMERCE_REPOSITORY);
  private readonly session = inject(AuthSessionService);
  private readonly destroyRef = inject(DestroyRef);

  private loadSequence = 0;
  private commandSequence = 0;
  private activeGameId = '';
  private commandKey: string | null = null;
  private lastSessionUserId: number | null | undefined = undefined;

  readonly payout = signal<AdminWinnerPayoutView | null>(null);
  readonly payoutStatus = signal<AdminCommerceSnapshotStatus>('idle');
  readonly payoutError = signal<ApiError | null>(null);
  readonly commandState = signal<AdminCommerceCommandState<AdminWinnerPayoutView>>(initialCommandState());

  constructor() {
    effect(() => {
      const userId = this.session.user()?.id ?? null;
      if (this.lastSessionUserId === undefined) {
        this.lastSessionUserId = userId;
        return;
      }

      if (userId !== this.lastSessionUserId) {
        this.lastSessionUserId = userId;
        this.commandKey = null;
        this.commandSequence += 1;
        this.commandState.set(initialCommandState());
      }
    });
  }

  setContext(gameId: string): void {
    const normalizedGameId = gameId.trim();
    if (normalizedGameId === this.activeGameId) {
      return;
    }

    this.activeGameId = normalizedGameId;
    this.loadSequence += 1;
    this.commandSequence += 1;
    this.commandKey = null;
    this.payout.set(null);
    this.payoutStatus.set('idle');
    this.payoutError.set(null);
    this.commandState.set(initialCommandState());
  }

  loadPayout(): void {
    if (this.activeGameId === '') {
      return;
    }

    this.loadSequence += 1;
    this.payoutStatus.set('loading');
    this.payoutError.set(null);

    const sequence = this.loadSequence;
    const requestUserId = this.session.user()?.id ?? null;
    const gameId = this.activeGameId;

    this.repo
      .getWinnerPayout(gameId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (payout) => {
          if (!this.isCurrentLoad(sequence, gameId, requestUserId)) {
            return;
          }

          this.payout.set(payout);
          this.payoutError.set(null);
          this.payoutStatus.set('loaded');
        },
        error: (error: unknown) => {
          if (!this.isCurrentLoad(sequence, gameId, requestUserId)) {
            return;
          }

          const apiError = resolveAdminCommerceError(error);
          this.payout.set(null);
          this.payoutError.set(apiError);
          this.payoutStatus.set(resolveSnapshotStatus(apiError));
        },
      });
  }

  processPayout(payload: WinnerPayoutPayload): void {
    if (this.activeGameId === '' || this.commandState().status === 'submitting') {
      return;
    }

    const key = this.commandKey ?? createIdempotencyKey('winner-payout');
    this.commandKey = key;
    this.commandSequence += 1;
    const sequence = this.commandSequence;
    const gameId = this.activeGameId;
    const requestUserId = this.session.user()?.id ?? null;

    this.commandState.set({
      status: 'submitting',
      errorMessage: null,
      errorCode: null,
      errorReason: null,
      fieldErrors: {},
      result: null,
      refreshState: 'idle',
      refreshMessage: null,
    });

    this.repo
      .processWinnerPayout(gameId, payload, key)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (payout) => {
          if (this.hasSessionChanged(requestUserId)) {
            this.commandKey = null;
            this.commandState.set(initialCommandState());
            return;
          }

          if (!this.isCurrentCommand(sequence, gameId, requestUserId)) {
            return;
          }

          this.payout.set(payout);
          this.payoutStatus.set('loaded');
          this.commandState.set({
            status: 'success',
            errorMessage: null,
            errorCode: null,
            errorReason: null,
            fieldErrors: {},
            result: payout,
            refreshState: 'refreshing',
            refreshMessage: null,
          });
          this.commandKey = null;
          this.refreshPayoutAfterCommand(sequence, gameId, requestUserId, payout);
        },
        error: (error: unknown) => {
          if (this.hasSessionChanged(requestUserId)) {
            this.commandKey = null;
            this.commandState.set(initialCommandState());
            return;
          }

          if (!this.isCurrentCommand(sequence, gameId, requestUserId)) {
            return;
          }

          const apiError = resolveAdminCommerceError(error);
          this.commandState.set(mapAdminCommerceCommandError(apiError));
          if (!shouldRetainCommandKey(apiError)) {
            this.commandKey = null;
          }
        },
      });
  }

  clearFeedback(): void {
    this.commandState.set(initialCommandState());
  }

  private refreshPayoutAfterCommand(
    sequence: number,
    gameId: string,
    requestUserId: number | null,
    fallback: AdminWinnerPayoutView,
  ): void {
    this.loadSequence += 1;
    const loadSequence = this.loadSequence;

    this.repo
      .getWinnerPayout(gameId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (payout) => {
          if (
            !this.isCurrentLoad(loadSequence, gameId, requestUserId) ||
            !this.isCurrentCommand(sequence, gameId, requestUserId)
          ) {
            return;
          }

          this.payout.set(payout);
          this.payoutStatus.set('loaded');
          this.payoutError.set(null);
          this.commandState.update((state) => ({
            ...state,
            result: payout,
            refreshState: 'confirmed',
            refreshMessage: null,
          }));
        },
        error: () => {
          if (!this.isCurrentCommand(sequence, gameId, requestUserId)) {
            return;
          }

          this.payout.set(fallback);
          this.payoutStatus.set('loaded');
          this.commandState.update((state) => ({
            ...state,
            result: fallback,
            refreshState: 'failed',
            refreshMessage:
              'El payout se registró, pero no pudimos confirmar el snapshot actualizado automáticamente.',
          }));
        },
      });
  }

  private isCurrentLoad(sequence: number, gameId: string, requestUserId: number | null): boolean {
    return (
      sequence === this.loadSequence &&
      gameId === this.activeGameId &&
      (this.session.user()?.id ?? null) === requestUserId
    );
  }

  private isCurrentCommand(sequence: number, gameId: string, requestUserId: number | null): boolean {
    return (
      sequence === this.commandSequence &&
      gameId === this.activeGameId &&
      (this.session.user()?.id ?? null) === requestUserId
    );
  }

  private hasSessionChanged(requestUserId: number | null): boolean {
    return (this.session.user()?.id ?? null) !== requestUserId;
  }
}

export function resolveAdminCommerceError(error: unknown): ApiError {
  if (isAdminCommerceInvalidPayloadError(error)) {
    return {
      status: 500,
      code: 'invalid_payload',
      message: 'Recibimos una respuesta incompleta del servidor.',
      fieldErrors: {},
      reason: null,
    };
  }

  return toApiError(error);
}

export function mapAdminCommerceCommandError(
  error: ApiError,
): AdminCommerceCommandState<never> {
  return {
    status: resolveAdminCommerceCommandStatus(error),
    errorMessage: error.message,
    errorCode: error.code,
    errorReason: error.reason,
    fieldErrors: error.fieldErrors,
    result: null,
    refreshState: 'idle',
    refreshMessage: null,
  };
}

function resolveAdminCommerceCommandStatus(error: ApiError): AdminCommerceCommandStatus {
  switch (error.status) {
    case 401:
      return 'unauthorized';
    case 403:
      return 'forbidden';
    case 404:
      return 'notFound';
    case 409:
      return 'conflict';
    case 422:
      return error.code === 'order_not_refundable' || error.code === 'payout_not_processable'
        ? 'invalidState'
        : 'validationError';
    case 0:
      return 'networkError';
    default:
      return 'unexpectedError';
  }
}

function resolveSnapshotStatus(error: ApiError): AdminCommerceSnapshotStatus {
  switch (error.status) {
    case 404:
      return 'notFound';
    case 0:
      return 'networkError';
    default:
      return 'unexpectedError';
  }
}

function shouldRetainCommandKey(error: ApiError): boolean {
  return error.status === 0 || error.status >= 500;
}
