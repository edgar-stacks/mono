import type { AccountAddresses } from '@leather.io/models';

import type { PendingRequest, PendingRequestOutcome } from '../requests/pending-request-store';
import { mapAddressesResultToPairing } from './map-addresses-result-to-pairing';
import type { PairingStore } from './pairing-store';

const mainnetStacksPrefixes = ['SP', 'SM'];
const mainnetBitcoinPrefixes = ['bc1', '1', '3'];

function readBitcoinAddress(account: AccountAddresses) {
  if (account.bitcoin?.type === 'fixedAddress') return account.bitcoin.address;
  return account.bitcoin?.zeroIndexNativeSegwitPayerAddress;
}

function isMainnetPairing(account: AccountAddresses) {
  const stxAddress = account.stacks?.stxAddress;
  if (stxAddress && !mainnetStacksPrefixes.some(prefix => stxAddress.startsWith(prefix))) {
    return false;
  }
  const bitcoinAddress = readBitcoinAddress(account);
  if (bitcoinAddress && !mainnetBitcoinPrefixes.some(prefix => bitcoinAddress.startsWith(prefix))) {
    return false;
  }
  return true;
}

export function createApprovedOutcomeResolver(pairingStore: PairingStore) {
  return async function resolveApprovedOutcome(
    request: PendingRequest,
    result: unknown
  ): Promise<PendingRequestOutcome> {
    if (request.kind !== 'connect') return { state: 'approved', result };

    const account = mapAddressesResultToPairing(result);
    if (!account) {
      return { state: 'failed', error: { message: 'Leather returned no usable addresses.' } };
    }
    if (!isMainnetPairing(account)) {
      return {
        state: 'failed',
        error: {
          message:
            'Leather returned testnet addresses. Switch Leather to mainnet and connect again.',
        },
      };
    }
    await pairingStore.save(account);
    return { state: 'approved', result: { account } };
  };
}
