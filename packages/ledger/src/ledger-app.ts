import type { DeviceSessionId } from '@ledgerhq/device-management-kit';
import type { SignerBtc } from '@ledgerhq/device-signer-kit-bitcoin';
import type StacksApp from '@zondax/ledger-stacks';
import type { DMKTransport } from '@zondax/ledger-stacks';

export const LEDGER_APPS_MAP = {
  STACKS: 'Stacks',
  BITCOIN_MAINNET: 'Bitcoin',
  BITCOIN_TESTNET: 'Bitcoin Test',
  MAIN_MENU: 'BOLOS',
} as const;

export interface LedgerBitcoinApp {
  chain: 'bitcoin';
  signer: SignerBtc;
  sessionId: DeviceSessionId;
}

export interface LedgerStacksApp {
  chain: 'stacks';
  app: StacksApp<DMKTransport>;
  sessionId: DeviceSessionId;
}
