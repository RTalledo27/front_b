import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type AppIconName =
  | 'menu'
  | 'close'
  | 'home'
  | 'bingo'
  | 'raffle'
  | 'orders'
  | 'users'
  | 'payments'
  | 'reports'
  | 'settings'
  | 'ticket'
  | 'logout'
  | 'arrow'
  | 'bell';

@Component({
  selector: 'app-icon',
  template: `<svg viewBox="0 0 24 24" aria-hidden="true">
    @switch (name()) {
      @case ('menu') {
        <path d="M4 7h16M4 12h16M4 17h16" />
      }
      @case ('close') {
        <path d="m6 6 12 12M18 6 6 18" />
      }
      @case ('home') {
        <path d="m3 11 9-8 9 8v9H6v-9M9 20v-6h6v6" />
      }
      @case ('bingo') {
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="3" />
      }
      @case ('raffle') {
        <path d="M4 6h16v4a2 2 0 0 0 0 4v4H4v-4a2 2 0 0 0 0-4V6Z" />
        <path d="M12 6v12" />
      }
      @case ('orders') {
        <path d="M6 3h12v18H6zM9 8h6M9 12h6M9 16h4" />
      }
      @case ('users') {
        <path
          d="M16 20v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M9.5 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM17 11a3 3 0 0 0 0-6M21 20v-2.2a3.8 3.8 0 0 0-2.6-3.6"
        />
      }
      @case ('payments') {
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M3 10h18M7 15h3" />
      }
      @case ('reports') {
        <path d="M5 20V10M12 20V4M19 20v-7" />
      }
      @case ('settings') {
        <circle cx="12" cy="12" r="3" />
        <path
          d="M12 2v3M12 19v3M4.9 4.9 7 7M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1"
        />
      }
      @case ('ticket') {
        <path d="M4 7h16v3a2 2 0 0 0 0 4v3H4v-3a2 2 0 0 0 0-4V7Z" />
        <path d="M9 7v10" />
      }
      @case ('logout') {
        <path d="M10 17l5-5-5-5M15 12H3M15 4h5v16h-5" />
      }
      @case ('arrow') {
        <path d="m9 18 6-6-6-6" />
      }
      @case ('bell') {
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
      }
    }
  </svg>`,
  styles: `
    :host {
      display: inline-grid;
      width: 1.25rem;
      height: 1.25rem;
      flex: 0 0 auto;
      place-items: center;
    }
    svg {
      width: 100%;
      height: 100%;
      fill: none;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 1.8;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppIcon {
  readonly name = input.required<AppIconName>();
}
