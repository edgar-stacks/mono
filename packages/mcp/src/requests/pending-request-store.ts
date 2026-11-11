import { randomUUID } from 'node:crypto';

type PendingRequestState =
  | 'pending'
  | 'opened'
  | 'approved'
  | 'rejected'
  | 'failed'
  | 'expired'
  | 'cancelled';

type PendingRequestClass = 'connect' | 'transaction';

type PendingRequestKind = 'connect' | 'send_asset' | 'call_contract' | 'swap';

const terminalStates: readonly PendingRequestState[] = [
  'approved',
  'rejected',
  'failed',
  'expired',
  'cancelled',
];

export function isTerminalState(state: PendingRequestState) {
  return terminalStates.includes(state);
}

export interface PendingRequest {
  readonly id: string;
  readonly requestClass: PendingRequestClass;
  readonly kind: PendingRequestKind;
  readonly rpcMethod: string;
  readonly rpcParams: Record<string, unknown>;
  readonly title: string;
  readonly summary: string[];
  readonly pairingCode?: string;
  readonly chain?: 'bitcoin' | 'stacks';
  readonly affectedAssets?: string[];
  readonly createdAt: number;
  readonly expiresAt: number;
  state: PendingRequestState;
  updatedAt: number;
  result?: unknown;
  error?: { code?: number; message: string };
}

export interface CreatePendingRequestInput {
  requestClass: PendingRequestClass;
  kind: PendingRequestKind;
  rpcMethod: string;
  rpcParams: Record<string, unknown>;
  title: string;
  summary: string[];
  pairingCode?: string;
  chain?: 'bitcoin' | 'stacks';
  affectedAssets?: string[];
}

type CreatePendingRequestResult =
  | { ok: true; request: PendingRequest }
  | { ok: false; code: 'REQUEST_IN_FLIGHT'; inFlight: PendingRequest };

export type PendingRequestOutcome =
  | { state: 'approved'; result: unknown }
  | { state: 'rejected' | 'failed'; error: { code?: number; message: string } };

type PendingRequestUpdateResult =
  | { ok: true; request: PendingRequest }
  | { ok: false; reason: 'not-found' }
  | { ok: false; reason: 'terminal'; request: PendingRequest };

interface PendingRequestStoreOptions {
  ttlMs: number;
  createId?(): string;
  onTerminal?(request: PendingRequest): void;
}

type TerminalListener = (request: PendingRequest) => void;

export class PendingRequestStore {
  private readonly requests = new Map<string, PendingRequest>();
  private readonly listeners = new Map<string, Set<TerminalListener>>();
  private readonly expiryTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly ttlMs: number;
  private readonly createId: () => string;
  private readonly onTerminal?: (request: PendingRequest) => void;

  constructor({ ttlMs, createId, onTerminal }: PendingRequestStoreOptions) {
    this.ttlMs = ttlMs;
    this.createId = createId ?? randomUUID;
    this.onTerminal = onTerminal;
  }

  create(input: CreatePendingRequestInput): CreatePendingRequestResult {
    this.pruneTerminalRequests();
    const inFlight = this.findInFlight(input.requestClass);
    if (inFlight) return { ok: false, code: 'REQUEST_IN_FLIGHT', inFlight };

    const now = Date.now();
    const request: PendingRequest = {
      ...input,
      id: this.createId(),
      state: 'pending',
      createdAt: now,
      updatedAt: now,
      expiresAt: now + this.ttlMs,
    };
    this.requests.set(request.id, request);
    this.expiryTimers.set(
      request.id,
      setTimeout(() => this.expire(request.id), this.ttlMs)
    );
    return { ok: true, request };
  }

  get(id: string): PendingRequest | undefined {
    this.expireIfDue(id);
    return this.requests.get(id);
  }

  findInFlight(requestClass: PendingRequestClass): PendingRequest | undefined {
    for (const id of this.requests.keys()) this.expireIfDue(id);
    return [...this.requests.values()].find(
      request => request.requestClass === requestClass && !isTerminalState(request.state)
    );
  }

  markOpened(id: string): PendingRequestUpdateResult {
    const request = this.get(id);
    if (!request) return { ok: false, reason: 'not-found' };
    if (isTerminalState(request.state)) return { ok: false, reason: 'terminal', request };
    request.state = 'opened';
    request.updatedAt = Date.now();
    return { ok: true, request };
  }

  complete(id: string, outcome: PendingRequestOutcome): PendingRequestUpdateResult {
    const request = this.get(id);
    if (!request) return { ok: false, reason: 'not-found' };
    if (isTerminalState(request.state)) return { ok: false, reason: 'terminal', request };
    if (outcome.state === 'approved') {
      request.result = outcome.result;
    } else {
      request.error = outcome.error;
    }
    this.transitionToTerminal(request, outcome.state);
    return { ok: true, request };
  }

  cancel(id: string): PendingRequestUpdateResult {
    const request = this.get(id);
    if (!request) return { ok: false, reason: 'not-found' };
    if (isTerminalState(request.state)) return { ok: false, reason: 'terminal', request };
    this.transitionToTerminal(request, 'cancelled');
    return { ok: true, request };
  }

  cancelAll(): PendingRequest[] {
    const cancelled: PendingRequest[] = [];
    for (const id of [...this.requests.keys()]) {
      const result = this.cancel(id);
      if (result.ok) cancelled.push(result.request);
    }
    return cancelled;
  }

  waitForTerminal(id: string, timeoutMs: number): Promise<PendingRequest | undefined> {
    const request = this.get(id);
    if (!request || isTerminalState(request.state)) return Promise.resolve(request);

    return new Promise(resolve => {
      const listeners = this.listeners.get(id) ?? new Set<TerminalListener>();
      const timer = setTimeout(() => {
        listeners.delete(onTerminal);
        resolve(this.get(id));
      }, timeoutMs);
      function onTerminal(terminalRequest: PendingRequest) {
        clearTimeout(timer);
        resolve(terminalRequest);
      }
      listeners.add(onTerminal);
      this.listeners.set(id, listeners);
    });
  }

  private expireIfDue(id: string) {
    const request = this.requests.get(id);
    if (request && Date.now() >= request.expiresAt) this.expire(id);
  }

  private expire(id: string) {
    const request = this.requests.get(id);
    if (!request || isTerminalState(request.state)) return;
    this.transitionToTerminal(request, 'expired');
  }

  private transitionToTerminal(request: PendingRequest, state: PendingRequestState) {
    request.state = state;
    request.updatedAt = Date.now();
    clearTimeout(this.expiryTimers.get(request.id));
    this.expiryTimers.delete(request.id);
    const listeners = this.listeners.get(request.id);
    this.listeners.delete(request.id);
    listeners?.forEach(listener => listener(request));
    this.onTerminal?.(request);
  }

  private pruneTerminalRequests() {
    const cutoff = Date.now() - this.ttlMs;
    for (const [id, request] of this.requests) {
      if (isTerminalState(request.state) && request.updatedAt < cutoff) this.requests.delete(id);
    }
  }
}
