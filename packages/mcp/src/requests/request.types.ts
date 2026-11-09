export type RequestState =
  | 'pending'
  | 'opened'
  | 'approved'
  | 'rejected'
  | 'failed'
  | 'expired'
  | 'cancelled';

const terminalRequestStates: readonly RequestState[] = [
  'approved',
  'rejected',
  'failed',
  'expired',
  'cancelled',
];

export function isTerminalRequestState(state: RequestState) {
  return terminalRequestStates.includes(state);
}

export type RequestClass = 'connect' | 'transaction';

export type RequestChain = 'bitcoin' | 'stacks';

export interface PendingRequest {
  readonly id: string;
  readonly requestClass: RequestClass;
  readonly rpcMethod: string;
  readonly rpcParams: unknown;
  readonly summary: string;
  readonly chain?: RequestChain;
  readonly pairingCode?: string;
  readonly state: RequestState;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly expiresAt: number;
  readonly openedAt?: number;
  readonly result?: unknown;
  readonly error?: { code?: number; message: string };
}

export function acceptsLateApproval(request: PendingRequest) {
  return (
    request.requestClass === 'transaction' &&
    request.openedAt !== undefined &&
    (request.state === 'expired' || request.state === 'cancelled')
  );
}

export type RequestOutcome =
  | { state: 'approved'; result: unknown }
  | { state: 'rejected' | 'failed'; error: { code?: number; message: string } };
