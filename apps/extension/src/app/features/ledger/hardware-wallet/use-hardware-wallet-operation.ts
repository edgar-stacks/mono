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

import { useLedgerSteps } from '../flow/ledger-flow.context';
import {
  isCancellableConnectionInteraction,
  isUnlockDeviceInteraction,
  useLedgerResponseState,
} from '../utils/generic-ledger-utils';
import { handleHardwareWalletError } from './handle-hardware-wallet-error';
import { useHardwareWalletConnector } from './hardware-wallet.context';

const checkingAppVersionDelayMs = 1_000;
export const txSigningCheckingAppVersionDelayMs = 500;
const connectionSuccessDelayMs = 1_250;

interface UseHardwareWalletOperationArgs {
  chain: SupportedBlockchains;
  checkingAppVersionDelay?: number;
}

interface RunHardwareWalletOperationOptions {
  onInteraction?(interaction: HardwareWalletInteraction): void;
}

type HardwareWalletOperation<T> = (wallet: HardwareWallet, ctx: OperationContext) => Promise<T>;

export function useHardwareWalletOperation({
  chain,
  checkingAppVersionDelay = checkingAppVersionDelayMs,
}: UseHardwareWalletOperationArgs) {
  const connector = useHardwareWalletConnector();
  const ledgerNavigate = useLedgerSteps();
  const [latestDeviceResponse, setLatestDeviceResponse] = useLedgerResponseState();
  const [awaitingDeviceConnection, setAwaitingDeviceConnection] = useState(false);
  const [isConnectionCancellable, setIsConnectionCancellable] = useState(false);
  const activeOperation = useRef<AbortController | null>(null);

  async function run<T>(
    request: ConnectRequest,
    operation: HardwareWalletOperation<T>,
    { onInteraction }: RunHardwareWalletOperationOptions = {}
  ): Promise<T | undefined> {
    activeOperation.current?.abort();
    const controller = new AbortController();
    activeOperation.current = controller;
    let connected = false;

    const ctx: OperationContext = {
      signal: controller.signal,
      onInteraction(interaction) {
        if (connected) {
          onInteraction?.(interaction);
          return;
        }
        setLatestDeviceResponse({ deviceLocked: isUnlockDeviceInteraction(interaction) });
        setIsConnectionCancellable(isCancellableConnectionInteraction(interaction));
      },
    };

    try {
      setLatestDeviceResponse({ deviceLocked: false });
      setAwaitingDeviceConnection(true);
      return await withHardwareWallet(connector, request, ctx, async wallet => {
        connected = true;
        setIsConnectionCancellable(false);
        // Show checking version page immediately
        ledgerNavigate.toCheckingAppVersion();
        await delay(checkingAppVersionDelay);
        setAwaitingDeviceConnection(false);
        ledgerNavigate.toConnectionSuccessStep(chain);
        await delay(connectionSuccessDelayMs);
        return operation(wallet, ctx);
      });
    } catch (error) {
      setAwaitingDeviceConnection(false);
      setIsConnectionCancellable(false);
      handleHardwareWalletError(error, { chain, ledgerNavigate, setLatestDeviceResponse });
      return undefined;
    } finally {
      if (activeOperation.current === controller) activeOperation.current = null;
    }
  }

  function cancel() {
    activeOperation.current?.abort();
    activeOperation.current = null;
  }

  return {
    run,
    cancel,
    latestDeviceResponse,
    awaitingDeviceConnection,
    isConnectionCancellable,
  };
}
