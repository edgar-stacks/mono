import { type VerifyFinding } from './verify-contract.js';

export const networkRequestClasses = [
  'extension',
  'local',
  'mocked',
  'fallback',
  'real',
  'failed',
  'other',
] as const;
export type NetworkRequestClass = (typeof networkRequestClasses)[number];

export const networkRouteTags = ['fallback', 'real'] as const;
export type NetworkRouteTag = (typeof networkRouteTags)[number];

export interface NetworkRequestRecord {
  readonly url: string;
  readonly method: string;
  readonly resourceType: string;
  readonly tag?: NetworkRouteTag;
  readonly status?: number;
  readonly failure?: string;
}

export interface ClassifiedNetworkRequest extends NetworkRequestRecord {
  readonly class: NetworkRequestClass;
}

const extensionProtocol = 'chrome-extension:';
const webProtocols = new Set(['http:', 'https:']);
const localHostnames = new Set(['localhost', '127.0.0.1', '[::1]']);

function parseUrl(url: string): URL | undefined {
  try {
    return new URL(url);
  } catch {
    return undefined;
  }
}

export function classifyNetworkRequest(record: NetworkRequestRecord): NetworkRequestClass {
  const url = parseUrl(record.url);
  if (!url) return 'other';
  if (url.protocol === extensionProtocol) return 'extension';
  if (!webProtocols.has(url.protocol)) return 'other';
  if (localHostnames.has(url.hostname)) return 'local';
  if (record.tag === 'fallback') return 'fallback';
  if (record.tag === 'real') return 'real';
  if (record.failure !== undefined) return 'failed';
  return 'mocked';
}

export function classifyNetworkRequests(
  records: readonly NetworkRequestRecord[]
): ClassifiedNetworkRequest[] {
  return records.map(record => ({ ...record, class: classifyNetworkRequest(record) }));
}

export function networkFindings(
  requests: readonly ClassifiedNetworkRequest[],
  mocksActive: boolean
): VerifyFinding[] {
  if (!mocksActive) return [];
  return requests
    .filter(request => request.class === 'real')
    .map(request => ({
      kind: 'real-request',
      message: `${request.method} ${request.url} reached the real network although mocks are on; register a mock for it or run with --mocks none`,
    }));
}
