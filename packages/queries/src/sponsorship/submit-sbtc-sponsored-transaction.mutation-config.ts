import type { UseMutationOptions } from '@tanstack/react-query';

import {
  type SbtcSponsorshipSubmitRequest,
  type SbtcSponsorshipSubmitResponse,
  getLeatherSponsorshipApiClient,
} from '@leather.io/services';

export function createSubmitSbtcSponsoredTransactionMutationConfig() {
  return {
    mutationKey: ['leather-sponsorship-submit-sbtc-transaction'],
    mutationFn: (request: SbtcSponsorshipSubmitRequest) =>
      getLeatherSponsorshipApiClient().submitSponsoredTransaction(request),
  } satisfies UseMutationOptions<
    SbtcSponsorshipSubmitResponse,
    Error,
    SbtcSponsorshipSubmitRequest
  >;
}
