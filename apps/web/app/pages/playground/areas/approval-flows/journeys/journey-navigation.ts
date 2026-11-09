import { z } from 'zod';

import { type JourneyWalletKind, journeyWalletKinds } from './journey-world';

const approvalViews = ['screens', 'viewer', 'primitives', 'activity', 'journeys'] as const;

export type ApprovalView = (typeof approvalViews)[number];

const catalogViews: ApprovalView[] = ['screens', 'viewer', 'primitives', 'activity'];

const keptPrototypeParams = ['wallet', 'controls', 'mode', 'direction', 'return'];

const defaultCatalogUrl = '?view=screens';

const participantMode = 'participant';

const approvalViewSchema = z.enum(approvalViews);

const walletKindSchema = z.enum(journeyWalletKinds);

function toSearch(params: URLSearchParams) {
  return `?${params.toString()}`;
}

export function parseApprovalView(params: URLSearchParams): ApprovalView {
  return approvalViewSchema.safeParse(params.get('view')).data ?? 'screens';
}

export function parseWalletKind(params: URLSearchParams): JourneyWalletKind {
  return walletKindSchema.safeParse(params.get('wallet')).data ?? 'software';
}

export function isParticipantMode(params: URLSearchParams) {
  return params.get('mode') === participantMode;
}

export function areControlsOpen(params: URLSearchParams) {
  return params.get('controls') === 'open';
}

export function createRunId() {
  return Math.random().toString(36).slice(2, 10);
}

interface JourneyTarget {
  journeyId: string;
  variantId: string;
}

export function prototypeUrl(current: URLSearchParams, target: JourneyTarget, runId: string) {
  const next = new URLSearchParams();
  next.set('view', 'journeys');
  next.set('journey', target.journeyId);
  next.set('variant', target.variantId);
  next.set('run', runId);
  keptPrototypeParams.forEach(key => {
    const value = current.get(key);
    if (value !== null) next.set(key, value);
  });
  return toSearch(next);
}

export function testerUrl(current: URLSearchParams) {
  const next = new URLSearchParams(current);
  next.delete('run');
  next.set('mode', participantMode);
  return toSearch(next);
}

export function catalogReturnUrl(returnTarget: string | null) {
  if (!returnTarget || !returnTarget.startsWith('?')) return defaultCatalogUrl;
  const params = new URLSearchParams(returnTarget.slice(1));
  const view = approvalViewSchema.safeParse(params.get('view')).data;
  if (params.has('return') || !view || !catalogViews.includes(view)) {
    return defaultCatalogUrl;
  }
  return toSearch(params);
}

interface LaunchTarget extends JourneyTarget {
  wallet?: JourneyWalletKind;
}

export function launchPrototypeUrl(
  catalogParams: URLSearchParams,
  target: LaunchTarget,
  runId: string
) {
  const current = new URLSearchParams(catalogParams);
  current.delete('return');
  const withReturn = new URLSearchParams();
  withReturn.set('return', toSearch(current));
  const direction = current.get('direction');
  if (direction) withReturn.set('direction', direction);
  if (target.wallet) withReturn.set('wallet', target.wallet);
  return prototypeUrl(withReturn, target, runId);
}

export function catalogViewUrl(
  current: URLSearchParams,
  view: ApprovalView,
  extra: Record<string, string> = {}
) {
  const next = new URLSearchParams();
  next.set('view', view);
  const direction = current.get('direction');
  if (direction) next.set('direction', direction);
  Object.entries(extra).forEach(([key, value]) => next.set(key, value));
  return toSearch(next);
}

export function withParam(current: URLSearchParams, key: string, value: string | null) {
  const next = new URLSearchParams(current);
  if (value === null) next.delete(key);
  else next.set(key, value);
  return toSearch(next);
}
