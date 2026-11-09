import { useLedgerDmk } from '@app/features/ledger/dmk/ledger-dmk.context';
import { useLedgerSteps } from '@app/features/ledger/flow/ledger-flow.context';
import type { ConfirmStxPolicyAddressLedgerFlowRequest } from '@app/features/ledger/flow/ledger-flow.types';
import {
  getStxAddressVerificationError,
  showStxMultisigAddress,
} from '@app/features/ledger/flows/verify-address/stx-address-on-device';
import { type LedgerRequestKeysContext } from '@app/features/ledger/generic-flows/request-keys/ledger-request-keys.context';
import { RequestKeysFlow } from '@app/features/ledger/generic-flows/request-keys/request-keys-flow';
import { useRequestLedgerKeys } from '@app/features/ledger/generic-flows/request-keys/use-request-ledger-keys';
import { useSignerActionController } from '@app/features/ledger/utils/bitcoin-signer-kit-utils';
import { useCancelLedgerAction } from '@app/features/ledger/utils/generic-ledger-utils';
import type { LedgerStacksApp } from '@app/features/ledger/utils/ledger-app';
import {
  MINIMUM_STACKS_APP_VERSION_MULTISIG_ADDRESS,
  connectLedgerStacksApp,
  getStacksAppVersion,
  isStacksAppOpen,
} from '@app/features/ledger/utils/stacks-ledger-utils';
import { stacksVersionGate } from '@app/features/ledger/utils/stacks-version-gate';
import { useCurrentStacksAccount } from '@app/store/accounts/blockchain/stacks/stacks-account.hooks';

interface LedgerConfirmStxPolicyAddressProps {
  request: ConfirmStxPolicyAddressLedgerFlowRequest;
}
export function LedgerConfirmStxPolicyAddress({ request }: LedgerConfirmStxPolicyAddressProps) {
  const dmk = useLedgerDmk();
  const signerActions = useSignerActionController();
  const ledgerNavigate = useLedgerSteps();
  const stacksAccount = useCurrentStacksAccount();
  const { address, publicKeys, threshold, chainId, onConfirmed } = request;

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
        MINIMUM_STACKS_APP_VERSION_MULTISIG_ADDRESS
      ),
      onSuccess() {
        void onConfirmed();
      },
      async pullKeysFromDevice(app) {
        if (!stacksAccount) {
          ledgerNavigate.toErrorStep('stacks');
          return { status: 'failure' };
        }
        ledgerNavigate.toDeviceBusyStep('Confirm the address on your Ledger…', address);
        const result = await showStxMultisigAddress(app, {
          derivationPath: stacksAccount.derivationPath,
          devicePublicKey: stacksAccount.stxPublicKey,
          publicKeys,
          threshold,
          chainId,
          expectedAddress: address,
        });
        if (result.status === 'error') {
          ledgerNavigate.toErrorStep('stacks', result.message);
          return { status: 'failure' };
        }
        const verificationError = getStxAddressVerificationError(
          result.response,
          result.expectedAddress
        );
        if (verificationError !== null) {
          ledgerNavigate.toErrorStep('stacks', verificationError);
          return { status: 'failure' };
        }
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
