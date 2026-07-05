import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { environment } from '../environments/environment';
import { API_BASE_URL } from './core/api/api.config';
import { SANCTUM_BASE_URL } from './core/auth/auth.config';
import { apiCredentialsInterceptor } from './core/auth/interceptors/api-credentials.interceptor';
import { authErrorInterceptor } from './core/auth/interceptors/auth-error.interceptor';
import { provideGameNumbersRepository } from './features/game-numbers/data-access/game-numbers.provider';
import { ADMIN_COMMERCE_REPOSITORY, HttpAdminCommerceRepository } from './features/admin-commerce/data-access/admin-commerce.repository';
import { ADMIN_GAMES_REPOSITORY, HttpAdminGamesRepository } from './features/admin-games/data-access/admin-games.repository';
import { ADMIN_PLAYERS_REPOSITORY, HttpAdminPlayersRepository } from './features/admin-players/data-access/admin-players.repository';
import { GAME_ENGINE_REPOSITORY, HttpGameEngineRepository } from './features/game-engine/data-access/game-engine.repository';
import { HttpPlayerCommerceRepository } from './features/player-commerce/data-access/http-player-commerce.repository';
import { PLAYER_COMMERCE_REPOSITORY } from './features/player-commerce/data-access/player-commerce.repository';
import { HttpPublicGamesRepository } from './features/public-games/data-access/http-public-games.repository';
import { PUBLIC_GAMES_REPOSITORY } from './features/public-games/data-access/public-games.repository';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([apiCredentialsInterceptor, authErrorInterceptor])),
    { provide: API_BASE_URL, useValue: environment.apiBaseUrl },
    { provide: SANCTUM_BASE_URL, useValue: environment.sanctumBaseUrl },
    provideGameNumbersRepository(),
    { provide: ADMIN_COMMERCE_REPOSITORY, useClass: HttpAdminCommerceRepository },
    { provide: ADMIN_GAMES_REPOSITORY, useClass: HttpAdminGamesRepository },
    { provide: ADMIN_PLAYERS_REPOSITORY, useClass: HttpAdminPlayersRepository },
    { provide: GAME_ENGINE_REPOSITORY, useClass: HttpGameEngineRepository },
    { provide: PLAYER_COMMERCE_REPOSITORY, useClass: HttpPlayerCommerceRepository },
    { provide: PUBLIC_GAMES_REPOSITORY, useClass: HttpPublicGamesRepository },
  ],
};
