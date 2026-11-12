import { useNavigate } from 'react-router';

import {
  getStacksSigner,
  isHardwareWalletError,
  isLedgerOnDeviceAddressConfirmed,
} from '@leather.io/ledger';

import { RouteUrls } from '@shared/route-urls';
import { analytics } from '@shared/utils/analytics';

import { useLedgerFlow, useLedgerSteps } from '@app/features/ledger/flow/ledger-flow.context';
import { type LedgerRequestKeysContext } from '@app/features/ledger/generic-flows/request-keys/ledger-request-keys.context';
import { RequestKeysFlow } from '@app/features/ledger/generic-flows/request-keys/request-keys-flow';
import { useHardwareWalletOperation } from '@app/features/ledger/hardware-wallet/use-hardware-wallet-operation';
import { useLedgerAnalytics } from '@app/features/ledger/hooks/use-ledger-analytics.hook';
import { useCancelLedgerAction } from '@app/features/ledger/utils/generic-ledger-utils';
import { toastDurations, useToast } from '@app/features/toasts/use-toast';
import { useCurrentStacksAccount } from '@app/store/accounts/blockchain/stacks/stacks-account.hooks';
import { useCurrentNetwork } from '@app/store/networks/networks.selectors';

const verificationRejectedErrorKinds: readonly string[] = ['rejected', 'unknown'];

export function LedgerVerifyStxAddress() {
  const navigate = useNavigate();
  const toast = useToast();
  const ledgerNavigate = useLedgerSteps();
  const ledgerAnalytics = useLedgerAnalytics();
  const { close } = useLedgerFlow();
  const network = useCurrentNetwork();
  const stacksAccount = useCurrentStacksAccount();

  const { run, cancel, latestDeviceResponse, awaitingDeviceConnection, isConnectionCancellable } =
    useHardwareWalletOperation({ chain: 'stacks' });

  function failVerification(errorMessage: string) {
    analytics.track('address_verification_completed', { type: 'stx', verified: false });
    ledgerNavigate.toErrorStep('stacks', errorMessage);
  }

  async function showAddressOnDevice(showAddress: () => Promise<string>): Promise<string | null> {
    try {
      return await showAddress();
    } catch (e) {
      if (!isHardwareWalletError(e) || !verificationRejectedErrorKinds.includes(e.kind)) throw e;
      failVerification(
        e.kind === 'rejected' ? 'Address verification was rejected on the device.' : e.message
      );
      return null;
    }
  }

  async function verifyAddress() {
    await run(async (wallet, ctx) => {
      if (!stacksAccount) {
        ledgerNavigate.toErrorStep('stacks');
        return;
      }
      const expectedAddress = stacksAccount.address;
      ledgerNavigate.toDeviceBusyStep('Confirm the address on your Ledger…', expectedAddress);
      const onDeviceAddress = await showAddressOnDevice(() =>
        getStacksSigner(wallet).showAddress(
          { derivationPath: stacksAccount.derivationPath, chainId: network.chain.stacks.chainId },
          ctx
        )
      );
      if (onDeviceAddress === null) return;
      if (!isLedgerOnDeviceAddressConfirmed(onDeviceAddress, expectedAddress)) {
        failVerification('The address shown on your Ledger does not match the one in Leather.');
        return;
      }
      analytics.track('address_verification_completed', { type: 'stx', verified: true });
      ledgerAnalytics.publicKeysPulledFromLedgerSuccessfully();
      toast.success('Address verified on your Ledger', { duration: toastDurations.standard });
      close();
      void navigate(RouteUrls.Home, { replace: true });
    });
  }

  const ledgerContextValue: LedgerRequestKeysContext = {
    chain: 'stacks',
    pullPublicKeysFromDevice: verifyAddress,
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
      onCancelAction={cancel}
    />
  );
}
