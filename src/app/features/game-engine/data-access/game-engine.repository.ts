import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable, InjectionToken } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_BASE_URL } from '../../../core/api/api.config';
import {
  LaravelDataResponse,
  LaravelPaginatedResponse,
} from '../../../core/api/models/api-response.models';
import {
  GameEngineCounterView,
  GameEngineDrawView,
  GameEngineWinnerView,
} from '../models/game-engine.models';
import {
  mapGameEngineCountersResponse,
  mapGameEngineDrawsResponse,
  mapGameEngineWinnerResponse,
} from './game-engine.mapper';

export interface GameEngineRepository {
  listDraws(gameId: string): Observable<GameEngineDrawView[]>;
  listCounters(gameId: string): Observable<GameEngineCounterView[]>;
  getWinner(gameId: string): Observable<GameEngineWinnerView>;
}

export const GAME_ENGINE_REPOSITORY = new InjectionToken<GameEngineRepository>(
  'GAME_ENGINE_REPOSITORY',
);

@Injectable()
export class HttpGameEngineRepository implements GameEngineRepository {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  listDraws(gameId: string): Observable<GameEngineDrawView[]> {
    return this.http
      .get<LaravelPaginatedResponse<unknown>>(
        `${this.baseUrl}/admin/games/${encodeURIComponent(gameId)}/draws`,
        { params: new HttpParams().set('per_page', 100) },
      )
      .pipe(map(mapGameEngineDrawsResponse));
  }

  listCounters(gameId: string): Observable<GameEngineCounterView[]> {
    return this.http
      .get<LaravelPaginatedResponse<unknown>>(
        `${this.baseUrl}/admin/games/${encodeURIComponent(gameId)}/counters`,
        { params: new HttpParams().set('per_page', 100) },
      )
      .pipe(map(mapGameEngineCountersResponse));
  }

  getWinner(gameId: string): Observable<GameEngineWinnerView> {
    return this.http
      .get<LaravelDataResponse<unknown>>(
        `${this.baseUrl}/admin/games/${encodeURIComponent(gameId)}/winner`,
      )
      .pipe(map(mapGameEngineWinnerResponse));
  }
}
