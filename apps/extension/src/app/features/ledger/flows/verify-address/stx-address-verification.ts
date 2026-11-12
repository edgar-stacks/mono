import type { ResponseAddress } from '@zondax/ledger-stacks';

import type { LedgerStacksApp } from '@app/features/ledger/utils/ledger-app';
import { isLedgerOnDeviceAddressConfirmed } from '@app/features/ledger/utils/ledger-descriptor-address';
import {
  isStxAddressResponseRejected,
  isStxAddressResponseSuccess,
  makeStxMultisigAddressOptions,
  showStxMultisigAddressOnDevice,
  stacksChainIdToMultiSigAddressVersion,
} from '@app/features/ledger/utils/stacks-ledger-utils';

export type StxAddressVerificationResult =
  | { status: 'verified' }
  | { status: 'failed'; message: string };

export function checkStxAddressResponse(
  response: ResponseAddress,
  expectedAddress: string
): StxAddressVerificationResult {
  if (isStxAddressResponseRejected(response))
    return { status: 'failed', message: 'Address verification was rejected on the device.' };
  if (!isStxAddressResponseSuccess(response))
    return { status: 'failed', message: response.errorMessage };
  if (!isLedgerOnDeviceAddressConfirmed(response.address, expectedAddress))
    return {
      status: 'failed',
      message: 'The address shown on your Ledger does not match the one in Leather.',
    };
  return { status: 'verified' };
}

interface VerifyStxMultisigAddressOnDeviceArgs {
  derivationPath: string;
  devicePublicKey: string;
  publicKeys: string[];
  threshold: number;
  chainId: number;
  expectedAddress: string;
}

export async function verifyStxMultisigAddressOnDevice(
  app: LedgerStacksApp,
  {
    derivationPath,
    devicePublicKey,
    publicKeys,
    threshold,
    chainId,
    expectedAddress,
  }: VerifyStxMultisigAddressOnDeviceArgs
): Promise<StxAddressVerificationResult> {
  const result = makeStxMultisigAddressOptions({ publicKeys, threshold, devicePublicKey });
  if (result.status === 'error') return { status: 'failed', message: result.message };
  const response = await showStxMultisigAddressOnDevice(app)(
    derivationPath,
    stacksChainIdToMultiSigAddressVersion(chainId),
    result.options
  );
  return checkStxAddressResponse(response, expectedAddress);
}
