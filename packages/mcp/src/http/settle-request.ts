import { z } from 'zod';

import { type McpContext } from '../context';
import { mapAddressesResultToPairing } from '../pairing/pairing';
import { isTerminalRequestState } from '../requests/request.types';

const requestErrorSchema = z.object({
  code: z.number().optional(),
  message: z.string().max(2000),
});

export const bridgeOutcomeSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('approved'), result: z.unknown() }),
  z.object({ status: z.literal('rejected'), error: requestErrorSchema }),
  z.object({ status: z.literal('failed'), error: requestErrorSchema }),
]);

type BridgeOutcome = z.infer<typeof bridgeOutcomeSchema>;

export async function settleRequest(
  { requestStore, pairingStore }: Pick<McpContext, 'requestStore' | 'pairingStore'>,
  id: string,
  outcome: BridgeOutcome
) {
  const request = requestStore.get(id);
  if (!request) return undefined;

  if (outcome.status !== 'approved') {
    return requestStore.settle(id, { state: outcome.status, error: outcome.error });
  }

  if (request.requestClass !== 'connect') {
    return requestStore.settle(id, { state: 'approved', result: outcome.result });
  }

  if (isTerminalRequestState(request.state)) return request;

  const mapped = mapAddressesResultToPairing(outcome.result, new Date());
  if (!mapped.ok) {
    return requestStore.settle(id, { state: 'failed', error: { message: mapped.message } });
  }
  await pairingStore.save(mapped.pairing);
  return requestStore.settle(id, { state: 'approved', result: mapped.pairing.addresses });
}
