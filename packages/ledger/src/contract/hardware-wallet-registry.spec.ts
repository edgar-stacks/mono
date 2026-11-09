import { createHardwareWalletRegistry } from './hardware-wallet-registry';
import { makeFakeHardwareWalletConnector } from './hardware-wallet.test-utils';

function captureError(operation: () => unknown): unknown {
  try {
    operation();
  } catch (error) {
    return error;
  }
  return undefined;
}

describe(createHardwareWalletRegistry.name, () => {
  test('returns the connector registered for a vendor', () => {
    const connector = makeFakeHardwareWalletConnector();
    const registry = createHardwareWalletRegistry([connector]);

    expect(registry.get('ledger')).toBe(connector);
    expect(registry.vendors).toEqual(['ledger']);
  });

  test('throws an unsupported error for a vendor without a connector', () => {
    const registry = createHardwareWalletRegistry([]);

    expect(captureError(() => registry.get('ledger'))).toMatchObject({ kind: 'unsupported' });
    expect(registry.vendors).toEqual([]);
  });
});
