import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { AdminOrderRefundCard } from '../../components/admin-order-refund-card/admin-order-refund-card';
import { AdminOrdersFacade } from '../../data-access/admin-commerce.facades';
import { formatGameDate, formatMoney } from '../../../public-games/utils/public-game-display';
import {
  commerceStatusTone,
  formatShortId,
  orderStatusLabel,
  paymentStatusLabel,
} from '../../../player-commerce/utils/player-commerce-display';

@Component({
  selector: 'app-admin-orders-page',
  imports: [ReactiveFormsModule, StatusBadge, AdminOrderRefundCard],
  providers: [AdminOrdersFacade],
  template: `
    <section class="page">
      <header class="page-header">
        <div>
          <p class="eyebrow">Comercio</p>
          <h1>Órdenes</h1>
          <p>Supervisa compras, pagos y vencimientos registrados por el backend.</p>
        </div>
      </header>

      <form class="toolbar surface-card" (submit)="search($event)">
        <label>
          Juego
          <input [formControl]="gameId" placeholder="UUID del juego" />
        </label>
        <button class="button button--secondary" type="submit">Aplicar</button>
        <button class="button button--ghost" type="button" (click)="clear()">Limpiar</button>
      </form>

      <div class="filters" aria-label="Filtrar órdenes">
        @for (option of filters; track option.value) {
          <button
            type="button"
            [class.active]="facade.statusFilter() === option.value"
            (click)="facade.load(1, option.value, gameId.value)"
          >
            {{ option.label }}
          </button>
        }
      </div>

      @if (facade.status() === 'loading') {
        <section class="surface-card data-state" aria-busy="true">
          <span class="data-loader"></span>
          <p>Cargando órdenes…</p>
        </section>
      } @else if (facade.status() === 'error') {
        <section class="surface-card data-state" role="alert">
          <h2>No pudimos cargar las órdenes</h2>
          <p>{{ facade.error()?.message }}</p>
          <button class="button" type="button" (click)="facade.load()">Reintentar</button>
        </section>
      } @else if (facade.status() === 'empty') {
        <section class="surface-card data-state">
          <h2>Sin resultados</h2>
          <p>No hay órdenes para estos filtros.</p>
        </section>
      } @else {
        <div class="list">
          @for (order of facade.orders(); track order.id) {
            <article class="surface-card row">
              <div class="row__main">
                <small>Orden {{ shortId(order.id) }}</small>
                <h2>{{ order.game?.name || 'Juego ' + shortId(order.game_id) }}</h2>
                <p>{{ order.user?.name || 'Usuario ' + order.user_id }} · {{ order.user?.email || 'Sin correo cargado' }}</p>
                <p>
                  Pago asociado:
                  {{ order.payment ? shortId(order.payment.id) : 'Sin pago' }}
                  ·
                  {{ paymentStatusText(order.payment?.status ?? null) }}
                </p>
              </div>

              <div class="row__meta">
                <strong>{{ money(order.total_cents, order.currency) }}</strong>
                <small>{{ date(order.created_at) }}</small>
              </div>

              <div class="row__status">
                <app-status-badge [tone]="tone(order.status)">{{ label(order.status) }}</app-status-badge>
              </div>

              <app-admin-order-refund-card
                class="row__refund"
                [orderId]="order.id"
                [orderStatus]="order.status"
                [paymentStatus]="order.payment?.status ?? null"
                [amountCents]="order.total_cents"
                [currency]="order.currency"
                [refunded]="order.status === 'refunded'"
                (changed)="reloadCurrentPage()"
              />
            </article>
          }
        </div>

        <nav class="pagination" aria-label="Paginación">
          <button
            class="button button--secondary"
            [disabled]="!facade.hasPreviousPage()"
            (click)="facade.previousPage()"
          >
            Anterior
          </button>
          <span>Página {{ facade.pageInfo().currentPage }} de {{ facade.pageInfo().lastPage }}</span>
          <button
            class="button button--secondary"
            [disabled]="!facade.hasNextPage()"
            (click)="facade.nextPage()"
          >
            Siguiente
          </button>
        </nav>
      }
    </section>
  `,
  styles: `
    .toolbar {
      display: flex;
      align-items: end;
      gap: var(--s3);
      padding: var(--s4);
      margin-bottom: var(--s3);
    }
    label {
      display: grid;
      flex: 1;
      gap: .35rem;
      font-size: var(--sm);
      font-weight: 700;
    }
    input {
      min-height: 2.75rem;
      padding: 0 .8rem;
      border: 1px solid var(--color-border);
      border-radius: var(--r-md);
    }
    .filters {
      display: flex;
      gap: .5rem;
      overflow: auto;
      margin-bottom: var(--s5);
    }
    .filters button {
      flex: none;
      padding: .6rem .8rem;
      border: 1px solid var(--color-border);
      border-radius: 999px;
      background: #fff;
      color: var(--color-text-muted);
      font: inherit;
      font-size: var(--sm);
      font-weight: 700;
    }
    .filters button.active {
      border-color: var(--color-brand);
      background: var(--color-brand-subtle);
      color: var(--color-brand);
    }
    .list {
      display: grid;
      gap: var(--s3);
    }
    .row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto auto;
      align-items: start;
      gap: var(--s5);
      padding: var(--s5);
    }
    .row__main,
    .row__meta,
    .row__status,
    .row__refund {
      min-width: 0;
    }
    .row__meta {
      display: grid;
      text-align: right;
    }
    .row__refund {
      grid-column: 1 / -1;
    }
    h2,
    p {
      margin: .15rem 0;
    }
    .row small,
    .row p {
      color: var(--color-text-muted);
      overflow-wrap: anywhere;
    }
    .pagination {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--s4);
      margin-top: var(--s5);
    }
    @media (max-width: 44rem) {
      .toolbar {
        align-items: stretch;
        flex-direction: column;
      }
      .row {
        grid-template-columns: 1fr;
      }
      .row__meta {
        text-align: left;
      }
      .pagination {
        justify-content: space-between;
      }
      .pagination span {
        font-size: var(--xs);
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminOrdersPage {
  readonly facade = inject(AdminOrdersFacade);
  readonly gameId = new FormControl('', { nonNullable: true });
  readonly money = formatMoney;
  readonly date = formatGameDate;
  readonly shortId = formatShortId;
  readonly label = orderStatusLabel;
  readonly paymentLabel = paymentStatusLabel;
  readonly tone = commerceStatusTone;
  readonly filters = [
    { value: '', label: 'Todas' },
    { value: 'pending', label: 'Pendientes' },
    { value: 'payment_submitted', label: 'En revisión' },
    { value: 'paid', label: 'Pagadas' },
    { value: 'rejected', label: 'Rechazadas' },
    { value: 'expired', label: 'Expiradas' },
    { value: 'cancelled', label: 'Canceladas' },
    { value: 'refunded', label: 'Reembolsadas' },
  ] as const;

  constructor() {
    this.facade.load();
  }

  search(event?: Event): void {
    event?.preventDefault();
    this.facade.load(1, this.facade.statusFilter(), this.gameId.value);
  }

  clear(): void {
    this.gameId.setValue('');
    this.facade.load(1, this.facade.statusFilter(), '');
  }

  reloadCurrentPage(): void {
    this.facade.load(this.facade.pageInfo().currentPage, this.facade.statusFilter(), this.gameId.value);
  }

  paymentStatusText(status: Parameters<typeof paymentStatusLabel>[0] | null): string {
    return status === null ? 'Sin estado' : this.paymentLabel(status);
  }
}
