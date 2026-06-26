import { HttpClient } from '@angular/common/http';
import { inject, Injectable, InjectionToken } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_BASE_URL } from '../../../core/api/api.config';
import { LaravelDataResponse } from '../../../core/api/models/api-response.models';
import { AdminGameApiDto, AdminGameNumberApiDto, CreateAdminGameDto } from '../models/admin-games.models';
export interface AdminGamesRepository {
  create(data:CreateAdminGameDto):Observable<AdminGameApiDto>;transition(id:string,action:'publish'|'open-sales'|'close-sales'):Observable<AdminGameApiDto>;
  schedule(id:string,date:string):Observable<AdminGameApiDto>;cancel(id:string,reason:string|null):Observable<AdminGameApiDto>;numbers(id:string):Observable<AdminGameNumberApiDto[]>;
}
export const ADMIN_GAMES_REPOSITORY=new InjectionToken<AdminGamesRepository>('ADMIN_GAMES_REPOSITORY');
@Injectable() export class HttpAdminGamesRepository implements AdminGamesRepository {
  private readonly http=inject(HttpClient);private readonly base=inject(API_BASE_URL);
  create(data:CreateAdminGameDto){return this.http.post<LaravelDataResponse<AdminGameApiDto>>(`${this.base}/admin/games`,data).pipe(map(r=>r.data));}
  transition(id:string,action:'publish'|'open-sales'|'close-sales'){return this.http.post<LaravelDataResponse<AdminGameApiDto>>(`${this.base}/admin/games/${encodeURIComponent(id)}/${action}`,{}).pipe(map(r=>r.data));}
  schedule(id:string,date:string){return this.http.post<LaravelDataResponse<AdminGameApiDto>>(`${this.base}/admin/games/${encodeURIComponent(id)}/schedule`,{scheduled_start_at:date}).pipe(map(r=>r.data));}
  cancel(id:string,reason:string|null){return this.http.post<LaravelDataResponse<AdminGameApiDto>>(`${this.base}/admin/games/${encodeURIComponent(id)}/cancel`,{reason}).pipe(map(r=>r.data));}
  numbers(id:string){return this.http.get<LaravelDataResponse<AdminGameNumberApiDto[]>>(`${this.base}/admin/games/${encodeURIComponent(id)}/numbers`).pipe(map(r=>r.data));}
}