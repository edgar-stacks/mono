import { AppRoutes } from '@/shared/app-routes';
import { ApproverSelectors } from '@/shared/selectors/approver.selectors';
import { RpcBitcoinSelectors } from '@/shared/selectors/rpc-bitcoin.selectors';

import type { MobileFeatureEntry } from './mobile-feature-entry';

const psbtSignerSpec = 'apps/mobile/src/features/psbt-signer/signer.spec.ts';
const sendTransferSpec =
  'apps/mobile/src/features/browser/approver-sheet/send-transfer.utils.spec.ts';

export const rpcBitcoinFeatures = [
  {
    id: 'rpc-get-addresses',
    anchor: { kind: 'selectors', objects: ['RpcBitcoinSelectors.GetAddressesApprover'] },
    routes: [],
    startRoute: AppRoutes.Browser,
    open: [],
    params: [],
    entry: [
      {
        kind: 'rpc',
        method: 'getAddresses',
        steps: [
          'Load a dApp in the browser tab',
          'The page calls request("getAddresses") on the injected provider and the approver sheet opens',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: {
      ready: RpcBitcoinSelectors.GetAddressesApprover,
      others: [
        ApproverSelectors.ChooseAccountCell,
        ApproverSelectors.ApproveButton,
        ApproverSelectors.CancelButton,
      ],
    },
    actions: [],
    specs: [],
    description:
      'Connect approver (features/browser/approver-sheet/get-addresses/get-addresses.tsx with features/approver/layouts/get-addresses.layout.tsx) in the full-height approver sheet: header t`Connect` with the dApp favicon, an account card or t`Choose an account` cell that opens the account selector, and the permissions t`This app would like to` t`View your wallet balance & activity` and t`Request approval for transactions`. Approving stores the app as connected with the chosen account and returns its addresses; t`Cancel` or closing the sheet replies with a user rejection error.',
  },
  {
    id: 'rpc-sign-psbt',
    anchor: { kind: 'selectors', objects: ['RpcBitcoinSelectors.SignPsbtApprover'] },
    routes: [],
    startRoute: AppRoutes.Browser,
    open: [],
    params: [],
    entry: [
      {
        kind: 'rpc',
        method: 'signPsbt',
        steps: [
          'Connect a dApp with getAddresses first; the approver renders nothing for an app that is not connected',
          'The page calls request("signPsbt", { hex, broadcast, network }) on the injected provider',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: {
      ready: RpcBitcoinSelectors.SignPsbtApprover,
      others: [
        ApproverSelectors.FeeCard,
        ApproverSelectors.ApproveButton,
        ApproverSelectors.CancelButton,
        ApproverSelectors.CloseWindowButton,
      ],
    },
    actions: [],
    specs: [psbtSignerSpec],
    description:
      "PSBT approver (features/browser/approver-sheet/sign-psbt.tsx rendering features/psbt-signer/psbt-signer.tsx) for a connected app: header t`Send token` (or t`Sign transaction` when the dApp asks not to broadcast), t`You’ll send` amount, t`To address` recipients, the paying account, a read-only bitcoin fee card and t`Show advanced options` with inputs and outputs. Warnings appear for no broadcast (t`Leather won't broadcast this transaction`), a mutable sighash (t`Be careful with this transaction`) and unrecognized outputs (t`Unrecognized output`). Inputs get bip32 derivation for the connected account before signing; the signAtIndex logic is covered by signer.spec.ts.",
  },
  {
    id: 'rpc-send-transfer',
    anchor: { kind: 'selectors', objects: ['RpcBitcoinSelectors.SendTransferApprover'] },
    routes: [],
    startRoute: AppRoutes.Browser,
    open: [],
    params: [],
    entry: [
      {
        kind: 'rpc',
        method: 'sendTransfer',
        steps: [
          'Connect a dApp with getAddresses first',
          'The page calls request("sendTransfer", { recipients: [{ address, amount }] }) on the injected provider',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: {
      ready: RpcBitcoinSelectors.SendTransferApprover,
      others: [
        ApproverSelectors.FeeCard,
        ApproverSelectors.ApproveButton,
        ApproverSelectors.CancelButton,
        ApproverSelectors.CopyIdButton,
        ApproverSelectors.ViewDetailsButton,
        ApproverSelectors.CloseWindowButton,
      ],
    },
    actions: [],
    specs: [sendTransferSpec, psbtSignerSpec],
    description:
      "Bitcoin transfer approver (features/browser/approver-sheet/send-transfer.tsx): builds a PSBT from the connected account's UTXOs and the average fee rates, then renders the PSBT signer with an editable fee card under the header t`Send token`. After approval it broadcasts and shows a status row with t`Copy ID`, t`View details` and t`Close window`. It renders nothing until the UTXOs and fee rates load.",
  },
  {
    id: 'rpc-send-transfer-fees-unavailable',
    anchor: { kind: 'selectors', objects: ['RpcBitcoinSelectors.SendTransferFeesUnavailable'] },
    routes: [],
    startRoute: AppRoutes.Browser,
    open: [],
    params: [],
    entry: [
      {
        kind: 'rpc',
        method: 'sendTransfer',
        steps: [
          'Connect a dApp with getAddresses first',
          'Make the fee rate request fail, then have the page call request("sendTransfer")',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: {
      ready: RpcBitcoinSelectors.SendTransferFeesUnavailable,
      others: [ApproverSelectors.CancelButton],
    },
    actions: [],
    specs: [sendTransferSpec],
    description:
      'Fallback of the sendTransfer approver (SendTransferFeesUnavailable in features/browser/approver-sheet/send-transfer.tsx) when fee rates fail to load: header t`Send token` with only the t`To address` recipients and a disabled approve button; t`Cancel` rejects the request.',
  },
  {
    id: 'rpc-sign-message',
    anchor: { kind: 'selectors', objects: ['RpcBitcoinSelectors.SignMessageApprover'] },
    routes: [],
    startRoute: AppRoutes.Browser,
    open: [],
    params: [],
    entry: [
      {
        kind: 'rpc',
        method: 'signMessage',
        steps: [
          'Connect a dApp with getAddresses first; the approver renders nothing for an app without an account',
          'The page calls request("signMessage", { message, paymentType }) on the injected provider',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: {
      ready: RpcBitcoinSelectors.SignMessageApprover,
      others: [
        ApproverSelectors.ChooseAccountCell,
        ApproverSelectors.ApproveButton,
        ApproverSelectors.CancelButton,
      ],
    },
    actions: [],
    specs: [],
    description:
      'Bitcoin message approver (features/browser/approver-sheet/sign-message/sign-message.tsx with sign-message.layout.tsx): header t`Sign Message`, the connected account card (or t`Choose an account`), and the t`Message` to sign. Approving signs the message with the selected account and returns the signature.',
  },
] as const satisfies readonly MobileFeatureEntry[];
