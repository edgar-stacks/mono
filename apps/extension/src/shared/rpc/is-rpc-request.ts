import { z } from 'zod';

const rpcRequestEnvelopeSchema = z.looseObject({
  jsonrpc: z.literal('2.0'),
  id: z.string(),
  method: z.string(),
});

export function isRpcRequestEnvelope(message: unknown) {
  return rpcRequestEnvelopeSchema.safeParse(message).success;
}
