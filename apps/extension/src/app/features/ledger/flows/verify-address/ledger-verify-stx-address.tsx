import { useNavigate } from 'react-router';

import {
  getStacksSigner,
  isHardwareWalletError,
  isLedgerOnDeviceAddressConfirmed,
} from '@leather.io/ledger';
import { stacksChainIdToCoreNetworkMode } from '@leather.io/stacks';

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

const deviceResponsesShownAsVerificationErrors: readonly string[] = ['rejected', 'unknown'];

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

  function trackVerification(verified: boolean) {
    analytics.track('address_verification_completed', { type: 'stx', verified });
  }

  async function verifyAddress() {
    await run({ chain: 'stacks' }, async (wallet, ctx) => {
      if (!stacksAccount) {
        ledgerNavigate.toErrorStep('stacks');
        return;
      }
      const expectedAddress = stacksAccount.address;
      ledgerNavigate.toDeviceBusyStep('Confirm the address on your Ledger…', expectedAddress);
      try {
        const onDeviceAddress = await getStacksSigner(wallet).showAddress(
          {
            derivationPath: stacksAccount.derivationPath,
            network: stacksChainIdToCoreNetworkMode(network.chain.stacks.chainId),
          },
          ctx
        );
        if (!isLedgerOnDeviceAddressConfirmed(onDeviceAddress, expectedAddress)) {
          trackVerification(false);
          ledgerNavigate.toErrorStep(
            'stacks',
            'The address shown on your Ledger does not match the one in Leather.'
          );
          return;
        }
      } catch (e) {
        if (!isHardwareWalletError(e) || !deviceResponsesShownAsVerificationErrors.includes(e.kind))
          throw e;
        trackVerification(false);
        ledgerNavigate.toErrorStep('stacks', e.message);
        return;
      }
      trackVerification(true);
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
