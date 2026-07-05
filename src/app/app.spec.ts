import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { App } from './app';
import { routes } from './app.routes';
import { AuthSessionService } from './core/auth/services/auth-session.service';
import { AuthTokenStorageService } from './core/auth/services/auth-token-storage.service';

describe('App foundation', () => {
  it('renders the application router outlet', async () => {
    const session = {
      ensureSession: vi.fn(() => of(null)),
      status: signal<'unknown' | 'loading' | 'authenticated' | 'anonymous' | 'error'>('anonymous'),
    };
    const tokens = {
      read: vi.fn(() => null),
    };

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        { provide: AuthSessionService, useValue: session },
        { provide: AuthTokenStorageService, useValue: tokens },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('router-outlet')).toBeTruthy();
    expect(session.ensureSession).not.toHaveBeenCalled();
  });

  it('hydrates an existing session on startup and shows a temporary overlay', async () => {
    const restoration = new Subject<null>();
    const session = {
      ensureSession: vi.fn(() => restoration.asObservable()),
      status: signal<'unknown' | 'loading' | 'authenticated' | 'anonymous' | 'error'>('loading'),
    };
    const tokens = {
      read: vi.fn(() => 'stored-token'),
    };

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        { provide: AuthSessionService, useValue: session },
        { provide: AuthTokenStorageService, useValue: tokens },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    expect(session.ensureSession).toHaveBeenCalledTimes(1);
    expect(fixture.nativeElement.textContent).toContain('Recuperando tu sesión');

    restoration.next(null);
    restoration.complete();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('Recuperando tu sesión');
  });

  it('removes the overlay even if session restoration fails', async () => {
    const session = {
      ensureSession: vi.fn(() => throwError(() => new Error('boom'))),
      status: signal<'unknown' | 'loading' | 'authenticated' | 'anonymous' | 'error'>('loading'),
    };
    const tokens = {
      read: vi.fn(() => 'stored-token'),
    };

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        { provide: AuthSessionService, useValue: session },
        { provide: AuthTokenStorageService, useValue: tokens },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    expect(session.ensureSession).toHaveBeenCalledTimes(1);
    expect(fixture.nativeElement.textContent).not.toContain('Recuperando tu sesión');
  });

  it('opens the public catalog at the root route', () => {
    const rootRedirect = routes.find(
      (route) => route.path === '' && route.pathMatch === 'full',
    );
    const publicShell = routes.find(
      (route) => route.path === '' && route.loadComponent && route.children,
    );

    expect(rootRedirect?.redirectTo).toBe('bingos');
    expect(publicShell?.loadComponent).toBeTypeOf('function');
    expect(publicShell?.children?.some((route) => route.path === 'bingos')).toBe(true);
    expect(publicShell?.children?.some((route) => route.path === 'bingos/:slug')).toBe(true);
    expect(publicShell?.children?.some((route) => route.path === 'bingos/:slug/numeros')).toBe(true);
  });
  it('keeps admin and player areas behind lazy-loaded shells', () => {
    const admin = routes.find((route) => route.path === 'admin');
    const player = routes.find((route) => route.path === 'jugador');
    const auth = routes.find(
      (route) => route.path === '' && route.loadComponent && route.children?.some((child) => child.path === 'login'),
    );

    expect(admin?.canMatch).toHaveLength(1);
    expect(admin?.loadComponent).toBeTypeOf('function');
    expect(admin?.children?.some((route) => route.path === 'dashboard')).toBe(true);
    expect(player?.canMatch).toHaveLength(1);
    expect(player?.loadComponent).toBeTypeOf('function');
    expect(player?.children?.some((route) => route.path === 'cartones')).toBe(true);
    expect(player?.children?.some((route) => route.path === 'reservas')).toBe(true);
    expect(player?.children?.some((route) => route.path === 'compras')).toBe(true);
    expect(player?.children?.some((route) => route.path === 'compras/:orderId')).toBe(true);
    expect(auth?.canMatch).toBeUndefined();
    expect(auth?.children?.find((route) => route.path === 'login')?.canMatch).toHaveLength(1);
    expect(auth?.children?.some((route) => route.path === 'registro')).toBe(true);
    expect(auth?.children?.find((route) => route.path === 'registro')?.canMatch).toHaveLength(1);
    expect(auth?.children?.some((route) => route.path === 'activar')).toBe(true);
    expect(auth?.children?.find((route) => route.path === 'activar')?.canMatch).toHaveLength(1);
    expect(auth?.children?.some((route) => route.path === 'recuperar-acceso')).toBe(true);
    expect(auth?.children?.find((route) => route.path === 'recuperar-acceso')?.canMatch).toHaveLength(1);
    expect(auth?.children?.some((route) => route.path === 'restablecer-acceso')).toBe(true);
    expect(auth?.children?.some((route) => route.path === 'verifica-tu-correo')).toBe(true);
    expect(auth?.children?.find((route) => route.path === 'verifica-tu-correo')?.canMatch).toHaveLength(1);
    expect(auth?.children?.some((route) => route.path === 'verificar-correo/:id/:hash')).toBe(true);
    expect(auth?.children?.some((route) => route.path === 'auth/social/callback')).toBe(true);
    expect(auth?.children?.some((route) => route.path === 'auth/social/link/callback')).toBe(true);
    expect(player?.children?.some((route) => route.path === 'identidad')).toBe(true);
  });

  it('provides a dedicated forbidden route', () => {
    expect(routes.some((route) => route.path === '403' && route.loadComponent)).toBe(true);
  });
  it('provides a wildcard route for unknown URLs', () => {
    expect(routes.some((route) => route.path === '**' && route.loadComponent)).toBe(true);
  });
});
