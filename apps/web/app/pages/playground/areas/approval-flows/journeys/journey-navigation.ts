const approvalFlowViews = ['screens', 'viewer', 'primitives', 'activity', 'journeys'] as const;

export type ApprovalFlowView = (typeof approvalFlowViews)[number];

const catalogFallback = '?view=screens';

function parseView(value: string | null): ApprovalFlowView {
  return approvalFlowViews.find(view => view === value) ?? 'screens';
}

export function readApprovalFlowParams(params: URLSearchParams) {
  return {
    view: parseView(params.get('view')),
    direction: params.get('direction'),
    screen: params.get('screen'),
    journey: params.get('journey'),
    variant: params.get('variant'),
    wallet: params.get('wallet') === 'ledger' ? ('ledger' as const) : ('software' as const),
    controls: params.get('controls') !== 'hidden',
    participant: params.get('mode') === 'participant',
    run: params.get('run'),
    returnTo: params.get('return'),
  };
}

export type ApprovalFlowParams = ReturnType<typeof readApprovalFlowParams>;

export function createRunId() {
  return Math.random().toString(36).slice(2, 10);
}

function toSearch(params: URLSearchParams) {
  return `?${params.toString()}`;
}

export function viewUrl(
  current: URLSearchParams,
  view: ApprovalFlowView,
  extra: Record<string, string> = {}
) {
  const next = new URLSearchParams(current);
  next.set('view', view);
  for (const [key, value] of Object.entries(extra)) next.set(key, value);
  return toSearch(next);
}

interface PrototypeTarget {
  journey: string;
  variant?: string;
  run: string;
  returnTo?: string;
}

export function prototypeUrl(
  current: URLSearchParams,
  { journey, variant, run, returnTo }: PrototypeTarget
) {
  const next = new URLSearchParams();
  for (const key of ['direction', 'wallet', 'controls', 'mode']) {
    const value = current.get(key);
    if (value !== null) next.set(key, value);
  }
  const currentReturn = current.get('return');
  const nextReturn = returnTo ?? currentReturn;
  next.set('view', 'journeys');
  next.set('journey', journey);
  if (variant) next.set('variant', variant);
  next.set('run', run);
  if (nextReturn) next.set('return', nextReturn);
  return toSearch(next);
}

export function testerUrl(current: URLSearchParams) {
  const next = new URLSearchParams(current);
  next.delete('run');
  next.set('mode', 'participant');
  return toSearch(next);
}

export function catalogReturnUrl(returnTo: string | null) {
  if (!returnTo || !returnTo.startsWith('?')) return catalogFallback;
  const target = new URLSearchParams(returnTo);
  if (target.get('view') === 'journeys' || target.has('return')) return catalogFallback;
  return returnTo;
}
