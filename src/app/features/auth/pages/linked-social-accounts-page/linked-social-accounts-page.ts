import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthSessionService } from '../../../../core/auth/services/auth-session.service';
import { SocialProvider } from '../../../../core/auth/models/auth.models';
import { SocialAccountsFacade } from '../../data-access/social-accounts.facade';

@Component({
  selector: 'app-linked-social-accounts-page',
  imports: [DatePipe, ReactiveFormsModule, RouterLink],
  template: `<section class="identity-page">
    <header class="hero">
      <div>
        <p class="eyebrow">Identidad</p>
        <h1>Cuentas sociales vinculadas</h1>
        <p>
          Revisa qué proveedores ya están asociados a tu sesión y desvincúlalos con seguridad
          cuando el backend lo permita.
        </p>
      </div>
      <a class="button button--secondary" routerLink="/verifica-tu-correo">
        Estado de verificación
      </a>
    </header>

    @if (banner()) {
      <p class="notice" [class.notice--error]="bannerType() === 'error'" [class.notice--info]="bannerType() === 'info'" [class.notice--success]="bannerType() === 'success'" aria-live="polite">
        {{ banner() }}
      </p>
    }

    @if (facade.message()) {
      <p class="notice notice--success" aria-live="polite">{{ facade.message() }}</p>
    }

    @if (facade.error(); as error) {
      <p class="notice notice--error" role="alert">{{ resolveErrorMessage(error.message) }}</p>
    }

    @if (facade.status() === 'loading' || facade.status() === 'idle') {
      <p class="notice notice--info">Cargando tus cuentas vinculadas…</p>
    } @else if (facade.status() === 'unauthorized') {
      <p class="notice notice--error" role="alert">
        Tu sesión ya no es válida para consultar las cuentas vinculadas.
      </p>
      <a class="button" routerLink="/login">Iniciar sesión otra vez</a>
    } @else if (facade.status() === 'networkError' || facade.status() === 'unexpectedError') {
      <p class="notice notice--error" role="alert">
        No pudimos recuperar las cuentas vinculadas desde Laravel.
      </p>
      <button class="button" type="button" (click)="facade.load()">Reintentar</button>
    } @else if (facade.status() === 'empty') {
      <div class="card card--empty">
        <h2>Aún no hay cuentas sociales listadas</h2>
        <p>
          El backend ya expone el listado real, pero la vinculación nueva queda pendiente de una
          iniciación compatible con esta SPA Bearer-only.
        </p>
      </div>
    } @else {
      <div class="cards">
        @for (account of facade.accounts(); track account.provider) {
          <article class="card">
            <header class="card__header">
              <div>
                <p class="provider">{{ providerLabel(account.provider) }}</p>
                <h2>{{ account.providerEmailMasked ?? 'Sin correo expuesto por el proveedor' }}</h2>
              </div>
              <span class="pill" [class.pill--warn]="!account.providerEmailVerified">
                {{ account.providerEmailVerified ? 'Correo verificado' : 'Correo no verificado' }}
              </span>
            </header>

            <dl class="details">
              <div>
                <dt>Vinculada</dt>
                <dd>{{ account.linkedAt ? (account.linkedAt | date: 'medium') : 'Sin fecha disponible' }}</dd>
              </div>
              <div>
                <dt>Desvinculación</dt>
                <dd>{{ account.canUnlink ? 'Disponible' : 'Bloqueada por ser el último método de acceso' }}</dd>
              </div>
            </dl>

            <div class="hint">
              @if (canUseSocialReauth()) {
                Tu sesión actual incluye reautenticación social reciente; si esta cuenta es la que
                abrió la sesión, podría no requerir contraseña local.
              } @else {
                Si tu cuenta también usa contraseña local, ingrésala aquí para desvincular.
              }
            </div>

            <form class="unlink-form" [formGroup]="form" (ngSubmit)="unlink(account.provider)">
              <label [for]="account.provider + '-password'">Contraseña actual (opcional según tu tipo de acceso)</label>
              <input
                [id]="account.provider + '-password'"
                type="password"
                [formControlName]="account.provider"
                autocomplete="current-password"
                placeholder="Solo si tu cuenta usa contraseña local"
              />
              <button
                class="button button--secondary"
                type="submit"
                [disabled]="!account.canUnlink || facade.pendingProvider() === account.provider"
              >
                {{
                  facade.pendingProvider() === account.provider
                    ? 'Desvinculando…'
                    : 'Desvincular cuenta'
                }}
              </button>
            </form>
          </article>
        }
      </div>
    }
  </section>`,
  styles: `
    :host { display: block; }
    .identity-page { display: grid; gap: var(--s5); max-width: 72rem; }
    .hero {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--s4);
      flex-wrap: wrap;
    }
    .hero h1, .hero p { margin: 0; }
    .hero > div { display: grid; gap: var(--s2); max-width: 48rem; }
    .hero p:last-child { color: var(--color-text-muted); }
    .cards { display: grid; gap: var(--s4); grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr)); }
    .card {
      display: grid;
      gap: var(--s4);
      padding: clamp(1rem, 2vw, 1.5rem);
      border: 1px solid var(--color-border);
      border-radius: var(--r-lg);
      background: var(--color-surface);
      min-width: 0;
    }
    .card--empty { padding: clamp(1rem, 2vw, 1.5rem); border: 1px dashed var(--color-border); border-radius: var(--r-lg); }
    .card--empty h2, .card--empty p { margin: 0; }
    .card__header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--s3);
      flex-wrap: wrap;
    }
    .card__header h2, .card__header p { margin: 0; }
    .provider { color: var(--color-text-muted); font-size: var(--sm); font-weight: 700; text-transform: uppercase; letter-spacing: .08em; }
    .pill {
      padding: .45rem .75rem;
      border-radius: 999px;
      background: color-mix(in srgb, var(--color-brand) 10%, white);
      color: var(--color-brand);
      font-size: var(--xs);
      font-weight: 800;
      white-space: nowrap;
    }
    .pill--warn { background: var(--warning-100, #fff2cc); color: var(--warning-800, #8a5a00); }
    .details {
      display: grid;
      gap: var(--s3);
      margin: 0;
    }
    .details div { display: grid; gap: .15rem; }
    .details dt { color: var(--color-text-muted); font-size: var(--sm); font-weight: 700; }
    .details dd { margin: 0; overflow-wrap: anywhere; }
    .hint { color: var(--color-text-muted); font-size: var(--sm); }
    .unlink-form { display: grid; gap: var(--s2); }
    .unlink-form label { font-size: var(--sm); font-weight: 700; }
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
export class LinkedSocialAccountsPage {
  readonly facade = inject(SocialAccountsFacade);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly session = inject(AuthSessionService);
  private readonly destroyRef = inject(DestroyRef);

  readonly banner = signal<string | null>(null);
  readonly bannerType = signal<'info' | 'success' | 'error'>('info');
  readonly form = this.fb.nonNullable.group({
    google: [''],
    facebook: [''],
  });

  constructor() {
    this.facade.load();
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.banner.set(resolveSocialBanner(params.get('social_outcome'), params.get('social_error')));
      this.bannerType.set(params.get('social_error') ? 'error' : params.get('social_outcome') ? 'success' : 'info');
    });
  }

  providerLabel(provider: SocialProvider): string {
    return provider === 'google' ? 'Google' : 'Facebook';
  }

  canUseSocialReauth(): boolean {
    return this.session.abilities().includes('social_reauth');
  }

  unlink(provider: SocialProvider): void {
    const value = this.form.controls[provider].getRawValue().trim();
    this.facade.unlink(provider, value.length > 0 ? { current_password: value } : {});
    this.form.controls[provider].setValue('');
  }

  resolveErrorMessage(message: string): string {
    const code = this.facade.error()?.code;

    switch (code) {
      case 'invalid_current_password':
        return 'La contraseña actual no coincide con tu cuenta local.';
      case 'reauthentication_required':
        return 'Necesitas una reautenticación social reciente para desvincular este acceso.';
      case 'last_authentication_method':
        return 'No puedes desvincular el último método disponible para entrar a tu cuenta.';
      case 'not_linked':
        return 'Ese proveedor ya no aparece vinculado en el backend.';
      case 'too_many_requests':
        return 'Se alcanzó el límite temporal para desvincular cuentas. Espera antes de reintentar.';
      default:
        return message;
    }
  }
}

function resolveSocialBanner(outcome: string | null, error: string | null): string | null {
  if (outcome === 'social_linked') {
    return 'El backend confirmó la vinculación social y la devolvió a esta pantalla.';
  }

  if (outcome === 'already_linked') {
    return 'Esa cuenta social ya estaba vinculada a tu usuario.';
  }

  switch (error) {
    case 'social_identity_conflict':
      return 'La identidad social ya pertenece a otro usuario.';
    case 'provider_already_linked':
      return 'Tu cuenta ya tiene otro perfil vinculado para ese proveedor.';
    case 'invalid_state':
    case 'expired_state':
    case 'callback_already_processed':
      return 'El intento de vinculación ya no era válido cuando regresó al frontend.';
    case 'oauth_error':
      return 'El proveedor devolvió un error al intentar vincular la cuenta.';
    default:
      return null;
  }
}
