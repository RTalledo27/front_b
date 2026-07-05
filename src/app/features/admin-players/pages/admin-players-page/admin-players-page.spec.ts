import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AdminPlayersFacade } from '../../data-access/admin-players.facade';
import { AdminPlayersPage } from './admin-players-page';

describe('AdminPlayersPage', () => {
  async function renderPage() {
    const facade = {
      status: signal<
        | 'idle'
        | 'submitting'
        | 'success'
        | 'unauthorized'
        | 'forbidden'
        | 'validationError'
        | 'rateLimited'
        | 'networkError'
        | 'unexpectedError'
      >('idle'),
      result: signal<{
        outcome: 'invited' | 'reinvited' | 'already_registered';
        user: { id: number; name: string; email: string; role: 'admin' | 'player' };
        invitation: { id: string; expiresAt: string } | null;
        plainToken: string | null;
      } | null>(null),
      error: signal<{
        message: string;
        fieldErrors: Record<string, string[]>;
      } | null>(null),
      submit: vi.fn(),
      reset: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [AdminPlayersPage],
      providers: [provideRouter([])],
    })
      .overrideComponent(AdminPlayersPage, {
        set: {
          providers: [{ provide: AdminPlayersFacade, useValue: facade }],
        },
      })
      .compileComponents();

    const fixture = TestBed.createComponent(AdminPlayersPage);
    fixture.detectChanges();

    return { fixture, facade };
  }

  it('validates required fields before submit', async () => {
    const { fixture, facade } = await renderPage();

    fixture.componentInstance.submit();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Ingresa el nombre del jugador.');
    expect(fixture.nativeElement.textContent).toContain('Ingresa un correo válido.');
    expect(facade.submit).not.toHaveBeenCalled();
  });

  it('submits a trimmed and normalized payload', async () => {
    const { fixture, facade } = await renderPage();

    fixture.componentInstance.form.setValue({
      name: '  Alice  ',
      email: 'ALICE@EXAMPLE.COM',
    });

    fixture.componentInstance.submit();

    expect(facade.submit).toHaveBeenCalledWith({
      name: 'Alice',
      email: 'alice@example.com',
    });
  });

  it('renders the real backend result without inventing an email notification', async () => {
    const { fixture, facade } = await renderPage();
    facade.status.set('success');
    facade.result.set({
      outcome: 'invited',
      user: {
        id: 17,
        name: 'Alice',
        email: 'alice@example.com',
        role: 'player',
      },
      invitation: {
        id: '0197-player-invitation',
        expiresAt: '2026-07-12T12:00:00Z',
      },
      plainToken: 'plain-token-value',
    });
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Jugador invitado');
    expect(text).toContain('alice@example.com');
    expect(text).toContain('0197-player-invitation');
    expect(text).toContain('Token visible en este entorno');
    expect(text).not.toContain('Correo enviado');
  });

  it('shows the already_registered branch honestly', async () => {
    const { fixture, facade } = await renderPage();
    facade.status.set('success');
    facade.result.set({
      outcome: 'already_registered',
      user: {
        id: 3,
        name: 'Registered',
        email: 'registered@example.com',
        role: 'player',
      },
      invitation: null,
      plainToken: null,
    });
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Cuenta ya registrada');
    expect(text).toContain('Sin invitación nueva');
    expect(text).toContain('Token no expuesto');
  });

  it('renders backend error feedback and disables the submit button while sending', async () => {
    const { fixture, facade } = await renderPage();
    facade.status.set('submitting');
    facade.error.set({
      message: 'Too many authentication attempts.',
      fieldErrors: {},
    });
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button[type="submit"]');

    expect(button.disabled).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Too many authentication attempts.');
  });
});
