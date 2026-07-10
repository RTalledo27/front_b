import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ApiError, toApiError } from '../../../../core/api/models/api-error.models';
import { AuthRedirectService } from '../../../../core/auth/services/auth-redirect.service';
import { AuthSessionService } from '../../../../core/auth/services/auth-session.service';

@Component({
  selector: 'app-activate-page',
  imports: [ReactiveFormsModule, RouterLink],
  template: `<div class="auth-page">
    <p class="eyebrow">Invitación</p>
    <h2>Activa tu cuenta</h2>
    <p class="intro">Usa el token recibido para definir tu contraseña inicial y entrar al portal.</p>
    <p class="notice notice--info">
      Activar tu invitación crea tu acceso, pero algunas acciones como reservar números o subir evidencia
      siguen requiriendo verificar tu correo.
    </p>

    <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
      <div class="form-field">
        <label for="token">Token de activación</label>
        <input
          id="token"
          type="text"
          formControlName="token"
          autocomplete="one-time-code"
          placeholder="Pega aquí tu token"
          [attr.aria-describedby]="tokenError() ? 'token-error' : null"
        />
        @if (tokenError()) {
          <small id="token-error" class="error">{{ tokenError() }}</small>
        }
      </div>

      <div class="form-field">
        <label for="password">Nueva contraseña</label>
        <input
          id="password"
          type="password"
          formControlName="password"
          autocomplete="new-password"
          placeholder="Elige una contraseña segura"
          [attr.aria-describedby]="passwordError() ? 'password-error' : null"
        />
        @if (passwordError()) {
          <small id="password-error" class="error">{{ passwordError() }}</small>
        }
      </div>

      <div class="form-field">
        <label for="password_confirmation">Confirmar contraseña</label>
        <input
          id="password_confirmation"
          type="password"
          formControlName="password_confirmation"
          autocomplete="new-password"
          placeholder="Repite tu contraseña"
          [attr.aria-describedby]="passwordConfirmationError() ? 'password-confirmation-error' : null"
        />
        @if (passwordConfirmationError()) {
          <small id="password-confirmation-error" class="error">{{ passwordConfirmationError() }}</small>
        }
      </div>

      @if (submitError(); as error) {
        <p class="notice notice--error" role="alert">{{ resolveActivationMessage(error) }}</p>
      }

      <button class="button" type="submit" [disabled]="submitting()">
        {{ submitting() ? 'Activando cuenta…' : 'Activar cuenta' }}
      </button>
    </form>

    <div class="links">
      <a routerLink="/login">Volver a login</a>
      <a routerLink="/registro">Prefiero registrarme</a>
    </div>
  </div>`,
  styles: `
    :host { display: block; width: min(100%, 32rem); }
    .auth-page { padding-block: var(--s6); }
    h2 { margin-bottom: var(--s2); font-size: var(--2xl); letter-spacing: -.03em; }
    .intro { margin-bottom: var(--s8); color: var(--neutral-600); }
    form { display: grid; gap: var(--s5); }
    .button { width: 100%; margin-top: var(--s2); }
    .error { color: var(--danger-600); font-size: var(--xs); font-weight: 650; }
    .notice { padding: var(--s3); margin: 0; border: 1px solid var(--color-border); border-radius: var(--r-md); font-size: var(--sm); }
    .notice--info { border-left: 4px solid var(--color-brand); background: color-mix(in srgb, var(--color-brand) 8%, white); color: var(--color-text); }
    .notice--error { border-left: 4px solid var(--danger-600); background: var(--danger-50); color: var(--danger-600); }
    .links { display: flex; justify-content: space-between; gap: var(--s3); margin-top: var(--s5); }
    .links a { color: var(--color-link); font-size: var(--sm); font-weight: 750; text-decoration: none; }
    .links a:hover { color: var(--color-link-hover); text-decoration: underline; }
    @media (max-width: 36rem) { .links { align-items: flex-start; flex-direction: column; } }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActivatePage {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly redirects = inject(AuthRedirectService);
  private readonly session = inject(AuthSessionService);
  private readonly destroyRef = inject(DestroyRef);

  readonly submitted = signal(false);
  readonly submitting = signal(false);
  readonly submitError = signal<ApiError | null>(null);
  readonly form = this.fb.nonNullable.group({
    token: [this.route.snapshot.queryParamMap.get('token') ?? '', [Validators.required]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    password_confirmation: ['', [Validators.required]],
  });

  readonly tokenError = () => this.resolveFieldError('token', 'El token es obligatorio.');
  readonly passwordError = () =>
    this.resolveFieldError('password', 'La contraseña debe tener al menos 8 caracteres.');
  readonly passwordConfirmationError = () => {
    const backendError = this.submitError()?.fieldErrors['password_confirmation']?.[0] ?? null;

    if (backendError) {
      return backendError;
    }

    if (!this.submitted() && !this.form.controls.password_confirmation.touched) {
      return null;
    }

    if (this.form.controls.password_confirmation.invalid) {
      return 'Confirma tu contraseña.';
    }

    if (this.passwordsDoNotMatch()) {
      return 'Las contraseñas no coinciden.';
    }

    return null;
  };

  submit(): void {
    this.submitted.set(true);
    this.submitError.set(null);

    if (this.form.invalid || this.passwordsDoNotMatch()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.session
      .activate(this.form.getRawValue())
      .pipe(
        finalize(() => this.submitting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (user) => void this.router.navigateByUrl(this.redirects.routeForUser(user)),
        error: (error: unknown) => this.submitError.set(toApiError(error)),
      });
  }

  resolveActivationMessage(error: ApiError): string {
    switch (error.reason) {
      case 'expired':
        return 'La invitación expiró.';
      case 'revoked':
        return 'La invitación fue revocada.';
      case 'consumed':
        return 'La invitación ya fue utilizada.';
      case 'already_active':
        return 'La cuenta ya estaba activa. Inicia sesión.';
      default:
        return error.message;
    }
  }

  private passwordsDoNotMatch(): boolean {
    const { password, password_confirmation } = this.form.getRawValue();
    return password !== password_confirmation;
  }

  private resolveFieldError(
    controlName: 'token' | 'password',
    fallback: string,
  ): string | null {
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
