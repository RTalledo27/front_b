import { ChangeDetectionStrategy, Component, effect, inject, input, untracked } from '@angular/core';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { formatGameDate } from '../../../public-games/utils/public-game-display';
import { AdminGameNumbersFacade } from '../../data-access/admin-game-numbers.facade';

@Component({
  selector: 'app-admin-game-numbers-panel',
  imports: [StatusBadge],
  providers: [AdminGameNumbersFacade],
  template: `
    <section class="surface-card panel panel--wide" aria-labelledby="admin-game-numbers-title">
      <div class="panel-header">
        <div>
          <h2 id="admin-game-numbers-title">Números administrativos</h2>
          <p class="panel-note">
            Consulta read-only del endpoint admin real del juego. No habilita mutaciones ni usa UUID manual como flujo principal.
          </p>
        </div>

        @if (facade.status() === 'loaded' || facade.status() === 'empty') {
          <button class="button button--secondary" type="button" (click)="facade.reload()">
            Actualizar
          </button>
        }
      </div>

      @if (facade.status() === 'loading' || facade.status() === 'refreshing') {
        <div class="data-state" aria-busy="true" aria-live="polite">
          <span class="data-loader"></span>
          <p>
            {{ facade.status() === 'refreshing' ? 'Actualizando números…' : 'Cargando números administrativos…' }}
          </p>
        </div>
      } @else if (facade.status() === 'unauthorized') {
        <div class="data-state" role="alert">
          <h3>Necesitas iniciar sesión</h3>
          <p>{{ facade.error()?.message }}</p>
        </div>
      } @else if (facade.status() === 'forbidden') {
        <div class="data-state" role="alert">
          <h3>No tienes acceso a los números de este juego</h3>
          <p>{{ facade.error()?.message }}</p>
        </div>
      } @else if (facade.status() === 'notFound') {
        <div class="data-state" role="alert">
          <h3>Este juego ya no está disponible</h3>
          <p>{{ facade.error()?.message }}</p>
        </div>
      } @else if (facade.status() === 'validationError') {
        <div class="data-state" role="alert" aria-live="assertive">
          <h3>No pudimos interpretar la consulta</h3>
          <p>{{ facade.error()?.message }}</p>
        </div>
      } @else if (facade.status() === 'networkError' || facade.status() === 'unexpectedError') {
        <div class="data-state" role="alert" aria-live="assertive">
          <h3>No pudimos cargar los números</h3>
          <p>{{ facade.error()?.message }}</p>
          <button class="button" type="button" (click)="facade.reload()">Reintentar</button>
        </div>
      } @else if (facade.status() === 'empty') {
        <div class="data-state">
          <h3>Sin números administrativos</h3>
          <p>El backend respondió correctamente, pero no devolvió números para este juego.</p>
        </div>
      } @else if (facade.status() === 'loaded') {
        <div class="numbers-summary" aria-live="polite">
          <p>{{ facade.numbers().length }} números cargados desde el backend administrativo.</p>
        </div>

        <div class="numbers-grid" role="list" aria-label="Números administrativos del juego">
          @for (number of facade.numbers(); track number.id) {
            <article class="number-card" role="listitem">
              <div class="number-card__header">
                <div>
                  <p class="number-card__eyebrow">Número</p>
                  <h3>{{ number.number }}</h3>
                </div>
                <app-status-badge [tone]="number.status.tone">{{ number.status.label }}</app-status-badge>
              </div>

              <dl class="number-meta">
                <div>
                  <dt>Estado crudo</dt>
                  <dd>{{ number.status.value }}</dd>
                </div>
                <div>
                  <dt>Reserva activa</dt>
                  <dd>{{ number.activeReservation ? 'Sí' : 'No' }}</dd>
                </div>
                <div>
                  <dt>Entrada vendida</dt>
                  <dd>{{ number.soldEntry ? 'Sí' : 'No' }}</dd>
                </div>
                <div>
                  <dt>Orden asociada</dt>
                  <dd>{{ number.activeReservation?.orderStatus || 'No aplica' }}</dd>
                </div>
                <div>
                  <dt>Expira</dt>
                  <dd>{{ date(number.activeReservation?.expiresAt ?? null) }}</dd>
                </div>
                <div>
                  <dt>Confirmado</dt>
                  <dd>{{ date(number.soldEntry?.confirmedAt ?? null) }}</dd>
                </div>
              </dl>
            </article>
          }
        </div>
      }
    </section>
  `,
  styles: `
    .panel-header {
      display: flex;
      justify-content: space-between;
      gap: var(--s4);
      align-items: flex-start;
    }
    .panel-header > * {
      min-width: 0;
    }
    .panel-note {
      margin: .4rem 0 0;
      color: var(--color-text-muted);
      overflow-wrap: anywhere;
    }
    .numbers-summary p {
      margin: var(--s4) 0 0;
      color: var(--color-text-muted);
    }
    .numbers-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: var(--s3);
      margin-top: var(--s4);
    }
    .number-card {
      min-width: 0;
      padding: var(--s4);
      border: 1px solid var(--color-border);
      border-radius: var(--r-md);
      background: var(--color-surface-subtle);
      display: grid;
      gap: var(--s3);
    }
    .number-card__header {
      display: flex;
      justify-content: space-between;
      gap: var(--s3);
      align-items: flex-start;
    }
    .number-card__header > * {
      min-width: 0;
    }
    .number-card__header h3,
    .number-card__eyebrow {
      margin: 0;
    }
    .number-card__eyebrow {
      color: var(--color-text-muted);
      font-size: var(--xs);
      text-transform: uppercase;
      letter-spacing: .04em;
    }
    .number-meta {
      display: grid;
      gap: var(--s2);
      margin: 0;
    }
    .number-meta div {
      display: flex;
      justify-content: space-between;
      gap: var(--s3);
      padding-top: var(--s2);
      border-top: 1px solid var(--color-border);
    }
    .number-meta dt {
      color: var(--color-text-muted);
      font-size: var(--sm);
      font-weight: 700;
    }
    .number-meta dd {
      margin: 0;
      text-align: right;
      font-weight: 700;
      overflow-wrap: anywhere;
      word-break: break-word;
    }
    @media (max-width: 64rem) {
      .numbers-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
    @media (max-width: 42rem) {
      .panel-header,
      .number-card__header,
      .number-meta div {
        flex-direction: column;
      }
      .numbers-grid {
        grid-template-columns: 1fr;
      }
      .number-meta dd {
        text-align: left;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminGameNumbersPanel {
  readonly gameId = input.required<string>();

  protected readonly facade = inject(AdminGameNumbersFacade);
  protected readonly date = formatGameDate;

  constructor() {
    effect(() => {
      const currentGameId = this.gameId().trim();

      untracked(() => {
        if (currentGameId === '') {
          this.facade.reset();
          return;
        }

        this.facade.load(currentGameId);
      });
    });
  }
}
