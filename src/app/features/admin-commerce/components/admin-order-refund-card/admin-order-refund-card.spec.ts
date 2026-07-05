import { ComponentRef, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AdminOrderRefundCard } from './admin-order-refund-card';
import { AdminOrderRefundFacade } from '../../data-access/admin-commerce.facades';

describe('AdminOrderRefundCard', () => {
  function createFacadeMock() {
    return {
      setContext: vi.fn(),
      loadRefund: vi.fn(),
      refundOrder: vi.fn(),
      clearFeedback: vi.fn(),
      refund: signal(null),
      refundStatus: signal<'idle' | 'loading' | 'loaded' | 'notFound' | 'networkError' | 'unexpectedError'>('idle'),
      refundError: signal<{ message: string } | null>(null),
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
      imports: [AdminOrderRefundCard],
    })
      .overrideComponent(AdminOrderRefundCard, {
        set: { providers: [{ provide: AdminOrderRefundFacade, useValue: facade }] },
      })
      .compileComponents();

    const fixture = TestBed.createComponent(AdminOrderRefundCard);
    const componentRef = fixture.componentRef as ComponentRef<AdminOrderRefundCard>;
    componentRef.setInput('orderId', 'order-1');
    componentRef.setInput('orderStatus', 'paid');
    componentRef.setInput('paymentStatus', 'approved');
    componentRef.setInput('amountCents', 5000);
    componentRef.setInput('currency', 'PEN');
    fixture.detectChanges();

    return { fixture, facade, componentRef, component: fixture.componentInstance };
  }

  it('shows the refund action only when the order can be refunded', async () => {
    const { fixture, componentRef } = await createComponent();
    expect(fixture.nativeElement.textContent).toContain('Reembolsar orden');

    componentRef.setInput('orderStatus', 'cancelled');
    componentRef.setInput('paymentStatus', 'rejected');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('Reembolsar orden');
  });

  it('opens the confirmation panel and submits the reason', async () => {
    const { fixture, facade, component } = await createComponent();
    const openButton = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    openButton.click();
    fixture.detectChanges();

    component.reason.setValue('Refund total por cierre definitivo.');
    component.submitRefund();

    expect(facade.refundOrder).toHaveBeenCalledWith({ reason: 'Refund total por cierre definitivo.' });
  });

  it('prevents native form submission when confirming a refund', async () => {
    const { fixture, facade } = await createComponent();
    const buttons = fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>;
    buttons[0]?.click();
    fixture.detectChanges();

    const textarea = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    textarea.value = 'Smoke refund desde submit DOM.';
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const form = fixture.nativeElement.querySelector('form.refund-form') as HTMLFormElement;
    const event = new Event('submit', { bubbles: true, cancelable: true });
    form.dispatchEvent(event);
    fixture.detectChanges();

    expect(event.defaultPrevented).toBe(true);
    expect(facade.refundOrder).toHaveBeenCalledWith({ reason: 'Smoke refund desde submit DOM.' });
  });
});
