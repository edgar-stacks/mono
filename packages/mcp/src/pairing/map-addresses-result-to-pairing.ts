import { type HdBitcoinAddressInfo } from '@leather.io/models';
import { addressResponseBodySchema } from '@leather.io/rpc';

import { type Pairing } from './pairing';

const accountIndexPattern = /^m\/\d+'\/\d+'\/(\d+)'/;

function parseAccountIndex(derivationPath: string) {
  const match = accountIndexPattern.exec(derivationPath);
  if (!match) return null;
  return Number.parseInt(match[1], 10);
}

function getHdBitcoinInfo(
  nativeSegwitDescriptor: string,
  taprootDescriptor: string | undefined
): HdBitcoinAddressInfo | undefined {
  if (!nativeSegwitDescriptor || !taprootDescriptor) return undefined;
  return { type: 'hd', nativeSegwitDescriptor, taprootDescriptor };
}

export function mapAddressesResultToPairing(result: unknown, pairedAt: Date): Pairing | null {
  const parsed = addressResponseBodySchema.safeParse(result);
  if (!parsed.success) return null;

  const { addresses } = parsed.data;
  const nativeSegwit = addresses.find(
    address => address.symbol === 'BTC' && address.type === 'p2wpkh'
  );
  const taproot = addresses.find(address => address.symbol === 'BTC' && address.type === 'p2tr');
  const stacks = addresses.find(
    address => address.symbol === 'STX' && address.kind === 'single-sig'
  );

  if (!nativeSegwit) return null;
  const accountIndex = parseAccountIndex(nativeSegwit.derivationPath);
  if (accountIndex === null) return null;

  return {
    version: 1,
    pairedAt: pairedAt.toISOString(),
    addresses: {
      nativeSegwit: nativeSegwit.address,
      taproot: taproot?.address,
      stacks: stacks?.address,
    },
    account: {
      id: { fingerprint: nativeSegwit.fingerprint, accountIndex },
      bitcoin: getHdBitcoinInfo(nativeSegwit.descriptor, taproot?.descriptor),
      stacks: stacks ? { stxAddress: stacks.address } : undefined,
    },
  };
}
