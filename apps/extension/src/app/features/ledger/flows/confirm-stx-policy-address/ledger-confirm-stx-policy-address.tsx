import { useLedgerDmk } from '@app/features/ledger/dmk/ledger-dmk.context';
import { useLedgerSteps } from '@app/features/ledger/flow/ledger-flow.context';
import type { ConfirmStxPolicyAddressLedgerFlowRequest } from '@app/features/ledger/flow/ledger-flow.types';
import { type LedgerRequestKeysContext } from '@app/features/ledger/generic-flows/request-keys/ledger-request-keys.context';
import { RequestKeysFlow } from '@app/features/ledger/generic-flows/request-keys/request-keys-flow';
import { useRequestLedgerKeys } from '@app/features/ledger/generic-flows/request-keys/use-request-ledger-keys';
import { useSignerActionController } from '@app/features/ledger/utils/bitcoin-signer-kit-utils';
import { useCancelLedgerAction } from '@app/features/ledger/utils/generic-ledger-utils';
import type { LedgerStacksApp } from '@app/features/ledger/utils/ledger-app';
import { verifyStxPolicyAddressOnDevice } from '@app/features/ledger/utils/stacks-address-verification';
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
  const { publicKeys, threshold, chainId, address, onConfirmed } = request;

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
        if (!stacksAccount || !address) {
          ledgerNavigate.toErrorStep(
            'stacks',
            'Could not derive the multisig address for this account.'
          );
          return { status: 'failure' };
        }
        ledgerNavigate.toDeviceBusyStep('Confirm the address on your Ledger…', address);
        const errorMessage = await verifyStxPolicyAddressOnDevice(app)({
          derivationPath: stacksAccount.derivationPath,
          publicKeys,
          threshold,
          chainId,
          devicePublicKey: stacksAccount.stxPublicKey,
          expectedAddress: address,
        });
        if (errorMessage !== null) {
          ledgerNavigate.toErrorStep('stacks', errorMessage);
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
