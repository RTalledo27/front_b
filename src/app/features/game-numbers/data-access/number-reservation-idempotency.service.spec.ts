import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthSessionService } from '../../../core/auth/services/auth-session.service';
import { NumberReservationIdempotencyService } from './number-reservation-idempotency.service';

class MockAuthSessionService {
  readonly currentUser = signal<null | { id: number }>(null);
  readonly isAuthenticated = computed(() => this.currentUser() !== null);
  user() {
    return this.currentUser();
  }
}

describe('NumberReservationIdempotencyService', () => {
  function createService() {
    const session = new MockAuthSessionService();
    TestBed.configureTestingModule({
      providers: [
        NumberReservationIdempotencyService,
        { provide: AuthSessionService, useValue: session },
      ],
    });

    return {
      service: TestBed.inject(NumberReservationIdempotencyService),
      session,
    };
  }

  it('reuses the same key for the same logical attempt', () => {
    const { service, session } = createService();
    session.currentUser.set({ id: 7 });

    const first = service.getOrCreate({
      userId: 7,
      gameId: 'game-1',
      gameNumberIds: ['c', 'a', 'b'],
    });
    const second = service.getOrCreate({
      userId: 7,
      gameId: 'game-1',
      gameNumberIds: ['b', 'c', 'a'],
    });

    expect(second).toBe(first);
  });

  it('treats duplicate UUIDs as the same logical set', () => {
    const { service, session } = createService();
    session.currentUser.set({ id: 7 });

    const first = service.getOrCreate({
      userId: 7,
      gameId: 'game-1',
      gameNumberIds: ['c', 'a', 'b'],
    });
    const second = service.getOrCreate({
      userId: 7,
      gameId: 'game-1',
      gameNumberIds: ['b', 'c', 'a', 'a'],
    });

    expect(second).toBe(first);
  });

  it('creates a new key for a different selection or game', () => {
    const { service, session } = createService();
    session.currentUser.set({ id: 7 });

    const first = service.getOrCreate({
      userId: 7,
      gameId: 'game-1',
      gameNumberIds: ['a'],
    });
    const second = service.getOrCreate({
      userId: 7,
      gameId: 'game-1',
      gameNumberIds: ['a', 'b'],
    });
    const third = service.getOrCreate({
      userId: 7,
      gameId: 'game-2',
      gameNumberIds: ['a', 'b'],
    });

    expect(second).not.toBe(first);
    expect(third).not.toBe(second);
  });

  it('clears the pending attempt when the authenticated user changes or logs out', () => {
    const { service, session } = createService();
    session.currentUser.set({ id: 7 });

    const first = service.getOrCreate({
      userId: 7,
      gameId: 'game-1',
      gameNumberIds: ['a'],
    });

    session.currentUser.set({ id: 9 });
    const second = service.getOrCreate({
      userId: 9,
      gameId: 'game-1',
      gameNumberIds: ['a'],
    });

    session.currentUser.set(null);
    const third = service.getOrCreate({
      userId: 9,
      gameId: 'game-1',
      gameNumberIds: ['a'],
    });

    expect(second).not.toBe(first);
    expect(third).not.toBe(second);
  });
});
