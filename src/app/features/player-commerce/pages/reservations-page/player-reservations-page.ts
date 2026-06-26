import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { formatGameDate, formatMoney } from '../../../public-games/utils/public-game-display';
import { PlayerReservationsFacade } from '../../data-access/player-collections.facade';

@Component({
  selector: 'app-player-reservations-page',
  imports: [RouterLink],
  providers: [PlayerReservationsFacade],
  template: `
    <section class="page commerce-page">
      <header class="page-header">
        <div>
          <p class="eyebrow">Apartados activos</p>
          <h1>Mis reservas</h1>
          <p>Números retenidos mientras completas o verificamos tu pago.</p>
        </div>
      </header>

      @if (facade.status() === 'loading') {
        <section class="surface-card data-state" aria-busy="true">
          <span class="data-loader"></span>
          <p>Cargando reservas...</p>
        </section>
      } @else if (facade.status() === 'unauthorized') {
        <section class="surface-card data-state" role="alert">
          <h2>Necesitas iniciar sesión</h2>
          <p>{{ facade.error()?.message }}</p>
          <a class="button" routerLink="/login">Ingresar</a>
        </section>
      } @else if (facade.status() === 'forbidden') {
        <section class="surface-card data-state" role="alert">
          <h2>No tienes acceso a estas reservas</h2>
          <p>{{ facade.error()?.message }}</p>
        </section>
      } @else if (
        facade.status() === 'networkError' ||
        facade.status() === 'unexpectedError' ||
        facade.status() === 'notFound'
      ) {
        <section class="surface-card data-state" role="alert">
          <h2>No pudimos cargar tus reservas</h2>
          <p>{{ facade.error()?.message }}</p>
          <button class="button" type="button" (click)="facade.load()">Reintentar</button>
        </section>
      } @else if (facade.status() === 'empty') {
        <section class="surface-card data-state">
          <h2>No tienes reservas activas</h2>
          <p>Cuando separes números aparecerán aquí.</p>
          <a class="button" routerLink="/bingos">Ver bingos</a>
        </section>
      } @else {
        <div class="reservation-grid">
          @for (item of facade.items(); track item.id) {
            <article class="surface-card reservation">
              <div class="number">{{ item.gameNumber.number }}</div>
              <div>
                <p class="eyebrow">{{ item.gameNumber.game?.name ?? 'Bingo' }}</p>
                <h2>Reserva activa</h2>
                <p>Vence {{ item.order.expiresAt ? date(item.order.expiresAt) : 'Sin vencimiento informado' }}</p>
                <strong>{{ money(item.order.totalCents, item.order.currency) }}</strong>
              </div>
              <a [routerLink]="['/jugador/compras', item.order.id]">Ver orden</a>
            </article>
          }
        </div>
      }
    </section>
  `,
  styles: `
    .reservation-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,22rem),1fr));gap:var(--s4)}
    .reservation{display:grid;grid-template-columns:auto 1fr;gap:var(--s4);align-items:center;padding:var(--s5)}
    .number{display:grid;width:4rem;height:4rem;place-items:center;border-radius:50%;background:var(--color-brand-subtle);color:var(--color-brand);font-size:var(--xl);font-weight:900}
    .reservation h2,.reservation p{margin:.1rem 0}
    .reservation>div p:not(.eyebrow){color:var(--color-text-muted);font-size:var(--sm)}
    .reservation>a{grid-column:1/-1;color:var(--color-link);font-weight:750}
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerReservationsPage {
  readonly facade = inject(PlayerReservationsFacade);
  readonly date = formatGameDate;
  readonly money = formatMoney;

  constructor() {
    this.facade.load();
  }
}
