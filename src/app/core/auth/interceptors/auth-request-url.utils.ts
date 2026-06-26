function fallbackOrigin(): string {
  if (typeof window !== 'undefined' && typeof window.location?.origin === 'string') {
    return window.location.origin;
  }

  return 'http://localhost';
}

function normalizeBasePath(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.slice(0, -1);
  }

  return pathname;
}

export function resolveUrlCandidate(value: string): URL | null {
  try {
    return new URL(value, fallbackOrigin());
  } catch {
    return null;
  }
}

export function matchesApiBase(requestUrl: string, apiBaseUrl: string): boolean {
  const request = resolveUrlCandidate(requestUrl);
  const base = resolveUrlCandidate(apiBaseUrl);

  if (request === null || base === null || request.origin !== base.origin) {
    return false;
  }

  const basePath = normalizeBasePath(base.pathname);
  return request.pathname === basePath || request.pathname.startsWith(`${basePath}/`);
}

export function apiPathnameFor(requestUrl: string): string | null {
  return resolveUrlCandidate(requestUrl)?.pathname ?? null;
}
