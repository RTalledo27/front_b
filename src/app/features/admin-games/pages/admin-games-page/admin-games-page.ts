import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Params, Router, RouterLink } from '@angular/router';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { formatGameDate, formatMoney } from '../../../public-games/utils/public-game-display';
import { AdminGamesFacade, initialAdminGameListQuery } from '../../data-access/admin-games.facade';
import { AdminGameListQuery } from '../../models/admin-games.models';
import { formatAdminBoolean } from '../../utils/admin-games-display';

@Component({
  selector: 'app-admin-games-page',
  imports: [ReactiveFormsModule, RouterLink, StatusBadge],
  providers: [AdminGamesFacade],
  template: `
    <section class="page admin-games-page">
      <header class="page-header">
        <div>
          <p class="eyebrow">Administración</p>
          <h1>Bingos</h1>
          <p>Opera el lifecycle administrativo real de los bingos sin mezclarlo con el motor técnico.</p>
        </div>
        <button
          class="button"
          type="button"
          [attr.aria-expanded]="showCreateForm()"
          aria-controls="admin-game-create-panel"
          (click)="toggleCreateForm()"
        >
          {{ showCreateForm() ? 'Ocultar formulario' : 'Crear bingo' }}
        </button>
      </header>

      @if (showCreateForm()) {
        <section
          id="admin-game-create-panel"
          class="surface-card create-card"
          aria-labelledby="admin-game-create-title"
        >
          <div class="panel-heading">
            <div>
              <p class="eyebrow">POST /api/v1/admin/games</p>
              <h2 id="admin-game-create-title">Crear bingo</h2>
              <p>El formulario replica únicamente campos reales del contrato backend.</p>
            </div>
            <button class="button button--secondary" type="button" (click)="closeCreateForm()">
              Cerrar
            </button>
          </div>

          <form class="create-grid" [formGroup]="createForm" (ngSubmit)="submitCreate()">
            <label>
              Slug
              <input formControlName="slug" type="text" autocomplete="off" />
              @if (showCreateFieldError('slug')) {
                <span class="field-error">{{ firstCreateFieldError('slug') }}</span>
              }
            </label>

            <label>
              Nombre
              <input formControlName="name" type="text" autocomplete="off" />
              @if (showCreateFieldError('name')) {
                <span class="field-error">{{ firstCreateFieldError('name') }}</span>
              }
            </label>

            <label class="create-grid__wide">
              Descripción
              <textarea formControlName="description" rows="3"></textarea>
              @if (showCreateFieldError('description')) {
                <span class="field-error">{{ firstCreateFieldError('description') }}</span>
              }
            </label>

            <label>
              Número mínimo
              <input formControlName="numberMin" type="number" inputmode="numeric" min="1" />
              @if (showCreateFieldError('numberMin') || showCreateFieldError('number_min')) {
                <span class="field-error">{{ firstCreateFieldError('numberMin', 'number_min') }}</span>
              }
            </label>

            <label>
              Número máximo
              <input formControlName="numberMax" type="number" inputmode="numeric" min="2" />
              @if (showCreateFieldError('numberMax') || showCreateFieldError('number_max')) {
                <span class="field-error">{{ firstCreateFieldError('numberMax', 'number_max') }}</span>
              }
            </label>

            <label>
              Aciertos requeridos
              <input formControlName="hitsRequired" type="number" inputmode="numeric" min="2" />
              @if (showCreateFieldError('hitsRequired') || showCreateFieldError('hits_required')) {
                <span class="field-error">{{ firstCreateFieldError('hitsRequired', 'hits_required') }}</span>
              }
            </label>

            <label>
              Precio por número (centavos)
              <input formControlName="ticketPriceCents" type="number" inputmode="numeric" min="0" />
              @if (showCreateFieldError('ticketPriceCents') || showCreateFieldError('ticket_price_cents')) {
                <span class="field-error">
                  {{ firstCreateFieldError('ticketPriceCents', 'ticket_price_cents') }}
                </span>
              }
            </label>

            <label>
              Premio (centavos)
              <input formControlName="prizeCents" type="number" inputmode="numeric" min="0" />
              @if (showCreateFieldError('prizeCents') || showCreateFieldError('prize_cents')) {
                <span class="field-error">{{ firstCreateFieldError('prizeCents', 'prize_cents') }}</span>
              }
            </label>

            <label>
              Moneda
              <input formControlName="currency" type="text" maxlength="3" autocomplete="off" />
              @if (showCreateFieldError('currency')) {
                <span class="field-error">{{ firstCreateFieldError('currency') }}</span>
              }
            </label>

            <label>
              Intervalo de sorteo (s)
              <input formControlName="drawIntervalSeconds" type="number" inputmode="numeric" min="1" />
              @if (showCreateFieldError('drawIntervalSeconds') || showCreateFieldError('draw_interval_seconds')) {
                <span class="field-error">
                  {{ firstCreateFieldError('drawIntervalSeconds', 'draw_interval_seconds') }}
                </span>
              }
            </label>

            <label class="checkbox-field">
              <input formControlName="autoDrawEnabled" type="checkbox" />
              <span>Activar sorteo automático</span>
            </label>

            <label>
              Ventas abren
              <input formControlName="salesOpensAt" type="datetime-local" />
              @if (showCreateFieldError('salesOpensAt') || showCreateFieldError('sales_opens_at')) {
                <span class="field-error">{{ firstCreateFieldError('salesOpensAt', 'sales_opens_at') }}</span>
              }
            </label>

            <label>
              Ventas cierran
              <input formControlName="salesClosesAt" type="datetime-local" />
              @if (showCreateFieldError('salesClosesAt') || showCreateFieldError('sales_closes_at')) {
                <span class="field-error">{{ firstCreateFieldError('salesClosesAt', 'sales_closes_at') }}</span>
              }
            </label>

            <label>
              Inicio programado
              <input formControlName="scheduledStartAt" type="datetime-local" />
              @if (showCreateFieldError('scheduledStartAt') || showCreateFieldError('scheduled_start_at')) {
                <span class="field-error">
                  {{ firstCreateFieldError('scheduledStartAt', 'scheduled_start_at') }}
                </span>
              }
            </label>

            <div class="create-grid__wide create-actions">
              <button class="button" type="submit" [disabled]="facade.createState().status === 'submitting'">
                {{ facade.createState().status === 'submitting' ? 'Creando…' : 'Crear bingo' }}
              </button>
              <button class="button button--secondary" type="button" (click)="clearCreateForm()">
                Limpiar formulario
              </button>
            </div>
          </form>

          <div class="feedback-block" aria-live="polite" aria-atomic="true">
            @if (facade.createState().status === 'success') {
              <p class="feedback-line feedback-line--success">
                Bingo creado con UUID {{ facade.createState().result?.id }}.
              </p>
              @if (facade.createState().refreshState === 'failed') {
                <p class="feedback-line feedback-line--warning">{{ facade.createState().refreshMessage }}</p>
              }
              <a
                class="button button--secondary"
                [routerLink]="['/admin/bingos', facade.createState().result?.id]"
                [queryParams]="currentQueryParams"
              >
                Abrir detalle del bingo creado
              </a>
            } @else if (facade.createState().status !== 'idle' && facade.createState().status !== 'submitting') {
              <p class="feedback-line feedback-line--danger">{{ facade.createState().errorMessage }}</p>
            }
          </div>
        </section>
      }

      <section class="surface-card filters-card" aria-labelledby="admin-games-filters-title">
        <div class="filters-heading">
          <div>
            <p class="eyebrow">Filtros reales</p>
            <h2 id="admin-games-filters-title">Buscar y refinar</h2>
            <p>Solo se muestran filtros soportados por <code>GET /api/v1/admin/games</code>.</p>
          </div>
          <div class="filters-actions">
            <button class="button button--secondary" type="button" (click)="resetFilters()">
              Limpiar filtros
            </button>
            <button class="button" type="button" (click)="applyFilters()">Aplicar filtros</button>
          </div>
        </div>

        <form class="filters-grid" [formGroup]="filtersForm" (ngSubmit)="applyFilters()">
          <label>
            Buscar
            <input formControlName="search" type="search" placeholder="Nombre o slug" />
          </label>

          <label>
            Estado
            <select formControlName="status">
              <option value="">Todos</option>
              @for (option of statusOptions; track option.value) {
                <option [value]="option.value">{{ option.label }}</option>
              }
            </select>
          </label>

          <label>
            Publicación
            <select formControlName="published">
              <option value="">Todos</option>
              <option value="1">Visibles al público</option>
              <option value="0">Privados</option>
            </select>
          </label>

          <label>
            Sorteo automático
            <select formControlName="autoDrawEnabled">
              <option value="">Todos</option>
              <option value="1">Activado</option>
              <option value="0">Desactivado</option>
            </select>
          </label>

          <label>
            Creado desde
            <input formControlName="createdFrom" type="date" />
          </label>

          <label>
            Creado hasta
            <input formControlName="createdTo" type="date" />
          </label>
        </form>

        <p class="filters-summary" aria-live="polite">{{ resultsSummary() }}</p>
      </section>

      <div class="feedback" aria-live="polite" aria-atomic="true">
        @if (facade.status() === 'refreshing') {
          <p class="feedback-line">Actualizando resultados…</p>
        }
      </div>

      @if (facade.status() === 'loading') {
        <section class="surface-card data-state" aria-busy="true" aria-label="Cargando juegos administrativos">
          <span class="data-loader"></span>
          <h2>Cargando juegos…</h2>
          <p>Estamos consultando el listado administrativo real.</p>
        </section>
      } @else if (facade.status() === 'unauthorized') {
        <section class="surface-card data-state" role="alert">
          <h2>Necesitas iniciar sesión</h2>
          <p>{{ facade.error()?.message }}</p>
          <a class="button" routerLink="/login">Ingresar</a>
        </section>
      } @else if (facade.status() === 'forbidden') {
        <section class="surface-card data-state" role="alert">
          <h2>No tienes acceso a la administración</h2>
          <p>{{ facade.error()?.message }}</p>
        </section>
      } @else if (facade.status() === 'validationError') {
        <section class="surface-card data-state" role="alert" aria-live="assertive">
          <h2>Corrige los filtros</h2>
          <p>{{ facade.error()?.message }}</p>
          <button class="button button--secondary" type="button" (click)="resetFilters()">
            Limpiar filtros
          </button>
        </section>
      } @else if (facade.status() === 'networkError' || facade.status() === 'unexpectedError') {
        <section class="surface-card data-state" role="alert">
          <h2>No pudimos cargar los bingos</h2>
          <p>{{ facade.error()?.message }}</p>
          <button class="button" type="button" (click)="reload()">Reintentar</button>
        </section>
      } @else if (facade.status() === 'empty') {
        <section class="surface-card data-state">
          <h2>Sin resultados</h2>
          <p>No hay juegos que coincidan con los filtros actuales.</p>
          <button class="button button--secondary" type="button" (click)="resetFilters()">
            Limpiar búsqueda
          </button>
        </section>
      } @else {
        <section class="results" aria-label="Resultados administrativos">
          @for (game of facade.games(); track game.id) {
            <article class="surface-card game-card">
              <div class="game-card__header">
                <div>
                  <p class="eyebrow">UUID real {{ game.id }}</p>
                  <h2>{{ game.name }}</h2>
                  <p class="description">
                    {{ game.description || 'Sin descripción administrativa registrada.' }}
                  </p>
                </div>
                <app-status-badge [tone]="game.status.tone">{{ game.status.label }}</app-status-badge>
              </div>

              <dl class="game-facts">
                <div><dt>Slug</dt><dd>{{ game.slug }}</dd></div>
                <div><dt>Rango</dt><dd>{{ game.numberRange.min }}-{{ game.numberRange.max }}</dd></div>
                <div><dt>Aciertos</dt><dd>{{ game.numberRange.hitsRequired }}</dd></div>
                <div><dt>Precio</dt><dd>{{ money(game.ticketPrice.amountCents, game.ticketPrice.currency) }}</dd></div>
                <div><dt>Premio</dt><dd>{{ money(game.prize.amountCents, game.prize.currency) }}</dd></div>
                <div><dt>Auto draw</dt><dd>{{ yesNo(game.schedule.autoDrawEnabled) }}</dd></div>
                <div><dt>Ventas abren</dt><dd>{{ date(game.schedule.salesOpensAt) }}</dd></div>
                <div><dt>Ventas cierran</dt><dd>{{ date(game.schedule.salesClosesAt) }}</dd></div>
                <div><dt>Inicio programado</dt><dd>{{ date(game.schedule.scheduledStartAt) }}</dd></div>
                <div><dt>Números</dt><dd>{{ game.numbers.available }} disponibles</dd></div>
                <div><dt>Reservados</dt><dd>{{ game.numbers.reserved }}</dd></div>
                <div><dt>Vendidos</dt><dd>{{ game.numbers.sold }}</dd></div>
                <div><dt>Draws</dt><dd>{{ game.ops.drawsTotal }}</dd></div>
                <div><dt>Órdenes pendientes</dt><dd>{{ game.ops.ordersPending }}</dd></div>
                <div><dt>Pagos en revisión</dt><dd>{{ game.ops.paymentsUnderReview }}</dd></div>
                <div><dt>Entradas confirmadas</dt><dd>{{ game.ops.entriesConfirmed }}</dd></div>
                <div><dt>Creado</dt><dd>{{ date(game.createdAt) }}</dd></div>
              </dl>

              <div class="game-card__footer">
                <p>El detalle conserva el lifecycle administrativo separado del motor técnico.</p>
                <a
                  class="button button--secondary"
                  [routerLink]="['/admin/bingos', game.id]"
                  [queryParams]="currentQueryParams"
                >
                  Ver detalle
                </a>
              </div>
            </article>
          }
        </section>

        @if (facade.pageInfo().lastPage > 1) {
          <nav class="pagination" aria-label="Paginación administrativa">
            <button
              class="button button--secondary"
              type="button"
              [disabled]="!facade.hasPreviousPage()"
              (click)="goToPage(facade.pageInfo().currentPage - 1)"
            >
              Anterior
            </button>
            <span>Página {{ facade.pageInfo().currentPage }} de {{ facade.pageInfo().lastPage }}</span>
            <button
              class="button button--secondary"
              type="button"
              [disabled]="!facade.hasNextPage()"
              (click)="goToPage(facade.pageInfo().currentPage + 1)"
            >
              Siguiente
            </button>
          </nav>
        }
      }
    </section>
  `,
  styles: `
    .admin-games-page { display: grid; gap: var(--s5); }
    .filters-card, .game-card, .create-card {
      min-width: 0;
      max-width: 100%;
      padding: var(--s5);
    }
    .panel-heading, .filters-heading, .game-card__header, .game-card__footer, .page-header {
      display: flex;
      gap: var(--s4);
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: flex-start;
    }
    .page-header > *,
    .panel-heading > *,
    .filters-heading > *,
    .game-card__header > *,
    .game-card__footer > * {
      min-width: 0;
    }
    .panel-heading p, .filters-heading p, .description, .filters-summary, .game-card__footer p {
      margin: 0;
      color: var(--color-text-muted);
      overflow-wrap: anywhere;
    }
    .create-grid, .filters-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: var(--s3);
      margin-top: var(--s4);
    }
    .create-grid__wide {
      grid-column: 1 / -1;
    }
    .create-actions {
      display: flex;
      gap: var(--s3);
      flex-wrap: wrap;
    }
    .filters-actions {
      display: flex;
      gap: var(--s3);
      flex-wrap: wrap;
      justify-content: flex-end;
    }
    label {
      display: grid;
      gap: .35rem;
      font-size: var(--sm);
      font-weight: 700;
      color: var(--color-text);
    }
    .checkbox-field {
      display: flex;
      align-items: center;
      gap: .65rem;
      padding-top: 1.8rem;
      font-weight: 700;
    }
    input, select, textarea {
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
    .checkbox-field input {
      width: auto;
      min-height: auto;
      margin: 0;
    }
    .field-error {
      color: var(--danger-700);
      font-size: var(--xs);
      font-weight: 700;
    }
    .filters-summary {
      margin-top: var(--s4);
      font-size: var(--sm);
    }
    .feedback, .feedback-block {
      min-height: 1.5rem;
    }
    .feedback-line {
      margin: 0;
      color: var(--color-text-muted);
      font-size: var(--sm);
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
    .results {
      display: grid;
      gap: var(--s4);
    }
    .results > * {
      min-width: 0;
    }
    .game-card__header h2,
    .game-card__header .eyebrow,
    .description,
    .game-card__footer p {
      overflow-wrap: anywhere;
      word-break: break-word;
    }
    .game-card__header h2 {
      margin: .2rem 0;
    }
    .game-facts {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: var(--s3);
      margin: var(--s4) 0 0;
    }
    .game-facts div {
      padding: var(--s3);
      border-radius: var(--r-md);
      background: var(--color-surface-subtle);
    }
    .game-facts dt {
      color: var(--color-text-muted);
      font-size: var(--xs);
      font-weight: 700;
    }
    .game-facts dd {
      margin: .35rem 0 0;
      font-weight: 800;
      overflow-wrap: anywhere;
      word-break: break-word;
    }
    .game-card__footer {
      margin-top: var(--s4);
      padding-top: var(--s4);
      border-top: 1px solid var(--color-border);
    }
    .pagination {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      align-items: center;
      gap: var(--s4);
      text-align: center;
    }
    @media (max-width: 64rem) {
      .create-grid, .filters-grid, .game-facts {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
    @media (max-width: 42rem) {
      .page-header, .panel-heading, .filters-heading, .game-card__header, .game-card__footer {
        flex-direction: column;
      }
      .filters-actions, .create-actions, .pagination {
        width: 100%;
        justify-content: stretch;
      }
      .filters-actions .button, .create-actions .button, .pagination .button, .game-card__footer .button {
        width: 100%;
      }
      .create-grid, .filters-grid, .game-facts {
        grid-template-columns: 1fr;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminGamesPage {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly facade = inject(AdminGamesFacade);
  readonly money = formatMoney;
  readonly date = formatGameDate;
  readonly yesNo = formatAdminBoolean;
  readonly showCreateForm = signal(false);
  readonly createSubmitted = signal(false);
  readonly statusOptions = [
    { value: 'draft', label: 'Borrador' },
    { value: 'published', label: 'Publicado' },
    { value: 'sales_open', label: 'Ventas abiertas' },
    { value: 'sales_closed', label: 'Ventas cerradas' },
    { value: 'running', label: 'En ejecución' },
    { value: 'paused', label: 'Pausado' },
    { value: 'resolving', label: 'Resolviendo ganador' },
    { value: 'completed', label: 'Finalizado' },
    { value: 'cancelled', label: 'Cancelado' },
  ] as const;
  readonly filtersForm = this.fb.nonNullable.group({
    search: [''],
    status: [''],
    published: [''],
    autoDrawEnabled: [''],
    createdFrom: [''],
    createdTo: [''],
  });
  readonly createForm = this.fb.nonNullable.group({
    slug: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(120), Validators.pattern(/^[a-z0-9-]+$/)]],
    name: ['', [Validators.required, Validators.maxLength(160)]],
    description: ['', [Validators.maxLength(5000)]],
    numberMin: [1, [Validators.required, Validators.min(1)]],
    numberMax: [90, [Validators.required, Validators.min(2)]],
    hitsRequired: [5, [Validators.required, Validators.min(2)]],
    ticketPriceCents: [500, [Validators.required, Validators.min(0)]],
    prizeCents: [100000, [Validators.required, Validators.min(0)]],
    currency: ['PEN', [Validators.required, Validators.pattern(/^[A-Za-z]{3}$/)]],
    drawIntervalSeconds: [30, [Validators.required, Validators.min(1)]],
    autoDrawEnabled: [false],
    salesOpensAt: [''],
    salesClosesAt: [''],
    scheduledStartAt: [''],
  });
  readonly createFieldErrors = computed(() => this.facade.createState().fieldErrors);

  currentQueryParams: Params = {};

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const query = readQueryFromRoute(params);
      this.currentQueryParams = buildRouteQueryParams(query);
      this.filtersForm.patchValue(
        {
          search: query.search,
          status: query.status,
          published: query.published === null ? '' : query.published ? '1' : '0',
          autoDrawEnabled: query.autoDrawEnabled === null ? '' : query.autoDrawEnabled ? '1' : '0',
          createdFrom: query.createdFrom ?? '',
          createdTo: query.createdTo ?? '',
        },
        { emitEvent: false },
      );
      this.facade.load(query);
    });
  }

  toggleCreateForm(): void {
    this.showCreateForm.update((value) => !value);
    if (!this.showCreateForm()) {
      this.facade.clearCreateFeedback();
    }
  }

  closeCreateForm(): void {
    this.showCreateForm.set(false);
    this.facade.clearCreateFeedback();
  }

  clearCreateForm(): void {
    this.createSubmitted.set(false);
    this.createForm.reset({
      slug: '',
      name: '',
      description: '',
      numberMin: 1,
      numberMax: 90,
      hitsRequired: 5,
      ticketPriceCents: 500,
      prizeCents: 100000,
      currency: 'PEN',
      drawIntervalSeconds: 30,
      autoDrawEnabled: false,
      salesOpensAt: '',
      salesClosesAt: '',
      scheduledStartAt: '',
    });
    this.facade.clearCreateFeedback();
  }

  submitCreate(): void {
    this.createSubmitted.set(true);
    this.facade.clearCreateFeedback();

    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }

    const value = this.createForm.getRawValue();
    this.facade.createGame({
      slug: value.slug.trim(),
      name: value.name.trim(),
      description: normalizeOptionalText(value.description),
      numberMin: value.numberMin,
      numberMax: value.numberMax,
      hitsRequired: value.hitsRequired,
      ticketPriceCents: value.ticketPriceCents,
      prizeCents: value.prizeCents,
      currency: value.currency.trim().toUpperCase(),
      drawIntervalSeconds: value.drawIntervalSeconds,
      autoDrawEnabled: value.autoDrawEnabled,
      salesOpensAt: toIsoDateTimeOrNull(value.salesOpensAt),
      salesClosesAt: toIsoDateTimeOrNull(value.salesClosesAt),
      scheduledStartAt: toIsoDateTimeOrNull(value.scheduledStartAt),
    });
  }

  showCreateFieldError(...keys: string[]): boolean {
    return this.firstCreateFieldError(...keys) !== null;
  }

  firstCreateFieldError(...keys: string[]): string | null {
    for (const key of keys) {
      const control = this.createForm.get(key);
      if (control && this.createSubmitted() && control.invalid) {
        return resolveCreateValidationMessage(key, control.errors);
      }

      const backendMessage = this.createFieldErrors()[key]?.[0] ?? null;
      if (backendMessage !== null) {
        return backendMessage;
      }
    }

    return null;
  }

  applyFilters(): void {
    const query = this.readQueryFromForm(1);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: buildRouteQueryParams(query),
    });
  }

  resetFilters(): void {
    this.filtersForm.reset({
      search: '',
      status: '',
      published: '',
      autoDrawEnabled: '',
      createdFrom: '',
      createdTo: '',
    });
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {},
    });
  }

  goToPage(page: number): void {
    const query = this.readQueryFromForm(page);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: buildRouteQueryParams(query),
    });
  }

  reload(): void {
    this.facade.load(readQueryFromRoute(this.route.snapshot.queryParamMap));
  }

  resultsSummary(): string {
    if (this.facade.status() === 'loading' && this.facade.games().length === 0) {
      return 'Consultando el listado administrativo real…';
    }

    return `Página ${this.facade.pageInfo().currentPage} de ${this.facade.pageInfo().lastPage} · ${this.facade.pageInfo().total} juegos`;
  }

  private readQueryFromForm(page: number): AdminGameListQuery {
    const value = this.filtersForm.getRawValue();

    return {
      page,
      search: value.search,
      status: value.status,
      published: parseBooleanFilter(value.published),
      autoDrawEnabled: parseBooleanFilter(value.autoDrawEnabled),
      createdFrom: value.createdFrom || null,
      createdTo: value.createdTo || null,
    };
  }
}

function readQueryFromRoute(params: Pick<import('@angular/router').ParamMap, 'get'>): AdminGameListQuery {
  const query = initialAdminGameListQuery();

  return {
    page: parsePositiveInteger(params.get('page')) ?? query.page,
    search: params.get('search') ?? query.search,
    status: params.get('status') ?? query.status,
    published: parseBooleanFilter(params.get('published')),
    autoDrawEnabled: parseBooleanFilter(params.get('auto_draw_enabled')),
    createdFrom: normalizeDateQueryParam(params.get('created_from')),
    createdTo: normalizeDateQueryParam(params.get('created_to')),
  };
}

function buildRouteQueryParams(query: AdminGameListQuery): Params {
  const params: Params = {};

  if (query.page > 1) {
    params['page'] = query.page;
  }

  if (query.search !== '') {
    params['search'] = query.search;
  }

  if (query.status !== '') {
    params['status'] = query.status;
  }

  if (query.published !== null) {
    params['published'] = query.published ? '1' : '0';
  }

  if (query.autoDrawEnabled !== null) {
    params['auto_draw_enabled'] = query.autoDrawEnabled ? '1' : '0';
  }

  if (query.createdFrom !== null) {
    params['created_from'] = query.createdFrom;
  }

  if (query.createdTo !== null) {
    params['created_to'] = query.createdTo;
  }

  return params;
}

function parsePositiveInteger(value: string | null): number | null {
  if (value === null || value.trim() === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseBooleanFilter(value: string | null): boolean | null {
  if (value === null || value === '') {
    return null;
  }

  if (value === '1' || value === 'true') {
    return true;
  }

  if (value === '0' || value === 'false') {
    return false;
  }

  return null;
}

function normalizeDateQueryParam(value: string | null): string | null {
  if (value === null || value.trim() === '') {
    return null;
  }

  return value;
}

function normalizeOptionalText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

function toIsoDateTimeOrNull(value: string): string | null {
  if (value.trim() === '') {
    return null;
  }

  return new Date(value).toISOString();
}

function resolveCreateValidationMessage(
  key: string,
  errors: Record<string, unknown> | null | undefined,
): string | null {
  if (errors?.['required']) {
    return 'Este campo es obligatorio.';
  }

  if (errors?.['minlength']) {
    return 'El valor es demasiado corto.';
  }

  if (errors?.['maxlength']) {
    return key === 'name' ? 'El nombre excede el máximo permitido.' : 'El valor excede el máximo permitido.';
  }

  if (errors?.['pattern']) {
    if (key === 'slug') {
      return 'Usa solo minúsculas, números y guiones.';
    }

    if (key === 'currency') {
      return 'Usa exactamente tres letras.';
    }
  }

  if (errors?.['min']) {
    return 'El valor debe respetar el mínimo permitido.';
  }

  return null;
}
