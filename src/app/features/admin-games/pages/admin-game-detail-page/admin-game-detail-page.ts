import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Params, RouterLink } from '@angular/router';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { formatGameDate, formatMoney } from '../../../public-games/utils/public-game-display';
import { AdminGameNumbersPanel } from '../../components/admin-game-numbers-panel/admin-game-numbers-panel';
import { AdminGameDetailFacade } from '../../data-access/admin-game-detail.facade';
import { formatAdminBoolean } from '../../utils/admin-games-display';

@Component({
  selector: 'app-admin-game-detail-page',
  imports: [RouterLink, StatusBadge, AdminGameNumbersPanel],
  providers: [AdminGameDetailFacade],
  template: `
    <section class="page admin-game-detail-page">
      <a class="back-link" [routerLink]="['/admin/bingos']" [queryParams]="backQueryParams">
        <span aria-hidden="true">←</span> Volver a bingos
      </a>

      @if (facade.status() === 'loading') {
        <section class="surface-card data-state" aria-busy="true" aria-label="Cargando detalle administrativo">
          <span class="data-loader"></span>
          <h1>Cargando detalle…</h1>
          <p>Estamos consultando el juego administrativo real.</p>
        </section>
      } @else if (facade.status() === 'unauthorized') {
        <section class="surface-card data-state" role="alert">
          <h1>Necesitas iniciar sesión</h1>
          <p>{{ facade.error()?.message }}</p>
          <a class="button" routerLink="/login">Ingresar</a>
        </section>
      } @else if (facade.status() === 'forbidden') {
        <section class="surface-card data-state" role="alert">
          <h1>No tienes acceso a este juego</h1>
          <p>{{ facade.error()?.message }}</p>
        </section>
      } @else if (facade.status() === 'notFound') {
        <section class="surface-card data-state" role="alert">
          <h1>El juego no está disponible</h1>
          <p>{{ facade.error()?.message }}</p>
          <a class="button button--secondary" [routerLink]="['/admin/bingos']" [queryParams]="backQueryParams">
            Volver al listado
          </a>
        </section>
      } @else if (facade.status() === 'networkError' || facade.status() === 'unexpectedError') {
        <section class="surface-card data-state" role="alert">
          <h1>No pudimos abrir este juego</h1>
          <p>{{ facade.error()?.message }}</p>
          <button class="button" type="button" (click)="facade.retry()">Reintentar</button>
        </section>
      } @else if (facade.game(); as game) {
        <header class="page-header detail-header">
          <div>
            <p class="eyebrow">UUID real {{ game.id }}</p>
            <h1>{{ game.name }}</h1>
            <p>{{ game.description || 'Sin descripción administrativa registrada.' }}</p>
          </div>
          <div class="header-actions">
            <app-status-badge [tone]="game.status.tone">{{ game.status.label }}</app-status-badge>
            <a
              class="button button--secondary"
              [routerLink]="['/admin/bingos', game.id, 'motor']"
              [queryParams]="backQueryParams"
            >
              Abrir consola del motor
            </a>
          </div>
        </header>

        <div class="detail-grid">
          <section class="surface-card panel">
            <h2>Identificación</h2>
            <dl class="facts">
              <div><dt>Slug</dt><dd>{{ game.slug }}</dd></div>
              <div><dt>Creado por</dt><dd>{{ game.createdBy ?? 'No informado' }}</dd></div>
              <div><dt>Creado</dt><dd>{{ date(game.createdAt) }}</dd></div>
              <div><dt>Estado crudo</dt><dd>{{ game.status.value }}</dd></div>
            </dl>
          </section>

          <section class="surface-card panel">
            <h2>Reglas y precio</h2>
            <dl class="facts">
              <div><dt>Rango</dt><dd>{{ game.numberRange.min }}-{{ game.numberRange.max }}</dd></div>
              <div><dt>Aciertos requeridos</dt><dd>{{ game.numberRange.hitsRequired }}</dd></div>
              <div><dt>Precio por número</dt><dd>{{ money(game.ticketPrice.amountCents, game.ticketPrice.currency) }}</dd></div>
              <div><dt>Premio</dt><dd>{{ money(game.prize.amountCents, game.prize.currency) }}</dd></div>
            </dl>
          </section>

          <section class="surface-card panel">
            <h2>Ventas y programación</h2>
            <dl class="facts">
              <div><dt>Ventas abren</dt><dd>{{ date(game.schedule.salesOpensAt) }}</dd></div>
              <div><dt>Ventas cierran</dt><dd>{{ date(game.schedule.salesClosesAt) }}</dd></div>
              <div><dt>Inicio programado</dt><dd>{{ date(game.schedule.scheduledStartAt) }}</dd></div>
              <div><dt>Intervalo</dt><dd>{{ game.schedule.drawIntervalSeconds }} s</dd></div>
              <div><dt>Auto draw</dt><dd>{{ yesNo(game.schedule.autoDrawEnabled) }}</dd></div>
            </dl>
          </section>

          <section class="surface-card panel">
            <h2>Ciclo de vida</h2>
            <dl class="facts">
              <div><dt>Iniciado</dt><dd>{{ date(game.lifecycle.startedAt) }}</dd></div>
              <div><dt>Pausado</dt><dd>{{ date(game.lifecycle.pausedAt) }}</dd></div>
              <div><dt>Finalizado</dt><dd>{{ date(game.lifecycle.completedAt) }}</dd></div>
            </dl>
          </section>

          <section class="surface-card panel panel--wide">
            <h2>Capacidad actual</h2>
            <dl class="facts facts--numbers">
              <div><dt>Total</dt><dd>{{ game.numbers.total }}</dd></div>
              <div><dt>Disponibles</dt><dd>{{ game.numbers.available }}</dd></div>
              <div><dt>Reservados</dt><dd>{{ game.numbers.reserved }}</dd></div>
              <div><dt>Vendidos</dt><dd>{{ game.numbers.sold }}</dd></div>
            </dl>
            <p class="panel-note">
              Este detalle queda listo como contexto para futuros bloques de números o motor, sin activar todavía mutaciones.
            </p>
          </section>

          <section class="surface-card panel panel--wide">
            <h2>Configuración técnica</h2>
            <p class="panel-note">
              Se muestra la configuración real expuesta por el backend sin reinterpretarla en el navegador.
            </p>
            <pre>{{ formatSettings(game.settings) }}</pre>
          </section>

          <app-admin-game-numbers-panel [gameId]="game.id" />
        </div>
      }
    </section>
  `,
  styles: `
    .admin-game-detail-page { display: grid; gap: var(--s5); }
    .back-link {
      display: inline-flex;
      align-items: center;
      gap: .45rem;
      color: var(--color-link);
      font-weight: 750;
      text-decoration: none;
    }
    .back-link:hover {
      color: var(--color-link-hover);
      text-decoration: underline;
    }
    .detail-header p {
      margin: 0;
      color: var(--color-text-muted);
    }
    .header-actions {
      display: grid;
      gap: var(--s3);
      justify-items: end;
    }
    .detail-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: var(--s4);
    }
    .panel {
      padding: var(--s5);
    }
    .panel--wide {
      grid-column: 1 / -1;
    }
    .facts {
      display: grid;
      gap: var(--s3);
      margin: 0;
    }
    .facts div {
      display: flex;
      justify-content: space-between;
      gap: var(--s3);
      padding-bottom: var(--s3);
      border-bottom: 1px solid var(--color-border);
    }
    .facts--numbers {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
    .facts--numbers div {
      display: grid;
      justify-content: start;
    }
    dt {
      color: var(--color-text-muted);
      font-size: var(--sm);
      font-weight: 700;
    }
    dd {
      margin: 0;
      font-weight: 800;
      text-align: right;
      word-break: break-word;
    }
    .facts--numbers dd {
      text-align: left;
      font-size: var(--xl);
    }
    .panel-note {
      margin: var(--s4) 0 0;
      color: var(--color-text-muted);
    }
    pre {
      overflow: auto;
      padding: var(--s4);
      border-radius: var(--r-md);
      background: var(--color-surface-subtle);
      font: 0.85rem/1.5 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      white-space: pre-wrap;
      word-break: break-word;
    }
    @media (max-width: 52rem) {
      .detail-grid, .facts--numbers {
        grid-template-columns: 1fr;
      }
      .header-actions {
        justify-items: start;
      }
      .facts div {
        flex-direction: column;
      }
      dd {
        text-align: left;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminGameDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly facade = inject(AdminGameDetailFacade);
  readonly money = formatMoney;
  readonly date = formatGameDate;
  readonly yesNo = formatAdminBoolean;
  backQueryParams: Params = {};

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.backQueryParams = Object.fromEntries(params.keys.map((key) => [key, params.get(key)]));
    });

    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const gameId = params.get('gameId') ?? '';
      if (gameId.trim() !== '') {
        this.facade.load(gameId);
      }
    });
  }

  formatSettings(settings: unknown): string {
    return JSON.stringify(settings ?? null, null, 2);
  }
}
