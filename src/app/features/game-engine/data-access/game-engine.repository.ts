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
  GameEngineCountersPageView,
  GameEngineDrawCommandView,
  GameEngineDrawView,
  GameEngineDrawsPageView,
  GameEnginePauseCommandView,
  GameEngineRebuildCountersCommandView,
  GameEngineResumeCommandView,
  GameEngineStartCommandView,
  GameEngineWinnerView,
} from '../models/game-engine.models';
import {
  mapGameEngineCountersResponse,
  mapGameEngineDrawCommandResponse,
  mapGameEngineDrawsResponse,
  mapGameEnginePauseResponse,
  mapGameEngineRebuildCountersResponse,
  mapGameEngineResumeResponse,
  mapGameEngineStartResponse,
  mapGameEngineWinnerResponse,
} from './game-engine.mapper';

export interface GameEngineRepository {
  listDraws(gameId: string, page?: number): Observable<GameEngineDrawsPageView>;
  listCounters(gameId: string, page?: number): Observable<GameEngineCountersPageView>;
  getWinner(gameId: string): Observable<GameEngineWinnerView>;
  startGame(gameId: string): Observable<GameEngineStartCommandView>;
  pauseGame(gameId: string): Observable<GameEnginePauseCommandView>;
  resumeGame(gameId: string): Observable<GameEngineResumeCommandView>;
  drawNumber(gameId: string, commandId: string): Observable<GameEngineDrawCommandView>;
  rebuildCounters(gameId: string): Observable<GameEngineRebuildCountersCommandView>;
}

export const GAME_ENGINE_REPOSITORY = new InjectionToken<GameEngineRepository>(
  'GAME_ENGINE_REPOSITORY',
);

@Injectable()
export class HttpGameEngineRepository implements GameEngineRepository {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  listDraws(gameId: string, page = 1): Observable<GameEngineDrawsPageView> {
    return this.http
      .get<LaravelPaginatedResponse<unknown>>(
        `${this.baseUrl}/admin/games/${encodeURIComponent(gameId)}/draws`,
        { params: new HttpParams().set('page', page) },
      )
      .pipe(map(mapGameEngineDrawsResponse));
  }

  listCounters(gameId: string, page = 1): Observable<GameEngineCountersPageView> {
    return this.http
      .get<LaravelPaginatedResponse<unknown>>(
        `${this.baseUrl}/admin/games/${encodeURIComponent(gameId)}/counters`,
        { params: new HttpParams().set('page', page) },
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

  startGame(gameId: string): Observable<GameEngineStartCommandView> {
    return this.http
      .post<LaravelDataResponse<unknown>>(
        `${this.baseUrl}/admin/games/${encodeURIComponent(gameId)}/start`,
        null,
      )
      .pipe(map(mapGameEngineStartResponse));
  }

  pauseGame(gameId: string): Observable<GameEnginePauseCommandView> {
    return this.http
      .post<LaravelDataResponse<unknown>>(
        `${this.baseUrl}/admin/games/${encodeURIComponent(gameId)}/pause`,
        null,
      )
      .pipe(map(mapGameEnginePauseResponse));
  }

  resumeGame(gameId: string): Observable<GameEngineResumeCommandView> {
    return this.http
      .post<LaravelDataResponse<unknown>>(
        `${this.baseUrl}/admin/games/${encodeURIComponent(gameId)}/resume`,
        null,
      )
      .pipe(map(mapGameEngineResumeResponse));
  }

  drawNumber(gameId: string, commandId: string): Observable<GameEngineDrawCommandView> {
    return this.http
      .post<LaravelDataResponse<unknown>>(
        `${this.baseUrl}/admin/games/${encodeURIComponent(gameId)}/draws`,
        null,
        {
          headers: {
            'X-Draw-Command-Id': commandId,
          },
        },
      )
      .pipe(map(mapGameEngineDrawCommandResponse));
  }

  rebuildCounters(gameId: string): Observable<GameEngineRebuildCountersCommandView> {
    return this.http
      .post<LaravelDataResponse<unknown>>(
        `${this.baseUrl}/admin/games/${encodeURIComponent(gameId)}/counters/rebuild`,
        null,
      )
      .pipe(map(mapGameEngineRebuildCountersResponse));
  }
}
