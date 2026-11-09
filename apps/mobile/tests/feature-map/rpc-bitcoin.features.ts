import { AppRoutes } from '@/shared/app-routes';
import { ApproverSelectors } from '@/shared/selectors/approver.selectors';
import { RpcBitcoinSelectors } from '@/shared/selectors/rpc-bitcoin.selectors';

import type { MobileFeatureEntry } from './mobile-feature-entry';

const connectedDappStep =
  'Open the dApp in the Browser tab; requests other than getAddresses and stx_getAddresses need an origin that already connected';

export const rpcBitcoinFeatures = [
  {
    id: 'rpc-get-addresses',
    anchor: { kind: 'selectors', objects: ['ApproverSelectors.GetAddressesApprover'] },
    routes: [],
    startRoute: AppRoutes.Browser,
    deepLinkable: false,
    params: [],
    entry: [
      {
        kind: 'rpc',
        method: 'getAddresses',
        steps: [connectedDappStep, 'Call window.LeatherProvider.request("getAddresses", params)'],
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
      'Bitcoin connect approver (get-addresses/get-addresses.tsx on get-addresses.layout.tsx): "Connect" with the dApp favicon, the account card ("Choose an account", opens the account selector), "This app would like to" with "View your wallet balance & activity" and "Request approval for transactions". Approving stores the app as connected and returns the account addresses.',
  },
  {
    id: 'rpc-sign-psbt',
    anchor: { kind: 'selectors', objects: ['RpcBitcoinSelectors.PsbtSigner'] },
    routes: [],
    startRoute: AppRoutes.Browser,
    deepLinkable: false,
    params: [],
    entry: [
      {
        kind: 'rpc',
        method: 'signPsbt',
        steps: [connectedDappStep, 'Call window.LeatherProvider.request("signPsbt", params)'],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: {
      ready: RpcBitcoinSelectors.PsbtSigner,
      others: [ApproverSelectors.ApproveButton, ApproverSelectors.CancelButton],
    },
    actions: [],
    specs: ['apps/mobile/src/features/psbt-signer/signer.spec.ts'],
    description:
      'PSBT approver (sign-psbt.tsx rendering PsbtSigner; broadcast comes from request.params.broadcast). Signing only shows "Sign transaction" and "Leather won\'t broadcast this transaction", otherwise "Send token". Warnings include "Be careful with this transaction" for unusual sighash types and "Unverified recipient"; "Inputs and outputs" lists the PSBT. Approve shows "Signing..." then "Signed".',
  },
  {
    id: 'rpc-send-transfer',
    anchor: { kind: 'selectors', objects: ['RpcBitcoinSelectors.PsbtSigner'] },
    routes: [],
    startRoute: AppRoutes.Browser,
    deepLinkable: false,
    params: [],
    entry: [
      {
        kind: 'rpc',
        method: 'sendTransfer',
        steps: [connectedDappStep, 'Call window.LeatherProvider.request("sendTransfer", params)'],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: {
      ready: RpcBitcoinSelectors.PsbtSigner,
      others: [ApproverSelectors.ApproveButton, ApproverSelectors.CancelButton],
    },
    actions: [],
    specs: [
      'apps/mobile/src/features/browser/approver-sheet/send-transfer.utils.spec.ts',
      'apps/mobile/src/features/psbt-signer/signer.spec.ts',
    ],
    description:
      'Bitcoin transfer approver (send-transfer.tsx): builds a PSBT for the requested recipients and amounts (send-transfer.utils.ts) and shows it in PsbtSigner as "Send token" with "To address", the fee row and "Approve", which signs and broadcasts.',
  },
  {
    id: 'rpc-sign-message',
    anchor: { kind: 'selectors', objects: ['RpcBitcoinSelectors.SignMessageApprover'] },
    routes: [],
    startRoute: AppRoutes.Browser,
    deepLinkable: false,
    params: [],
    entry: [
      {
        kind: 'rpc',
        method: 'signMessage',
        steps: [connectedDappStep, 'Call window.LeatherProvider.request("signMessage", params)'],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: {
      ready: RpcBitcoinSelectors.SignMessageApprover,
      others: [ApproverSelectors.ApproveButton, ApproverSelectors.CancelButton],
    },
    actions: [],
    specs: [],
    description:
      'BIP-322 message approver (sign-message/sign-message.layout.tsx): "Sign Message" with the account card ("Choose an account") and the "Message" text; approving signs with bip322-signer.ts.',
  },
] as const satisfies readonly MobileFeatureEntry[];
