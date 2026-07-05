import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthSessionService } from '../../auth/services/auth-session.service';
import { NumberSelectionDraftService } from '../../../features/game-numbers/data-access/number-selection-draft.service';
import { AppIcon } from '../../../shared/ui/app-icon/app-icon';
import { Brand } from '../../../shared/ui/brand/brand';

@Component({
  selector: 'app-player-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, AppIcon, Brand],
  template: `<a class="skip-link" href="#player-content">Saltar al contenido</a>
    <header>
      <a routerLink="/jugador/inicio"><app-brand /></a>
      <nav aria-label="Navegación del jugador">
        <a routerLink="/jugador/inicio" routerLinkActive="active"><app-icon name="home" />Inicio</a>
        <a routerLink="/jugador/cartones" routerLinkActive="active"><app-icon name="ticket" />Mis números</a>
        <a routerLink="/jugador/reservas" routerLinkActive="active"><app-icon name="bingo" />Reservas</a>
        <a routerLink="/jugador/compras" routerLinkActive="active"><app-icon name="orders" />Compras</a>
        <a routerLink="/jugador/identidad" routerLinkActive="active"><app-icon name="users" />Identidad</a>
      </nav>
      <div class="account-actions">
        <span class="avatar" [attr.aria-label]="'Perfil de ' + displayName()">{{ initials() }}</span>
        <button
          class="icon-button"
          type="button"
          [disabled]="logoutPending()"
          [attr.aria-label]="logoutPending() ? 'Cerrando sesión' : 'Cerrar sesión'"
          (click)="logout()"
        ><app-icon name="logout" /></button>
      </div>
    </header>
    <main id="player-content"><router-outlet /></main>
    <nav class="bottom" aria-label="Navegación móvil">
      <a routerLink="/jugador/inicio" routerLinkActive="active"><app-icon name="home" /><span>Inicio</span></a>
      <a routerLink="/jugador/cartones" routerLinkActive="active"><app-icon name="ticket" /><span>Números</span></a>
      <a routerLink="/jugador/reservas" routerLinkActive="active"><app-icon name="bingo" /><span>Reservas</span></a>
      <a routerLink="/jugador/compras" routerLinkActive="active"><app-icon name="orders" /><span>Compras</span></a>
      <a routerLink="/jugador/identidad" routerLinkActive="active"><app-icon name="users" /><span>Identidad</span></a>
    </nav>`,
  styles: `
    header {
      position: sticky;
      z-index: 10;
      top: 0;
      display: flex;
      height: 4.75rem;
      align-items: center;
      gap: var(--s8);
      padding: 0 clamp(1rem, 4vw, 3rem);
      border-bottom: 1px solid var(--neutral-200);
      background: rgb(255 255 255/0.94);
      backdrop-filter: blur(12px);
    }
    header > a {
      text-decoration: none;
    }
    nav {
      display: flex;
      align-items: center;
      gap: var(--s2);
    }
    nav a {
      display: flex;
      align-items: center;
      gap: var(--s2);
      padding: 0.65rem 0.8rem;
      border-radius: var(--r-md);
      color: var(--neutral-600);
      font-size: var(--sm);
      font-weight: 700;
      text-decoration: none;
    }
    nav a.active {
      background: var(--color-brand-subtle);
      color: var(--color-brand);
    }
    .avatar {
      display: grid;
      width: 2.5rem;
      height: 2.5rem;
      margin-left: auto;
      place-items: center;
      border-radius: 50%;
      background: var(--color-brand-muted);
      color: var(--color-brand);
      font-size: var(--xs);
      font-weight: 850;
    }
    .account-actions {
      display: flex;
      align-items: center;
      gap: var(--s2);
      margin-left: auto;
    }
    main {
      padding: clamp(1rem, 4vw, 3rem);
    }
    .bottom {
      display: none;
    }
    @media (max-width: 40rem) {
      header nav {
        display: none;
      }
      .bottom {
        position: fixed;
        z-index: 10;
        inset: auto 0 0;
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        border-top: 1px solid var(--neutral-200);
        background: #fff;
        padding: 0.4rem max(0.5rem, env(safe-area-inset-right))
          max(0.4rem, env(safe-area-inset-bottom));
      }
      .bottom a {
        justify-content: center;
        flex-direction: column;
        gap: 0.15rem;
        font-size: 0.68rem;
      }
      main {
        padding-bottom: 6rem;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerShell {
  private readonly session = inject(AuthSessionService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly numberSelectionDraft = inject(NumberSelectionDraftService);
  readonly logoutPending = signal(false);
  readonly displayName = computed(() => this.session.user()?.name ?? 'Usuario');
  readonly initials = computed(() =>
    this.displayName()
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join(''),
  );

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
