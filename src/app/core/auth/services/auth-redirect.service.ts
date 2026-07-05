import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { AuthUser } from '../models/auth.models';

@Injectable({ providedIn: 'root' })
export class AuthRedirectService {
  private loginRedirectInFlight = false;
  private forbiddenRedirectInFlight = false;
  readonly loginRoute = '/login';
  readonly registerRoute = '/registro';
  readonly activateRoute = '/activar';
  readonly forgotPasswordRoute = '/recuperar-acceso';
  readonly resetPasswordRoute = '/restablecer-acceso';
  readonly verifyEmailNoticeRoute = '/verifica-tu-correo';
  readonly socialCallbackRoute = '/auth/social/callback';
  readonly socialLinkCallbackRoute = '/auth/social/link/callback';
  readonly forbiddenRoute = '/403';
  readonly adminHomeRoute = '/admin/dashboard';
  readonly playerHomeRoute = '/jugador/inicio';
  readonly playerIdentityRoute = '/jugador/identidad';

  routeForUser(user: AuthUser): string {
    if (!user.emailVerified) {
      return this.verifyEmailNoticeRoute;
    }

    return user.capabilities.canAccessAdmin ? this.adminHomeRoute : this.playerHomeRoute;
  }

  resolveReturnUrl(user: AuthUser, returnUrl: string | null | undefined): string {
    const normalized = this.normalizeReturnUrl(returnUrl);

    if (normalized !== null) {
      return normalized;
    }

    return this.routeForUser(user);
  }

  shouldRedirectToLogin(url: string): boolean {
    return !this.isAuthRoute(url);
  }

  redirectToLogin(router: Router, returnUrl: string): void {
    if (!this.shouldRedirectToLogin(returnUrl) || this.loginRedirectInFlight) {
      return;
    }

    this.loginRedirectInFlight = true;
    void router
      .navigate(['/login'], { queryParams: { returnUrl } })
      .finally(() => (this.loginRedirectInFlight = false));
  }

  redirectToForbidden(router: Router): void {
    if (this.forbiddenRedirectInFlight) {
      return;
    }

    this.forbiddenRedirectInFlight = true;
    void router.navigateByUrl(this.forbiddenRoute).finally(() => (this.forbiddenRedirectInFlight = false));
  }

  isAuthRoute(url: string): boolean {
    return [
      this.loginRoute,
      this.registerRoute,
      this.activateRoute,
      this.forgotPasswordRoute,
      this.resetPasswordRoute,
      this.socialCallbackRoute,
      this.socialLinkCallbackRoute,
    ].some((route) => url.startsWith(route));
  }

  isForbiddenRoute(url: string): boolean {
    return url.startsWith(this.forbiddenRoute);
  }

  normalizeReturnUrl(returnUrl: string | null | undefined): string | null {
    if (typeof returnUrl !== 'string') {
      return null;
    }

    let normalized = returnUrl.trim();

    if (normalized.length === 0) {
      return null;
    }

    for (let attempts = 0; attempts < 3; attempts++) {
      try {
        const decoded = decodeURIComponent(normalized);
        if (decoded === normalized) {
          break;
        }
        normalized = decoded;
      } catch {
        return null;
      }
    }

    if (normalized.includes('\\')) {
      return null;
    }

    if (!normalized.startsWith('/') || normalized.startsWith('//')) {
      return null;
    }

    if (/^[a-z][a-z0-9+.-]*:/i.test(normalized)) {
      return null;
    }

    return this.isAuthRoute(normalized) ? null : normalized;
  }
}
