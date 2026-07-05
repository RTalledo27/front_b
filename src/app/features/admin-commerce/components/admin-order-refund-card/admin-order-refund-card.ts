import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { formatGameDate, formatMoney } from '../../../public-games/utils/public-game-display';
import { AdminOrderRefundFacade } from '../../data-access/admin-commerce.facades';

@Component({
  selector: 'app-admin-order-refund-card',
  imports: [ReactiveFormsModule],
  providers: [AdminOrderRefundFacade],
  template: `
    @if (canOpen()) {
      <div class="refund-card">
        <button class="button button--secondary" type="button" (click)="toggleOpen()">
          {{ refundButtonLabel() }}
        </button>

        @if (open()) {
          <section
            class="refund-panel surface-card"
            role="region"
            aria-live="polite"
            aria-label="Panel de reembolso administrativo"
          >
            <div class="refund-panel__header">
              <div>
                <p class="eyebrow">Refund administrativo</p>
                <h3>{{ refunded() ? 'Reembolso registrado' : 'Confirmar reembolso total' }}</h3>
              </div>
              <button class="button button--ghost" type="button" (click)="open.set(false)">Cerrar</button>
            </div>

            @if (facade.refundStatus() === 'loading') {
              <p class="hint">Consultando el snapshot real del reembolso…</p>
            } @else if (facade.refundStatus() === 'networkError' || facade.refundStatus() === 'unexpectedError') {
              <div class="notice notice--danger" role="alert">
                <p>{{ facade.refundError()?.message }}</p>
                <button class="button button--secondary" type="button" (click)="facade.loadRefund()">Reintentar</button>
              </div>
            } @else if (facade.refund(); as refund) {
              <div class="refund-summary">
                <div>
                  <small>Monto</small>
                  <strong>{{ money(refund.amountCents, refund.currency) }}</strong>
                </div>
                <div>
                  <small>Procesado</small>
                  <strong>{{ date(refund.processedAt) }}</strong>
                </div>
                <div>
                  <small>Números</small>
                  <strong>{{ refund.numbers.join(', ') || '—' }}</strong>
                </div>
              </div>
              <p class="hint"><strong>Motivo:</strong> {{ refund.reason }}</p>
              <p class="hint">
                {{ refund.wasAlreadyRefunded ? 'La acción fue recuperada desde el backend como replay idempotente.' : 'El backend marcó la orden y el pago como reembolsados.' }}
              </p>
            } @else if (!refunded()) {
              <form class="refund-form" (submit)="submitRefund($event)">
                <label>
                  Motivo del reembolso
                  <textarea
                    [formControl]="reason"
                    rows="4"
                    maxlength="1000"
                    aria-describedby="refund-reason-help"
                  ></textarea>
                </label>
                <small id="refund-reason-help">Mínimo 10 caracteres. Esta acción es irreversible desde la UI.</small>
                @if (showReasonError()) {
                  <p class="field-error" role="alert">{{ firstReasonError() }}</p>
                }
                <div class="notice" role="note">
                  <p>Se enviará un refund total usando el contrato real del backend y la misma orden quedará fuera de circulación.</p>
                </div>
                <div class="refund-actions">
                  <button class="button button--danger" type="submit" [disabled]="facade.commandState().status === 'submitting'">
                    {{ facade.commandState().status === 'submitting' ? 'Reembolsando…' : 'Confirmar reembolso' }}
                  </button>
                  <button class="button button--secondary" type="button" (click)="open.set(false)">Cancelar</button>
                </div>
              </form>
            } @else if (facade.refundStatus() === 'notFound') {
              <p class="hint">Aún no existe un snapshot persistido del reembolso para esta orden.</p>
            }

            <div class="feedback" aria-live="polite" aria-atomic="true">
              @if (facade.commandState().status === 'success') {
                <p class="feedback-line feedback-line--success">
                  Reembolso procesado para {{ money(facade.commandState().result?.amountCents ?? amountCents(), facade.commandState().result?.currency ?? currency()) }}.
                </p>
                @if (facade.commandState().refreshState === 'failed') {
                  <p class="feedback-line feedback-line--warning">{{ facade.commandState().refreshMessage }}</p>
                }
              } @else if (facade.commandState().status !== 'idle' && facade.commandState().status !== 'submitting') {
                <p class="feedback-line feedback-line--danger">{{ facade.commandState().errorMessage }}</p>
                @if (facade.commandState().errorReason; as reasonCode) {
                  <p class="feedback-line">Motivo backend: <code>{{ reasonCode }}</code></p>
                }
              }
            </div>
          </section>
        }
      </div>
    }
  `,
  styles: `
    .refund-card {
      display: grid;
      gap: var(--s3);
      justify-items: start;
      min-width: 0;
    }
    .refund-panel {
      width: min(100%, 52rem);
      max-width: 100%;
      padding: var(--s4);
      display: grid;
      gap: var(--s3);
      min-width: 0;
    }
    .refund-panel__header,
    .refund-actions {
      display: flex;
      gap: var(--s3);
      justify-content: space-between;
      align-items: flex-start;
      flex-wrap: wrap;
    }
    .refund-summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 12rem), 1fr));
      gap: var(--s3);
    }
    .refund-summary > div,
    .refund-form,
    label {
      display: grid;
      gap: var(--s2);
    }
    .refund-summary > div {
      min-width: 0;
      padding: var(--s3);
      border: 1px solid var(--color-border);
      border-radius: var(--r-md);
      background: var(--color-surface-subtle);
    }
    .refund-summary small,
    .hint,
    label small {
      color: var(--color-text-muted);
      overflow-wrap: anywhere;
    }
    strong,
    p,
    label,
    small,
    code {
      min-width: 0;
      max-width: 100%;
      overflow-wrap: anywhere;
      word-break: break-word;
    }
    textarea {
      box-sizing: border-box;
      width: 100%;
      min-height: 7rem;
      max-width: 100%;
      padding: .75rem;
      border: 1px solid var(--color-border);
      border-radius: var(--r-md);
      font: inherit;
      resize: vertical;
    }
    .notice {
      padding: var(--s3);
      border-radius: var(--r-md);
      background: #fff8df;
    }
    .notice--danger {
      background: #fff1f1;
    }
    .field-error,
    .feedback-line--danger {
      color: var(--danger-700);
    }
    .feedback-line--success {
      color: var(--success-700);
    }
    .feedback-line--warning {
      color: var(--warning-700);
    }
    .feedback-line {
      margin: 0;
      overflow-wrap: anywhere;
    }
    @media (max-width: 48rem) {
      .refund-actions .button,
      .refund-panel__header .button {
        width: 100%;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminOrderRefundCard {
  private lastNotifiedRefundId: string | null = null;

  readonly orderId = input.required<string>();
  readonly orderStatus = input.required<string>();
  readonly paymentStatus = input<string | null>(null);
  readonly amountCents = input.required<number>();
  readonly currency = input.required<string>();
  readonly prefetchExisting = input(false);
  readonly refunded = input(false);
  readonly changed = output<void>();

  readonly facade = inject(AdminOrderRefundFacade);
  readonly reason = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.minLength(10), Validators.maxLength(1000)],
  });
  readonly open = signal(false);
  readonly money = formatMoney;
  readonly date = formatGameDate;
  readonly canSubmit = computed(
    () => this.orderStatus() === 'paid' && this.paymentStatus() === 'approved',
  );
  readonly canOpen = computed(() => this.canSubmit() || this.refunded());

  constructor() {
    effect(() => {
      this.facade.setContext(this.orderId());
      this.reason.setValue('');
      this.open.set(false);

      if (this.prefetchExisting() && this.refunded()) {
        this.facade.loadRefund();
      }
    });

    effect(() => {
      const command = this.facade.commandState();
      const refundId = command.result?.id ?? null;

      if (command.status === 'success' && refundId !== null && refundId !== this.lastNotifiedRefundId) {
        this.lastNotifiedRefundId = refundId;
        this.changed.emit();
      }
    });
  }

  toggleOpen(): void {
    const nextState = !this.open();
    this.open.set(nextState);
    this.facade.clearFeedback();

    if (nextState && (this.refunded() || this.facade.commandState().status === 'success')) {
      this.facade.loadRefund();
    }
  }

  refundButtonLabel(): string {
    if (this.refunded()) {
      return 'Ver reembolso';
    }

    return 'Reembolsar orden';
  }

  submitRefund(event?: Event): void {
    event?.preventDefault();

    if (this.reason.invalid) {
      this.reason.markAllAsTouched();
      return;
    }

    this.facade.refundOrder({ reason: this.reason.getRawValue().trim() });
  }

  showReasonError(): boolean {
    return this.firstReasonError() !== null;
  }

  firstReasonError(): string | null {
    const control = this.reason;

    if (control.touched || control.dirty) {
      if (control.errors?.['required']) {
        return 'El motivo es obligatorio.';
      }

      if (control.errors?.['minlength']) {
        return 'El motivo debe tener al menos 10 caracteres.';
      }

      if (control.errors?.['maxlength']) {
        return 'El motivo no puede exceder 1000 caracteres.';
      }
    }

    return this.facade.commandState().fieldErrors['reason']?.[0] ?? null;
  }
}
