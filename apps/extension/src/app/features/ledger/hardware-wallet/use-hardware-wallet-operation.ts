import { useRef, useState } from 'react';

import {
  type ConnectRequest,
  type HardwareWallet,
  type HardwareWalletInteraction,
  type OperationContext,
  withHardwareWallet,
} from '@leather.io/ledger';
import type { SupportedBlockchains } from '@leather.io/models';
import { delay } from '@leather.io/utils';

import { useCurrentNetwork } from '@app/store/networks/networks.selectors';

import { useLedgerSteps } from '../flow/ledger-flow.context';
import {
  isCancellableConnectionInteraction,
  useLedgerResponseState,
} from '../utils/generic-ledger-utils';
import { handleHardwareWalletError } from './handle-hardware-wallet-error';
import { useHardwareWalletConnector } from './hardware-wallet.context';

const defaultCheckingAppVersionDelayMs = 1000;
const connectionSuccessDelayMs = 1250;

type HardwareWalletOperation = (wallet: HardwareWallet, ctx: OperationContext) => Promise<void>;

interface UseHardwareWalletOperationArgs {
  chain: SupportedBlockchains;
  checkingAppVersionDelayMs?: number;
  onInteraction?(interaction: HardwareWalletInteraction): void;
}
export function useHardwareWalletOperation({
  chain,
  checkingAppVersionDelayMs = defaultCheckingAppVersionDelayMs,
  onInteraction,
}: UseHardwareWalletOperationArgs) {
  const connector = useHardwareWalletConnector();
  const network = useCurrentNetwork();
  const ledgerNavigate = useLedgerSteps();
  const [latestDeviceResponse, setLatestDeviceResponse] = useLedgerResponseState();
  const [awaitingDeviceConnection, setAwaitingDeviceConnection] = useState(false);
  const [isConnectionCancellable, setIsConnectionCancellable] = useState(false);
  const activeAbortController = useRef<AbortController | null>(null);

  function makeConnectRequest(): ConnectRequest {
    if (chain === 'bitcoin') return { chain, network: network.chain.bitcoin.mode };
    return { chain };
  }

  async function run(operation: HardwareWalletOperation) {
    const abortController = new AbortController();
    activeAbortController.current = abortController;
    let isConnecting = true;
    const ctx: OperationContext = {
      signal: abortController.signal,
      onInteraction(interaction) {
        if (!isConnecting) {
          onInteraction?.(interaction);
          return;
        }
        setLatestDeviceResponse({ deviceLocked: interaction.type === 'unlock-device' });
        setIsConnectionCancellable(isCancellableConnectionInteraction(interaction));
      },
    };

    try {
      setLatestDeviceResponse({ deviceLocked: false });
      setAwaitingDeviceConnection(true);
      await withHardwareWallet(connector, makeConnectRequest(), ctx, async wallet => {
        isConnecting = false;
        setIsConnectionCancellable(false);
        ledgerNavigate.toCheckingAppVersion();
        await delay(checkingAppVersionDelayMs);
        setAwaitingDeviceConnection(false);
        ledgerNavigate.toConnectionSuccessStep(chain);
        await delay(connectionSuccessDelayMs);
        await operation(wallet, ctx);
      });
    } catch (error) {
      setAwaitingDeviceConnection(false);
      setIsConnectionCancellable(false);
      handleHardwareWalletError(error, { chain, ledgerNavigate, setLatestDeviceResponse });
    } finally {
      if (activeAbortController.current === abortController) activeAbortController.current = null;
    }
  }

  function cancel() {
    activeAbortController.current?.abort();
  }

  return {
    run,
    cancel,
    latestDeviceResponse,
    awaitingDeviceConnection,
    isConnectionCancellable,
  };
}
