import { AppRoutes } from '@/shared/app-routes';
import { ApproverSelectors } from '@/shared/selectors/approver.selectors';
import { RpcStacksSelectors } from '@/shared/selectors/rpc-stacks.selectors';

import type { MobileFeatureEntry } from './mobile-feature-entry';

export const rpcStacksFeatures = [
  {
    id: 'rpc-stx-get-addresses',
    anchor: { kind: 'selectors', objects: ['RpcStacksSelectors.GetAddressesApprover'] },
    routes: [],
    startRoute: AppRoutes.Browser,
    open: [],
    params: [],
    entry: [
      {
        kind: 'rpc',
        method: 'stx_getAddresses',
        steps: [
          'Load a dApp in the browser tab',
          'The page calls request("stx_getAddresses") on the injected provider and the approver sheet opens',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: {
      ready: RpcStacksSelectors.GetAddressesApprover,
      others: [
        ApproverSelectors.ChooseAccountCell,
        ApproverSelectors.ApproveButton,
        ApproverSelectors.CancelButton,
      ],
    },
    actions: [],
    specs: [],
    description:
      "Stacks connect approver (features/browser/approver-sheet/stx/get-addresses/get-addresses.tsx with features/approver/layouts/get-addresses.layout.tsx): header t`Connect` with the dApp favicon, the account card or t`Choose an account`, and the permissions t`View your wallet balance & activity` and t`Request approval for transactions`. Approving stores the app as connected and returns the account's Stacks addresses; t`Cancel` replies with a user rejection error.",
  },
  {
    id: 'rpc-stx-sign-transaction',
    anchor: { kind: 'selectors', objects: ['RpcStacksSelectors.SignTransactionApprover'] },
    routes: [],
    startRoute: AppRoutes.Browser,
    open: [],
    params: [],
    entry: [
      {
        kind: 'rpc',
        method: 'stx_signTransaction',
        steps: [
          'Connect a dApp with getAddresses or stx_getAddresses first; the approver asserts the app is connected',
          'The page calls request("stx_signTransaction", { txHex }) on the injected provider',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: {
      ready: RpcStacksSelectors.SignTransactionApprover,
      others: [
        ApproverSelectors.FeeCard,
        ApproverSelectors.NonceCard,
        ApproverSelectors.ApproveButton,
        ApproverSelectors.CancelButton,
      ],
    },
    actions: [],
    specs: [],
    description:
      "Stacks transaction signing approver (features/browser/approver-sheet/stx/sign-transaction/sign-transaction.tsx on features/approver/layouts/base-stx-tx-approver.layout.tsx): header t`Sign Transaction`, the connected account, the outcome and summary for the decoded payload, the fee card and t`Show advanced options` with the nonce. Approving signs the dApp's transaction hex and returns it without broadcasting.",
  },
  {
    id: 'rpc-stx-transfer-stx',
    anchor: { kind: 'selectors', objects: ['RpcStacksSelectors.TransferStxApprover'] },
    routes: [],
    startRoute: AppRoutes.Browser,
    open: [],
    params: [],
    entry: [
      {
        kind: 'rpc',
        method: 'stx_transferStx',
        steps: [
          'Connect a dApp with getAddresses or stx_getAddresses first',
          'The page calls request("stx_transferStx", { recipient, amount, memo }) on the injected provider; the nonce loads before the approver renders',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: {
      ready: RpcStacksSelectors.TransferStxApprover,
      others: [
        ApproverSelectors.FeeCard,
        ApproverSelectors.MemoCard,
        ApproverSelectors.NonceCard,
        ApproverSelectors.ApproveButton,
        ApproverSelectors.CancelButton,
        ApproverSelectors.CopyIdButton,
        ApproverSelectors.ViewDetailsButton,
        ApproverSelectors.CloseWindowButton,
      ],
    },
    actions: [],
    specs: [],
    description:
      'STX transfer approver (features/browser/approver-sheet/stx/transfer-stx/transfer-stx.tsx inside NonceLoader): header t`Sign Transaction`, t`You’ll send` with the amount plus fee, t`To address`, the fee card, the read-only memo and t`Show advanced options` with the nonce. Approving signs and broadcasts, then shows the status row with t`Copy ID`, t`View details` and t`Close window`; NonceLoader shows t`Failed to load latest nonce` when the nonce query fails.',
  },
  {
    id: 'rpc-stx-transfer-sip9-nft',
    anchor: { kind: 'selectors', objects: ['RpcStacksSelectors.TransferSip9NftApprover'] },
    routes: [],
    startRoute: AppRoutes.Browser,
    open: [],
    params: [],
    entry: [
      {
        kind: 'rpc',
        method: 'stx_transferSip9Nft',
        steps: [
          'Connect a dApp with getAddresses or stx_getAddresses first',
          'The page calls request("stx_transferSip9Nft", { recipient, asset, assetId }) on the injected provider',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: {
      ready: RpcStacksSelectors.TransferSip9NftApprover,
      others: [
        ApproverSelectors.FeeCard,
        ApproverSelectors.ApproveButton,
        ApproverSelectors.CancelButton,
      ],
    },
    actions: [],
    specs: [],
    description:
      'NFT transfer approver (features/browser/approver-sheet/stx/transfer-sip9-nft/transfer-sip9-nft.tsx inside NonceLoader): builds a SIP-009 transfer contract call and renders it on the base Stacks transaction layout with header t`Sign Transaction`, post conditions, the contract call summary, the fee card and the nonce under advanced options. Approving signs and broadcasts.',
  },
  {
    id: 'rpc-stx-transfer-sip10-ft',
    anchor: { kind: 'selectors', objects: ['RpcStacksSelectors.TransferSip10FtApprover'] },
    routes: [],
    startRoute: AppRoutes.Browser,
    open: [],
    params: [],
    entry: [
      {
        kind: 'rpc',
        method: 'stx_transferSip10Ft',
        steps: [
          'Connect a dApp with getAddresses or stx_getAddresses first',
          'The page calls request("stx_transferSip10Ft", { recipient, asset, amount }) on the injected provider',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: {
      ready: RpcStacksSelectors.TransferSip10FtApprover,
      others: [
        ApproverSelectors.FeeCard,
        ApproverSelectors.ApproveButton,
        ApproverSelectors.CancelButton,
      ],
    },
    actions: [],
    specs: [],
    description:
      'Fungible token transfer approver (features/browser/approver-sheet/stx/transfer-sip10-ft/transfer-sip10-ft.tsx inside NonceLoader): builds a SIP-010 transfer contract call and renders it on the base Stacks transaction layout with header t`Sign Transaction`, the recipient, post conditions, the fee card and the nonce under advanced options. Approving signs and broadcasts.',
  },
  {
    id: 'rpc-stx-sign-message',
    anchor: { kind: 'selectors', objects: ['RpcStacksSelectors.SignMessageApprover'] },
    routes: [],
    startRoute: AppRoutes.Browser,
    open: [],
    params: [],
    entry: [
      {
        kind: 'rpc',
        method: 'stx_signMessage',
        steps: [
          'Connect a dApp with getAddresses or stx_getAddresses first',
          'The page calls request("stx_signMessage", { message }) on the injected provider',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: {
      ready: RpcStacksSelectors.SignMessageApprover,
      others: [ApproverSelectors.ApproveButton, ApproverSelectors.CancelButton],
    },
    actions: [],
    specs: [],
    description:
      "Stacks message approver (features/browser/approver-sheet/stx/sign-message/sign-message.tsx on features/approver/layouts/base-stx-message-approver.layout.tsx): header t`Sign Message`, the connected account and the t`Message` text. Approving signs with the account's Stacks key and returns the signature and public key.",
  },
  {
    id: 'rpc-stx-sign-structured-message',
    anchor: { kind: 'selectors', objects: ['RpcStacksSelectors.SignStructuredMessageApprover'] },
    routes: [],
    startRoute: AppRoutes.Browser,
    open: [],
    params: [],
    entry: [
      {
        kind: 'rpc',
        method: 'stx_signStructuredMessage',
        steps: [
          'Connect a dApp with getAddresses or stx_getAddresses first',
          'The page calls request("stx_signStructuredMessage", { message, domain }) with Clarity values on the injected provider',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: {
      ready: RpcStacksSelectors.SignStructuredMessageApprover,
      others: [ApproverSelectors.ApproveButton, ApproverSelectors.CancelButton],
    },
    actions: [],
    specs: [],
    description:
      'Structured message approver (features/browser/approver-sheet/stx/sign-structured-message/sign-structured-message.tsx on base-stx-message-approver.layout.tsx): header t`Sign Message`, the connected account and the decoded domain and message Clarity values (structured-message.section.tsx). Approving returns the SIP-018 signature.',
  },
  {
    id: 'rpc-stx-call-contract',
    anchor: { kind: 'selectors', objects: ['RpcStacksSelectors.CallContractApprover'] },
    routes: [],
    startRoute: AppRoutes.Browser,
    open: [],
    params: [],
    entry: [
      {
        kind: 'rpc',
        method: 'stx_callContract',
        steps: [
          'Load a dApp in the browser tab; the account comes from params.address when given, otherwise from the connected app',
          'The page calls request("stx_callContract", { contract, functionName, functionArgs }) on the injected provider',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: {
      ready: RpcStacksSelectors.CallContractApprover,
      others: [
        ApproverSelectors.FeeCard,
        ApproverSelectors.NonceCard,
        ApproverSelectors.ApproveButton,
        ApproverSelectors.CancelButton,
      ],
    },
    actions: [],
    specs: ['apps/mobile/src/features/browser/approver-sheet/stx/utils.spec.ts'],
    description:
      'Contract call approver (features/browser/approver-sheet/stx/call-contract/call-contract.tsx inside NonceLoader): header t`Sign Transaction`, the account, post conditions with t`This is an “Allow Mode” transaction` when the mode is allow, the contract call summary, the fee card and t`Show advanced options` with the function arguments and nonce. An allow-mode transaction first opens the allow-mode warning sheet. Fee, nonce and sponsorship come from getStxRequestParams (covered by utils.spec.ts).',
  },
  {
    id: 'rpc-stx-deploy-contract',
    anchor: { kind: 'selectors', objects: ['RpcStacksSelectors.DeployContractApprover'] },
    routes: [],
    startRoute: AppRoutes.Browser,
    open: [],
    params: [],
    entry: [
      {
        kind: 'rpc',
        method: 'stx_deployContract',
        steps: [
          'Load a dApp in the browser tab; the account comes from params.address when given, otherwise from the connected app',
          'The page calls request("stx_deployContract", { name, clarityCode }) on the injected provider',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: {
      ready: RpcStacksSelectors.DeployContractApprover,
      others: [
        ApproverSelectors.FeeCard,
        ApproverSelectors.NonceCard,
        ApproverSelectors.ApproveButton,
        ApproverSelectors.CancelButton,
      ],
    },
    actions: [],
    specs: ['apps/mobile/src/features/browser/approver-sheet/stx/utils.spec.ts'],
    description:
      'Contract deploy approver (features/browser/approver-sheet/stx/deploy-contract/deploy-contract.tsx inside NonceLoader): header t`Sign Transaction`, the account, the contract deploy summary, the fee card and t`Show advanced options` with the Clarity code and nonce. Approving signs and broadcasts the deploy.',
  },
  {
    id: 'approver-allow-mode-warning',
    anchor: { kind: 'selectors', objects: ['ApproverSelectors.AllowModeWarningSheet'] },
    routes: [],
    startRoute: AppRoutes.Browser,
    open: [],
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: [
          'Open a Stacks transaction approver (stx_callContract, stx_signTransaction or another) whose transaction uses PostConditionMode.Allow; the sheet presents on mount',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: {
      ready: ApproverSelectors.AllowModeWarningSheet,
      others: [
        ApproverSelectors.AllowModeProceedButton,
        ApproverSelectors.AllowModeDoNotProceedButton,
      ],
    },
    actions: [],
    specs: [],
    description:
      'Allow-mode warning sheet (features/approver/components/allow-mode-warning-sheet/allow-mode-warning-sheet.tsx) presented by base-stx-tx-approver.layout.tsx for allow-mode transactions: t`Careful. This transaction could drain your wallet.`, t`By signing, this app can move your assets anytime.`, the t`I’m aware of the risks` switch that enables t`Proceed to transaction`, and t`Do not proceed`, which closes the approver with a rejection. The backdrop does not dismiss it.',
  },
  {
    id: 'approver-nonce-sheet',
    anchor: { kind: 'selectors', objects: ['ApproverSelectors.NonceSheetInput'] },
    routes: [],
    startRoute: AppRoutes.Browser,
    open: [],
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: [
          'Open a Stacks transaction approver, expand t`Show advanced options` and tap the nonce card',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: {
      ready: ApproverSelectors.NonceSheetInput,
      others: [ApproverSelectors.NonceSheetSubmitButton, ApproverSelectors.NonceCard],
    },
    actions: [],
    specs: [],
    description:
      'Nonce input sheet (features/approver/components/nonce-sheet.tsx on components/sheets/input-sheet.layout.tsx) opened from the t`Nonce` card of nonce.section.tsx. Confirming rebuilds the transaction with the new nonce and shows a toast. The sheet reuses the memo copy (title t`Add memo`, placeholder t`Memo`) with a t`Confirm` button.',
  },
  {
    id: 'approver-memo-sheet',
    anchor: { kind: 'selectors', objects: ['ApproverSelectors.MemoSheetInput'] },
    routes: [],
    startRoute: AppRoutes.Browser,
    open: [],
    params: [],
    entry: [{ kind: 'nav', steps: ['Open the stx_transferStx approver and tap the memo card'] }],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: {
      ready: ApproverSelectors.MemoSheetInput,
      others: [ApproverSelectors.MemoSheetSubmitButton, ApproverSelectors.MemoCard],
    },
    actions: [],
    specs: [],
    description:
      'Memo input sheet (features/approver/components/memo-sheet.tsx on components/sheets/input-sheet.layout.tsx) with the title t`Add memo`, placeholder t`Memo` and a t`Confirm` button, opened from the t`Memo` card of memo.section.tsx. The STX transfer approver renders the memo card disabled, so the sheet only opens where a section passes it enabled.',
  },
] as const satisfies readonly MobileFeatureEntry[];
