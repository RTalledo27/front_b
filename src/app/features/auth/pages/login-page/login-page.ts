import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EMPTY, catchError, finalize, from, map, switchMap, throwError } from 'rxjs';
import { API_BASE_URL } from '../../../../core/api/api.config';
import { ApiError } from '../../../../core/api/models/api-error.models';
import {
  createAuthRedirectError,
  toAuthFlowError,
} from '../../../../core/auth/services/auth-response.utils';
import { AuthRedirectService } from '../../../../core/auth/services/auth-redirect.service';
import { AuthSessionService } from '../../../../core/auth/services/auth-session.service';

@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule, RouterLink],
  template: `<div class="auth-page">
    <p class="eyebrow">Bienvenido de vuelta</p>
    <h2>Inicia sesión</h2>
    <p class="intro">Accede a tus juegos, compras y premios con tu cuenta real de Stackflow.</p>

    <div class="social-actions" aria-label="Acceso social">
      <a class="button button--secondary" [href]="socialLoginUrl('google')">Continuar con Google</a>
      <a class="button button--secondary" [href]="socialLoginUrl('facebook')">Continuar con Facebook</a>
    </div>

    <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
      <div class="form-field">
        <label for="email">Correo electrónico</label>
        <input
          id="email"
          type="email"
          formControlName="email"
          autocomplete="email"
          placeholder="tu@correo.com"
          [attr.aria-describedby]="emailError() ? 'email-error' : null"
        />
        @if (emailError()) {
          <small id="email-error" class="error">{{ emailError() }}</small>
        }
      </div>

      <div class="form-field">
        <div class="label-row">
          <label for="password">Contraseña</label>
          <div class="support-links">
            <a routerLink="/recuperar-acceso">Olvidé mi contraseña</a>
            <a routerLink="/activar">Activar invitación</a>
          </div>
        </div>
        <input
          id="password"
          type="password"
          formControlName="password"
          autocomplete="current-password"
          placeholder="Tu contraseña"
          [attr.aria-describedby]="passwordError() ? 'password-error' : null"
        />
        @if (passwordError()) {
          <small id="password-error" class="error">{{ passwordError() }}</small>
        }
      </div>

      @if (submitError(); as error) {
        <p class="notice notice--error" role="alert">{{ error.message }}</p>
      }

      <button class="button" type="submit" [disabled]="submitting()">
        {{ submitting() ? 'Ingresando…' : 'Ingresar a mi cuenta' }}
      </button>
    </form>

    <div class="session-check">
      <p>
        Si ya tienes una sesión válida en esta pestaña, puedes restaurarla sin volver a escribir
        tus credenciales.
      </p>
      <button
        class="button button--secondary"
        type="button"
        [disabled]="checkingSession()"
        (click)="checkSession()"
      >
        {{ checkingSession() ? 'Comprobando…' : 'Comprobar sesión actual' }}
      </button>
      @if (sessionMessage()) {
        <small aria-live="polite">{{ sessionMessage() }}</small>
      }
    </div>

    <div class="links">
      <a routerLink="/registro">Crear una cuenta de jugador</a>
      <a routerLink="/bingos">Continuar al catálogo público</a>
    </div>
  </div>`,
  styles: `
    :host { display: block; width: min(100%, 30rem); }
    .auth-page { padding-block: var(--s6); }
    h2 { margin-bottom: var(--s2); font-size: var(--2xl); letter-spacing: -.03em; }
    .intro { margin-bottom: var(--s8); color: var(--neutral-600); }
    .social-actions {
      display: grid;
      gap: var(--s3);
      margin-bottom: var(--s5);
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    form { display: grid; gap: var(--s5); }
    .label-row { display: flex; align-items: center; justify-content: space-between; gap: var(--s3); }
    .support-links { display: flex; align-items: center; gap: var(--s3); flex-wrap: wrap; justify-content: flex-end; }
    .label-row a, .links a { color: var(--color-link); font-size: var(--sm); font-weight: 750; text-decoration: none; }
    .label-row a:hover, .links a:hover { color: var(--color-link-hover); text-decoration: underline; }
    .button { width: 100%; margin-top: var(--s2); }
    .error { color: var(--danger-600); font-size: var(--xs); font-weight: 650; }
    .notice { padding: var(--s3); margin: 0; border: 1px solid var(--color-border); border-radius: var(--r-md); font-size: var(--sm); }
    .notice--error { border-left: 4px solid var(--danger-600); background: var(--danger-50); color: var(--danger-600); }
    .session-check { display: grid; gap: var(--s3); padding: var(--s5); margin-top: var(--s6); border: 1px solid var(--color-border); border-radius: var(--r-md); background: var(--color-surface-subtle); }
    .session-check p, .session-check small { margin: 0; color: var(--color-text-muted); font-size: var(--sm); }
    .links { display: flex; justify-content: space-between; gap: var(--s3); margin-top: var(--s5); }
    @media (max-width: 36rem) {
      .links, .label-row, .support-links { align-items: flex-start; flex-direction: column; }
      .social-actions { grid-template-columns: 1fr; }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly redirects = inject(AuthRedirectService);
  private readonly session = inject(AuthSessionService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  readonly submitted = signal(false);
  readonly submitting = signal(false);
  readonly checkingSession = signal(false);
  readonly submitError = signal<ApiError | null>(null);
  readonly sessionMessage = signal<string | null>(null);
  readonly returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  readonly emailError = () => this.resolveFieldError('email', 'Ingresa un correo válido.');
  readonly passwordError = () =>
    this.resolveFieldError('password', 'La contraseña es obligatoria.');

  socialLoginUrl(provider: 'google' | 'facebook'): string {
    return `${this.apiBaseUrl}/auth/social/${provider}/redirect`;
  }

  submit(): void {
    this.submitted.set(true);
    this.submitError.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (this.submitting()) {
      return;
    }

    this.submitting.set(true);
    this.session
      .login(this.form.getRawValue())
      .pipe(
        switchMap((user) =>
          from(Promise.resolve(this.redirects.resolveReturnUrl(user, this.returnUrl))).pipe(
            switchMap((targetUrl) => from(this.router.navigateByUrl(targetUrl))),
            map((navigated) => {
              if (!navigated) {
                throw createAuthRedirectError();
              }

              return user;
            }),
            catchError(() => throwError(() => createAuthRedirectError())),
          ),
        ),
        catchError((error: unknown) => {
          this.submitError.set(toAuthFlowError(error));
          return EMPTY;
        }),
        finalize(() => this.submitting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  checkSession(): void {
    this.checkingSession.set(true);
    this.sessionMessage.set(null);
    this.session
      .refreshSession()
      .pipe(
        switchMap((user) => {
          if (!user) {
            this.sessionMessage.set('No encontramos una sesión activa en esta pestaña.');
            return EMPTY;
          }

          return from(
            this.router.navigateByUrl(this.redirects.resolveReturnUrl(user, this.returnUrl)),
          ).pipe(
            map((navigated) => {
              if (!navigated) {
                throw createAuthRedirectError();
              }

              return user;
            }),
            catchError(() => throwError(() => createAuthRedirectError())),
          );
        }),
        catchError((error: unknown) => {
          this.sessionMessage.set(toAuthFlowError(error).message);
          return EMPTY;
        }),
        finalize(() => this.checkingSession.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  private resolveFieldError(controlName: 'email' | 'password', fallback: string): string | null {
    const control = this.form.controls[controlName];
    const backendError = this.submitError()?.fieldErrors[controlName]?.[0] ?? null;

    if (backendError) {
      return backendError;
    }

    if (!control.invalid || (!control.touched && !this.submitted())) {
      return null;
    }

    return fallback;
  }
}
