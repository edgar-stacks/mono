import { ActivitySelectors } from '@tests/selectors/activity.selectors';
import { SendCryptoAssetSelectors } from '@tests/selectors/send.selectors';
import { SharedComponentsSelectors } from '@tests/selectors/shared-component.selectors';

import { RouteUrls } from '@shared/route-urls';

import type { ExtensionFeatureEntry } from './extension-feature-entry';

const manageTransactionSpec =
  'apps/extension/tests/specs/manage-transaction/manage-transaction.spec.ts';
const rbfBtcSpec = 'apps/extension/tests/specs/manage-transaction/rbf-btc.spec.ts';

const stacksActionMocks = [
  'setupMockApis',
  'mockUnhandledRequests',
  'mockTestAccountStacksTxsRequestsWithPendingTx',
  'mockStacksRawTx',
  'mockStacksPendingTransaction',
  'mockStacksBroadcastTransaction',
] as const;

const activityDetailsSpec = 'apps/extension/tests/specs/activity/activity-details.spec.ts';

export const activityFeatures = [
  {
    id: 'activity-details',
    anchor: { kind: 'route' },
    routes: [RouteUrls.ActivityDetails],
    params: [
      { name: 'chain', example: 'bitcoin' },
      {
        name: 'txid',
        example: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2',
      },
    ],
    entry: [
      {
        kind: 'nav',
        steps: [
          'Before sign-in register mockLeatherBitcoinTransactions(context, [mockLeatherTaprootOnlySendTx]), as activity-details.spec.ts does',
          'On the Activity tab click a row (HomePage.openActivityDetails clicks the row by its text and waits for the title)',
        ],
      },
      {
        kind: 'deepLink',
        steps: ['Open #/activity/<bitcoin|stacks>/<txid> with an unlocked wallet'],
      },
    ],
    gate: 'account',
    flags: [],
    preconditions: {
      session: 'signed-in',
      mocks: ['setupMockApis', 'mockUnhandledRequests'],
    },
    selectors: {
      ready: ActivitySelectors.ActivityDetailsTitle,
      others: [
        ActivitySelectors.ActivityDetails,
        ActivitySelectors.ActivityDetailsBackBtn,
        ActivitySelectors.ActivityDetailsHero,
        ActivitySelectors.ActivityDetailsBalanceChanges,
        ActivitySelectors.ActivityDetailsExplorerBtn,
        ActivitySelectors.ActivityDetailsLoading,
        ActivitySelectors.ActivityDetailsNotFound,
      ],
    },
    actions: ['HomePage.clickActivityTab', 'HomePage.openActivityDetails'],
    specs: [activityDetailsSpec],
    description:
      'Full-page details of one transaction, opened by clicking any row on the Activity tab or in a token\'s activity (activity-row.tsx). The header is titled "Transaction"; back goes to the previous page (navigate(-1)), or to /activity when the screen was opened directly (use-activity-details-back.ts). Below it a hero with the avatar, an action title with "via <protocol>" for a mapped protocol action, "Send <asset>" / "Receive <asset>" for transfers, else the row title and subtitle (buildBlockchainActivityHeroLines); a Bitcoin sBTC deposit shows the list\'s overlay title and status instead. A pending transaction the wallet sent shows "Increase fee" and "Cancel" (Stacks) or "Increase fee" (Bitcoin, only when usePendingBitcoinTxByTxid finds the esplora tx), and a failed sBTC deposit shows "Reclaim"; the fee and cancel sheets go back here when closed. "Balance changes" lists one "Received" / "Sent" row per change, received first (ActivitySelectors.ActivityDetailsBalanceChanges), and "Transaction details" shows Date, To or From (copies the address), Contract (opens the explorer), Function, Protocol, Fee with its fiat value, Nonce, Block and Transaction ID (copies), each only when known, then a "View in explorer" button (ActivitySelectors.ActivityDetailsExplorerBtn). The query seeds from the cached activity feed, polls while the transaction is pending and retries an unresolved txid up to four times (blockchain-activity.query.ts); HD Bitcoin accounts resolve the txid from their account transactions. While the first lookup loads ActivitySelectors.ActivityDetailsLoading shows; an unknown txid shows "Transaction not found" with "View in explorer" (ActivitySelectors.ActivityDetailsNotFound), and an unknown chain shows it without the button. With only the listed mocks there is no transaction to open: activity-details.spec.ts registers mockLeatherBitcoinTransactions(context, [mockLeatherTaprootOnlySendTx]) before sign-in for the row and the deep link, and mockLeatherBitcoinTransactions(context, []) for the unknown-txid case.',
  },
  {
    id: 'increase-btc-fee',
    anchor: { kind: 'route' },
    deepLinkable: false,
    routes: [RouteUrls.IncreaseBtcFee],
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: [
          'Before sign-in register mockPendingBitcoinTransactions(page, [tx]) (esplora, read by usePendingBitcoinTxByTxid), mockLeatherBitcoinTransactions(context, [leatherTxFromEsplora(tx)]) (the activity row) and mockMixedUtxoRequests(page, utxos) (the inputs), as rbf-btc.spec.ts does',
          'On the Activity tab a pending BTC transaction the wallet sent shows an inline "Increase fee" button with no test id (increase-fee-button.tsx; the rbf-btc spec clicks it by text); there is no row menu for BTC',
          'Clicking it navigates to /increase-fee/btc with the transaction in route state and the sheet opens',
        ],
      },
    ],
    gate: 'none',
    flags: [],
    preconditions: {
      session: 'signed-in',
      mocks: ['setupMockApis', 'mockUnhandledRequests'],
    },
    selectors: {
      ready: ActivitySelectors.TransactionActionBalance,
      others: [
        ActivitySelectors.TransactionActionFeeInput,
        ActivitySelectors.TransactionSubmitAction,
        SendCryptoAssetSelectors.TaprootUtxoWarningDialog,
      ],
    },
    actions: ['HomePage.clickActivityTab', 'HomePage.setBitcoinIncreasedFeeRate'],
    specs: [rbfBtcSpec],
    description:
      'Replace-by-fee sheet for a pending Bitcoin transaction the wallet sent. It shows a "Balance:" caption with the available plus outbound BTC (ActivitySelectors.TransactionActionBalance; the fee validation closes over it, so HomePage.setBitcoinIncreasedFeeRate waits for it) and a "sats/vB" fee-rate input (ActivitySelectors.TransactionActionFeeInput); "Submit" ("Confirm on Ledger" for a Ledger wallet, transaction-actions.tsx) rebuilds and broadcasts the replacement, showing the taproot UTXO warning (SendCryptoAssetSelectors.TaprootUtxoWarningDialog, "I understand, continue") only when taproot inputs are spent. Success shows a "Fee increased successfully" toast and navigates to /activity; a failure shows an error toast and navigates to / (use-btc-increase-fee.ts). Only pending transactions the wallet sent get the inline button (activity-row-actions.tsx checks initiatedByUser), and only when usePendingBitcoinTxByTxid finds the esplora tx, so inbound and confirmed rows have none. With only the listed mocks there is no pending BTC row: rbf-btc.spec.ts registers mockPendingBitcoinTransactions, mockLeatherBitcoinTransactions and mockMixedUtxoRequests with tx data before sign-in (see the entry steps), and its two submit tests register mockBitcoinMainnetBroadcast(page) for Submit. "This transaction can\'t be sped up in Leather." renders when the route is opened without the transaction in route state, for example by deep link or reload (increase-btc-fee-dialog.tsx). The route is a sibling of the Home route inside the same header and content layout, without an AccountGate; closing it or "Cancel" goes back to the screen that opened it (the Activity tab or the activity details screen, transaction-action-opener.ts), and to / when the route state does not say it was opened in-app.',
  },
  {
    id: 'increase-stacks-fee',
    anchor: { kind: 'route' },
    routes: [RouteUrls.IncreaseStacksFee, RouteUrls.BroadcastError],
    params: [
      {
        name: 'txid',
        example: '0x2fd347fd2f775db6bec23e566a1d1d4914f10502f6a0d44692e93aa80cf047e4',
      },
    ],
    entry: [
      {
        kind: 'nav',
        steps: [
          'On the Activity tab open the menu of a pending Stacks transaction (ActivitySelectors.ActivityItemMenuBtn)',
          'Click "Increase fee" (ActivitySelectors.ActivityItemMenuIncreaseFee)',
        ],
      },
      { kind: 'deepLink', steps: ['Open #/increase-fee/stacks/<txid> for a pending transaction'] },
    ],
    gate: 'none',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [...stacksActionMocks] },
    selectors: {
      ready: ActivitySelectors.TransactionActionFeeInput,
      others: [
        ActivitySelectors.TransactionActionSheet,
        ActivitySelectors.TransactionSubmitAction,
        SharedComponentsSelectors.BroadcastErrorTitle,
      ],
    },
    actions: ['HomePage.clickActivityTab', 'HomePage.setStacksTransactionActionFee'],
    specs: [manageTransactionSpec],
    description:
      'Sheet that rebroadcasts a pending Stacks transaction with a higher fee. The sheet\'s content has the data-testid ActivitySelectors.TransactionActionSheet suffixed with -increase-fee, which HomePage.setStacksTransactionActionFee uses to scope the fee input. "Submit" stays disabled until the fee exceeds the original (stacks-transaction-action-sheet.tsx). A sponsored transaction gets the toast "The fee of a sponsored transaction is paid by its sponsor and cannot be increased" and is not broadcast (use-stacks-transaction-action.ts). Success navigates to /activity with a "Fee increased successfully" toast (use-stacks-broadcast-transaction.tsx); a failed broadcast renders the nested broadcast-error page. An unknown txid shows a "Transaction not found" toast and returns home; closing the sheet goes back to the screen that opened it (the Activity tab or the activity details screen, transaction-action-opener.ts), or to / when opened by deep link. manage-transaction.spec.ts also registers mockLeatherBitcoinTransactions(context, []) before sign-in to empty the Bitcoin side of the feed. Mounted inside the home layout without an AccountGate.',
  },
  {
    id: 'cancel-stacks-transaction',
    anchor: { kind: 'route' },
    routes: [RouteUrls.CancelStacksTransaction],
    params: [
      {
        name: 'txid',
        example: '0x2fd347fd2f775db6bec23e566a1d1d4914f10502f6a0d44692e93aa80cf047e4',
      },
    ],
    entry: [
      {
        kind: 'nav',
        steps: [
          'On the Activity tab open the menu of a pending Stacks transaction (ActivitySelectors.ActivityItemMenuBtn)',
          'Click "Cancel transaction" (ActivitySelectors.ActivityItemMenuCancelTransaction)',
        ],
      },
      {
        kind: 'deepLink',
        steps: ['Open #/cancel-transaction/stacks/<txid> for a pending transaction'],
      },
    ],
    gate: 'none',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [...stacksActionMocks] },
    selectors: {
      ready: ActivitySelectors.TransactionActionFeeInput,
      others: [ActivitySelectors.TransactionActionSheet, ActivitySelectors.TransactionSubmitAction],
    },
    actions: ['HomePage.clickActivityTab', 'HomePage.setStacksTransactionActionFee'],
    specs: [manageTransactionSpec],
    description:
      'Sheet that replaces a pending Stacks transaction with a 1 micro-STX transfer to the burn address, memo "_cancel transaction", at the same nonce and the fee entered here, so the original is dropped (use-stacks-transaction-action.ts). Same component as the increase-fee sheet with the -cancel suffix on its test id. The fee field defaults to the original fee plus 1 micro-STX and "Submit" stays disabled until the fee exceeds the original (stacks-transaction-action-sheet.tsx). Success shows "Transaction cancelled successfully" and navigates to /activity. A failed broadcast calls navigate with the relative path broadcast-error (use-stacks-broadcast-transaction.tsx), which resolves to /cancel-transaction/stacks/:txid/broadcast-error; the router only defines that child under /increase-fee/stacks/:txid (app-routes.tsx), so the failure lands on the home not-found content instead of an error page. manage-transaction.spec.ts also registers mockLeatherBitcoinTransactions(context, []) before sign-in to empty the Bitcoin side of the feed. Mounted inside the home layout without an AccountGate; closing it goes back to the screen that opened it (the Activity tab or the activity details screen, transaction-action-opener.ts), or to / when opened by deep link.',
  },
] as const satisfies readonly ExtensionFeatureEntry[];
