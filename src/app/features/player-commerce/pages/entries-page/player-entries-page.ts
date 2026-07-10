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

      @if (facade.liveGamesError() && facade.items().length) {
        <section class="surface-card live-notice" aria-live="polite">
          No pudimos refrescar todo el estado público del juego. Conservamos tus cartones confirmados
          con la última información disponible.
        </section>
      }

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
                <div class="entry__badges">
                  <app-status-badge [tone]="item.status === 'winner' ? 'success' : 'info'">
                    {{ item.status === 'winner' ? 'Ganador' : 'Confirmado' }}
                  </app-status-badge>
                  @if (liveGame(item.gameId); as liveGameState) {
                    <app-status-badge [tone]="gameTone(liveGameState.status)">
                      {{ gameLabel(liveGameState.status) }}
                    </app-status-badge>
                  }
                </div>
              </header>
              <p>Confirmado {{ item.confirmedAt ? date(item.confirmedAt) : 'Pendiente' }}</p>

              @if (liveGame(item.gameId); as liveGameState) {
                <div class="entry__live">
                  @if (liveGameState.status === 'running') {
                    <strong>Juego en vivo</strong>
                    <p>
                      @if (liveGameState.latestDraw; as latestDraw) {
                        Último número sorteado: {{ latestDraw.number }} · sorteo #{{ latestDraw.sequence }}
                      } @else {
                        El backend todavía no publicó un último sorteo visible.
                      }
                    </p>
                    <small>La actualización de aciertos depende del estado publicado por el juego.</small>
                    <small>
                      {{
                        liveGameState.schedule.nextDrawAt
                          ? 'Próxima referencia ' + date(liveGameState.schedule.nextDrawAt)
                          : 'Actualización pública cada ' + liveGameState.schedule.drawIntervalSeconds + ' s'
                      }}
                    </small>
                  } @else if (liveGameState.status === 'completed') {
                    <strong>Juego finalizado</strong>
                    <p>
                      @if (liveGameState.winner; as winner) {
                        Ganó el número {{ winner.number }} con {{ winner.hits }} aciertos.
                      } @else {
                        El backend todavía no publicó ganador en el contrato público.
                      }
                    </p>
                  } @else {
                    <strong>{{ gameLabel(liveGameState.status) }}</strong>
                    <p>Tu cartón está confirmado. La actualización de aciertos depende del estado publicado por el juego.</p>
                  }
                </div>
              } @else {
                <div class="entry__live entry__live--muted">
                  <strong>Cartón confirmado</strong>
                  <p>Tu cartón está confirmado. La actualización de aciertos depende del estado publicado por el juego.</p>
                </div>
              }

              @if (item.game) {
                <div class="entry__actions">
                  <a [routerLink]="['/bingos', item.game.slug]">Ver juego</a>
                  <a [routerLink]="['/bingos', item.game.slug, 'numeros']">Ver tablero público</a>
                </div>
              }
            </article>
          }
        </div>
      }
    </section>
  `,
  styles: `
    .entry-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,18rem),1fr));gap:var(--s4)}
    .entry{display:grid;gap:var(--s3);padding:var(--s5)}
    .entry header{display:flex;justify-content:space-between;gap:var(--s3)}
    .entry h2{margin:0;font-size:var(--2xl)}
    .entry>p{color:var(--color-text-muted);font-size:var(--sm)}
    .entry__badges,.entry__actions{display:flex;flex-wrap:wrap;gap:var(--s2)}
    .entry__live{display:grid;gap:var(--s1);padding:var(--s3);border-radius:var(--r-md);background:var(--color-surface-subtle)}
    .entry__live--muted{border:1px dashed var(--color-border);background:transparent}
    .entry__live strong,.entry__live p,.entry__live small{margin:0}
    .entry__live p,.entry__live small,.live-notice{color:var(--color-text-muted)}
    .entry__actions a{color:var(--color-link);font-weight:750}
    .live-notice{margin-bottom:var(--s4);padding:var(--s4)}
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerEntriesPage {
  readonly facade = inject(PlayerEntriesFacade);
  readonly date = formatGameDate;

  constructor() {
    this.facade.load();
  }

  liveGame(gameId: string): ReturnType<PlayerEntriesFacade['gameLiveState']> {
    return this.facade.gameLiveState(gameId);
  }

  gameLabel(status: 'draft' | 'published' | 'sales_open' | 'sales_closed' | 'running' | 'paused' | 'resolving' | 'completed' | 'cancelled'): string {
    switch (status) {
      case 'running':
        return 'Juego en vivo';
      case 'completed':
        return 'Juego finalizado';
      case 'sales_closed':
        return 'Ventas cerradas';
      case 'sales_open':
        return 'Ventas abiertas';
      case 'paused':
        return 'Pausado';
      case 'cancelled':
        return 'Cancelado';
      case 'published':
        return 'Próximamente';
      case 'resolving':
        return 'Validando resultado';
      default:
        return 'Borrador';
    }
  }

  gameTone(status: 'draft' | 'published' | 'sales_open' | 'sales_closed' | 'running' | 'paused' | 'resolving' | 'completed' | 'cancelled'): 'neutral' | 'info' | 'success' | 'warning' | 'danger' {
    switch (status) {
      case 'running':
      case 'resolving':
        return 'info';
      case 'completed':
      case 'sales_open':
        return 'success';
      case 'paused':
      case 'published':
        return 'warning';
      case 'cancelled':
        return 'danger';
      default:
        return 'neutral';
    }
  }
}
