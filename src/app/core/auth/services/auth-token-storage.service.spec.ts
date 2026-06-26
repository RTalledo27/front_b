import { TestBed } from '@angular/core/testing';
import { AuthTokenStorageService } from './auth-token-storage.service';

describe('AuthTokenStorageService', () => {
  let service: AuthTokenStorageService;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(AuthTokenStorageService);
  });

  afterEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('uses sessionStorage only', () => {
    service.write('bearer-token');

    expect(sessionStorage.getItem('stackflow.auth.access-token')).toBe('bearer-token');
    expect(localStorage.getItem('stackflow.auth.access-token')).toBeNull();
  });

  it('treats empty stored tokens as absent', () => {
    sessionStorage.setItem('stackflow.auth.access-token', '   ');

    expect(service.read()).toBeNull();
  });

  it('ignores storage failures gracefully', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    expect(() => service.write('bearer-token')).not.toThrow();
  });

  it('clears safely when storage access throws', () => {
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    expect(() => service.clear()).not.toThrow();
  });
});
