import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { z } from 'zod';

import type { AccountAddresses } from '@leather.io/models';

import { MCP_NETWORK, PAIRING_DIRECTORY_NAME, PAIRING_FILE_NAME } from '../constants';

const pairingFileMode = 0o600;
const pairingDirectoryMode = 0o700;

const accountAddressesSchema = z.object({
  id: z.object({ fingerprint: z.string(), accountIndex: z.number().int().nonnegative() }),
  bitcoin: z
    .discriminatedUnion('type', [
      z.object({
        type: z.literal('hd'),
        taprootDescriptor: z.string(),
        nativeSegwitDescriptor: z.string(),
        zeroIndexTaprootPayerAddress: z.string().optional(),
        zeroIndexNativeSegwitPayerAddress: z.string().optional(),
      }),
      z.object({
        type: z.literal('fixedAddress'),
        address: z.string(),
        paymentType: z.enum(['p2wsh', 'p2wpkh', 'p2sh', 'p2pkh', 'p2tr']),
        multisig: z.object({ threshold: z.number(), signerCount: z.number() }).optional(),
      }),
    ])
    .optional(),
  stacks: z.object({ stxAddress: z.string() }).optional(),
});

const pairingSchema = z.object({
  network: z.literal(MCP_NETWORK),
  pairedAt: z.string(),
  account: accountAddressesSchema,
});

type Pairing = z.infer<typeof pairingSchema>;

function getDefaultPairingDirectory() {
  return join(homedir(), PAIRING_DIRECTORY_NAME);
}

export class PairingStore {
  private pairing: Pairing | null = null;
  private readonly filePath: string;

  constructor(private readonly directory: string = getDefaultPairingDirectory()) {
    this.filePath = join(directory, PAIRING_FILE_NAME);
  }

  async load(): Promise<Pairing | null> {
    try {
      const content = await readFile(this.filePath, 'utf-8');
      const parsed = pairingSchema.safeParse(JSON.parse(content));
      this.pairing = parsed.success ? parsed.data : null;
    } catch {
      this.pairing = null;
    }
    return this.pairing;
  }

  get(): Pairing | null {
    return this.pairing;
  }

  async save(account: AccountAddresses): Promise<Pairing> {
    const pairing: Pairing = {
      network: MCP_NETWORK,
      pairedAt: new Date().toISOString(),
      account,
    };
    await mkdir(this.directory, { recursive: true, mode: pairingDirectoryMode });
    await writeFile(this.filePath, JSON.stringify(pairing, null, 2), { mode: pairingFileMode });
    this.pairing = pairing;
    return pairing;
  }

  async clear(): Promise<void> {
    this.pairing = null;
    await rm(this.filePath, { force: true });
  }
}
