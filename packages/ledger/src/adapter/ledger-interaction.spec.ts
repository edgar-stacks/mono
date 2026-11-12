import { UserInteractionRequired } from '@ledgerhq/device-management-kit';

import { toHardwareWalletInteraction } from './ledger-interaction';

describe(toHardwareWalletInteraction.name, () => {
  test.each([
    [UserInteractionRequired.None, { type: 'none' }],
    [UserInteractionRequired.UnlockDevice, { type: 'unlock-device' }],
    [UserInteractionRequired.ConfirmOpenApp, { type: 'open-app', appName: 'Bitcoin' }],
    [UserInteractionRequired.RegisterWallet, { type: 'approve-policy' }],
    [UserInteractionRequired.VerifyAddress, { type: 'verify-address' }],
    [UserInteractionRequired.VerifySafeAddress, { type: 'verify-address' }],
    [UserInteractionRequired.SignTransaction, { type: 'confirm-on-device' }],
    [UserInteractionRequired.SignPersonalMessage, { type: 'confirm-on-device' }],
    [UserInteractionRequired.AllowSecureConnection, { type: 'confirm-on-device' }],
  ])('maps the %s interaction', (interaction, expected) => {
    expect(toHardwareWalletInteraction(interaction, 'Bitcoin')).toEqual(expected);
  });

  test('keeps an unknown app name for the open-app interaction', () => {
    expect(toHardwareWalletInteraction(UserInteractionRequired.ConfirmOpenApp, null)).toEqual({
      type: 'open-app',
      appName: null,
    });
  });
});
