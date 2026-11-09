import { useNavigate } from 'react-router';

import type { NetworkConfiguration } from '@leather.io/models';
import { deriveStxMultisigAddress } from '@leather.io/stacks';

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
  getStxAddressResponseError,
  verifyStxPolicyAddressOnDevice,
} from '@app/features/ledger/utils/stacks-address-verification';
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
import type { PolicyStore } from '@app/store/policy/policy-store.utils';
import { useCurrentPolicy } from '@app/store/policy/policy.selectors';

function getStacksPolicyChainId(
  policy: PolicyStore,
  networks: Record<string, NetworkConfiguration>
): number | null {
  const network: NetworkConfiguration | undefined = networks[policy.networkId];
  return network ? network.chain.stacks.chainId : null;
}

function isStacksPolicyAddressDerivable(
  policy: Extract<PolicyStore, { chain: 'stacks' }>,
  chainId: number
) {
  try {
    const derivedAddress = deriveStxMultisigAddress({
      publicKeys: policy.publicKeys,
      threshold: policy.threshold,
      chainId,
    });
    return derivedAddress === policy.address;
  } catch {
    return false;
  }
}

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
  const networks = useNetworks();
  const stacksAccount = useCurrentStacksAccount();
  const policy = useCurrentPolicy();

  const stacksPolicy = policy?.chain === 'stacks' ? policy : undefined;
  const isMultisig = variant === 'stxMultisig';

  async function verifySingleSigAddress(app: LedgerStacksApp, account: StacksAccount) {
    ledgerNavigate.toDeviceBusyStep('Confirm the address on your Ledger…', account.address);
    const response = await showStxAddressOnDevice(app)(
      account.derivationPath,
      stacksChainIdToSingleSigAddressVersion(network.chain.stacks.chainId)
    );
    return getStxAddressResponseError(response, account.address);
  }

  async function verifyMultisigAddress(app: LedgerStacksApp, account: StacksAccount) {
    if (!stacksPolicy) return 'No active Stacks multisig account to verify.';
    const chainId = getStacksPolicyChainId(stacksPolicy, networks);
    if (chainId === null || !isStacksPolicyAddressDerivable(stacksPolicy, chainId))
      return 'Could not derive the multisig address for this account.';
    ledgerNavigate.toDeviceBusyStep('Confirm the address on your Ledger…', stacksPolicy.address);
    return verifyStxPolicyAddressOnDevice(app)({
      derivationPath: account.derivationPath,
      publicKeys: stacksPolicy.publicKeys,
      threshold: stacksPolicy.threshold,
      chainId,
      devicePublicKey: account.stxPublicKey,
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
        const errorMessage = isMultisig
          ? await verifyMultisigAddress(app, stacksAccount)
          : await verifySingleSigAddress(app, stacksAccount);
        if (errorMessage !== null) {
          analytics.track('address_verification_completed', { type: variant, verified: false });
          ledgerNavigate.toErrorStep('stacks', errorMessage);
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
