import type { VerifyMocksMode } from './verify-contract.js';

export const networkClasses = [
  'extension',
  'local',
  'mocked',
  'fallback',
  'real',
  'failed',
  'other',
] as const;
export type NetworkClass = (typeof networkClasses)[number];

export const routeSources = ['mock', 'fallback'] as const;
export const routeActions = ['fulfill', 'abort', 'continue'] as const;

export interface RouteOutcome {
  readonly source: (typeof routeSources)[number];
  readonly action: (typeof routeActions)[number];
}

export interface ObservedRequest {
  readonly url: string;
  readonly method: string;
  readonly resourceType: string;
  readonly outcome?: RouteOutcome;
  readonly failure?: string;
  readonly status?: number;
}

export interface ClassifiedRequest extends ObservedRequest {
  readonly class: NetworkClass;
}

const extensionProtocol = 'chrome-extension:';
const webProtocols = new Set(['http:', 'https:', 'ws:', 'wss:']);
const localHostnames = new Set(['localhost', '127.0.0.1', '[::1]']);

function parseUrl(url: string): URL | undefined {
  try {
    return new URL(url);
  } catch {
    return undefined;
  }
}

export function classifyRequest(request: ObservedRequest): NetworkClass {
  const url = parseUrl(request.url);
  if (!url) return 'other';
  if (url.protocol === extensionProtocol) return 'extension';
  if (!webProtocols.has(url.protocol)) return 'other';
  if (localHostnames.has(url.hostname)) return 'local';
  const { outcome } = request;
  if (outcome && outcome.action !== 'continue') {
    return outcome.source === 'fallback' ? 'fallback' : 'mocked';
  }
  if (request.failure !== undefined) return 'failed';
  return 'real';
}

export function classifyRequests(requests: readonly ObservedRequest[]): ClassifiedRequest[] {
  return requests.map(request => ({ ...request, class: classifyRequest(request) }));
}

export function countByClass(
  requests: readonly ClassifiedRequest[]
): Readonly<Record<NetworkClass, number>> {
  const counts: Record<NetworkClass, number> = {
    extension: 0,
    local: 0,
    mocked: 0,
    fallback: 0,
    real: 0,
    failed: 0,
    other: 0,
  };
  for (const request of requests) counts[request.class] += 1;
  return counts;
}

export function realRequestReasons(
  requests: readonly ClassifiedRequest[],
  mocksMode: VerifyMocksMode
): string[] {
  if (mocksMode === 'none') return [];
  return requests
    .filter(request => request.class === 'real')
    .map(
      request =>
        `real request under mocks: ${request.method} ${request.url} reached the network; mock it or add it to the entry's mocks`
    );
}
