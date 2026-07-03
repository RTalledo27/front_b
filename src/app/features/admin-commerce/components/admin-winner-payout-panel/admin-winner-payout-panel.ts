import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { formatGameDate, formatMoney } from '../../../public-games/utils/public-game-display';
import { AdminGameWinnerView } from '../../../admin-games/models/admin-games.models';
import { AdminWinnerPayoutFacade } from '../../data-access/admin-commerce.facades';

@Component({
  selector: 'app-admin-winner-payout-panel',
  imports: [ReactiveFormsModule, StatusBadge],
  providers: [AdminWinnerPayoutFacade],
  template: `
    <section class="surface-card panel payout-panel">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">Commerce administrativo</p>
          <h2>Payout del ganador</h2>
          <p>Solo usa el contrato privado real del backend para registrar el pago manual del premio.</p>
        </div>
        <app-status-badge [tone]="statusTone()">{{ statusLabel() }}</app-status-badge>
      </div>

      @if (winner() === null) {
        <p class="panel-note">Este juego todavía no expone un ganador real, así que no corresponde registrar payout.</p>
      } @else {
        <div class="winner-grid">
          <div><small>Usuario ganador</small><strong>{{ winner()!.userId }}</strong></div>
          <div><small>Número ganador</small><strong>{{ winner()!.winningNumber ?? '—' }}</strong></div>
          <div><small>Aciertos</small><strong>{{ winner()!.winningHits }}</strong></div>
          <div><small>Premio</small><strong>{{ money(prizeAmountCents(), currency()) }}</strong></div>
          <div><small>Ganó en</small><strong>{{ date(winner()!.wonAt) }}</strong></div>
        </div>

        @if (facade.payoutStatus() === 'loading') {
          <p class="panel-note">Consultando payout existente…</p>
        } @else if (facade.payoutStatus() === 'networkError' || facade.payoutStatus() === 'unexpectedError') {
          <div class="notice notice--danger" role="alert">
            <p>{{ facade.payoutError()?.message }}</p>
            <button class="button button--secondary" type="button" (click)="facade.loadPayout()">Reintentar</button>
          </div>
        } @else if (facade.payout(); as payout) {
          <div class="payout-summary">
            <div><small>Referencia</small><strong>{{ payout.externalReference }}</strong></div>
            <div><small>Método</small><strong>{{ payout.method }}</strong></div>
            <div><small>Procesado</small><strong>{{ date(payout.processedAt) }}</strong></div>
            <div><small>Evidencia</small><strong>{{ payout.document.originalFilename }}</strong></div>
          </div>
          @if (payout.notes) {
            <p class="panel-note"><strong>Notas:</strong> {{ payout.notes }}</p>
          }
          <p class="panel-note">La evidencia queda almacenada de forma privada en backend; esta UI no inventa descargas ni rutas públicas.</p>
        } @else if (canProcess()) {
          <form class="payout-form" (ngSubmit)="submitPayout()">
            <label>
              Referencia externa
              <input [formControl]="externalReference" type="text" maxlength="500" />
            </label>
            <label>
              Notas (opcional)
              <textarea [formControl]="notes" rows="4" maxlength="2000"></textarea>
            </label>
            <label>
              Evidencia del payout
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" (change)="onFileSelected($event)" />
            </label>
            @if (showFieldError('external_reference')) {
              <p class="field-error" role="alert">{{ fieldError('external_reference') }}</p>
            }
            @if (showFieldError('document')) {
              <p class="field-error" role="alert">{{ fieldError('document') }}</p>
            }
            <div class="notice" role="note">
              <p>El backend exige una sola operación idempotente, un documento válido y que el juego esté en estado <code>completed</code>.</p>
            </div>
            <div class="payout-actions">
              <button class="button" type="submit" [disabled]="facade.commandState().status === 'submitting'">
                {{ facade.commandState().status === 'submitting' ? 'Registrando payout…' : 'Confirmar payout' }}
              </button>
            </div>
          </form>
        } @else {
          <p class="panel-note">El payout solo se habilita cuando existe ganador real y el juego quedó completado.</p>
        }

        <div class="feedback" aria-live="polite" aria-atomic="true">
          @if (facade.commandState().status === 'success') {
            <p class="feedback-line feedback-line--success">
              Payout registrado por {{ money(facade.commandState().result?.amountCents ?? prizeAmountCents(), facade.commandState().result?.currency ?? currency()) }}.
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
      }
    </section>
  `,
  styles: `
    .payout-panel {
      display: grid;
      gap: var(--s4);
    }
    .panel-heading,
    .payout-actions {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: var(--s3);
      flex-wrap: wrap;
    }
    .winner-grid,
    .payout-summary {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: var(--s3);
    }
    .winner-grid > div,
    .payout-summary > div,
    .payout-form,
    label {
      display: grid;
      gap: var(--s2);
    }
    small,
    .panel-note {
      color: var(--color-text-muted);
    }
    input[type='text'],
    input[type='file'],
    textarea {
      box-sizing: border-box;
      width: 100%;
      max-width: 100%;
      min-height: 2.75rem;
      padding: 0 .75rem;
      border: 1px solid var(--color-border);
      border-radius: var(--r-md);
      font: inherit;
      background: var(--color-surface);
    }
    textarea {
      min-height: 7rem;
      padding: .75rem;
      resize: vertical;
    }
    .notice {
      padding: var(--s3);
      border-radius: var(--r-md);
      background: #eef6ff;
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
    @media (max-width: 52rem) {
      .winner-grid,
      .payout-summary {
        grid-template-columns: 1fr;
      }
      .panel-heading .button,
      .payout-actions .button {
        width: 100%;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminWinnerPayoutPanel {
  readonly gameId = input.required<string>();
  readonly gameStatus = input.required<string>();
  readonly prizeAmountCents = input.required<number>();
  readonly currency = input.required<string>();
  readonly winner = input<AdminGameWinnerView | null>(null);

  readonly facade = inject(AdminWinnerPayoutFacade);
  readonly externalReference = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(500)],
  });
  readonly notes = new FormControl('', {
    nonNullable: true,
    validators: [Validators.maxLength(2000)],
  });
  readonly document = signal<File | null>(null);
  readonly attemptedSubmit = signal(false);
  readonly money = formatMoney;
  readonly date = formatGameDate;
  readonly canProcess = computed(
    () => this.winner() !== null && this.gameStatus() === 'completed' && this.facade.payoutStatus() !== 'loaded',
  );
  readonly statusLabel = computed(() => {
    if (this.facade.payoutStatus() === 'loaded') {
      return 'Payout registrado';
    }

    if (this.canProcess()) {
      return 'Pendiente';
    }

    return 'No disponible';
  });
  readonly statusTone = computed(() => {
    if (this.facade.payoutStatus() === 'loaded') {
      return 'success' as const;
    }

    if (this.canProcess()) {
      return 'warning' as const;
    }

    return 'neutral' as const;
  });

  constructor() {
    effect(() => {
      this.facade.setContext(this.gameId());
      this.document.set(null);
      this.attemptedSubmit.set(false);
      if (this.winner() !== null) {
        this.facade.loadPayout();
      }
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target;
    const file =
      input instanceof HTMLInputElement && input.files !== null && input.files.length > 0
        ? input.files.item(0)
        : null;

    this.document.set(file);
  }

  submitPayout(): void {
    this.attemptedSubmit.set(true);
    this.externalReference.markAllAsTouched();
    this.notes.markAllAsTouched();

    if (this.externalReference.invalid || this.notes.invalid || this.document() === null) {
      return;
    }

    this.facade.processPayout({
      externalReference: this.externalReference.getRawValue().trim(),
      notes: normalizeOptionalText(this.notes.getRawValue()),
      document: this.document()!,
    });
  }

  showFieldError(field: 'external_reference' | 'document'): boolean {
    return this.fieldError(field) !== null;
  }

  fieldError(field: 'external_reference' | 'document'): string | null {
    if (field === 'external_reference') {
      if (this.externalReference.touched && this.externalReference.errors?.['required']) {
        return 'La referencia externa es obligatoria.';
      }

      if (this.externalReference.touched && this.externalReference.errors?.['maxlength']) {
        return 'La referencia externa no puede exceder 500 caracteres.';
      }
    }

    if (field === 'document' && this.document() === null && this.attemptedSubmit()) {
      return 'Adjunta la evidencia del payout.';
    }

    return this.facade.commandState().fieldErrors[field]?.[0] ?? null;
  }
}

function normalizeOptionalText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}
