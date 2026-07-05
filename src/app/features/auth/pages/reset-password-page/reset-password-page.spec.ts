import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { ResetPasswordFacade } from '../../data-access/reset-password.facade';
import { ResetPasswordPage } from './reset-password-page';

describe('ResetPasswordPage', () => {
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
      imports: [ResetPasswordPage],
      providers: [
        provideRouter([]),
        { provide: ResetPasswordFacade, useValue: facade },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: new Map([
                ['token', 'plain-reset-token'],
                ['email', 'player@example.com'],
              ]),
            },
          },
        },
      ],
    }).compileComponents();
  });

  it('requires matching passwords before submit', () => {
    const fixture = TestBed.createComponent(ResetPasswordPage);
    fixture.componentInstance.form.setValue({
      email: 'player@example.com',
      password: 'secret123',
      password_confirmation: 'secret124',
    });

    fixture.componentInstance.submit();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Las contraseñas no coinciden.');
    expect(facade.submit).not.toHaveBeenCalled();
  });

  it('submits the signed reset payload from the route query params', () => {
    const fixture = TestBed.createComponent(ResetPasswordPage);
    fixture.componentInstance.form.setValue({
      email: 'player@example.com',
      password: 'secret123',
      password_confirmation: 'secret123',
    });

    fixture.componentInstance.submit();

    expect(facade.submit).toHaveBeenCalledWith({
      email: 'player@example.com',
      token: 'plain-reset-token',
      password: 'secret123',
      password_confirmation: 'secret123',
    });
  });
});
