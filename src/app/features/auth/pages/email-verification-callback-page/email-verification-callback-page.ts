import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthSessionService } from '../../../../core/auth/services/auth-session.service';
import { buildVerifyEmailPayload } from '../../../../core/auth/services/auth-identity.mapper';
import { EmailVerificationFacade } from '../../data-access/email-verification.facade';

@Component({
  selector: 'app-email-verification-callback-page',
  imports: [RouterLink],
  template: `<div class="auth-page">
    <p class="eyebrow">Confirmación de correo</p>
    <h2>Verificando tu enlace</h2>

    @if (!payload()) {
      <p class="notice notice--error" role="alert">
        El enlace de verificación está incompleto o fue alterado.
      </p>
    } @else if (!session.isAuthenticated()) {
      <p class="notice notice--info" aria-live="polite">
        Necesitas una sesión activa para completar la verificación de correo.
      </p>
      <a class="button" [routerLink]="['/login']" [queryParams]="{ returnUrl: router.url }">
        Ingresar para verificar
      </a>
    } @else {
      @if (facade.verifyStatus() === 'verifying') {
        <p class="notice notice--info" aria-live="polite">Validando el enlace firmado…</p>
      }

      @if (facade.verifyMessage()) {
        <p class="notice notice--success" aria-live="polite">{{ facade.verifyMessage() }}</p>
      }

      @if (facade.verifyError(); as error) {
        <p class="notice notice--error" role="alert">{{ error.message }}</p>
      }

      <div class="actions">
        <button
          class="button"
          type="button"
          [disabled]="facade.verifyStatus() === 'verifying'"
          (click)="retry()"
        >
          {{
            facade.verifyStatus() === 'verifying'
              ? 'Verificando…'
              : facade.verifyStatus() === 'success'
                ? 'Verificar nuevamente'
                : 'Reintentar verificación'
          }}
        </button>
        <a class="button button--secondary" routerLink="/verifica-tu-correo">
          Volver al estado de verificación
        </a>
      </div>
    }
  </div>`,
  styles: `
    :host { display: block; width: min(100%, 34rem); }
    .auth-page { display: grid; gap: var(--s5); padding-block: var(--s6); }
    h2 { margin: 0; font-size: var(--2xl); letter-spacing: -.03em; }
    .actions { display: grid; gap: var(--s3); }
    .notice {
      padding: var(--s3);
      margin: 0;
      border: 1px solid var(--color-border);
      border-radius: var(--r-md);
      font-size: var(--sm);
    }
    .notice--error { border-left: 4px solid var(--danger-600); background: var(--danger-50); color: var(--danger-600); }
    .notice--info { border-left: 4px solid var(--color-link); background: var(--color-surface-subtle); color: var(--color-text); }
    .notice--success {
      border-left: 4px solid var(--color-brand);
      background: color-mix(in srgb, var(--color-brand) 8%, white);
      color: var(--color-brand);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmailVerificationCallbackPage {
  readonly session = inject(AuthSessionService);
  readonly facade = inject(EmailVerificationFacade);
  readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly payload = computed(() =>
    buildVerifyEmailPayload(
      this.route.snapshot.paramMap.get('id'),
      this.route.snapshot.paramMap.get('hash'),
      this.route.snapshot.queryParamMap.get('expires'),
      this.route.snapshot.queryParamMap.get('signature'),
    ),
  );

  constructor() {
    const payload = this.payload();

    if (payload !== null && this.session.isAuthenticated()) {
      this.facade.verify(payload);
    }
  }

  retry(): void {
    const payload = this.payload();

    if (payload === null) {
      return;
    }

    this.facade.verify(payload);
  }
}
