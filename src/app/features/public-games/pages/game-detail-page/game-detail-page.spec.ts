import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { PublicGameDetailFacade } from '../../data-access/public-game-detail.facade';
import { GameDetailPage } from './game-detail-page';

function createFacadeMock() {
  return {
    load: vi.fn(),
    game: signal({
      id: '01977abc-0000-7000-8000-000000000001',
      slug: 'bingo-fortuna',
      name: 'Bingo Fortuna',
      description: null,
      status: 'sales_open' as const,
      numberMin: 1,
      numberMax: 90,
      hitsRequired: 15,
      ticketPrice: { amountCents: 500, currency: 'PEN' },
      prize: { amountCents: 100000, currency: 'PEN' },
      schedule: {
        salesOpensAt: null,
        salesClosesAt: null,
        scheduledStartAt: '2026-06-21T21:00:00Z',
        drawIntervalSeconds: 8,
      },
    }),
    status: signal<'idle' | 'loading' | 'success' | 'error'>('success'),
    error: signal<{ message: string } | null>(null),
  };
}

describe('GameDetailPage', () => {
  it('describes the selection flow as real and removes the old blocked-reservation copy', async () => {
    const facade = createFacadeMock();

    await TestBed.configureTestingModule({
      imports: [GameDetailPage],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: new Map([['slug', 'bingo-fortuna']]) } },
        },
      ],
    })
      .overrideComponent(GameDetailPage, {
        set: { providers: [{ provide: PublicGameDetailFacade, useValue: facade }] },
      })
      .compileComponents();

    const fixture = TestBed.createComponent(GameDetailPage);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('La reserva usa contratos reales, autenticación e idempotencia del backend.');
    expect(text).not.toContain('La reserva real permanecerá bloqueada');
    expect(text).not.toContain('vista previa');
  });
});
