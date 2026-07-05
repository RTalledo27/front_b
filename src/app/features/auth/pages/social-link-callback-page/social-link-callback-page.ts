import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-social-link-callback-page',
  template: `<div class="auth-page">
    <p class="eyebrow">Cuentas vinculadas</p>
    <h2>Redirigiendo a tu identidad</h2>
    <p class="intro">Estamos devolviéndote al panel donde se muestran tus cuentas sociales.</p>
  </div>`,
  styles: `
    :host { display: block; width: min(100%, 32rem); }
    .auth-page { display: grid; gap: var(--s3); padding-block: var(--s6); }
    h2, .intro { margin: 0; }
    .intro { color: var(--color-text-muted); }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SocialLinkCallbackPage {
  private readonly router = inject(Router);

  constructor() {
    const url = new URL(this.router.url, window.location.origin);
    const queryParams = {
      provider: url.searchParams.get('provider') ?? undefined,
      social_outcome: url.searchParams.get('outcome') ?? undefined,
      social_error: url.searchParams.get('error') ?? undefined,
    };

    void this.router.navigate(['/jugador/identidad'], {
      queryParams,
    });
  }
}
