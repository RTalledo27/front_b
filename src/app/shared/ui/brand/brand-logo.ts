import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { BrandMark } from './brand-mark';

@Component({
  selector: 'app-brand-logo',
  imports: [BrandMark],
  template: `
    <app-brand-mark />
    @if (!compact()) {
      <span class="copy">
        <strong>Fortuna</strong>
        <small>Rifas &amp; bingos</small>
      </span>
    }
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: 0.7rem;
      color: var(--color-brand-strong);
    }
    .copy {
      display: grid;
      line-height: 1.05;
    }
    strong {
      font-size: 1.05rem;
      letter-spacing: -0.02em;
    }
    small {
      margin-top: 0.22rem;
      color: var(--color-text-muted);
      font-size: 0.66rem;
      font-weight: 750;
      letter-spacing: 0.075em;
      text-transform: uppercase;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrandLogo {
  readonly compact = input(false);
}
