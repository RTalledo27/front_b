import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_BASE_URL } from '../../../core/api/api.config';
import {
  LaravelDataResponse,
  LaravelPaginatedResponse,
} from '../../../core/api/models/api-response.models';
import { PublicGameApiDto } from '../../../core/api/models/game-api.models';
import { PublicGame, PublicGamesPage } from '../models/public-game.models';
import { mapPublicGame, mapPublicGamesPage } from './public-game.mapper';
import { PublicGamesRepository } from './public-games.repository';

@Injectable()
export class HttpPublicGamesRepository implements PublicGamesRepository {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  list(page = 1): Observable<PublicGamesPage> {
    return this.http
      .get<LaravelPaginatedResponse<PublicGameApiDto>>(`${this.baseUrl}/public/games`, {
        params: { page },
      })
      .pipe(map(mapPublicGamesPage));
  }

  getBySlug(slug: string): Observable<PublicGame> {
    return this.http
      .get<LaravelDataResponse<PublicGameApiDto>>(
        `${this.baseUrl}/public/games/${encodeURIComponent(slug)}`,
      )
      .pipe(map((response) => mapPublicGame(response.data)));
  }
}