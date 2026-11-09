import type { CryptoAssetChain } from '@leather.io/models';

import { RouteUrls } from '@shared/route-urls';
import { replaceRouteParams } from '@shared/utils/replace-route-params';

export function createActivityDetailsPath(chain: CryptoAssetChain, txid: string) {
  return replaceRouteParams(RouteUrls.ActivityDetails, { chain, txid });
}
