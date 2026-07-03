import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable, InjectionToken } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_BASE_URL } from '../../../core/api/api.config';
import { LaravelDataResponse, LaravelPaginatedResponse } from '../../../core/api/models/api-response.models';
import {
  AdminOrderApiDto,
  AdminPaymentDetailApiDto,
  AdminPaymentListApiDto,
  AdminPaymentTransitionApiDto,
  AdminRefundView,
  AdminWinnerPayoutView,
  RefundOrderPayload,
  WinnerPayoutPayload,
} from '../models/admin-commerce.models';
import {
  mapAdminRefundResponse,
  mapAdminWinnerPayoutResponse,
} from './admin-commerce.mapper';

export interface AdminCommerceRepository {
  listOrders(page?: number, status?: string, gameId?: string): Observable<LaravelPaginatedResponse<AdminOrderApiDto>>;
  listPayments(page?: number, status?: string): Observable<LaravelPaginatedResponse<AdminPaymentListApiDto>>;
  getPayment(paymentId: string): Observable<AdminPaymentDetailApiDto>;
  approvePayment(paymentId: string, notes: string | null, key: string): Observable<AdminPaymentTransitionApiDto>;
  rejectPayment(paymentId: string, reason: string, key: string): Observable<AdminPaymentTransitionApiDto>;
  refundOrder(orderId: string, payload: RefundOrderPayload, key: string): Observable<AdminRefundView>;
  getOrderRefund(orderId: string): Observable<AdminRefundView>;
  processWinnerPayout(gameId: string, payload: WinnerPayoutPayload, key: string): Observable<AdminWinnerPayoutView>;
  getWinnerPayout(gameId: string): Observable<AdminWinnerPayoutView>;
}
export const ADMIN_COMMERCE_REPOSITORY = new InjectionToken<AdminCommerceRepository>('ADMIN_COMMERCE_REPOSITORY');

@Injectable()
export class HttpAdminCommerceRepository implements AdminCommerceRepository {
  private readonly http=inject(HttpClient); private readonly base=inject(API_BASE_URL);
  listOrders(page=1,status?:string,gameId?:string){let params=new HttpParams().set('page',page);if(status)params=params.set('status',status);if(gameId)params=params.set('game_id',gameId);return this.http.get<LaravelPaginatedResponse<AdminOrderApiDto>>(`${this.base}/admin/orders`,{params});}
  listPayments(page=1,status?:string){let params=new HttpParams().set('page',page);if(status)params=params.set('status',status);return this.http.get<LaravelPaginatedResponse<AdminPaymentListApiDto>>(`${this.base}/admin/payments`,{params});}
  getPayment(id:string){return this.http.get<LaravelDataResponse<AdminPaymentDetailApiDto>>(`${this.base}/admin/payments/${encodeURIComponent(id)}`).pipe(map(r=>r.data));}
  approvePayment(id:string,notes:string|null,key:string){return this.http.post<LaravelDataResponse<AdminPaymentTransitionApiDto>>(`${this.base}/admin/payments/${encodeURIComponent(id)}/approve`,{notes},{headers:{'Idempotency-Key':key}}).pipe(map(r=>r.data));}
  rejectPayment(id:string,reason:string,key:string){return this.http.post<LaravelDataResponse<AdminPaymentTransitionApiDto>>(`${this.base}/admin/payments/${encodeURIComponent(id)}/reject`,{reason},{headers:{'Idempotency-Key':key}}).pipe(map(r=>r.data));}
  refundOrder(orderId:string,payload:RefundOrderPayload,key:string){return this.http.post<LaravelDataResponse<unknown>>(`${this.base}/admin/orders/${encodeURIComponent(orderId)}/refund`,{reason:payload.reason},{headers:{'Idempotency-Key':key}}).pipe(map(mapAdminRefundResponse));}
  getOrderRefund(orderId:string){return this.http.get<LaravelDataResponse<unknown>>(`${this.base}/admin/orders/${encodeURIComponent(orderId)}/refund`).pipe(map(mapAdminRefundResponse));}
  processWinnerPayout(gameId:string,payload:WinnerPayoutPayload,key:string){const body=new FormData();body.append('external_reference',payload.externalReference);if(payload.notes!==null){body.append('notes',payload.notes);}body.append('document',payload.document);return this.http.post<LaravelDataResponse<unknown>>(`${this.base}/admin/games/${encodeURIComponent(gameId)}/winner/payout`,body,{headers:{'Idempotency-Key':key}}).pipe(map(mapAdminWinnerPayoutResponse));}
  getWinnerPayout(gameId:string){return this.http.get<LaravelDataResponse<unknown>>(`${this.base}/admin/games/${encodeURIComponent(gameId)}/winner/payout`).pipe(map(mapAdminWinnerPayoutResponse));}
}
