import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Params, Router, RouterLink } from '@angular/router';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { formatGameDate, formatMoney } from '../../../public-games/utils/public-game-display';
import {
  AdminGameSummaryView,
  AdminGameListQuery,
} from '../../models/admin-games.models';
import {
  AdminGamesFacade,
  initialAdminGameListQuery,
} from '../../data-access/admin-games.facade';
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
          <p>Consulta el catálogo administrativo real de juegos, sus estados y su contexto operativo.</p>
        </div>
      </header>

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

        <p class="filters-summary" aria-live="polite">
          Página {{ facade.pageInfo().currentPage }} de {{ facade.pageInfo().lastPage }} ·
          {{ facade.pageInfo().total }} juegos
        </p>
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
                <p>Este juego ya queda disponible como contexto real para bloques posteriores.</p>
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
    .filters-card, .game-card { padding: var(--s5); }
    .filters-heading, .game-card__header, .game-card__footer {
      display: flex;
      gap: var(--s4);
      justify-content: space-between;
      align-items: flex-start;
    }
    .filters-heading p, .description, .filters-summary, .game-card__footer p {
      margin: 0;
      color: var(--color-text-muted);
    }
    .filters-actions {
      display: flex;
      gap: var(--s3);
      flex-wrap: wrap;
      justify-content: flex-end;
    }
    .filters-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
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
    input, select {
      width: 100%;
      min-height: 2.75rem;
      padding: 0 .75rem;
      border: 1px solid var(--color-border);
      border-radius: var(--r-md);
      font: inherit;
      background: var(--color-surface);
    }
    .filters-summary {
      margin-top: var(--s4);
      font-size: var(--sm);
    }
    .feedback {
      min-height: 1.5rem;
    }
    .feedback-line {
      margin: 0;
      color: var(--color-text-muted);
      font-size: var(--sm);
    }
    .feedback-line--danger {
      color: var(--danger-600);
    }
    .results {
      display: grid;
      gap: var(--s4);
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
      word-break: break-word;
    }
    .game-card__footer {
      margin-top: var(--s4);
      padding-top: var(--s4);
      border-top: 1px solid var(--color-border);
    }
    .pagination {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: var(--s4);
    }
    @media (max-width: 64rem) {
      .filters-grid, .game-facts { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
    @media (max-width: 42rem) {
      .filters-heading, .game-card__header, .game-card__footer {
        flex-direction: column;
      }
      .filters-actions, .pagination {
        width: 100%;
        justify-content: stretch;
      }
      .filters-actions .button, .pagination .button, .game-card__footer .button {
        width: 100%;
      }
      .filters-grid, .game-facts {
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
