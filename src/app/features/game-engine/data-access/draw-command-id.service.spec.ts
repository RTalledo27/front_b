import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthSessionService } from '../../../core/auth/services/auth-session.service';
import { DrawCommandIdService } from './draw-command-id.service';

describe('DrawCommandIdService', () => {
  function setup() {
    const user = signal<{ id: number } | null>({ id: 7 });

    TestBed.configureTestingModule({
      providers: [
        DrawCommandIdService,
        { provide: AuthSessionService, useValue: { user } },
      ],
    });

    return {
      service: TestBed.inject(DrawCommandIdService),
      user,
    };
  }

  it('reuses the same command id for retries of the same user and game', () => {
    const { service } = setup();

    const first = service.getOrCreate({ userId: 7, gameId: 'game-1' });
    const second = service.getOrCreate({ userId: 7, gameId: 'game-1' });

    expect(second).toBe(first);
  });

  it('creates a new command id for a different game', () => {
    const { service } = setup();

    const first = service.getOrCreate({ userId: 7, gameId: 'game-1' });
    const second = service.getOrCreate({ userId: 7, gameId: 'game-2' });

    expect(second).not.toBe(first);
  });

  it('clears the attempt explicitly', () => {
    const { service } = setup();

    const first = service.getOrCreate({ userId: 7, gameId: 'game-1' });
    service.clear();
    const second = service.getOrCreate({ userId: 7, gameId: 'game-1' });

    expect(second).not.toBe(first);
  });

  it('clears the attempt when the authenticated user changes', () => {
    const { service, user } = setup();

    const first = service.getOrCreate({ userId: 7, gameId: 'game-1' });
    user.set({ id: 8 });
    const second = service.getOrCreate({ userId: 8, gameId: 'game-1' });

    expect(second).not.toBe(first);
  });

  it('clears the attempt when the session becomes anonymous', () => {
    const { service, user } = setup();

    const first = service.getOrCreate({ userId: 7, gameId: 'game-1' });
    user.set(null);
    user.set({ id: 7 });
    const second = service.getOrCreate({ userId: 7, gameId: 'game-1' });

    expect(second).not.toBe(first);
  });

  it('returns a UUID command id', () => {
    const { service } = setup();

    const commandId = service.getOrCreate({ userId: 7, gameId: 'game-1' });

    expect(commandId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });
});
