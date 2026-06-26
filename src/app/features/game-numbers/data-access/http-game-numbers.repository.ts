import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_BASE_URL } from '../../../core/api/api.config';
import { LaravelDataResponse } from '../../../core/api/models/api-response.models';
import {
  GameNumberOption,
  GameNumbersAvailability,
  NumberReservationApiDto,
  NumberReservationRequest,
  PublicGameNumberApiDto,
} from '../models/game-number.models';
import { GameNumbersRepository } from './game-numbers.repository';

@Injectable()
export class HttpGameNumbersRepository implements GameNumbersRepository {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  getAvailability(slug: string): Observable<GameNumbersAvailability> {
    return this.http
      .get<LaravelDataResponse<PublicGameNumberApiDto[]>>(
        `${this.apiBaseUrl}/public/games/${encodeURIComponent(slug)}/numbers`,
      )
      .pipe(
        map((response) => ({
          numbers: response.data.map(this.mapNumber),
        })),
      );
  }

  reserveNumbers(request: NumberReservationRequest): Observable<NumberReservationApiDto> {
    return this.http
      .post<LaravelDataResponse<NumberReservationApiDto>>(
        `${this.apiBaseUrl}/games/${encodeURIComponent(request.gameId)}/reservations`,
        { game_number_ids: request.gameNumberIds },
        { headers: { 'Idempotency-Key': request.idempotencyKey } },
      )
      .pipe(map((response) => response.data));
  }

  private readonly mapNumber = (dto: PublicGameNumberApiDto): GameNumberOption => ({
    key: dto.id,
    gameNumberId: requireUuid(dto.id),
    number: requireNumber(dto.number),
    status: requireStatus(dto.status),
  });
}

function requireUuid(value: unknown): string {
  if (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  ) {
    return value;
  }

  throw new Error('Invalid public game number id payload.');
}

function requireNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value;
  }

  throw new Error('Invalid public game number payload.');
}

function requireStatus(value: unknown): GameNumberOption['status'] {
  if (value === 'available' || value === 'reserved' || value === 'sold') {
    return value;
  }

  throw new Error('Invalid public game number status payload.');
}
