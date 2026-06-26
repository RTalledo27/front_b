import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import {
  GameNumbersAvailability,
  NumberReservationApiDto,
  NumberReservationRequest,
} from '../models/game-number.models';

export interface GameNumbersRepository {
  getAvailability(slug: string): Observable<GameNumbersAvailability>;
  reserveNumbers(request: NumberReservationRequest): Observable<NumberReservationApiDto>;
}

export const GAME_NUMBERS_REPOSITORY = new InjectionToken<GameNumbersRepository>(
  'GAME_NUMBERS_REPOSITORY',
);
