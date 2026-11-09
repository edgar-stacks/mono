import { AppRoutes } from '@/shared/app-routes';
import { ApproverSelectors } from '@/shared/selectors/approver.selectors';
import { RpcStacksSelectors } from '@/shared/selectors/rpc-stacks.selectors';

import type { MobileFeatureEntry } from './mobile-feature-entry';

const unlockFlow = 'apps/mobile/maestro/shared/unlock.yaml';
const stxUtilsSpec = 'apps/mobile/src/features/browser/approver-sheet/stx/utils.spec.ts';
const openBrowserTab = 'From Home tap the "Browser" tab';
const connectFirst =
  'Connect the page first by approving getAddresses or stx_getAddresses from the same origin';
const txApproverLayout =
  'Uses the "Sign Transaction" approver: the account card, fee card (or "Sponsored fee" FREE for a sponsored transaction), and "Show advanced options" with the "Nonce" card.';
const broadcastOutcome =
  '"Approve" signs; a sponsored transaction is returned to the dApp unbroadcast, otherwise it is broadcast and the approver offers "Copy ID", "View details" and "Close window". A broadcast error shows as an error toast. Fee and nonce come from the request when set (fees in micro-STX), else the default fee and the next nonce; "Failed to load latest nonce" shows when the nonce query fails.';

export const rpcStacksFeatures = [
  {
    id: 'rpc-stx-get-addresses',
    anchor: { kind: 'selectors', objects: ['ApproverSelectors.ConnectAccountSection'] },
    routes: [],
    startRoute: AppRoutes.Browser,
    params: [],
    entry: [
      {
        kind: 'rpc',
        method: 'stx_getAddresses',
        steps: [
          openBrowserTab,
          "Load a dApp page that calls window.LeatherProvider.request('stx_getAddresses')",
        ],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: {
      ready: ApproverSelectors.ConnectAccountSection,
      others: [
        ApproverSelectors.ChooseAccountCell,
        ApproverSelectors.PermissionsSection,
        ApproverSelectors.CancelButton,
        ApproverSelectors.ApproveButton,
      ],
    },
    actions: [unlockFlow],
    specs: [],
    description:
      'Same "Connect" approver as getAddresses: a connected origin preselects its account, otherwise "Choose an account" opens the account selector sheet, and "Approve" stays disabled until one is chosen. Approving answers with the Stacks address, public key and derivation path, stores the origin as a connected app and closes the approver.',
  },
  {
    id: 'rpc-stx-sign-transaction',
    anchor: { kind: 'selectors', objects: ['ApproverSelectors.AccountSection'] },
    routes: [],
    startRoute: AppRoutes.Browser,
    params: [],
    entry: [
      {
        kind: 'rpc',
        method: 'stx_signTransaction',
        steps: [
          openBrowserTab,
          connectFirst,
          "Call window.LeatherProvider.request('stx_signTransaction', { txHex })",
        ],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: {
      ready: ApproverSelectors.AccountSection,
      others: [
        ApproverSelectors.FeeSection,
        ApproverSelectors.CancelButton,
        ApproverSelectors.ApproveButton,
      ],
    },
    actions: [unlockFlow],
    specs: [],
    description: `${txApproverLayout} The requested transaction hex is shown as is, with "You’ll send" and "To address" for an STX transfer and the function and contract for a contract call. "Approve" signs without broadcasting, returns the signed hex and then offers "Copy ID", "View details" and "Close window" for the signed txid. Throws when the origin is not connected.`,
  },
  {
    id: 'rpc-stx-transfer-stx',
    anchor: { kind: 'selectors', objects: ['ApproverSelectors.OutcomeSection'] },
    routes: [],
    startRoute: AppRoutes.Browser,
    params: [],
    entry: [
      {
        kind: 'rpc',
        method: 'stx_transferStx',
        steps: [
          openBrowserTab,
          connectFirst,
          "Call window.LeatherProvider.request('stx_transferStx', { recipient, amount })",
        ],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: {
      ready: ApproverSelectors.OutcomeSection,
      others: [
        ApproverSelectors.RecipientSection,
        ApproverSelectors.AccountSection,
        ApproverSelectors.FeeSection,
        ApproverSelectors.CancelButton,
        ApproverSelectors.ApproveButton,
      ],
    },
    actions: [unlockFlow],
    specs: [stxUtilsSpec],
    description: `${txApproverLayout} Shows "You’ll send" with the amount plus fee, "To address" and the "Memo" card. ${broadcastOutcome}`,
  },
  {
    id: 'rpc-stx-transfer-sip9-nft',
    anchor: { kind: 'selectors', objects: ['RpcStacksSelectors.ContractCallSummarySection'] },
    routes: [],
    startRoute: AppRoutes.Browser,
    params: [],
    entry: [
      {
        kind: 'rpc',
        method: 'stx_transferSip9Nft',
        steps: [
          openBrowserTab,
          connectFirst,
          "Call window.LeatherProvider.request('stx_transferSip9Nft', { asset, assetId, recipient })",
        ],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: {
      ready: RpcStacksSelectors.ContractCallSummarySection,
      others: [
        ApproverSelectors.AccountSection,
        ApproverSelectors.FeeSection,
        ApproverSelectors.CancelButton,
        ApproverSelectors.ApproveButton,
      ],
    },
    actions: [unlockFlow],
    specs: [stxUtilsSpec],
    description: `${txApproverLayout} Builds a contract call to the NFT contract's transfer function, so it shows the post conditions, the function and contract summary and "Contract arguments" under the advanced options. ${broadcastOutcome}`,
  },
  {
    id: 'rpc-stx-transfer-sip10-ft',
    anchor: { kind: 'selectors', objects: ['RpcStacksSelectors.ContractCallSummarySection'] },
    routes: [],
    startRoute: AppRoutes.Browser,
    params: [],
    entry: [
      {
        kind: 'rpc',
        method: 'stx_transferSip10Ft',
        steps: [
          openBrowserTab,
          connectFirst,
          "Call window.LeatherProvider.request('stx_transferSip10Ft', { asset, amount, recipient })",
        ],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: {
      ready: RpcStacksSelectors.ContractCallSummarySection,
      others: [
        ApproverSelectors.AccountSection,
        ApproverSelectors.FeeSection,
        ApproverSelectors.CancelButton,
        ApproverSelectors.ApproveButton,
      ],
    },
    actions: [unlockFlow],
    specs: [stxUtilsSpec],
    description: `${txApproverLayout} Builds a contract call to the token's transfer function, so it shows the post conditions, "To address" for the token recipient, the function and contract summary and "Contract arguments" under the advanced options. ${broadcastOutcome}`,
  },
  {
    id: 'rpc-stx-call-contract',
    anchor: { kind: 'selectors', objects: ['RpcStacksSelectors.ContractCallSummarySection'] },
    routes: [],
    startRoute: AppRoutes.Browser,
    params: [],
    entry: [
      {
        kind: 'rpc',
        method: 'stx_callContract',
        steps: [
          openBrowserTab,
          'Connect the page first, or pass the `address` of one of the wallet’s Stacks accounts',
          "Call window.LeatherProvider.request('stx_callContract', { contract, functionName, functionArgs })",
        ],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: {
      ready: RpcStacksSelectors.ContractCallSummarySection,
      others: [
        ApproverSelectors.AccountSection,
        ApproverSelectors.FeeSection,
        ApproverSelectors.NonceSection,
        ApproverSelectors.CancelButton,
        ApproverSelectors.ApproveButton,
      ],
    },
    actions: [unlockFlow],
    specs: [stxUtilsSpec],
    description: `${txApproverLayout} The account is the one whose address the request names, else the connected account. Shows the post conditions, the function name and contract, and "Contract arguments" under the advanced options; an Allow mode transaction shows "This is an “Allow Mode” transaction" and opens the allow mode warning sheet. ${broadcastOutcome}`,
  },
  {
    id: 'rpc-stx-deploy-contract',
    anchor: { kind: 'selectors', objects: ['RpcStacksSelectors.ContractDeploySummarySection'] },
    routes: [],
    startRoute: AppRoutes.Browser,
    params: [],
    entry: [
      {
        kind: 'rpc',
        method: 'stx_deployContract',
        steps: [
          openBrowserTab,
          'Connect the page first, or pass the `address` of one of the wallet’s Stacks accounts',
          "Call window.LeatherProvider.request('stx_deployContract', { name, clarityCode })",
        ],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: {
      ready: RpcStacksSelectors.ContractDeploySummarySection,
      others: [
        ApproverSelectors.AccountSection,
        ApproverSelectors.FeeSection,
        ApproverSelectors.NonceSection,
        ApproverSelectors.CancelButton,
        ApproverSelectors.ApproveButton,
      ],
    },
    actions: [unlockFlow],
    specs: [stxUtilsSpec],
    description: `${txApproverLayout} The account is the one whose address the request names, else the connected account. Shows the contract name and the contract code under the advanced options. ${broadcastOutcome}`,
  },
  {
    id: 'rpc-stx-sign-message',
    anchor: { kind: 'selectors', objects: ['RpcStacksSelectors.MessageSection'] },
    routes: [],
    startRoute: AppRoutes.Browser,
    params: [],
    entry: [
      {
        kind: 'rpc',
        method: 'stx_signMessage',
        steps: [
          openBrowserTab,
          connectFirst,
          "Call window.LeatherProvider.request('stx_signMessage', { message })",
        ],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: {
      ready: RpcStacksSelectors.MessageSection,
      others: [
        ApproverSelectors.AccountSection,
        ApproverSelectors.CancelButton,
        ApproverSelectors.ApproveButton,
      ],
    },
    actions: [unlockFlow],
    specs: [],
    description:
      'Approver titled "Sign Message" with the connected account and the "Message" text. "Approve" signs the UTF-8 message with the connected Stacks account and answers the dApp. Throws when the origin is not connected.',
  },
  {
    id: 'rpc-stx-sign-structured-message',
    anchor: { kind: 'selectors', objects: ['RpcStacksSelectors.StructuredMessageSection'] },
    routes: [],
    startRoute: AppRoutes.Browser,
    params: [],
    entry: [
      {
        kind: 'rpc',
        method: 'stx_signStructuredMessage',
        steps: [
          openBrowserTab,
          connectFirst,
          "Call window.LeatherProvider.request('stx_signStructuredMessage', { message, domain })",
        ],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: {
      ready: RpcStacksSelectors.StructuredMessageSection,
      others: [
        ApproverSelectors.AccountSection,
        ApproverSelectors.CancelButton,
        ApproverSelectors.ApproveButton,
      ],
    },
    actions: [unlockFlow],
    specs: [],
    description:
      'Approver titled "Sign Message" with the connected account and the decoded Clarity message and domain under "Message". "Approve" signs the structured message with the connected Stacks account and answers the dApp. Throws when the origin is not connected.',
  },
  {
    id: 'rpc-stx-allow-mode-warning-sheet',
    anchor: {
      kind: 'selectors',
      objects: [
        'ApproverSelectors.AllowModeWarningProceedButton',
        'ApproverSelectors.AllowModeWarningDismissButton',
      ],
    },
    routes: [],
    startRoute: AppRoutes.Browser,
    params: [],
    entry: [
      {
        kind: 'rpc',
        method: 'stx_callContract',
        steps: [
          openBrowserTab,
          "Request a Stacks transaction with postConditionMode 'allow'; the sheet opens over the approver",
        ],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: {
      ready: ApproverSelectors.AllowModeWarningProceedButton,
      others: [ApproverSelectors.AllowModeWarningDismissButton],
    },
    actions: [unlockFlow],
    specs: [],
    description:
      'Sheet that cannot be swiped away, titled "Careful. This transaction could drain your wallet.", with "By signing, this app can move your assets anytime.", "No confirmations will appear." and "If unsafe, your wallet could be drained.". "Proceed to transaction" stays disabled until "I’m aware of the risks" is switched on and then closes the sheet; "Do not proceed" closes the sheet and rejects the request.',
  },
  {
    id: 'rpc-stx-nonce-sheet',
    anchor: { kind: 'selectors', objects: ['ApproverSelectors.NonceSheetInput'] },
    routes: [],
    startRoute: AppRoutes.Browser,
    params: [],
    entry: [
      {
        kind: 'rpc',
        method: 'stx_transferStx',
        steps: [
          openBrowserTab,
          'Request a Stacks transaction, tap "Show advanced options" in the approver, then tap the "Nonce" card',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: {
      ready: ApproverSelectors.NonceSheetInput,
      others: [ApproverSelectors.NonceSheetSubmitButton],
    },
    actions: [unlockFlow],
    specs: [],
    description:
      'Input sheet prefilled with the transaction nonce; its title reads "Add memo", the placeholder "Memo" and the button "Confirm". Confirming sets the nonce on the transaction, closes the sheet and shows "Nonce updated". The "Nonce" card is disabled once the transaction is broadcast.',
  },
] as const satisfies readonly MobileFeatureEntry[];
