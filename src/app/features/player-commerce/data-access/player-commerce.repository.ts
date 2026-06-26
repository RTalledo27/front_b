import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { LaravelPaginatedResponse } from '../../../core/api/models/api-response.models';
import {
  EvidenceSubmissionApiDto,
  OrderCancellationApiDto,
  PlayerEntryApiDto,
  PlayerOrderApiDto,
  PlayerOrderDetailApiDto,
  PlayerReservationApiDto,
} from '../models/player-commerce.models';

export interface PlayerCommerceRepository {
  listOrders(page?: number, status?: string): Observable<LaravelPaginatedResponse<PlayerOrderApiDto>>;
  getOrder(orderId: string): Observable<PlayerOrderDetailApiDto>;
  cancelOrder(orderId: string): Observable<OrderCancellationApiDto>;
  submitEvidence(orderId: string, file: File, idempotencyKey: string): Observable<EvidenceSubmissionApiDto>;
  listReservations(page?: number): Observable<LaravelPaginatedResponse<PlayerReservationApiDto>>;
  listEntries(page?: number, gameId?: string): Observable<LaravelPaginatedResponse<PlayerEntryApiDto>>;
}

export const PLAYER_COMMERCE_REPOSITORY = new InjectionToken<PlayerCommerceRepository>(
  'PLAYER_COMMERCE_REPOSITORY',
);