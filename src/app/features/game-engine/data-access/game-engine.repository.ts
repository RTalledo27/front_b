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
  GameEngineDrawCommandView,
  GameEngineDrawView,
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
  listDraws(gameId: string): Observable<GameEngineDrawView[]>;
  listCounters(gameId: string): Observable<GameEngineCounterView[]>;
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
