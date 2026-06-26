import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthSessionService } from '../../../core/auth/services/auth-session.service';
import { PaymentEvidenceIdempotencyService } from './payment-evidence-idempotency.service';

class MockAuthSessionService {
  readonly currentUser = signal<null | { id: number }>(null);
  readonly isAuthenticated = computed(() => this.currentUser() !== null);

  user() {
    return this.currentUser();
  }
}

describe('PaymentEvidenceIdempotencyService', () => {
  function configureService() {
    const session = new MockAuthSessionService();

    TestBed.configureTestingModule({
      providers: [
        PaymentEvidenceIdempotencyService,
        { provide: AuthSessionService, useValue: session },
      ],
    });

    return {
      service: TestBed.inject(PaymentEvidenceIdempotencyService),
      session,
    };
  }

  it('reuses the same key for the same user, order and logical file fingerprint', () => {
    const { service, session } = configureService();
    session.currentUser.set({ id: 77 });

    const firstKey = service.getOrCreate({
      userId: 77,
      orderId: 'order-1',
      fingerprint: 'file-a',
    });
    const secondKey = service.getOrCreate({
      userId: 77,
      orderId: 'order-1',
      fingerprint: 'file-a',
    });

    expect(firstKey).toBe(secondKey);
  });

  it('creates a new key when the file fingerprint or order changes', () => {
    const { service, session } = configureService();
    session.currentUser.set({ id: 77 });

    const baseKey = service.getOrCreate({
      userId: 77,
      orderId: 'order-1',
      fingerprint: 'file-a',
    });
    const differentFileKey = service.getOrCreate({
      userId: 77,
      orderId: 'order-1',
      fingerprint: 'file-b',
    });
    const differentOrderKey = service.getOrCreate({
      userId: 77,
      orderId: 'order-2',
      fingerprint: 'file-b',
    });

    expect(differentFileKey).not.toBe(baseKey);
    expect(differentOrderKey).not.toBe(differentFileKey);
  });

  it('clears the pending attempt when the authenticated user changes or logs out', async () => {
    const { service, session } = configureService();
    session.currentUser.set({ id: 77 });

    const firstKey = service.getOrCreate({
      userId: 77,
      orderId: 'order-1',
      fingerprint: 'file-a',
    });

    session.currentUser.set({ id: 99 });
    await waitForEffects();
    const secondKey = service.getOrCreate({
      userId: 99,
      orderId: 'order-1',
      fingerprint: 'file-a',
    });

    session.currentUser.set(null);
    await waitForEffects();
    session.currentUser.set({ id: 99 });
    await waitForEffects();
    const thirdKey = service.getOrCreate({
      userId: 99,
      orderId: 'order-1',
      fingerprint: 'file-a',
    });

    expect(secondKey).not.toBe(firstKey);
    expect(thirdKey).not.toBe(secondKey);
  });

  it('can be cleared explicitly after a successful or definitive failed attempt', () => {
    const { service, session } = configureService();
    session.currentUser.set({ id: 77 });

    const firstKey = service.getOrCreate({
      userId: 77,
      orderId: 'order-1',
      fingerprint: 'file-a',
    });

    service.clear();

    const secondKey = service.getOrCreate({
      userId: 77,
      orderId: 'order-1',
      fingerprint: 'file-a',
    });

    expect(secondKey).not.toBe(firstKey);
  });
});

async function waitForEffects(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}
