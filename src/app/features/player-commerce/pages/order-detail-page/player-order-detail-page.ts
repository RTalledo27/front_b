import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { formatGameDate, formatMoney } from '../../../public-games/utils/public-game-display';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { PlayerOrderDetailFacade } from '../../data-access/player-order-detail.facade';
import { OrderValidityState } from '../../models/player-commerce-view.models';
import {
  PAYMENT_EVIDENCE_ACCEPT_ATTRIBUTE,
  PaymentEvidenceFlowStatus,
} from '../../models/player-payment-evidence.models';
import {
  commerceStatusTone,
  orderStatusLabel,
  paymentStatusLabel,
} from '../../utils/player-commerce-display';

@Component({
  selector: 'app-player-order-detail-page',
  imports: [RouterLink, StatusBadge],
  providers: [PlayerOrderDetailFacade],
  template: `
    <section class="page detail-page">
      <a class="back-link" routerLink="/jugador/compras">
        <span aria-hidden="true">←</span> Mis ordenes
      </a>

      @if (facade.status() === 'loading') {
        <section class="surface-card data-state" aria-busy="true">
          <span class="data-loader"></span>
          <p>Cargando orden...</p>
        </section>
      } @else if (facade.status() === 'unauthorized') {
        <section class="surface-card data-state" role="alert">
          <h1>Necesitas iniciar sesion</h1>
          <p>{{ facade.error()?.message }}</p>
          <a class="button" routerLink="/login">Ingresar</a>
        </section>
      } @else if (facade.status() === 'forbidden') {
        <section class="surface-card data-state" role="alert">
          <h1>No tienes acceso a esta orden</h1>
          <p>{{ facade.error()?.message }}</p>
        </section>
      } @else if (facade.status() === 'notFound') {
        <section class="surface-card data-state" role="alert">
          <h1>La orden no esta disponible</h1>
          <p>{{ facade.error()?.message }}</p>
          <a class="button button--secondary" routerLink="/jugador/compras">Volver a mis ordenes</a>
        </section>
      } @else if (facade.status() === 'networkError' || facade.status() === 'unexpectedError') {
        <section class="surface-card data-state" role="alert">
          <h1>No pudimos abrir esta orden</h1>
          <p>{{ facade.error()?.message }}</p>
          <button class="button" type="button" (click)="facade.retryLoad()">Reintentar</button>
        </section>
      } @else if (facade.order(); as order) {
        <header class="page-header">
          <div>
            <p class="eyebrow">Orden {{ order.reference }}</p>
            <h1>{{ order.game?.name ?? 'Reserva de numeros' }}</h1>
            <p>Detalle operativo de la orden creada despues de la reserva.</p>
          </div>
          <app-status-badge [tone]="tone(order.status)">
            {{ orderLabel(order.status) }}
          </app-status-badge>
        </header>

        <div class="detail-grid">
          <div class="main-column">
            <section class="surface-card panel">
              <h2>Numeros de la orden</h2>
              <div class="number-list">
                @for (item of order.items; track item.id) {
                  <div>
                    <span>{{ item.number ?? '—' }}</span>
                    <small>{{ money(item.unitPriceCents, order.currency) }}</small>
                  </div>
                }
              </div>
            </section>

            <section class="surface-card panel">
              <h2>Estado del pago</h2>
              @if (order.payment; as payment) {
                <dl class="facts">
                  <div><dt>Estado</dt><dd>{{ paymentLabel(payment.status) }}</dd></div>
                  <div><dt>Monto</dt><dd>{{ money(payment.amountCents, payment.currency) }}</dd></div>
                  <div><dt>Enviado</dt><dd>{{ payment.submittedAt ? date(payment.submittedAt) : 'Pendiente' }}</dd></div>
                  @if (payment.reviewedAt) {
                    <div><dt>Revisado</dt><dd>{{ date(payment.reviewedAt) }}</dd></div>
                  }
                  @if (payment.rejectionReason) {
                    <div><dt>Motivo</dt><dd>{{ payment.rejectionReason }}</dd></div>
                  }
                </dl>
              } @else {
                <p>No existe un pago asociado para esta orden.</p>
              }
            </section>

            @if (facade.canUploadEvidence()) {
              <section class="surface-card panel evidence-panel" aria-labelledby="payment-evidence-title">
                <div class="section-heading">
                  <div>
                    <h2 id="payment-evidence-title">Carga de evidencia</h2>
                    <p id="payment-evidence-help">Adjunta una sola evidencia de pago en JPG, PNG, WEBP o PDF hasta 5 MB.</p>
                  </div>
                  @if (facade.selectedEvidence(); as selectedEvidence) {
                    <button
                      class="button button--ghost"
                      type="button"
                      [disabled]="facade.isEvidenceBusy()"
                      (click)="facade.clearSelectedEvidence()"
                    >
                      Quitar archivo
                    </button>
                  }
                </div>

                <label class="file-picker" [class.file-picker--disabled]="facade.isEvidenceBusy()">
                  <span class="file-picker__label">Seleccionar evidencia</span>
                  <input
                    id="payment-evidence-input"
                    type="file"
                    name="evidence"
                    [accept]="evidenceAccept"
                    [disabled]="facade.isEvidenceBusy()"
                    [attr.aria-describedby]="evidenceDescribedBy()"
                    [attr.aria-invalid]="hasEvidenceError() ? 'true' : 'false'"
                    (change)="onEvidenceSelected($event)"
                  />
                </label>

                @if (facade.selectedEvidence(); as selectedEvidence) {
                  <section class="evidence-card" aria-label="Archivo seleccionado">
                    <p class="evidence-name">{{ selectedEvidence.file.name }}</p>
                    <p class="evidence-meta">
                      {{ selectedEvidence.mimeType || 'Tipo no informado' }} · {{ formatSize(selectedEvidence.sizeBytes) }}
                    </p>
                  </section>
                }

                <div class="feedback-region" aria-live="polite" aria-atomic="true">
                  @if (facade.evidenceStatus() === 'validating') {
                    <p class="feedback-line">Validando archivo seleccionado...</p>
                  }
                  @if (facade.evidenceStatus() === 'ready') {
                    <p class="feedback-line">La evidencia esta lista para enviarse.</p>
                  }
                  @if (facade.evidenceStatus() === 'success') {
                    @if (facade.submittedEvidence(); as submittedEvidence) {
                      <p class="feedback-line feedback-line--success">
                        Evidencia enviada. El pago quedo en revision el {{ date(submittedEvidence.submittedAt) }}.
                      </p>
                    }
                  }
                  @if (facade.evidenceStatus() === 'inProgress') {
                    <p class="feedback-line feedback-line--info">
                      El intento idempotente aun esta en proceso. Reintenta el mismo envio en unos segundos.
                    </p>
                  }
                  @if (hasEvidenceError()) {
                    <p id="payment-evidence-error" class="feedback-line feedback-line--danger">{{ facade.evidenceError()?.message }}</p>
                  }
                </div>

                <div class="actions-row">
                  <button
                    class="button"
                    type="button"
                    [disabled]="!canSubmitEvidence()"
                    (click)="facade.submitEvidence()"
                  >
                    {{ submitLabel(facade.evidenceStatus()) }}
                  </button>
                </div>
              </section>
            } @else if (showsReviewState(order.status, order.payment?.status ?? null)) {
              <section class="surface-card panel">
                <h2>Pago en revision</h2>
                <p>La evidencia ya fue recibida y esta en revision. Esta pantalla no ofrece reemplazo, descarga ni eliminacion del documento.</p>
              </section>
            }

            <section class="surface-card panel">
              <h2>Continuidad operativa</h2>
              <p>{{ order.nextAction }}</p>
              @if (order.game) {
                <a class="text-link" [routerLink]="['/bingos', order.game.slug]">Volver al bingo publico</a>
              }
            </section>
          </div>

          <aside class="surface-card summary">
            <p class="eyebrow">Resumen</p>
            <dl>
              <div><dt>ID real</dt><dd>{{ order.reference }}</dd></div>
              <div><dt>Juego</dt><dd>{{ order.game?.name ?? 'No disponible' }}</dd></div>
              <div><dt>Subtotal</dt><dd>{{ money(order.subtotalCents, order.currency) }}</dd></div>
              <div><dt>Total</dt><dd>{{ money(order.totalCents, order.currency) }}</dd></div>
              <div><dt>Vencimiento</dt><dd>{{ order.expiresAt ? date(order.expiresAt) : 'Sin vencimiento informado' }}</dd></div>
              <div><dt>Validez</dt><dd>{{ validityLabel(order.validity) }}</dd></div>
              <div><dt>Cantidad</dt><dd>{{ order.items.length }}</dd></div>
            </dl>

            @if (order.paidAt) {
              <p class="meta-line">Pago confirmado {{ date(order.paidAt) }}</p>
            }
            @if (order.expiredAt) {
              <p class="meta-line">Expiro {{ date(order.expiredAt) }}</p>
            }
            @if (order.cancelledAt) {
              <p class="meta-line">Cancelada {{ date(order.cancelledAt) }}</p>
            }
          </aside>
        </div>
      }
    </section>
  `,
  styles: `
    .detail-grid{display:grid;grid-template-columns:minmax(0,1fr)20rem;gap:var(--s5);align-items:start}
    .main-column{display:grid;gap:var(--s4)}
    .panel,.summary{padding:var(--s5)}
    .panel h2{margin-top:0}
    .number-list{display:flex;flex-wrap:wrap;gap:var(--s3)}
    .number-list div{display:grid;justify-items:center;gap:.25rem}
    .number-list span{display:grid;width:3.25rem;height:3.25rem;place-items:center;border-radius:50%;background:var(--color-brand-subtle);color:var(--color-brand);font-weight:900}
    .number-list small,.panel p,.meta-line,.file-picker__label,.evidence-meta{color:var(--color-text-muted)}
    .facts,.summary dl{display:grid;gap:var(--s3);margin:0}
    .facts div,.summary dl div{display:flex;justify-content:space-between;gap:var(--s3);padding-bottom:var(--s3);border-bottom:1px solid var(--color-border)}
    .section-heading{display:flex;justify-content:space-between;gap:var(--s4);align-items:start}
    .file-picker{display:grid;gap:var(--s2);padding:var(--s4);border:1px dashed var(--color-border);border-radius:1rem;background:var(--color-surface-alt)}
    .file-picker--disabled{opacity:.72}
    .file-picker input{width:100%}
    .evidence-panel{display:grid;gap:var(--s4)}
    .evidence-card{padding:var(--s4);border:1px solid var(--color-border);border-radius:1rem;background:var(--color-surface-alt)}
    .evidence-name{margin:0 0 .35rem;font-weight:750;color:var(--color-text)}
    .evidence-meta{margin:0}
    .feedback-region{min-height:1.5rem}
    .feedback-line{margin:0}
    .feedback-line--success{color:var(--color-success)}
    .feedback-line--info{color:var(--color-brand)}
    .feedback-line--danger{color:var(--color-danger)}
    .actions-row{display:flex;justify-content:flex-start}
    dt{color:var(--color-text-muted)}
    dd{margin:0;font-weight:750;text-align:right;word-break:break-word}
    .summary{position:sticky;top:6rem}
    .summary dl{margin-bottom:var(--s5)}
    .summary dd{max-width:10rem}
    .text-link{color:var(--color-link);font-weight:750}
    .meta-line{margin:.6rem 0 0}
    @media(max-width:52rem){
      .detail-grid{grid-template-columns:1fr}
      .summary{position:static}
      .section-heading{flex-direction:column}
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerOrderDetailPage {
  private readonly route = inject(ActivatedRoute);

  readonly facade = inject(PlayerOrderDetailFacade);
  readonly orderId = this.route.snapshot.paramMap.get('orderId') ?? '';
  readonly money = formatMoney;
  readonly date = formatGameDate;
  readonly orderLabel = orderStatusLabel;
  readonly paymentLabel = paymentStatusLabel;
  readonly tone = commerceStatusTone;
  readonly evidenceAccept = PAYMENT_EVIDENCE_ACCEPT_ATTRIBUTE;

  constructor() {
    this.facade.load(this.orderId);
  }

  onEvidenceSelected(event: Event): void {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) {
      return;
    }

    this.facade.selectEvidence(input.files?.item(0) ?? null);
  }

  canSubmitEvidence(): boolean {
    return this.facade.selectedEvidence() !== null && !this.facade.isEvidenceBusy();
  }

  hasEvidenceError(): boolean {
    return this.facade.evidenceError() !== null && this.facade.evidenceStatus() !== 'success';
  }

  evidenceDescribedBy(): string {
    return this.hasEvidenceError()
      ? 'payment-evidence-help payment-evidence-error'
      : 'payment-evidence-help';
  }

  showsReviewState(orderStatus: string, paymentStatus: string | null): boolean {
    return orderStatus === 'payment_submitted' || paymentStatus === 'under_review';
  }

  submitLabel(status: PaymentEvidenceFlowStatus): string {
    return status === 'submitting' ? 'Enviando evidencia...' : 'Enviar evidencia';
  }

  formatSize(sizeBytes: number): string {
    const sizeInKb = sizeBytes / 1024;
    return sizeInKb >= 1024 ? `${(sizeInKb / 1024).toFixed(2)} MB` : `${Math.max(sizeInKb, 0.1).toFixed(1)} KB`;
  }

  validityLabel(validity: OrderValidityState): string {
    switch (validity) {
      case 'active':
        return 'Activa';
      case 'expired':
        return 'Expirada';
      case 'cancelled':
        return 'Cancelada';
      case 'completed':
        return 'Finalizada';
      case 'not_applicable':
        return 'No aplica';
    }
  }
}
