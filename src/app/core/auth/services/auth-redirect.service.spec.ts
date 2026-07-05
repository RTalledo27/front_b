import { TestBed } from '@angular/core/testing';
import { AuthRedirectService } from './auth-redirect.service';
import { AuthUser } from '../models/auth.models';

const player: AuthUser = {
  id: 1,
  name: 'Player',
  email: 'player@example.com',
  role: 'player',
  emailVerified: false,
  emailVerifiedAt: null,
  capabilities: { canAccessAdmin: false, canUsePlayerFeatures: true },
};

const verifiedPlayer: AuthUser = {
  ...player,
  emailVerified: true,
  emailVerifiedAt: '2026-07-05T00:00:00Z',
};

describe('AuthRedirectService', () => {
  let service: AuthRedirectService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AuthRedirectService);
  });

  it('accepts an internal non-auth returnUrl', () => {
    expect(service.resolveReturnUrl(player, '/jugador/compras')).toBe('/jugador/compras');
  });

  it('sends unverified users to the verification notice when there is no safe returnUrl', () => {
    expect(service.routeForUser(player)).toBe('/verifica-tu-correo');
  });

  it('keeps verified players on their normal home route', () => {
    expect(service.routeForUser(verifiedPlayer)).toBe('/jugador/inicio');
  });

  it('rejects external returnUrls', () => {
    expect(service.resolveReturnUrl(player, 'https://evil.example')).toBe('/verifica-tu-correo');
    expect(service.resolveReturnUrl(player, 'http://evil.example')).toBe('/verifica-tu-correo');
    expect(service.resolveReturnUrl(player, '//evil.example')).toBe('/verifica-tu-correo');
  });

  it('rejects backslash and malformed returnUrls', () => {
    expect(service.resolveReturnUrl(player, '/\\evil.example')).toBe('/verifica-tu-correo');
    expect(service.resolveReturnUrl(player, '%E0%A4%A')).toBe('/verifica-tu-correo');
  });

  it('rejects auth routes and protocol smuggling', () => {
    expect(service.resolveReturnUrl(player, '/login')).toBe('/verifica-tu-correo');
    expect(service.resolveReturnUrl(player, '/%2F%2Fevil.example')).toBe('/verifica-tu-correo');
  });
});
