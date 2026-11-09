import { useNavigate } from 'react-router';

import type { ResponseAddress } from '@zondax/ledger-stacks';

import { deriveStxMultisigAddress } from '@leather.io/stacks';

import { RouteUrls } from '@shared/route-urls';
import { analytics } from '@shared/utils/analytics';

import { useLedgerDmk } from '@app/features/ledger/dmk/ledger-dmk.context';
import { useLedgerFlow, useLedgerSteps } from '@app/features/ledger/flow/ledger-flow.context';
import type { VerifyStxAddressVariant } from '@app/features/ledger/flow/ledger-flow.types';
import { type LedgerRequestKeysContext } from '@app/features/ledger/generic-flows/request-keys/ledger-request-keys.context';
import { RequestKeysFlow } from '@app/features/ledger/generic-flows/request-keys/request-keys-flow';
import { useRequestLedgerKeys } from '@app/features/ledger/generic-flows/request-keys/use-request-ledger-keys';
import { useSignerActionController } from '@app/features/ledger/utils/bitcoin-signer-kit-utils';
import { useCancelLedgerAction } from '@app/features/ledger/utils/generic-ledger-utils';
import type { LedgerStacksApp } from '@app/features/ledger/utils/ledger-app';
import { isLedgerOnDeviceAddressConfirmed } from '@app/features/ledger/utils/ledger-descriptor-address';
import {
  MINIMUM_STACKS_APP_VERSION,
  MINIMUM_STACKS_APP_VERSION_MULTISIG_ADDRESS,
  connectLedgerStacksApp,
  getStacksAppVersion,
  isStacksAppOpen,
  isStxAddressResponseRejected,
  isStxAddressResponseSuccess,
  makeStxMultisigAddressOptions,
  showStxAddressOnDevice,
  showStxMultisigAddressOnDevice,
  stacksChainIdToMultiSigAddressVersion,
  stacksChainIdToSingleSigAddressVersion,
} from '@app/features/ledger/utils/stacks-ledger-utils';
import { stacksVersionGate } from '@app/features/ledger/utils/stacks-version-gate';
import { toastDurations, useToast } from '@app/features/toasts/use-toast';
import { useCurrentStacksAccount } from '@app/store/accounts/blockchain/stacks/stacks-account.hooks';
import type { StacksAccount } from '@app/store/accounts/blockchain/stacks/stacks-account.models';
import { useCurrentNetwork, useNetworks } from '@app/store/networks/networks.selectors';
import { useCurrentPolicy } from '@app/store/policy/policy.selectors';

function deriveStxMultisigAddressOrNull(args: Parameters<typeof deriveStxMultisigAddress>[0]) {
  try {
    return deriveStxMultisigAddress(args);
  } catch {
    return null;
  }
}

type ShowAddressResult =
  | { status: 'shown'; response: ResponseAddress; expectedAddress: string }
  | { status: 'failure'; message: string };

interface LedgerVerifyStxAddressProps {
  variant: VerifyStxAddressVariant;
}
export function LedgerVerifyStxAddress({ variant }: LedgerVerifyStxAddressProps) {
  const navigate = useNavigate();
  const toast = useToast();
  const dmk = useLedgerDmk();
  const signerActions = useSignerActionController();
  const ledgerNavigate = useLedgerSteps();
  const { close } = useLedgerFlow();
  const network = useCurrentNetwork();
  const networks = useNetworks();
  const stacksAccount = useCurrentStacksAccount();
  const policy = useCurrentPolicy();

  const stacksPolicy = policy?.chain === 'stacks' ? policy : undefined;

  function trackUnverified() {
    analytics.track('address_verification_completed', { type: variant, verified: false });
  }

  async function showSingleSigAddressOnDevice(
    app: LedgerStacksApp,
    account: StacksAccount
  ): Promise<ShowAddressResult> {
    const expectedAddress = account.address;
    ledgerNavigate.toDeviceBusyStep('Confirm the address on your Ledger…', expectedAddress);
    const response = await showStxAddressOnDevice(app)(
      account.derivationPath,
      stacksChainIdToSingleSigAddressVersion(network.chain.stacks.chainId)
    );
    return { status: 'shown', response, expectedAddress };
  }

  async function showMultisigAddressOnDevice(
    app: LedgerStacksApp,
    account: StacksAccount
  ): Promise<ShowAddressResult> {
    if (!stacksPolicy)
      return { status: 'failure', message: 'No active Stacks multisig account to verify.' };
    const chainId = networks[stacksPolicy.networkId]?.chain.stacks.chainId;
    if (
      chainId === undefined ||
      deriveStxMultisigAddressOrNull({
        publicKeys: stacksPolicy.publicKeys,
        threshold: stacksPolicy.threshold,
        chainId,
      }) !== stacksPolicy.address
    )
      return {
        status: 'failure',
        message: 'Could not derive the multisig address for this account.',
      };
    const multisigOptions = makeStxMultisigAddressOptions({
      publicKeys: stacksPolicy.publicKeys,
      threshold: stacksPolicy.threshold,
      devicePublicKey: account.stxPublicKey,
    });
    if (multisigOptions.status === 'error')
      return { status: 'failure', message: multisigOptions.message };

    const expectedAddress = stacksPolicy.address;
    ledgerNavigate.toDeviceBusyStep('Confirm the address on your Ledger…', expectedAddress);
    const response = await showStxMultisigAddressOnDevice(app)(
      account.derivationPath,
      stacksChainIdToMultiSigAddressVersion(chainId),
      multisigOptions.options
    );
    return { status: 'shown', response, expectedAddress };
  }

  const { requestKeys, latestDeviceResponse, awaitingDeviceConnection, isConnectionCancellable } =
    useRequestLedgerKeys<LedgerStacksApp>({
      chain: 'stacks',
      connectApp(options) {
        return connectLedgerStacksApp(dmk, { ...options, runAction: signerActions.run });
      },
      getAppVersion: getStacksAppVersion,
      isAppOpen: isStacksAppOpen,
      passesAdditionalVersionCheck: stacksVersionGate(
        ledgerNavigate,
        variant === 'stxMultisig'
          ? MINIMUM_STACKS_APP_VERSION_MULTISIG_ADDRESS
          : MINIMUM_STACKS_APP_VERSION
      ),
      onSuccess() {
        toast.success('Address verified on your Ledger', { duration: toastDurations.standard });
        close();
        void navigate(RouteUrls.Home, { replace: true });
      },
      async pullKeysFromDevice(app) {
        if (!stacksAccount) {
          ledgerNavigate.toErrorStep('stacks');
          return { status: 'failure' };
        }
        const result =
          variant === 'stxMultisig'
            ? await showMultisigAddressOnDevice(app, stacksAccount)
            : await showSingleSigAddressOnDevice(app, stacksAccount);
        if (result.status === 'failure') {
          trackUnverified();
          ledgerNavigate.toErrorStep('stacks', result.message);
          return { status: 'failure' };
        }
        const { response, expectedAddress } = result;
        if (isStxAddressResponseRejected(response)) {
          trackUnverified();
          ledgerNavigate.toErrorStep('stacks', 'Address verification was rejected on the device.');
          return { status: 'failure' };
        }
        if (!isStxAddressResponseSuccess(response)) {
          trackUnverified();
          ledgerNavigate.toErrorStep('stacks', response.errorMessage);
          return { status: 'failure' };
        }
        if (!isLedgerOnDeviceAddressConfirmed(response.address, expectedAddress)) {
          trackUnverified();
          ledgerNavigate.toErrorStep(
            'stacks',
            'The address shown on your Ledger does not match the one in Leather.'
          );
          return { status: 'failure' };
        }
        analytics.track('address_verification_completed', { type: variant, verified: true });
        return { status: 'success' };
      },
    });

  const ledgerContextValue: LedgerRequestKeysContext = {
    chain: 'stacks',
    pullPublicKeysFromDevice: requestKeys,
    latestDeviceResponse,
    awaitingDeviceConnection,
  };

  const canCancelLedgerAction = useCancelLedgerAction({
    awaitingDeviceConnection,
    isConnectionCancellable,
  });
  return (
    <RequestKeysFlow
      context={ledgerContextValue}
      isActionCancellableByUser={canCancelLedgerAction}
      onCancelAction={signerActions.cancelActive}
    />
  );
}
