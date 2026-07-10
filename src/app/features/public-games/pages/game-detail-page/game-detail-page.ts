import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { PublicGameDetailFacade } from '../../data-access/public-game-detail.facade';
import {
  formatGameDate,
  formatMoney,
  gameStatusLabel,
  gameStatusTone,
} from '../../utils/public-game-display';

@Component({
  selector: 'app-game-detail-page',
  imports: [RouterLink, StatusBadge],
  providers: [PublicGameDetailFacade],
  template: `
    <main class="detail page">
      <a class="back-link" routerLink="/bingos" aria-label="Volver al catálogo de bingos">
        <span aria-hidden="true"><</span> Todos los bingos
      </a>

      @if (facade.status() === 'loading') {
        <section class="surface-card state" aria-label="Cargando detalle del bingo" aria-busy="true">
          <span class="loader" aria-hidden="true"></span>
          <h1>Cargando información...</h1>
          <p>Estamos consultando los datos publicados por Fortuna.</p>
        </section>
      } @else if (facade.status() === 'error') {
        <section class="surface-card state" role="alert">
          <span class="state-code" aria-hidden="true">!</span>
          <h1>No pudimos abrir este bingo</h1>
          <p>{{ facade.error()?.message }}</p>
          <div class="state-actions">
            <button class="button" type="button" (click)="reload()">Intentar nuevamente</button>
            <a class="button button--secondary" routerLink="/bingos">Volver al catálogo</a>
          </div>
        </section>
      } @else if (facade.game(); as game) {
        <article>
          <header class="hero">
            <div class="hero-copy">
              <app-status-badge [tone]="statusTone(game.status)">
                {{ statusLabel(game.status) }}
              </app-status-badge>
              <p class="eyebrow">Bingo Fortuna</p>
              <h1>{{ game.name }}</h1>
              <p class="description">
                {{ game.description || 'Participa con reglas claras y resultados verificables.' }}
              </p>
            </div>

            <section class="prize" aria-labelledby="prize-title">
              <p id="prize-title">Premio anunciado</p>
              <strong>{{ money(game.prize.amountCents, game.prize.currency) }}</strong>
              <span>Información oficial del juego</span>
            </section>
          </header>

          <div class="content-grid">
            <section class="surface-card information" aria-labelledby="game-information-title">
              <div class="section-heading">
                <div>
                  <p class="eyebrow">Detalles</p>
                  <h2 id="game-information-title">Información del juego</h2>
                </div>
                <span class="number-range">{{ game.numberMin }}-{{ game.numberMax }}</span>
              </div>

              <dl class="facts">
                <div>
                  <dt>Inicio programado</dt>
                  <dd>{{ formatDate(game.schedule.scheduledStartAt) }}</dd>
                </div>
                <div>
                  <dt>Precio por número</dt>
                  <dd>{{ money(game.ticketPrice.amountCents, game.ticketPrice.currency) }}</dd>
                </div>
                <div>
                  <dt>Aciertos requeridos</dt>
                  <dd>{{ game.hitsRequired }}</dd>
                </div>
                <div>
                  <dt>Intervalo del sorteo</dt>
                  <dd>{{ game.schedule.drawIntervalSeconds }} segundos</dd>
                </div>
                <div>
                  <dt>Apertura de ventas</dt>
                  <dd>{{ formatDate(game.schedule.salesOpensAt) }}</dd>
                </div>
                <div>
                  <dt>Cierre de ventas</dt>
                  <dd>{{ formatDate(game.schedule.salesClosesAt) }}</dd>
                </div>
              </dl>
            </section>

            <section class="surface-card live-state" aria-labelledby="live-state-title">
              <div class="section-heading live-state__heading">
                <div>
                  <p class="eyebrow">Estado publicado</p>
                  <h2 id="live-state-title">{{ liveHeading(game.status) }}</h2>
                </div>
                @if (facade.refreshing()) {
                  <span class="live-pill">Actualizando…</span>
                } @else if (facade.lastUpdatedAt()) {
                  <span class="live-pill">Actualizado {{ formatDate(facade.lastUpdatedAt()) }}</span>
                }
              </div>

              <p>{{ liveSummary(game.status) }}</p>

              @if (game.latestDraw; as latestDraw) {
                <div class="live-highlight">
                  <span>Último número sorteado</span>
                  <strong>{{ latestDraw.number }}</strong>
                  <small>
                    Sorteo #{{ latestDraw.sequence }} · {{ formatDate(latestDraw.drawnAt) }}
                  </small>
                </div>
              }

              @if (game.status === 'running') {
                <dl class="live-facts">
                  <div>
                    <dt>Siguiente actualización esperada</dt>
                    <dd>{{ runningUpdateLabel(game) }}</dd>
                  </div>
                  <div>
                    <dt>Inicio del juego</dt>
                    <dd>{{ formatDate(game.lifecycle.startedAt) }}</dd>
                  </div>
                </dl>
              }

              @if (game.status === 'completed') {
                @if (game.winner; as winner) {
                  <div class="winner-card">
                    <h3>Ganador publicado</h3>
                    <p>El número {{ winner.number }} ganó con {{ winner.hits }} aciertos.</p>
                    <small>
                      Sorteo #{{ winner.drawSequence }} · {{ formatDate(winner.wonAt) }}
                    </small>
                  </div>
                } @else {
                  <div class="winner-card winner-card--muted">
                    <h3>Resultado pendiente de publicación</h3>
                    <p>El juego terminó, pero este contrato público todavía no expone un ganador.</p>
                  </div>
                }
              }

              @if (facade.liveError()) {
                <p class="live-inline-error">
                  No pudimos refrescar la información en vivo. Conservamos el último estado público
                  disponible.
                </p>
              }
            </section>

            <aside class="surface-card participation" aria-labelledby="participation-title">
              <span class="ticket-icon" aria-hidden="true">F</span>
              <p class="eyebrow">Participación</p>
              <h2 id="participation-title">Elige tus números</h2>
              <p>{{ participationMessage(game.status) }}</p>
              @if (game.status === 'sales_open') {
                <a class="button" [routerLink]="['/bingos', game.slug, 'numeros']">Elegir números</a>
              } @else {
                <button class="button" type="button" disabled>{{ participationButtonLabel(game.status) }}</button>
              }
              <small>{{ participationNote(game.status) }}</small>
            </aside>
          </div>
        </article>
      }
    </main>
  `,
  styles: `
    :host { display: block; }
    .detail { padding: clamp(1.25rem, 4vw, 3rem) var(--s5) 4rem; }
    .back-link { display: inline-flex; align-items: center; gap: .45rem; margin-bottom: var(--s5); color: var(--color-link); font-weight: 750; text-decoration: none; }
    .back-link:hover { color: var(--color-link-hover); text-decoration: underline; }
    .hero { display: grid; grid-template-columns: minmax(0, 1.45fr) minmax(16rem, .55fr); gap: var(--s8); align-items: center; padding: clamp(1.5rem, 5vw, 3.5rem); border-radius: var(--r-xl); background: linear-gradient(135deg, var(--color-dark-section), var(--color-dark-section-soft)); color: var(--color-dark-section-contrast); box-shadow: var(--shadow); }
    .hero .eyebrow { margin-top: var(--s5); color: #c7d2fe; }
    .hero h1 { max-width: 46rem; margin: 0; font-size: var(--3xl); line-height: 1.04; letter-spacing: -.045em; }
    .description { max-width: 42rem; margin: var(--s4) 0 0; color: #d9e1ec; font-size: var(--lg); }
    .prize { padding: var(--s6); border: 1px solid rgb(255 255 255 / .14); border-radius: var(--r-lg); background: rgb(255 255 255 / .07); text-align: center; }
    .prize p, .prize span { display: block; margin: 0; color: #d9e1ec; font-size: var(--sm); }
    .prize strong { display: block; margin: var(--s2) 0; color: var(--color-prize); font-size: clamp(2rem, 5vw, 3rem); letter-spacing: -.04em; }
    .content-grid { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, .95fr) 21rem; gap: var(--s5); margin-top: var(--s5); align-items: start; }
    .information, .participation { padding: clamp(1.25rem, 4vw, 2rem); }
    .live-state { padding: clamp(1.25rem, 4vw, 2rem); }
    .section-heading { display: flex; align-items: center; justify-content: space-between; gap: var(--s4); padding-bottom: var(--s5); border-bottom: 1px solid var(--color-border); }
    .section-heading h2, .participation h2 { margin: 0; font-size: var(--2xl); letter-spacing: -.03em; }
    .number-range { flex: none; padding: .65rem .8rem; border-radius: var(--r-md); background: var(--color-brand-subtle); color: var(--color-brand-strong); font-weight: 850; }
    .facts { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); margin: 0; }
    .facts div { padding: var(--s5) 0; border-bottom: 1px solid var(--color-border); }
    .facts div:nth-child(odd) { padding-right: var(--s5); }
    .facts div:nth-child(even) { padding-left: var(--s5); border-left: 1px solid var(--color-border); }
    .facts dt { color: var(--color-text-muted); font-size: var(--sm); font-weight: 650; }
    .facts dd { margin: var(--s2) 0 0; color: var(--color-neutral-900); font-weight: 800; }
    .participation { position: sticky; top: 6rem; }
    .ticket-icon { display: grid; width: 3rem; height: 3rem; place-items: center; margin-bottom: var(--s5); border-radius: var(--r-md); background: var(--color-brand-subtle); color: var(--color-brand); font-size: var(--xl); font-weight: 900; box-shadow: 0 0 0 .45rem var(--color-brand-halo); }
    .participation > p:not(.eyebrow) { color: var(--color-text-muted); }
    .participation .button { width: 100%; margin-top: var(--s3); }
    .participation small { display: block; margin-top: var(--s3); color: var(--color-neutral-500); line-height: 1.45; }
    .state { display: grid; min-height: 23rem; place-items: center; align-content: center; gap: var(--s3); padding: var(--s8); text-align: center; }
    .state h1, .state p { margin: 0; }
    .state p { max-width: 35rem; color: var(--color-text-muted); }
    .state-code { display: grid; width: 3rem; height: 3rem; place-items: center; border-radius: 50%; background: var(--color-brand-subtle); color: var(--color-brand); font-size: var(--xl); font-weight: 900; }
    .state-actions { display: flex; flex-wrap: wrap; justify-content: center; gap: var(--s3); margin-top: var(--s3); }
    .loader { width: 2.5rem; height: 2.5rem; border: 3px solid var(--color-brand-muted); border-top-color: var(--color-brand); border-radius: 50%; animation: spin .8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    @media (max-width: 72rem) { .content-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .participation { grid-column: 1 / -1; position: static; } }
    @media (max-width: 55rem) { .hero, .content-grid { grid-template-columns: 1fr; } }
    @media (max-width: 38rem) { .detail { padding-inline: var(--s4); } .hero { padding: var(--s6); } .facts { grid-template-columns: 1fr; } .facts div:nth-child(odd), .facts div:nth-child(even) { padding-inline: 0; border-left: 0; } .section-heading { align-items: flex-start; } .state-actions, .state-actions .button { width: 100%; } }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameDetailPage {
  private readonly route = inject(ActivatedRoute);
  readonly facade = inject(PublicGameDetailFacade);
  readonly money = formatMoney;
  readonly formatDate = formatGameDate;
  readonly statusLabel = gameStatusLabel;
  readonly statusTone = gameStatusTone;
  private readonly slug = this.route.snapshot.paramMap.get('slug') ?? '';

  constructor() {
    this.facade.load(this.slug);
  }

  reload(): void {
    this.facade.load(this.slug);
  }

  participationMessage(status: string): string {
    switch (status) {
      case 'sales_open':
        return 'Revisa la disponibilidad pública y entra al tablero real de selección para reservar con tu cuenta mientras la venta siga abierta.';
      case 'sales_closed':
        return 'Las ventas ya se cerraron. El backend prepara el juego para su inicio operativo y ya no acepta nuevas reservas.';
      case 'running':
        return 'Este juego ya está en vivo. Puedes seguir el estado publicado y el último sorteo informado, pero ya no admite nuevas participaciones.';
      case 'completed':
        return 'Este juego ya finalizó. La pantalla pública conserva el estado real, incluido el ganador si el backend ya lo publicó.';
      default:
        return 'Revisa la disponibilidad pública y espera a que la venta abra para reservar con tu cuenta.';
    }
  }

  participationButtonLabel(status: string): string {
    switch (status) {
      case 'sales_closed':
        return 'Ventas cerradas';
      case 'running':
        return 'Juego en curso';
      case 'completed':
        return 'Juego finalizado';
      default:
        return 'Ventas aún no disponibles';
    }
  }

  participationNote(status: string): string {
    switch (status) {
      case 'running':
        return 'Mientras el juego siga running, refrescamos este estado con el contrato público sin bloquear la pantalla.';
      case 'completed':
        return 'El resultado final se muestra sólo con datos públicos reales del backend.';
      default:
        return 'La reserva usa contratos reales, autenticación e idempotencia del backend.';
    }
  }

  liveHeading(status: string): string {
    switch (status) {
      case 'running':
        return 'Juego en vivo';
      case 'completed':
        return 'Juego finalizado';
      case 'sales_closed':
        return 'Esperando inicio operativo';
      case 'sales_open':
        return 'Ventas abiertas';
      default:
        return 'Estado publicado del juego';
    }
  }

  liveSummary(status: string): string {
    switch (status) {
      case 'running':
        return 'El backend público ya reporta este juego en ejecución. Aquí mostramos sólo el último estado publicado y seguimos refrescando sin recargar toda la página.';
      case 'completed':
        return 'El backend marcó este juego como completado. Si el ganador fue publicado en el contrato público, lo verás aquí.';
      case 'sales_closed':
        return 'Las ventas ya cerraron. El inicio real depende de las condiciones operativas que valida el backend al comenzar el juego.';
      case 'sales_open':
        return 'Todavía puedes participar. Cuando el backend cambie el estado a running o completed, esta vista lo reflejará.';
      default:
        return 'Este detalle usa el contrato público real del backend.';
    }
  }

  runningUpdateLabel(game: {
    schedule: { nextDrawAt: string | null; drawIntervalSeconds: number };
  }): string {
    if (game.schedule.nextDrawAt) {
      return formatGameDate(game.schedule.nextDrawAt);
    }

    return `Cada ${game.schedule.drawIntervalSeconds} segundos aproximadamente`;
  }
}
