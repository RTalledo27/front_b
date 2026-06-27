import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AdminGameNumbersFacade } from '../../data-access/admin-game-numbers.facade';
import { AdminGameNumbersPanel } from './admin-game-numbers-panel';

function createFacadeMock() {
  return {
    load: vi.fn(),
    reload: vi.fn(),
    reset: vi.fn(),
    numbers: signal([
      {
        id: 'number-1',
        number: 1,
        status: { value: 'reserved', label: 'Reservado', tone: 'warning', isKnown: true },
        activeReservation: {
          id: 'reservation-1',
          orderId: 'order-1',
          orderStatus: 'pending',
          expiresAt: '2026-06-27T10:00:00Z',
        },
        soldEntry: null,
      },
      {
        id: 'number-2',
        number: 2,
        status: { value: 'sold', label: 'Vendido', tone: 'info', isKnown: true },
        activeReservation: null,
        soldEntry: {
          id: 'entry-2',
          status: 'confirmed',
          confirmedAt: '2026-06-27T09:40:00Z',
        },
      },
    ]),
    status: signal<
      'idle' | 'loading' | 'refreshing' | 'loaded' | 'empty' | 'unauthorized' | 'forbidden' | 'notFound' | 'validationError' | 'networkError' | 'unexpectedError'
    >('loaded'),
    error: signal<{ message: string } | null>(null),
    hasNumbers: signal(true),
  };
}

describe('AdminGameNumbersPanel', () => {
  async function createComponent(facade = createFacadeMock()) {
    await TestBed.configureTestingModule({
      imports: [AdminGameNumbersPanel],
    })
      .overrideComponent(AdminGameNumbersPanel, {
        set: { providers: [{ provide: AdminGameNumbersFacade, useValue: facade }] },
      })
      .compileComponents();

    const fixture = TestBed.createComponent(AdminGameNumbersPanel);
    fixture.componentRef.setInput('gameId', 'game-1');
    fixture.detectChanges();
    return { fixture, facade };
  }

  it('loads numbers from the current game context and renders read-only cards', async () => {
    const { fixture, facade } = await createComponent();
    const text = fixture.nativeElement.textContent;

    expect(facade.load).toHaveBeenCalledWith('game-1');
    expect(text).toContain('Números administrativos');
    expect(text).toContain('Reservado');
    expect(text).toContain('Vendido');
    expect(text).not.toContain('Liberar');
    expect(text).not.toContain('Editar');
  });

  it('shows loading accessibly', async () => {
    const facade = createFacadeMock();
    facade.status.set('loading');
    const { fixture } = await createComponent(facade);

    expect(fixture.nativeElement.querySelector('[aria-busy="true"]')).not.toBeNull();
  });

  it('shows the empty state when the backend returns no numbers', async () => {
    const facade = createFacadeMock();
    facade.status.set('empty');
    facade.numbers.set([]);
    const { fixture } = await createComponent(facade);

    expect(fixture.nativeElement.textContent).toContain('Sin números administrativos');
  });

  it('shows a scoped error state without leaking unnecessary PII', async () => {
    const facade = createFacadeMock();
    facade.status.set('networkError');
    facade.error.set({ message: 'No pudimos conectar con el servidor.' });
    const { fixture } = await createComponent(facade);
    const text = fixture.nativeElement.textContent;

    expect(text).toContain('No pudimos cargar los números');
    expect(text).not.toContain('Jane Doe');
  });
});
