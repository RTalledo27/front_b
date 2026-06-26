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

describe('AuthRedirectService', () => {
  let service: AuthRedirectService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AuthRedirectService);
  });

  it('accepts an internal non-auth returnUrl', () => {
    expect(service.resolveReturnUrl(player, '/jugador/compras')).toBe('/jugador/compras');
  });

  it('rejects external returnUrls', () => {
    expect(service.resolveReturnUrl(player, 'https://evil.example')).toBe('/jugador/inicio');
    expect(service.resolveReturnUrl(player, 'http://evil.example')).toBe('/jugador/inicio');
    expect(service.resolveReturnUrl(player, '//evil.example')).toBe('/jugador/inicio');
  });

  it('rejects backslash and malformed returnUrls', () => {
    expect(service.resolveReturnUrl(player, '/\\evil.example')).toBe('/jugador/inicio');
    expect(service.resolveReturnUrl(player, '%E0%A4%A')).toBe('/jugador/inicio');
  });

  it('rejects auth routes and protocol smuggling', () => {
    expect(service.resolveReturnUrl(player, '/login')).toBe('/jugador/inicio');
    expect(service.resolveReturnUrl(player, '/%2F%2Fevil.example')).toBe('/jugador/inicio');
  });
});
