import { randomUUID } from 'node:crypto';

import { type RpcMethodNames } from '@leather.io/rpc';

type PendingRequestStatus =
  | 'pending'
  | 'opened'
  | 'approved'
  | 'rejected'
  | 'failed'
  | 'expired'
  | 'cancelled';

type PendingRequestClass = 'connect' | 'transaction';

export type PendingRequestKind = 'connect' | 'send_asset' | 'call_contract' | 'swap';

export interface PendingRequestInput {
  requestClass: PendingRequestClass;
  kind: PendingRequestKind;
  rpcMethod: RpcMethodNames;
  rpcParams: Record<string, unknown>;
  summary: string[];
  pairingCode?: string;
  chain?: 'bitcoin' | 'stacks';
  assets?: string[];
}

export interface PendingRequest extends PendingRequestInput {
  id: string;
  status: PendingRequestStatus;
  createdAt: number;
  updatedAt: number;
  expiresAt: number;
  result?: unknown;
  error?: string;
}

type PendingRequestOutcome =
  | { status: 'approved'; result: unknown }
  | { status: 'rejected' | 'failed'; error: string };

type CreatePendingRequestResult =
  | { created: true; request: PendingRequest }
  | { created: false; code: 'REQUEST_IN_FLIGHT'; inFlight: PendingRequest };

const terminalStatuses: readonly PendingRequestStatus[] = [
  'approved',
  'rejected',
  'failed',
  'expired',
  'cancelled',
];

export function isTerminalStatus(status: PendingRequestStatus) {
  return terminalStatuses.includes(status);
}

interface PendingRequestStoreOptions {
  ttlMs: number;
}

export class PendingRequestStore {
  private readonly requests = new Map<string, PendingRequest>();
  private readonly waiters = new Map<string, Set<() => void>>();

  constructor(private readonly options: PendingRequestStoreOptions) {}

  create(input: PendingRequestInput): CreatePendingRequestResult {
    const inFlight = this.findInFlight(input.requestClass);
    if (inFlight) return { created: false, code: 'REQUEST_IN_FLIGHT', inFlight };

    const now = Date.now();
    const request: PendingRequest = {
      ...input,
      id: randomUUID(),
      status: 'pending',
      createdAt: now,
      updatedAt: now,
      expiresAt: now + this.options.ttlMs,
    };
    this.requests.set(request.id, request);
    return { created: true, request };
  }

  get(id: string) {
    const request = this.requests.get(id);
    if (!request) return undefined;
    return this.applyExpiry(request);
  }

  findInFlight(requestClass: PendingRequestClass) {
    return this.listInFlight().find(request => request.requestClass === requestClass);
  }

  listInFlight() {
    return [...this.requests.values()]
      .map(request => this.applyExpiry(request))
      .filter(request => !isTerminalStatus(request.status));
  }

  markOpened(id: string) {
    const request = this.get(id);
    if (!request || request.status !== 'pending') return request;
    return this.update(request, { status: 'opened' });
  }

  complete(id: string, outcome: PendingRequestOutcome) {
    const request = this.get(id);
    if (!request || isTerminalStatus(request.status)) return undefined;
    return this.update(request, outcome);
  }

  cancel(id: string) {
    const request = this.get(id);
    if (!request || isTerminalStatus(request.status)) return undefined;
    return this.update(request, { status: 'cancelled' });
  }

  cancelAll() {
    return this.listInFlight().map(request => this.update(request, { status: 'cancelled' }));
  }

  async waitForTerminal(id: string, timeoutMs: number) {
    const request = this.get(id);
    if (!request || isTerminalStatus(request.status)) return request;

    const waitMs = Math.max(0, Math.min(timeoutMs, request.expiresAt - Date.now()));
    await new Promise<void>(resolve => {
      const waiters = this.waiters.get(id) ?? new Set<() => void>();
      this.waiters.set(id, waiters);
      function done() {
        clearTimeout(timer);
        waiters.delete(done);
        resolve();
      }
      const timer = setTimeout(done, waitMs);
      waiters.add(done);
    });
    return this.get(id);
  }

  private applyExpiry(request: PendingRequest) {
    if (isTerminalStatus(request.status) || Date.now() < request.expiresAt) return request;
    return this.update(request, { status: 'expired' });
  }

  private update(request: PendingRequest, changes: Partial<PendingRequest>) {
    const updated: PendingRequest = { ...request, ...changes, updatedAt: Date.now() };
    this.requests.set(updated.id, updated);
    if (isTerminalStatus(updated.status)) this.notify(updated.id);
    return updated;
  }

  private notify(id: string) {
    const waiters = this.waiters.get(id);
    if (!waiters) return;
    this.waiters.delete(id);
    waiters.forEach(waiter => waiter());
  }
}
