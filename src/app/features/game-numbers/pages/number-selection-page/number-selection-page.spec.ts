import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { NumberSelectionFacade } from '../../data-access/number-selection.facade';
import { NumberSelectionPage } from './number-selection-page';

function createFacadeMock() {
  return {
    load: vi.fn(),
    toggle: vi.fn(),
    clearSelection: vi.fn(),
    submitReservation: vi.fn(),
    isSelected: vi.fn((key: string) => key === '01977abc-0000-7000-8000-000000000011'),
    game: signal({
      id: '01977abc-0000-7000-8000-000000000001',
      slug: 'bingo-fortuna',
      name: 'Bingo Fortuna',
      description: null,
      status: 'sales_open' as const,
      numberMin: 1,
      numberMax: 3,
      hitsRequired: 3,
      ticketPrice: { amountCents: 500, currency: 'PEN' },
      prize: { amountCents: 10000, currency: 'PEN' },
      schedule: {
        salesOpensAt: null,
        salesClosesAt: null,
        scheduledStartAt: null,
        drawIntervalSeconds: 10,
      },
    }),
    numbers: signal([
      {
        key: '01977abc-0000-7000-8000-000000000011',
        gameNumberId: '01977abc-0000-7000-8000-000000000011',
        number: 1,
        status: 'available' as const,
      },
      {
        key: '01977abc-0000-7000-8000-000000000012',
        gameNumberId: '01977abc-0000-7000-8000-000000000012',
        number: 2,
        status: 'reserved' as const,
      },
    ]),
    availableCount: signal(1),
    selectedNumbers: signal([
      {
        key: '01977abc-0000-7000-8000-000000000011',
        gameNumberId: '01977abc-0000-7000-8000-000000000011',
        number: 1,
        status: 'available' as const,
      },
    ]),
    selectedCount: signal(1),
    totalCents: signal(500),
    selectionEnabled: signal(true),
    canReserve: signal(true),
    isAuthenticated: signal(false),
    viewStatus: signal<'loaded' | 'loading' | 'refreshing' | 'networkError' | 'unexpectedError'>('loaded'),
    reservationStatus: signal<'idle' | 'submitting' | 'success' | 'conflict' | 'inProgress' | 'validationError' | 'forbidden' | 'networkError' | 'rateLimited'>('idle'),
    reservationResult: signal<null | {
      order: { id: string; expires_at: string };
    }>(null),
    liveMessage: signal<string | null>(null),
    viewError: signal<{ message: string } | null>(null),
  };
}

describe('NumberSelectionPage', () => {
  it('removes the old contract-gap message and uses the new CTA copy for anonymous users', async () => {
    const facade = createFacadeMock();

    await TestBed.configureTestingModule({
      imports: [NumberSelectionPage],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: new Map([['slug', 'bingo-fortuna']]) } } },
      ],
    })
      .overrideComponent(NumberSelectionPage, {
        set: { providers: [{ provide: NumberSelectionFacade, useValue: facade }] },
      })
      .compileComponents();

    const fixture = TestBed.createComponent(NumberSelectionPage);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('la API pública no expone los UUID exigidos');
    expect(fixture.nativeElement.textContent).toContain('Ingresar para reservar');
  });

  it('dispatches click and keyboard selection through the facade', async () => {
    const facade = createFacadeMock();

    await TestBed.configureTestingModule({
      imports: [NumberSelectionPage],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: new Map([['slug', 'bingo-fortuna']]) } } },
      ],
    })
      .overrideComponent(NumberSelectionPage, {
        set: { providers: [{ provide: NumberSelectionFacade, useValue: facade }] },
      })
      .compileComponents();

    const fixture = TestBed.createComponent(NumberSelectionPage);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('.number');
    button.click();
    button.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(facade.toggle).toHaveBeenCalledTimes(2);
  });

  it('shows aria-live feedback and the order link after a successful reservation', async () => {
    const facade = createFacadeMock();
    facade.isAuthenticated.set(true);
    facade.reservationStatus.set('success');
    facade.liveMessage.set('La reserva se creó correctamente.');
    facade.reservationResult.set({
      order: {
        id: '01977abc-0000-7000-8000-000000000101',
        expires_at: '2026-06-25T12:00:00Z',
      },
    });

    await TestBed.configureTestingModule({
      imports: [NumberSelectionPage],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: new Map([['slug', 'bingo-fortuna']]) } } },
      ],
    })
      .overrideComponent(NumberSelectionPage, {
        set: { providers: [{ provide: NumberSelectionFacade, useValue: facade }] },
      })
      .compileComponents();

    const fixture = TestBed.createComponent(NumberSelectionPage);
    fixture.detectChanges();

    const feedback = fixture.nativeElement.querySelector('.feedback');
    expect(feedback.getAttribute('aria-live')).toBe('polite');
    expect(fixture.nativeElement.textContent).toContain('Ver detalle de orden');
  });

  it('does not show the order detail link when the reservation response lacks a usable order id', async () => {
    const facade = createFacadeMock();
    facade.isAuthenticated.set(true);
    facade.reservationStatus.set('success');
    facade.liveMessage.set('La reserva se creó correctamente.');
    facade.reservationResult.set({
      order: {
        id: '   ',
        expires_at: '2026-06-25T12:00:00Z',
      },
    });

    await TestBed.configureTestingModule({
      imports: [NumberSelectionPage],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: new Map([['slug', 'bingo-fortuna']]) } } },
      ],
    })
      .overrideComponent(NumberSelectionPage, {
        set: { providers: [{ provide: NumberSelectionFacade, useValue: facade }] },
      })
      .compileComponents();

    const fixture = TestBed.createComponent(NumberSelectionPage);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('Ver detalle de orden');
  });

  it('disables the CTA while a reservation is submitting', async () => {
    const facade = createFacadeMock();
    facade.isAuthenticated.set(true);
    facade.canReserve.set(false);
    facade.reservationStatus.set('submitting');

    await TestBed.configureTestingModule({
      imports: [NumberSelectionPage],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: new Map([['slug', 'bingo-fortuna']]) } } },
      ],
    })
      .overrideComponent(NumberSelectionPage, {
        set: { providers: [{ provide: NumberSelectionFacade, useValue: facade }] },
      })
      .compileComponents();

    const fixture = TestBed.createComponent(NumberSelectionPage);
    fixture.detectChanges();

    const cta = fixture.nativeElement.querySelector('.summary .button');
    expect(cta.disabled).toBe(true);
    expect(cta.getAttribute('aria-busy')).toBe('true');
    expect(fixture.nativeElement.textContent).toContain('Reservando');
  });
});
