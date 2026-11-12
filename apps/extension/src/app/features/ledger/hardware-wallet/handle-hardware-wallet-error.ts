import { isHardwareWalletError } from '@leather.io/ledger';
import type { SupportedBlockchains } from '@leather.io/models';

import type { LedgerStacksAppVersionInfo } from '../flow/ledger-flow.types';
import type { LedgerDeviceLockState } from '../utils/generic-ledger-utils';

interface HardwareWalletErrorNavigate {
  toConnectStep(): unknown;
  toErrorStep(chain: SupportedBlockchains, errorMessage?: string): unknown;
  toDeviceDisconnectStep(): unknown;
  toOperationRejectedStep(description?: string): unknown;
  toPairDeviceStep(): unknown;
  toDevicePayloadInvalid(): unknown;
  toStacksAppOutdatedWarning(versionInfo?: LedgerStacksAppVersionInfo): unknown;
}

interface HandleHardwareWalletErrorArgs {
  chain: SupportedBlockchains;
  ledgerNavigate: HardwareWalletErrorNavigate;
  setLatestDeviceResponse(response: LedgerDeviceLockState): void;
}

export function handleHardwareWalletError(
  error: unknown,
  { chain, ledgerNavigate, setLatestDeviceResponse }: HandleHardwareWalletErrorArgs
): void {
  if (!isHardwareWalletError(error)) {
    void ledgerNavigate.toErrorStep(chain);
    return;
  }

  switch (error.kind) {
    case 'cancelled':
      return;
    case 'locked':
      setLatestDeviceResponse({ deviceLocked: true });
      void ledgerNavigate.toConnectStep();
      return;
    case 'disconnected':
      void ledgerNavigate.toDeviceDisconnectStep();
      return;
    case 'rejected':
      void ledgerNavigate.toOperationRejectedStep();
      return;
    case 'not-paired':
      void ledgerNavigate.toPairDeviceStep();
      return;
    case 'invalid-payload':
      void ledgerNavigate.toDevicePayloadInvalid();
      return;
    case 'outdated-app':
      void ledgerNavigate.toStacksAppOutdatedWarning(error.details ?? undefined);
      return;
    case 'unknown':
      void ledgerNavigate.toErrorStep(chain);
      return;
    default:
      void ledgerNavigate.toErrorStep(chain, error.message);
  }
}
