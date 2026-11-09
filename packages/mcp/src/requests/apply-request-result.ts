import { z } from 'zod';

import { mapAddressesResultToPairing } from '../pairing/map-addresses-result-to-pairing';
import { type PairingStore } from '../pairing/pairing-store';
import {
  type PendingRequest,
  type PendingRequestStore,
  isTerminalStatus,
} from './pending-request-store';

const maxMessageLength = 500;

export const requestResultBodySchema = z.discriminatedUnion('outcome', [
  z.object({ outcome: z.literal('approved'), result: z.unknown() }),
  z.object({
    outcome: z.enum(['rejected', 'failed']),
    message: z.string().max(maxMessageLength).optional(),
  }),
]);

type RequestResultBody = z.infer<typeof requestResultBodySchema>;

const transactionResultSchema = z.object({
  txid: z.string().optional(),
  proposalId: z.string().optional(),
  status: z.enum(['broadcast', 'proposed']).optional(),
});

interface ApplyRequestResultArgs {
  requests: PendingRequestStore;
  pairing: PairingStore;
  request: PendingRequest;
  body: RequestResultBody;
}

async function applyConnectApproval(
  { requests, pairing, request }: ApplyRequestResultArgs,
  result: unknown
) {
  const newPairing = mapAddressesResultToPairing(result, new Date());
  if (!newPairing) {
    return requests.complete(request.id, {
      status: 'failed',
      error: 'Leather did not return a single-signature account with Bitcoin addresses.',
    });
  }
  const current = requests.get(request.id);
  if (!current || isTerminalStatus(current.status)) return undefined;
  await pairing.save(newPairing);
  return requests.complete(request.id, { status: 'approved', result: newPairing.addresses });
}

export async function applyRequestResult(args: ApplyRequestResultArgs) {
  const { requests, request, body } = args;
  if (isTerminalStatus(request.status)) return undefined;

  if (body.outcome !== 'approved') {
    return requests.complete(request.id, {
      status: body.outcome,
      error: body.message ?? `The request was ${body.outcome} in Leather.`,
    });
  }

  if (request.requestClass === 'connect') return applyConnectApproval(args, body.result);

  const parsed = transactionResultSchema.safeParse(body.result);
  return requests.complete(request.id, {
    status: 'approved',
    result: parsed.success ? parsed.data : {},
  });
}
