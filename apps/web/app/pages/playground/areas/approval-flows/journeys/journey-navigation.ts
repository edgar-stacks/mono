const canvasViews = ['screens', 'viewer', 'primitives', 'activity', 'journeys'] as const;

export type CanvasView = (typeof canvasViews)[number];

const defaultView: CanvasView = 'screens';
const catalogFallback = '?view=screens';
const canvasKeys = ['direction', 'references', 'confirm'];
const sessionKeys = ['wallet', 'controls', 'mode', 'return', ...canvasKeys];

export function parseCanvasView(value: string | null): CanvasView {
  return canvasViews.find(view => view === value) ?? defaultView;
}

export function isParticipantSession(params: URLSearchParams) {
  return params.get('mode') === 'participant';
}

function toSearch(params: URLSearchParams) {
  return `?${params.toString()}`;
}

export function canvasUrl(
  current: URLSearchParams,
  view: CanvasView,
  extra: Record<string, string> = {}
) {
  const next = new URLSearchParams();
  canvasKeys.forEach(key => {
    const value = current.get(key);
    if (value) next.set(key, value);
  });
  next.set('view', view);
  Object.entries(extra).forEach(([key, value]) => next.set(key, value));
  return toSearch(next);
}

interface PrototypeTarget {
  journey: string;
  variant: string;
  wallet?: string;
  returnTo?: string;
}

export function prototypeUrl(current: URLSearchParams, target: PrototypeTarget, runId: string) {
  const next = new URLSearchParams();
  sessionKeys.forEach(key => {
    const value = current.get(key);
    if (value) next.set(key, value);
  });
  next.set('view', 'journeys');
  next.set('journey', target.journey);
  next.set('variant', target.variant);
  if (target.wallet) next.set('wallet', target.wallet);
  if (target.returnTo) next.set('return', target.returnTo);
  next.set('run', runId);
  return toSearch(next);
}

export function testerUrl(current: URLSearchParams) {
  const next = new URLSearchParams(current);
  next.delete('run');
  next.delete('controls');
  next.delete('return');
  next.set('view', 'journeys');
  next.set('mode', 'participant');
  return toSearch(next);
}

export function catalogReturnUrl(returnTo: string | null) {
  if (!returnTo || !returnTo.startsWith('?')) return catalogFallback;
  const target = new URLSearchParams(returnTo.slice(1));
  if (target.has('return') || target.get('view') === 'journeys') return catalogFallback;
  return returnTo;
}

export function createRunId() {
  return crypto.randomUUID().slice(0, 8);
}
