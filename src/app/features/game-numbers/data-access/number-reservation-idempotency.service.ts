import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { AuthSessionService } from '../../../core/auth/services/auth-session.service';

interface ReservationAttemptKey {
  userId: number;
  gameId: string;
  fingerprint: string;
  key: string;
}

interface ReservationAttemptIdentity {
  userId: number;
  gameId: string;
  gameNumberIds: readonly string[];
}

@Injectable({ providedIn: 'root' })
export class NumberReservationIdempotencyService {
  private readonly session = inject(AuthSessionService);
  private readonly attempt = signal<ReservationAttemptKey | null>(null);
  private readonly currentUserId = computed(() => this.session.user()?.id ?? null);
  private lastUserId: number | null = null;

  constructor() {
    effect(() => {
      const userId = this.currentUserId();
      if (userId !== this.lastUserId) {
        this.lastUserId = userId;
        this.clear();
      }
    });
  }

  getOrCreate(identity: ReservationAttemptIdentity): string {
    const activeUserId = this.currentUserId();
    const fingerprint = createReservationFingerprint(identity);
    const currentAttempt = this.attempt();

    if (currentAttempt !== null && activeUserId !== currentAttempt.userId) {
      this.clear();
    }

    const current = this.attempt();

    if (
      current !== null &&
      current.userId === identity.userId &&
      current.gameId === identity.gameId &&
      current.fingerprint === fingerprint
    ) {
      return current.key;
    }

    const key = createReservationIdempotencyKey();
    this.attempt.set({
      userId: identity.userId,
      gameId: identity.gameId,
      fingerprint,
      key,
    });

    return key;
  }

  clear(): void {
    this.attempt.set(null);
  }
}

function createReservationFingerprint(identity: ReservationAttemptIdentity): string {
  const canonicalIds = [...new Set(identity.gameNumberIds)].sort((left, right) =>
    left.localeCompare(right),
  );

  return JSON.stringify({
    userId: identity.userId,
    gameId: identity.gameId,
    gameNumberIds: canonicalIds,
  });
}

function createReservationIdempotencyKey(): string {
  return `reserve-${safeUuid()}`;
}

function safeUuid(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  const bytes = new Uint8Array(16);
  globalThis.crypto?.getRandomValues?.(bytes);

  if (!bytes.some((byte) => byte !== 0)) {
    throw new Error('No cryptographic random source available for idempotency key generation.');
  }

  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0'));

  return [
    hex.slice(0, 4).join(''),
    hex.slice(4, 6).join(''),
    hex.slice(6, 8).join(''),
    hex.slice(8, 10).join(''),
    hex.slice(10, 16).join(''),
  ].join('-');
}
