import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { PublicGamesFacade } from '../../data-access/public-games.facade';
import {
  formatGameDate,
  formatMoney,
  gameStatusLabel,
  gameStatusTone,
} from '../../utils/public-game-display';

@Component({
  selector: 'app-game-catalog-page',
  imports: [RouterLink, StatusBadge],
  providers: [PublicGamesFacade],
  template: `
    <section class="catalog page">
      <header class="hero">
        <div>
          <p class="eyebrow">Bingos disponibles</p>
          <h1>Elige tu próxima oportunidad.</h1>
          <p>
            Consulta premios, fechas y condiciones directamente desde la información publicada por
            Fortuna.
          </p>
        </div>
        <div class="hero-mark" aria-hidden="true">
          <span>B</span><span>I</span><span>N</span><span>G</span><span>O</span>
        </div>
      </header>

      <div class="section-heading">
        <div>
          <h2>Juegos publicados</h2>
          <p>{{ facade.pageInfo().total }} opciones encontradas</p>
        </div>
        <app-status-badge tone="info">Información en tiempo real</app-status-badge>
      </div>

      @if (facade.status() === 'loading') {
        <div class="games-grid" aria-label="Cargando bingos" aria-busy="true">
          @for (item of [1, 2, 3]; track item) {
            <article class="surface-card skeleton"><span></span><span></span><span></span></article>
          }
        </div>
      } @else if (facade.status() === 'error') {
        <section class="surface-card state" role="alert">
          <span class="state-code">!</span>
          <h2>No pudimos cargar los bingos</h2>
          <p>{{ facade.error()?.message }}</p>
          <button class="button" type="button" (click)="facade.load()">Intentar nuevamente</button>
        </section>
      } @else if (facade.status() === 'empty') {
        <section class="surface-card state">
          <span class="state-code">0</span>
          <h2>Aún no hay juegos publicados</h2>
          <p>Vuelve pronto. Los próximos bingos aparecerán aquí.</p>
        </section>
      } @else {
        <div class="games-grid">
          @for (game of facade.games(); track game.id) {
            <article class="surface-card game-card">
              <header>
                <app-status-badge [tone]="statusTone(game.status)">
                  {{ statusLabel(game.status) }}
                </app-status-badge>
                <span class="range">{{ game.numberMin }}–{{ game.numberMax }}</span>
              </header>
              <div class="game-copy">
                <p class="game-date">{{ formatDate(game.schedule.scheduledStartAt) }}</p>
                <h2>{{ game.name }}</h2>
                <p>{{ game.description || 'Participa con reglas claras y resultados verificables.' }}</p>
              </div>
              <dl>
                <div>
                  <dt>Premio</dt>
                  <dd>{{ money(game.prize.amountCents, game.prize.currency) }}</dd>
                </div>
                <div>
                  <dt>Por número</dt>
                  <dd>{{ money(game.ticketPrice.amountCents, game.ticketPrice.currency) }}</dd>
                </div>
              </dl>
              <a class="card-link" [routerLink]="['/bingos', game.slug]">
                Ver detalles <span aria-hidden="true">→</span>
              </a>
            </article>
          }
        </div>

        @if (facade.pageInfo().lastPage > 1) {
          <nav class="pagination" aria-label="Paginación de bingos">
            <button
              class="button button--secondary"
              type="button"
              [disabled]="!facade.hasPreviousPage()"
              (click)="facade.previousPage()"
            >
              Anterior
            </button>
            <span>Página {{ facade.pageInfo().currentPage }} de {{ facade.pageInfo().lastPage }}</span>
            <button
              class="button button--secondary"
              type="button"
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
    .catalog {
      display: grid;
      gap: var(--s8);
    }
    .hero {
      display: grid;
      grid-template-columns: minmax(0, 1.2fr) minmax(16rem, 0.8fr);
      align-items: center;
      gap: var(--s8);
      padding: clamp(1.5rem, 5vw, 3.5rem);
      border-radius: var(--r-xl);
      overflow: hidden;
      background: var(--color-dark-section);
      color: var(--color-white);
    }
    .hero h1 {
      max-width: 44rem;
      margin-bottom: var(--s4);
      font-size: var(--3xl);
      line-height: 1.02;
      letter-spacing: -0.055em;
    }
    .hero p:not(.eyebrow) {
      max-width: 40rem;
      margin: 0;
      color: var(--color-neutral-300);
      font-size: var(--lg);
    }
    .hero .eyebrow {
      color: var(--color-prize);
    }
    .hero-mark {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: var(--s3);
    }
    .hero-mark span {
      display: grid;
      width: clamp(3rem, 7vw, 4.5rem);
      aspect-ratio: 1;
      place-items: center;
      border: 1px solid rgb(255 255 255 / 0.16);
      border-radius: 50%;
      background: rgb(255 255 255 / 0.08);
      color: var(--color-white);
      font-size: var(--xl);
      font-weight: 900;
    }
    .hero-mark span:last-child {
      background: var(--color-prize);
      color: var(--color-dark-section);
    }
    .section-heading {
      display: flex;
      align-items: end;
      justify-content: space-between;
      gap: var(--s4);
    }
    .section-heading h2 {
      margin-bottom: var(--s1);
      font-size: var(--xl);
    }
    .section-heading p {
      margin: 0;
      color: var(--color-text-muted);
      font-size: var(--sm);
    }
    .games-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 19rem), 1fr));
      gap: var(--s5);
    }
    .game-card {
      display: grid;
      min-height: 25rem;
      padding: var(--s5);
      transition: border-color 160ms ease, transform 160ms ease, box-shadow 160ms ease;
    }
    .game-card:hover {
      border-color: var(--color-brand-muted);
      box-shadow: var(--shadow);
      transform: translateY(-2px);
    }
    .game-card > header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--s3);
    }
    .range {
      color: var(--color-text-muted);
      font-size: var(--xs);
      font-weight: 800;
    }
    .game-copy {
      align-self: center;
      padding-block: var(--s6);
    }
    .game-date {
      margin-bottom: var(--s2);
      color: var(--color-brand);
      font-size: var(--xs);
      font-weight: 800;
      text-transform: capitalize;
    }
    .game-copy h2 {
      margin-bottom: var(--s3);
      font-size: var(--2xl);
      line-height: 1.1;
      letter-spacing: -0.035em;
    }
    .game-copy p:last-child {
      margin: 0;
      color: var(--color-text-muted);
      font-size: var(--sm);
    }
    dl {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--s3);
      padding-block: var(--s4);
      margin: 0;
      border-block: 1px solid var(--color-border);
    }
    dt {
      color: var(--color-text-muted);
      font-size: var(--xs);
    }
    dd {
      margin: var(--s1) 0 0;
      color: var(--color-dark-section);
      font-weight: 850;
    }
    dl div:first-child dd {
      color: var(--color-prize-strong);
      font-size: var(--lg);
    }
    .card-link {
      display: flex;
      align-items: center;
      justify-content: space-between;
      align-self: end;
      padding-top: var(--s4);
      color: var(--color-brand);
      font-size: var(--sm);
      font-weight: 800;
      text-decoration: none;
    }
    .skeleton {
      display: grid;
      min-height: 25rem;
      align-content: center;
      gap: var(--s4);
      padding: var(--s5);
    }
    .skeleton span {
      height: 1rem;
      border-radius: 999px;
      background: linear-gradient(
        90deg,
        var(--color-neutral-100),
        var(--color-neutral-200),
        var(--color-neutral-100)
      );
      background-size: 200% 100%;
      animation: pulse 1.3s ease infinite;
    }
    .skeleton span:nth-child(2) {
      width: 75%;
      height: 2.5rem;
    }
    .skeleton span:last-child {
      width: 55%;
    }
    .state {
      display: grid;
      justify-items: center;
      padding: clamp(2rem, 6vw, 5rem);
      text-align: center;
    }
    .state-code {
      display: grid;
      width: 3.5rem;
      aspect-ratio: 1;
      place-items: center;
      margin-bottom: var(--s4);
      border-radius: 50%;
      background: var(--color-brand-subtle);
      color: var(--color-brand);
      font-size: var(--xl);
      font-weight: 900;
    }
    .state h2 {
      margin-bottom: var(--s2);
    }
    .state p {
      max-width: 36rem;
      color: var(--color-text-muted);
    }
    .state .button {
      margin-top: var(--s3);
    }
    .pagination {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--s4);
    }
    .pagination span {
      color: var(--color-text-muted);
      font-size: var(--sm);
    }
    @keyframes pulse {
      to {
        background-position: -200% 0;
      }
    }
    @media (max-width: 48rem) {
      .hero {
        grid-template-columns: 1fr;
      }
      .hero-mark {
        justify-content: flex-start;
      }
      .section-heading {
        align-items: flex-start;
        flex-direction: column;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameCatalogPage {
  protected readonly facade = inject(PublicGamesFacade);
  protected readonly money = formatMoney;
  protected readonly formatDate = formatGameDate;
  protected readonly statusLabel = gameStatusLabel;
  protected readonly statusTone = gameStatusTone;

  constructor() {
    this.facade.load();
  }
}