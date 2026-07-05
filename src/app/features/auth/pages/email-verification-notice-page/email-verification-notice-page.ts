import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthSessionService } from '../../../../core/auth/services/auth-session.service';
import { EmailVerificationFacade } from '../../data-access/email-verification.facade';

@Component({
  selector: 'app-email-verification-notice-page',
  imports: [RouterLink],
  template: `<div class="auth-page">
    <p class="eyebrow">Correo pendiente</p>
    <h2>Verifica tu correo electrónico</h2>
    <p class="intro">
      @if (isVerified()) {
        Tu cuenta ya aparece verificada. Puedes continuar con normalidad.
      } @else {
        Enviamos la verificación a <strong>{{ email() }}</strong>. Revisa tu bandeja y confirma
        el enlace antes de continuar con acciones que requieran identidad validada.
      }
    </p>

    @if (facade.resendMessage()) {
      <p class="notice notice--success" aria-live="polite">{{ facade.resendMessage() }}</p>
    }

    @if (facade.resendError(); as error) {
      <p class="notice notice--error" role="alert">{{ error.message }}</p>
    }

    <div class="actions">
      @if (!isVerified()) {
        <button
          class="button"
          type="button"
          [disabled]="facade.resendStatus() === 'submitting'"
          (click)="facade.resend()"
        >
          {{
            facade.resendStatus() === 'submitting'
              ? 'Reenviando…'
              : 'Reenviar verificación'
          }}
        </button>
      }

      <a class="button button--secondary" routerLink="/jugador/identidad">
        Revisar cuentas vinculadas
      </a>
      <a class="button button--secondary" [routerLink]="continueRoute()">
        {{ isVerified() ? 'Continuar' : 'Volver luego' }}
      </a>
    </div>

    <p class="caption">
      La verificación mantiene un mensaje neutro: nunca mostramos desde esta pantalla si un correo
      existe o no fuera de tu propia sesión autenticada.
    </p>
  </div>`,
  styles: `
    :host { display: block; width: min(100%, 34rem); }
    .auth-page { display: grid; gap: var(--s5); padding-block: var(--s6); }
    h2 { margin: 0; font-size: var(--2xl); letter-spacing: -.03em; }
    .intro { margin: 0; color: var(--neutral-600); }
    .actions { display: grid; gap: var(--s3); }
    .caption { margin: 0; color: var(--color-text-muted); font-size: var(--sm); }
    .notice {
      padding: var(--s3);
      margin: 0;
      border: 1px solid var(--color-border);
      border-radius: var(--r-md);
      font-size: var(--sm);
    }
    .notice--error { border-left: 4px solid var(--danger-600); background: var(--danger-50); color: var(--danger-600); }
    .notice--success {
      border-left: 4px solid var(--color-brand);
      background: color-mix(in srgb, var(--color-brand) 8%, white);
      color: var(--color-brand);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmailVerificationNoticePage {
  private readonly session = inject(AuthSessionService);
  readonly facade = inject(EmailVerificationFacade);

  readonly email = computed(() => this.session.user()?.email ?? 'tu correo');
  readonly isVerified = computed(() => this.session.user()?.emailVerified ?? false);
  readonly continueRoute = computed(() =>
    this.session.user()?.capabilities.canAccessAdmin ? '/admin/dashboard' : '/jugador/inicio',
  );
}
