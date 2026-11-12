import type { HardwareWalletConnector, HardwareWalletVendor } from './hardware-wallet';

export interface HardwareWalletRegistry {
  get(vendor: HardwareWalletVendor): HardwareWalletConnector | null;
  list(): HardwareWalletConnector[];
}

export function createHardwareWalletRegistry(
  connectors: readonly HardwareWalletConnector[]
): HardwareWalletRegistry {
  const connectorsByVendor = new Map<HardwareWalletVendor, HardwareWalletConnector>();
  connectors.forEach(connector => {
    if (connectorsByVendor.has(connector.vendor))
      throw new Error(`A ${connector.vendor} hardware wallet connector is already registered`);
    connectorsByVendor.set(connector.vendor, connector);
  });

  return {
    get(vendor) {
      return connectorsByVendor.get(vendor) ?? null;
    },
    list() {
      return [...connectorsByVendor.values()];
    },
  };
}
