import { TestBed } from '@angular/core/testing';
import { GuardResult, provideRouter, Route, Router, UrlSegment, UrlTree } from '@angular/router';
import { firstValueFrom, isObservable, of } from 'rxjs';
import { AuthUser } from '../models/auth.models';
import { AuthRedirectService } from '../services/auth-redirect.service';
import { AuthSessionService } from '../services/auth-session.service';
import { adminGuard, anonymousOnlyGuard, authGuard } from './auth.guard';

const player: AuthUser = {
  id: 1,
  name: 'Player',
  email: 'player@fortuna.pe',
  role: 'player',
  emailVerified: false,
  emailVerifiedAt: null,
  capabilities: { canAccessAdmin: false, canUsePlayerFeatures: true },
};
const admin: AuthUser = {
  id: 2,
  name: 'Admin',
  email: 'admin@fortuna.pe',
  role: 'admin',
  emailVerified: true,
  emailVerifiedAt: '2026-06-20T10:00:00Z',
  capabilities: { canAccessAdmin: true, canUsePlayerFeatures: true },
};

async function runGuard(
  guard: typeof authGuard,
  user: AuthUser | null,
  path: string,
): Promise<GuardResult> {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: AuthSessionService, useValue: { ensureSession: () => of(user) } },
      AuthRedirectService,
    ],
  });

  const result = TestBed.runInInjectionContext(() =>
    guard({} as Route, [new UrlSegment(path, {})]),
  );
  return isObservable(result) ? firstValueFrom(result) : Promise.resolve(result);
}

describe('authentication guards', () => {
  it('redirects anonymous visitors to login with a return URL', async () => {
    const result = await runGuard(authGuard, null, 'jugador');
    const router = TestBed.inject(Router);

    expect(result).toBeInstanceOf(UrlTree);
    expect(router.serializeUrl(result as UrlTree)).toContain('/login?returnUrl=%2Fjugador');
  });

  it('allows an authenticated player into the player area', async () => {
    await expect(runGuard(authGuard, player, 'jugador')).resolves.toBe(true);
  });

  it('sends a player to 403 when entering administration', async () => {
    const result = await runGuard(adminGuard, player, 'admin');
    const router = TestBed.inject(Router);

    expect(router.serializeUrl(result as UrlTree)).toBe('/403');
  });

  it('allows an administrator into administration', async () => {
    await expect(runGuard(adminGuard, admin, 'admin')).resolves.toBe(true);
  });

  it('redirects authenticated users away from anonymous auth routes', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthSessionService, useValue: { ensureSession: () => of(admin) } },
        AuthRedirectService,
      ],
    });

    const result = TestBed.runInInjectionContext(() => anonymousOnlyGuard({} as Route, []));
    const resolved = isObservable(result) ? await firstValueFrom(result) : result;
    const router = TestBed.inject(Router);

    expect(router.serializeUrl(resolved as UrlTree)).toBe('/admin/dashboard');
  });
});
