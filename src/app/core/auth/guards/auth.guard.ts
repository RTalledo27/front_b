import { inject } from '@angular/core';
import { CanMatchFn, Router, UrlSegment } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthRedirectService } from '../services/auth-redirect.service';
import { AuthSessionService } from '../services/auth-session.service';

function loginRedirect(router: Router, segments: UrlSegment[]) {
  const returnUrl = `/${segments.map((segment) => segment.path).join('/')}`;
  return router.createUrlTree(['/login'], { queryParams: { returnUrl } });
}

export const authGuard: CanMatchFn = (_route, segments) => {
  const session = inject(AuthSessionService);
  const router = inject(Router);

  return session.ensureSession().pipe(
    map((user) => (user ? true : loginRedirect(router, segments))),
    catchError(() => of(loginRedirect(router, segments))),
  );
};

export const adminGuard: CanMatchFn = (_route, segments) => {
  const session = inject(AuthSessionService);
  const router = inject(Router);

  return session.ensureSession().pipe(
    map((user) => {
      if (!user) {
        return loginRedirect(router, segments);
      }
      return user.capabilities.canAccessAdmin ? true : router.createUrlTree(['/403']);
    }),
    catchError(() => of(loginRedirect(router, segments))),
  );
};

export const anonymousOnlyGuard: CanMatchFn = () => {
  const session = inject(AuthSessionService);
  const router = inject(Router);
  const redirects = inject(AuthRedirectService);

  console.log("session: ", session);
  console.log("router: ", router);
  console.log("redirects: ", redirects);

  return session.ensureSession().pipe(
    map((user) => (user ? router.createUrlTree([redirects.routeForUser(user)]) : true)),
    catchError(() => of(true)),
  );
};
