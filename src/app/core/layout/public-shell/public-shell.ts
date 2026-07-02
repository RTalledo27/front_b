import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthRedirectService } from '../../auth/services/auth-redirect.service';
import { AuthSessionService } from '../../auth/services/auth-session.service';
import { Brand } from '../../../shared/ui/brand/brand';

@Component({
  selector: 'app-public-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Brand],
  template: `
    <a class="skip-link" href="#public-content">Saltar al contenido</a>
    <header>
      <a class="brand" routerLink="/bingos" aria-label="Fortuna, ir a bingos">
        <app-brand />
      </a>
      <nav aria-label="Navegación pública">
        <a routerLink="/bingos" routerLinkActive="active">Bingos</a>
        @if (showAnonymousActions()) {
          <a routerLink="/login">Ingresar</a>
        } @else if (isCheckingSession()) {
          <span class="nav-status" aria-live="polite">Verificando sesión…</span>
        }
      </nav>
      @if (isCheckingSession()) {
        <span class="session-chip access" aria-live="polite">Verificando sesión…</span>
      } @else if (accountAction(); as action) {
        <a class="button button--secondary access" [routerLink]="action.path">{{ action.label }}</a>
      } @else {
        <a class="button button--secondary access" routerLink="/login">Ingresar</a>
      }
    </header>
    <main id="public-content" tabindex="-1"><router-outlet /></main>
    <footer>
      <app-brand />
      <p>Información clara para participar con confianza.</p>
      <small>Fortuna · Rifas &amp; bingos</small>
    </footer>
  `,
  styles: `
    :host {
      display: block;
      min-height: 100vh;
      background: var(--color-background);
    }
    header {
      position: sticky;
      z-index: 20;
      top: 0;
      display: flex;
      height: 4.75rem;
      align-items: center;
      gap: var(--s8);
      padding: 0 clamp(1rem, 5vw, 4rem);
      border-bottom: 1px solid var(--color-border);
      background: rgb(255 255 255 / 0.94);
      backdrop-filter: blur(14px);
    }
    .brand {
      text-decoration: none;
    }
    nav {
      display: flex;
      align-items: center;
      gap: var(--s2);
    }
    nav a {
      padding: 0.6rem 0.8rem;
      border-radius: var(--r-md);
      color: var(--color-text-muted);
      font-size: var(--sm);
      font-weight: 750;
      text-decoration: none;
    }
    nav a:hover,
    nav a.active {
      background: var(--color-brand-subtle);
      color: var(--color-brand);
    }
    .nav-status,
    .session-chip {
      color: var(--color-text-muted);
      font-size: var(--sm);
      font-weight: 700;
    }
    .session-chip {
      display: inline-flex;
      min-height: 2.75rem;
      align-items: center;
      padding: 0 0.9rem;
      border: 1px solid var(--color-border);
      border-radius: var(--r-md);
      background: var(--color-surface);
    }
    .access {
      margin-left: auto;
    }
    main {
      min-height: calc(100vh - 14rem);
      padding: clamp(1.25rem, 5vw, 4rem);
    }
    footer {
      display: grid;
      grid-template-columns: auto 1fr auto;
      align-items: center;
      gap: var(--s6);
      padding: var(--s8) clamp(1rem, 5vw, 4rem);
      border-top: 1px solid var(--color-border);
      background: var(--color-surface);
    }
    footer p,
    footer small {
      margin: 0;
      color: var(--color-text-muted);
      font-size: var(--sm);
    }
    @media (max-width: 40rem) {
      header {
        gap: var(--s3);
      }
      header nav {
        display: none;
      }
      .access {
        min-height: 2.5rem;
        padding-inline: 0.8rem;
      }
      main {
        padding-inline: var(--s4);
      }
      footer {
        grid-template-columns: 1fr;
        justify-items: start;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PublicShell {
  private readonly session = inject(AuthSessionService);
  private readonly redirects = inject(AuthRedirectService);

  readonly isCheckingSession = computed(() => {
    const status = this.session.status();
    return status === 'unknown' || status === 'loading';
  });

  readonly showAnonymousActions = computed(() => this.session.status() === 'anonymous');

  readonly accountAction = computed(() => {
    const user = this.session.user();

    if (user === null) {
      return null;
    }

    return {
      path: this.redirects.routeForUser(user),
      label: user.capabilities.canAccessAdmin ? 'Panel admin' : 'Mi cuenta',
    };
  });
}
