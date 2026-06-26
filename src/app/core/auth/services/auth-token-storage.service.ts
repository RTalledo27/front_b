import { Injectable } from '@angular/core';

const STORAGE_KEY = 'stackflow.auth.access-token';

@Injectable({ providedIn: 'root' })
export class AuthTokenStorageService {
  read(): string | null {
    try {
      const value = this.storage()?.getItem(STORAGE_KEY) ?? null;
      return typeof value === 'string' && value.trim().length > 0 ? value : null;
    } catch {
      return null;
    }
  }

  write(token: string): void {
    const normalized = token.trim();

    if (normalized.length === 0) {
      this.clear();
      return;
    }

    try {
      this.storage()?.setItem(STORAGE_KEY, normalized);
    } catch {
      // Ignore storage failures and keep auth state in memory only.
    }
  }

  clear(): void {
    try {
      this.storage()?.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage failures and keep the app responsive.
    }
  }

  private storage(): Storage | null {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  }
}
