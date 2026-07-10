export interface GameOperationReadinessSnapshot {
  status: string;
  scheduledStartAt: string | null;
  startedAt: string | null;
  ordersPending: number;
  ordersPaymentSubmitted: number;
  paymentsPending: number;
  paymentsUnderReview: number;
  activeReservations: number;
  reservedNumbers: number;
  confirmedEntries: number;
}

export function canAttemptStartFromKnownConditions(
  snapshot: GameOperationReadinessSnapshot,
  now = Date.now(),
): boolean {
  if (snapshot.status !== 'sales_closed') {
    return false;
  }

  if (snapshot.startedAt !== null || snapshot.scheduledStartAt === null) {
    return false;
  }

  if (Date.parse(snapshot.scheduledStartAt) > now) {
    return false;
  }

  return (
    snapshot.ordersPending === 0 &&
    snapshot.ordersPaymentSubmitted === 0 &&
    snapshot.paymentsPending === 0 &&
    snapshot.paymentsUnderReview === 0 &&
    snapshot.activeReservations === 0 &&
    snapshot.reservedNumbers === 0 &&
    snapshot.confirmedEntries > 0
  );
}

export function buildStartReadinessGuidance(
  snapshot: GameOperationReadinessSnapshot,
  now = Date.now(),
): string[] {
  const messages: string[] = [];

  if (snapshot.startedAt !== null) {
    messages.push(
      'Este juego ya registra un inicio real. Las siguientes transiciones operativas viven en el motor.',
    );
    return messages;
  }

  if (snapshot.status !== 'sales_closed') {
    messages.push(
      'Primero debes cerrar ventas. El backend solo permite iniciar juegos desde `sales_closed`.',
    );
  }

  if (snapshot.scheduledStartAt === null) {
    messages.push(
      'Falta una fecha de inicio programada. Configura `scheduled_start_at` antes de intentar iniciar.',
    );
  } else if (Date.parse(snapshot.scheduledStartAt) > now) {
    messages.push(
      'Todavía debes esperar a que llegue la hora programada de inicio antes de usar `start`.',
    );
  }

  const commerceIssues: string[] = [];

  if (snapshot.ordersPending > 0) {
    commerceIssues.push(`${snapshot.ordersPending} orden(es) pendientes`);
  }

  if (snapshot.ordersPaymentSubmitted > 0) {
    commerceIssues.push(`${snapshot.ordersPaymentSubmitted} orden(es) con pago enviado`);
  }

  if (snapshot.paymentsPending > 0) {
    commerceIssues.push(`${snapshot.paymentsPending} pago(s) pendientes`);
  }

  if (snapshot.paymentsUnderReview > 0) {
    commerceIssues.push(`${snapshot.paymentsUnderReview} pago(s) en revisión`);
  }

  if (snapshot.activeReservations > 0) {
    commerceIssues.push(`${snapshot.activeReservations} reserva(s) activa(s)`);
  }

  if (snapshot.reservedNumbers > 0) {
    commerceIssues.push(`${snapshot.reservedNumbers} número(s) todavía reservados`);
  }

  if (commerceIssues.length > 0) {
    messages.push(
      `Aún hay actividad comercial por resolver antes del inicio: ${commerceIssues.join(', ')}.`,
    );
  }

  if (snapshot.confirmedEntries <= 0) {
    messages.push(
      'Se necesita al menos una entry confirmada para que el backend permita iniciar el juego.',
    );
  }

  if (messages.length === 0) {
    messages.push(
      'Según las condiciones conocidas del frontend, ya puedes intentar iniciar el juego desde la consola del motor.',
    );
  }

  return messages;
}
