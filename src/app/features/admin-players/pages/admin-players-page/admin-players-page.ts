import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { AdminPlayersFacade } from '../../data-access/admin-players.facade';
import { AdminPlayerInviteOutcome } from '../../models/admin-players.models';

@Component({
  selector: 'app-admin-players-page',
  imports: [ReactiveFormsModule, RouterLink, StatusBadge],
  providers: [AdminPlayersFacade],
  template: `<section class="page admin-players">
    <header class="page-header">
      <div>
        <p class="eyebrow">Onboarding administrativo</p>
        <h1>Crear o reinvitar jugador</h1>
        <p>
          Este bloque usa exclusivamente <code>POST /api/v1/admin/players</code>. No existe todavía un
          listado administrativo paginado de usuarios, así que esta vista se concentra en la
          invitación asistida real.
        </p>
      </div>
      <a class="button button--secondary" routerLink="/admin/dashboard">Volver al resumen</a>
    </header>

    <div class="layout-grid">
      <section class="surface-card form-card">
        <header>
          <h2>Formulario real</h2>
          <p>
            Laravel solo acepta <code>name</code> y <code>email</code>; cualquier otro campo
            queda fuera de alcance.
          </p>
        </header>

        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <div class="form-field">
            <label for="player-name">Nombre</label>
            <input
              id="player-name"
              type="text"
              formControlName="name"
              autocomplete="name"
              maxlength="255"
              placeholder="Nombre del jugador"
              [attr.aria-describedby]="nameError() ? 'player-name-error' : null"
            />
            @if (nameError(); as error) {
              <small id="player-name-error" class="error">{{ error }}</small>
            }
          </div>

          <div class="form-field">
            <label for="player-email">Correo electrónico</label>
            <input
              id="player-email"
              type="email"
              formControlName="email"
              autocomplete="email"
              maxlength="255"
              placeholder="jugador@correo.com"
              [attr.aria-describedby]="emailError() ? 'player-email-error' : null"
            />
            @if (emailError(); as error) {
              <small id="player-email-error" class="error">{{ error }}</small>
            }
          </div>

          @if (facade.error(); as error) {
            <p class="notice notice--error" role="alert">{{ error.message }}</p>
          }

          <button class="button" type="submit" [disabled]="facade.status() === 'submitting'">
            {{ facade.status() === 'submitting' ? 'Creando…' : 'Crear o reinvitar jugador' }}
          </button>
        </form>
      </section>

      <section class="surface-card result-card">
        <header>
          <h2>Resultado del backend</h2>
          <p>La pantalla muestra solo lo que Laravel devuelve realmente.</p>
        </header>

        @if (facade.result(); as result) {
          <div class="result-stack" aria-live="polite">
            <app-status-badge [tone]="outcomeTone(result.outcome)">
              {{ outcomeLabel(result.outcome) }}
            </app-status-badge>

            <p>{{ outcomeDescription(result.outcome) }}</p>

            <dl class="result-grid">
              <div>
                <dt>ID de usuario</dt>
                <dd>{{ result.user.id }}</dd>
              </div>
              <div>
                <dt>Nombre</dt>
                <dd>{{ result.user.name }}</dd>
              </div>
              <div>
                <dt>Correo</dt>
                <dd>{{ result.user.email }}</dd>
              </div>
              <div>
                <dt>Rol</dt>
                <dd>{{ result.user.role }}</dd>
              </div>
            </dl>

            @if (result.invitation !== null) {
              <div class="result-panel">
                <h3>Invitación activa</h3>
                <p>Laravel devolvió una invitación vigente para el jugador.</p>
                <dl class="result-grid">
                  <div>
                    <dt>ID de invitación</dt>
                    <dd>{{ result.invitation.id }}</dd>
                  </div>
                  <div>
                    <dt>Expira</dt>
                    <dd>{{ result.invitation.expiresAt }}</dd>
                  </div>
                </dl>
              </div>
            } @else {
              <div class="result-panel">
                <h3>Sin invitación nueva</h3>
                <p>
                  El backend respondió sin <code>invitation</code>, así que no se generó un token
                  nuevo.
                </p>
              </div>
            }

            @if (result.plainToken !== null) {
              <div class="result-panel">
                <h3>Token visible en este entorno</h3>
                <p>
                  El backend expuso <code>plain_token</code> en este ambiente. No asumimos que
                  exista en producción.
                </p>
                <textarea readonly rows="4">{{ result.plainToken }}</textarea>
              </div>
            } @else {
              <div class="result-panel">
                <h3>Token no expuesto</h3>
                <p>Laravel no devolvió <code>plain_token</code> en este entorno.</p>
              </div>
            }
          </div>
        } @else {
          <div class="empty-state">
            <h3>Sin resultado todavía</h3>
            <p>
              Aquí aparecerá el outcome real de <code>admin/players</code> después de crear o
              reinvitar un jugador.
            </p>
          </div>
        }
      </section>
    </div>
  </section>`,
  styles: `
    .admin-players,
    .form-card,
    .result-card,
    .result-stack,
    .empty-state {
      display: grid;
      gap: var(--s4);
    }

    .layout-grid {
      display: grid;
      grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
      gap: var(--s5);
      align-items: start;
    }

    .form-card,
    .result-card {
      padding: var(--s5);
      min-width: 0;
    }

    .form-card header p,
    .result-card header p,
    .result-stack p,
    .empty-state p {
      margin: 0;
      color: var(--color-text-muted);
    }

    .form-card h2,
    .result-card h2,
    .result-panel h3,
    .empty-state h3 {
      margin: 0;
    }

    form {
      display: grid;
      gap: var(--s4);
    }

    .error {
      color: var(--danger-600);
      font-size: var(--xs);
      font-weight: 650;
    }

    .notice {
      margin: 0;
      padding: var(--s3);
      border: 1px solid var(--color-border);
      border-radius: var(--r-md);
      font-size: var(--sm);
    }

    .notice--error {
      border-left: 4px solid var(--danger-600);
      background: var(--danger-50);
      color: var(--danger-600);
    }

    .result-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: var(--s3);
      margin: 0;
    }

    .result-grid div,
    .result-panel {
      display: grid;
      gap: var(--s2);
      min-width: 0;
      padding: var(--s3);
      border-radius: var(--r-md);
      background: var(--color-surface-subtle);
    }

    dt {
      color: var(--color-text-muted);
      font-size: var(--xs);
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }

    dd {
      margin: 0;
      overflow-wrap: anywhere;
    }

    textarea {
      width: 100%;
      min-height: 7rem;
      resize: vertical;
      overflow-wrap: anywhere;
    }

    @media (max-width: 64rem) {
      .layout-grid {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 40rem) {
      .result-grid {
        grid-template-columns: 1fr;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminPlayersPage {
  private readonly fb = inject(FormBuilder);
  readonly facade = inject(AdminPlayersFacade);
  readonly submitted = signal(false);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(255)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
  });

  readonly hasResult = computed(() => this.facade.result() !== null);

  constructor() {
    this.facade.reset();
  }

  submit(): void {
    this.submitted.set(true);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const rawValue = this.form.getRawValue();

    this.facade.submit({
      name: rawValue.name.trim(),
      email: rawValue.email.trim().toLowerCase(),
    });
  }

  nameError(): string | null {
    const control = this.form.controls.name;
    const backendError = this.facade.error()?.fieldErrors['name']?.[0] ?? null;

    if (backendError) {
      return backendError;
    }

    if (!control.invalid || (!control.touched && !this.submitted())) {
      return null;
    }

    if (control.hasError('required')) {
      return 'Ingresa el nombre del jugador.';
    }

    return 'El nombre no puede superar 255 caracteres.';
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

    if (control.hasError('required') || control.hasError('email')) {
      return 'Ingresa un correo válido.';
    }

    return 'El correo no puede superar 255 caracteres.';
  }

  outcomeTone(outcome: AdminPlayerInviteOutcome): 'success' | 'warning' | 'neutral' {
    if (outcome === 'invited') {
      return 'success';
    }

    if (outcome === 'reinvited') {
      return 'warning';
    }

    return 'neutral';
  }

  outcomeLabel(outcome: AdminPlayerInviteOutcome): string {
    if (outcome === 'invited') {
      return 'Jugador invitado';
    }

    if (outcome === 'reinvited') {
      return 'Jugador reinvitado';
    }

    return 'Cuenta ya registrada';
  }

  outcomeDescription(outcome: AdminPlayerInviteOutcome): string {
    if (outcome === 'invited') {
      return 'Laravel creó un jugador pendiente y emitió una invitación nueva.';
    }

    if (outcome === 'reinvited') {
      return 'Laravel reutilizó el usuario pendiente y revocó la invitación activa anterior.';
    }

    return 'Laravel indicó que la cuenta ya estaba registrada y no abrió una invitación nueva.';
  }
}
