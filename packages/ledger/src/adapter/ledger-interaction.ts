import { UserInteractionRequired } from '@ledgerhq/device-management-kit';

import type { HardwareWalletInteraction } from '../contract/operation-context';

type MappedInteractionType = Exclude<
  HardwareWalletInteraction['type'],
  'open-app' | 'show-qr' | 'scan-qr'
>;

const ledgerInteractionTypes = new Map<string, MappedInteractionType>([
  [UserInteractionRequired.None, 'none'],
  [UserInteractionRequired.UnlockDevice, 'unlock-device'],
  [UserInteractionRequired.RegisterWallet, 'approve-policy'],
  [UserInteractionRequired.VerifyAddress, 'verify-address'],
  [UserInteractionRequired.VerifySafeAddress, 'verify-address'],
]);

const confirmOpenAppInteraction: string = UserInteractionRequired.ConfirmOpenApp;

export function toHardwareWalletInteraction(
  interaction: string,
  appName: string | null
): HardwareWalletInteraction {
  if (interaction === confirmOpenAppInteraction) return { type: 'open-app', appName };
  return { type: ledgerInteractionTypes.get(interaction) ?? 'confirm-on-device' };
}
