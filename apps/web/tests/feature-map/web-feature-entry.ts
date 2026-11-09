import type { RouteUrls } from '~/route-urls';

import type {
  FeatureAnchor,
  FeatureEntry,
  RpcAnchor,
  WebFeatureFlag,
  WebFeatureGate,
  WebFeatureSession,
} from '@leather.io/tools/feature-entry';

type RouteUrl = (typeof RouteUrls)[keyof typeof RouteUrls];

export interface WebFeatureEntry extends FeatureEntry<WebFeatureGate, WebFeatureSession> {
  readonly anchor: Exclude<FeatureAnchor, RpcAnchor>;
  readonly routes: readonly RouteUrl[];
  readonly startRoute?: RouteUrl;
  readonly flags: readonly WebFeatureFlag[];
}
