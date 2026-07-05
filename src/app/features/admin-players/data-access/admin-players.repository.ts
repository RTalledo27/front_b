import { HttpClient } from '@angular/common/http';
import { inject, Injectable, InjectionToken } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_BASE_URL } from '../../../core/api/api.config';
import { LaravelDataResponse } from '../../../core/api/models/api-response.models';
import { AdminPlayerInvitationView, CreateAdminPlayerPayload } from '../models/admin-players.models';
import { mapAdminPlayerInvitationResponse } from './admin-players.mapper';

export interface AdminPlayersRepository {
  createPlayer(payload: CreateAdminPlayerPayload): Observable<AdminPlayerInvitationView>;
}

export const ADMIN_PLAYERS_REPOSITORY = new InjectionToken<AdminPlayersRepository>(
  'ADMIN_PLAYERS_REPOSITORY',
);

@Injectable()
export class HttpAdminPlayersRepository implements AdminPlayersRepository {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  createPlayer(payload: CreateAdminPlayerPayload): Observable<AdminPlayerInvitationView> {
    return this.http
      .post<LaravelDataResponse<unknown>>(`${this.baseUrl}/admin/players`, {
        name: payload.name,
        email: payload.email,
      })
      .pipe(map(mapAdminPlayerInvitationResponse));
  }
}
