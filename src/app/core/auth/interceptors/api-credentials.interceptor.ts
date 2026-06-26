import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { API_BASE_URL } from '../../api/api.config';
import { AuthTokenStorageService } from '../services/auth-token-storage.service';
import { apiPathnameFor, matchesApiBase } from './auth-request-url.utils';

export const apiCredentialsInterceptor: HttpInterceptorFn = (request, next) => {
  const apiBaseUrl = inject(API_BASE_URL);
  const tokens = inject(AuthTokenStorageService);
  const isApiRequest = matchesApiBase(request.url, apiBaseUrl);
  const pathname = apiPathnameFor(request.url);
  const apiBasePath = apiPathnameFor(apiBaseUrl);
  const isPublicRequest =
    pathname !== null &&
    apiBasePath !== null &&
    pathname.startsWith(`${apiBasePath}/public/`);
  const isAnonymousAuthRequest =
    pathname !== null &&
    apiBasePath !== null &&
    [`${apiBasePath}/auth/login`, `${apiBasePath}/auth/register`, `${apiBasePath}/auth/activate`].includes(
      pathname,
    );

  if (!isApiRequest) {
    return next(request);
  }

  const token = tokens.read();
  const hasAuthorizationHeader = request.headers.has('Authorization');
  const shouldAttachToken =
    token !== null && !hasAuthorizationHeader && !isPublicRequest && !isAnonymousAuthRequest;
  const headers: Record<string, string> = { Accept: 'application/json' };

  if (shouldAttachToken) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return next(
    request.clone({
      setHeaders: headers,
    }),
  );
};
