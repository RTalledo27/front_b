import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Params, RouterLink } from '@angular/router';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { AdminWinnerPayoutPanel } from '../../../admin-commerce/components/admin-winner-payout-panel/admin-winner-payout-panel';
import { formatGameDate, formatMoney } from '../../../public-games/utils/public-game-display';
import { AdminGameNumbersPanel } from '../../components/admin-game-numbers-panel/admin-game-numbers-panel';
import { AdminGameDetailFacade } from '../../data-access/admin-game-detail.facade';
import {
  AdminGameCommandState,
  AdminGameDetailView,
  AdminGameLifecycleAction,
} from '../../models/admin-games.models';
import { formatAdminBoolean } from '../../utils/admin-games-display';

@Component({
  selector: 'app-admin-game-detail-page',
  imports: [ReactiveFormsModule, RouterLink, StatusBadge, AdminGameNumbersPanel, AdminWinnerPayoutPanel],
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

          <section class="surface-card panel panel--wide lifecycle-panel">
            <div class="panel-heading">
              <div>
                <p class="eyebrow">Lifecycle administrativo</p>
                <h2>Operaciones disponibles</h2>
                <p>El backend sigue siendo la autoridad final sobre transiciones válidas.</p>
              </div>
            </div>

            <div class="lifecycle-actions">
              @if (canPublish(game)) {
                <button class="button" type="button" (click)="openAction('publish', $event)">Publicar</button>
              }
              @if (canOpenSales(game)) {
                <button class="button" type="button" (click)="openAction('openSales', $event)">Abrir ventas</button>
              }
              @if (canCloseSales(game)) {
                <button class="button" type="button" (click)="openAction('closeSales', $event)">Cerrar ventas</button>
              }
              @if (canSchedule(game)) {
                <button class="button" type="button" (click)="openAction('schedule', $event)">Programar</button>
              }
              @if (canCancel(game)) {
                <button class="button button--danger" type="button" (click)="openAction('cancel', $event)">
                  Cancelar
                </button>
              }
            </div>

            @if (availableActionCount(game) === 0) {
              <p class="panel-note">
                No hay acciones de este bloque disponibles para el estado actual. El motor técnico permanece aparte.
              </p>
            }

            @if (activeAction(); as action) {
              <section
                #confirmationPanel
                class="confirmation-panel"
                tabindex="-1"
                role="dialog"
                aria-modal="false"
                aria-labelledby="lifecycle-confirmation-title"
                (keydown.escape)="closeAction()"
              >
                <div class="confirmation-panel__header">
                  <div>
                    <p class="eyebrow">Confirmación</p>
                    <h3 id="lifecycle-confirmation-title">{{ actionTitle(action) }}</h3>
                  </div>
                  <button class="button button--secondary" type="button" (click)="closeAction()">Cerrar</button>
                </div>

                <p>{{ actionDescription(action) }}</p>

                @if (action === 'schedule') {
                  <form class="confirmation-form" [formGroup]="scheduleForm" (ngSubmit)="confirmAction(action)">
                    <label>
                      Fecha y hora de inicio
                      <input formControlName="scheduledStartAt" type="datetime-local" />
                      @if (showScheduleFieldError()) {
                        <span class="field-error">{{ firstScheduleFieldError() }}</span>
                      }
                    </label>
                    <div class="confirmation-actions">
                      <button
                        class="button"
                        type="submit"
                        [disabled]="actionState(action).status === 'submitting'"
                      >
                        {{ actionState(action).status === 'submitting' ? 'Programando…' : 'Confirmar programación' }}
                      </button>
                      <button class="button button--secondary" type="button" (click)="closeAction()">Cancelar</button>
                    </div>
                  </form>
                } @else if (action === 'cancel') {
                  <form class="confirmation-form" [formGroup]="cancelForm" (ngSubmit)="confirmAction(action)">
                    <label>
                      Motivo de cancelación
                      <textarea formControlName="reason" rows="4"></textarea>
                      @if (showCancelFieldError()) {
                        <span class="field-error">{{ firstCancelFieldError() }}</span>
                      }
                    </label>
                    <div class="confirmation-actions">
                      <button
                        class="button button--danger"
                        type="submit"
                        [disabled]="actionState(action).status === 'submitting'"
                      >
                        {{ actionState(action).status === 'submitting' ? 'Cancelando…' : 'Confirmar cancelación' }}
                      </button>
                      <button class="button button--secondary" type="button" (click)="closeAction()">Volver</button>
                    </div>
                  </form>
                } @else {
                  <div class="confirmation-actions">
                    <button
                      class="button"
                      type="button"
                      [disabled]="actionState(action).status === 'submitting'"
                      (click)="confirmAction(action)"
                    >
                      {{ submitLabel(action, actionState(action).status) }}
                    </button>
                    <button class="button button--secondary" type="button" (click)="closeAction()">Cancelar</button>
                  </div>
                }

                <div class="feedback-block" aria-live="polite" aria-atomic="true">
                  @if (actionState(action).status === 'success') {
                    <p class="feedback-line feedback-line--success">
                      Acción aplicada con estado backend {{ actionState(action).result?.status?.label }}.
                    </p>
                    @if (actionState(action).refreshState === 'failed') {
                      <p class="feedback-line feedback-line--warning">{{ actionState(action).refreshMessage }}</p>
                    }
                  } @else if (actionState(action).status !== 'idle' && actionState(action).status !== 'submitting') {
                    <p class="feedback-line feedback-line--danger">{{ actionState(action).errorMessage }}</p>
                  }
                </div>
              </section>
            }
          </section>

          <section class="surface-card panel panel--wide">
            <h2>Capacidad actual</h2>
            <dl class="facts facts--numbers">
              <div><dt>Total</dt><dd>{{ game.numbers.total }}</dd></div>
              <div><dt>Disponibles</dt><dd>{{ game.numbers.available }}</dd></div>
              <div><dt>Reservados</dt><dd>{{ game.numbers.reserved }}</dd></div>
              <div><dt>Vendidos</dt><dd>{{ game.numbers.sold }}</dd></div>
            </dl>
            <p class="panel-note">El motor técnico y el detalle de números siguen en secciones independientes.</p>
          </section>

          <app-admin-winner-payout-panel
            class="panel--wide"
            [gameId]="game.id"
            [gameStatus]="game.status.value"
            [prizeAmountCents]="game.prize.amountCents"
            [currency]="game.prize.currency"
            [winner]="game.winner"
          />

          <section class="surface-card panel panel--wide">
            <h2>Configuración técnica</h2>
            <p class="panel-note">
              Se muestra la configuración real expuesta por el backend sin reinterpretarla en el navegador.
            </p>
            @if (formatSettings(game.settings); as settingsText) {
              <pre>{{ settingsText }}</pre>
            } @else {
              <p class="technical-settings-empty">Sin configuración técnica registrada.</p>
            }
          </section>

          <app-admin-game-numbers-panel class="panel--wide" [gameId]="game.id" />
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
      overflow-wrap: anywhere;
    }
    .back-link:hover {
      color: var(--color-link-hover);
      text-decoration: underline;
    }
    .detail-header p {
      margin: 0;
      color: var(--color-text-muted);
      overflow-wrap: anywhere;
    }
    .header-actions {
      display: grid;
      gap: var(--s3);
      justify-items: end;
      min-width: 0;
    }
    .detail-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: var(--s4);
      align-items: start;
    }
    .detail-header > *,
    .detail-grid > * {
      min-width: 0;
    }
    .panel {
      min-width: 0;
      max-width: 100%;
      padding: var(--s5);
    }
    .panel--wide {
      grid-column: 1 / -1;
    }
    .panel-heading {
      display: flex;
      justify-content: space-between;
      gap: var(--s3);
      align-items: flex-start;
    }
    .panel-heading > * {
      min-width: 0;
    }
    .panel-heading p {
      margin: 0;
      color: var(--color-text-muted);
      overflow-wrap: anywhere;
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
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 10rem), 1fr));
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
      overflow-wrap: anywhere;
      word-break: break-word;
    }
    .facts--numbers dd {
      text-align: left;
      font-size: var(--xl);
    }
    .panel-note {
      margin: var(--s4) 0 0;
      color: var(--color-text-muted);
      overflow-wrap: anywhere;
    }
    .lifecycle-actions,
    .confirmation-actions {
      display: flex;
      gap: var(--s3);
      flex-wrap: wrap;
      margin-top: var(--s4);
    }
    .confirmation-panel {
      margin-top: var(--s4);
      min-width: 0;
      padding: var(--s4);
      border: 1px solid var(--color-border);
      border-radius: var(--r-lg);
      background: var(--color-surface-subtle);
      outline: none;
    }
    .confirmation-panel__header {
      display: flex;
      justify-content: space-between;
      gap: var(--s3);
      align-items: flex-start;
    }
    .confirmation-form {
      display: grid;
      gap: var(--s3);
      margin-top: var(--s4);
    }
    label {
      display: grid;
      gap: .35rem;
      font-size: var(--sm);
      font-weight: 700;
      color: var(--color-text);
    }
    input, textarea {
      box-sizing: border-box;
      width: 100%;
      max-width: 100%;
      min-height: 2.75rem;
      padding: 0 .75rem;
      border: 1px solid var(--color-border);
      border-radius: var(--r-md);
      font: inherit;
      background: var(--color-surface);
    }
    textarea {
      min-height: 7rem;
      padding: .75rem;
      resize: vertical;
    }
    .field-error {
      color: var(--danger-700);
      font-size: var(--xs);
      font-weight: 700;
    }
    .feedback-block {
      min-height: 1.5rem;
      margin-top: var(--s3);
    }
    .feedback-line {
      margin: 0;
      color: var(--color-text-muted);
      font-size: var(--sm);
      overflow-wrap: anywhere;
    }
    .technical-settings-empty {
      margin: var(--s4) 0 0;
      padding: var(--s4);
      border: 1px dashed var(--color-border);
      border-radius: var(--r-md);
      background: var(--color-surface-subtle);
      color: var(--color-text-muted);
      overflow-wrap: anywhere;
    }
    .feedback-line--danger {
      color: var(--danger-700);
    }
    .feedback-line--success {
      color: var(--success-700);
    }
    .feedback-line--warning {
      color: var(--warning-700);
    }
    pre {
      max-width: 100%;
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
      .facts div, .panel-heading, .confirmation-panel__header {
        flex-direction: column;
      }
      dd {
        text-align: left;
      }
      .lifecycle-actions .button,
      .confirmation-actions .button {
        width: 100%;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminGameDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);

  readonly facade = inject(AdminGameDetailFacade);
  readonly money = formatMoney;
  readonly date = formatGameDate;
  readonly yesNo = formatAdminBoolean;
  readonly activeAction = signal<AdminGameLifecycleAction | null>(null);
  readonly scheduleSubmitted = signal(false);
  readonly cancelSubmitted = signal(false);
  readonly confirmationPanel = viewChild<ElementRef<HTMLElement>>('confirmationPanel');
  readonly scheduleForm = this.fb.nonNullable.group({
    scheduledStartAt: ['', [Validators.required]],
  });
  readonly cancelForm = this.fb.nonNullable.group({
    reason: ['', [Validators.maxLength(500)]],
  });
  backQueryParams: Params = {};
  private lastActionTrigger: HTMLElement | null = null;

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.backQueryParams = Object.fromEntries(params.keys.map((key) => [key, params.get(key)]));
    });

    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const gameId = params.get('gameId') ?? '';
      if (gameId.trim() !== '') {
        this.closeAction();
        this.facade.load(gameId);
      }
    });
  }

  canPublish(game: AdminGameDetailView): boolean {
    return game.status.value === 'draft';
  }

  canOpenSales(game: AdminGameDetailView): boolean {
    return game.status.value === 'published';
  }

  canCloseSales(game: AdminGameDetailView): boolean {
    return game.status.value === 'sales_open';
  }

  canSchedule(game: AdminGameDetailView): boolean {
    return ['published', 'sales_open', 'sales_closed'].includes(game.status.value);
  }

  canCancel(game: AdminGameDetailView): boolean {
    return ['draft', 'published', 'sales_open', 'sales_closed', 'paused'].includes(game.status.value);
  }

  availableActionCount(game: AdminGameDetailView): number {
    return [
      this.canPublish(game),
      this.canOpenSales(game),
      this.canCloseSales(game),
      this.canSchedule(game),
      this.canCancel(game),
    ].filter(Boolean).length;
  }

  openAction(action: AdminGameLifecycleAction, event: Event): void {
    this.activeAction.set(action);
    this.lastActionTrigger = event.currentTarget instanceof HTMLElement ? event.currentTarget : null;
    this.facade.clearActionFeedback(action);
    this.scheduleSubmitted.set(false);
    this.cancelSubmitted.set(false);

    if (action === 'schedule') {
      this.scheduleForm.reset({
        scheduledStartAt: toDateTimeLocalValue(this.facade.game()?.schedule.scheduledStartAt),
      });
    }

    if (action === 'cancel') {
      this.cancelForm.reset({ reason: '' });
    }

    queueMicrotask(() => this.confirmationPanel()?.nativeElement.focus());
  }

  closeAction(): void {
    const action = this.activeAction();
    if (action !== null) {
      this.facade.clearActionFeedback(action);
    }

    this.activeAction.set(null);
    this.scheduleSubmitted.set(false);
    this.cancelSubmitted.set(false);
    this.lastActionTrigger?.focus();
  }

  confirmAction(action: AdminGameLifecycleAction): void {
    switch (action) {
      case 'publish':
        this.facade.publish();
        return;
      case 'openSales':
        this.facade.openSales();
        return;
      case 'closeSales':
        this.facade.closeSales();
        return;
      case 'schedule':
        this.scheduleSubmitted.set(true);
        if (this.scheduleForm.invalid) {
          this.scheduleForm.markAllAsTouched();
          return;
        }
        this.facade.schedule({
          scheduledStartAt: new Date(this.scheduleForm.getRawValue().scheduledStartAt).toISOString(),
        });
        return;
      case 'cancel':
        this.cancelSubmitted.set(true);
        if (this.cancelForm.invalid) {
          this.cancelForm.markAllAsTouched();
          return;
        }
        this.facade.cancel({
          reason: normalizeOptionalText(this.cancelForm.getRawValue().reason),
        });
    }
  }

  actionState(action: AdminGameLifecycleAction): AdminGameCommandState {
    switch (action) {
      case 'publish':
        return this.facade.publishState();
      case 'openSales':
        return this.facade.openSalesState();
      case 'closeSales':
        return this.facade.closeSalesState();
      case 'schedule':
        return this.facade.scheduleState();
      case 'cancel':
        return this.facade.cancelState();
    }
  }

  actionTitle(action: AdminGameLifecycleAction): string {
    switch (action) {
      case 'publish':
        return 'Confirmar publicación';
      case 'openSales':
        return 'Confirmar apertura de ventas';
      case 'closeSales':
        return 'Confirmar cierre de ventas';
      case 'schedule':
        return 'Confirmar programación';
      case 'cancel':
        return 'Confirmar cancelación';
    }
  }

  actionDescription(action: AdminGameLifecycleAction): string {
    switch (action) {
      case 'publish':
        return 'Esta acción expone el bingo al flujo administrativo publicado según el backend.';
      case 'openSales':
        return 'Las ventas pasarán al estado abierto si el backend confirma la transición.';
      case 'closeSales':
        return 'El backend cerrará ventas y fijará el corte operativo del juego.';
      case 'schedule':
        return 'La fecha se enviará en formato ISO derivado de tu zona horaria local.';
      case 'cancel':
        return 'La cancelación solo debe ejecutarse sobre juegos seguros para descartar.';
    }
  }

  submitLabel(action: AdminGameLifecycleAction, status: AdminGameCommandState['status']): string {
    if (status !== 'submitting') {
      switch (action) {
        case 'publish':
          return 'Confirmar publicación';
        case 'openSales':
          return 'Confirmar apertura';
        case 'closeSales':
          return 'Confirmar cierre';
        case 'schedule':
          return 'Confirmar programación';
        case 'cancel':
          return 'Confirmar cancelación';
      }
    }

    switch (action) {
      case 'publish':
        return 'Publicando…';
      case 'openSales':
        return 'Abriendo ventas…';
      case 'closeSales':
        return 'Cerrando ventas…';
      case 'schedule':
        return 'Programando…';
      case 'cancel':
        return 'Cancelando…';
    }
  }

  showScheduleFieldError(): boolean {
    return this.firstScheduleFieldError() !== null;
  }

  firstScheduleFieldError(): string | null {
    const control = this.scheduleForm.controls.scheduledStartAt;
    if (this.scheduleSubmitted() && control.invalid) {
      return 'Selecciona una fecha de inicio.';
    }

    return this.facade.scheduleState().fieldErrors['scheduled_start_at']?.[0] ?? null;
  }

  showCancelFieldError(): boolean {
    return this.firstCancelFieldError() !== null;
  }

  firstCancelFieldError(): string | null {
    const control = this.cancelForm.controls.reason;
    if (this.cancelSubmitted() && control.errors?.['maxlength']) {
      return 'El motivo no puede exceder 500 caracteres.';
    }

    return this.facade.cancelState().fieldErrors['reason']?.[0] ?? null;
  }

  formatSettings(settings: unknown): string {
    if (settings === null || settings === undefined) {
      return '';
    }

    return JSON.stringify(settings, null, 2);
  }
}

function normalizeOptionalText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

function toDateTimeLocalValue(value: string | null | undefined): string {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60_000);
  return localDate.toISOString().slice(0, 16);
}
