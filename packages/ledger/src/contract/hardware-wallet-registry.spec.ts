import { createHardwareWalletRegistry } from './hardware-wallet-registry';
import { makeFakeHardwareWalletConnector } from './hardware-wallet.test-utils';

describe(createHardwareWalletRegistry.name, () => {
  test('looks connectors up by vendor', () => {
    const connector = makeFakeHardwareWalletConnector();
    const registry = createHardwareWalletRegistry([connector]);

    expect(registry.get('ledger')).toBe(connector);
    expect(registry.list()).toEqual([connector]);
  });

  test('returns null for a vendor without a connector', () => {
    expect(createHardwareWalletRegistry([]).get('ledger')).toBeNull();
  });

  test('refuses two connectors for the same vendor', () => {
    expect(() =>
      createHardwareWalletRegistry([
        makeFakeHardwareWalletConnector(),
        makeFakeHardwareWalletConnector(),
      ])
    ).toThrow('A ledger hardware wallet connector is already registered');
  });
});
