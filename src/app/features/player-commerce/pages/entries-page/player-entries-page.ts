import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { formatGameDate } from '../../../public-games/utils/public-game-display';
import { PlayerEntriesFacade } from '../../data-access/player-collections.facade';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';

@Component({
  selector: 'app-player-entries-page',
  imports: [RouterLink, StatusBadge],
  providers: [PlayerEntriesFacade],
  template: `
    <section class="page commerce-page">
      <header class="page-header">
        <div>
          <p class="eyebrow">Participaciones confirmadas</p>
          <h1>Mis números</h1>
          <p>Estos números ya fueron pagados y participan oficialmente.</p>
        </div>
        <a class="button" routerLink="/bingos">Comprar números</a>
      </header>

      @if (facade.status() === 'loading') {
        <section class="surface-card data-state" aria-busy="true">
          <span class="data-loader"></span>
          <p>Cargando participaciones...</p>
        </section>
      } @else if (facade.status() === 'unauthorized') {
        <section class="surface-card data-state" role="alert">
          <h2>Necesitas iniciar sesión</h2>
          <p>{{ facade.error()?.message }}</p>
          <a class="button" routerLink="/login">Ingresar</a>
        </section>
      } @else if (facade.status() === 'forbidden') {
        <section class="surface-card data-state" role="alert">
          <h2>No tienes acceso a estas participaciones</h2>
          <p>{{ facade.error()?.message }}</p>
        </section>
      } @else if (
        facade.status() === 'networkError' ||
        facade.status() === 'unexpectedError' ||
        facade.status() === 'notFound'
      ) {
        <section class="surface-card data-state" role="alert">
          <h2>No pudimos cargar tus números</h2>
          <p>{{ facade.error()?.message }}</p>
          <button class="button" type="button" (click)="facade.load()">Reintentar</button>
        </section>
      } @else if (facade.status() === 'empty') {
        <section class="surface-card data-state">
          <h2>Aún no tienes participaciones confirmadas</h2>
          <p>Se crearán cuando un pago sea aprobado.</p>
        </section>
      } @else {
        <div class="entry-grid">
          @for (item of facade.items(); track item.id) {
            <article class="surface-card entry">
              <header>
                <div>
                  <p class="eyebrow">{{ item.game?.name ?? 'Bingo' }}</p>
                  <h2>Número {{ item.gameNumber?.number }}</h2>
                </div>
                <app-status-badge [tone]="item.status === 'winner' ? 'success' : 'info'">
                  {{ item.status === 'winner' ? 'Ganador' : 'Confirmado' }}
                </app-status-badge>
              </header>
              <p>Confirmado {{ item.confirmedAt ? date(item.confirmedAt) : 'Pendiente' }}</p>
              @if (item.game) {
                <a [routerLink]="['/bingos', item.game.slug]">Ver juego</a>
              }
            </article>
          }
        </div>
      }
    </section>
  `,
  styles: `
    .entry-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,18rem),1fr));gap:var(--s4)}
    .entry{padding:var(--s5)}
    .entry header{display:flex;justify-content:space-between;gap:var(--s3)}
    .entry h2{margin:0;font-size:var(--2xl)}
    .entry>p{color:var(--color-text-muted);font-size:var(--sm)}
    .entry>a{color:var(--color-link);font-weight:750}
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerEntriesPage {
  readonly facade = inject(PlayerEntriesFacade);
  readonly date = formatGameDate;

  constructor() {
    this.facade.load();
  }
}
