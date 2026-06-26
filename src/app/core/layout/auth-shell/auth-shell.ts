import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Brand } from '../../../shared/ui/brand/brand';

@Component({
  selector: 'app-auth-shell',
  imports: [RouterOutlet, Brand],
  template: `<main>
    <section class="story" aria-labelledby="welcome">
      <a class="brand" href="/"><app-brand /></a>
      <div>
        <p class="eyebrow">Juega con confianza</p>
        <h1 id="welcome">La emoción de ganar,<br /><span>sin complicaciones.</span></h1>
        <p>Participa en rifas y bingos con información clara sobre tus números, pagos y premios.</p>
      </div>
      <ul aria-label="Beneficios">
        <li><b>01</b> Procesos transparentes</li>
        <li><b>02</b> Pagos verificables</li>
        <li><b>03</b> Resultados en un solo lugar</li>
      </ul>
    </section>
    <section class="content"><router-outlet /></section>
  </main>`,
  styles: `
    main {
      display: grid;
      min-height: 100vh;
      grid-template-columns: minmax(20rem, 1.05fr) minmax(20rem, 0.95fr);
    }
    .story {
      position: relative;
      display: flex;
      min-height: 100vh;
      flex-direction: column;
      justify-content: space-between;
      padding: clamp(1.5rem, 5vw, 4rem);
      overflow: hidden;
      background: linear-gradient(
        145deg,
        var(--color-dark-section),
        var(--color-dark-section-soft)
      );
      color: #fff;
    }
    .story::after {
      position: absolute;
      width: 24rem;
      height: 24rem;
      inset: auto -8rem -10rem auto;
      border-radius: 50%;
      background: transparent;
      content: '';
      opacity: 0;
    }
    .brand {
      --color-brand: var(--color-white);
      --color-brand-contrast: var(--color-dark-section);
      --color-brand-strong: var(--color-white);
      --color-text-muted: var(--color-neutral-300);
      width: fit-content;
      color: var(--color-white);
      text-decoration: none;
    }
    h1 {
      max-width: 48rem;
      margin-bottom: var(--s5);
      font-size: var(--3xl);
      line-height: 1.05;
      letter-spacing: -0.05em;
    }
    h1 span {
      color: var(--color-prize);
    }
    .story .eyebrow {
      color: var(--color-prize);
    }
    .story div > p:last-child {
      max-width: 36rem;
      margin: 0;
      color: var(--neutral-300);
      font-size: var(--lg);
    }
    ul {
      position: relative;
      z-index: 1;
      display: flex;
      gap: var(--s6);
      padding: 0;
      margin: var(--s8) 0 0;
      list-style: none;
      color: var(--neutral-300);
      font-size: var(--sm);
    }
    li {
      display: grid;
      gap: var(--s1);
    }
    li b {
      color: var(--color-prize);
      font-size: var(--xs);
    }
    .content {
      display: grid;
      place-items: center;
      padding: var(--s6);
      background: #fff;
    }
    @media (max-width: 52rem) {
      main {
        grid-template-columns: 1fr;
      }
      .story {
        min-height: auto;
        padding: var(--s6);
      }
      .story ul {
        display: none;
      }
      .content {
        min-height: 58vh;
        padding: var(--s5);
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthShell {}
