import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { catchError, finalize, map, Observable, of, shareReplay, tap, throwError } from 'rxjs';
import { toApiError } from '../../api/models/api-error.models';
import { AuthRepository } from '../data-access/auth.repository';
import {
  ActivateRequestPayload,
  AuthTokenApiDto,
  AuthTokenSession,
  AuthUser,
  LoginRequestPayload,
  RegisterRequestPayload,
  SessionStatus,
} from '../models/auth.models';
import { AuthTokenStorageService } from './auth-token-storage.service';
import { isValidAuthTokenResponse } from './auth-response.utils';
import { mapAuthTokenSession, mapAuthUser } from './auth-user.mapper';

@Injectable({ providedIn: 'root' })
export class AuthSessionService {
  private readonly authRepository = inject(AuthRepository);
  private readonly tokens = inject(AuthTokenStorageService);
  private pendingRequest: Observable<AuthUser | null> | null = null;
  private pendingLogout: Observable<void> | null = null;

  readonly user = signal<AuthUser | null>(null);
  readonly status = signal<SessionStatus>('unknown');
  readonly abilities = signal<readonly string[]>([]);
  readonly isAuthenticated = computed(() => this.status() === 'authenticated');
  readonly isAdmin = computed(() => this.user()?.capabilities.canAccessAdmin ?? false);

  ensureSession(): Observable<AuthUser | null> {
    if (this.status() === 'authenticated') {
      return of(this.user());
    }
    if (this.status() === 'anonymous') {
      return of(null);
    }
    if (this.tokens.read() === null) {
      this.clearSession();
      return of(null);
    }
    return this.loadSession();
  }

  refreshSession(): Observable<AuthUser | null> {
    this.status.set('unknown');
    return this.loadSession();
  }

  clearSession(): void {
    this.user.set(null);
    this.abilities.set([]);
    this.tokens.clear();
    this.status.set('anonymous');
  }

  login(payload: LoginRequestPayload): Observable<AuthUser> {
    return this.authRepository.login(payload).pipe(
      map((response) => this.applyTokenSession(response.data)),
    );
  }

  register(payload: RegisterRequestPayload): Observable<AuthUser> {
    return this.authRepository.register(payload).pipe(
      map((response) => this.applyTokenSession(response.data)),
    );
  }

  activate(payload: ActivateRequestPayload): Observable<AuthUser> {
    return this.authRepository.activate(payload).pipe(
      map((response) => this.applyTokenSession(response.data)),
    );
  }

  logout(): Observable<void> {
    if (this.pendingLogout !== null) {
      return this.pendingLogout;
    }

    const request = this.authRepository.logout().pipe(
      map(() => void 0),
      catchError((error: unknown) => {
        const apiError = toApiError(error);
        if (apiError.status !== 0 && apiError.status !== 401) {
          return of(void 0);
        }

        return of(void 0);
      }),
      finalize(() => {
        this.pendingLogout = null;
        this.clearSession();
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );

    this.pendingLogout = request;
    return request;
  }

  private loadSession(): Observable<AuthUser | null> {
    if (this.pendingRequest) {
      return this.pendingRequest;
    }

    this.status.set('loading');
    const request = this.authRepository.me().pipe(
      map((response) => mapAuthUser(response.data)),
      tap((user) => {
        this.user.set(user);
        this.status.set('authenticated');
      }),
      catchError((error: unknown) => {
        if (error instanceof HttpErrorResponse && error.status === 401) {
          this.clearSession();
          return of(null);
        }

        this.user.set(null);
        this.status.set('error');
        return throwError(() => error);
      }),
      finalize(() => (this.pendingRequest = null)),
      shareReplay({ bufferSize: 1, refCount: false }),
    );

    this.pendingRequest = request;
    return request;
  }

  private applyTokenSession(dto: AuthTokenApiDto): AuthUser {
    if (!isValidAuthTokenResponse(dto)) {
      throw new Error('Invalid auth token response payload.');
    }

    const session: AuthTokenSession = mapAuthTokenSession(dto);
    this.tokens.write(session.accessToken);
    this.user.set(session.user);
    this.abilities.set(session.abilities);
    this.status.set('authenticated');

    return session.user;
  }
}
