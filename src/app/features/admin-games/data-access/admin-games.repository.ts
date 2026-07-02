import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable, InjectionToken } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_BASE_URL } from '../../../core/api/api.config';
import { LaravelDataResponse, LaravelPaginatedResponse } from '../../../core/api/models/api-response.models';
import {
  AdminGameCommandResultView,
  AdminGameDetailView,
  CancelGamePayload,
  CreateAdminGamePayload,
  AdminGameNumbersQuery,
  AdminGameNumbersResult,
  AdminGameListQuery,
  AdminGameListResult,
  ScheduleGamePayload,
} from '../models/admin-games.models';
import { mapAdminGameNumbersResponse } from './admin-game-numbers.mapper';
import {
  mapAdminGameCommandResultResponse,
  mapAdminGameDetailResponse,
  mapAdminGameListResponse,
} from './admin-games.mapper';

export interface AdminGamesRepository {
  listGames(query: AdminGameListQuery): Observable<AdminGameListResult>;
  getGame(gameId: string): Observable<AdminGameDetailView>;
  listGameNumbers(gameId: string, query: AdminGameNumbersQuery): Observable<AdminGameNumbersResult>;
  createGame(payload: CreateAdminGamePayload): Observable<AdminGameCommandResultView>;
  publishGame(gameId: string): Observable<AdminGameCommandResultView>;
  openGameSales(gameId: string): Observable<AdminGameCommandResultView>;
  closeGameSales(gameId: string): Observable<AdminGameCommandResultView>;
  scheduleGame(gameId: string, payload: ScheduleGamePayload): Observable<AdminGameCommandResultView>;
  cancelGame(gameId: string, payload: CancelGamePayload): Observable<AdminGameCommandResultView>;
}

export const ADMIN_GAMES_REPOSITORY = new InjectionToken<AdminGamesRepository>(
  'ADMIN_GAMES_REPOSITORY',
);

@Injectable()
export class HttpAdminGamesRepository implements AdminGamesRepository {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  listGames(query: AdminGameListQuery): Observable<AdminGameListResult> {
    let params = new HttpParams().set('page', query.page);

    if (query.search.trim() !== '') {
      params = params.set('search', query.search.trim());
    }

    if (query.status.trim() !== '') {
      params = params.set('status', query.status.trim());
    }

    if (query.published !== null) {
      params = params.set('published', query.published ? '1' : '0');
    }

    if (query.autoDrawEnabled !== null) {
      params = params.set('auto_draw_enabled', query.autoDrawEnabled ? '1' : '0');
    }

    if (query.createdFrom !== null) {
      params = params.set('created_from', query.createdFrom);
    }

    if (query.createdTo !== null) {
      params = params.set('created_to', query.createdTo);
    }

    return this.http
      .get<LaravelPaginatedResponse<unknown>>(`${this.baseUrl}/admin/games`, { params })
      .pipe(map(mapAdminGameListResponse));
  }

  getGame(gameId: string): Observable<AdminGameDetailView> {
    return this.http
      .get<LaravelDataResponse<unknown>>(
        `${this.baseUrl}/admin/games/${encodeURIComponent(gameId)}`,
      )
      .pipe(map(mapAdminGameDetailResponse));
  }

  listGameNumbers(gameId: string, _query: AdminGameNumbersQuery): Observable<AdminGameNumbersResult> {
    return this.http
      .get<{ data: unknown[] }>(`${this.baseUrl}/admin/games/${encodeURIComponent(gameId)}/numbers`)
      .pipe(map(mapAdminGameNumbersResponse));
  }

  createGame(payload: CreateAdminGamePayload): Observable<AdminGameCommandResultView> {
    return this.http
      .post<LaravelDataResponse<unknown>>(`${this.baseUrl}/admin/games`, {
        slug: payload.slug,
        name: payload.name,
        description: payload.description,
        number_min: payload.numberMin,
        number_max: payload.numberMax,
        hits_required: payload.hitsRequired,
        ticket_price_cents: payload.ticketPriceCents,
        prize_cents: payload.prizeCents,
        currency: payload.currency,
        draw_interval_seconds: payload.drawIntervalSeconds,
        auto_draw_enabled: payload.autoDrawEnabled,
        sales_opens_at: payload.salesOpensAt,
        sales_closes_at: payload.salesClosesAt,
        scheduled_start_at: payload.scheduledStartAt,
      })
      .pipe(map(mapAdminGameCommandResultResponse));
  }

  publishGame(gameId: string): Observable<AdminGameCommandResultView> {
    return this.postLifecycleCommand(gameId, 'publish');
  }

  openGameSales(gameId: string): Observable<AdminGameCommandResultView> {
    return this.postLifecycleCommand(gameId, 'open-sales');
  }

  closeGameSales(gameId: string): Observable<AdminGameCommandResultView> {
    return this.postLifecycleCommand(gameId, 'close-sales');
  }

  scheduleGame(gameId: string, payload: ScheduleGamePayload): Observable<AdminGameCommandResultView> {
    return this.http
      .post<LaravelDataResponse<unknown>>(
        `${this.baseUrl}/admin/games/${encodeURIComponent(gameId)}/schedule`,
        {
          scheduled_start_at: payload.scheduledStartAt,
        },
      )
      .pipe(map(mapAdminGameCommandResultResponse));
  }

  cancelGame(gameId: string, payload: CancelGamePayload): Observable<AdminGameCommandResultView> {
    return this.http
      .post<LaravelDataResponse<unknown>>(
        `${this.baseUrl}/admin/games/${encodeURIComponent(gameId)}/cancel`,
        {
          reason: payload.reason,
        },
      )
      .pipe(map(mapAdminGameCommandResultResponse));
  }

  private postLifecycleCommand(gameId: string, path: string): Observable<AdminGameCommandResultView> {
    return this.http
      .post<LaravelDataResponse<unknown>>(
        `${this.baseUrl}/admin/games/${encodeURIComponent(gameId)}/${path}`,
        {},
      )
      .pipe(map(mapAdminGameCommandResultResponse));
  }
}
