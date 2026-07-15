import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { ApiError, toApiError } from '../../../core/api/models/api-error.models';
import { AuthRedirectService } from '../../../core/auth/services/auth-redirect.service';
import { AuthSessionService } from '../../../core/auth/services/auth-session.service';
import { PUBLIC_GAMES_REPOSITORY } from '../../public-games/data-access/public-games.repository';
import { PublicGame } from '../../public-games/models/public-game.models';
import {
  GameNumberOption,
  NumberReservationApiDto,
  NumberReservationStatus,
  NumberSelectionViewStatus,
} from '../models/game-number.models';
import { GAME_NUMBERS_REPOSITORY } from './game-numbers.repository';
import { NumberReservationIdempotencyService } from './number-reservation-idempotency.service';
import { NumberSelectionDraftService } from './number-selection-draft.service';

const MAX_RESERVATION_NUMBERS = 100;

interface NumberReservationContext {
  gameId: string;
  loadVersion: number;
  userId: number;
}

@Injectable()
export class NumberSelectionFacade {
  private readonly gamesRepository = inject(PUBLIC_GAMES_REPOSITORY);
  private readonly numbersRepository = inject(GAME_NUMBERS_REPOSITORY);
  private readonly session = inject(AuthSessionService);
  private readonly redirects = inject(AuthRedirectService);
  private readonly router = inject(Router);
  private readonly idempotency = inject(NumberReservationIdempotencyService);
  private readonly draft = inject(NumberSelectionDraftService);
  private readonly destroyRef = inject(DestroyRef);
  private loadVersion = 0;
  private currentSlug = '';

  readonly game = signal<PublicGame | null>(null);
  readonly numbers = signal<GameNumberOption[]>([]);
  readonly selectedKeys = signal<ReadonlySet<string>>(new Set());
  readonly viewStatus = signal<NumberSelectionViewStatus>('idle');
  readonly reservationStatus = signal<NumberReservationStatus>('idle');
  readonly viewError = signal<ApiError | null>(null);
  readonly reservationError = signal<ApiError | null>(null);
  readonly reservationResult = signal<NumberReservationApiDto | null>(null);
  readonly liveMessage = signal<string | null>(null);

  readonly availableCount = computed(
    () => this.numbers().filter((item) => item.status === 'available').length,
  );
  readonly isAuthenticated = computed(() => this.session.isAuthenticated());
  readonly selectedNumbers = computed(() =>
    this.numbers()
      .filter((item) => this.selectedKeys().has(item.key))
      .sort((left, right) => left.number - right.number),
  );
  readonly selectedCount = computed(() => this.selectedKeys().size);
  readonly totalCents = computed(
    () => this.selectedCount() * (this.game()?.ticketPrice.amountCents ?? 0),
  );
  readonly limitReached = computed(() => this.selectedCount() >= MAX_RESERVATION_NUMBERS);
  readonly isBusy = computed(
    () =>
      this.viewStatus() === 'loading' ||
      this.viewStatus() === 'refreshing' ||
      this.reservationStatus() === 'submitting',
  );
  readonly selectionEnabled = computed(
    () => this.game()?.status === 'sales_open' && !this.isBusy(),
  );
  readonly canReserve = computed(
    () =>
      this.selectedCount() > 0 &&
      this.selectedNumbers().every((item) => item.status === 'available') &&
      !this.isBusy(),
  );

  load(slug: string): void {
    const version = ++this.loadVersion;
    this.currentSlug = slug;
    this.viewStatus.set('loading');
    this.viewError.set(null);
    this.reservationStatus.set('idle');
    this.reservationError.set(null);
    this.reservationResult.set(null);
    this.liveMessage.set(null);
    this.game.set(null);
    this.numbers.set([]);
    this.selectedKeys.set(new Set());
    this.idempotency.clear();

    this.gamesRepository
      .getBySlug(slug)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (game) => {
          if (version !== this.loadVersion) {
            return;
          }

          this.game.set(game);
          this.loadAvailability(game.slug, version, false);
        },
        error: (error: unknown) => this.handleViewError(error, version, false),
      });
  }

  toggle(number: GameNumberOption): void {
    if (!this.selectionEnabled() || number.status !== 'available') {
      return;
    }

    this.selectedKeys.update((current) => {
      const next = new Set(current);
      if (next.has(number.key)) {
        next.delete(number.key);
      } else if (next.size < MAX_RESERVATION_NUMBERS) {
        next.add(number.key);
      }
      this.resetReservationAttempt();
      return next;
    });
  }

  clearSelection(): void {
    this.resetReservationAttempt();
    this.selectedKeys.set(new Set());
  }

  isSelected(key: string): boolean {
    return this.selectedKeys().has(key);
  }

  submitReservation(): void {
    const game = this.game();
    if (game === null) {
      return;
    }

    if (this.reservationStatus() === 'submitting') {
      return;
    }

    if (this.selectedCount() === 0) {
      this.setReservationFailure(
        'validationError',
        createLocalApiError('Selecciona al menos un número disponible.'),
      );
      return;
    }

    const selectedIds = this.selectedNumbers().map((item) => item.gameNumberId);
    if (selectedIds.length === 0) {
      this.setReservationFailure(
        'validationError',
        createLocalApiError('No encontramos UUIDs válidos para la selección.'),
      );
      return;
    }

    const user = this.session.user();
    if (user === null) {
      this.draft.save({
        slug: game.slug,
        gameId: game.id,
        selectedGameNumberIds: selectedIds,
      });
      this.reservationStatus.set('unauthorized');
      this.reservationError.set(
        createLocalApiError(
          'Inicia sesión para reservar estos números.',
          401,
          'auth_required',
        ),
      );
      this.liveMessage.set('Necesitas iniciar sesión para continuar con la reserva.');
      this.redirects.redirectToLogin(this.router, `/bingos/${game.slug}/numeros`);
      return;
    }

    const idempotencyKey = this.idempotency.getOrCreate({
      userId: user.id,
      gameId: game.id,
      gameNumberIds: selectedIds,
    });
    const reservationContext: NumberReservationContext = {
      gameId: game.id,
      loadVersion: this.loadVersion,
      userId: user.id,
    };

    this.reservationStatus.set('submitting');
    this.reservationError.set(null);
    this.reservationResult.set(null);
    this.liveMessage.set('Enviando reserva al backend.');

    this.numbersRepository
      .reserveNumbers({
        gameId: game.id,
        gameNumberIds: selectedIds,
        idempotencyKey,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => this.handleReservationSuccess(result, reservationContext),
        error: (error: unknown) => this.handleReservationError(error, reservationContext),
      });
  }

  refreshAvailability(): void {
    if (!this.currentSlug.trim()) {
      return;
    }

    this.loadAvailability(this.currentSlug, this.loadVersion, true);
  }

  private loadAvailability(slug: string, version: number, preserveSelection: boolean): void {
    if (preserveSelection) {
      this.viewStatus.set('refreshing');
      this.viewError.set(null);
    }

    const selectedBeforeRefresh = new Set(this.selectedKeys());

    this.numbersRepository
      .getAvailability(slug)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (availability) => {
          if (version !== this.loadVersion) {
            return;
          }

          this.viewError.set(null);
          this.numbers.set(availability.numbers);

          if (preserveSelection) {
            this.reconcileSelection(selectedBeforeRefresh);
          } else {
            this.restoreDraftSelection();
          }

          this.viewStatus.set('loaded');
        },
        error: (error: unknown) => this.handleViewError(error, version, preserveSelection),
      });
  }

  private handleViewError(error: unknown, version: number, preserveData: boolean): void {
    if (version !== this.loadVersion) {
      return;
    }

    const apiError = toApiError(error);
    this.viewError.set(apiError);

    if (preserveData && this.game() !== null && this.numbers().length > 0) {
      this.viewStatus.set('loaded');
      return;
    }

    this.viewStatus.set(apiError.status === 0 ? 'networkError' : 'unexpectedError');
  }

  private handleReservationSuccess(
    result: NumberReservationApiDto,
    context: NumberReservationContext,
  ): void {
    if (!this.isActiveReservationContext(context)) {
      return;
    }

    this.idempotency.clear();
    this.draft.clear();
    this.reservationResult.set(result);
    this.reservationStatus.set('success');
    this.reservationError.set(null);
    this.liveMessage.set('La reserva se creó correctamente.');
    this.markReserved(result.game_number_ids);
    this.selectedKeys.set(new Set());
    this.refreshAvailability();
  }

  private handleReservationError(error: unknown, context: NumberReservationContext): void {
    if (!this.isActiveReservationContext(context)) {
      return;
    }

    const apiError = toApiError(error);
    this.reservationError.set(apiError);

    if (apiError.status === 0) {
      this.reservationStatus.set('networkError');
      this.liveMessage.set('No pudimos completar la reserva por un problema de red.');
      return;
    }

    if (apiError.status === 401) {
      this.saveCurrentDraft();
      this.reservationStatus.set('unauthorized');
      this.liveMessage.set('Tu sesión expiró. Vuelve a iniciar sesión para continuar.');
      return;
    }

    if (apiError.status === 403) {
      this.idempotency.clear();
      this.reservationStatus.set('forbidden');
      this.liveMessage.set('No tienes permisos para reservar este juego.');
      return;
    }

    if (apiError.status === 429) {
      this.reservationStatus.set('rateLimited');
      this.liveMessage.set('Demasiados intentos. Espera un momento antes de volver a intentar.');
      return;
    }

    if (apiError.status === 409) {
      this.idempotency.clear();
      this.reservationStatus.set('conflict');
      this.liveMessage.set(
        'La clave idempotente dejó de ser válida para esta selección. Intentamos actualizar la grilla.',
      );
      this.refreshAvailability();
      return;
    }

    if (apiError.status === 425 && apiError.code === 'idempotency_in_progress') {
      this.reservationStatus.set('inProgress');
      this.liveMessage.set(
        'La reserva sigue en proceso en el backend. Reintenta en unos segundos con la misma selección.',
      );
      return;
    }

    if (apiError.status === 422 && apiError.code === 'number_not_available_for_reservation') {
      this.idempotency.clear();
      this.reservationStatus.set('conflict');
      this.liveMessage.set(
        'Uno o más números ya no están disponibles. Intentamos actualizar la grilla.',
      );
      this.refreshAvailability();
      return;
    }

    if (apiError.status === 422) {
      this.idempotency.clear();
      this.reservationStatus.set('validationError');
      this.liveMessage.set(apiError.message);
      return;
    }

    this.idempotency.clear();
    this.reservationStatus.set('unexpectedError');
    this.liveMessage.set('Ocurrió un error inesperado al reservar.');
  }

  private markReserved(gameNumberIds: readonly string[]): void {
    const reservedIds = new Set(gameNumberIds);
    this.numbers.update((current) =>
      current.map((item) =>
        reservedIds.has(item.gameNumberId) ? { ...item, status: 'reserved' } : item,
      ),
    );
  }

  private reconcileSelection(previousSelection: ReadonlySet<string>): void {
    const availableIds = new Set(
      this.numbers()
        .filter((item) => item.status === 'available')
        .map((item) => item.key),
    );

    const nextSelection = new Set(
      [...previousSelection].filter((key) => availableIds.has(key)),
    );

    if (nextSelection.size !== previousSelection.size) {
      this.liveMessage.set(
        'Actualizamos tu selección porque algunos números dejaron de estar disponibles.',
      );
    }

    this.selectedKeys.set(nextSelection);
  }

  private restoreDraftSelection(): void {
    const game = this.game();
    if (game === null) {
      return;
    }

    const draft = this.draft.take(game.slug, game.id);
    if (draft === null) {
      return;
    }

    const availableIds = new Set(
      this.numbers()
        .filter((item) => item.status === 'available')
        .map((item) => item.gameNumberId),
    );

    const nextSelection = new Set(
      draft.selectedGameNumberIds.filter((gameNumberId) => availableIds.has(gameNumberId)),
    );

    this.selectedKeys.set(nextSelection);

    if (nextSelection.size !== draft.selectedGameNumberIds.length) {
      this.liveMessage.set(
        'Restauramos la selección disponible. Algunos números ya no estaban libres.',
      );
    }
  }

  private resetReservationAttempt(): void {
    this.idempotency.clear();
    this.reservationStatus.set('idle');
    this.reservationError.set(null);
    this.reservationResult.set(null);
    this.liveMessage.set(null);
  }

  private saveCurrentDraft(): void {
    const game = this.game();
    if (game === null) {
      return;
    }

    const selectedGameNumberIds = this.selectedNumbers().map((item) => item.gameNumberId);
    if (selectedGameNumberIds.length === 0) {
      return;
    }

    this.draft.save({
      slug: game.slug,
      gameId: game.id,
      selectedGameNumberIds,
    });
  }

  private setReservationFailure(status: NumberReservationStatus, error: ApiError): void {
    this.reservationStatus.set(status);
    this.reservationError.set(error);
    this.liveMessage.set(error.message);
  }

  private isActiveReservationContext(context: NumberReservationContext): boolean {
    return (
      context.loadVersion === this.loadVersion &&
      this.game()?.id === context.gameId &&
      this.session.user()?.id === context.userId
    );
  }
}

function createLocalApiError(message: string, status = 422, code: string | null = null): ApiError {
  return {
    status,
    code,
    message,
    fieldErrors: {},
    reason: null,
  };
}
