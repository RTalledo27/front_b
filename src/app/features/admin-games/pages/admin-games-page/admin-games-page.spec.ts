import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { AdminGamesFacade } from '../../data-access/admin-games.facade';
import { AdminGamesPage } from './admin-games-page';

function createFacadeMock() {
  return {
    load: vi.fn(),
    games: signal([
      {
        id: 'game-1',
        slug: 'bingo-fortuna',
        name: 'Bingo Fortuna',
        description: null,
        status: { value: 'sales_open', label: 'Ventas abiertas', tone: 'success', isKnown: true },
        numberRange: { min: 1, max: 90, hitsRequired: 5 },
        ticketPrice: { amountCents: 500, currency: 'PEN' },
        prize: { amountCents: 100000, currency: 'PEN' },
        schedule: {
          salesOpensAt: '2026-06-25T10:00:00Z',
          salesClosesAt: '2026-06-25T12:00:00Z',
          scheduledStartAt: '2026-06-25T13:00:00Z',
          drawIntervalSeconds: 30,
          autoDrawEnabled: false,
        },
        lifecycle: { startedAt: null, pausedAt: null, completedAt: null },
        numbers: { total: 90, sold: 12, reserved: 5, available: 73 },
        ops: { drawsTotal: 0, ordersPending: 2, paymentsUnderReview: 1, entriesConfirmed: 10 },
        createdBy: null,
        createdAt: '2026-06-25T09:00:00Z',
      },
    ]),
    pageInfo: signal({
      currentPage: 2,
      from: 21,
      lastPage: 4,
      path: '/api/v1/admin/games',
      perPage: 20,
      to: 40,
      total: 80,
    }),
    status: signal<
      'idle' | 'loading' | 'refreshing' | 'loaded' | 'empty' | 'unauthorized' | 'forbidden' | 'validationError' | 'networkError' | 'unexpectedError'
    >('loaded'),
    error: signal<{ message: string; fieldErrors?: Record<string, string[]> } | null>(null),
    query: signal({
      page: 2,
      search: 'fortuna',
      status: 'sales_open',
      published: true,
      autoDrawEnabled: null,
      createdFrom: '2026-06-01',
      createdTo: null,
    }),
    hasPreviousPage: signal(true),
    hasNextPage: signal(true),
  };
}

describe('AdminGamesPage', () => {
  async function createComponent(facade = createFacadeMock()) {
    await TestBed.configureTestingModule({
      imports: [AdminGamesPage],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParamMap: convertToParamMap({ search: 'fortuna' }) },
            queryParamMap: of(
              convertToParamMap({
                page: '2',
                search: 'fortuna',
                status: 'sales_open',
                published: '1',
                created_from: '2026-06-01',
              }),
            ),
          },
        },
      ],
    })
      .overrideComponent(AdminGamesPage, {
        set: { providers: [{ provide: AdminGamesFacade, useValue: facade }] },
      })
      .compileComponents();

    const fixture = TestBed.createComponent(AdminGamesPage);
    fixture.detectChanges();
    return { fixture, facade };
  }

  it('loads from route query params and removes the old false contract-gap copy', async () => {
    const { fixture, facade } = await createComponent();
    const text = fixture.nativeElement.textContent;

    expect(facade.load).toHaveBeenCalledWith({
      page: 2,
      search: 'fortuna',
      status: 'sales_open',
      published: true,
      autoDrawEnabled: null,
      createdFrom: '2026-06-01',
      createdTo: null,
    });
    expect(text).not.toContain('Laravel todavía no expone un listado administrativo de juegos');
    expect(text).not.toContain('Usa el UUID devuelto al crear o conocido desde la API');
  });

  it('renders real results and the link to open the administrative detail', async () => {
    const { fixture } = await createComponent();
    const text = fixture.nativeElement.textContent;
    const detailLink = fixture.nativeElement.querySelector('.game-card__footer a') as HTMLAnchorElement | null;

    expect(text).toContain('Bingo Fortuna');
    expect(text).toContain('Ventas abiertas');
    expect(detailLink?.getAttribute('href')).toContain('/admin/bingos/game-1');
  });

  it('applies filters through route query params and resets page to 1', async () => {
    const { fixture } = await createComponent();
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    const searchInput = fixture.nativeElement.querySelector('input[type="search"]') as HTMLInputElement;
    searchInput.value = 'nuevo';
    searchInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const submitButton = [...fixture.nativeElement.querySelectorAll('button')].find((button: HTMLButtonElement) =>
      button.textContent?.includes('Aplicar filtros'),
    ) as HTMLButtonElement;
    submitButton.click();

    expect(navigateSpy).toHaveBeenCalledWith([], expect.objectContaining({
      queryParams: expect.objectContaining({ search: 'nuevo', status: 'sales_open', published: '1' }),
    }));
    expect(navigateSpy.mock.calls[0]?.[1]?.queryParams?.['page']).toBeUndefined();
  });

  it('clears filters through navigation and shows loading accessibly', async () => {
    const facade = createFacadeMock();
    facade.status.set('loading');
    const { fixture } = await createComponent(facade);
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    expect(fixture.nativeElement.querySelector('[aria-busy="true"]')).not.toBeNull();

    facade.status.set('loaded');
    fixture.detectChanges();

    const clearButton = [...fixture.nativeElement.querySelectorAll('button')].find((button: HTMLButtonElement) =>
      button.textContent?.includes('Limpiar filtros'),
    ) as HTMLButtonElement;
    clearButton.click();

    expect(navigateSpy).toHaveBeenCalledWith([], expect.objectContaining({ queryParams: {} }));
  });

  it('renders a dedicated validation state instead of a blank results area', async () => {
    const facade = createFacadeMock();
    facade.status.set('validationError');
    facade.error.set({ message: 'The selected status is invalid.' });

    const { fixture } = await createComponent(facade);
    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Corrige los filtros');
    expect(text).toContain('The selected status is invalid.');
    expect(text).not.toContain('Sin resultados');
  });
});
