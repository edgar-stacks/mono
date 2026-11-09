import { UserInteractionRequired } from '@ledgerhq/device-management-kit';

import { toHardwareWalletInteraction, toLedgerDeviceActionOptions } from './ledger-interaction';

describe(toHardwareWalletInteraction.name, () => {
  test.each([
    [UserInteractionRequired.None, { type: 'none' }],
    [UserInteractionRequired.UnlockDevice, { type: 'unlock-device' }],
    [UserInteractionRequired.ConfirmOpenApp, { type: 'open-app', appName: 'Bitcoin' }],
    [UserInteractionRequired.RegisterWallet, { type: 'approve-policy' }],
    [UserInteractionRequired.VerifyAddress, { type: 'verify-address' }],
    [UserInteractionRequired.SignTransaction, { type: 'confirm-on-device' }],
    [UserInteractionRequired.SignPersonalMessage, { type: 'confirm-on-device' }],
  ])('maps the %s device interaction', (interaction, expected) => {
    expect(toHardwareWalletInteraction(interaction, 'Bitcoin')).toEqual(expected);
  });

  test('reports an unknown app name when none is being opened', () => {
    expect(toHardwareWalletInteraction(UserInteractionRequired.ConfirmOpenApp)).toEqual({
      type: 'open-app',
      appName: null,
    });
  });
});

describe(toLedgerDeviceActionOptions.name, () => {
  test('forwards the signal and reports device interactions through the context', () => {
    const controller = new AbortController();
    const onInteraction = vi.fn();

    const options = toLedgerDeviceActionOptions(
      { signal: controller.signal, onInteraction },
      'Stacks'
    );
    options.onRequiredUserInteraction?.(UserInteractionRequired.ConfirmOpenApp);

    expect(options.signal).toBe(controller.signal);
    expect(onInteraction).toHaveBeenCalledWith({ type: 'open-app', appName: 'Stacks' });
  });

  test('tolerates a context without an interaction listener', () => {
    const options = toLedgerDeviceActionOptions({});

    expect(() =>
      options.onRequiredUserInteraction?.(UserInteractionRequired.UnlockDevice)
    ).not.toThrow();
  });
});
