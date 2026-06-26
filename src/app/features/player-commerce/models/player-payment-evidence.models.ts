export const PAYMENT_EVIDENCE_ACCEPT_ATTRIBUTE =
  '.jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf';

export const PAYMENT_EVIDENCE_ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
] as const;

export const PAYMENT_EVIDENCE_MAX_SIZE_BYTES = 5 * 1024 * 1024;

export type PaymentEvidenceFlowStatus =
  | 'idle'
  | 'validating'
  | 'ready'
  | 'submitting'
  | 'inProgress'
  | 'success'
  | 'validationError'
  | 'evidenceRejected'
  | 'idempotencyConflict'
  | 'unauthorized'
  | 'forbidden'
  | 'networkError'
  | 'unexpectedError';

export interface PaymentEvidenceSelection {
  file: File;
  fingerprint: string;
  sizeBytes: number;
  mimeType: string;
}

export interface PaymentEvidenceDocumentView {
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
}

export interface PaymentEvidenceSuccessView {
  orderId: string;
  paymentId: string;
  paymentStatus: string;
  submittedAt: string;
  document: PaymentEvidenceDocumentView;
}
