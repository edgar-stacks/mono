import type { RouteUrl } from '~/route-urls';

import type {
  FeatureAnchor,
  FeatureEntry,
  RpcAnchor,
  WebFeatureFlag,
  WebFeatureGate,
  WebFeatureSession,
} from '@leather.io/tools/feature-entry';

export interface WebFeatureEntry extends FeatureEntry<WebFeatureGate, WebFeatureSession> {
  readonly anchor: Exclude<FeatureAnchor, RpcAnchor>;
  readonly routes: readonly RouteUrl[];
  readonly startRoute?: RouteUrl;
  readonly flags: readonly WebFeatureFlag[];
}
