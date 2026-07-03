import { ComponentRef, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AdminWinnerPayoutPanel } from './admin-winner-payout-panel';
import { AdminWinnerPayoutFacade } from '../../data-access/admin-commerce.facades';

describe('AdminWinnerPayoutPanel', () => {
  function createFacadeMock() {
    return {
      setContext: vi.fn(),
      loadPayout: vi.fn(),
      processPayout: vi.fn(),
      clearFeedback: vi.fn(),
      payout: signal(null),
      payoutStatus: signal<'idle' | 'loading' | 'loaded' | 'notFound' | 'networkError' | 'unexpectedError'>('idle'),
      payoutError: signal<{ message: string } | null>(null),
      commandState: signal({
        status: 'idle',
        errorMessage: null,
        errorCode: null,
        errorReason: null,
        fieldErrors: {},
        result: null,
        refreshState: 'idle',
        refreshMessage: null,
      }),
    };
  }

  async function createComponent() {
    const facade = createFacadeMock();

    await TestBed.configureTestingModule({
      imports: [AdminWinnerPayoutPanel],
    })
      .overrideComponent(AdminWinnerPayoutPanel, {
        set: { providers: [{ provide: AdminWinnerPayoutFacade, useValue: facade }] },
      })
      .compileComponents();

    const fixture = TestBed.createComponent(AdminWinnerPayoutPanel);
    const componentRef = fixture.componentRef as ComponentRef<AdminWinnerPayoutPanel>;
    componentRef.setInput('gameId', 'game-1');
    componentRef.setInput('gameStatus', 'completed');
    componentRef.setInput('prizeAmountCents', 50000);
    componentRef.setInput('currency', 'PEN');
    componentRef.setInput('winner', {
      userId: 25,
      gameNumberId: 'number-1',
      winningNumber: 8,
      gameDrawId: 'draw-1',
      winningDrawSequence: 7,
      winningHits: 5,
      wonAt: '2026-07-03T13:00:00Z',
    });
    fixture.detectChanges();

    return { fixture, facade, component: fixture.componentInstance };
  }

  it('shows the payout form only when the game is completed and has a winner', async () => {
    const { fixture } = await createComponent();
    expect(fixture.nativeElement.textContent).toContain('Confirmar payout');
    expect(fixture.nativeElement.textContent).toContain('Usuario ganador');
  });

  it('submits multipart payload requirements through the facade', async () => {
    const { fixture, facade, component } = await createComponent();
    const file = new File(['pdf'], 'comprobante.pdf', { type: 'application/pdf' });
    component.externalReference.setValue('OP-777');
    component.notes.setValue('Transferencia lista');
    component.document.set(file);
    component.submitPayout();

    expect(facade.processPayout).toHaveBeenCalledWith({
      externalReference: 'OP-777',
      notes: 'Transferencia lista',
      document: file,
    });
  });
});
