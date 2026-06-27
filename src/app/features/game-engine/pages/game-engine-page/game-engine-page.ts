import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Params, Router, RouterLink } from '@angular/router';
import { combineLatest } from 'rxjs';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { formatGameDate } from '../../../public-games/utils/public-game-display';
import { GameEngineFacade } from '../../data-access/game-engine.facade';

@Component({
  selector: 'app-game-engine-page',
  imports: [ReactiveFormsModule, RouterLink, StatusBadge],
  providers: [GameEngineFacade],
  template: `
    <section class="page game-engine-page">
      <header class="page-header">
        <div>
          <p class="eyebrow">Motor administrativo</p>
          <h1>Consola contextual del juego</h1>
          <p>
            Esta fase deja la consola en modo lectura, usando el UUID real del juego y los endpoints
            administrativos auditados del backend.
          </p>
        </div>
      </header>

      @if (facade.status() === 'idle') {
        <section class="surface-card data-state">
          <h2>Abre esta consola desde un bingo real</h2>
          <p>
            La experiencia principal vive en el detalle administrativo del juego. El acceso manual por
            UUID queda solo como diagnóstico técnico secundario.
          </p>

          <form class="manual-form" (ngSubmit)="openManualContext()">
            <label for="manual-game-id">UUID del juego para diagnóstico opcional</label>
            <input
              id="manual-game-id"
              [formControl]="manualGameId"
              placeholder="UUID real del juego"
              autocomplete="off"
            />
            <button class="button" type="submit" [disabled]="manualDisabled()">Abrir contexto técnico</button>
          </form>

          <a class="button button--secondary" routerLink="/admin/bingos">Ir al listado de bingos</a>
        </section>
      } @else if (facade.status() === 'loading' || facade.status() === 'refreshing') {
        <section class="surface-card data-state" aria-busy="true" aria-live="polite">
          <span class="data-loader"></span>
          <h2>{{ facade.status() === 'loading' ? 'Cargando contexto del motor…' : 'Actualizando auditoría…' }}</h2>
          <p>Consultamos el detalle del juego y el estado operativo expuesto por Laravel.</p>
        </section>
      } @else if (facade.status() === 'unauthorized') {
        <section class="surface-card data-state" role="alert" aria-live="assertive">
          <h2>Necesitas iniciar sesión</h2>
          <p>{{ facade.error()?.message }}</p>
          <a class="button" routerLink="/login">Ingresar</a>
        </section>
      } @else if (facade.status() === 'forbidden') {
        <section class="surface-card data-state" role="alert" aria-live="assertive">
          <h2>No tienes permiso para abrir esta consola</h2>
          <p>{{ facade.error()?.message }}</p>
          <a class="button button--secondary" routerLink="/admin/bingos">Volver a bingos</a>
        </section>
      } @else if (facade.status() === 'notFound') {
        <section class="surface-card data-state" role="alert" aria-live="assertive">
          <h2>No encontramos este juego</h2>
          <p>{{ facade.error()?.message }}</p>
          <a class="button button--secondary" routerLink="/admin/bingos">Volver a bingos</a>
        </section>
      } @else if (facade.status() === 'validationError') {
        <section class="surface-card data-state" role="alert" aria-live="assertive">
          <h2>La solicitud del motor no fue aceptada</h2>
          <p>{{ facade.error()?.message }}</p>
          <button class="button" type="button" (click)="facade.refresh()">Reintentar</button>
        </section>
      } @else if (facade.status() === 'networkError' || facade.status() === 'unexpectedError') {
        <section class="surface-card data-state" role="alert" aria-live="assertive">
          <h2>No pudimos cargar la consola</h2>
          <p>{{ facade.error()?.message }}</p>
          <button class="button" type="button" (click)="facade.refresh()">Reintentar</button>
        </section>
      } @else if (facade.snapshot(); as snapshot) {
        <div class="context-actions">
          <a
            class="back-link"
            [routerLink]="['/admin/bingos', snapshot.context.id]"
            [queryParams]="backQueryParams"
          >
            <span aria-hidden="true">←</span> Volver al detalle del juego
          </a>
          <button class="button button--secondary" type="button" (click)="facade.refresh()">
            Actualizar auditoría
          </button>
        </div>

        <section class="surface-card hero">
          <div>
            <p class="eyebrow">UUID real {{ snapshot.context.id }}</p>
            <h2>{{ snapshot.context.name }}</h2>
            <p>{{ snapshot.context.description || 'Sin descripción administrativa registrada.' }}</p>
          </div>
          <app-status-badge [tone]="snapshot.context.status.tone">
            {{ snapshot.context.status.label }}
          </app-status-badge>
        </section>

        <p class="read-only-note" aria-live="polite">
          Esta integración es read-only. Las mutaciones del motor quedan fuera de Fase 3.3 hasta una
          auditoría específica.
        </p>

        <div class="summary-grid">
          <article class="surface-card panel">
            <h3>Estado operativo</h3>
            <dl class="facts">
              <div><dt>Estado</dt><dd>{{ snapshot.context.status.label }}</dd></div>
              <div><dt>Próximo draw</dt><dd>{{ date(snapshot.context.engine.nextDrawAt) }}</dd></div>
              <div><dt>Último tick</dt><dd>{{ date(snapshot.context.engine.lastConsumedTickAt) }}</dd></div>
              <div><dt>Inicio real</dt><dd>{{ date(snapshot.context.lifecycle.startedAt) }}</dd></div>
              <div><dt>Pausa</dt><dd>{{ date(snapshot.context.lifecycle.pausedAt) }}</dd></div>
              <div><dt>Fin</dt><dd>{{ date(snapshot.context.lifecycle.completedAt) }}</dd></div>
            </dl>
          </article>

          <article class="surface-card panel">
            <h3>Última extracción conocida</h3>
            @if (snapshot.context.latestDraw; as latestDraw) {
              <dl class="facts">
                <div><dt>Número</dt><dd>{{ latestDraw.number }}</dd></div>
                <div><dt>Secuencia</dt><dd>#{{ latestDraw.sequence }}</dd></div>
                <div><dt>Fecha</dt><dd>{{ date(latestDraw.drawnAt) }}</dd></div>
              </dl>
            } @else {
              <p class="empty-copy">Todavía no hay extracciones registradas en el contexto del juego.</p>
            }
          </article>

          <article class="surface-card panel">
            <h3>Ganador</h3>
            @if (winner(); as winner) {
              <dl class="facts">
                <div><dt>Usuario</dt><dd>{{ winner.userId }}</dd></div>
                <div><dt>Número</dt><dd>{{ winner.winningNumber ?? 'No informado' }}</dd></div>
                <div><dt>Secuencia</dt><dd>{{ winner.winningDrawSequence ?? 'No informada' }}</dd></div>
                <div><dt>Aciertos</dt><dd>{{ winner.winningHits }}</dd></div>
                <div><dt>Ganó</dt><dd>{{ date(winner.wonAt) }}</dd></div>
              </dl>
            } @else {
              <p class="empty-copy">El backend todavía no reporta ganador para este juego.</p>
            }
          </article>
        </div>

        <div class="audit-grid">
          <section class="surface-card panel">
            <div class="panel-header">
              <div>
                <h3>Historial de extracciones</h3>
                <p>{{ snapshot.draws.length }} registros cargados desde el endpoint admin real.</p>
              </div>
            </div>

            @if (snapshot.draws.length > 0) {
              <div class="draw-list" aria-label="Historial de extracciones">
                @for (draw of snapshot.draws; track draw.id) {
                  <article>
                    <strong>{{ draw.drawnNumber }}</strong>
                    <span>Secuencia #{{ draw.sequence }}</span>
                    <small>{{ draw.strategy }} · {{ date(draw.drawnAt) }}</small>
                  </article>
                }
              </div>
            } @else {
              <p class="empty-copy">Este juego no tiene draws administrativos aún.</p>
            }
          </section>

          <section class="surface-card panel">
            <div class="panel-header">
              <div>
                <h3>Contadores por número</h3>
                <p>{{ snapshot.counters.length }} filas cargadas desde el endpoint admin real.</p>
              </div>
            </div>

            @if (snapshot.counters.length > 0) {
              <div class="counter-list" aria-label="Contadores por número">
                @for (counter of snapshot.counters; track counter.gameNumberId) {
                  <article>
                    <div class="counter-number">
                      <strong>{{ counter.number }}</strong>
                      <app-status-badge [tone]="counter.status.tone">
                        {{ counter.status.label }}
                      </app-status-badge>
                    </div>
                    <span>{{ counter.hitsCount }} aciertos</span>
                    <small>
                      {{
                        counter.lastDrawSequence === null
                          ? 'Sin draw asociado'
                          : 'Última secuencia #' + counter.lastDrawSequence
                      }}
                    </small>
                  </article>
                }
              </div>
            } @else {
              <p class="empty-copy">No hay counters administrativos para mostrar todavía.</p>
            }
          </section>
        </div>
      }
    </section>
  `,
  styles: `
    .game-engine-page {
      display: grid;
      gap: var(--s5);
    }
    .data-state,
    .hero,
    .panel {
      padding: var(--s5);
    }
    .manual-form {
      display: grid;
      gap: var(--s3);
      max-width: 34rem;
      margin: var(--s4) 0;
    }
    label {
      font-weight: 700;
    }
    input {
      min-height: 2.75rem;
      padding: 0 .75rem;
      border: 1px solid var(--color-border);
      border-radius: var(--r-md);
      font: inherit;
    }
    .context-actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--s3);
      justify-content: space-between;
      align-items: center;
    }
    .back-link {
      color: var(--color-link);
      font-weight: 700;
      text-decoration: none;
    }
    .back-link:hover {
      color: var(--color-link-hover);
      text-decoration: underline;
    }
    .hero {
      display: flex;
      justify-content: space-between;
      gap: var(--s4);
      align-items: flex-start;
    }
    .hero h2,
    .hero p,
    .panel h3 {
      margin-top: 0;
    }
    .read-only-note {
      margin: 0;
      padding: var(--s3);
      border-radius: var(--r-md);
      background: var(--neutral-50);
      color: var(--color-text-muted);
    }
    .summary-grid,
    .audit-grid {
      display: grid;
      gap: var(--s4);
    }
    .summary-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
    .audit-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
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
      padding-bottom: var(--s2);
      border-bottom: 1px solid var(--color-border);
    }
    dt {
      color: var(--color-text-muted);
      font-size: var(--sm);
      font-weight: 700;
    }
    dd {
      margin: 0;
      text-align: right;
      font-weight: 800;
    }
    .panel-header p,
    .empty-copy {
      margin: 0;
      color: var(--color-text-muted);
    }
    .draw-list,
    .counter-list {
      display: grid;
      gap: .5rem;
      margin-top: var(--s4);
      max-height: 28rem;
      overflow: auto;
    }
    .draw-list article,
    .counter-list article {
      display: grid;
      gap: .35rem;
      padding: .75rem 0;
      border-bottom: 1px solid var(--color-border);
    }
    .counter-number {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--s3);
    }
    @media (max-width: 64rem) {
      .summary-grid,
      .audit-grid {
        grid-template-columns: 1fr;
      }
    }
    @media (max-width: 42rem) {
      .context-actions,
      .hero,
      .facts div,
      .counter-number {
        grid-template-columns: 1fr;
        display: grid;
      }
      dd {
        text-align: left;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameEnginePage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly facade = inject(GameEngineFacade);
  readonly manualGameId = new FormControl('', { nonNullable: true });
  readonly date = formatGameDate;
  readonly winner = computed(() => this.facade.snapshot()?.winner ?? this.fallbackWinner());
  backQueryParams: Params = {};

  constructor() {
    combineLatest([this.route.paramMap, this.route.queryParamMap])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(([paramMap, queryParamMap]) => {
        const filteredEntries = queryParamMap.keys
          .filter((key) => key !== 'gameId')
          .map((key) => [key, queryParamMap.get(key)]);

        this.backQueryParams = Object.fromEntries(filteredEntries);

        const routeGameId = paramMap.get('gameId')?.trim() ?? '';
        const queryGameId = queryParamMap.get('gameId')?.trim() ?? '';
        const resolvedGameId = routeGameId || queryGameId;

        this.manualGameId.setValue(resolvedGameId, { emitEvent: false });
        this.loadFromRoute(routeGameId, queryGameId);
      });
  }

  manualDisabled(): boolean {
    return this.manualGameId.value.trim() === '';
  }

  openManualContext(): void {
    const gameId = this.manualGameId.value.trim();
    if (gameId === '') {
      return;
    }

    this.router.navigate(['/admin/motor'], { queryParams: { gameId } });
  }

  private loadFromRoute(routeGameId: string, queryGameId: string): void {
    const resolvedGameId = routeGameId || queryGameId;

    if (resolvedGameId === '') {
      this.facade.clear();
      return;
    }

    this.facade.load(resolvedGameId, routeGameId !== '' ? 'contextual' : 'manual');
  }

  private fallbackWinner() {
    const winner = this.facade.snapshot()?.context.winner;
    if (winner === null || winner === undefined) {
      return null;
    }

    return {
      winnerId: winner.gameDrawId,
      gameId: this.facade.snapshot()?.context.id ?? '',
      gameEntryId: winner.gameDrawId,
      gameNumberId: winner.gameNumberId,
      winningNumber: winner.winningNumber,
      gameDrawId: winner.gameDrawId,
      winningDrawSequence: winner.winningDrawSequence,
      winningHits: winner.winningHits,
      userId: winner.userId,
      wonAt: winner.wonAt,
    };
  }
}
