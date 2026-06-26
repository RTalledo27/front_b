import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AppIcon } from '../../../../shared/ui/app-icon/app-icon';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
@Component({
  selector: 'app-player-home-page',
  imports: [RouterLink, AppIcon, StatusBadge],
  template: `<section class="page">
    <div class="hero">
      <div>
        <p class="eyebrow">Hola, Andrea</p>
        <h1>Tu próxima oportunidad<br />puede estar aquí.</h1>
        <p>Revisa tus juegos activos y mantén tus cartones a la mano.</p>
        <a class="button button--prize" routerLink="/jugador/cartones"
          >Ver mis cartones <app-icon name="arrow"
        /></a>
      </div>
      <div class="prize" aria-label="Premio destacado">
        <span>Premio principal</span><strong>S/ 2,000</strong><small>Bingo Noche de Fortuna</small>
      </div>
    </div>
    <div class="cards">
      <article class="surface-card next">
        <header>
          <div>
            <p class="eyebrow">Próximo juego</p>
            <h2>Noche de Fortuna</h2>
          </div>
          <app-status-badge tone="success">Ventas abiertas</app-status-badge>
        </header>
        <dl>
          <div>
            <dt>Fecha</dt>
            <dd>18 Jun · 8:00 p. m.</dd>
          </div>
          <div>
            <dt>Tus cartones</dt>
            <dd>3 activos</dd>
          </div>
          <div>
            <dt>Premio</dt>
            <dd>S/ 2,000</dd>
          </div>
        </dl>
        <a routerLink="/jugador/cartones">Revisar participación <app-icon name="arrow" /></a>
      </article>
      <article class="surface-card quick">
        <p class="eyebrow">Acceso rápido</p>
        <h2>Todo listo para jugar</h2>
        <p>Consulta tus números y el estado de cada compra.</p>
        <a routerLink="/jugador/cartones"
          ><span><app-icon name="ticket" /></span>
          <div><strong>Mis cartones</strong><small>3 activos · 1 finalizado</small></div>
          <app-icon name="arrow"
        /></a>
      </article>
    </div>
  </section>`,
  styles: `
    .hero {
      position: relative;
      display: grid;
      grid-template-columns: minmax(0, 1.4fr) minmax(14rem, 0.6fr);
      align-items: center;
      gap: var(--s8);
      padding: clamp(1.5rem, 5vw, 3.5rem);
      border-radius: var(--r-xl);
      overflow: hidden;
      background: var(--color-dark-section);
      color: #fff;
    }
    .hero::before {
      position: absolute;
      inset: -10rem auto auto -8rem;
      width: 22rem;
      height: 22rem;
      border-radius: 50%;
      background: var(--color-brand);
      content: '';
      filter: blur(10px);
      opacity: 0.12;
    }
    .hero > div {
      position: relative;
    }
    .hero .eyebrow {
      color: var(--color-prize);
    }
    .hero h1 {
      margin-bottom: var(--s4);
      font-size: var(--3xl);
      line-height: 1.05;
      letter-spacing: -0.05em;
    }
    .hero p:not(.eyebrow) {
      max-width: 38rem;
      color: var(--neutral-300);
    }
    .hero .button {
      margin-top: var(--s4);
    }
    .prize {
      display: grid;
      justify-items: center;
      padding: var(--s8);
      border: 1px solid rgb(255 255 255/0.16);
      border-radius: var(--r-xl);
      background: rgb(255 255 255/0.08);
      text-align: center;
      backdrop-filter: blur(10px);
    }
    .prize span,
    .prize small {
      color: var(--neutral-300);
      font-size: var(--sm);
    }
    .prize strong {
      margin: 0.35rem 0;
      color: var(--color-prize);
      font-size: clamp(2rem, 5vw, 3.5rem);
      letter-spacing: -0.05em;
    }
    .cards {
      display: grid;
      grid-template-columns: 1.25fr 0.75fr;
      gap: var(--s4);
      margin-top: var(--s5);
    }
    .next,
    .quick {
      padding: var(--s5);
    }
    .next header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--s4);
    }
    h2 {
      margin-bottom: 0;
      font-size: var(--xl);
    }
    dl {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: var(--s4);
      padding: var(--s5) 0;
      margin: var(--s5) 0;
      border-block: 1px solid var(--neutral-200);
    }
    dt {
      color: var(--neutral-500);
      font-size: var(--xs);
    }
    dd {
      margin: 0.25rem 0 0;
      font-size: var(--sm);
      font-weight: 750;
    }
    .next > a {
      display: inline-flex;
      align-items: center;
      gap: var(--s2);
      color: var(--color-link);
      font-size: var(--sm);
      font-weight: 750;
      text-decoration: none;
    }
    .quick > p:not(.eyebrow) {
      color: var(--neutral-600);
      font-size: var(--sm);
    }
    .quick > a {
      display: flex;
      align-items: center;
      gap: var(--s3);
      padding: var(--s3);
      margin-top: var(--s5);
      border-radius: var(--r-md);
      background: var(--color-brand-subtle);
      color: var(--color-brand);
      text-decoration: none;
    }
    .quick > a > span {
      display: grid;
      width: 2.5rem;
      height: 2.5rem;
      place-items: center;
      border-radius: var(--r-md);
      background: #fff;
    }
    .quick > a div {
      display: grid;
      flex: 1;
    }
    .quick small {
      color: var(--neutral-500);
    }
    @media (max-width: 48rem) {
      .hero,
      .cards {
        grid-template-columns: 1fr;
      }
      .prize {
        justify-items: start;
        text-align: left;
      }
    }
    @media (max-width: 32rem) {
      dl {
        grid-template-columns: 1fr 1fr;
      }
      dl div:last-child {
        grid-column: 1/-1;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerHomePage {}
