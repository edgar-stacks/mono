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

export interface VerifyMockTarget {
  readonly context: BrowserContext;
  readonly page: Page;
}

type VerifyMock = (target: VerifyMockTarget) => Promise<unknown>;

export const fallbackMockName = 'mockUnhandledRequests';
export const baseMockName = 'setupMockApis';

export const verifyMockRegistry = {
  mockUnhandledRequests({ context }) {
    return mockUnhandledRequests(context);
  },
  setupMockApis({ context }) {
    return setupMockApis(context);
  },
  mockStacksBroadcastTransaction({ context }) {
    return mockStacksBroadcastTransaction(context);
  },
  mockStacksRawTx({ context }) {
    return mockStacksRawTx(context);
  },
  mockStacksPendingTransaction({ context }) {
    return mockStacksPendingTransaction(context);
  },
  mockTestAccountStacksTxsRequestsWithPendingTx({ context }) {
    return mockTestAccountStacksTxsRequestsWithPendingTx(context);
  },
  mockMixedUtxosForSend({ context }) {
    return mockMixedUtxosForSend(context);
  },
  mockNativeSegwitOnlyUtxosForSend({ context }) {
    return mockNativeSegwitOnlyUtxosForSend(context);
  },
  mockProposeMultisigTransaction({ context }) {
    return mockProposeMultisigTransaction(context);
  },
  mockTestAccountBtcBroadcastTransaction({ page }) {
    return mockTestAccountBtcBroadcastTransaction(page);
  },
  mockEmptyStacksBalancesRequest({ context }) {
    return mockEmptyStacksBalancesRequest(context);
  },
  mockMainnetTestAccountStacksBalancesRequest({ context }) {
    return mockMainnetTestAccountStacksBalancesRequest(context);
  },
  mockMainnetTestAccountEmptyUtxosRequests({ context }) {
    return mockMainnetTestAccountEmptyUtxosRequests(context);
  },
  mockMainnetTestAccountBitcoinRequests({ context }) {
    return mockMainnetTestAccountBitcoinRequests(context);
  },
} satisfies Record<string, VerifyMock>;
