import { type z } from 'zod';

import type { AccountAddresses, BitcoinAddressInfo } from '@leather.io/models';
import { addressResponseBodySchema } from '@leather.io/rpc';

type GetAddressesResult = z.infer<typeof addressResponseBodySchema>;

const accountIndexDerivationPathSegment = 3;
const fallbackFingerprint = 'unknown';
const fallbackAccountIndex = 0;

function readAccountIndex(derivationPath: string) {
  const segment = derivationPath.split('/')[accountIndexDerivationPathSegment];
  if (!segment) return undefined;
  const accountIndex = Number.parseInt(segment.replace(/['h]$/, ''), 10);
  return Number.isInteger(accountIndex) ? accountIndex : undefined;
}

function readBitcoinAddressInfo(result: GetAddressesResult): BitcoinAddressInfo | undefined {
  const policyAddress = result.addresses.find(
    address => address.symbol === 'BTC' && address.type === 'p2wsh'
  );
  if (policyAddress) {
    return { type: 'fixedAddress', address: policyAddress.address, paymentType: 'p2wsh' };
  }

  const nativeSegwit = result.addresses.find(
    address => address.symbol === 'BTC' && address.type === 'p2wpkh'
  );
  const taproot = result.addresses.find(
    address => address.symbol === 'BTC' && address.type === 'p2tr'
  );
  if (!nativeSegwit?.descriptor || !taproot?.descriptor) return undefined;

  return {
    type: 'hd',
    nativeSegwitDescriptor: nativeSegwit.descriptor,
    taprootDescriptor: taproot.descriptor,
    zeroIndexNativeSegwitPayerAddress: nativeSegwit.address,
    zeroIndexTaprootPayerAddress: taproot.address,
  };
}

function readAccountId(result: GetAddressesResult) {
  for (const address of result.addresses) {
    if (address.symbol !== 'BTC' || address.type === 'p2wsh') continue;
    return {
      fingerprint: address.fingerprint,
      accountIndex: readAccountIndex(address.derivationPath) ?? fallbackAccountIndex,
    };
  }
  return { fingerprint: fallbackFingerprint, accountIndex: fallbackAccountIndex };
}

export function mapAddressesResultToPairing(result: unknown): AccountAddresses | null {
  const parsed = addressResponseBodySchema.safeParse(result);
  if (!parsed.success) return null;

  const bitcoin = readBitcoinAddressInfo(parsed.data);
  const stacksAddress = parsed.data.addresses.find(address => address.symbol === 'STX');
  if (!bitcoin && !stacksAddress) return null;

  return {
    id: readAccountId(parsed.data),
    ...(bitcoin ? { bitcoin } : {}),
    ...(stacksAddress ? { stacks: { stxAddress: stacksAddress.address } } : {}),
  };
}
