import { z } from 'zod';

const accountAddressesSchema = z.object({
  id: z.object({ fingerprint: z.string(), accountIndex: z.number().int().nonnegative() }),
  bitcoin: z
    .object({
      type: z.literal('hd'),
      taprootDescriptor: z.string(),
      nativeSegwitDescriptor: z.string(),
    })
    .optional(),
  stacks: z.object({ stxAddress: z.string() }).optional(),
});

export const pairingSchema = z.object({
  version: z.literal(1),
  pairedAt: z.string(),
  addresses: z.object({
    nativeSegwit: z.string().optional(),
    taproot: z.string().optional(),
    stacks: z.string().optional(),
  }),
  account: accountAddressesSchema,
});

export type Pairing = z.infer<typeof pairingSchema>;
