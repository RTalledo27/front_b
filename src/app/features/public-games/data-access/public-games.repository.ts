import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { PublicGame, PublicGamesPage } from '../models/public-game.models';

export interface PublicGamesRepository {
  list(page?: number): Observable<PublicGamesPage>;
  getBySlug(slug: string): Observable<PublicGame>;
}

export const PUBLIC_GAMES_REPOSITORY = new InjectionToken<PublicGamesRepository>(
  'PUBLIC_GAMES_REPOSITORY',
);