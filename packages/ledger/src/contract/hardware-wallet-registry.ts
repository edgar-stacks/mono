import type { HardwareWalletConnector, HardwareWalletVendor } from './hardware-wallet';
import { HardwareWalletError } from './hardware-wallet-error';

export interface HardwareWalletRegistry {
  vendors(): HardwareWalletVendor[];
  get(vendor: HardwareWalletVendor): HardwareWalletConnector;
}

export function createHardwareWalletRegistry(
  connectors: HardwareWalletConnector[]
): HardwareWalletRegistry {
  const connectorsByVendor = new Map(connectors.map(connector => [connector.vendor, connector]));

  return {
    vendors() {
      return [...connectorsByVendor.keys()];
    },
    get(vendor) {
      const connector = connectorsByVendor.get(vendor);
      if (!connector)
        throw new HardwareWalletError('unsupported', `No ${vendor} hardware wallet is registered`);
      return connector;
    },
  };
}
