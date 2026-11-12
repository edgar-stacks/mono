import { createContext, useContext } from 'react';

import {
  type HardwareWalletRegistry,
  type HardwareWalletVendor,
  createHardwareWalletRegistry,
} from '@leather.io/ledger';

import { createExtensionLedgerConnector } from './create-extension-ledger-connector';

const hardwareWalletRegistryContext = createContext<HardwareWalletRegistry | null>(null);

let hardwareWalletRegistry: HardwareWalletRegistry | null = null;

function getHardwareWalletRegistry(): HardwareWalletRegistry {
  hardwareWalletRegistry ??= createHardwareWalletRegistry([createExtensionLedgerConnector()]);
  return hardwareWalletRegistry;
}

interface HardwareWalletProviderProps {
  children: React.ReactNode;
}
export function HardwareWalletProvider({ children }: HardwareWalletProviderProps) {
  return (
    <hardwareWalletRegistryContext.Provider value={getHardwareWalletRegistry()}>
      {children}
    </hardwareWalletRegistryContext.Provider>
  );
}

export function useHardwareWalletConnector(vendor: HardwareWalletVendor = 'ledger') {
  const registry = useContext(hardwareWalletRegistryContext);
  const connector = registry?.get(vendor);
  if (!connector) throw new Error(`No ${vendor} hardware wallet connector found`);
  return connector;
}
