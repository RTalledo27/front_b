import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthUser, SessionStatus } from '../../auth/models/auth.models';
import { AuthRedirectService } from '../../auth/services/auth-redirect.service';
import { AuthSessionService } from '../../auth/services/auth-session.service';
import { PublicShell } from './public-shell';

const player: AuthUser = {
  id: 7,
  name: 'Andrea Rojas',
  email: 'andrea@fortuna.pe',
  role: 'player',
  emailVerified: true,
  emailVerifiedAt: '2026-07-01T00:00:00Z',
  capabilities: { canAccessAdmin: false, canUsePlayerFeatures: true },
};

const admin: AuthUser = {
  id: 9,
  name: 'Admin Fortuna',
  email: 'admin@fortuna.pe',
  role: 'admin',
  emailVerified: true,
  emailVerifiedAt: '2026-07-01T00:00:00Z',
  capabilities: { canAccessAdmin: true, canUsePlayerFeatures: true },
};

function createComponent(status: SessionStatus, user: AuthUser | null) {
  const session = {
    status: signal<SessionStatus>(status),
    user: signal<AuthUser | null>(user),
  };

  TestBed.configureTestingModule({
    imports: [PublicShell],
    providers: [
      provideRouter([]),
      { provide: AuthSessionService, useValue: session },
      AuthRedirectService,
    ],
  });

  const fixture = TestBed.createComponent(PublicShell);
  fixture.detectChanges();
  return { fixture, session };
}

describe('PublicShell', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('shows only anonymous actions when there is no session', () => {
    const { fixture } = createComponent('anonymous', null);
    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Ingresar');
    expect(text).not.toContain('Mi cuenta');
    expect(text).not.toContain('Panel admin');
  });

  it('shows player access without the anonymous login action', () => {
    const { fixture } = createComponent('authenticated', player);
    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Mi cuenta');
    expect(text).not.toContain('Panel admin');
    expect(text).not.toContain('Ingresar');
  });

  it('shows admin access without the anonymous login action', () => {
    const { fixture } = createComponent('authenticated', admin);
    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Panel admin');
    expect(text).not.toContain('Mi cuenta');
    expect(text).not.toContain('Ingresar');
  });

  it('shows a checking state without mixing authenticated and anonymous actions', () => {
    const { fixture } = createComponent('loading', null);
    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Verificando sesión');
    expect(text).not.toContain('Ingresar');
    expect(text).not.toContain('Mi cuenta');
    expect(text).not.toContain('Panel admin');
  });

  it('updates the header when the session changes from anonymous to authenticated and back', () => {
    const { fixture, session } = createComponent('anonymous', null);

    expect(fixture.nativeElement.textContent).toContain('Ingresar');

    session.status.set('authenticated');
    session.user.set(player);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Mi cuenta');
    expect(fixture.nativeElement.textContent).not.toContain('Ingresar');

    session.status.set('anonymous');
    session.user.set(null);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Ingresar');
    expect(fixture.nativeElement.textContent).not.toContain('Mi cuenta');
  });
});
