import { GameStatus } from '../../../core/api/models/game-api.models';
import { StatusTone } from '../../../shared/ui/status-badge/status-badge';
import { AdminGameStatusView } from '../models/admin-games.models';

const knownStatusLabels: Record<GameStatus, string> = {
  draft: 'Borrador',
  published: 'Publicado',
  sales_open: 'Ventas abiertas',
  sales_closed: 'Ventas cerradas',
  running: 'En ejecución',
  paused: 'Pausado',
  resolving: 'Resolviendo ganador',
  completed: 'Finalizado',
  cancelled: 'Cancelado',
};

export function buildAdminGameStatus(status: string): AdminGameStatusView {
  if (isKnownGameStatus(status)) {
    return {
      value: status,
      label: knownStatusLabels[status],
      tone: resolveStatusTone(status),
      isKnown: true,
    };
  }

  return {
    value: status,
    label: `Estado no reconocido (${status})`,
    tone: 'neutral',
    isKnown: false,
  };
}

export function formatAdminBoolean(value: boolean): string {
  return value ? 'Sí' : 'No';
}

function isKnownGameStatus(status: string): status is GameStatus {
  return status in knownStatusLabels;
}

function resolveStatusTone(status: GameStatus): StatusTone {
  switch (status) {
    case 'sales_open':
    case 'completed':
      return 'success';
    case 'published':
    case 'sales_closed':
    case 'paused':
      return 'warning';
    case 'running':
    case 'resolving':
      return 'info';
    case 'cancelled':
      return 'danger';
    default:
      return 'neutral';
  }
}
