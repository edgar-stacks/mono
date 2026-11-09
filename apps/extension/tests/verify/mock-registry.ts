import type { BrowserContext, Page } from '@playwright/test';
import { setupMockApis } from '@tests/mocks/mock-apis';
import { mockTestAccountBtcBroadcastTransaction } from '@tests/mocks/mock-bitcoin-tx';
import {
  mockMixedUtxosForSend,
  mockNativeSegwitOnlyUtxosForSend,
} from '@tests/mocks/mock-mixed-utxos';
import { mockProposeMultisigTransaction } from '@tests/mocks/mock-multisig';
import {
  mockEmptyStacksBalancesRequest,
  mockMainnetTestAccountStacksBalancesRequest,
} from '@tests/mocks/mock-stacks-balances';
import {
  mockStacksBroadcastTransaction,
  mockStacksPendingTransaction,
  mockStacksRawTx,
  mockTestAccountStacksTxsRequestsWithPendingTx,
} from '@tests/mocks/mock-stacks-txs';
import { mockUnhandledRequests } from '@tests/mocks/mock-unhandled-requests';
import {
  mockMainnetTestAccountBitcoinRequests,
  mockMainnetTestAccountEmptyUtxosRequests,
} from '@tests/mocks/mock-utxos';

export interface MockTargets {
  readonly context: BrowserContext;
  readonly page: Page;
}

type ApplyMock = (targets: MockTargets) => Promise<void>;

export const fallbackMockName = 'mockUnhandledRequests';

export const verifyMockRegistry: Readonly<Record<string, ApplyMock>> = {
  async mockUnhandledRequests({ context }) {
    await mockUnhandledRequests(context);
  },
  async setupMockApis({ context }) {
    await setupMockApis(context);
  },
  async mockTestAccountStacksTxsRequestsWithPendingTx({ context }) {
    await mockTestAccountStacksTxsRequestsWithPendingTx(context);
  },
  async mockStacksRawTx({ context }) {
    await mockStacksRawTx(context);
  },
  async mockStacksPendingTransaction({ context }) {
    await mockStacksPendingTransaction(context);
  },
  async mockStacksBroadcastTransaction({ context }) {
    await mockStacksBroadcastTransaction(context);
  },
  async mockTestAccountBtcBroadcastTransaction({ page }) {
    await mockTestAccountBtcBroadcastTransaction(page);
  },
  async mockProposeMultisigTransaction({ context }) {
    await mockProposeMultisigTransaction(context);
  },
  async mockMixedUtxosForSend({ context }) {
    await mockMixedUtxosForSend(context);
  },
  async mockNativeSegwitOnlyUtxosForSend({ context }) {
    await mockNativeSegwitOnlyUtxosForSend(context);
  },
  async mockEmptyStacksBalancesRequest({ context }) {
    await mockEmptyStacksBalancesRequest(context);
  },
  async mockMainnetTestAccountStacksBalancesRequest({ context }) {
    await mockMainnetTestAccountStacksBalancesRequest(context);
  },
  async mockMainnetTestAccountEmptyUtxosRequests({ context }) {
    await mockMainnetTestAccountEmptyUtxosRequests(context);
  },
  async mockMainnetTestAccountBitcoinRequests({ context }) {
    await mockMainnetTestAccountBitcoinRequests(context);
  },
};

export function findMock(name: string): ApplyMock | undefined {
  return Object.hasOwn(verifyMockRegistry, name) ? verifyMockRegistry[name] : undefined;
}

export function orderMocks(names: readonly string[]): string[] {
  const unique = [...new Set(names)];
  return [
    ...unique.filter(name => name === fallbackMockName),
    ...unique.filter(name => name !== fallbackMockName),
  ];
}
