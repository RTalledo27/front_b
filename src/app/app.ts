import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterOutlet } from '@angular/router';
import { catchError, finalize, of } from 'rxjs';
import { AuthSessionService } from './core/auth/services/auth-session.service';
import { AuthTokenStorageService } from './core/auth/services/auth-token-storage.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly session = inject(AuthSessionService);
  private readonly tokens = inject(AuthTokenStorageService);
  private readonly destroyRef = inject(DestroyRef);
  readonly restoringSession = signal(this.tokens.read() !== null);

  constructor() {
    if (!this.restoringSession()) {
      this.session.clearSession();
      return;
    }

    this.session
      .ensureSession()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() => of(null)),
        finalize(() => this.restoringSession.set(false)),
      )
      .subscribe();
  }
}
