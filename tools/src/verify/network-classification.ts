export const requestClasses = [
  'extension',
  'local',
  'mocked',
  'fallback',
  'real',
  'failed',
  'other',
] as const;
export type RequestClass = (typeof requestClasses)[number];

export const routeActions = ['fulfill', 'abort', 'continue', 'fallback'] as const;
export type RouteAction = (typeof routeActions)[number];

export interface RouteHandling {
  readonly handler: string;
  readonly action: RouteAction;
}

export interface ObservedRequest {
  readonly url: string;
  readonly handling?: RouteHandling;
  readonly failure?: string;
}

const extensionProtocol = 'chrome-extension:';
const httpProtocols = new Set(['http:', 'https:']);
const localHostnames = new Set(['localhost', '127.0.0.1']);

function parseUrl(url: string): URL | undefined {
  try {
    return new URL(url);
  } catch {
    return undefined;
  }
}

export function classifyRequest(
  { url, handling, failure }: ObservedRequest,
  fallbackHandler: string
): RequestClass {
  const parsed = parseUrl(url);
  if (!parsed) return 'other';
  if (parsed.protocol === extensionProtocol) return 'extension';
  if (!httpProtocols.has(parsed.protocol)) return 'other';
  if (localHostnames.has(parsed.hostname)) return 'local';
  if (handling && (handling.action === 'fulfill' || handling.action === 'abort')) {
    return handling.handler === fallbackHandler ? 'fallback' : 'mocked';
  }
  if (failure !== undefined) return 'failed';
  return 'real';
}

export function countRequestClasses(
  classes: readonly RequestClass[]
): Record<RequestClass, number> {
  const counts: Record<RequestClass, number> = {
    extension: 0,
    local: 0,
    mocked: 0,
    fallback: 0,
    real: 0,
    failed: 0,
    other: 0,
  };
  for (const requestClass of classes) counts[requestClass] += 1;
  return counts;
}
