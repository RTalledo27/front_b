import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { API_BASE_URL } from '../../../../core/api/api.config';
import { ApiError, toApiError } from '../../../../core/api/models/api-error.models';
import { AuthRedirectService } from '../../../../core/auth/services/auth-redirect.service';
import { AuthSessionService } from '../../../../core/auth/services/auth-session.service';
import { SocialAuthButtons } from '../../components/social-auth-buttons/social-auth-buttons';

@Component({
  selector: 'app-register-page',
  imports: [ReactiveFormsModule, RouterLink, SocialAuthButtons],
  template: `<div class="auth-page">
    <p class="eyebrow">Cuenta nueva</p>
    <h2>Crea tu acceso de jugador</h2>
    <p class="intro">Regístrate con tu correo para comprar, revisar órdenes y seguir tus partidas.</p>

    <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
      <div class="form-field">
        <label for="name">Nombre completo</label>
        <input
          id="name"
          type="text"
          formControlName="name"
          autocomplete="name"
          placeholder="Tu nombre"
          [attr.aria-describedby]="nameError() ? 'name-error' : null"
        />
        @if (nameError()) {
          <small id="name-error" class="error">{{ nameError() }}</small>
        }
      </div>

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
        <label for="password">Contraseña</label>
        <input
          id="password"
          type="password"
          formControlName="password"
          autocomplete="new-password"
          placeholder="Crea una contraseña segura"
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
        <p class="notice notice--error" role="alert">{{ error.message }}</p>
      }

      <button class="button" type="submit" [disabled]="submitting()">
        {{ submitting() ? 'Creando cuenta…' : 'Crear cuenta' }}
      </button>
    </form>

    <app-social-auth-buttons
      sectionLabel="Registro social"
      dividerLabel="O regístrate con"
      [baseUrl]="apiBaseUrl"
    />

    <div class="links">
      <a routerLink="/login">Ya tengo cuenta</a>
      <a routerLink="/activar">Activar invitación</a>
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
    .notice--error { border-left: 4px solid var(--danger-600); background: var(--danger-50); color: var(--danger-600); }
    .links { display: flex; justify-content: space-between; gap: var(--s3); margin-top: var(--s5); }
    .links a { color: var(--color-link); font-size: var(--sm); font-weight: 750; text-decoration: none; }
    .links a:hover { color: var(--color-link-hover); text-decoration: underline; }
    @media (max-width: 36rem) {
      .links { align-items: flex-start; flex-direction: column; }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterPage {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly redirects = inject(AuthRedirectService);
  private readonly session = inject(AuthSessionService);
  private readonly destroyRef = inject(DestroyRef);
  readonly submitted = signal(false);
  readonly submitting = signal(false);
  readonly submitError = signal<ApiError | null>(null);
  readonly apiBaseUrl = inject(API_BASE_URL);
  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    password_confirmation: ['', [Validators.required]],
  });

  readonly nameError = () => this.resolveFieldError('name', 'Ingresa tu nombre.');
  readonly emailError = () => this.resolveFieldError('email', 'Ingresa un correo válido.');
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
      .register(this.form.getRawValue())
      .pipe(
        finalize(() => this.submitting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (user) => void this.router.navigateByUrl(this.redirects.routeForUser(user)),
        error: (error: unknown) => this.submitError.set(toApiError(error)),
      });
  }

  private passwordsDoNotMatch(): boolean {
    const { password, password_confirmation } = this.form.getRawValue();
    return password !== password_confirmation;
  }

  private resolveFieldError(
    controlName: 'name' | 'email' | 'password',
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
