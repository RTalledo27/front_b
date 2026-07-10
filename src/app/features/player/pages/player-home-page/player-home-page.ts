import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PlayerCommerceViewStatus } from '../../../player-commerce/models/player-commerce-view.models';
import {
  commerceStatusTone,
  orderStatusLabel,
} from '../../../player-commerce/utils/player-commerce-display';
import { formatGameDate, formatMoney } from '../../../public-games/utils/public-game-display';
import { AppIcon } from '../../../../shared/ui/app-icon/app-icon';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { PlayerHomeFacade } from '../../data-access/player-home.facade';

@Component({
  selector: 'app-player-home-page',
  imports: [RouterLink, AppIcon, StatusBadge],
  providers: [PlayerHomeFacade],
  template: `<section class="page player-home">
    <header class="hero surface-card">
      <div class="hero__copy">
        <p class="eyebrow">Hola, {{ facade.user()?.name ?? 'jugador' }}</p>
        <h1>Tu actividad real en Fortuna</h1>
        <p>
          Esta home se compone con tus órdenes, reservas y cartones reales del backend, sin
          métricas inventadas.
        </p>

        <div class="hero__actions">
          <a class="button" routerLink="/bingos">Explorar bingos</a>
          <a class="button button--secondary" routerLink="/jugador/compras">Ver mis órdenes</a>
        </div>
      </div>

      <div class="hero__account">
        <h2>Tu cuenta</h2>

        <dl>
          <div>
            <dt>Correo</dt>
            <dd>{{ facade.user()?.email ?? 'No disponible' }}</dd>
          </div>

          <div>
            <dt>Perfil</dt>
            <dd>Jugador</dd>
          </div>

          <div>
            <dt>Verificación</dt>
            <dd>
              <app-status-badge [tone]="facade.user()?.emailVerified ? 'success' : 'warning'">
                {{ facade.user()?.emailVerified ? 'Correo verificado' : 'Correo pendiente' }}
              </app-status-badge>
            </dd>
          </div>
        </dl>

        @if (!(facade.user()?.emailVerified ?? false)) {
          <a class="button button--secondary" routerLink="/verifica-tu-correo">
            Verificar mi correo
          </a>
        }
      </div>
    </header>

    @if (facade.pageStatus() === 'loading') {
      <section class="surface-card data-state" aria-busy="true" aria-live="polite">
        <span class="data-loader"></span>
        <p>Cargando tu actividad real…</p>
      </section>
    } @else {
      @if (facade.pageStatus() === 'partial') {
        <section class="surface-card notice notice--info" aria-live="polite">
          <h2>Carga parcial</h2>
          <p>
            Pudimos recuperar parte de tu actividad, pero no todo. Falló:
            {{ facade.failedSections().join(', ') }}.
          </p>
        </section>
      }

      @if (
        facade.pageStatus() === 'unauthorized' ||
        facade.pageStatus() === 'forbidden' ||
        facade.pageStatus() === 'networkError' ||
        facade.pageStatus() === 'unexpectedError'
      ) {
        <section class="surface-card data-state" role="alert">
          <h2>No pudimos construir tu home real</h2>
          <p>{{ facade.primaryErrorMessage() }}</p>
          <button class="button" type="button" (click)="facade.load()">Reintentar</button>
        </section>
      } @else if (facade.pageStatus() === 'empty') {
        <section class="surface-card data-state">
          <h2>Aún no tienes actividad disponible</h2>
          <p>
            Cuando registres órdenes, reservas activas o cartones confirmados, aparecerán aquí con
            datos reales.
          </p>
          <a class="button" routerLink="/bingos">Explorar bingos</a>
        </section>
      } @else {
        @if (facade.runningGames().length) {
          <section class="surface-card live-games" aria-label="Juegos en vivo del jugador">
            <header>
              <div>
                <p class="eyebrow">Juego en vivo</p>
                <h2>Tienes actividad en ejecución</h2>
              </div>
              <a class="button button--secondary" routerLink="/jugador/cartones">Abrir cartones</a>
            </header>

            <div class="live-games__grid">
              @for (game of facade.runningGames(); track game.id) {
                <article class="live-games__card">
                  <div>
                    <strong>{{ game.name }}</strong>
                    <p>
                      @if (game.latestDraw; as latestDraw) {
                        Último número sorteado: {{ latestDraw.number }} · sorteo #{{ latestDraw.sequence }}
                      } @else {
                        El juego ya está corriendo, pero el backend todavía no publicó un último sorteo.
                      }
                    </p>
                  </div>
                  <div class="live-games__meta">
                    <app-status-badge tone="info">Juego en vivo</app-status-badge>
                    <small>
                      {{
                        game.schedule.nextDrawAt
                          ? 'Próxima referencia ' + date(game.schedule.nextDrawAt)
                          : 'Actualización pública cada ' + game.schedule.drawIntervalSeconds + ' s'
                      }}
                    </small>
                  </div>
                  <div class="live-games__actions">
                    <a [routerLink]="['/bingos', game.slug]">Ver juego</a>
                    <a routerLink="/jugador/cartones">Ver mis cartones</a>
                  </div>
                </article>
              }
            </div>
          </section>
        }

        <section class="summary-grid" aria-label="Resumen de actividad real">
          <article class="surface-card summary-card">
            <p class="eyebrow">Órdenes</p>
            <strong>{{ facade.ordersTotal() }}</strong>
            <p>
              @if (facade.latestOrder(); as order) {
                Última orden {{ money(order.totalCents, order.currency) }} ·
                {{ orderLabel(order.status) }}
              } @else if (facade.ordersStatus() === 'empty') {
                Sin órdenes registradas.
              } @else {
                {{ sectionErrorMessage(facade.ordersStatus(), facade.ordersError()?.message) }}
              }
            </p>
            <a routerLink="/jugador/compras">Abrir órdenes <app-icon name="arrow" /></a>
          </article>

          <article class="surface-card summary-card">
            <p class="eyebrow">Reservas activas</p>
            <strong>{{ facade.reservationsTotal() }}</strong>
            <p>
              @if (facade.latestReservation(); as reservation) {
                N.º {{ reservation.gameNumber.number }} ·
                {{ reservation.gameNumber.game?.name ?? 'Juego sin nombre disponible' }}
              } @else if (facade.reservationsStatus() === 'empty') {
                Sin reservas activas.
              } @else {
                {{ sectionErrorMessage(facade.reservationsStatus(), facade.reservationsError()?.message) }}
              }
            </p>
            <a routerLink="/jugador/reservas">Abrir reservas <app-icon name="arrow" /></a>
          </article>

          <article class="surface-card summary-card">
            <p class="eyebrow">Cartones confirmados</p>
            <strong>{{ facade.entriesTotal() }}</strong>
            <p>
              @if (facade.latestEntry(); as entry) {
                @if (entry.gameNumber !== null) {
                  N.º {{ entry.gameNumber.number }}
                } @else {
                  Número no disponible
                }
                · {{ entry.game?.name ?? 'Juego sin nombre disponible' }}
                @if (entry.liveProgress?.hitsRequired !== null) {
                  · {{ entry.liveProgress?.hitsCurrent }}/{{ entry.liveProgress?.hitsRequired }} aciertos
                }
              } @else if (facade.entriesStatus() === 'empty') {
                Sin cartones confirmados.
              } @else {
                {{ sectionErrorMessage(facade.entriesStatus(), facade.entriesError()?.message) }}
              }
            </p>
            <a routerLink="/jugador/cartones">Abrir cartones <app-icon name="arrow" /></a>
          </article>
        </section>

        <section class="content-grid">
          <article class="surface-card detail-card">
            <header>
              <div>
                <p class="eyebrow">Órdenes recientes</p>
                <h2>Estado real de compras</h2>
              </div>
              <a class="button button--secondary" routerLink="/jugador/compras">Ver todas</a>
            </header>

            @if (facade.ordersStatus() === 'loaded') {
              <div class="list">
                @for (order of facade.orders(); track order.id) {
                  <a class="list-row" [routerLink]="['/jugador/compras', order.id]">
                    <div>
                      <strong>{{ money(order.totalCents, order.currency) }}</strong>
                      <p>{{ order.itemCount }} {{ order.itemCount === 1 ? 'número' : 'números' }}</p>
                    </div>
                    <div class="list-row__meta">
                      <app-status-badge [tone]="tone(order.status)">
                        {{ orderLabel(order.status) }}
                      </app-status-badge>
                      <small>{{ order.createdAt ? date(order.createdAt) : 'Sin fecha registrada' }}</small>
                    </div>
                  </a>
                }
              </div>
            } @else {
              <div class="panel-state">
                <p>{{ sectionBody('órdenes', facade.ordersStatus(), facade.ordersError()?.message) }}</p>
                @if (isErrorStatus(facade.ordersStatus())) {
                  <button class="button button--secondary" type="button" (click)="facade.reloadOrders()">
                    Reintentar órdenes
                  </button>
                }
              </div>
            }
          </article>

          <article class="surface-card detail-card">
            <header>
              <div>
                <p class="eyebrow">Reservas activas</p>
                <h2>Números apartados</h2>
              </div>
              <a class="button button--secondary" routerLink="/jugador/reservas">Ver todas</a>
            </header>

            @if (facade.reservationsStatus() === 'loaded') {
              <div class="list">
                @for (reservation of facade.reservations(); track reservation.id) {
                  <a class="list-row" routerLink="/jugador/reservas">
                    <div>
                      <strong>N.º {{ reservation.gameNumber.number }}</strong>
                      <p>{{ reservation.gameNumber.game?.name ?? 'Juego sin nombre disponible' }}</p>
                    </div>
                    <div class="list-row__meta">
                      <app-status-badge [tone]="tone(reservation.order.status)">
                        {{ orderLabel(reservation.order.status) }}
                      </app-status-badge>
                      <small>
                        {{
                          reservation.order.expiresAt
                            ? 'Vence ' + date(reservation.order.expiresAt)
                            : 'Sin vencimiento visible'
                        }}
                      </small>
                    </div>
                  </a>
                }
              </div>
            } @else {
              <div class="panel-state">
                <p>
                  {{
                    sectionBody(
                      'reservas activas',
                      facade.reservationsStatus(),
                      facade.reservationsError()?.message
                    )
                  }}
                </p>
                @if (isErrorStatus(facade.reservationsStatus())) {
                  <button
                    class="button button--secondary"
                    type="button"
                    (click)="facade.reloadReservations()"
                  >
                    Reintentar reservas
                  </button>
                }
              </div>
            }
          </article>

          <article class="surface-card detail-card">
            <header>
              <div>
                <p class="eyebrow">Cartones confirmados</p>
                <h2>Entradas reales del jugador</h2>
              </div>
              <a class="button button--secondary" routerLink="/jugador/cartones">Ver todos</a>
            </header>

            @if (facade.entriesStatus() === 'loaded') {
              <div class="list">
                @for (entry of facade.entries(); track entry.id) {
                  <a class="list-row" routerLink="/jugador/cartones">
                    <div>
                      <strong>
                        {{
                          entry.gameNumber !== null
                            ? 'N.º ' + entry.gameNumber.number
                            : 'Número no disponible'
                        }}
                      </strong>
                      <p>{{ entry.game?.name ?? 'Juego sin nombre disponible' }}</p>
                      @if (entry.liveProgress?.hitsRequired !== null) {
                        <p>{{ entry.liveProgress?.hitsCurrent }}/{{ entry.liveProgress?.hitsRequired }} aciertos reales</p>
                      }
                    </div>
                    <div class="list-row__meta">
                      <app-status-badge
                        [tone]="
                          entry.status === 'winner'
                            ? 'success'
                            : entry.status === 'cancelled'
                              ? 'danger'
                              : 'info'
                        "
                      >
                        {{ entryStatusLabel(entry.status) }}
                      </app-status-badge>
                      <small>
                        {{
                          entry.confirmedAt
                            ? date(entry.confirmedAt)
                            : 'Sin confirmación visible'
                        }}
                      </small>
                    </div>
                  </a>
                }
              </div>
            } @else {
              <div class="panel-state">
                <p>{{ sectionBody('cartones', facade.entriesStatus(), facade.entriesError()?.message) }}</p>
                @if (isErrorStatus(facade.entriesStatus())) {
                  <button class="button button--secondary" type="button" (click)="facade.reloadEntries()">
                    Reintentar cartones
                  </button>
                }
              </div>
            }
          </article>
        </section>
      }
    }
  </section>`,
  styles: `
    .player-home {
      display: grid;
      gap: var(--s5);
      max-width: 84rem;
    }

    .hero {
      display: grid;
      grid-template-columns: minmax(0, 1.4fr) minmax(18rem, 0.8fr);
      gap: var(--s5);
      min-width: 0;
      padding: clamp(1.25rem, 3vw, 2rem);
    }

    .hero__copy,
    .hero__account,
    .hero__account dl,
    .live-games,
    .summary-card,
    .detail-card,
    .data-state,
    .panel-state,
    .notice {
      display: grid;
      gap: var(--s3);
      min-width: 0;
    }

    .hero h1,
    .hero h2,
    .hero p,
    .hero dl,
    .summary-card p,
    .detail-card p {
      margin: 0;
    }

    .hero__copy p:last-of-type,
    .hero__account dt,
    .summary-card p,
    .detail-card p,
    .list-row p,
    .list-row small,
    .panel-state p,
    .notice p {
      color: var(--color-text-muted);
    }

    .hero__actions,
    .detail-card header {
      display: flex;
      flex-wrap: wrap;
      gap: var(--s3);
    }

    .hero__actions {
      margin-top: var(--s2);
    }

    .hero__account dd {
      margin: 0.2rem 0 0;
      overflow-wrap: anywhere;
    }

    .summary-grid,
    .content-grid,
    .live-games__grid,
    .list {
      display: grid;
      gap: var(--s4);
    }

    .live-games {
      padding: var(--s5);
    }

    .live-games header,
    .live-games__actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--s3);
      justify-content: space-between;
      align-items: flex-start;
    }

    .live-games__grid {
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 17rem), 1fr));
    }

    .live-games__card {
      display: grid;
      gap: var(--s3);
      min-width: 0;
      padding: var(--s4);
      border-radius: var(--r-lg);
      background: var(--color-surface-subtle);
    }

    .live-games__card strong,
    .live-games__card p,
    .live-games__card small {
      margin: 0;
    }

    .live-games__meta {
      display: grid;
      gap: var(--s2);
    }

    .live-games__actions a {
      color: var(--color-link);
      font-weight: 750;
    }

    .summary-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .content-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
      align-items: start;
    }

    .summary-card,
    .detail-card,
    .data-state,
    .notice {
      padding: var(--s5);
    }

    .summary-card strong {
      font-size: clamp(1.8rem, 4vw, 2.4rem);
      letter-spacing: -0.04em;
    }

    .summary-card a,
    .list-row {
      display: inline-flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--s3);
      min-width: 0;
      text-decoration: none;
    }

    .summary-card a {
      color: var(--color-link);
    }

    .detail-card header {
      align-items: flex-start;
      justify-content: space-between;
    }

    .detail-card h2 {
      margin: 0;
      font-size: var(--xl);
    }

    .list-row {
      padding: var(--s3);
      border-radius: var(--r-md);
      background: var(--color-surface-subtle);
      overflow-wrap: anywhere;
    }

    .list-row strong,
    .list-row p,
    .list-row small {
      display: block;
    }

    .list-row__meta {
      display: grid;
      gap: var(--s2);
      min-width: 0;
      justify-items: end;
      text-align: right;
    }

    .notice--info {
      border-left: 4px solid var(--color-link);
    }

    @media (max-width: 72rem) {
      .content-grid {
        grid-template-columns: 1fr;
      }

      .summary-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 52rem) {
      .hero,
      .summary-grid {
        grid-template-columns: 1fr;
      }

      .list-row {
        flex-direction: column;
        align-items: flex-start;
      }

      .list-row__meta {
        justify-items: start;
        text-align: left;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerHomePage {
  readonly facade = inject(PlayerHomeFacade);
  readonly money = formatMoney;
  readonly date = formatGameDate;
  readonly tone = commerceStatusTone;
  readonly orderLabel = orderStatusLabel;

  constructor() {
    this.facade.load();
  }

  entryStatusLabel(status: 'confirmed' | 'winner' | 'cancelled'): string {
    if (status === 'winner') {
      return 'Ganador';
    }

    if (status === 'cancelled') {
      return 'Cancelado';
    }

    return 'Confirmado';
  }

  isErrorStatus(status: PlayerCommerceViewStatus): boolean {
    return (
      status === 'unauthorized' ||
      status === 'forbidden' ||
      status === 'networkError' ||
      status === 'unexpectedError' ||
      status === 'notFound'
    );
  }

  sectionErrorMessage(status: PlayerCommerceViewStatus, message: string | null | undefined): string {
    if (status === 'empty') {
      return 'Sin datos registrados todavía.';
    }

    return message ?? 'No pudimos cargar este bloque.';
  }

  sectionBody(
    label: string,
    status: PlayerCommerceViewStatus,
    message: string | null | undefined,
  ): string {
    if (status === 'empty') {
      return `Aún no tienes ${label} para mostrar en esta home.`;
    }

    return message ?? `No pudimos recuperar tus ${label} desde el backend.`;
  }
}
