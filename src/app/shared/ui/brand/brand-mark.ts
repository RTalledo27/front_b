import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-brand-mark',
  template: `
    <svg viewBox="0 0 40 40" aria-hidden="true" focusable="false">
      <path class="ticket" d="M6.5 5.5h27v7a4 4 0 0 0 0 8v14h-27v-14a4 4 0 0 0 0-8v-7Z" />
      <path class="letter" d="M15 29V11h12M15 19h9" />
      <circle class="seal" cx="29.5" cy="29" r="2.75" />
    </svg>
  `,
  styles: `
    :host {
      display: inline-grid;
      width: 2.25rem;
      height: 2.25rem;
      flex: 0 0 auto;
      place-items: center;
      border-radius: 0.65rem;
      overflow: hidden;
    }
    svg {
      width: 100%;
      height: 100%;
    }
    .ticket {
      fill: var(--color-brand);
    }
    .letter {
      fill: none;
      stroke: var(--color-brand-contrast);
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 2.6;
    }
    .seal {
      fill: var(--color-prize);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrandMark {}
