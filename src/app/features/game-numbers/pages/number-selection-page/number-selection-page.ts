import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { formatMoney } from '../../../public-games/utils/public-game-display';
import { NumberSelectionFacade } from '../../data-access/number-selection.facade';
import { GameNumberOption } from '../../models/game-number.models';

@Component({
  selector: 'app-number-selection-page',
  imports: [RouterLink],
  providers: [NumberSelectionFacade],
  template: `
    <main class="selection page">
      <a class="back-link" [routerLink]="['/bingos', slug]">
        <span aria-hidden="true">←</span> Volver al bingo
      </a>

      @if (facade.viewStatus() === 'loading') {
        <section class="surface-card data-state" aria-busy="true" aria-label="Cargando números">
          <span class="data-loader" aria-hidden="true"></span>
          <h1>Preparando los números...</h1>
          <p>Consultamos el juego y su disponibilidad.</p>
        </section>
      } @else if (facade.viewStatus() === 'networkError' || facade.viewStatus() === 'unexpectedError') {
        <section class="surface-card data-state" role="alert">
          <span class="data-state-code" aria-hidden="true">!</span>
          <h1>No pudimos preparar la selección</h1>
          <p>{{ facade.viewError()?.message }}</p>
          <button class="button" type="button" (click)="facade.load(slug)">Reintentar</button>
        </section>
      } @else if (facade.game(); as game) {
        <header class="page-header selection-header">
          <div>
            <p class="eyebrow">Selecciona tu participación</p>
            <h1>{{ game.name }}</h1>
            <p>
              Elige uno o varios números. Cada número cuesta
              <strong>{{ money(game.ticketPrice.amountCents, game.ticketPrice.currency) }}</strong>.
            </p>
          </div>
          <span class="availability">{{ facade.availableCount() }} disponibles</span>
        </header>

        @if (game.status !== 'sales_open') {
          <aside class="sales-notice" role="status">
            La venta todavía no está abierta. Puedes revisar la distribución, pero no seleccionar.
          </aside>
        }

        @if (facade.viewStatus() === 'refreshing') {
          <aside class="refresh-notice" role="status" aria-live="polite">
            Actualizamos la disponibilidad con el estado más reciente del backend.
          </aside>
        }

        @if (facade.liveMessage()) {
          <aside
            class="feedback"
            [class.feedback--success]="facade.reservationStatus() === 'success'"
            [class.feedback--warning]="facade.reservationStatus() === 'conflict' || facade.reservationStatus() === 'rateLimited' || facade.reservationStatus() === 'inProgress'"
            [class.feedback--danger]="facade.reservationStatus() === 'validationError' || facade.reservationStatus() === 'forbidden' || facade.reservationStatus() === 'unexpectedError' || facade.reservationStatus() === 'networkError'"
            role="status"
            aria-live="polite"
          >
            <p>{{ facade.liveMessage() }}</p>

            @if (reservationOrderId(); as orderId) {
              <div class="feedback-actions">
                <span>Orden {{ orderId }} · vence {{ reservationExpiryLabel() }}</span>
                <a [routerLink]="['/jugador/compras', orderId]">Ver detalle de orden</a>
              </div>
            }
          </aside>
        }

        <div class="selection-layout">
          <section class="surface-card board" aria-labelledby="numbers-title">
            <div class="board-heading">
              <div>
                <h2 id="numbers-title">Números del bingo</h2>
                <p>Presiona un número disponible para agregarlo o quitarlo.</p>
              </div>
              <div class="legend" aria-label="Leyenda de disponibilidad">
                <span><i class="available-dot"></i>Disponible</span>
                <span><i class="reserved-dot"></i>Reservado</span>
                <span><i class="sold-dot"></i>Vendido</span>
              </div>
            </div>

            <div class="number-grid">
              @for (item of facade.numbers(); track item.key) {
                <button
                  class="number"
                  type="button"
                  [class.number--selected]="facade.isSelected(item.key)"
                  [class.number--reserved]="item.status === 'reserved'"
                  [class.number--sold]="item.status === 'sold'"
                  [disabled]="item.status !== 'available' || !facade.selectionEnabled()"
                  [attr.aria-pressed]="facade.isSelected(item.key)"
                  [attr.aria-label]="numberLabel(item)"
                  (click)="facade.toggle(item)"
                  (keydown.enter)="toggleWithKeyboard($event, item)"
                  (keydown.space)="toggleWithKeyboard($event, item)"
                >
                  {{ item.number }}
                </button>
              }
            </div>
          </section>

          <aside class="surface-card summary" aria-labelledby="summary-title">
            <div class="summary-heading">
              <div>
                <p class="eyebrow">Tu selección</p>
                <h2 id="summary-title">Resumen</h2>
              </div>
              @if (facade.selectedCount()) {
                <button class="clear-button" type="button" (click)="facade.clearSelection()">
                  Limpiar
                </button>
              }
            </div>

            @if (facade.selectedCount()) {
              <div class="selected-list" aria-live="polite">
                @for (item of facade.selectedNumbers(); track item.key) {
                  <span>{{ item.number }}</span>
                }
              </div>
            } @else {
              <p class="empty-selection">Aún no has elegido números.</p>
            }

            <dl class="totals">
              <div><dt>Cantidad</dt><dd>{{ facade.selectedCount() }}</dd></div>
              <div>
                <dt>Total estimado</dt>
                <dd>{{ money(facade.totalCents(), game.ticketPrice.currency) }}</dd>
              </div>
            </dl>

            <button
              class="button"
              type="button"
              [disabled]="!facade.canReserve()"
              [attr.aria-busy]="facade.reservationStatus() === 'submitting'"
              (click)="facade.submitReservation()"
            >
              {{ reserveLabel() }}
            </button>
            <small>
              @if (facade.isAuthenticated()) {
                La reserva se enviará con los UUID reales del juego y una clave idempotente segura.
              } @else {
                Puedes elegir números libremente. Te pediremos iniciar sesión justo antes de reservar.
              }
            </small>
          </aside>
        </div>
      }
    </main>
  `,
  styles: `
    :host { display: block; }
    .selection { padding: clamp(1.25rem, 4vw, 3rem) var(--s5) 5rem; }
    .selection-header { align-items: center; }
    .selection-header h1 { font-size: var(--3xl); }
    .selection-header strong { color: var(--color-brand-strong); }
    .availability { flex: none; padding: .7rem .9rem; border-radius: 999px; background: var(--color-brand-subtle); color: var(--color-brand-strong); font-size: var(--sm); font-weight: 800; }
    .sales-notice, .refresh-notice, .feedback { margin-bottom: var(--s4); padding: var(--s3) var(--s4); border: 1px solid var(--color-border); border-radius: var(--r-md); background: var(--color-surface); color: var(--color-text-muted); font-size: var(--sm); }
    .sales-notice { border-left: 4px solid var(--color-prize-strong); background: var(--color-prize-subtle); color: var(--color-neutral-800); }
    .refresh-notice { border-left: 4px solid var(--color-brand); }
    .feedback { border-left: 4px solid var(--color-neutral-500); }
    .feedback p { margin: 0; }
    .feedback--success { border-left-color: var(--color-brand); background: var(--color-brand-subtle); color: var(--color-brand-strong); }
    .feedback--warning { border-left-color: var(--color-prize-strong); background: var(--color-prize-subtle); color: #7a5400; }
    .feedback--danger { border-left-color: #c2410c; background: #fff7ed; color: #9a3412; }
    .feedback-actions { display: flex; flex-wrap: wrap; gap: var(--s3); margin-top: var(--s2); }
    .feedback-actions a { color: inherit; font-weight: 750; word-break: break-word; }
    .feedback-actions span { word-break: break-word; }
    .selection-layout { display: grid; grid-template-columns: minmax(0, 1fr) 20rem; gap: var(--s5); align-items: start; }
    .board, .summary { padding: clamp(1rem, 3vw, 1.75rem); }
    .board-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--s4); margin-bottom: var(--s6); }
    .board-heading h2, .summary h2 { margin: 0; font-size: var(--xl); }
    .board-heading p { margin: var(--s1) 0 0; color: var(--color-text-muted); font-size: var(--sm); }
    .legend { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: var(--s3); color: var(--color-text-muted); font-size: var(--xs); }
    .legend span { display: inline-flex; align-items: center; gap: .35rem; }
    .legend i { width: .55rem; height: .55rem; border-radius: 50%; }
    .available-dot { background: var(--color-brand); }
    .reserved-dot { background: var(--color-prize-strong); }
    .sold-dot { background: var(--color-neutral-500); }
    .number-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(3.25rem, 1fr)); gap: var(--s2); }
    .number { min-height: 3.25rem; border: 1px solid var(--color-border); border-radius: var(--r-md); background: var(--color-surface); color: var(--color-neutral-800); cursor: pointer; font: inherit; font-weight: 800; transition: 140ms ease; }
    .number:hover:not(:disabled) { border-color: var(--color-brand); color: var(--color-brand); transform: translateY(-1px); }
    .number--selected { border-color: var(--color-brand); background: var(--color-brand); color: var(--color-white); box-shadow: 0 0 0 3px var(--color-brand-halo); }
    .number--selected:hover:not(:disabled) { color: var(--color-white); }
    .number--reserved, .number--sold { cursor: not-allowed; text-decoration: line-through; }
    .number--reserved { border-color: #f1d28c; background: var(--color-prize-subtle); color: #7a5400; }
    .number--sold { background: var(--color-neutral-100); color: var(--color-neutral-500); opacity: .7; }
    .summary { position: sticky; top: 6rem; }
    .summary-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--s3); }
    .clear-button { border: 0; background: transparent; color: var(--color-link); cursor: pointer; font: inherit; font-size: var(--sm); font-weight: 750; }
    .selected-list { display: flex; flex-wrap: wrap; gap: var(--s2); min-height: 3rem; margin: var(--s5) 0; }
    .selected-list span { display: grid; width: 2.3rem; height: 2.3rem; place-items: center; border-radius: 50%; background: var(--color-brand-subtle); color: var(--color-brand-strong); font-weight: 850; }
    .empty-selection { margin: var(--s5) 0; padding: var(--s4); border-radius: var(--r-md); background: var(--color-surface-subtle); color: var(--color-text-muted); font-size: var(--sm); text-align: center; }
    .totals { display: grid; gap: var(--s3); margin: 0 0 var(--s5); padding-top: var(--s4); border-top: 1px solid var(--color-border); }
    .totals div { display: flex; justify-content: space-between; gap: var(--s3); }
    .totals dt { color: var(--color-text-muted); }
    .totals dd { margin: 0; color: var(--color-neutral-900); font-weight: 850; }
    .summary .button { width: 100%; }
    .summary small { display: block; margin-top: var(--s3); color: var(--color-neutral-500); line-height: 1.45; }

    @media (max-width: 55rem) { .selection-layout { grid-template-columns: 1fr; } .summary { position: static; } }
    @media (max-width: 42rem) { .selection { padding-inline: var(--s4); } .board-heading { flex-direction: column; } .legend { justify-content: flex-start; } .number-grid { grid-template-columns: repeat(5, 1fr); } }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NumberSelectionPage {
  private readonly route = inject(ActivatedRoute);

  readonly facade = inject(NumberSelectionFacade);
  readonly money = formatMoney;
  readonly slug = this.route.snapshot.paramMap.get('slug') ?? '';

  constructor() {
    this.facade.load(this.slug);
  }

  numberLabel(item: GameNumberOption): string {
    const state = item.status === 'available' ? 'disponible' : item.status === 'reserved' ? 'reservado' : 'vendido';
    const selected = this.facade.isSelected(item.key) ? ', seleccionado' : '';
    return `Número ${item.number}, ${state}${selected}`;
  }

  reserveLabel(): string {
    if (this.facade.reservationStatus() === 'submitting') {
      return 'Reservando...';
    }

    return this.facade.isAuthenticated() ? 'Reservar selección' : 'Ingresar para reservar';
  }

  toggleWithKeyboard(event: Event, item: GameNumberOption): void {
    event.preventDefault();
    this.facade.toggle(item);
  }

  reservationOrderId(): string | null {
    const orderId = this.facade.reservationResult()?.order.id ?? null;
    return typeof orderId === 'string' && orderId.trim().length > 0 ? orderId.trim() : null;
  }

  reservationExpiryLabel(): string {
    const expiresAt = this.facade.reservationResult()?.order.expires_at ?? null;
    return expiresAt && expiresAt.trim().length > 0 ? expiresAt : 'sin vencimiento informado';
  }
}
