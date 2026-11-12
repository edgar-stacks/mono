import { isCancellableConnectionInteraction } from './generic-ledger-utils';

describe(isCancellableConnectionInteraction.name, () => {
  test.each([
    [{ type: 'unlock-device' } as const],
    [{ type: 'open-app', appName: 'Stacks' } as const],
  ])('lets the user cancel while the device waits for %o', interaction => {
    expect(isCancellableConnectionInteraction(interaction)).toBe(true);
  });

  test.each([
    [{ type: 'none' } as const],
    [{ type: 'confirm-on-device' } as const],
    [{ type: 'approve-policy' } as const],
  ])('keeps the connection uncancellable for %o', interaction => {
    expect(isCancellableConnectionInteraction(interaction)).toBe(false);
  });
});
