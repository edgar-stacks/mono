import { useNavigate } from 'react-router';

import { getBitcoinSigner } from '@leather.io/ledger';
import { delay, makeNumberRange } from '@leather.io/utils';

import { useLedgerFlow, useLedgerSteps } from '@app/features/ledger/flow/ledger-flow.context';
import { type LedgerRequestKeysContext } from '@app/features/ledger/generic-flows/request-keys/ledger-request-keys.context';
import {
  RequestKeysFlow,
  defaultNumberOfKeysToPullFromLedgerDevice,
} from '@app/features/ledger/generic-flows/request-keys/request-keys-flow';
import { useHardwareWalletOperation } from '@app/features/ledger/hardware-wallet/use-hardware-wallet-operation';
import { useLedgerAnalytics } from '@app/features/ledger/hooks/use-ledger-analytics.hook';
import { useCancelLedgerAction } from '@app/features/ledger/utils/generic-ledger-utils';
import { useToast } from '@app/features/toasts/use-toast';
import { useAppDispatch } from '@app/store';
import { activateFirstVisibleAccount } from '@app/store/active/active.actions';
import { useBitcoinKeychainDescriptors } from '@app/store/keychains/keychain.selectors';
import { useCurrentNetwork } from '@app/store/networks/networks.selectors';
import { addOrMigrateLedgerKeychains } from '@app/store/wallets/wallet.actions';
import {
  getAddWalletError,
  getUnmigratedLegacyLedgerError,
  useWalletEntities,
} from '@app/store/wallets/wallet.selectors';

const keyStandardLabels = { p2wpkh: 'Native Segwit', p2tr: 'Taproot' } as const;

export function LedgerRequestBitcoinKeys() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const toast = useToast();
  const wallets = useWalletEntities();
  const btcKeychainDescriptors = useBitcoinKeychainDescriptors();

  const ledgerNavigate = useLedgerSteps();
  const ledgerAnalytics = useLedgerAnalytics();
  const { close } = useLedgerFlow();
  const network = useCurrentNetwork();

  const chain = 'bitcoin';

  const { run, cancel, latestDeviceResponse, awaitingDeviceConnection, isConnectionCancellable } =
    useHardwareWalletOperation({ chain });

  async function requestKeys() {
    await run(async (wallet, ctx) => {
      const { keys, fingerprint } = await getBitcoinSigner(wallet).requestAccountKeys(
        {
          network: network.chain.bitcoin.mode,
          accountIndexes: makeNumberRange(defaultNumberOfKeysToPullFromLedgerDevice),
          onRequestKey({ standard, accountIndex }) {
            ledgerNavigate.toDeviceBusyStep(
              `Requesting Bitcoin ${keyStandardLabels[standard]} address (${accountIndex + 1}…${defaultNumberOfKeysToPullFromLedgerDevice})`
            );
          },
        },
        ctx
      );
      await delay(250);

      const addWalletError =
        getAddWalletError(wallets, fingerprint, 'ledger') ??
        getUnmigratedLegacyLedgerError(wallets, fingerprint);
      if (addWalletError) {
        toast.error(addWalletError);
        ledgerNavigate.toErrorStep(chain, addWalletError);
        return;
      }

      const keychains = keys
        .map(key => ({ chain: 'bitcoin' as const, descriptor: key.policy }))
        .filter(keychain => {
          return !btcKeychainDescriptors.includes(keychain.descriptor);
        });

      await dispatch(addOrMigrateLedgerKeychains({ fingerprint, accountKeychains: keychains }));
      void dispatch(activateFirstVisibleAccount(fingerprint));
      ledgerAnalytics.publicKeysPulledFromLedgerSuccessfully();
      close();
      void navigate('/', { replace: true });
    });
  }

  const ledgerContextValue: LedgerRequestKeysContext = {
    chain: 'bitcoin',
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
      onCancelAction={cancel}
    />
  );
}
