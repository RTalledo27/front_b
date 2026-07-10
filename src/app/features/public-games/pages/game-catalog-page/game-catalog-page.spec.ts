import '@angular/compiler';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import { PublicGamesFacade } from '../../data-access/public-games.facade';
import { GameCatalogPage } from './game-catalog-page';

function createFacadeMock() {
  return {
    load: vi.fn(),
    previousPage: vi.fn(),
    nextPage: vi.fn(),
    games: signal([
      {
        id: 'game-1',
        slug: 'bingo-fortuna',
        name: 'Bingo Fortuna',
        description: 'Premio real publicado desde Laravel.',
        status: 'sales_open' as const,
        numberMin: 1,
        numberMax: 90,
        hitsRequired: 15,
        ticketPrice: { amountCents: 500, currency: 'PEN' },
        prize: { amountCents: 100_000, currency: 'PEN' },
        schedule: {
          salesOpensAt: null,
          salesClosesAt: null,
          scheduledStartAt: '2026-07-05T21:00:00Z',
          drawIntervalSeconds: 8,
        },
      },
    ]),
    pageInfo: signal({
      currentPage: 1,
      lastPage: 1,
      perPage: 20,
      total: 1,
    }),
    status: signal<'idle' | 'loading' | 'success' | 'empty' | 'error'>('success'),
    error: signal<{ message: string } | null>(null),
    hasPreviousPage: signal(false),
    hasNextPage: signal(false),
  };
}

describe('GameCatalogPage', () => {
  async function renderPage(facade = createFacadeMock()) {
    await TestBed.configureTestingModule({
      imports: [GameCatalogPage],
      providers: [provideRouter([])],
    })
      .overrideComponent(GameCatalogPage, {
        set: {
          providers: [{ provide: PublicGamesFacade, useValue: facade }],
        },
      })
      .compileComponents();

    const fixture = TestBed.createComponent(GameCatalogPage);
    fixture.detectChanges();
    return { fixture, facade };
  }

  it('renders published games when the backend page is not empty', async () => {
    const { fixture, facade } = await renderPage();
    const text = fixture.nativeElement.textContent;

    expect(facade.load).toHaveBeenCalledTimes(1);
    expect(text).toContain('1 opciones encontradas');
    expect(text).toContain('Bingo Fortuna');
    expect(text).toContain('Premio real publicado desde Laravel.');
    expect(text).not.toContain('Aún no hay juegos publicados');
  });

  it('shows the empty state only when the backend page is actually empty', async () => {
    const facade = createFacadeMock();
    facade.games.set([]);
    facade.pageInfo.set({
      currentPage: 1,
      lastPage: 1,
      perPage: 20,
      total: 0,
    });
    facade.status.set('empty');

    const { fixture } = await renderPage(facade);
    const text = fixture.nativeElement.textContent;

    expect(text).toContain('0 opciones encontradas');
    expect(text).toContain('Aún no hay juegos publicados');
    expect(text).not.toContain('Bingo Fortuna');
  });
  it('keeps the summary honest while the catalog request is still loading', async () => {
    const facade = createFacadeMock();
    facade.games.set([]);
    facade.pageInfo.set({
      currentPage: 1,
      lastPage: 1,
      perPage: 20,
      total: 0,
    });
    facade.status.set('loading');

    const { fixture } = await renderPage(facade);
    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Consultando el catálogo real de Laravel');
    expect(text).not.toContain('0 opciones encontradas');
  });
});
