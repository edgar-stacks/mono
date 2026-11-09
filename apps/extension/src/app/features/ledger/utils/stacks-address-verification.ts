import type { ResponseAddress } from '@zondax/ledger-stacks';

import type { LedgerStacksApp } from './ledger-app';
import { isLedgerOnDeviceAddressConfirmed } from './ledger-descriptor-address';
import {
  isStxAddressResponseRejected,
  isStxAddressResponseSuccess,
  makeStxMultisigAddressOptions,
  showStxMultisigAddressOnDevice,
  stacksChainIdToMultiSigAddressVersion,
} from './stacks-ledger-utils';

export function getStxAddressResponseError(response: ResponseAddress, expectedAddress: string) {
  if (isStxAddressResponseRejected(response))
    return 'Address verification was rejected on the device.';
  if (!isStxAddressResponseSuccess(response)) return response.errorMessage;
  if (!isLedgerOnDeviceAddressConfirmed(response.address, expectedAddress))
    return 'The address shown on your Ledger does not match the one in Leather.';
  return null;
}

interface VerifyStxPolicyAddressArgs {
  derivationPath: string;
  publicKeys: string[];
  threshold: number;
  chainId: number;
  devicePublicKey: string;
  expectedAddress: string;
}

export function verifyStxPolicyAddressOnDevice(app: LedgerStacksApp) {
  return async ({
    derivationPath,
    publicKeys,
    threshold,
    chainId,
    devicePublicKey,
    expectedAddress,
  }: VerifyStxPolicyAddressArgs) => {
    const result = makeStxMultisigAddressOptions({ publicKeys, threshold, devicePublicKey });
    if (result.status === 'error') return result.message;
    const response = await showStxMultisigAddressOnDevice(app)(
      derivationPath,
      stacksChainIdToMultiSigAddressVersion(chainId),
      result.options
    );
    return getStxAddressResponseError(response, expectedAddress);
  };
}
