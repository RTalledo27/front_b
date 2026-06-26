import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';

describe('App foundation', () => {
  it('renders the application router outlet', async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('router-outlet')).toBeTruthy();
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
    expect(auth?.canMatch).toHaveLength(1);
    expect(auth?.children?.some((route) => route.path === 'registro')).toBe(true);
    expect(auth?.children?.some((route) => route.path === 'activar')).toBe(true);
  });

  it('provides a dedicated forbidden route', () => {
    expect(routes.some((route) => route.path === '403' && route.loadComponent)).toBe(true);
  });
  it('provides a wildcard route for unknown URLs', () => {
    expect(routes.some((route) => route.path === '**' && route.loadComponent)).toBe(true);
  });
});
