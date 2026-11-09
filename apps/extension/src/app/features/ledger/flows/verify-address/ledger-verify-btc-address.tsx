import { useNavigate } from 'react-router';

import {
  type HardwareBitcoinSigner,
  type HardwareWalletInteraction,
  type OperationContext,
  getBitcoinSigner,
  isHardwareWalletError,
  isLedgerOnDeviceAddressConfirmed,
  toLedgerDisplayedAddress,
} from '@leather.io/ledger';

import { RouteUrls } from '@shared/route-urls';
import { analytics } from '@shared/utils/analytics';

import { useLedgerFlow, useLedgerSteps } from '@app/features/ledger/flow/ledger-flow.context';
import type { VerifyAddressVariant } from '@app/features/ledger/flow/ledger-flow.types';
import { type LedgerRequestKeysContext } from '@app/features/ledger/generic-flows/request-keys/ledger-request-keys.context';
import { RequestKeysFlow } from '@app/features/ledger/generic-flows/request-keys/request-keys-flow';
import { useHardwareWalletOperation } from '@app/features/ledger/hardware-wallet/use-hardware-wallet-operation';
import { useDisplayLedgerDescriptorAddress } from '@app/features/ledger/hooks/use-display-ledger-descriptor-address';
import { useLedgerAnalytics } from '@app/features/ledger/hooks/use-ledger-analytics.hook';
import {
  registerLedgerWalletPolicyPrompt,
  useCancelLedgerAction,
} from '@app/features/ledger/utils/generic-ledger-utils';
import { toastDurations, useToast } from '@app/features/toasts/use-toast';
import { useCurrentAccountId } from '@app/store/accounts/account';
import { useZeroIndexTaprootAddress } from '@app/store/accounts/blockchain/bitcoin/bitcoin.hooks';
import { useCurrentAccountNativeSegwitAddressIndexZero } from '@app/store/accounts/blockchain/bitcoin/native-segwit-account.hooks';
import { useCurrentNetwork } from '@app/store/networks/networks.selectors';
import { useCurrentPolicy } from '@app/store/policy/policy.selectors';

const deviceStatesThatInterruptVerification: readonly string[] = ['locked', 'cancelled'];

interface LedgerVerifyBtcAddressProps {
  variant: Exclude<VerifyAddressVariant, 'stx'>;
}
export function LedgerVerifyBtcAddress({ variant }: LedgerVerifyBtcAddressProps) {
  const navigate = useNavigate();
  const toast = useToast();
  const ledgerNavigate = useLedgerSteps();
  const ledgerAnalytics = useLedgerAnalytics();
  const { close } = useLedgerFlow();
  const network = useCurrentNetwork();
  const { accountIndex } = useCurrentAccountId();
  const nativeSegwitAddress = useCurrentAccountNativeSegwitAddressIndexZero();
  const taprootAddress = useZeroIndexTaprootAddress();
  const policy = useCurrentPolicy();
  const displayLedgerDescriptorAddress = useDisplayLedgerDescriptorAddress();

  const bitcoinPolicy = policy?.chain === 'bitcoin' ? policy : undefined;

  const { run, cancel, latestDeviceResponse, awaitingDeviceConnection, isConnectionCancellable } =
    useHardwareWalletOperation({ chain: 'bitcoin' });

  function getExpectedAddress() {
    if (variant === 'btcMultisig') return bitcoinPolicy?.address ?? null;
    if (variant === 'btcTaproot') return taprootAddress;
    return nativeSegwitAddress;
  }

  function toConfirmAddressStep(expectedAddress: string | null) {
    ledgerNavigate.toDeviceBusyStep(
      'Confirm the address on your Ledger…',
      expectedAddress ? toLedgerDisplayedAddress(expectedAddress) : undefined
    );
  }

  async function displayAddressOnDevice(signer: HardwareBitcoinSigner, ctx: OperationContext) {
    if (variant === 'btcMultisig') {
      if (!bitcoinPolicy) throw new Error('No active bitcoin multisig policy to verify');
      return displayLedgerDescriptorAddress(signer, bitcoinPolicy.descriptor, ctx);
    }
    return signer.showAddress(
      {
        kind: 'default',
        paymentType: variant === 'btcTaproot' ? 'p2tr' : 'p2wpkh',
        network: network.chain.bitcoin.mode,
        accountIndex,
      },
      ctx
    );
  }

  function trackVerification(verified: boolean) {
    analytics.track('address_verification_completed', { type: variant, verified });
  }

  async function verifyAddress() {
    const expectedAddress = getExpectedAddress();

    function onInteraction(interaction: HardwareWalletInteraction) {
      if (interaction.type === 'approve-policy')
        ledgerNavigate.toDeviceBusyStep(registerLedgerWalletPolicyPrompt);
      if (interaction.type === 'verify-address') toConfirmAddressStep(expectedAddress);
    }

    await run(
      { chain: 'bitcoin', network: network.chain.bitcoin.mode },
      async (wallet, ctx) => {
        toConfirmAddressStep(expectedAddress);
        try {
          const onDeviceAddress = await displayAddressOnDevice(getBitcoinSigner(wallet), ctx);
          if (!isLedgerOnDeviceAddressConfirmed(onDeviceAddress, expectedAddress)) {
            trackVerification(false);
            ledgerNavigate.toErrorStep(
              'bitcoin',
              'The address shown on your Ledger does not match the one in Leather.'
            );
            return;
          }
        } catch (e) {
          if (isHardwareWalletError(e) && deviceStatesThatInterruptVerification.includes(e.kind))
            throw e;
          trackVerification(false);
          ledgerNavigate.toErrorStep(
            'bitcoin',
            'Address verification was not completed on the device.'
          );
          return;
        }
        trackVerification(true);
        ledgerAnalytics.publicKeysPulledFromLedgerSuccessfully();
        toast.success('Address verified on your Ledger', { duration: toastDurations.standard });
        close();
        void navigate(RouteUrls.Home, { replace: true });
      },
      { onInteraction }
    );
  }

  const ledgerContextValue: LedgerRequestKeysContext = {
    chain: 'bitcoin',
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
