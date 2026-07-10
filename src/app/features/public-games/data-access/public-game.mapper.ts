import { LaravelPaginatedResponse } from '../../../core/api/models/api-response.models';
import { PublicGameApiDto } from '../../../core/api/models/game-api.models';
import { PublicGame, PublicGamesPage } from '../models/public-game.models';

export function mapPublicGame(dto: PublicGameApiDto): PublicGame {
  return {
    id: dto.id,
    slug: dto.slug,
    name: dto.name,
    description: dto.description,
    status: dto.status,
    numberMin: dto.number_range.min,
    numberMax: dto.number_range.max,
    hitsRequired: dto.number_range.hits_required,
    ticketPrice: {
      amountCents: dto.ticket_price.amount_cents,
      currency: dto.ticket_price.currency,
    },
    prize: {
      amountCents: dto.prize.amount_cents,
      currency: dto.prize.currency,
    },
    schedule: {
      salesOpensAt: dto.schedule.sales_opens_at,
      salesClosesAt: dto.schedule.sales_closes_at,
      scheduledStartAt: dto.schedule.scheduled_start_at,
      drawIntervalSeconds: dto.schedule.draw_interval_seconds,
      nextDrawAt: dto.schedule.next_draw_at ?? null,
    },
    lifecycle: {
      startedAt: dto.lifecycle?.started_at ?? null,
      pausedAt: dto.lifecycle?.paused_at ?? null,
      completedAt: dto.lifecycle?.completed_at ?? null,
    },
    latestDraw:
      dto.latest_draw === null || typeof dto.latest_draw === 'undefined'
        ? null
        : {
            sequence: dto.latest_draw.sequence,
            number: dto.latest_draw.number,
            drawnAt: dto.latest_draw.drawn_at,
          },
    winner:
      dto.winner === null || typeof dto.winner === 'undefined'
        ? null
        : {
            number: dto.winner.number,
            drawSequence: dto.winner.draw_sequence,
            hits: dto.winner.hits,
            wonAt: dto.winner.won_at,
          },
  };
}

export function mapPublicGamesPage(
  response: LaravelPaginatedResponse<PublicGameApiDto>,
): PublicGamesPage {
  return {
    games: response.data.map(mapPublicGame),
    pageInfo: {
      currentPage: response.meta.current_page,
      lastPage: response.meta.last_page,
      perPage: response.meta.per_page,
      total: response.meta.total,
    },
  };
}
