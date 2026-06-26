import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-forbidden-page',
  imports: [RouterLink],
  template: `
    <main class="forbidden">
      <section class="surface-card" role="alert">
        <span aria-hidden="true">403</span>
        <p class="eyebrow">Acceso restringido</p>
        <h1>No tienes permiso para entrar aquí</h1>
        <p>Tu sesión es válida, pero esta sección requiere otro rol o permiso.</p>
        <a class="button" routerLink="/bingos">Volver a los bingos</a>
      </section>
    </main>
  `,
  styles: `
    :host { display: block; min-height: 100vh; background: var(--color-background); }
    .forbidden { display: grid; min-height: 100vh; place-items: center; padding: var(--s5); }
    section { width: min(100%, 36rem); padding: clamp(2rem, 7vw, 4rem); text-align: center; }
    section > span { display: inline-grid; min-width: 4rem; min-height: 3rem; place-items: center; margin-bottom: var(--s5); border-radius: var(--r-md); background: var(--color-brand-subtle); color: var(--color-brand); font-weight: 900; }
    h1 { margin: 0; font-size: var(--2xl); letter-spacing: -.03em; }
    section > p:not(.eyebrow) { margin: var(--s4) 0 var(--s6); color: var(--color-text-muted); }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForbiddenPage {}