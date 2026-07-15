import { HttpErrorResponse } from '@angular/common/http';
import { toApiError } from './api-error.models';

describe('toApiError', () => {
  it('preserves Laravel message, reason and valid field errors while ignoring additive fields', () => {
    const result = toApiError(
      new HttpErrorResponse({
        status: 422,
        error: {
          error: 'validation_failed',
          message: 'Revisa los datos enviados.',
          reason: 'invalid_form',
          errors: {
            email: ['El correo es obligatorio.', '', 7],
            malformed: 'ignored',
          },
          trace_id: 'not-exposed-by-the-view-model',
        },
      }),
    );

    expect(result).toEqual({
      status: 422,
      code: 'validation_failed',
      message: 'Revisa los datos enviados.',
      fieldErrors: { email: ['El correo es obligatorio.'] },
      reason: 'invalid_form',
    });
  });

  it('uses safe status-aware copy when the response has no usable payload', () => {
    expect(toApiError(new HttpErrorResponse({ status: 0 })).message).toContain('conectar');
    expect(toApiError(new HttpErrorResponse({ status: 404 })).message).toContain('no está disponible');
    expect(toApiError(new HttpErrorResponse({ status: 503 })).message).toContain('Inténtalo nuevamente');
  });
});
