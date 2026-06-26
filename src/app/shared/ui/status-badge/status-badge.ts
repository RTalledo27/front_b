import { ChangeDetectionStrategy, Component, input } from '@angular/core';
export type StatusTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';
@Component({
  selector: 'app-status-badge',
  template: `<span aria-hidden="true"></span><ng-content />`,
  host: { '[class]': '"badge badge--" + tone()' },
  styles: `
    :host {
      display: inline-flex;
      width: fit-content;
      align-items: center;
      gap: 0.4rem;
      padding: 0.35rem 0.6rem;
      border-radius: 999px;
      font-size: var(--xs);
      font-weight: 800;
      line-height: 1;
    }
    :host span {
      width: 0.45rem;
      height: 0.45rem;
      border-radius: 50%;
      background: currentColor;
    }
    .badge--neutral {
      background: var(--neutral-100);
      color: var(--neutral-600);
    }
    .badge--info {
      background: var(--info-50);
      color: var(--info-600);
    }
    .badge--success {
      background: var(--success-50);
      color: var(--success-600);
    }
    .badge--warning {
      background: var(--accent-100);
      color: var(--accent-700);
    }
    .badge--danger {
      background: var(--danger-50);
      color: var(--danger-600);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusBadge {
  readonly tone = input<StatusTone>('neutral');
}
