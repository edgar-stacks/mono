import { AppRoutes } from '@/shared/app-routes';
import { ApproverSelectors } from '@/shared/selectors/approver.selectors';
import { RpcStacksSelectors } from '@/shared/selectors/rpc-stacks.selectors';

import type { MobileFeatureEntry } from './mobile-feature-entry';

const connectedDappStep =
  'Open the dApp in the Browser tab; requests other than getAddresses and stx_getAddresses need an origin that already connected';

export const rpcStacksFeatures = [
  {
    id: 'rpc-stx-get-addresses',
    anchor: { kind: 'selectors', objects: ['ApproverSelectors.GetAddressesApprover'] },
    routes: [],
    startRoute: AppRoutes.Browser,
    deepLinkable: false,
    params: [],
    entry: [
      {
        kind: 'rpc',
        method: 'stx_getAddresses',
        steps: [
          connectedDappStep,
          'Call window.LeatherProvider.request("stx_getAddresses", params)',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: {
      ready: ApproverSelectors.GetAddressesApprover,
      others: [ApproverSelectors.ApproveButton, ApproverSelectors.CancelButton],
    },
    actions: [],
    specs: [],
    description:
      'Stacks connect approver (stx/get-addresses/get-addresses.tsx on get-addresses.layout.tsx): "Connect" with the account card and the permissions list; approving stores the app as connected and returns the Stacks addresses.',
  },
  {
    id: 'rpc-stx-sign-transaction',
    anchor: { kind: 'selectors', objects: ['RpcStacksSelectors.TransactionApprover'] },
    routes: [],
    startRoute: AppRoutes.Browser,
    deepLinkable: false,
    params: [],
    entry: [
      {
        kind: 'rpc',
        method: 'stx_signTransaction',
        steps: [
          connectedDappStep,
          'Call window.LeatherProvider.request("stx_signTransaction", params)',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: {
      ready: RpcStacksSelectors.TransactionApprover,
      others: [ApproverSelectors.ApproveButton, ApproverSelectors.CancelButton],
    },
    actions: [],
    specs: [],
    description:
      'Stacks transaction approver (stx/sign-transaction/sign-transaction.tsx on base-stx-tx-approver.layout.tsx): "Sign Transaction" with the decoded transaction, post conditions and "Show advanced options"; an Allow mode transaction opens the allow mode warning sheet first.',
  },
  {
    id: 'rpc-stx-transfer-stx',
    anchor: { kind: 'selectors', objects: ['RpcStacksSelectors.TransactionApprover'] },
    routes: [],
    startRoute: AppRoutes.Browser,
    deepLinkable: false,
    params: [],
    entry: [
      {
        kind: 'rpc',
        method: 'stx_transferStx',
        steps: [
          connectedDappStep,
          'Call window.LeatherProvider.request("stx_transferStx", params)',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: {
      ready: RpcStacksSelectors.TransactionApprover,
      others: [ApproverSelectors.ApproveButton, ApproverSelectors.CancelButton],
    },
    actions: [],
    specs: [],
    description:
      'STX transfer approver (stx/transfer-stx/transfer-stx.tsx) inside NonceLoader: "You\u2019ll send" and "To address" with the fee, memo and nonce rows; a nonce fetch failure shows "Failed to load latest nonce".',
  },
  {
    id: 'rpc-stx-transfer-sip9-nft',
    anchor: { kind: 'selectors', objects: ['RpcStacksSelectors.TransactionApprover'] },
    routes: [],
    startRoute: AppRoutes.Browser,
    deepLinkable: false,
    params: [],
    entry: [
      {
        kind: 'rpc',
        method: 'stx_transferSip9Nft',
        steps: [
          connectedDappStep,
          'Call window.LeatherProvider.request("stx_transferSip9Nft", params)',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: {
      ready: RpcStacksSelectors.TransactionApprover,
      others: [ApproverSelectors.ApproveButton, ApproverSelectors.CancelButton],
    },
    actions: [],
    specs: [],
    description:
      'SIP-9 NFT transfer approver (stx/transfer-sip9-nft/transfer-sip9-nft.tsx) inside NonceLoader on the base Stacks transaction layout.',
  },
  {
    id: 'rpc-stx-transfer-sip10-ft',
    anchor: { kind: 'selectors', objects: ['RpcStacksSelectors.TransactionApprover'] },
    routes: [],
    startRoute: AppRoutes.Browser,
    deepLinkable: false,
    params: [],
    entry: [
      {
        kind: 'rpc',
        method: 'stx_transferSip10Ft',
        steps: [
          connectedDappStep,
          'Call window.LeatherProvider.request("stx_transferSip10Ft", params)',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: {
      ready: RpcStacksSelectors.TransactionApprover,
      others: [ApproverSelectors.ApproveButton, ApproverSelectors.CancelButton],
    },
    actions: [],
    specs: [],
    description:
      'SIP-10 token transfer approver (stx/transfer-sip10-ft/transfer-sip10-ft.tsx) inside NonceLoader: the token outcome and "To address" (sip10-recipient.tsx).',
  },
  {
    id: 'rpc-stx-sign-message',
    anchor: { kind: 'selectors', objects: ['RpcStacksSelectors.MessageApprover'] },
    routes: [],
    startRoute: AppRoutes.Browser,
    deepLinkable: false,
    params: [],
    entry: [
      {
        kind: 'rpc',
        method: 'stx_signMessage',
        steps: [
          connectedDappStep,
          'Call window.LeatherProvider.request("stx_signMessage", params)',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: {
      ready: RpcStacksSelectors.MessageApprover,
      others: [ApproverSelectors.ApproveButton, ApproverSelectors.CancelButton],
    },
    actions: [],
    specs: [],
    description:
      'Stacks message approver (stx/sign-message/sign-message.tsx on base-stx-message-approver.layout.tsx): "Sign Message" with the "Message" text.',
  },
  {
    id: 'rpc-stx-sign-structured-message',
    anchor: { kind: 'selectors', objects: ['RpcStacksSelectors.MessageApprover'] },
    routes: [],
    startRoute: AppRoutes.Browser,
    deepLinkable: false,
    params: [],
    entry: [
      {
        kind: 'rpc',
        method: 'stx_signStructuredMessage',
        steps: [
          connectedDappStep,
          'Call window.LeatherProvider.request("stx_signStructuredMessage", params)',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: {
      ready: RpcStacksSelectors.MessageApprover,
      others: [ApproverSelectors.ApproveButton, ApproverSelectors.CancelButton],
    },
    actions: [],
    specs: [],
    description:
      'SIP-018 structured message approver (stx/sign-structured-message) on the same layout, showing the domain and the decoded "Message" (structured-message.section.tsx).',
  },
  {
    id: 'rpc-stx-call-contract',
    anchor: { kind: 'selectors', objects: ['RpcStacksSelectors.TransactionApprover'] },
    routes: [],
    startRoute: AppRoutes.Browser,
    deepLinkable: false,
    params: [],
    entry: [
      {
        kind: 'rpc',
        method: 'stx_callContract',
        steps: [
          connectedDappStep,
          'Call window.LeatherProvider.request("stx_callContract", params)',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: {
      ready: RpcStacksSelectors.TransactionApprover,
      others: [ApproverSelectors.ApproveButton, ApproverSelectors.CancelButton],
    },
    actions: [],
    specs: ['apps/mobile/src/features/browser/approver-sheet/stx/utils.spec.ts'],
    description:
      'Contract call approver (stx/call-contract/call-contract.tsx) inside NonceLoader, account from the request params: "Contract arguments", post conditions such as "You will transfer", and "Sponsored fee" / "FREE" for a sponsored request (fee and nonce handling in stx/utils.ts).',
  },
  {
    id: 'rpc-stx-deploy-contract',
    anchor: { kind: 'selectors', objects: ['RpcStacksSelectors.TransactionApprover'] },
    routes: [],
    startRoute: AppRoutes.Browser,
    deepLinkable: false,
    params: [],
    entry: [
      {
        kind: 'rpc',
        method: 'stx_deployContract',
        steps: [
          connectedDappStep,
          'Call window.LeatherProvider.request("stx_deployContract", params)',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: {
      ready: RpcStacksSelectors.TransactionApprover,
      others: [ApproverSelectors.ApproveButton, ApproverSelectors.CancelButton],
    },
    actions: [],
    specs: ['apps/mobile/src/features/browser/approver-sheet/stx/utils.spec.ts'],
    description:
      'Contract deploy approver (stx/deploy-contract/deploy-contract.tsx) inside NonceLoader: the contract "Code" card (code-card.tsx) and the fee and nonce rows.',
  },
] as const satisfies readonly MobileFeatureEntry[];
