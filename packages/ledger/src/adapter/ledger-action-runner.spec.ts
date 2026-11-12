import {
  type DeviceActionState,
  DeviceActionStatus,
  type ExecuteDeviceActionReturnType,
  UserInteractionRequired,
} from '@ledgerhq/device-management-kit';
import { Subject, of } from 'rxjs';

import { makeFakeOperationContext } from '../contract/hardware-wallet.test-utils';
import { isLedgerActionCancelledError } from '../dmk/ledger-dmk-errors';
import { makeLedgerActionRunner } from './ledger-action-runner';

interface Interaction {
  requiredUserInteraction: string;
}

type State = DeviceActionState<string, never, Interaction>;

function pending(requiredUserInteraction: string): State {
  return { status: DeviceActionStatus.Pending, intermediateValue: { requiredUserInteraction } };
}

function completed(output: string): State {
  return { status: DeviceActionStatus.Completed, output };
}

function makeCancellableAction() {
  const states = new Subject<State>();
  const action: ExecuteDeviceActionReturnType<string, never, Interaction> = {
    observable: states,
    cancel: vi.fn(() => states.next({ status: DeviceActionStatus.Stopped })),
  };
  return { action, states };
}

describe(makeLedgerActionRunner.name, () => {
  test('resolves with the action output and reports interactions to the context', async () => {
    const ctx = makeFakeOperationContext();
    const onRequiredUserInteraction = vi.fn();
    const runAction = makeLedgerActionRunner(ctx, 'Stacks');

    await expect(
      runAction(
        {
          observable: of(pending(UserInteractionRequired.ConfirmOpenApp), completed('done')),
          cancel: vi.fn(),
        },
        { onRequiredUserInteraction }
      )
    ).resolves.toBe('done');

    expect(onRequiredUserInteraction).toHaveBeenCalledWith(UserInteractionRequired.ConfirmOpenApp);
    expect(ctx.onInteraction).toHaveBeenCalledWith({ type: 'open-app', appName: 'Stacks' });
  });

  test('cancels the device action when the operation is aborted', async () => {
    const controller = new AbortController();
    const { action, states } = makeCancellableAction();
    const running = makeLedgerActionRunner(
      makeFakeOperationContext({ signal: controller.signal }),
      null
    )(action);
    states.next(pending(UserInteractionRequired.SignTransaction));

    controller.abort();

    await expect(running).rejects.toSatisfy(isLedgerActionCancelledError);
    expect(action.cancel).toHaveBeenCalledOnce();
  });

  test('cancels a device action started after the operation was aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    const { action } = makeCancellableAction();

    await expect(
      makeLedgerActionRunner(makeFakeOperationContext({ signal: controller.signal }), null)(action)
    ).rejects.toSatisfy(isLedgerActionCancelledError);
    expect(action.cancel).toHaveBeenCalledOnce();
  });

  test('stops listening for aborts once the action settles', async () => {
    const controller = new AbortController();
    const { action, states } = makeCancellableAction();
    const running = makeLedgerActionRunner(
      makeFakeOperationContext({ signal: controller.signal }),
      null
    )(action);
    states.next(completed('done'));
    await running;

    controller.abort();

    expect(action.cancel).not.toHaveBeenCalled();
  });
});
