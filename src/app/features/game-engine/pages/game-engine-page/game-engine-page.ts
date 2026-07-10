import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
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
  host: {
    '(keydown.escape)': 'closeAnyConfirmation()',
  },
  template: `
    <section class="page game-engine-page">
      <header class="page-header">
        <div>
          <p class="eyebrow">Motor administrativo</p>
          <h1>Consola contextual del juego</h1>
          <p>
            Esta fase habilita transiciones auditadas del motor usando el UUID real del juego y
            mantiene rebuild counters como herramienta técnica secundaria, separada de las
            mutaciones operativas principales.
          </p>
        </div>
      </header>

      @if (facade.status() === 'idle') {
        <section class="surface-card data-state">
          <h2>Abre esta consola desde el detalle de un bingo real</h2>
          <p>
            El flujo principal vive en <code>/admin/bingos/:gameId</code>, donde ya viaja el contexto
            real del juego. Este acceso técnico existe solo para soporte o diagnóstico puntual.
          </p>

          <div class="empty-actions">
            <a class="button" routerLink="/admin/bingos">Ir al listado de bingos</a>
            <p class="technical-hint">
              Si necesitas revisar un UUID específico fuera del flujo principal, puedes abrir un
              contexto técnico secundario aquí abajo.
            </p>
          </div>

          <form class="manual-form manual-form--secondary" (ngSubmit)="openManualContext()">
            <label for="manual-game-id">UUID del juego para diagnóstico técnico opcional</label>
            <input
              id="manual-game-id"
              [formControl]="manualGameId"
              placeholder="UUID real del juego"
              autocomplete="off"
            />
            <button class="button button--secondary" type="submit" [disabled]="manualDisabled()">
              Abrir contexto técnico
            </button>
          </form>
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
            <dl class="hero-meta">
              <div><dt>Slug</dt><dd>{{ snapshot.context.slug }}</dd></div>
              <div><dt>Estado</dt><dd>{{ snapshot.context.status.label }}</dd></div>
              <div><dt>Acceso</dt><dd>{{ accessModeLabel() }}</dd></div>
            </dl>
          </div>
          <app-status-badge [tone]="snapshot.context.status.tone">
            {{ snapshot.context.status.label }}
          </app-status-badge>
        </section>

        @if (showEngineControls()) {
          <section class="surface-card start-panel" aria-live="polite">
            <div class="start-panel__header">
              <div>
                <h3>Operaciones del motor habilitadas</h3>
                <p>
                  El backend permite iniciar, pausar, reanudar o sortear un número solo cuando el
                  snapshot real y las transiciones auditadas lo soportan.
                </p>
              </div>
            </div>

            <div class="command-actions">
              @if (canStartGame()) {
                <button
                  #openStartButton
                  class="button"
                  type="button"
                  [disabled]="facade.startStatus() === 'submitting'"
                  (click)="openStartConfirmation()"
                >
                  {{ facade.startStatus() === 'submitting' ? 'Iniciando…' : 'Iniciar juego' }}
                </button>
              }

              @if (canPauseGame()) {
                <button
                  #openPauseButton
                  class="button"
                  type="button"
                  [disabled]="facade.pauseStatus() === 'submitting'"
                  (click)="openPauseConfirmation()"
                >
                  {{ facade.pauseStatus() === 'submitting' ? 'Pausando…' : 'Pausar juego' }}
                </button>
              }

              @if (canResumeGame()) {
                <button
                  #openResumeButton
                  class="button"
                  type="button"
                  [disabled]="facade.resumeStatus() === 'submitting'"
                  (click)="openResumeConfirmation()"
                >
                  {{ facade.resumeStatus() === 'submitting' ? 'Reanudando…' : 'Reanudar juego' }}
                </button>
              }

              @if (canDrawNumber()) {
                <button
                  #openDrawButton
                  class="button"
                  type="button"
                  [disabled]="facade.drawStatus() === 'submitting'"
                  (click)="openDrawConfirmation()"
                >
                  {{ facade.drawStatus() === 'submitting' ? 'Sorteando…' : 'Sortear número' }}
                </button>
              }
            </div>

            @if (showStartConfirmation()) {
              <div class="confirm-box" role="alertdialog" aria-labelledby="start-confirm-title" aria-modal="false">
                <h4 id="start-confirm-title">Confirmar inicio del juego</h4>
                <p>
                  Esta acción cambia el estado del bingo a ejecución. Se usará el UUID real del contexto y
                  no se enviará ninguna otra mutación.
                </p>
                <div class="confirm-box__actions">
                  <button
                    #confirmStartButton
                    class="button"
                    type="button"
                    [disabled]="facade.startStatus() === 'submitting'"
                    (click)="startGame()"
                  >
                    Confirmar inicio
                  </button>
                  <button
                    class="button button--secondary"
                    type="button"
                    [disabled]="facade.startStatus() === 'submitting'"
                    (click)="closeStartConfirmation()"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            }

            @if (showPauseConfirmation()) {
              <div class="confirm-box" role="alertdialog" aria-labelledby="pause-confirm-title" aria-modal="false">
                <h4 id="pause-confirm-title">Confirmar pausa del juego</h4>
                <p>
                  Esta acción detiene la automatización del motor, conservará el último tick consumido y
                  limpiará el próximo draw programado.
                </p>
                <div class="confirm-box__actions">
                  <button
                    #confirmPauseButton
                    class="button"
                    type="button"
                    [disabled]="facade.pauseStatus() === 'submitting'"
                    (click)="pauseGame()"
                  >
                    Confirmar pausa
                  </button>
                  <button
                    class="button button--secondary"
                    type="button"
                    [disabled]="facade.pauseStatus() === 'submitting'"
                    (click)="closePauseConfirmation()"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            }

            @if (showResumeConfirmation()) {
              <div class="confirm-box" role="alertdialog" aria-labelledby="resume-confirm-title" aria-modal="false">
                <h4 id="resume-confirm-title">Confirmar reanudación del juego</h4>
                <p>
                  Esta acción devuelve el juego a ejecución y recalcula el próximo draw automático con la
                  grilla real del backend.
                </p>
                <div class="confirm-box__actions">
                  <button
                    #confirmResumeButton
                    class="button"
                    type="button"
                    [disabled]="facade.resumeStatus() === 'submitting'"
                    (click)="resumeGame()"
                  >
                    Confirmar reanudación
                  </button>
                  <button
                    class="button button--secondary"
                    type="button"
                    [disabled]="facade.resumeStatus() === 'submitting'"
                    (click)="closeResumeConfirmation()"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            }

            @if (showDrawConfirmation()) {
              <div class="confirm-box" role="alertdialog" aria-labelledby="draw-confirm-title" aria-modal="false">
                <h4 id="draw-confirm-title">Confirmar sorteo manual</h4>
                <p>
                  Esta acción ejecuta una extracción sensible sobre el juego en curso. Se enviará el
                  UUID real del contexto junto con un command id idempotente para evitar duplicados en
                  reintentos de red.
                </p>
                <div class="confirm-box__actions">
                  <button
                    #confirmDrawButton
                    class="button"
                    type="button"
                    [disabled]="facade.drawStatus() === 'submitting'"
                    (click)="drawNumber()"
                  >
                    Confirmar sorteo
                  </button>
                  <button
                    class="button button--secondary"
                    type="button"
                    [disabled]="facade.drawStatus() === 'submitting'"
                    (click)="closeDrawConfirmation()"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            }

            @if (facade.startStatus() === 'success' && facade.startResult(); as startResult) {
              <p class="feedback feedback--success" role="status">
                {{
                  startResult.outcome === 'already_started'
                    ? 'El backend confirmó que el juego ya estaba iniciado.'
                    : 'El juego se inició correctamente y el contexto se está refrescando.'
                }}
              </p>
            } @else if (facade.startError()) {
              <p class="feedback feedback--error" role="alert">
                {{ startErrorMessage() }}
              </p>
            }

            @if (facade.pauseStatus() === 'success' && facade.pauseResult(); as pauseResult) {
              <p class="feedback feedback--success" role="status">
                {{
                  pauseResult.outcome === 'already_paused'
                    ? 'El backend confirmó que el juego ya estaba pausado.'
                    : 'El juego se pausó correctamente y el contexto se está refrescando.'
                }}
              </p>
            } @else if (facade.pauseError()) {
              <p class="feedback feedback--error" role="alert">
                {{ pauseErrorMessage() }}
              </p>
            }

            @if (facade.resumeStatus() === 'success' && facade.resumeResult(); as resumeResult) {
              <p class="feedback feedback--success" role="status">
                {{
                  resumeResult.outcome === 'already_running'
                    ? 'El backend confirmó que el juego ya estaba en ejecución.'
                    : 'El juego se reanudó correctamente y el contexto se está refrescando.'
                }}
              </p>
            } @else if (facade.resumeError()) {
              <p class="feedback feedback--error" role="alert">
                {{ resumeErrorMessage() }}
              </p>
            }

            @if (facade.drawStatus() === 'success' && facade.drawResult(); as drawResult) {
              <p class="feedback feedback--success" role="status">
                {{
                  drawResult.replay
                    ? 'El backend confirmó el replay del mismo sorteo manual y el contexto se está refrescando.'
                    : 'Se sorteó el número ' +
                      drawResult.drawnNumber +
                      ' y el contexto se está refrescando.'
                }}
              </p>
            } @else if (facade.drawError()) {
              <p class="feedback feedback--error" role="alert">
                {{ drawErrorMessage() }}
              </p>
            }
          </section>
        }

                <p class="read-only-note" aria-live="polite">
          Las acciones operativas y las herramientas técnicas se separan visualmente. Rebuild
          counters solo aparece cuando el contrato backend real la soporta de forma explícita.
        </p>

        @if (showTechnicalTools()) {
          <section class="surface-card technical-panel" aria-live="polite">
            <div class="technical-panel__header">
              <div>
                <h3>Herramientas técnicas</h3>
                <p>
                  Estas acciones recalculan proyecciones derivadas desde el historial real de
                  Laravel. No forman parte del flujo operativo principal del juego.
                </p>
              </div>
            </div>

            <div class="technical-actions">
              @if (canRebuildCounters()) {
                <button
                  #openRebuildButton
                  class="button button--secondary"
                  type="button"
                  [disabled]="facade.rebuildStatus() === 'submitting'"
                  (click)="openRebuildConfirmation()"
                >
                  {{
                    facade.rebuildStatus() === 'submitting'
                      ? 'Reconstruyendo…'
                      : 'Reconstruir counters'
                  }}
                </button>
              }
            </div>

            @if (showRebuildConfirmation()) {
              <div
                class="confirm-box technical-confirm-box"
                role="alertdialog"
                aria-labelledby="rebuild-confirm-title"
                aria-modal="false"
              >
                <h4 id="rebuild-confirm-title">Confirmar reconstrucción técnica</h4>
                <p>
                  Esta acción recalcula game_number_counters desde game_draws sin modificar
                  draws, winner ni estados del juego. Úsala solo como herramienta administrativa
                  secundaria.
                </p>
                <div class="confirm-box__actions">
                  <button
                    #confirmRebuildButton
                    class="button"
                    type="button"
                    [disabled]="facade.rebuildStatus() === 'submitting'"
                    (click)="rebuildCounters()"
                  >
                    Confirmar reconstrucción
                  </button>
                  <button
                    class="button button--secondary"
                    type="button"
                    [disabled]="facade.rebuildStatus() === 'submitting'"
                    (click)="closeRebuildConfirmation()"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            }

            @if (facade.rebuildStatus() === 'success' && facade.rebuildResult(); as rebuildResult) {
              <p class="feedback feedback--success" role="status">
                {{
                  rebuildResult.outcome === 'already_consistent'
                    ? 'Laravel confirmó que los counters ya estaban consistentes.'
                    : 'Laravel reconstruyó ' +
                      rebuildResult.rebuiltRows +
                      ' counters con ' +
                      rebuildResult.rebuiltHitsTotal +
                      ' hits acumulados.'
                }}
              </p>
            } @else if (facade.rebuildError()) {
              <p class="feedback feedback--error" role="alert">
                {{ rebuildErrorMessage() }}
              </p>
            }
          </section>
        }

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
                <p>
                  Mostrando {{ snapshot.draws.length }} de {{ snapshot.drawsPageInfo.total }}
                  registros del endpoint admin real.
                </p>
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
              @if (snapshot.drawsPageInfo.lastPage > 1) {
                <nav class="pager" aria-label="Paginación de extracciones">
                  <button
                    class="button button--secondary"
                    type="button"
                    [disabled]="snapshot.drawsPageInfo.currentPage === 1 || facade.status() === 'refreshing'"
                    (click)="facade.loadDrawsPage(snapshot.drawsPageInfo.currentPage - 1)"
                  >
                    Anterior
                  </button>
                  <span>
                    Página {{ snapshot.drawsPageInfo.currentPage }} de
                    {{ snapshot.drawsPageInfo.lastPage }}
                  </span>
                  <button
                    class="button button--secondary"
                    type="button"
                    [disabled]="
                      snapshot.drawsPageInfo.currentPage >= snapshot.drawsPageInfo.lastPage ||
                      facade.status() === 'refreshing'
                    "
                    (click)="facade.loadDrawsPage(snapshot.drawsPageInfo.currentPage + 1)"
                  >
                    Siguiente
                  </button>
                </nav>
              }
            } @else {
              <p class="empty-copy">Este juego no tiene draws administrativos aún.</p>
            }
          </section>

          <section class="surface-card panel">
            <div class="panel-header">
              <div>
                <h3>Contadores por número</h3>
                <p>
                  Mostrando {{ snapshot.counters.length }} de {{ snapshot.countersPageInfo.total }}
                  filas del endpoint admin real.
                </p>
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
              @if (snapshot.countersPageInfo.lastPage > 1) {
                <nav class="pager" aria-label="Paginación de counters">
                  <button
                    class="button button--secondary"
                    type="button"
                    [disabled]="snapshot.countersPageInfo.currentPage === 1 || facade.status() === 'refreshing'"
                    (click)="facade.loadCountersPage(snapshot.countersPageInfo.currentPage - 1)"
                  >
                    Anterior
                  </button>
                  <span>
                    Página {{ snapshot.countersPageInfo.currentPage }} de
                    {{ snapshot.countersPageInfo.lastPage }}
                  </span>
                  <button
                    class="button button--secondary"
                    type="button"
                    [disabled]="
                      snapshot.countersPageInfo.currentPage >= snapshot.countersPageInfo.lastPage ||
                      facade.status() === 'refreshing'
                    "
                    (click)="facade.loadCountersPage(snapshot.countersPageInfo.currentPage + 1)"
                  >
                    Siguiente
                  </button>
                </nav>
              }
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
    .panel,
    .start-panel {
      min-width: 0;
      max-width: 100%;
      padding: var(--s5);
    }
    .manual-form {
      display: grid;
      gap: var(--s3);
      min-width: 0;
      max-width: 34rem;
      margin: var(--s4) 0;
    }
    .manual-form--secondary {
      padding-top: var(--s4);
      border-top: 1px dashed var(--color-border);
    }
    .empty-actions {
      display: grid;
      gap: var(--s3);
      justify-items: start;
    }
    .technical-hint {
      margin: 0;
      max-width: 50rem;
      color: var(--color-text-muted);
      overflow-wrap: anywhere;
    }
    label {
      font-weight: 700;
    }
    input {
      box-sizing: border-box;
      width: 100%;
      max-width: 100%;
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
    .context-actions > * {
      min-width: 0;
    }
    .back-link {
      color: var(--color-link);
      font-weight: 700;
      text-decoration: none;
      overflow-wrap: anywhere;
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
    .hero > *,
    .start-panel__header > *,
    .technical-panel__header > *,
    .summary-grid > *,
    .audit-grid > * {
      min-width: 0;
    }
    .hero h2,
    .hero p,
    .panel h3,
    .start-panel h3,
    .start-panel p {
      margin-top: 0;
      overflow-wrap: anywhere;
    }
    .start-panel {
      display: grid;
      gap: var(--s3);
    }
    .hero-meta {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: var(--s3);
      margin: var(--s4) 0 0;
    }
    .hero-meta div {
      padding: var(--s3);
      border: 1px solid var(--color-border);
      border-radius: var(--r-md);
      background: var(--neutral-50);
    }
    .hero-meta dd {
      margin-top: .25rem;
      text-align: left;
    }
    .technical-panel {
      display: grid;
      gap: var(--s3);
      border: 1px dashed var(--color-border);
    }
    .start-panel__header {
      display: flex;
      gap: var(--s4);
      justify-content: space-between;
      align-items: flex-start;
    }
    .command-actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--s3);
    }
    .technical-panel__header {
      display: flex;
      gap: var(--s4);
      justify-content: space-between;
      align-items: flex-start;
    }
    .technical-actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--s3);
    }
    .confirm-box {
      padding: var(--s4);
      border: 1px solid var(--color-border);
      border-radius: var(--r-md);
      background: var(--neutral-50);
    }
    .technical-confirm-box {
      background: #fff7ed;
    }
    .confirm-box h4,
    .confirm-box p {
      margin-top: 0;
    }
    .confirm-box__actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--s3);
    }
    .feedback {
      margin: 0;
      padding: var(--s3);
      border-radius: var(--r-md);
    }
    .feedback--success {
      background: #ecfdf3;
      color: #067647;
    }
    .feedback--error {
      background: #fff1f0;
      color: #b42318;
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
      overflow-wrap: anywhere;
      word-break: break-word;
    }
    .panel-header p,
    .empty-copy {
      margin: 0;
      color: var(--color-text-muted);
      overflow-wrap: anywhere;
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
    .pager {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--s3);
      margin-top: var(--s4);
    }
    .pager span {
      color: var(--color-text-muted);
      font-size: var(--sm);
      font-weight: 700;
    }
    .counter-number {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--s3);
    }
    @media (max-width: 64rem) {
      .summary-grid,
      .audit-grid,
      .hero-meta {
        grid-template-columns: 1fr;
      }
    }
    @media (max-width: 42rem) {
      .context-actions,
      .hero,
      .facts div,
      .counter-number,
      .start-panel__header,
      .technical-panel__header,
      .command-actions,
      .technical-actions,
      .pager {
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
  private readonly openStartButton = viewChild<ElementRef<HTMLButtonElement>>('openStartButton');
  private readonly confirmStartButton = viewChild<ElementRef<HTMLButtonElement>>('confirmStartButton');
  private readonly openPauseButton = viewChild<ElementRef<HTMLButtonElement>>('openPauseButton');
  private readonly confirmPauseButton = viewChild<ElementRef<HTMLButtonElement>>('confirmPauseButton');
  private readonly openResumeButton = viewChild<ElementRef<HTMLButtonElement>>('openResumeButton');
  private readonly confirmResumeButton = viewChild<ElementRef<HTMLButtonElement>>('confirmResumeButton');
  private readonly openDrawButton = viewChild<ElementRef<HTMLButtonElement>>('openDrawButton');
  private readonly confirmDrawButton = viewChild<ElementRef<HTMLButtonElement>>('confirmDrawButton');
  private readonly openRebuildButton = viewChild<ElementRef<HTMLButtonElement>>('openRebuildButton');
  private readonly confirmRebuildButton =
    viewChild<ElementRef<HTMLButtonElement>>('confirmRebuildButton');

  readonly facade = inject(GameEngineFacade);
  readonly manualGameId = new FormControl('', { nonNullable: true });
  readonly date = formatGameDate;
  readonly winner = computed(() => this.facade.snapshot()?.winner ?? this.fallbackWinner());
  readonly showEngineControls = computed(
    () =>
      this.canStartGame() ||
      this.canPauseGame() ||
      this.canResumeGame() ||
      this.canDrawNumber() ||
      this.facade.startError() !== null ||
      this.facade.pauseError() !== null ||
      this.facade.resumeError() !== null ||
      this.facade.drawError() !== null ||
      this.facade.startResult() !== null ||
      this.facade.pauseResult() !== null ||
      this.facade.resumeResult() !== null ||
      this.facade.drawResult() !== null,
  );
  readonly showTechnicalTools = computed(
    () =>
      this.canRebuildCounters() ||
      this.facade.rebuildError() !== null ||
      this.facade.rebuildResult() !== null,
  );
  readonly canStartGame = computed(() => {
    const context = this.facade.snapshot()?.context;
    if (context === undefined) {
      return false;
    }

    if (context.status.value !== 'sales_closed') {
      return false;
    }

    if (context.lifecycle.startedAt !== null || context.schedule.scheduledStartAt === null) {
      return false;
    }

    return Date.parse(context.schedule.scheduledStartAt) <= Date.now();
  });
  readonly canPauseGame = computed(() => {
    const context = this.facade.snapshot()?.context;
    if (context === undefined) {
      return false;
    }

    return (
      context.status.value === 'running' &&
      context.schedule.autoDrawEnabled &&
      context.lifecycle.startedAt !== null &&
      context.lifecycle.pausedAt === null &&
      context.lifecycle.completedAt === null
    );
  });
  readonly canResumeGame = computed(() => {
    const context = this.facade.snapshot()?.context;
    if (context === undefined) {
      return false;
    }

    return (
      context.status.value === 'paused' &&
      context.schedule.autoDrawEnabled &&
      context.lifecycle.startedAt !== null &&
      context.lifecycle.pausedAt !== null &&
      context.lifecycle.completedAt === null &&
      context.engine.nextDrawAt === null
    );
  });
  readonly canDrawNumber = computed(() => {
    const context = this.facade.snapshot()?.context;
    if (context === undefined) {
      return false;
    }

    return (
      context.status.value === 'running' &&
      context.schedule.autoDrawEnabled === false &&
      context.lifecycle.startedAt !== null &&
      context.lifecycle.pausedAt === null &&
      context.lifecycle.completedAt === null &&
      this.winner() === null
    );
  });
  readonly canRebuildCounters = computed(() => {
    const context = this.facade.snapshot()?.context;
    if (context === undefined) {
      return false;
    }

    return context.status.value !== 'resolving';
  });
  readonly showStartConfirmation = signal(false);
  readonly showPauseConfirmation = signal(false);
  readonly showResumeConfirmation = signal(false);
  readonly showDrawConfirmation = signal(false);
  readonly showRebuildConfirmation = signal(false);
  backQueryParams: Params = {};

  constructor() {
    effect(() => {
      if (this.showStartConfirmation()) {
        this.confirmStartButton()?.nativeElement.focus();
      }
    });
    effect(() => {
      if (this.showPauseConfirmation()) {
        this.confirmPauseButton()?.nativeElement.focus();
      }
    });
    effect(() => {
      if (this.showResumeConfirmation()) {
        this.confirmResumeButton()?.nativeElement.focus();
      }
    });
    effect(() => {
      if (this.showDrawConfirmation()) {
        this.confirmDrawButton()?.nativeElement.focus();
      }
    });
    effect(() => {
      if (this.showRebuildConfirmation()) {
        this.confirmRebuildButton()?.nativeElement.focus();
      }
    });

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

  accessModeLabel(): string {
    return this.facade.accessMode() === 'manual'
      ? 'Acceso técnico secundario'
      : 'Flujo principal desde detalle admin';
  }

  openStartConfirmation(): void {
    if (!this.canStartGame() || this.facade.startStatus() === 'submitting') {
      return;
    }

    this.showPauseConfirmation.set(false);
    this.showResumeConfirmation.set(false);
    this.showDrawConfirmation.set(false);
    this.showRebuildConfirmation.set(false);
    this.showStartConfirmation.set(true);
  }

  closeStartConfirmation(): void {
    if (!this.showStartConfirmation() || this.facade.startStatus() === 'submitting') {
      return;
    }

    this.showStartConfirmation.set(false);
    this.openStartButton()?.nativeElement.focus();
  }

  openPauseConfirmation(): void {
    if (!this.canPauseGame() || this.facade.pauseStatus() === 'submitting') {
      return;
    }

    this.showStartConfirmation.set(false);
    this.showResumeConfirmation.set(false);
    this.showDrawConfirmation.set(false);
    this.showRebuildConfirmation.set(false);
    this.showPauseConfirmation.set(true);
  }

  closePauseConfirmation(): void {
    if (!this.showPauseConfirmation() || this.facade.pauseStatus() === 'submitting') {
      return;
    }

    this.showPauseConfirmation.set(false);
    this.openPauseButton()?.nativeElement.focus();
  }

  openResumeConfirmation(): void {
    if (!this.canResumeGame() || this.facade.resumeStatus() === 'submitting') {
      return;
    }

    this.showStartConfirmation.set(false);
    this.showPauseConfirmation.set(false);
    this.showDrawConfirmation.set(false);
    this.showRebuildConfirmation.set(false);
    this.showResumeConfirmation.set(true);
  }

  closeResumeConfirmation(): void {
    if (!this.showResumeConfirmation() || this.facade.resumeStatus() === 'submitting') {
      return;
    }

    this.showResumeConfirmation.set(false);
    this.openResumeButton()?.nativeElement.focus();
  }

  closeAnyConfirmation(): void {
    this.closeStartConfirmation();
    this.closePauseConfirmation();
    this.closeResumeConfirmation();
    this.closeDrawConfirmation();
    this.closeRebuildConfirmation();
  }

  startGame(): void {
    this.showStartConfirmation.set(false);
    this.facade.startGame();
  }

  pauseGame(): void {
    this.showPauseConfirmation.set(false);
    this.facade.pauseGame();
  }

  resumeGame(): void {
    this.showResumeConfirmation.set(false);
    this.facade.resumeGame();
  }

  openDrawConfirmation(): void {
    if (!this.canDrawNumber() || this.facade.drawStatus() === 'submitting') {
      return;
    }

    this.showStartConfirmation.set(false);
    this.showPauseConfirmation.set(false);
    this.showResumeConfirmation.set(false);
    this.showDrawConfirmation.set(true);
    this.showRebuildConfirmation.set(false);
  }

  closeDrawConfirmation(): void {
    if (!this.showDrawConfirmation() || this.facade.drawStatus() === 'submitting') {
      return;
    }

    this.showDrawConfirmation.set(false);
    this.openDrawButton()?.nativeElement.focus();
  }

  drawNumber(): void {
    this.showDrawConfirmation.set(false);
    this.facade.drawNumber();
  }

  openRebuildConfirmation(): void {
    if (!this.canRebuildCounters() || this.facade.rebuildStatus() === 'submitting') {
      return;
    }

    this.showStartConfirmation.set(false);
    this.showPauseConfirmation.set(false);
    this.showResumeConfirmation.set(false);
    this.showDrawConfirmation.set(false);
    this.showRebuildConfirmation.set(true);
  }

  closeRebuildConfirmation(): void {
    if (!this.showRebuildConfirmation() || this.facade.rebuildStatus() === 'submitting') {
      return;
    }

    this.showRebuildConfirmation.set(false);
    this.openRebuildButton()?.nativeElement.focus();
  }

  rebuildCounters(): void {
    this.showRebuildConfirmation.set(false);
    this.facade.rebuildCounters();
  }

  startErrorMessage(): string {
    const error = this.facade.startError();
    if (error === null) {
      return '';
    }

    if (this.facade.startStatus() === 'invalidState') {
      return 'Laravel rechazó el inicio del juego por estado o readiness actual. Revisa el contexto y vuelve a intentarlo.';
    }

    return error.message;
  }

  pauseErrorMessage(): string {
    const error = this.facade.pauseError();
    if (error === null) {
      return '';
    }

    if (this.facade.pauseStatus() === 'invalidState') {
      return 'Laravel rechazó la pausa porque el juego no está en una transición pausable o la automatización no aplica.';
    }

    if (this.facade.pauseStatus() === 'conflict') {
      return 'Laravel detectó una inconsistencia de integridad al pausar el juego. Refresca el contexto antes de volver a intentarlo.';
    }

    return error.message;
  }

  resumeErrorMessage(): string {
    const error = this.facade.resumeError();
    if (error === null) {
      return '';
    }

    if (this.facade.resumeStatus() === 'invalidState') {
      return 'Laravel rechazó la reanudación porque el juego no está en una transición reanudable o la automatización no aplica.';
    }

    if (this.facade.resumeStatus() === 'conflict') {
      return 'Laravel detectó una inconsistencia de integridad al reanudar el juego. Refresca el contexto antes de volver a intentarlo.';
    }

    return error.message;
  }

  drawErrorMessage(): string {
    const error = this.facade.drawError();
    if (error === null) {
      return '';
    }

    if (this.facade.drawStatus() === 'invalidState') {
      return 'Laravel rechazó el sorteo manual porque el juego ya no admite draw en este estado operativo.';
    }

    if (this.facade.drawStatus() === 'conflict') {
      return 'Laravel detectó un conflicto de integridad o concurrencia al sortear. Refresca el contexto antes de volver a intentarlo.';
    }

    if (this.facade.drawStatus() === 'networkError') {
      return 'No pudimos confirmar el sorteo por un problema de red. Puedes reintentar con seguridad.';
    }

    return error.message;
  }

  rebuildErrorMessage(): string {
    const error = this.facade.rebuildError();
    if (error === null) {
      return '';
    }

    if (this.facade.rebuildStatus() === 'invalidState') {
      return 'Laravel rechazó la reconstrucción porque el juego no está en un estado válido para esta herramienta técnica.';
    }

    if (this.facade.rebuildStatus() === 'conflict') {
      return 'Laravel detectó una inconsistencia de integridad al reconstruir counters. Refresca el contexto antes de volver a intentarlo.';
    }

    return error.message;
  }

  private loadFromRoute(routeGameId: string, queryGameId: string): void {
    const resolvedGameId = routeGameId || queryGameId;

    if (resolvedGameId === '') {
      this.facade.clear();
      return;
    }

    this.showStartConfirmation.set(false);
    this.showPauseConfirmation.set(false);
    this.showResumeConfirmation.set(false);
    this.showDrawConfirmation.set(false);
    this.showRebuildConfirmation.set(false);
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
