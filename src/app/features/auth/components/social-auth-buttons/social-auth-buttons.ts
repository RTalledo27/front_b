import { ChangeDetectionStrategy, Component, input } from '@angular/core';

type SocialProvider = 'google' | 'facebook';

@Component({
  selector: 'app-social-auth-buttons',
  template: `<section class="social-auth" [attr.aria-label]="sectionLabel()">
    <div class="social-auth__divider" aria-hidden="true">
      <span></span>
      <p>{{ dividerLabel() }}</p>
      <span></span>
    </div>

    <div class="social-auth__grid">
      @for (provider of providers; track provider) {
        <a
          class="social-auth__button"
          [href]="providerUrl(provider)"
          [attr.data-provider]="provider"
          [attr.aria-label]="buttonLabel(provider)"
        >
          <span class="social-auth__icon" aria-hidden="true">
            @if (provider === 'google') {
              <svg viewBox="0 0 24 24" focusable="false">
                <path
                  fill="#4285F4"
                  d="M21.8 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.5a4.7 4.7 0 0 1-2 3.1v2.6h3.2c1.9-1.8 3.1-4.4 3.1-7.5Z"
                />
                <path
                  fill="#34A853"
                  d="M12 22c2.7 0 5-1 6.7-2.6l-3.2-2.6c-.9.6-2 .9-3.5.9-2.7 0-5-1.8-5.9-4.3H2.8V16A10 10 0 0 0 12 22Z"
                />
                <path
                  fill="#FBBC05"
                  d="M6.1 13.4A6 6 0 0 1 5.8 12c0-.5.1-1 .3-1.4V8H2.8A10 10 0 0 0 2 12c0 1.4.3 2.8.8 4l3.3-2.6Z"
                />
                <path
                  fill="#EA4335"
                  d="M12 6.3c1.5 0 2.8.5 3.8 1.5l2.9-2.9A9.9 9.9 0 0 0 12 2 10 10 0 0 0 2.8 8l3.3 2.6c.8-2.5 3.2-4.3 5.9-4.3Z"
                />
              </svg>
            } @else {
              <svg viewBox="0 0 24 24" focusable="false">
                <path
                  fill="#1877F2"
                  d="M24 12a12 12 0 1 0-13.9 11.9v-8.4H7v-3.5h3.1V9.3c0-3.1 1.8-4.8 4.6-4.8 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9V12H17l-.5 3.5H14v8.4A12 12 0 0 0 24 12Z"
                />
                <path
                  fill="#ffffff"
                  d="M16.5 15.5 17 12h-3V9.6c0-1 .5-1.9 2-1.9h1.5v-3s-1.4-.2-2.7-.2c-2.8 0-4.6 1.7-4.6 4.8V12H7v3.5h3.1v8.4c.6.1 1.3.1 1.9.1.7 0 1.4 0 2-.1v-8.4h2.5Z"
                />
              </svg>
            }
          </span>
          <span class="social-auth__text">{{ buttonLabel(provider) }}</span>
        </a>
      }
    </div>
  </section>`,
  styles: `
    .social-auth {
      display: grid;
      gap: var(--s4);
      margin-top: var(--s5);
    }

    .social-auth__divider {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
      gap: var(--s3);
      align-items: center;
    }

    .social-auth__divider span {
      display: block;
      height: 1px;
      background: color-mix(in srgb, var(--color-text-muted) 24%, white);
    }

    .social-auth__divider p {
      margin: 0;
      color: var(--color-text-muted);
      font-size: var(--sm);
      font-weight: 700;
      text-align: center;
    }

    .social-auth__grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: var(--s3);
    }

    .social-auth__button {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: var(--s3);
      align-items: center;
      min-height: 3.5rem;
      padding: 0.95rem 1rem;
      border: 1px solid color-mix(in srgb, var(--color-text) 10%, white);
      border-radius: var(--r-md);
      background: var(--color-white);
      color: var(--color-text);
      text-decoration: none;
      box-shadow: 0 1px 0 color-mix(in srgb, var(--color-text) 6%, white);
      transition:
        border-color 120ms ease,
        box-shadow 120ms ease,
        transform 120ms ease,
        background-color 120ms ease;
    }

    .social-auth__button:hover {
      border-color: color-mix(in srgb, var(--color-brand) 30%, white);
      background: color-mix(in srgb, var(--color-brand) 4%, white);
      box-shadow: 0 10px 24px color-mix(in srgb, var(--color-brand) 12%, transparent);
      transform: translateY(-1px);
    }

    .social-auth__button:focus-visible {
      outline: 3px solid color-mix(in srgb, var(--color-brand) 38%, white);
      outline-offset: 2px;
      border-color: var(--color-brand);
    }

    .social-auth__icon {
      display: grid;
      width: 1.5rem;
      height: 1.5rem;
      place-items: center;
      flex: 0 0 auto;
    }

    .social-auth__icon svg {
      display: block;
      width: 100%;
      height: 100%;
    }

    .social-auth__text {
      font-weight: 700;
      line-height: 1.2;
      text-wrap: balance;
    }

    @media (max-width: 42rem) {
      .social-auth__grid {
        grid-template-columns: 1fr;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SocialAuthButtons {
  readonly dividerLabel = input.required<string>();
  readonly baseUrl = input.required<string>();
  readonly sectionLabel = input('Acceso social');

  readonly providers: readonly SocialProvider[] = ['google', 'facebook'];

  providerUrl(provider: SocialProvider): string {
    return `${this.baseUrl()}/auth/social/${provider}/redirect`;
  }

  buttonLabel(provider: SocialProvider): string {
    return provider === 'google' ? 'Continuar con Google' : 'Continuar con Facebook';
  }
}
