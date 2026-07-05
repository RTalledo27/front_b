import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ResetPasswordFacade } from '../../data-access/reset-password.facade';

@Component({
  selector: 'app-reset-password-page',
  imports: [ReactiveFormsModule, RouterLink],
  template: `<div class="auth-page">
    <p class="eyebrow">Nuevo acceso</p>
    <h2>Restablece tu contraseña</h2>
    <p class="intro">
      Crea una contraseña nueva para la cuenta indicada por el enlace seguro que recibiste.
    </p>

    @if (!hasValidLink()) {
      <p class="notice notice--error" role="alert">
        El enlace de recuperación está incompleto o ya no es válido.
      </p>
    } @else {
      <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <div class="form-field">
          <label for="email">Correo electrónico</label>
          <input
            id="email"
            type="email"
            formControlName="email"
            autocomplete="email"
            [attr.aria-describedby]="emailError() ? 'reset-email-error' : null"
          />
          @if (emailError()) {
            <small id="reset-email-error" class="error">{{ emailError() }}</small>
          }
        </div>

        <div class="form-field">
          <label for="password">Nueva contraseña</label>
          <input
            id="password"
            type="password"
            formControlName="password"
            autocomplete="new-password"
            placeholder="Mínimo 8 caracteres"
            [attr.aria-describedby]="passwordError() ? 'reset-password-error' : null"
          />
          @if (passwordError()) {
            <small id="reset-password-error" class="error">{{ passwordError() }}</small>
          }
        </div>

        <div class="form-field">
          <label for="password_confirmation">Confirmar contraseña</label>
          <input
            id="password_confirmation"
            type="password"
            formControlName="password_confirmation"
            autocomplete="new-password"
            placeholder="Repite tu nueva contraseña"
            [attr.aria-describedby]="passwordConfirmationError() ? 'reset-confirmation-error' : null"
          />
          @if (passwordConfirmationError()) {
            <small id="reset-confirmation-error" class="error">{{ passwordConfirmationError() }}</small>
          }
        </div>

        @if (facade.message()) {
          <p class="notice notice--success" aria-live="polite">{{ facade.message() }}</p>
        }

        @if (facade.error(); as error) {
          <p class="notice notice--error" role="alert">{{ error.message }}</p>
        }

        <button class="button" type="submit" [disabled]="facade.status() === 'submitting'">
          {{ facade.status() === 'submitting' ? 'Actualizando…' : 'Actualizar contraseña' }}
        </button>
      </form>
    }

    <div class="links">
      <a routerLink="/login">Volver a iniciar sesión</a>
      <a routerLink="/recuperar-acceso">Solicitar otro enlace</a>
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
    .links { display: flex; justify-content: space-between; gap: var(--s3); margin-top: var(--s5); }
    .links a { color: var(--color-link); font-size: var(--sm); font-weight: 750; text-decoration: none; }
    .links a:hover { color: var(--color-link-hover); text-decoration: underline; }
    @media (max-width: 36rem) { .links { align-items: flex-start; flex-direction: column; } }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetPasswordPage {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  readonly facade = inject(ResetPasswordFacade);

  readonly submitted = signal(false);
  readonly token = this.route.snapshot.queryParamMap.get('token');
  readonly initialEmail = this.route.snapshot.queryParamMap.get('email') ?? '';
  readonly hasValidLink = computed(
    () => typeof this.token === 'string' && this.token.length > 0 && this.initialEmail.trim().length > 0,
  );
  readonly form = this.fb.nonNullable.group({
    email: [this.initialEmail, [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    password_confirmation: ['', [Validators.required]],
  });

  constructor() {
    this.facade.reset();
  }

  submit(): void {
    this.submitted.set(true);

    if (!this.hasValidLink()) {
      return;
    }

    if (this.form.invalid || this.passwordsDoNotMatch()) {
      this.form.markAllAsTouched();
      return;
    }

    this.facade.submit({
      email: this.form.getRawValue().email,
      token: this.token ?? '',
      password: this.form.getRawValue().password,
      password_confirmation: this.form.getRawValue().password_confirmation,
    });
  }

  emailError(): string | null {
    return this.resolveFieldError('email', 'Ingresa un correo válido.');
  }

  passwordError(): string | null {
    return this.resolveFieldError(
      'password',
      'La contraseña debe tener al menos 8 caracteres.',
    );
  }

  passwordConfirmationError(): string | null {
    const backendError = this.facade.error()?.fieldErrors['password_confirmation']?.[0] ?? null;

    if (backendError) {
      return backendError;
    }

    if (!this.submitted() && !this.form.controls.password_confirmation.touched) {
      return null;
    }

    if (this.form.controls.password_confirmation.invalid) {
      return 'Confirma tu nueva contraseña.';
    }

    if (this.passwordsDoNotMatch()) {
      return 'Las contraseñas no coinciden.';
    }

    return null;
  }

  private passwordsDoNotMatch(): boolean {
    const { password, password_confirmation } = this.form.getRawValue();
    return password !== password_confirmation;
  }

  private resolveFieldError(controlName: 'email' | 'password', fallback: string): string | null {
    const control = this.form.controls[controlName];
    const backendError = this.facade.error()?.fieldErrors[controlName]?.[0] ?? null;

    if (backendError) {
      return backendError;
    }

    if (!control.invalid || (!control.touched && !this.submitted())) {
      return null;
    }

    return fallback;
  }
}
