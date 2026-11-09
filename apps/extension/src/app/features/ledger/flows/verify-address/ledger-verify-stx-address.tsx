import { useNavigate } from 'react-router';

import { RouteUrls } from '@shared/route-urls';
import { analytics } from '@shared/utils/analytics';

import { useLedgerDmk } from '@app/features/ledger/dmk/ledger-dmk.context';
import { useLedgerFlow, useLedgerSteps } from '@app/features/ledger/flow/ledger-flow.context';
import type { VerifyAddressVariant } from '@app/features/ledger/flow/ledger-flow.types';
import { type LedgerRequestKeysContext } from '@app/features/ledger/generic-flows/request-keys/ledger-request-keys.context';
import { RequestKeysFlow } from '@app/features/ledger/generic-flows/request-keys/request-keys-flow';
import { useRequestLedgerKeys } from '@app/features/ledger/generic-flows/request-keys/use-request-ledger-keys';
import { useSignerActionController } from '@app/features/ledger/utils/bitcoin-signer-kit-utils';
import { useCancelLedgerAction } from '@app/features/ledger/utils/generic-ledger-utils';
import type { LedgerStacksApp } from '@app/features/ledger/utils/ledger-app';
import {
  MINIMUM_STACKS_APP_VERSION,
  MINIMUM_STACKS_APP_VERSION_MULTISIG_ADDRESS,
  connectLedgerStacksApp,
  getStacksAppVersion,
  isStacksAppOpen,
  showStxAddressOnDevice,
  stacksChainIdToSingleSigAddressVersion,
} from '@app/features/ledger/utils/stacks-ledger-utils';
import { stacksVersionGate } from '@app/features/ledger/utils/stacks-version-gate';
import { toastDurations, useToast } from '@app/features/toasts/use-toast';
import { useCurrentStacksAccount } from '@app/store/accounts/blockchain/stacks/stacks-account.hooks';
import type { StacksAccount } from '@app/store/accounts/blockchain/stacks/stacks-account.models';
import { useCurrentNetwork, useNetworks } from '@app/store/networks/networks.selectors';
import { useCurrentPolicy } from '@app/store/policy/policy.selectors';

import {
  type ShowStxAddressResult,
  getStxAddressVerificationError,
  showStxMultisigAddress,
} from './stx-address-on-device';

interface LedgerVerifyStxAddressProps {
  variant: Extract<VerifyAddressVariant, 'stx' | 'stxMultisig'>;
}
export function LedgerVerifyStxAddress({ variant }: LedgerVerifyStxAddressProps) {
  const navigate = useNavigate();
  const toast = useToast();
  const dmk = useLedgerDmk();
  const signerActions = useSignerActionController();
  const ledgerNavigate = useLedgerSteps();
  const { close } = useLedgerFlow();
  const network = useCurrentNetwork();
  const stacksAccount = useCurrentStacksAccount();
  const policy = useCurrentPolicy();
  const networks = useNetworks();

  const stacksPolicy = policy?.chain === 'stacks' ? policy : undefined;
  const isMultisig = variant === 'stxMultisig';

  function failVerification(message: string) {
    analytics.track('address_verification_completed', { type: variant, verified: false });
    ledgerNavigate.toErrorStep('stacks', message);
  }

  async function showAddressOnDevice(
    app: LedgerStacksApp,
    account: StacksAccount
  ): Promise<ShowStxAddressResult> {
    if (!isMultisig) {
      ledgerNavigate.toDeviceBusyStep('Confirm the address on your Ledger…', account.address);
      const response = await showStxAddressOnDevice(app)(
        account.derivationPath,
        stacksChainIdToSingleSigAddressVersion(network.chain.stacks.chainId)
      );
      return { status: 'shown', response, expectedAddress: account.address };
    }
    if (!stacksPolicy) {
      return { status: 'error', message: 'No active Stacks multisig account to verify.' };
    }
    const policyNetwork = networks[stacksPolicy.networkId];
    if (!policyNetwork) {
      return {
        status: 'error',
        message: 'Could not derive the multisig address for this account.',
      };
    }
    ledgerNavigate.toDeviceBusyStep('Confirm the address on your Ledger…', stacksPolicy.address);
    return showStxMultisigAddress(app, {
      derivationPath: account.derivationPath,
      devicePublicKey: account.stxPublicKey,
      publicKeys: stacksPolicy.publicKeys,
      threshold: stacksPolicy.threshold,
      chainId: policyNetwork.chain.stacks.chainId,
      expectedAddress: stacksPolicy.address,
    });
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
        isMultisig ? MINIMUM_STACKS_APP_VERSION_MULTISIG_ADDRESS : MINIMUM_STACKS_APP_VERSION
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
        const result = await showAddressOnDevice(app, stacksAccount);
        if (result.status === 'error') {
          failVerification(result.message);
          return { status: 'failure' };
        }
        const verificationError = getStxAddressVerificationError(
          result.response,
          result.expectedAddress
        );
        if (verificationError !== null) {
          failVerification(verificationError);
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
