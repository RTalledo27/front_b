import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { PlayerOrdersFacade } from '../../data-access/player-orders.facade';
import { PlayerOrdersPage } from './player-orders-page';

function createFacadeMock() {
  return {
    load: vi.fn(),
    previousPage: vi.fn(),
    nextPage: vi.fn(),
    filter: signal(''),
    orders: signal([
      {
        id: '01977abc-0000-7000-8000-000000000201',
        reference: '01977abc-0000-7000-8000-000000000201',
        status: 'pending' as const,
        subtotalCents: 1000,
        totalCents: 1000,
        currency: 'PEN',
        expiresAt: '2026-06-25T12:00:00Z',
        paidAt: null,
        cancelledAt: null,
        expiredAt: null,
        createdAt: '2026-06-25T10:00:00Z',
        itemCount: 2,
        payment: null,
        validity: 'active' as const,
      },
    ]),
    pageInfo: signal({ currentPage: 1, lastPage: 1, perPage: 20, total: 1 }),
    status: signal<'loaded' | 'loading' | 'unauthorized' | 'forbidden' | 'networkError' | 'unexpectedError' | 'notFound' | 'empty'>('loaded'),
    error: signal<{ message: string } | null>(null),
    hasPreviousPage: signal(false),
    hasNextPage: signal(false),
  };
}

describe('PlayerOrdersPage', () => {
  it('shows the complete order identifier with user-facing context', async () => {
    const facade = createFacadeMock();

    await TestBed.configureTestingModule({
      imports: [PlayerOrdersPage],
      providers: [{ provide: ActivatedRoute, useValue: { snapshot: { paramMap: new Map() } } }],
    })
      .overrideComponent(PlayerOrdersPage, {
        set: { providers: [{ provide: PlayerOrdersFacade, useValue: facade }] },
      })
      .compileComponents();

    const fixture = TestBed.createComponent(PlayerOrdersPage);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Identificador de orden 01977abc-0000-7000-8000-000000000201');
    expect(text).not.toContain('Orden 01977ABC');
    expect(text).not.toContain('p. m..');
  });

  it('shows the login CTA when the backend requires authentication', async () => {
    const facade = createFacadeMock();
    facade.status.set('unauthorized');
    facade.error.set({ message: 'Inicia sesión para continuar.' });

    await TestBed.configureTestingModule({
      imports: [PlayerOrdersPage],
      providers: [{ provide: ActivatedRoute, useValue: { snapshot: { paramMap: new Map() } } }],
    })
      .overrideComponent(PlayerOrdersPage, {
        set: { providers: [{ provide: PlayerOrdersFacade, useValue: facade }] },
      })
      .compileComponents();

    const fixture = TestBed.createComponent(PlayerOrdersPage);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Necesitas iniciar sesión');
    expect(fixture.nativeElement.textContent).toContain('Ingresar');
  });
});
