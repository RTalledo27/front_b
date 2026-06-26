import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_BASE_URL } from '../../../core/api/api.config';
import { LaravelDataResponse, LaravelPaginatedResponse } from '../../../core/api/models/api-response.models';
import {
  EvidenceSubmissionApiDto,
  OrderCancellationApiDto,
  PlayerEntryApiDto,
  PlayerOrderApiDto,
  PlayerOrderDetailApiDto,
  PlayerReservationApiDto,
} from '../models/player-commerce.models';
import { PlayerCommerceRepository } from './player-commerce.repository';

@Injectable()
export class HttpPlayerCommerceRepository implements PlayerCommerceRepository {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  listOrders(page = 1, status?: string): Observable<LaravelPaginatedResponse<PlayerOrderApiDto>> {
    let params = new HttpParams().set('page', page);
    if (status) params = params.set('status', status);
    return this.http.get<LaravelPaginatedResponse<PlayerOrderApiDto>>(`${this.apiBaseUrl}/me/orders`, { params });
  }

  getOrder(orderId: string): Observable<PlayerOrderDetailApiDto> {
    return this.http
      .get<LaravelDataResponse<PlayerOrderDetailApiDto>>(`${this.apiBaseUrl}/me/orders/${encodeURIComponent(orderId)}`)
      .pipe(map((response) => response.data));
  }

  cancelOrder(orderId: string): Observable<OrderCancellationApiDto> {
    return this.http
      .post<LaravelDataResponse<OrderCancellationApiDto>>(`${this.apiBaseUrl}/me/orders/${encodeURIComponent(orderId)}/cancel`, {})
      .pipe(map((response) => response.data));
  }

  submitEvidence(orderId: string, file: File, idempotencyKey: string): Observable<EvidenceSubmissionApiDto> {
    const body = new FormData();
    body.append('evidence', file, file.name);
    return this.http
      .post<LaravelDataResponse<EvidenceSubmissionApiDto>>(
        `${this.apiBaseUrl}/me/orders/${encodeURIComponent(orderId)}/payment-evidence`,
        body,
        { headers: { 'Idempotency-Key': idempotencyKey } },
      )
      .pipe(map((response) => response.data));
  }

  listReservations(page = 1): Observable<LaravelPaginatedResponse<PlayerReservationApiDto>> {
    return this.http.get<LaravelPaginatedResponse<PlayerReservationApiDto>>(
      `${this.apiBaseUrl}/me/reservations`,
      { params: new HttpParams().set('page', page) },
    );
  }

  listEntries(page = 1, gameId?: string): Observable<LaravelPaginatedResponse<PlayerEntryApiDto>> {
    let params = new HttpParams().set('page', page);
    if (gameId) params = params.set('game_id', gameId);
    return this.http.get<LaravelPaginatedResponse<PlayerEntryApiDto>>(`${this.apiBaseUrl}/me/entries`, { params });
  }
}