import {
  type DeviceActionState,
  DeviceActionStatus,
  type ExecuteDeviceActionReturnType,
  UserInteractionRequired,
} from '@ledgerhq/device-management-kit';
import { Subject, of } from 'rxjs';

import { makeFakeOperationContext } from '../contract/hardware-wallet.test-utils';
import { makeRunLedgerDeviceAction, toHardwareWalletInteraction } from './ledger-interaction';

describe(toHardwareWalletInteraction.name, () => {
  test.each([
    [UserInteractionRequired.None, { type: 'none' }],
    [UserInteractionRequired.UnlockDevice, { type: 'unlock-device' }],
    [UserInteractionRequired.ConfirmOpenApp, { type: 'open-app', appName: 'Bitcoin' }],
    [UserInteractionRequired.RegisterWallet, { type: 'approve-policy' }],
    [UserInteractionRequired.VerifyAddress, { type: 'verify-address' }],
    [UserInteractionRequired.SignTransaction, { type: 'confirm-on-device' }],
    [UserInteractionRequired.SignPersonalMessage, { type: 'confirm-on-device' }],
  ])('maps the %s interaction', (interaction, expected) => {
    expect(toHardwareWalletInteraction(interaction, 'Bitcoin')).toEqual(expected);
  });
});

interface Interaction {
  requiredUserInteraction: string;
}

describe(makeRunLedgerDeviceAction.name, () => {
  test('reports device interactions through the operation context', async () => {
    const onInteraction = vi.fn();
    const runAction = makeRunLedgerDeviceAction(makeFakeOperationContext({ onInteraction }), null);
    const pending: DeviceActionState<string, never, Interaction> = {
      status: DeviceActionStatus.Pending,
      intermediateValue: { requiredUserInteraction: UserInteractionRequired.UnlockDevice },
    };
    const completed: DeviceActionState<string, never, Interaction> = {
      status: DeviceActionStatus.Completed,
      output: 'done',
    };
    const action: ExecuteDeviceActionReturnType<string, never, Interaction> = {
      observable: of(pending, completed),
      cancel: vi.fn(),
    };

    await expect(runAction(action)).resolves.toBe('done');
    expect(onInteraction).toHaveBeenCalledWith({ type: 'unlock-device' });
  });

  test('cancels the device action when the operation is aborted', async () => {
    const controller = new AbortController();
    const runAction = makeRunLedgerDeviceAction(
      makeFakeOperationContext({ signal: controller.signal }),
      null
    );
    const cancel = vi.fn();
    const running = runAction({ observable: new Subject<never>(), cancel });

    controller.abort();

    await expect(running).rejects.toMatchObject({ name: 'LedgerActionCancelled' });
    expect(cancel).toHaveBeenCalledOnce();
  });
});
