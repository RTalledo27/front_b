import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { AuthSessionService } from '../../auth/services/auth-session.service';
import { NumberSelectionDraftService } from '../../../features/game-numbers/data-access/number-selection-draft.service';
import { AdminShell } from './admin-shell';

describe('AdminShell', () => {
  it('clears the number-selection draft before logging out', async () => {
    const session = {
      user: signal({ id: 1, name: 'Admin Rojas' }),
      logout: vi.fn(() => of(void 0)),
    };
    const router = {
      navigateByUrl: vi.fn().mockResolvedValue(true),
    };
    const draft = {
      clear: vi.fn(),
    };

    await TestBed.configureTestingModule({
      providers: [
        { provide: AuthSessionService, useValue: session },
        { provide: Router, useValue: router },
        { provide: NumberSelectionDraftService, useValue: draft },
      ],
    }).compileComponents();

    const shell = TestBed.runInInjectionContext(() => new AdminShell());

    shell.logout();

    expect(draft.clear).toHaveBeenCalledTimes(1);
    expect(session.logout).toHaveBeenCalledTimes(1);
  });
});
