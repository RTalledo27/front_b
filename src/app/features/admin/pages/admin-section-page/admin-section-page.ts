import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AppIcon } from '../../../../shared/ui/app-icon/app-icon';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { AdminSectionKey, adminSections } from '../../data-access/admin-placeholder.data';
@Component({
  selector: 'app-admin-section-page',
  imports: [AppIcon, StatusBadge],
  template: `<section class="page">
    <header class="page-header">
      <div>
        <p class="eyebrow">{{ section.eyebrow }}</p>
        <h1>{{ section.title }}</h1>
        <p>{{ section.description }}</p>
      </div>
      <button
        class="button"
        type="button"
        disabled
        title="Disponible en el siguiente bloque funcional"
      >
        <app-icon [name]="section.icon" />{{ section.action }}
      </button>
    </header>
    <div class="stat-grid">
      @for (stat of section.stats; track stat.label) {
        <article class="surface-card stat-card">
          <span class="stat-label">{{ stat.label }}</span>
          <p class="stat-value">{{ stat.value }}</p>
          <p class="stat-detail">{{ stat.detail }}</p>
        </article>
      }
    </div>
    <section class="surface-card list">
      <header>
        <div>
          <h2>Vista general</h2>
          <p>Información demostrativa para validar navegación y jerarquía.</p>
        </div>
      </header>
      @for (row of section.rows; track row.title) {
        <article>
          <span class="row-icon"><app-icon [name]="section.icon" /></span>
          <div>
            <h3>{{ row.title }}</h3>
            <p>{{ row.detail }}</p>
          </div>
          <strong>{{ row.value }}</strong
          ><app-status-badge [tone]="row.tone">{{ row.status }}</app-status-badge>
        </article>
      }
      <footer>
        <strong>Estado de integración</strong>
        <p>{{ section.note }}</p>
      </footer>
    </section>
  </section>`,
  styles: `
    .list {
      margin-top: var(--s6);
      overflow: hidden;
    }
    .list > header {
      padding: var(--s5);
      border-bottom: 1px solid var(--neutral-200);
    }
    h2 {
      margin: 0;
      font-size: var(--lg);
    }
    header p,
    article p,
    footer p {
      margin: var(--s1) 0 0;
      color: var(--neutral-500);
      font-size: var(--sm);
    }
    article {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr) auto auto;
      align-items: center;
      gap: var(--s4);
      padding: var(--s4) var(--s5);
      border-bottom: 1px solid var(--neutral-100);
    }
    .row-icon {
      display: grid;
      width: 2.5rem;
      height: 2.5rem;
      place-items: center;
      border-radius: var(--r-md);
      background: var(--color-brand-subtle);
      color: var(--color-brand);
    }
    h3 {
      margin: 0;
      font-size: var(--sm);
    }
    article > strong {
      font-size: var(--sm);
    }
    footer {
      padding: var(--s4) var(--s5);
      background: var(--neutral-50);
    }
    footer strong {
      font-size: var(--xs);
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }
    @media (max-width: 42rem) {
      article {
        grid-template-columns: auto 1fr;
      }
      article > strong,
      article app-status-badge {
        grid-column: 2;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminSectionPage {
  private readonly route = inject(ActivatedRoute);
  readonly sectionKey = this.route.snapshot.data['section'] as AdminSectionKey;
  readonly section = adminSections[this.sectionKey];
}
