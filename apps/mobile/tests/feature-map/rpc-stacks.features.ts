import { AppRoutes } from '@/shared/app-routes';
import { ApproverSelectors } from '@/shared/selectors/approver.selectors';
import { RpcStacksSelectors } from '@/shared/selectors/rpc-stacks.selectors';

import type { MobileFeatureEntry } from './mobile-feature-entry';

const openFromBrowser = 'From a page loaded in the in-app browser (Browser tab) call';
const stxUtilsSpec = 'apps/mobile/src/features/browser/approver-sheet/stx/utils.spec.ts';

export const rpcStacksFeatures = [
  {
    id: 'rpc-stacks-get-addresses',
    anchor: { kind: 'selectors', objects: ['ApproverSelectors.ConnectAccountSection'] },
    routes: [],
    startRoute: AppRoutes.Browser,
    params: [],
    entry: [
      {
        kind: 'rpc',
        method: 'stx_getAddresses',
        steps: [
          `${openFromBrowser} window.LeatherProvider.request("stx_getAddresses", { network? })`,
          'The approver sheet shows the t`Connect` approver; pick an account and tap t`Approve`',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: {
      ready: ApproverSelectors.ConnectAccountSection,
      others: [ApproverSelectors.ApproveButton, ApproverSelectors.CancelButton],
    },
    actions: [],
    specs: [],
    description:
      'StxGetAddressesApprover (features/browser/approver-sheet/stx/get-addresses/get-addresses.tsx) reuses GetAddressesApproverLayout: t`Connect`, the account card or t`Choose an account`, and the permissions. Approving returns one item with the Stacks address, public key and derivation path, dispatches userConnectsApp and closes the sheet. No spec covers it.',
  },
  {
    id: 'rpc-stacks-sign-transaction',
    anchor: { kind: 'selectors', objects: ['RpcStacksSelectors.TxAccountSection'] },
    routes: [],
    startRoute: AppRoutes.Browser,
    params: [],
    entry: [
      {
        kind: 'rpc',
        method: 'stx_signTransaction',
        steps: [
          `${openFromBrowser} window.LeatherProvider.request("stx_signTransaction", { txHex }) after connecting`,
          'The approver sheet shows t`Sign Transaction`; tap t`Approve`',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: {
      ready: RpcStacksSelectors.TxAccountSection,
      others: [
        ApproverSelectors.ApproveButton,
        ApproverSelectors.CancelButton,
        ApproverSelectors.CloseWindowButton,
      ],
    },
    actions: [],
    specs: [],
    description:
      'SignTransactionApprover (features/browser/approver-sheet/stx/sign-transaction/sign-transaction.tsx) needs a connected app and deserializes the request transaction into BaseStxTxApproverLayout (features/approver/layouts/base-stx-tx-approver.layout.tsx) shows t`Sign Transaction`, the account card, the fee section and the nonce under t`Show advanced options`. Approving only signs: the result carries the signed hex as txHex and transaction, nothing is broadcast. No spec covers it.',
  },
  {
    id: 'rpc-stacks-transfer-stx',
    anchor: { kind: 'selectors', objects: ['RpcStacksSelectors.TxAccountSection'] },
    routes: [],
    startRoute: AppRoutes.Browser,
    params: [],
    entry: [
      {
        kind: 'rpc',
        method: 'stx_transferStx',
        steps: [
          `${openFromBrowser} window.LeatherProvider.request("stx_transferStx", { recipient, amount, memo? }) after connecting`,
          'The approver sheet shows t`Sign Transaction` with t`You’ll send` and t`To address`; tap t`Approve`',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: {
      ready: RpcStacksSelectors.TxAccountSection,
      others: [
        ApproverSelectors.ApproveButton,
        ApproverSelectors.CancelButton,
        ApproverSelectors.CloseWindowButton,
      ],
    },
    actions: [],
    specs: [],
    description:
      'TransferStxApprover (features/browser/approver-sheet/stx/transfer-stx/transfer-stx.tsx) needs a connected app; NonceLoader (stx/nonce-loader.tsx) waits for the next nonce first and shows t`Failed to load latest nonce` on error. It builds an STX token transfer (amount in µSTX) and shows it in BaseStxTxApproverLayout (features/approver/layouts/base-stx-tx-approver.layout.tsx) shows t`Sign Transaction`, the account card, the fee section and the nonce under t`Show advanced options`, plus the outcome and the memo. Approving signs and broadcasts; a sponsored transaction is returned signed without broadcasting, otherwise the result carries the txid and t`Copy ID` and t`View details` follow. No spec covers it.',
  },
  {
    id: 'rpc-stacks-transfer-sip9-nft',
    anchor: { kind: 'selectors', objects: ['RpcStacksSelectors.TxAccountSection'] },
    routes: [],
    startRoute: AppRoutes.Browser,
    params: [],
    entry: [
      {
        kind: 'rpc',
        method: 'stx_transferSip9Nft',
        steps: [
          `${openFromBrowser} window.LeatherProvider.request("stx_transferSip9Nft", { recipient, asset, assetId }) after connecting`,
          'The approver sheet shows t`Sign Transaction`; tap t`Approve`',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: {
      ready: RpcStacksSelectors.TxAccountSection,
      others: [
        ApproverSelectors.ApproveButton,
        ApproverSelectors.CancelButton,
        ApproverSelectors.CloseWindowButton,
      ],
    },
    actions: [],
    specs: [],
    description:
      'TransferSip9NftApprover (features/browser/approver-sheet/stx/transfer-sip9-nft/transfer-sip9-nft.tsx) needs a connected app; NonceLoader (stx/nonce-loader.tsx) waits for the next nonce first and shows t`Failed to load latest nonce` on error. It builds the NFT transfer contract call and shows it in BaseStxTxApproverLayout (features/approver/layouts/base-stx-tx-approver.layout.tsx) shows t`Sign Transaction`, the account card, the fee section and the nonce under t`Show advanced options`, with post conditions and the contract summary. Approving signs and broadcasts; a sponsored transaction is returned signed without broadcasting, otherwise the result carries the txid and t`Copy ID` and t`View details` follow. No spec covers it.',
  },
  {
    id: 'rpc-stacks-transfer-sip10-ft',
    anchor: { kind: 'selectors', objects: ['RpcStacksSelectors.TxAccountSection'] },
    routes: [],
    startRoute: AppRoutes.Browser,
    params: [],
    entry: [
      {
        kind: 'rpc',
        method: 'stx_transferSip10Ft',
        steps: [
          `${openFromBrowser} window.LeatherProvider.request("stx_transferSip10Ft", { recipient, asset, amount }) after connecting`,
          'The approver sheet shows t`Sign Transaction`; tap t`Approve`',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: {
      ready: RpcStacksSelectors.TxAccountSection,
      others: [
        ApproverSelectors.ApproveButton,
        ApproverSelectors.CancelButton,
        ApproverSelectors.CloseWindowButton,
      ],
    },
    actions: [],
    specs: [],
    description:
      'TransferSip10FtApprover (features/browser/approver-sheet/stx/transfer-sip10-ft/transfer-sip10-ft.tsx) needs a connected app; NonceLoader (stx/nonce-loader.tsx) waits for the next nonce first and shows t`Failed to load latest nonce` on error. It builds the fungible token transfer contract call (honouring sponsored) and shows it in BaseStxTxApproverLayout (features/approver/layouts/base-stx-tx-approver.layout.tsx) shows t`Sign Transaction`, the account card, the fee section and the nonce under t`Show advanced options`, with post conditions and the recipient. Approving signs and broadcasts; a sponsored transaction is returned signed without broadcasting, otherwise the result carries the txid and t`Copy ID` and t`View details` follow. No spec covers it.',
  },
  {
    id: 'rpc-stacks-call-contract',
    anchor: { kind: 'selectors', objects: ['RpcStacksSelectors.TxAccountSection'] },
    routes: [],
    startRoute: AppRoutes.Browser,
    params: [],
    entry: [
      {
        kind: 'rpc',
        method: 'stx_callContract',
        steps: [
          `${openFromBrowser} window.LeatherProvider.request("stx_callContract", { contract, functionName, functionArgs? })`,
          'The approver sheet shows t`Sign Transaction`; tap t`Approve`',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: {
      ready: RpcStacksSelectors.TxAccountSection,
      others: [
        ApproverSelectors.ApproveButton,
        ApproverSelectors.CancelButton,
        ApproverSelectors.CloseWindowButton,
      ],
    },
    actions: [],
    specs: [stxUtilsSpec],
    description:
      'CallContractApprover (features/browser/approver-sheet/stx/call-contract/call-contract.tsx) uses the account of the address param, or the connected account; NonceLoader (stx/nonce-loader.tsx) waits for the next nonce first and shows t`Failed to load latest nonce` on error. BaseStxTxApproverLayout (features/approver/layouts/base-stx-tx-approver.layout.tsx) shows t`Sign Transaction`, the account card, the fee section and the nonce under t`Show advanced options`, with post conditions, the contract summary and the arguments; post condition mode allow opens AllowModeWarningSheet. Approving signs and broadcasts; a sponsored transaction is returned signed without broadcasting, otherwise the result carries the txid and t`Copy ID` and t`View details` follow. utils.spec.ts covers the fee and nonce params (getStxRequestParams).',
  },
  {
    id: 'rpc-stacks-deploy-contract',
    anchor: { kind: 'selectors', objects: ['RpcStacksSelectors.TxAccountSection'] },
    routes: [],
    startRoute: AppRoutes.Browser,
    params: [],
    entry: [
      {
        kind: 'rpc',
        method: 'stx_deployContract',
        steps: [
          `${openFromBrowser} window.LeatherProvider.request("stx_deployContract", { name, clarityCode, clarityVersion? })`,
          'The approver sheet shows t`Sign Transaction`; tap t`Approve`',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: {
      ready: RpcStacksSelectors.TxAccountSection,
      others: [
        ApproverSelectors.ApproveButton,
        ApproverSelectors.CancelButton,
        ApproverSelectors.CloseWindowButton,
      ],
    },
    actions: [],
    specs: [stxUtilsSpec],
    description:
      'DeployContractApprover (features/browser/approver-sheet/stx/deploy-contract/deploy-contract.tsx) uses the account of the address param, or the connected account; NonceLoader (stx/nonce-loader.tsx) waits for the next nonce first and shows t`Failed to load latest nonce` on error. BaseStxTxApproverLayout (features/approver/layouts/base-stx-tx-approver.layout.tsx) shows t`Sign Transaction`, the account card, the fee section and the nonce under t`Show advanced options`, with the deploy summary and the code under advanced options. Approving signs and broadcasts; a sponsored transaction is returned signed without broadcasting, otherwise the result carries the txid and t`Copy ID` and t`View details` follow. utils.spec.ts covers the fee and nonce params (getStxRequestParams).',
  },
  {
    id: 'rpc-stacks-sign-message',
    anchor: { kind: 'selectors', objects: ['RpcStacksSelectors.MessageAccountSection'] },
    routes: [],
    startRoute: AppRoutes.Browser,
    params: [],
    entry: [
      {
        kind: 'rpc',
        method: 'stx_signMessage',
        steps: [
          `${openFromBrowser} window.LeatherProvider.request("stx_signMessage", { message, messageType? }) after connecting`,
          'The approver sheet shows t`Sign Message`; tap t`Approve`',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: {
      ready: RpcStacksSelectors.MessageAccountSection,
      others: [ApproverSelectors.ApproveButton, ApproverSelectors.CancelButton],
    },
    actions: [],
    specs: [],
    description:
      'StxSignMessageApprover (features/browser/approver-sheet/stx/sign-message/sign-message.tsx) needs a connected app and renders BaseStxMessageApproverLayout (features/approver/layouts/base-stx-message-approver.layout.tsx): t`Sign Message`, the account card, then the t`Message` cell for utf8 or the structured message section for messageType structured. Approving returns the signature and public key. No spec covers it.',
  },
  {
    id: 'rpc-stacks-sign-structured-message',
    anchor: { kind: 'selectors', objects: ['RpcStacksSelectors.MessageAccountSection'] },
    routes: [],
    startRoute: AppRoutes.Browser,
    params: [],
    entry: [
      {
        kind: 'rpc',
        method: 'stx_signStructuredMessage',
        steps: [
          `${openFromBrowser} window.LeatherProvider.request("stx_signStructuredMessage", { domain, message }) after connecting`,
          'The approver sheet shows t`Sign Message` with the structured message; tap t`Approve`',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: {
      ready: RpcStacksSelectors.MessageAccountSection,
      others: [ApproverSelectors.ApproveButton, ApproverSelectors.CancelButton],
    },
    actions: [],
    specs: [],
    description:
      'StxSignStructuredMessageApprover (features/browser/approver-sheet/stx/sign-structured-message/sign-structured-message.tsx) needs a connected app and renders BaseStxMessageApproverLayout with the structured message section (domain and message as Clarity values). Approving returns the signature and public key. No spec covers it.',
  },
] as const satisfies readonly MobileFeatureEntry[];
