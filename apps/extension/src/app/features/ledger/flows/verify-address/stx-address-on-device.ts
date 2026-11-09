import type { ResponseAddress } from '@zondax/ledger-stacks';

import { deriveStxMultisigAddress } from '@leather.io/stacks';

import type { LedgerStacksApp } from '@app/features/ledger/utils/ledger-app';
import { isLedgerOnDeviceAddressConfirmed } from '@app/features/ledger/utils/ledger-descriptor-address';
import {
  isStxAddressResponseRejected,
  isStxAddressResponseSuccess,
  makeStxMultisigAddressOptions,
  showStxMultisigAddressOnDevice,
  stacksChainIdToMultiSigAddressVersion,
} from '@app/features/ledger/utils/stacks-ledger-utils';

export function getStxAddressVerificationError(
  response: ResponseAddress,
  expectedAddress: string
): string | null {
  if (isStxAddressResponseRejected(response))
    return 'Address verification was rejected on the device.';
  if (!isStxAddressResponseSuccess(response)) return response.errorMessage;
  if (!isLedgerOnDeviceAddressConfirmed(response.address, expectedAddress))
    return 'The address shown on your Ledger does not match the one in Leather.';
  return null;
}

interface DeriveStxMultisigAddressArgs {
  publicKeys: string[];
  threshold: number;
  chainId: number;
}

function safeDeriveStxMultisigAddress(args: DeriveStxMultisigAddressArgs) {
  try {
    return deriveStxMultisigAddress(args);
  } catch {
    return null;
  }
}

interface ShowStxMultisigAddressArgs extends DeriveStxMultisigAddressArgs {
  derivationPath: string;
  devicePublicKey: string;
  expectedAddress: string;
}

export type ShowStxAddressResult =
  | { status: 'shown'; response: ResponseAddress; expectedAddress: string }
  | { status: 'error'; message: string };

export async function showStxMultisigAddress(
  app: LedgerStacksApp,
  {
    derivationPath,
    devicePublicKey,
    publicKeys,
    threshold,
    chainId,
    expectedAddress,
  }: ShowStxMultisigAddressArgs
): Promise<ShowStxAddressResult> {
  const derivedAddress = safeDeriveStxMultisigAddress({ publicKeys, threshold, chainId });
  if (derivedAddress !== expectedAddress) {
    return { status: 'error', message: 'Could not derive the multisig address for this account.' };
  }
  const result = makeStxMultisigAddressOptions({ publicKeys, threshold, devicePublicKey });
  if (result.status === 'error') return result;
  const response = await showStxMultisigAddressOnDevice(app)(
    derivationPath,
    stacksChainIdToMultiSigAddressVersion(chainId),
    result.options
  );
  return { status: 'shown', response, expectedAddress };
}
