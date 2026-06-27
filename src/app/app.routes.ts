import { Routes } from '@angular/router';
import { adminGuard, anonymousOnlyGuard, authGuard } from './core/auth/guards/auth.guard';

const adminSections = [
  ['rifas', 'raffles', 'Rifas'],
  ['participantes', 'participants', 'Participantes'],
  ['reportes', 'reports', 'Reportes'],
  ['configuracion', 'settings', 'Configuración'],
] as const;

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'bingos' },
  {
    path: '',
    loadComponent: () =>
      import('./core/layout/public-shell/public-shell').then(({ PublicShell }) => PublicShell),
    children: [
      {
        path: 'bingos',
        title: 'Bingos | Fortuna',
        loadComponent: () =>
          import('./features/public-games/pages/game-catalog-page/game-catalog-page').then(
            ({ GameCatalogPage }) => GameCatalogPage,
          ),
      },
      {
        path: 'bingos/:slug/numeros',
        title: 'Elegir números | Fortuna',
        loadComponent: () =>
          import('./features/game-numbers/pages/number-selection-page/number-selection-page').then(
            ({ NumberSelectionPage }) => NumberSelectionPage,
          ),
      },
      {
        path: 'bingos/:slug',
        title: 'Detalle del bingo | Fortuna',
        loadComponent: () =>
          import('./features/public-games/pages/game-detail-page/game-detail-page').then(
            ({ GameDetailPage }) => GameDetailPage,
          ),
      },
    ],
  },
  {
    path: '',
    canMatch: [anonymousOnlyGuard],
    loadComponent: () =>
      import('./core/layout/auth-shell/auth-shell').then(({ AuthShell }) => AuthShell),
    children: [
      {
        path: 'login',
        title: 'Iniciar sesión | Fortuna',
        loadComponent: () =>
          import('./features/auth/pages/login-page/login-page').then(({ LoginPage }) => LoginPage),
      },
      {
        path: 'registro',
        title: 'Crear cuenta | Fortuna',
        loadComponent: () =>
          import('./features/auth/pages/register-page/register-page').then(
            ({ RegisterPage }) => RegisterPage,
          ),
      },
      {
        path: 'activar',
        title: 'Activar cuenta | Fortuna',
        loadComponent: () =>
          import('./features/auth/pages/activate-page/activate-page').then(
            ({ ActivatePage }) => ActivatePage,
          ),
      },
    ],
  },
  {
    path: 'admin',
    canMatch: [adminGuard],
    loadComponent: () =>
      import('./core/layout/admin-shell/admin-shell').then(({ AdminShell }) => AdminShell),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        title: 'Resumen | Fortuna',
        loadComponent: () =>
          import('./features/admin/pages/dashboard-page/dashboard-page').then(
            ({ DashboardPage }) => DashboardPage,
          ),
      },
      {
        path: 'bingos',
        title: 'Bingos | Fortuna',
        loadComponent: () =>
          import('./features/admin-games/pages/admin-games-page/admin-games-page').then(
            ({ AdminGamesPage }) => AdminGamesPage,
          ),
      },
      {
        path: 'bingos/:gameId/motor',
        title: 'Motor del bingo | Fortuna',
        loadComponent: () =>
          import('./features/game-engine/pages/game-engine-page/game-engine-page').then(
            ({ GameEnginePage }) => GameEnginePage,
          ),
      },
      {
        path: 'bingos/:gameId',
        title: 'Detalle administrativo del bingo | Fortuna',
        loadComponent: () =>
          import('./features/admin-games/pages/admin-game-detail-page/admin-game-detail-page').then(
            ({ AdminGameDetailPage }) => AdminGameDetailPage,
          ),
      },
      {
        path: 'motor',
        title: 'Motor técnico | Fortuna',
        loadComponent: () =>
          import('./features/game-engine/pages/game-engine-page/game-engine-page').then(
            ({ GameEnginePage }) => GameEnginePage,
          ),
      },
      {
        path: 'ordenes',
        title: 'Órdenes | Fortuna',
        loadComponent: () =>
          import('./features/admin-commerce/pages/orders-page/admin-orders-page').then(
            ({ AdminOrdersPage }) => AdminOrdersPage,
          ),
      },
      {
        path: 'pagos',
        title: 'Pagos | Fortuna',
        loadComponent: () =>
          import('./features/admin-commerce/pages/payments-page/admin-payments-page').then(
            ({ AdminPaymentsPage }) => AdminPaymentsPage,
          ),
      },
      {
        path: 'pagos/:paymentId',
        title: 'Revisar pago | Fortuna',
        loadComponent: () =>
          import('./features/admin-commerce/pages/payment-detail-page/admin-payment-detail-page').then(
            ({ AdminPaymentDetailPage }) => AdminPaymentDetailPage,
          ),
      },
      ...adminSections.map(([path, section, title]) => ({
        path,
        title: `${title} | Fortuna`,
        data: { section },
        loadComponent: () =>
          import('./features/admin/pages/admin-section-page/admin-section-page').then(
            ({ AdminSectionPage }) => AdminSectionPage,
          ),
      })),
    ],
  },
  {
    path: 'jugador',
    canMatch: [authGuard],
    loadComponent: () =>
      import('./core/layout/player-shell/player-shell').then(({ PlayerShell }) => PlayerShell),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'inicio' },
      {
        path: 'inicio',
        title: 'Mi inicio | Fortuna',
        loadComponent: () =>
          import('./features/player/pages/player-home-page/player-home-page').then(
            ({ PlayerHomePage }) => PlayerHomePage,
          ),
      },
      {
        path: 'cartones',
        title: 'Mis números | Fortuna',
        loadComponent: () =>
          import('./features/player-commerce/pages/entries-page/player-entries-page').then(
            ({ PlayerEntriesPage }) => PlayerEntriesPage,
          ),
      },
      {
        path: 'reservas',
        title: 'Mis reservas | Fortuna',
        loadComponent: () =>
          import('./features/player-commerce/pages/reservations-page/player-reservations-page').then(
            ({ PlayerReservationsPage }) => PlayerReservationsPage,
          ),
      },
      {
        path: 'compras',
        title: 'Mis órdenes | Fortuna',
        loadComponent: () =>
          import('./features/player-commerce/pages/orders-page/player-orders-page').then(
            ({ PlayerOrdersPage }) => PlayerOrdersPage,
          ),
      },
      {
        path: 'compras/:orderId',
        title: 'Detalle de orden | Fortuna',
        loadComponent: () =>
          import('./features/player-commerce/pages/order-detail-page/player-order-detail-page').then(
            ({ PlayerOrderDetailPage }) => PlayerOrderDetailPage,
          ),
      },
    ],
  },
  {
    path: '403',
    title: 'Acceso restringido | Fortuna',
    loadComponent: () =>
      import('./features/errors/pages/forbidden-page/forbidden-page').then(
        ({ ForbiddenPage }) => ForbiddenPage,
      ),
  },
  {
    path: '**',
    title: 'Página no encontrada | Fortuna',
    loadComponent: () =>
      import('./features/errors/pages/not-found-page/not-found-page').then(
        ({ NotFoundPage }) => NotFoundPage,
      ),
  },
];
