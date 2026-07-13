import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { formatGameDate, formatMoney } from '../../../public-games/utils/public-game-display';
import { PlayerOrdersFacade } from '../../data-access/player-orders.facade';
import { PlayerOrderSummary } from '../../models/player-commerce-view.models';
import { commerceStatusTone, orderStatusLabel } from '../../utils/player-commerce-display';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';

@Component({
  selector: 'app-player-orders-page',
  imports: [RouterLink, StatusBadge],
  providers: [PlayerOrdersFacade],
  template: `
    <section class="page commerce-page">
      <header class="page-header">
        <div>
          <p class="eyebrow">Compras</p>
          <h1>Mis órdenes</h1>
          <p>Consulta el estado de tus compras y revisa cada operación en detalle.</p>
        </div>
        <a class="button" routerLink="/bingos">Explorar bingos</a>
      </header>

      <div class="filters" aria-label="Filtrar órdenes">
        @for (option of filters; track option.value) {
          <button
            type="button"
            [class.active]="facade.filter() === option.value"
            (click)="facade.load(1, option.value)"
          >
            {{ option.label }}
          </button>
        }
      </div>

      @if (facade.status() === 'loading') {
        <section class="surface-card data-state" aria-busy="true">
          <span class="data-loader"></span>
          <p>Cargando tus órdenes...</p>
        </section>
      } @else if (facade.status() === 'unauthorized') {
        <section class="surface-card data-state" role="alert">
          <h2>Necesitas iniciar sesión</h2>
          <p>{{ facade.error()?.message }}</p>
          <a class="button" routerLink="/login">Ingresar</a>
        </section>
      } @else if (facade.status() === 'forbidden') {
        <section class="surface-card data-state" role="alert">
          <h2>No tienes acceso a estas órdenes</h2>
          <p>{{ facade.error()?.message }}</p>
        </section>
      } @else if (
        facade.status() === 'networkError' ||
        facade.status() === 'unexpectedError' ||
        facade.status() === 'notFound'
      ) {
        <section class="surface-card data-state" role="alert">
          <h2>No pudimos cargar tus órdenes</h2>
          <p>{{ facade.error()?.message }}</p>
          <button class="button" type="button" (click)="facade.load()">Reintentar</button>
        </section>
      } @else if (facade.status() === 'empty') {
        <section class="surface-card data-state">
          <h2>No hay órdenes en este estado</h2>
          <p>Tus próximas compras aparecerán aquí.</p>
        </section>
      } @else {
        <div class="order-list">
          @for (order of facade.orders(); track order.id) {
            <article class="surface-card order-card">
              <div>
                <small>Identificador de orden {{ order.reference }}</small>
                <h2>{{ order.itemCount }} {{ order.itemCount === 1 ? 'número' : 'números' }}</h2>
                <p>{{ summaryLine(order) }}</p>
              </div>
              <div class="order-total">
                <strong>{{ money(order.totalCents, order.currency) }}</strong>
                <app-status-badge [tone]="tone(order.status)">
                  {{ label(order.status) }}
                </app-status-badge>
              </div>
              <a class="button button--secondary" [routerLink]="['/jugador/compras', order.id]">
                Ver detalle
              </a>
            </article>
          }
        </div>

        @if (facade.pageInfo().lastPage > 1) {
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
      }
    </section>
  `,
  styles: `
    .filters{display:flex;gap:.5rem;overflow:auto;margin-bottom:var(--s5);padding-bottom:.25rem}
    .filters button{flex:none;padding:.6rem .8rem;border:1px solid var(--color-border);border-radius:999px;background:var(--color-surface);color:var(--color-text-muted);cursor:pointer;font:inherit;font-size:var(--sm);font-weight:700}
    .filters button.active{border-color:var(--color-brand);background:var(--color-brand-subtle);color:var(--color-brand)}
    .order-list{display:grid;gap:var(--s3)}
    .order-card{display:grid;grid-template-columns:1fr auto auto;align-items:center;gap:var(--s5);padding:var(--s5)}
    .order-card small,.order-card p{color:var(--color-text-muted)}
    .order-card h2,.order-card p{margin:.15rem 0}
    .order-total{display:grid;justify-items:end;gap:var(--s2)}
    .order-total strong{font-size:var(--xl)}
    .pagination{display:flex;align-items:center;justify-content:center;gap:var(--s4);margin-top:var(--s5);color:var(--color-text-muted);font-size:var(--sm)}
    @media(max-width:42rem){.order-card{grid-template-columns:1fr auto}.order-card>a{grid-column:1/-1}.order-card .button{width:100%}.page-header .button{width:100%}.pagination{justify-content:space-between}.pagination span{font-size:var(--xs)}}
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerOrdersPage {
  readonly facade = inject(PlayerOrdersFacade);
  readonly money = formatMoney;
  readonly date = formatGameDate;
  readonly label = orderStatusLabel;
  readonly tone = commerceStatusTone;

  readonly filters = [
    { value: '', label: 'Todas' },
    { value: 'pending', label: 'Pendientes' },
    { value: 'payment_submitted', label: 'En revisión' },
    { value: 'paid', label: 'Pagadas' },
    { value: 'rejected', label: 'Rechazadas' },
    { value: 'expired', label: 'Expiradas' },
  ] as const;

  constructor() {
    this.facade.load();
  }

  summaryLine(order: PlayerOrderSummary): string {
    if (order.createdAt !== null) {
      return `Creada ${this.date(order.createdAt)}`;
    }

    if (order.validity === 'active' && order.expiresAt !== null) {
      return `Reserva activa hasta ${this.date(order.expiresAt)}`;
    }

    return 'Consulta el detalle para revisar el estado operativo.';
  }
}
