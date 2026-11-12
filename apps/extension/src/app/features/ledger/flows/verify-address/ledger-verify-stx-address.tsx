import { useNavigate } from 'react-router';

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
  type StxAddressVerificationResult,
  checkStxAddressResponse,
  verifyStxMultisigAddressOnDevice,
} from './stx-address-verification';

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

  function deriveStacksPolicyChainId() {
    if (!stacksPolicy) return null;
    const chainId = networks[stacksPolicy.networkId]?.chain.stacks.chainId;
    if (chainId === undefined) return null;
    try {
      const derivedAddress = deriveStxMultisigAddress({
        publicKeys: stacksPolicy.publicKeys,
        threshold: stacksPolicy.threshold,
        chainId,
      });
      return derivedAddress === stacksPolicy.address ? chainId : null;
    } catch {
      return null;
    }
  }

  async function verifyMultisigAddressOnDevice(
    app: LedgerStacksApp,
    account: StacksAccount
  ): Promise<StxAddressVerificationResult> {
    if (!stacksPolicy)
      return { status: 'failed', message: 'No active Stacks multisig account to verify.' };
    const chainId = deriveStacksPolicyChainId();
    if (chainId === null)
      return {
        status: 'failed',
        message: 'Could not derive the multisig address for this account.',
      };
    ledgerNavigate.toDeviceBusyStep('Confirm the address on your Ledger…', stacksPolicy.address);
    return verifyStxMultisigAddressOnDevice(app, {
      derivationPath: account.derivationPath,
      devicePublicKey: account.stxPublicKey,
      publicKeys: stacksPolicy.publicKeys,
      threshold: stacksPolicy.threshold,
      chainId,
      expectedAddress: stacksPolicy.address,
    });
  }

  async function verifySingleSigAddressOnDevice(app: LedgerStacksApp, account: StacksAccount) {
    ledgerNavigate.toDeviceBusyStep('Confirm the address on your Ledger…', account.address);
    const response = await showStxAddressOnDevice(app)(
      account.derivationPath,
      stacksChainIdToSingleSigAddressVersion(network.chain.stacks.chainId)
    );
    return checkStxAddressResponse(response, account.address);
  }

  function verifyAddressOnDevice(app: LedgerStacksApp, account: StacksAccount) {
    if (variant === 'stxMultisig') return verifyMultisigAddressOnDevice(app, account);
    return verifySingleSigAddressOnDevice(app, account);
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
        const verification = await verifyAddressOnDevice(app, stacksAccount);
        if (verification.status === 'failed') {
          analytics.track('address_verification_completed', { type: variant, verified: false });
          ledgerNavigate.toErrorStep('stacks', verification.message);
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
