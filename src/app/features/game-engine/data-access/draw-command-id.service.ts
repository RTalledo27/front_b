import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { AuthSessionService } from '../../../core/auth/services/auth-session.service';

interface DrawAttemptKey {
  userId: number;
  gameId: string;
  commandId: string;
}

interface DrawAttemptIdentity {
  userId: number;
  gameId: string;
}

@Injectable({ providedIn: 'root' })
export class DrawCommandIdService {
  private readonly session = inject(AuthSessionService);
  private readonly attempt = signal<DrawAttemptKey | null>(null);
  private readonly currentUser = computed(() => this.session.user());
  private lastSessionUser = this.currentUser();

  constructor() {
    effect(() => {
      this.syncSessionBoundary();
    });
  }

  getOrCreate(identity: DrawAttemptIdentity): string {
    this.syncSessionBoundary();

    const activeUserId = this.currentUser()?.id ?? null;
    const currentAttempt = this.attempt();

    if (currentAttempt !== null && currentAttempt.userId !== activeUserId) {
      this.clear();
    }

    const current = this.attempt();
    if (
      current !== null &&
      current.userId === identity.userId &&
      current.gameId === identity.gameId
    ) {
      return current.commandId;
    }

    const commandId = safeUuid();
    this.attempt.set({
      userId: identity.userId,
      gameId: identity.gameId,
      commandId,
    });

    return commandId;
  }

  clear(): void {
    this.attempt.set(null);
  }

  private syncSessionBoundary(): void {
    const user = this.currentUser();
    if (user !== this.lastSessionUser) {
      this.lastSessionUser = user;
      this.clear();
    }
  }
}

function safeUuid(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  const bytes = new Uint8Array(16);
  globalThis.crypto?.getRandomValues?.(bytes);

  if (!bytes.some((byte) => byte !== 0)) {
    throw new Error('No cryptographic random source available for draw command id generation.');
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
