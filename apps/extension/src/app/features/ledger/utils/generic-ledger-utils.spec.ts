import type { HardwareWalletInteraction } from '@leather.io/ledger';

import {
  isCancellableConnectionInteraction,
  isUnlockDeviceInteraction,
} from './generic-ledger-utils';

const interactions: HardwareWalletInteraction[] = [
  { type: 'none' },
  { type: 'unlock-device' },
  { type: 'open-app', appName: 'Bitcoin' },
  { type: 'confirm-on-device' },
  { type: 'approve-policy' },
  { type: 'verify-address' },
];

describe(isCancellableConnectionInteraction.name, () => {
  test('lets the user cancel while the device waits to be unlocked or to open the app', () => {
    expect(interactions.filter(isCancellableConnectionInteraction)).toEqual([
      { type: 'unlock-device' },
      { type: 'open-app', appName: 'Bitcoin' },
    ]);
  });
});

describe(isUnlockDeviceInteraction.name, () => {
  test('matches only the unlock prompt', () => {
    expect(interactions.filter(isUnlockDeviceInteraction)).toEqual([{ type: 'unlock-device' }]);
  });
});
