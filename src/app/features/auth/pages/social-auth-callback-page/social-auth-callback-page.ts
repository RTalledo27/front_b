import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { EMPTY, catchError, finalize } from 'rxjs';
import { ApiError, toApiError } from '../../../../core/api/models/api-error.models';
import { AuthRedirectService } from '../../../../core/auth/services/auth-redirect.service';
import { AuthSessionService } from '../../../../core/auth/services/auth-session.service';
import { toAuthFlowError } from '../../../../core/auth/services/auth-response.utils';

@Component({
  selector: 'app-social-auth-callback-page',
  imports: [RouterLink],
  template: `<div class="auth-page">
    <p class="eyebrow">Acceso social</p>
    <h2>Completando tu ingreso</h2>

    @if (message()) {
      <p class="notice" [class.notice--error]="error()" [class.notice--info]="!error()" [attr.role]="error() ? 'alert' : null" aria-live="polite">
        {{ message() }}
      </p>
    }

    <div class="actions">
      @if (error()) {
        <a class="button" routerLink="/login">Volver a iniciar sesión</a>
        <a class="button button--secondary" routerLink="/registro">Crear cuenta local</a>
      } @else {
        <a class="button button--secondary" routerLink="/login">Cancelar</a>
      }
    </div>
  </div>`,
  styles: `
    :host { display: block; width: min(100%, 32rem); }
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
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SocialAuthCallbackPage {
  private readonly router = inject(Router);
  private readonly redirects = inject(AuthRedirectService);
  private readonly session = inject(AuthSessionService);
  private readonly destroyRef = inject(DestroyRef);

  readonly message = signal('Validando el acceso con tu proveedor…');
  readonly error = signal<ApiError | null>(null);

  constructor() {
    const url = new URL(this.router.url, window.location.origin);
    const errorCode = url.searchParams.get('error');
    const code = url.searchParams.get('code');

    if (typeof errorCode === 'string' && errorCode.length > 0) {
      this.error.set({
        status: 0,
        code: errorCode,
        message: mapSocialCallbackError(errorCode),
        fieldErrors: {},
        reason: null,
      });
      this.message.set(mapSocialCallbackError(errorCode));
      return;
    }

    if (typeof code !== 'string' || code.length !== 64) {
      this.error.set({
        status: 0,
        code: 'social_callback_invalid',
        message: 'No recibimos un intento social válido. Inícialo nuevamente.',
        fieldErrors: {},
        reason: null,
      });
      this.message.set('No recibimos un intento social válido. Inícialo nuevamente.');
      return;
    }

    this.session
      .completeSocialLogin({ code })
      .pipe(
        catchError((error: unknown) => {
          const apiError = toAuthFlowError(error);
          this.error.set(apiError);
          this.message.set(mapSocialExchangeError(apiError));
          return EMPTY;
        }),
        finalize(() => undefined),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((user) => {
        void this.router.navigateByUrl(this.redirects.routeForUser(user));
      });
  }
}

function mapSocialCallbackError(code: string): string {
  switch (code) {
    case 'oauth_error':
      return 'No pudimos completar la autorización con el proveedor. Inténtalo nuevamente.';
    case 'invalid_provider':
      return 'El proveedor solicitado no está disponible.';
    case 'invalid_state':
    case 'expired_state':
    case 'callback_already_processed':
      return 'El intento social ya no es válido. Inícialo otra vez desde el frontend.';
    case 'account_link_required':
      return 'Ese correo ya pertenece a una cuenta local. Inicia sesión con tu contraseña antes de usar vinculación social.';
    case 'verified_email_required':
      return 'El proveedor no confirmó un correo verificado. Usa acceso local o intenta con otro proveedor.';
    default:
      return 'No pudimos completar el acceso social. Inténtalo nuevamente.';
  }
}

function mapSocialExchangeError(error: ApiError): string {
  if (error.code === 'exchange_code_not_found' || error.code === 'exchange_code_expired') {
    return 'El intento social expiró antes de completarse. Vuelve a iniciarlo.';
  }

  if (error.code === 'exchange_code_consumed') {
    return 'Ese intento social ya fue usado. Inicia uno nuevo desde el botón social.';
  }

  if (error.status === 429) {
    return 'Se alcanzó el límite de intentos sociales. Espera un momento antes de reintentar.';
  }

  if (error.status === 0) {
    return 'No pudimos conectar con Laravel para completar el acceso social.';
  }

  return error.message;
}
