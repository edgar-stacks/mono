import type {
  DeviceActionIntermediateValue,
  ExecuteDeviceActionReturnType,
} from '@ledgerhq/device-management-kit';

import type { OperationContext } from '../contract/operation-context';
import {
  type LedgerDeviceActionOptions,
  type RunLedgerDeviceAction,
  runLedgerDeviceAction,
} from '../dmk/ledger-device-action';
import { toHardwareWalletInteraction } from './ledger-interaction';

export function makeLedgerActionRunner(
  ctx: OperationContext,
  appName: string | null
): RunLedgerDeviceAction {
  return async function runLedgerActionInContext<
    Output,
    Error,
    Intermediate extends DeviceActionIntermediateValue,
  >(
    action: ExecuteDeviceActionReturnType<Output, Error, Intermediate>,
    options?: LedgerDeviceActionOptions<Intermediate>
  ): Promise<Output> {
    const handle = runLedgerDeviceAction(action, {
      onRequiredUserInteraction(interaction) {
        options?.onRequiredUserInteraction?.(interaction);
        ctx.onInteraction?.(toHardwareWalletInteraction(interaction, appName));
      },
    });

    function cancel() {
      handle.cancel();
    }

    if (ctx.signal.aborted) cancel();
    else ctx.signal.addEventListener('abort', cancel, { once: true });

    try {
      return await handle.result;
    } finally {
      ctx.signal.removeEventListener('abort', cancel);
    }
  };
}
