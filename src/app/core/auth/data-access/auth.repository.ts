import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../api/api.config';
import { LaravelDataResponse } from '../../api/models/api-response.models';
import {
  ActivateRequestPayload,
  AuthTokenApiDto,
  AuthUserApiDto,
  LoginRequestPayload,
  RegisterRequestPayload,
} from '../models/auth.models';

@Injectable({ providedIn: 'root' })
export class AuthRepository {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  login(payload: LoginRequestPayload): Observable<LaravelDataResponse<AuthTokenApiDto>> {
    return this.http.post<LaravelDataResponse<AuthTokenApiDto>>(
      `${this.apiBaseUrl}/auth/login`,
      payload,
    );
  }

  register(payload: RegisterRequestPayload): Observable<LaravelDataResponse<AuthTokenApiDto>> {
    return this.http.post<LaravelDataResponse<AuthTokenApiDto>>(
      `${this.apiBaseUrl}/auth/register`,
      payload,
    );
  }

  activate(payload: ActivateRequestPayload): Observable<LaravelDataResponse<AuthTokenApiDto>> {
    return this.http.post<LaravelDataResponse<AuthTokenApiDto>>(
      `${this.apiBaseUrl}/auth/activate`,
      payload,
    );
  }

  me(): Observable<LaravelDataResponse<AuthUserApiDto>> {
    return this.http.get<LaravelDataResponse<AuthUserApiDto>>(`${this.apiBaseUrl}/auth/me`);
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${this.apiBaseUrl}/auth/logout`, {});
  }
}
