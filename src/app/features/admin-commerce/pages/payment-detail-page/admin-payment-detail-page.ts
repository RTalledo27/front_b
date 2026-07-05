import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { API_BASE_URL } from '../../../../core/api/api.config';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { AdminOrderRefundCard } from '../../components/admin-order-refund-card/admin-order-refund-card';
import { AdminPaymentDetailFacade } from '../../data-access/admin-commerce.facades';
import { formatGameDate, formatMoney } from '../../../public-games/utils/public-game-display';
import {
  commerceStatusTone,
  formatShortId,
  paymentStatusLabel,
} from '../../../player-commerce/utils/player-commerce-display';

@Component({
  selector: 'app-admin-payment-detail-page',
  imports: [ReactiveFormsModule, RouterLink, StatusBadge, AdminOrderRefundCard],
  providers: [AdminPaymentDetailFacade],
  template: `
    <main class="page">
      <header class="page-header">
        <div>
          <a class="back" routerLink="/admin/pagos">← Volver a pagos</a>
          <p class="eyebrow">Revisión de pago</p>
          <h1>Pago {{ shortId(paymentId) }}</h1>
          <p>Comprobante, comprador, números y decisión administrativa.</p>
        </div>
      </header>

      @if (facade.status() === 'loading') {
        <section class="surface-card data-state" aria-busy="true">
          <span class="data-loader"></span>
          <p>Cargando detalle…</p>
        </section>
      } @else if (facade.status() === 'error') {
        <section class="surface-card data-state" role="alert">
          <h2>No pudimos cargar el pago</h2>
          <p>{{ facade.error()?.message }}</p>
          <button class="button" type="button" (click)="facade.load(paymentId)">Reintentar</button>
        </section>
      } @else if (facade.payment(); as payment) {
        <div class="summary">
          <article class="surface-card">
            <small>Estado</small>
            <app-status-badge [tone]="tone(payment.status)">{{ label(payment.status) }}</app-status-badge>
          </article>
          <article class="surface-card">
            <small>Monto</small>
            <strong>{{ money(payment.amount_cents, payment.currency) }}</strong>
          </article>
          <article class="surface-card">
            <small>Enviado</small>
            <strong>{{ date(payment.submitted_at) }}</strong>
          </article>
        </div>

        <div class="grid">
          <section class="surface-card panel">
            <h2>Comprador y orden</h2>
            <dl>
              <div><dt>Comprador</dt><dd>{{ payment.order.user?.name || 'Usuario sin nombre' }}</dd></div>
              <div><dt>Correo</dt><dd>{{ payment.order.user?.email || '—' }}</dd></div>
              <div><dt>Juego</dt><dd>{{ payment.order.game?.name || payment.order.game?.id || '—' }}</dd></div>
              <div><dt>Orden</dt><dd>{{ shortId(payment.order.id) }}</dd></div>
              <div><dt>Estado orden</dt><dd>{{ payment.order.status }}</dd></div>
            </dl>
            <h3>Números</h3>
            <div class="numbers">
              @for (item of payment.order.items || []; track item.id) {
                <span>{{ item.number ?? '—' }}</span>
              } @empty {
                <p>No hay ítems cargados.</p>
              }
            </div>
          </section>

          <section class="surface-card panel">
            <h2>Comprobantes</h2>
            @for (document of payment.documents; track document.id) {
              <article class="document">
                <div>
                  <strong>{{ document.original_filename }}</strong>
                  <small>{{ fileSize(document.size_bytes) }} · {{ document.mime_type }}</small>
                </div>
                <a
                  class="button button--secondary"
                  [href]="downloadUrl(document.id)"
                  [attr.download]="document.original_filename"
                >
                  Descargar
                </a>
              </article>
            } @empty {
              <p>No se adjuntaron comprobantes.</p>
            }
            @if (payment.rejection_reason) {
              <div class="notice" role="note">
                <strong>Motivo de rechazo</strong>
                <p>{{ payment.rejection_reason }}</p>
              </div>
            }
          </section>
        </div>

        <section class="surface-card panel">
          <h2>Refund administrativo</h2>
          <p class="panel-note">Solo aparece si la combinación orden/pago permite el reembolso total o si el refund ya existe.</p>
          <app-admin-order-refund-card
            [orderId]="payment.order.id"
            [orderStatus]="payment.order.status"
            [paymentStatus]="payment.status"
            [amountCents]="payment.order.total_cents"
            [currency]="payment.order.currency"
            [refunded]="payment.order.status === 'refunded' || payment.status === 'refunded'"
            [prefetchExisting]="payment.order.status === 'refunded' || payment.status === 'refunded'"
            (changed)="facade.load(paymentId)"
          />
        </section>

        @if (payment.status === 'under_review') {
          <section class="surface-card decisions">
            <div>
              <h2>Resolver pago</h2>
              <p>Estas acciones impactan la orden y los números reservados.</p>
            </div>
            @if (facade.actionError()) {
              <p class="error" role="alert">{{ facade.actionError()?.message }}</p>
            }
            <form (submit)="approve($event)">
              <label>
                Notas de aprobación (opcional)
                <textarea [formControl]="notes" maxlength="1000" rows="3"></textarea>
              </label>
              <button class="button" type="submit" [disabled]="notes.invalid || facade.actionStatus() === 'saving'">
                Aprobar pago
              </button>
            </form>
            <form (submit)="reject($event)">
              <label>
                Motivo del rechazo
                <textarea [formControl]="reason" maxlength="1000" rows="3" aria-describedby="reason-help"></textarea>
              </label>
              <small id="reason-help">Entre 3 y 1000 caracteres.</small>
              <button
                class="button button--danger"
                type="submit"
                [disabled]="reason.invalid || facade.actionStatus() === 'saving'"
              >
                Rechazar pago
              </button>
            </form>
          </section>
        }
      }
    </main>
  `,
  styles: `
    .back {
      display: inline-block;
      margin-bottom: var(--s3);
      color: var(--color-brand);
      font-weight: 750;
      text-decoration: none;
    }
    .summary {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: var(--s3);
      margin-bottom: var(--s4);
    }
    .summary article {
      display: grid;
      gap: var(--s2);
      padding: var(--s4);
    }
    .summary small,
    dt,
    .document small,
    .panel-note {
      color: var(--color-text-muted);
    }
    .summary strong {
      font-size: var(--lg);
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--s4);
    }
    .panel,
    .decisions {
      padding: var(--s5);
    }
    h2 {
      margin-top: 0;
    }
    dl {
      display: grid;
      gap: var(--s3);
    }
    dl div {
      display: flex;
      justify-content: space-between;
      gap: var(--s3);
      padding-bottom: var(--s2);
      border-bottom: 1px solid var(--neutral-100);
    }
    dd {
      margin: 0;
      text-align: right;
      overflow-wrap: anywhere;
    }
    .numbers {
      display: flex;
      flex-wrap: wrap;
      gap: .5rem;
    }
    .numbers span {
      display: grid;
      width: 2.5rem;
      height: 2.5rem;
      place-items: center;
      border: 1px solid var(--color-brand-muted);
      border-radius: 50%;
      color: var(--color-brand);
      font-weight: 850;
    }
    .document {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--s3);
      padding: var(--s3) 0;
      border-bottom: 1px solid var(--neutral-100);
    }
    .document div {
      display: grid;
    }
    .notice {
      padding: var(--s3);
      margin-top: var(--s4);
      border-radius: var(--r-md);
      background: #fff8df;
    }
    .decisions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--s5);
      margin-top: var(--s4);
    }
    .decisions > div,
    .decisions > .error {
      grid-column: 1 / -1;
    }
    .decisions form,
    .decisions label {
      display: grid;
      gap: var(--s2);
    }
    textarea {
      width: 100%;
      padding: .75rem;
      border: 1px solid var(--color-border);
      border-radius: var(--r-md);
      font: inherit;
      resize: vertical;
    }
    .error {
      color: #b42318;
    }
    @media (max-width: 48rem) {
      .summary,
      .grid,
      .decisions {
        grid-template-columns: 1fr;
      }
      .document {
        align-items: stretch;
        flex-direction: column;
      }
      .document .button {
        width: 100%;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminPaymentDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly base = inject(API_BASE_URL);

  readonly facade = inject(AdminPaymentDetailFacade);
  readonly paymentId = this.route.snapshot.paramMap.get('paymentId') ?? '';
  readonly notes = new FormControl('', { nonNullable: true, validators: [Validators.maxLength(1000)] });
  readonly reason = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.minLength(3), Validators.maxLength(1000)],
  });
  readonly money = formatMoney;
  readonly date = formatGameDate;
  readonly shortId = formatShortId;
  readonly label = paymentStatusLabel;
  readonly tone = commerceStatusTone;

  constructor() {
    this.facade.load(this.paymentId);
  }

  approve(event?: Event): void {
    event?.preventDefault();

    if (this.notes.valid) {
      this.facade.approve(this.notes.value);
    }
  }

  reject(event?: Event): void {
    event?.preventDefault();

    if (this.reason.valid) {
      this.facade.reject(this.reason.value);
    }
  }

  downloadUrl(documentId: string): string {
    return `${this.base}/admin/payments/${encodeURIComponent(this.paymentId)}/documents/${encodeURIComponent(documentId)}/download`;
  }

  fileSize(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes} B`;
    }

    if (bytes < 1_048_576) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / 1_048_576).toFixed(1)} MB`;
  }
}
