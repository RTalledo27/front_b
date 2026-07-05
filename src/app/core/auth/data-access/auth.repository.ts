import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../api/api.config';
import { LaravelDataResponse } from '../../api/models/api-response.models';
import {
  ActivateRequestPayload,
  AuthMessageResponseDto,
  AuthTokenApiDto,
  AuthUserApiDto,
  ForgotPasswordRequestPayload,
  LinkedSocialAccountApiDto,
  LoginRequestPayload,
  RegisterRequestPayload,
  ResetPasswordRequestPayload,
  SocialExchangeRequestPayload,
  SocialProvider,
  UnlinkSocialAccountRequestPayload,
  VerifyEmailRequestPayload,
  VerifyEmailResponseDto,
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

  forgotPassword(payload: ForgotPasswordRequestPayload): Observable<AuthMessageResponseDto> {
    return this.http.post<AuthMessageResponseDto>(`${this.apiBaseUrl}/auth/forgot-password`, payload);
  }

  resetPassword(payload: ResetPasswordRequestPayload): Observable<AuthMessageResponseDto> {
    return this.http.post<AuthMessageResponseDto>(`${this.apiBaseUrl}/auth/reset-password`, payload);
  }

  me(): Observable<LaravelDataResponse<AuthUserApiDto>> {
    return this.http.get<LaravelDataResponse<AuthUserApiDto>>(`${this.apiBaseUrl}/auth/me`);
  }

  resendVerificationEmail(): Observable<AuthMessageResponseDto> {
    return this.http.post<AuthMessageResponseDto>(
      `${this.apiBaseUrl}/auth/email/verification-notification`,
      {},
    );
  }

  verifyEmail(payload: VerifyEmailRequestPayload): Observable<VerifyEmailResponseDto> {
    const params = new URLSearchParams({
      expires: payload.expires,
      signature: payload.signature,
    });

    return this.http.post<VerifyEmailResponseDto>(
      `${this.apiBaseUrl}/auth/email/verify/${payload.id}/${payload.hash}?${params.toString()}`,
      {},
    );
  }

  socialExchange(
    payload: SocialExchangeRequestPayload,
  ): Observable<LaravelDataResponse<AuthTokenApiDto>> {
    return this.http.post<LaravelDataResponse<AuthTokenApiDto>>(
      `${this.apiBaseUrl}/auth/social/exchange`,
      payload,
    );
  }

  socialAccounts(): Observable<LaravelDataResponse<LinkedSocialAccountApiDto[]>> {
    return this.http.get<LaravelDataResponse<LinkedSocialAccountApiDto[]>>(
      `${this.apiBaseUrl}/auth/social-accounts`,
    );
  }

  unlinkSocialAccount(
    provider: SocialProvider,
    payload: UnlinkSocialAccountRequestPayload,
  ): Observable<{ message: string; provider: SocialProvider }> {
    return this.http.delete<{ message: string; provider: SocialProvider }>(
      `${this.apiBaseUrl}/auth/social/${provider}`,
      {
        body: payload,
      },
    );
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${this.apiBaseUrl}/auth/logout`, {});
  }
}
