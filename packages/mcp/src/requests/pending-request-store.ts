import { randomUUID } from 'node:crypto';

import { isDefined } from '@leather.io/utils';

import { REQUEST_TTL_MS } from '../constants';
import {
  type PendingRequest,
  type RequestChain,
  type RequestClass,
  type RequestOutcome,
  acceptsLateApproval,
  isTerminalRequestState,
} from './request.types';

interface PendingRequestStoreOptions {
  ttlMs?: number;
  now?(): number;
  createId?(): string;
}

export interface CreateRequestInput {
  requestClass: RequestClass;
  rpcMethod: string;
  rpcParams: unknown;
  summary: string;
  chain?: RequestChain;
  pairingCode?: string;
}

type CreateRequestResult =
  | { ok: true; request: PendingRequest }
  | { ok: false; code: 'REQUEST_IN_FLIGHT'; inFlight: PendingRequest };

export class PendingRequestStore {
  private readonly requests = new Map<string, PendingRequest>();
  private readonly waiters = new Map<string, Set<() => void>>();
  private readonly ttlMs: number;
  private readonly now: () => number;
  private readonly createId: () => string;

  constructor({ ttlMs = REQUEST_TTL_MS, now, createId }: PendingRequestStoreOptions = {}) {
    this.ttlMs = ttlMs;
    this.now = now ?? (() => Date.now());
    this.createId = createId ?? (() => randomUUID());
  }

  create(input: CreateRequestInput): CreateRequestResult {
    const inFlight = this.findInFlight(input.requestClass);
    if (inFlight) return { ok: false, code: 'REQUEST_IN_FLIGHT', inFlight };

    const createdAt = this.now();
    const request: PendingRequest = {
      ...input,
      id: this.createId(),
      state: 'pending',
      createdAt,
      updatedAt: createdAt,
      expiresAt: createdAt + this.ttlMs,
    };
    this.requests.set(request.id, request);
    return { ok: true, request };
  }

  get(id: string) {
    const request = this.requests.get(id);
    if (!request) return undefined;
    if (!isTerminalRequestState(request.state) && this.now() >= request.expiresAt) {
      return this.update(request, { state: 'expired' });
    }
    return request;
  }

  list() {
    return [...this.requests.keys()].map(id => this.get(id)).filter(isDefined);
  }

  findInFlight(requestClass: RequestClass) {
    return this.list().find(
      request => request.requestClass === requestClass && !isTerminalRequestState(request.state)
    );
  }

  markOpened(id: string) {
    const request = this.get(id);
    if (!request || request.state !== 'pending') return request;
    return this.update(request, { state: 'opened', openedAt: this.now() });
  }

  settle(id: string, outcome: RequestOutcome) {
    const request = this.get(id);
    if (!request) return undefined;
    if (outcome.state === 'approved') {
      if (isTerminalRequestState(request.state) && !acceptsLateApproval(request)) return request;
      return this.update(request, { state: 'approved', result: outcome.result });
    }
    if (isTerminalRequestState(request.state)) return request;
    return this.update(request, { state: outcome.state, error: outcome.error });
  }

  cancel(id: string) {
    const request = this.get(id);
    if (!request || isTerminalRequestState(request.state)) return request;
    return this.update(request, { state: 'cancelled' });
  }

  cancelAll() {
    return this.list()
      .filter(request => !isTerminalRequestState(request.state))
      .map(request => this.update(request, { state: 'cancelled' }));
  }

  async waitForTerminal(id: string, timeoutMs: number) {
    const request = this.get(id);
    if (!request || isTerminalRequestState(request.state)) return request;

    const waitMs = Math.max(0, Math.min(timeoutMs, request.expiresAt - this.now()));

    await new Promise<void>(resolve => {
      const waiters = this.waiters.get(id) ?? new Set<() => void>();
      this.waiters.set(id, waiters);
      function onSettled() {
        clearTimeout(timer);
        waiters.delete(onSettled);
        resolve();
      }
      const timer = setTimeout(onSettled, waitMs);
      waiters.add(onSettled);
    });

    return this.get(id);
  }

  private update(request: PendingRequest, changes: Partial<PendingRequest>) {
    const updated: PendingRequest = { ...request, ...changes, updatedAt: this.now() };
    this.requests.set(updated.id, updated);
    if (isTerminalRequestState(updated.state)) this.notifyWaiters(updated.id);
    return updated;
  }

  private notifyWaiters(id: string) {
    const waiters = this.waiters.get(id);
    if (!waiters) return;
    this.waiters.delete(id);
    waiters.forEach(waiter => waiter());
  }
}
