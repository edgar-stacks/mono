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
import { useLedgerResponseState } from '../utils/generic-ledger-utils';
import { handleHardwareWalletError } from './handle-hardware-wallet-error';
import { useHardwareWalletConnector } from './hardware-wallet.context';

const checkingAppVersionDelayMs = 500;
const connectionSuccessDelayMs = 1250;

const cancellableConnectionInteractions: readonly HardwareWalletInteraction['type'][] = [
  'unlock-device',
  'open-app',
];

type HardwareWalletOperation<Result> = (
  wallet: HardwareWallet,
  ctx: OperationContext
) => Promise<Result>;

export function useHardwareWalletOperation(chain: SupportedBlockchains) {
  const connector = useHardwareWalletConnector();
  const ledgerNavigate = useLedgerSteps();
  const [latestDeviceResponse, setLatestDeviceResponse] = useLedgerResponseState();
  const [awaitingDeviceConnection, setAwaitingDeviceConnection] = useState(false);
  const [isConnectionCancellable, setIsConnectionCancellable] = useState(false);
  const activeOperation = useRef<AbortController | null>(null);

  async function run<Result>(
    request: ConnectRequest,
    operation: HardwareWalletOperation<Result>
  ): Promise<Result | undefined> {
    const controller = new AbortController();
    activeOperation.current = controller;
    let isConnected = false;

    function onConnectionInteraction({ type }: HardwareWalletInteraction) {
      if (isConnected) return;
      setLatestDeviceResponse({ deviceLocked: type === 'unlock-device' });
      setIsConnectionCancellable(cancellableConnectionInteractions.includes(type));
    }

    try {
      setLatestDeviceResponse({ deviceLocked: false });
      setAwaitingDeviceConnection(true);
      return await withHardwareWallet(
        connector,
        request,
        { signal: controller.signal, onInteraction: onConnectionInteraction },
        async wallet => {
          isConnected = true;
          setIsConnectionCancellable(false);
          ledgerNavigate.toCheckingAppVersion();
          await delay(checkingAppVersionDelayMs);
          setAwaitingDeviceConnection(false);
          ledgerNavigate.toConnectionSuccessStep(chain);
          await delay(connectionSuccessDelayMs);
          return operation(wallet, { signal: controller.signal });
        }
      );
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
