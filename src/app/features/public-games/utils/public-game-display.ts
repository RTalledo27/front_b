import { GameStatus } from '../../../core/api/models/game-api.models';
import { StatusTone } from '../../../shared/ui/status-badge/status-badge';

const statusLabels: Record<GameStatus, string> = {
  draft: 'Borrador',
  published: 'Próximamente',
  sales_open: 'Ventas abiertas',
  sales_closed: 'Ventas cerradas',
  running: 'En vivo',
  paused: 'Pausado',
  resolving: 'Validando resultado',
  completed: 'Finalizado',
  cancelled: 'Cancelado',
};

export function gameStatusLabel(status: GameStatus): string {
  return statusLabels[status];
}

export function gameStatusTone(status: GameStatus): StatusTone {
  switch (status) {
    case 'sales_open':
    case 'completed':
      return 'success';
    case 'running':
    case 'resolving':
      return 'info';
    case 'published':
    case 'paused':
      return 'warning';
    case 'cancelled':
      return 'danger';
    default:
      return 'neutral';
  }
}

export function formatMoney(amountCents: number, currency: string): string {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amountCents / 100);
}

export function formatGameDate(value: string | null): string {
  if (!value) {
    return 'Fecha por confirmar';
  }

  return new Intl.DateTimeFormat('es-PE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}