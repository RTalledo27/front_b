import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ForgotPasswordFacade } from '../../data-access/forgot-password.facade';

@Component({
  selector: 'app-forgot-password-page',
  imports: [ReactiveFormsModule, RouterLink],
  template: `<div class="auth-page">
    <p class="eyebrow">Recuperación segura</p>
    <h2>¿Olvidaste tu contraseña?</h2>
    <p class="intro">
      Ingresa tu correo y, si existe una cuenta asociada, enviaremos instrucciones para
      restablecer el acceso.
    </p>

    <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
      <div class="form-field">
        <label for="email">Correo electrónico</label>
        <input
          id="email"
          type="email"
          formControlName="email"
          autocomplete="email"
          placeholder="tu@correo.com"
          [attr.aria-describedby]="emailError() ? 'forgot-email-error' : null"
        />
        @if (emailError()) {
          <small id="forgot-email-error" class="error">{{ emailError() }}</small>
        }
      </div>

      @if (facade.message()) {
        <p class="notice notice--success" aria-live="polite">{{ facade.message() }}</p>
      }

      @if (facade.error(); as error) {
        <p class="notice notice--error" role="alert">{{ error.message }}</p>
      }

      <button class="button" type="submit" [disabled]="facade.status() === 'submitting'">
        {{ facade.status() === 'submitting' ? 'Enviando…' : 'Enviar instrucciones' }}
      </button>
    </form>

    <div class="links">
      <a routerLink="/login">Volver a iniciar sesión</a>
      <a routerLink="/registro">Crear cuenta</a>
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
export class ForgotPasswordPage {
  private readonly fb = inject(FormBuilder);
  readonly facade = inject(ForgotPasswordFacade);

  readonly submitted = signal(false);
  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  constructor() {
    this.facade.reset();
  }

  submit(): void {
    this.submitted.set(true);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.facade.submit(this.form.getRawValue().email);
  }

  emailError(): string | null {
    const control = this.form.controls.email;
    const backendError = this.facade.error()?.fieldErrors['email']?.[0] ?? null;

    if (backendError) {
      return backendError;
    }

    if (!control.invalid || (!control.touched && !this.submitted())) {
      return null;
    }

    return 'Ingresa un correo válido.';
  }
}
