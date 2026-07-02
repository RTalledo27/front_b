import { Component, input, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, Subject } from 'rxjs';
import { AdminGameNumbersPanel } from '../../components/admin-game-numbers-panel/admin-game-numbers-panel';
import { AdminGameDetailFacade } from '../../data-access/admin-game-detail.facade';
import { AdminGameDetailPage } from './admin-game-detail-page';

@Component({
  selector: 'app-admin-game-numbers-panel',
  template: '<section data-testid="numbers-panel">Números administrativos</section>',
})
class AdminGameNumbersPanelStub {
  readonly gameId = input.required<string>();
}

function createFacadeMock() {
  return {
    load: vi.fn(),
    retry: vi.fn(),
    publish: vi.fn(),
    openSales: vi.fn(),
    closeSales: vi.fn(),
    schedule: vi.fn(),
    cancel: vi.fn(),
    clearActionFeedback: vi.fn(),
    game: signal({
      id: 'game-1',
      slug: 'bingo-fortuna',
      name: 'Bingo Fortuna',
      description: null,
      status: { value: 'draft', label: 'Borrador', tone: 'neutral', isKnown: true },
      numberRange: { min: 1, max: 90, hitsRequired: 5 },
      ticketPrice: { amountCents: 500, currency: 'PEN' },
      prize: { amountCents: 100000, currency: 'PEN' },
      schedule: {
        salesOpensAt: '2026-06-25T10:00:00Z',
        salesClosesAt: '2026-06-25T12:00:00Z',
        scheduledStartAt: '2026-06-25T13:00:00Z',
        drawIntervalSeconds: 30,
        autoDrawEnabled: true,
      },
      lifecycle: { startedAt: null, pausedAt: null, completedAt: null },
      engine: { nextDrawAt: null, lastConsumedTickAt: null },
      numbers: { total: 90, sold: 12, reserved: 5, available: 73 },
      settings: { visibility: 'strict' },
      latestDraw: null,
      winner: null,
      commerce: {
        reservations: { total: 5 },
        orders: {
          pending: 1,
          paymentSubmitted: 0,
          paid: 2,
          rejected: 0,
          expired: 0,
          cancelled: 0,
          refunded: 0,
        },
        payments: {
          pending: 0,
          underReview: 1,
          approved: 2,
          rejected: 0,
          cancelled: 0,
          refunded: 0,
        },
        entries: { confirmed: 2, cancelled: 0, refunded: 0, winner: 0 },
      },
      projection: {
        drawsTotal: 0,
        distinctDrawnNumbers: 0,
        maxCounterHits: 0,
        lastDrawnNumber: null,
      },
      createdBy: 2,
      createdAt: '2026-06-25T09:00:00Z',
    }),
    status: signal<
      'idle' | 'loading' | 'loaded' | 'unauthorized' | 'forbidden' | 'notFound' | 'networkError' | 'unexpectedError'
    >('loaded'),
    error: signal<{ message: string } | null>(null),
    publishState: signal({
      status: 'idle',
      errorMessage: null,
      fieldErrors: {},
      result: null,
      refreshState: 'idle',
      refreshMessage: null,
    }),
    openSalesState: signal({
      status: 'idle',
      errorMessage: null,
      fieldErrors: {},
      result: null,
      refreshState: 'idle',
      refreshMessage: null,
    }),
    closeSalesState: signal({
      status: 'idle',
      errorMessage: null,
      fieldErrors: {},
      result: null,
      refreshState: 'idle',
      refreshMessage: null,
    }),
    scheduleState: signal({
      status: 'idle',
      errorMessage: null,
      fieldErrors: {},
      result: null,
      refreshState: 'idle',
      refreshMessage: null,
    }),
    cancelState: signal({
      status: 'idle',
      errorMessage: null,
      fieldErrors: {},
      result: null,
      refreshState: 'idle',
      refreshMessage: null,
    }),
  };
}

describe('AdminGameDetailPage', () => {
  async function createComponent(
    facade = createFacadeMock(),
    params$?: Subject<ReturnType<typeof convertToParamMap>>,
  ) {
    const paramMap$ = params$ ?? of(convertToParamMap({ gameId: 'game-1' }));

    await TestBed.configureTestingModule({
      imports: [AdminGameDetailPage],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            queryParamMap: of(convertToParamMap({ page: '2', search: 'fortuna' })),
            paramMap: paramMap$,
          },
        },
      ],
    })
      .overrideComponent(AdminGameDetailPage, {
        remove: { imports: [AdminGameNumbersPanel] },
        add: { imports: [AdminGameNumbersPanelStub] },
      })
      .overrideComponent(AdminGameDetailPage, {
        set: { providers: [{ provide: AdminGameDetailFacade, useValue: facade }] },
      })
      .compileComponents();

    const fixture = TestBed.createComponent(AdminGameDetailPage);
    fixture.detectChanges();
    return { fixture, facade };
  }

  it('loads the game from the route param and renders read-only information', async () => {
    const { fixture, facade } = await createComponent();
    const text = fixture.nativeElement.textContent;
    const html = fixture.nativeElement as HTMLElement;

    expect(facade.load).toHaveBeenCalledWith('game-1');
    expect(text).toContain('Bingo Fortuna');
    expect(text).toContain('Capacidad actual');
    expect(text).toContain('Números administrativos');
    expect(text).toContain('Abrir consola del motor');
    expect(html.querySelector('a.button--secondary')?.getAttribute('href')).toContain(
      '/admin/bingos/game-1/motor',
    );
    expect(text).toContain('Publicar');
    expect(text).not.toContain('Abrir ventas');
  });

  it('shows the notFound state returned by the admin detail endpoint', async () => {
    const facade = createFacadeMock();
    facade.status.set('notFound');
    facade.error.set({ message: 'El recurso solicitado no está disponible.' });

    const { fixture } = await createComponent(facade);
    expect(fixture.nativeElement.textContent).toContain('El juego no está disponible');
  });

  it('reacts to a fast gameId change through the route stream', async () => {
    const paramMap$ = new Subject<ReturnType<typeof convertToParamMap>>();
    const facade = createFacadeMock();
    const { fixture } = await createComponent(facade, paramMap$);

    paramMap$.next(convertToParamMap({ gameId: 'game-2' }));
    fixture.detectChanges();

    expect(facade.load).toHaveBeenLastCalledWith('game-2');
  });

  it('shows lifecycle actions according to the current status and confirms publish', async () => {
    const { fixture, facade } = await createComponent();
    const publishButton = [...fixture.nativeElement.querySelectorAll('button')].find((button: HTMLButtonElement) =>
      button.textContent?.includes('Publicar'),
    ) as HTMLButtonElement;

    publishButton.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Confirmar publicación');

    const confirmButton = [...fixture.nativeElement.querySelectorAll('.confirmation-actions .button')].find(
      (button: HTMLButtonElement) => button.textContent?.includes('Confirmar publicación'),
    ) as HTMLButtonElement;
    confirmButton.click();

    expect(facade.publish).toHaveBeenCalledTimes(1);
  });

  it('shows the schedule form only for schedulable states', async () => {
    const facade = createFacadeMock();
    facade.game.set({
      ...facade.game(),
      status: { value: 'sales_open', label: 'Ventas abiertas', tone: 'success', isKnown: true },
    });

    const { fixture } = await createComponent(facade);
    const scheduleButton = [...fixture.nativeElement.querySelectorAll('button')].find((button: HTMLButtonElement) =>
      button.textContent?.includes('Programar'),
    ) as HTMLButtonElement;

    scheduleButton.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('input[formcontrolname="scheduledStartAt"]')).not.toBeNull();
  });
});
