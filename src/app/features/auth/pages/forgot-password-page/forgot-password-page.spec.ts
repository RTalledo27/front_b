import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ForgotPasswordPage } from './forgot-password-page';
import { ForgotPasswordFacade } from '../../data-access/forgot-password.facade';

describe('ForgotPasswordPage', () => {
  let facade: {
    status: ReturnType<typeof signal<'idle' | 'submitting' | 'success'>>;
    message: ReturnType<typeof signal<string | null>>;
    error: ReturnType<
      typeof signal<{ message: string; fieldErrors: Record<string, string[]> } | null>
    >;
    submit: ReturnType<typeof vi.fn>;
    reset: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    facade = {
      status: signal<'idle' | 'submitting' | 'success'>('idle'),
      message: signal<string | null>(null),
      error: signal<{ message: string; fieldErrors: Record<string, string[]> } | null>(null),
      submit: vi.fn(),
      reset: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [ForgotPasswordPage],
      providers: [provideRouter([]), { provide: ForgotPasswordFacade, useValue: facade }],
    }).compileComponents();
  });

  it('validates the email before submit', () => {
    const fixture = TestBed.createComponent(ForgotPasswordPage);
    fixture.componentInstance.submit();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Ingresa un correo válido.');
    expect(facade.submit).not.toHaveBeenCalled();
  });

  it('submits the canonical email payload', () => {
    const fixture = TestBed.createComponent(ForgotPasswordPage);
    fixture.componentInstance.form.setValue({ email: 'player@example.com' });

    fixture.componentInstance.submit();

    expect(facade.submit).toHaveBeenCalledWith('player@example.com');
  });
});
