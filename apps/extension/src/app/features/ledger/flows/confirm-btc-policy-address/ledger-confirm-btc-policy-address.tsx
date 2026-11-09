import {
  type HardwareWalletInteraction,
  getBitcoinSigner,
  isLedgerOnDeviceAddressConfirmed,
  toLedgerDisplayedAddress,
} from '@leather.io/ledger';

import { useLedgerSteps } from '@app/features/ledger/flow/ledger-flow.context';
import type { ConfirmBtcPolicyAddressLedgerFlowRequest } from '@app/features/ledger/flow/ledger-flow.types';
import { type LedgerRequestKeysContext } from '@app/features/ledger/generic-flows/request-keys/ledger-request-keys.context';
import { RequestKeysFlow } from '@app/features/ledger/generic-flows/request-keys/request-keys-flow';
import { useHardwareWalletOperation } from '@app/features/ledger/hardware-wallet/use-hardware-wallet-operation';
import { useDisplayLedgerDescriptorAddress } from '@app/features/ledger/hooks/use-display-ledger-descriptor-address';
import { useLedgerAnalytics } from '@app/features/ledger/hooks/use-ledger-analytics.hook';
import {
  registerLedgerWalletPolicyPrompt,
  useCancelLedgerAction,
} from '@app/features/ledger/utils/generic-ledger-utils';
import { useCurrentNetwork } from '@app/store/networks/networks.selectors';

// Drives the on-device confirmation for btc_addAccount on a Ledger wallet. It
// reuses the generic request-keys flow (connect → version → success/error) and,
// once connected, displays the multisig `wsh` address on the device. The request
// (and so the same derived address and add/verify behaviour) is read from the
// stable popup search params via `useBtcAddAccount`, so on success this owns the
// dApp response: it finalizes (registers in add mode, returns the verified
// address in verify mode) and closes the popup.
interface LedgerConfirmBtcPolicyAddressProps {
  request: ConfirmBtcPolicyAddressLedgerFlowRequest;
}
export function LedgerConfirmBtcPolicyAddress({ request }: LedgerConfirmBtcPolicyAddressProps) {
  const ledgerNavigate = useLedgerSteps();
  const ledgerAnalytics = useLedgerAnalytics();
  const network = useCurrentNetwork();
  const { descriptor, address, onConfirmed } = request;
  const displayLedgerDescriptorAddress = useDisplayLedgerDescriptorAddress();

  const { run, cancel, latestDeviceResponse, awaitingDeviceConnection, isConnectionCancellable } =
    useHardwareWalletOperation({ chain: 'bitcoin' });

  function toConfirmAddressStep() {
    ledgerNavigate.toDeviceBusyStep(
      'Confirm the address on your Ledger…',
      address ? toLedgerDisplayedAddress(address) : undefined
    );
  }

  function onInteraction(interaction: HardwareWalletInteraction) {
    if (interaction.type === 'approve-policy')
      ledgerNavigate.toDeviceBusyStep(registerLedgerWalletPolicyPrompt);
    if (interaction.type === 'verify-address') toConfirmAddressStep();
  }

  async function confirmAddress() {
    await run(
      { chain: 'bitcoin', network: network.chain.bitcoin.mode },
      async (wallet, ctx) => {
        toConfirmAddressStep();
        const onDeviceAddress = await displayLedgerDescriptorAddress(
          getBitcoinSigner(wallet),
          descriptor,
          ctx
        );
        if (!isLedgerOnDeviceAddressConfirmed(onDeviceAddress, address)) {
          ledgerNavigate.toErrorStep(
            'bitcoin',
            'The address shown on your Ledger does not match the one in Leather.'
          );
          return;
        }
        ledgerAnalytics.publicKeysPulledFromLedgerSuccessfully();
        void onConfirmed();
      },
      { onInteraction }
    );
  }

  const ledgerContextValue: LedgerRequestKeysContext = {
    chain: 'bitcoin',
    pullPublicKeysFromDevice: confirmAddress,
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
