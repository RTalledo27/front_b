import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { PlayerOrderDetailFacade } from '../../data-access/player-order-detail.facade';
import { PlayerOrderDetailView } from '../../models/player-commerce-view.models';
import { PlayerOrderDetailPage } from './player-order-detail-page';

function createFacadeMock() {
  const order: PlayerOrderDetailView = {
    id: 'order-1',
    reference: 'order-1',
    status: 'pending',
    subtotalCents: 500,
    totalCents: 500,
    currency: 'PEN',
    expiresAt: '2026-06-25T12:00:00Z',
    paidAt: null,
    cancelledAt: null,
    expiredAt: null,
    createdAt: null,
    game: { id: 'game-1', slug: 'bingo-fortuna', name: 'Bingo Fortuna' },
    items: [
      {
        id: 'item-1',
        gameNumberId: 'gn-1',
        unitPriceCents: 500,
        number: 4,
        numberStatus: 'reserved',
      },
    ],
    reservedNumbers: [4],
    payment: {
      id: 'payment-1',
      status: 'pending',
      amountCents: 500,
      currency: 'PEN',
      submittedAt: null,
      reviewedAt: null,
      rejectionReason: null,
    },
    validity: 'active',
    nextAction: 'Si ya pagaste, envia una sola evidencia antes del vencimiento para que el equipo la revise.',
  };

  return {
    load: vi.fn(),
    retryLoad: vi.fn(),
    submitEvidence: vi.fn(),
    clearSelectedEvidence: vi.fn(),
    selectEvidence: vi.fn(),
    canUploadEvidence: signal(true),
    isEvidenceBusy: signal(false),
    selectedEvidence: signal<null | { file: File; fingerprint: string; sizeBytes: number; mimeType: string }>(null),
    evidenceStatus: signal<
      | 'idle'
      | 'validating'
      | 'ready'
      | 'submitting'
      | 'inProgress'
      | 'success'
      | 'validationError'
      | 'evidenceRejected'
      | 'idempotencyConflict'
      | 'unauthorized'
      | 'forbidden'
      | 'networkError'
      | 'unexpectedError'
    >('idle'),
    evidenceError: signal<{ message: string } | null>(null),
    submittedEvidence: signal<null | { submittedAt: string; document: { originalFilename: string } }>({
      submittedAt: '2026-06-26T10:00:00Z',
      document: { originalFilename: 'evidence.pdf' },
    }),
    order: signal(order),
    status: signal<
      'loaded' | 'loading' | 'unauthorized' | 'forbidden' | 'networkError' | 'unexpectedError' | 'notFound'
    >('loaded'),
    error: signal<{ message: string } | null>(null),
  };
}

describe('PlayerOrderDetailPage', () => {
  async function createComponent(facade = createFacadeMock(), orderId = 'order-1') {
    await TestBed.configureTestingModule({
      imports: [PlayerOrderDetailPage],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: new Map([['orderId', orderId]]) } },
        },
      ],
    })
      .overrideComponent(PlayerOrderDetailPage, {
        set: { providers: [{ provide: PlayerOrderDetailFacade, useValue: facade }] },
      })
      .compileComponents();

    const fixture = TestBed.createComponent(PlayerOrderDetailPage);
    fixture.detectChanges();
    return { fixture, facade };
  }

  it('renders the payment evidence form only for pending orders with a pending payment', async () => {
    const { fixture } = await createComponent();
    const text = fixture.nativeElement.textContent;
    const fileInput = fixture.nativeElement.querySelector('input[type="file"]') as HTMLInputElement | null;

    expect(text).toContain('Carga de evidencia');
    expect(text).toContain('Enviar evidencia');
    expect(fileInput?.getAttribute('accept')).toContain('application/pdf');
    expect(fileInput?.getAttribute('aria-describedby')).toContain('payment-evidence-help');
    expect(fileInput?.getAttribute('aria-invalid')).toBe('false');
  });

  it('shows the review message instead of upload actions once the evidence is already under review', async () => {
    const facade = createFacadeMock();
    facade.canUploadEvidence.set(false);
    facade.order.set({
      ...facade.order(),
      status: 'payment_submitted',
      payment: {
        ...facade.order().payment!,
        status: 'under_review',
        submittedAt: '2026-06-26T10:00:00Z',
      },
    });

    const { fixture } = await createComponent(facade);
    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Pago en revision');
    expect(text).not.toContain('Quitar archivo');
    expect(text).not.toContain('Descargar');
    expect(text).not.toContain('Reemplazar');
  });

  it('disables the upload controls while the submit is in progress', async () => {
    const facade = createFacadeMock();
    facade.isEvidenceBusy.set(true);
    facade.evidenceStatus.set('submitting');
    facade.selectedEvidence.set({
      file: new File(['proof'], 'proof.pdf', { type: 'application/pdf' }),
      fingerprint: 'proof',
      sizeBytes: 100,
      mimeType: 'application/pdf',
    });

    const { fixture } = await createComponent(facade);
    const buttons = [...fixture.nativeElement.querySelectorAll('button')] as HTMLButtonElement[];
    const button = buttons.find((candidate) => candidate.textContent?.includes('Enviando evidencia...')) ?? null;
    const input = fixture.nativeElement.querySelector('input[type="file"]') as HTMLInputElement | null;

    expect(button?.textContent).toContain('Enviando evidencia...');
    expect(button?.disabled).toBe(true);
    expect(input?.disabled).toBe(true);
  });

  it('announces success and retry-safe in-progress feedback through the live region', async () => {
    const facade = createFacadeMock();
    facade.evidenceStatus.set('inProgress');

    let rendered = await createComponent(facade);
    expect(rendered.fixture.nativeElement.textContent).toContain('aun esta en proceso');

    facade.evidenceStatus.set('success');
    rendered.fixture.detectChanges();

    expect(rendered.fixture.nativeElement.textContent).toContain('Evidencia enviada');
  });

  it('marks the input as invalid and links the inline error when evidence validation fails', async () => {
    const facade = createFacadeMock();
    facade.evidenceStatus.set('validationError');
    facade.evidenceError.set({ message: 'Solo se permiten archivos JPG, PNG, WEBP o PDF.' });

    const { fixture } = await createComponent(facade);
    const fileInput = fixture.nativeElement.querySelector('input[type="file"]') as HTMLInputElement | null;

    expect(fileInput?.getAttribute('aria-invalid')).toBe('true');
    expect(fileInput?.getAttribute('aria-describedby')).toContain('payment-evidence-error');
    expect(fixture.nativeElement.textContent).toContain('Solo se permiten archivos');
  });

  it('hides the upload form after a local success acknowledgement even before the refreshed order arrives', async () => {
    const facade = createFacadeMock();
    facade.canUploadEvidence.set(false);
    facade.evidenceStatus.set('success');

    const { fixture } = await createComponent(facade);
    const text = fixture.nativeElement.textContent;

    expect(text).not.toContain('Seleccionar evidencia');
    expect(text).not.toContain('Enviar evidencia');
  });

  it('shows the notFound state returned by the player-safe detail endpoint', async () => {
    const facade = createFacadeMock();
    facade.status.set('notFound');
    facade.error.set({ message: 'El recurso solicitado no esta disponible.' });

    const { fixture } = await createComponent(facade, 'missing-order');
    expect(fixture.nativeElement.textContent).toContain('La orden no esta disponible');
  });
});
