import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Brand } from '../../../../shared/ui/brand/brand';
@Component({
  selector: 'app-not-found-page',
  imports: [RouterLink, Brand],
  template: `<main>
    <a routerLink="/"><app-brand /></a>
    <section>
      <span>404</span>
      <p class="eyebrow">Página no encontrada</p>
      <h1>Este número no salió.</h1>
      <p>La página que buscas cambió de lugar o todavía no está disponible.</p>
      <a class="button" routerLink="/login">Volver al inicio</a>
    </section>
  </main>`,
  styles: `
    main {
      display: flex;
      min-height: 100vh;
      flex-direction: column;
      padding: clamp(1.5rem, 5vw, 4rem);
      background: #fff;
    }
    main > a {
      width: fit-content;
      text-decoration: none;
    }
    section {
      display: grid;
      flex: 1;
      place-items: center;
      align-content: center;
      text-align: center;
    }
    section > span {
      color: var(--color-brand-muted);
      font-size: clamp(7rem, 25vw, 16rem);
      font-weight: 950;
      line-height: 0.75;
      letter-spacing: -0.1em;
    }
    h1 {
      margin: var(--s2) 0;
      font-size: var(--3xl);
      letter-spacing: -0.05em;
    }
    section > p:not(.eyebrow) {
      max-width: 32rem;
      color: var(--neutral-600);
    }
    .button {
      margin-top: var(--s4);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFoundPage {}
