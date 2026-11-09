import { createContext, useContext } from 'react';

import {
  type HardwareWalletConnector,
  type HardwareWalletRegistry,
  type HardwareWalletVendor,
  createHardwareWalletRegistry,
} from '@leather.io/ledger';

import { createExtensionLedgerConnector } from './extension-ledger-connector';

const hardwareWalletContext = createContext<HardwareWalletRegistry | null>(null);

let hardwareWalletRegistry: HardwareWalletRegistry | null = null;

function getHardwareWalletRegistry(): HardwareWalletRegistry {
  hardwareWalletRegistry ??= createHardwareWalletRegistry([createExtensionLedgerConnector()]);
  return hardwareWalletRegistry;
}

interface HardwareWalletProviderProps {
  children: React.ReactNode;
  registry?: HardwareWalletRegistry;
}
export function HardwareWalletProvider({ children, registry }: HardwareWalletProviderProps) {
  return (
    <hardwareWalletContext.Provider value={registry ?? getHardwareWalletRegistry()}>
      {children}
    </hardwareWalletContext.Provider>
  );
}

export function useHardwareWalletConnector(
  vendor: HardwareWalletVendor = 'ledger'
): HardwareWalletConnector {
  const registry = useContext(hardwareWalletContext);
  if (!registry) throw new Error('No HardwareWalletProvider found');
  return registry.get(vendor);
}
