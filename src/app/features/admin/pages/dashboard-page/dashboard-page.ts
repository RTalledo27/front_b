import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AppIcon, AppIconName } from '../../../../shared/ui/app-icon/app-icon';

interface Capability {
  title: string;
  description: string;
  path: string;
  icon: AppIconName;
  status: string;
}

@Component({
  selector: 'app-dashboard-page',
  imports: [RouterLink, AppIcon],
  template: `
    <section class="page">
      <header class="page-header">
        <div>
          <p class="eyebrow">Resumen operativo</p>
          <h1>Fortuna conectada</h1>
          <p>Accesos a las capacidades que el backend ya expone de forma estable.</p>
        </div>
        <a class="button" routerLink="/admin/bingos"><app-icon name="bingo" />Crear bingo</a>
      </header>

      <div class="capabilities">
        @for (item of capabilities; track item.path) {
          <a class="surface-card capability" [routerLink]="item.path">
            <span><app-icon [name]="item.icon" /></span>
            <div>
              <small>{{ item.status }}</small>
              <h2>{{ item.title }}</h2>
              <p>{{ item.description }}</p>
            </div>
            <app-icon name="arrow" />
          </a>
        }
      </div>

      <section class="surface-card pending">
        <div>
          <p class="eyebrow">Alineación de producto</p>
          <h2>Sin métricas inventadas</h2>
          <p>
            El dashboard mostrará totales, actividad reciente y alertas cuando Laravel publique
            endpoints agregados. Mientras tanto, cada módulo consulta únicamente datos reales.
          </p>
        </div>
        <a class="button button--secondary" routerLink="/admin/pagos">Abrir pagos</a>
      </section>
    </section>
  `,
  styles: `
    .capabilities {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: var(--s4);
    }
    .capability {
      display: grid;
      grid-template-columns: auto 1fr auto;
      align-items: center;
      gap: var(--s4);
      padding: var(--s5);
      color: inherit;
      text-decoration: none;
    }
    .capability > span {
      display: grid;
      width: 3rem;
      height: 3rem;
      place-items: center;
      border-radius: var(--r-md);
      background: var(--color-brand-subtle);
      color: var(--color-brand);
    }
    .capability small {
      color: var(--color-brand);
      font-weight: 800;
      text-transform: uppercase;
    }
    .capability h2,
    .capability p {
      margin: .15rem 0;
    }
    .capability p,
    .pending p {
      color: var(--color-text-muted);
    }
    .pending {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--s5);
      padding: var(--s6);
      margin-top: var(--s5);
      background: var(--color-dark-section);
      color: #fff;
    }
    .pending .eyebrow {
      color: var(--color-prize);
    }
    .pending h2 {
      margin: .15rem 0;
    }
    .pending p {
      max-width: 46rem;
      color: var(--neutral-300);
    }
    @media (max-width: 48rem) {
      .capabilities {
        grid-template-columns: 1fr;
      }
      .pending {
        align-items: stretch;
        flex-direction: column;
      }
      .pending .button {
        width: 100%;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage {
  readonly capabilities: readonly Capability[] = [
    {
      title: 'Bingos y números',
      description: 'Crear, publicar, programar y revisar la grilla administrativa.',
      path: '/admin/bingos',
      icon: 'bingo',
      status: 'Disponible',
    },
    {
      title: 'Motor de juego',
      description: 'Abrir contexto real del juego y auditar draws, counters y ganador en modo lectura.',
      path: '/admin/motor',
      icon: 'bingo',
      status: 'Disponible',
    },
    {
      title: 'Órdenes',
      description: 'Filtrar órdenes reales por estado y juego.',
      path: '/admin/ordenes',
      icon: 'orders',
      status: 'Disponible',
    },
    {
      title: 'Pagos',
      description: 'Descargar evidencia y aprobar o rechazar con idempotencia.',
      path: '/admin/pagos',
      icon: 'payments',
      status: 'Disponible',
    },
  ];
}
