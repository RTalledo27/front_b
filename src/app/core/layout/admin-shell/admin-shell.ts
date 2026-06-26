import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthSessionService } from '../../auth/services/auth-session.service';
import { NumberSelectionDraftService } from '../../../features/game-numbers/data-access/number-selection-draft.service';
import { AppIcon, AppIconName } from '../../../shared/ui/app-icon/app-icon';
import { Brand } from '../../../shared/ui/brand/brand';

interface NavItem {
  label: string;
  path: string;
  icon: AppIconName;
  exact?: boolean;
}

@Component({
  selector: 'app-admin-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, AppIcon, Brand],
  template: `<a class="skip-link" href="#main-content">Saltar al contenido</a>
    <div class="shell" [class.menu-open]="menuOpen()">
      <aside id="admin-navigation">
        <div class="side-head">
          <a routerLink="/admin/dashboard"><app-brand /></a
          ><button
            class="icon-button close"
            type="button"
            aria-label="Cerrar menú"
            (click)="menuOpen.set(false)"
          >
            <app-icon name="close" />
          </button>
        </div>
        <nav aria-label="Navegación administrativa">
          @for (item of nav; track item.path) {
            <a
              [routerLink]="item.path"
              routerLinkActive="active"
              [routerLinkActiveOptions]="{ exact: item.exact ?? false }"
              (click)="menuOpen.set(false)"
              ><app-icon [name]="item.icon" /><span>{{ item.label }}</span></a
            >
          }
        </nav>
        <div class="profile">
          <span aria-hidden="true">{{ initials() }}</span>
          <div><strong>{{ displayName() }}</strong><small>Administración</small></div>
          <button
            class="icon-button"
            type="button"
            [disabled]="logoutPending()"
            [attr.aria-label]="logoutPending() ? 'Cerrando sesión' : 'Cerrar sesión'"
            (click)="logout()"
          ><app-icon name="logout" /></button>
        </div>
      </aside>
      <button
        class="backdrop"
        type="button"
        aria-label="Cerrar menú"
        (click)="menuOpen.set(false)"
      ></button>
      <section class="workspace">
        <header>
          <button
            class="icon-button menu"
            type="button"
            aria-label="Abrir menú"
            aria-controls="admin-navigation"
            [attr.aria-expanded]="menuOpen()"
            (click)="menuOpen.set(true)"
          >
            <app-icon name="menu" />
          </button>
          <div><small>Panel administrativo</small><strong>Hola, {{ firstName() }}</strong></div>
          <button class="icon-button" type="button" aria-label="Notificaciones">
            <app-icon name="bell" />
          </button>
        </header>
        <main id="main-content" tabindex="-1"><router-outlet /></main>
      </section>
    </div>`,
  styles: `
    .shell {
      display: grid;
      min-height: 100vh;
      grid-template-columns: 16.5rem 1fr;
    }
    aside {
      position: sticky;
      z-index: 20;
      top: 0;
      display: flex;
      height: 100vh;
      flex-direction: column;
      border-right: 1px solid var(--neutral-200);
      background: #fff;
      padding: var(--s5);
    }
    .side-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: var(--s8);
    }
    .side-head > a {
      text-decoration: none;
    }
    .close,
    .menu {
      display: none;
    }
    nav {
      display: grid;
      gap: var(--s1);
    }
    nav a {
      position: relative;
      display: flex;
      min-height: 2.75rem;
      align-items: center;
      gap: var(--s3);
      padding: 0 var(--s3);
      border-radius: var(--r-md);
      color: var(--neutral-600);
      font-size: var(--sm);
      font-weight: 700;
      text-decoration: none;
    }
    nav a:hover {
      background: var(--neutral-50);
      color: var(--neutral-900);
    }
    nav a.active {
      box-shadow: inset 3px 0 0 var(--color-prize);
      background: var(--color-brand-subtle);
      color: var(--color-brand);
    }
    .profile {
      display: flex;
      align-items: center;
      gap: var(--s3);
      padding-top: var(--s4);
      margin-top: auto;
      border-top: 1px solid var(--neutral-200);
    }
    .profile > span {
      display: grid;
      width: 2.35rem;
      height: 2.35rem;
      place-items: center;
      border-radius: 50%;
      background: var(--color-brand-muted);
      color: var(--color-brand);
      font-size: var(--xs);
      font-weight: 850;
    }
    .profile div {
      display: grid;
      min-width: 0;
      flex: 1;
    }
    .profile strong {
      overflow: hidden;
      font-size: var(--sm);
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .profile small {
      color: var(--neutral-500);
      font-size: var(--xs);
    }
    .profile a {
      color: var(--neutral-500);
    }
    .workspace {
      min-width: 0;
    }
    .workspace > header {
      display: flex;
      height: 4.5rem;
      align-items: center;
      gap: var(--s3);
      padding: 0 clamp(1rem, 3vw, 2rem);
      border-bottom: 1px solid var(--neutral-200);
      background: rgb(255 255 255/0.92);
      backdrop-filter: blur(12px);
    }
    header div {
      display: grid;
      flex: 1;
    }
    header small {
      color: var(--neutral-500);
      font-size: var(--xs);
    }
    header strong {
      font-size: var(--sm);
    }
    main {
      padding: clamp(1rem, 3vw, 2rem);
    }
    .backdrop {
      display: none;
    }
    @media (max-width: 52rem) {
      .shell {
        grid-template-columns: 1fr;
      }
      aside {
        position: fixed;
        inset: 0 auto 0 0;
        width: min(18rem, 88vw);
        transform: translateX(-105%);
        transition: transform 180ms ease;
      }
      .menu-open aside {
        transform: none;
      }
      .close,
      .menu {
        display: inline-grid;
      }
      .backdrop {
        position: fixed;
        z-index: 10;
        inset: 0;
        display: block;
        border: 0;
        background: rgb(15 23 42/0.48);
        opacity: 0;
        pointer-events: none;
        transition: opacity 180ms;
      }
      .menu-open .backdrop {
        opacity: 1;
        pointer-events: auto;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminShell {
  private readonly session = inject(AuthSessionService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly numberSelectionDraft = inject(NumberSelectionDraftService);
  readonly displayName = computed(() => this.session.user()?.name ?? 'Usuario');
  readonly firstName = computed(() => this.displayName().split(' ')[0] ?? 'Usuario');
  readonly initials = computed(() =>
    this.displayName()
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join(''),
  );
  readonly menuOpen = signal(false);
  readonly logoutPending = signal(false);
  readonly nav: readonly NavItem[] = [
    { label: 'Resumen', path: '/admin/dashboard', icon: 'home', exact: true },
    { label: 'Bingos', path: '/admin/bingos', icon: 'bingo' },
    { label: 'Motor', path: '/admin/motor', icon: 'bingo' },
    { label: 'Rifas', path: '/admin/rifas', icon: 'raffle' },
    { label: 'Órdenes', path: '/admin/ordenes', icon: 'orders' },
    { label: 'Participantes', path: '/admin/participantes', icon: 'users' },
    { label: 'Pagos', path: '/admin/pagos', icon: 'payments' },
    { label: 'Reportes', path: '/admin/reportes', icon: 'reports' },
    { label: 'Configuración', path: '/admin/configuracion', icon: 'settings' },
  ];

  logout(): void {
    if (this.logoutPending()) {
      return;
    }

    this.logoutPending.set(true);
    this.numberSelectionDraft.clear();
    this.session
      .logout()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => void this.router.navigateByUrl('/login'),
        complete: () => this.logoutPending.set(false),
      });
  }
}
