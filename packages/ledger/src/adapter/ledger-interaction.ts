import {
  type DeviceActionIntermediateValue,
  UserInteractionRequired,
} from '@ledgerhq/device-management-kit';

import type { HardwareWalletInteraction, OperationContext } from '../contract/hardware-wallet';
import type { LedgerDeviceActionOptions } from '../dmk/ledger-device-action';

const noInteraction: string = UserInteractionRequired.None;
const unlockDeviceInteraction: string = UserInteractionRequired.UnlockDevice;
const confirmOpenAppInteraction: string = UserInteractionRequired.ConfirmOpenApp;
const registerWalletInteraction: string = UserInteractionRequired.RegisterWallet;
const verifyAddressInteraction: string = UserInteractionRequired.VerifyAddress;

export function toHardwareWalletInteraction(
  interaction: string,
  appName: string | null = null
): HardwareWalletInteraction {
  if (interaction === noInteraction) return { type: 'none' };
  if (interaction === unlockDeviceInteraction) return { type: 'unlock-device' };
  if (interaction === confirmOpenAppInteraction) return { type: 'open-app', appName };
  if (interaction === registerWalletInteraction) return { type: 'approve-policy' };
  if (interaction === verifyAddressInteraction) return { type: 'verify-address' };
  return { type: 'confirm-on-device' };
}

export function toLedgerDeviceActionOptions<Intermediate extends DeviceActionIntermediateValue>(
  { signal, onInteraction }: OperationContext,
  appName: string | null = null
): LedgerDeviceActionOptions<Intermediate> {
  return {
    signal,
    onRequiredUserInteraction(interaction) {
      onInteraction?.(toHardwareWalletInteraction(interaction, appName));
    },
  };
}
