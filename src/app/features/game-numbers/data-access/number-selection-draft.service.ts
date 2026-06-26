import { Injectable, signal } from '@angular/core';
import { NumberSelectionDraft } from '../models/game-number.models';

@Injectable({ providedIn: 'root' })
export class NumberSelectionDraftService {
  private readonly draft = signal<NumberSelectionDraft | null>(null);

  save(draft: NumberSelectionDraft): void {
    this.draft.set({
      slug: draft.slug,
      gameId: draft.gameId,
      selectedGameNumberIds: [...draft.selectedGameNumberIds],
    });
  }

  take(slug: string, gameId: string): NumberSelectionDraft | null {
    const current = this.draft();

    if (current === null || current.slug !== slug || current.gameId !== gameId) {
      return null;
    }

    this.clear();
    return current;
  }

  clear(): void {
    this.draft.set(null);
  }
}
