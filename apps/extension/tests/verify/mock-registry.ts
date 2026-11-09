import type { BrowserContext, Page } from '@playwright/test';
import { setupMockApis } from '@tests/mocks/mock-apis';
import { mockTestAccountBtcBroadcastTransaction } from '@tests/mocks/mock-bitcoin-tx';
import { mockEmptyLeatherApiUtxosRequest } from '@tests/mocks/mock-leather-api';
import {
  mockMixedUtxosForSend,
  mockNativeSegwitOnlyUtxosForSend,
} from '@tests/mocks/mock-mixed-utxos';
import { mockProposeMultisigTransaction } from '@tests/mocks/mock-multisig';
import { mockEmptyStacksBalancesRequest } from '@tests/mocks/mock-stacks-balances';
import { mockEmptyStacksBalancesV2Request } from '@tests/mocks/mock-stacks-balances-v2';
import {
  mockStacksBroadcastTransaction,
  mockStacksPendingTransaction,
  mockStacksRawTx,
  mockTestAccountStacksTxsRequestsWithPendingTx,
} from '@tests/mocks/mock-stacks-txs';
import { mockUnhandledRequests } from '@tests/mocks/mock-unhandled-requests';
import { mockMainnetTestAccountEmptyUtxosRequests } from '@tests/mocks/mock-utxos';

export interface VerifyMockTarget {
  readonly context: BrowserContext;
  readonly page: Page;
}

type VerifyMock = (target: VerifyMockTarget) => Promise<unknown>;

export const verifyFallbackMockName = 'mockUnhandledRequests';

export const verifyMockRegistry = {
  setupMockApis({ context }) {
    return setupMockApis(context);
  },
  mockUnhandledRequests({ context }) {
    return mockUnhandledRequests(context);
  },
  mockMixedUtxosForSend({ context }) {
    return mockMixedUtxosForSend(context);
  },
  mockNativeSegwitOnlyUtxosForSend({ context }) {
    return mockNativeSegwitOnlyUtxosForSend(context);
  },
  mockMainnetTestAccountEmptyUtxosRequests({ context }) {
    return mockMainnetTestAccountEmptyUtxosRequests(context);
  },
  mockEmptyStacksBalancesRequest({ context }) {
    return mockEmptyStacksBalancesRequest(context);
  },
  mockEmptyStacksBalancesV2Request({ context }) {
    return mockEmptyStacksBalancesV2Request(context);
  },
  mockEmptyLeatherApiUtxosRequest({ context }) {
    return mockEmptyLeatherApiUtxosRequest(context);
  },
  mockProposeMultisigTransaction({ context }) {
    return mockProposeMultisigTransaction(context);
  },
  mockTestAccountBtcBroadcastTransaction({ page }) {
    return mockTestAccountBtcBroadcastTransaction(page);
  },
  mockTestAccountStacksTxsRequestsWithPendingTx({ context }) {
    return mockTestAccountStacksTxsRequestsWithPendingTx(context);
  },
  mockStacksRawTx({ context }) {
    return mockStacksRawTx(context);
  },
  mockStacksPendingTransaction({ context }) {
    return mockStacksPendingTransaction(context);
  },
  mockStacksBroadcastTransaction({ context }) {
    return mockStacksBroadcastTransaction(context);
  },
} satisfies Record<string, VerifyMock>;

export function findVerifyMock(name: string): VerifyMock | undefined {
  const entry = Object.entries(verifyMockRegistry).find(([key]) => key === name);
  return entry?.[1];
}
