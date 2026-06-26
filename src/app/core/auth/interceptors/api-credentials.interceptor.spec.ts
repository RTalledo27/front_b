import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../../api/api.config';
import { AuthTokenStorageService } from '../services/auth-token-storage.service';
import { apiCredentialsInterceptor } from './api-credentials.interceptor';

const apiBaseUrl = 'http://127.0.0.1:8000/api/v1';

describe('apiCredentialsInterceptor', () => {
  let client: HttpClient;
  let http: HttpTestingController;
  let storage: AuthTokenStorageService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiCredentialsInterceptor])),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: apiBaseUrl },
      ],
    });
    client = TestBed.inject(HttpClient);
    http = TestBed.inject(HttpTestingController);
    storage = TestBed.inject(AuthTokenStorageService);
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
    http.verify();
  });

  it('does not attach a bearer token to public catalog requests', () => {
    storage.write('bearer-token');
    client.get(`${apiBaseUrl}/public/games`).subscribe();
    const request = http.expectOne(`${apiBaseUrl}/public/games`);

    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({ data: [] });
  });

  it('attaches the bearer token to protected API requests', () => {
    storage.write('bearer-token');
    client.get(`${apiBaseUrl}/auth/me`).subscribe();
    const request = http.expectOne(`${apiBaseUrl}/auth/me`);

    expect(request.request.headers.get('Authorization')).toBe('Bearer bearer-token');
    request.flush({ data: {} });
  });

  it('does not attach the bearer token to anonymous auth endpoints', () => {
    storage.write('bearer-token');
    client.post(`${apiBaseUrl}/auth/login`, {}).subscribe();
    const request = http.expectOne(`${apiBaseUrl}/auth/login`);

    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({ data: {} });
  });

  it('does not overwrite an existing authorization header', () => {
    storage.write('bearer-token');
    client
      .get(`${apiBaseUrl}/auth/me`, {
        headers: { Authorization: 'Bearer upstream-token' },
      })
      .subscribe();
    const request = http.expectOne(`${apiBaseUrl}/auth/me`);

    expect(request.request.headers.get('Authorization')).toBe('Bearer upstream-token');
    request.flush({ data: {} });
  });

  it('does not attach the token to a lookalike external origin', () => {
    storage.write('bearer-token');
    client.get('http://127.0.0.1:8000.evil.com/api/v1/auth/me').subscribe();
    const request = http.expectOne('http://127.0.0.1:8000.evil.com/api/v1/auth/me');

    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({});
  });

  it('does not attach the token to protocol-relative external URLs', () => {
    storage.write('bearer-token');
    client.get('//evil.example/api/v1/auth/me').subscribe();
    const request = http.expectOne('//evil.example/api/v1/auth/me');

    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({});
  });

  it('supports the relative local API base URL safely', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiCredentialsInterceptor])),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: '/api/v1' },
      ],
    });

    client = TestBed.inject(HttpClient);
    http = TestBed.inject(HttpTestingController);
    storage = TestBed.inject(AuthTokenStorageService);
    storage.write('bearer-token');

    client.get('/api/v1/auth/me').subscribe();
    const request = http.expectOne('/api/v1/auth/me');

    expect(request.request.headers.get('Authorization')).toBe('Bearer bearer-token');
    request.flush({ data: {} });
  });

  it('does not attach the token to external URLs', () => {
    storage.write('bearer-token');
    client.get('https://example.com/api').subscribe();
    const request = http.expectOne('https://example.com/api');

    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({});
  });
});
