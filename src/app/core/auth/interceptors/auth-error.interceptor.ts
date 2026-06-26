import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { API_BASE_URL } from '../../api/api.config';
import { AuthRedirectService } from '../services/auth-redirect.service';
import { AuthSessionService } from '../services/auth-session.service';
import { matchesApiBase } from './auth-request-url.utils';

export const authErrorInterceptor: HttpInterceptorFn = (request, next) => {
  const apiBaseUrl = inject(API_BASE_URL);
  const session = inject(AuthSessionService);
  const redirects = inject(AuthRedirectService);
  const router = inject(Router);

  return next(request).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && matchesApiBase(request.url, apiBaseUrl)) {
        if (error.status === 401) {
          session.clearSession();
          const currentUrl = router.url;
          if (redirects.shouldRedirectToLogin(currentUrl)) {
            redirects.redirectToLogin(router, currentUrl);
          }
        } else if (error.status === 403 && !redirects.isForbiddenRoute(router.url)) {
          redirects.redirectToForbidden(router);
        }
      }
      return throwError(() => error);
    }),
  );
};
