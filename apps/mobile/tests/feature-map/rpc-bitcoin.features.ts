import { AppRoutes } from '@/shared/app-routes';
import { ApproverSelectors } from '@/shared/selectors/approver.selectors';
import { RpcBitcoinSelectors } from '@/shared/selectors/rpc-bitcoin.selectors';

import type { MobileFeatureEntry } from './mobile-feature-entry';

const openFromBrowser = 'From a page loaded in the in-app browser (Browser tab) call';

export const rpcBitcoinFeatures = [
  {
    id: 'rpc-bitcoin-get-addresses',
    anchor: { kind: 'selectors', objects: ['ApproverSelectors.ConnectAccountSection'] },
    routes: [],
    startRoute: AppRoutes.Browser,
    params: [],
    entry: [
      {
        kind: 'rpc',
        method: 'getAddresses',
        steps: [
          `${openFromBrowser} window.LeatherProvider.request("getAddresses")`,
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
      'GetAddressesApprover (features/browser/approver-sheet/get-addresses/get-addresses.tsx) in GetAddressesApproverLayout (features/approver/layouts/get-addresses.layout.tsx): the t`Connect` header with the large favicon, the account card or t`Choose an account` (opens AccountSelectorSheet), and the permissions list. The account preselects to the one the app already connected with; Approve is disabled without one. Approving returns the taproot, native segwit and Stacks addresses and dispatches userConnectsApp, which lists the app under Connections. No spec covers it.',
  },
  {
    id: 'rpc-bitcoin-sign-psbt',
    anchor: { kind: 'selectors', objects: ['RpcBitcoinSelectors.PsbtSignerAccountSection'] },
    routes: [],
    startRoute: AppRoutes.Browser,
    params: [],
    entry: [
      {
        kind: 'rpc',
        method: 'signPsbt',
        steps: [
          `${openFromBrowser} window.LeatherProvider.request("signPsbt", { hex, broadcast?, signAtIndex?, allowedSighash?, network? }) after connecting with getAddresses`,
          'The approver sheet shows the PSBT signer; tap t`Approve`, or t`Sign transaction` when broadcast is false',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: {
      ready: RpcBitcoinSelectors.PsbtSignerAccountSection,
      others: [
        RpcBitcoinSelectors.PsbtSignerFeeSection,
        ApproverSelectors.ApproveButton,
        ApproverSelectors.CancelButton,
        ApproverSelectors.CloseWindowButton,
      ],
    },
    actions: [],
    specs: ['apps/mobile/src/features/psbt-signer/signer.spec.ts'],
    description:
      'SignPsbtApprover (features/browser/approver-sheet/sign-psbt.tsx) renders nothing unless the app is connected; it adds BIP32 derivation fields for the connected account and hands the PSBT to PsbtSigner (features/psbt-signer/psbt-signer.tsx) with the fee editor disabled. The signer shows t`You’ll send`, t`To address`, the account card, the fee card, warnings for no-broadcast, mutable sighash and unknown outputs, and the inputs and outputs under t`Show advanced options`. signer.spec.ts covers signAtIndex handling only.',
  },
  {
    id: 'rpc-bitcoin-send-transfer',
    anchor: { kind: 'selectors', objects: ['RpcBitcoinSelectors.PsbtSignerFeeSection'] },
    routes: [],
    startRoute: AppRoutes.Browser,
    params: [],
    entry: [
      {
        kind: 'rpc',
        method: 'sendTransfer',
        steps: [
          `${openFromBrowser} window.LeatherProvider.request("sendTransfer", { recipients: [{ address, amount }], network }), or the legacy { address, amount, network }, after connecting with getAddresses`,
          'The approver sheet shows t`Send token` with an editable fee; tap t`Approve`',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: {
      ready: RpcBitcoinSelectors.PsbtSignerFeeSection,
      others: [
        RpcBitcoinSelectors.PsbtSignerAccountSection,
        RpcBitcoinSelectors.SendTransferFeesUnavailable,
        ApproverSelectors.ApproveButton,
        ApproverSelectors.CloseWindowButton,
      ],
    },
    actions: [],
    specs: ['apps/mobile/src/features/browser/approver-sheet/send-transfer.utils.spec.ts'],
    description:
      'SendTransferApprover (features/browser/approver-sheet/send-transfer.tsx) needs a connected app; it waits for the account UTXOs and fee rates, builds an unsigned native segwit transaction at the halfHourFee rate and shows it in PsbtSigner with the fee editor enabled. Without fee rates it shows a t`Send token` approver with only t`To address` and a disabled approve button (SendTransferFeesUnavailable). broadcast defaults to true; the result carries txid and the hex. send-transfer.utils.spec.ts covers the recipient parsing.',
  },
  {
    id: 'rpc-bitcoin-sign-message',
    anchor: { kind: 'selectors', objects: ['RpcBitcoinSelectors.SignMessageSection'] },
    routes: [],
    startRoute: AppRoutes.Browser,
    params: [],
    entry: [
      {
        kind: 'rpc',
        method: 'signMessage',
        steps: [
          `${openFromBrowser} window.LeatherProvider.request("signMessage", { message, account?, network? })`,
          'The approver sheet shows t`Sign Message`; tap t`Approve`',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: {
      ready: RpcBitcoinSelectors.SignMessageSection,
      others: [ApproverSelectors.ApproveButton, ApproverSelectors.CancelButton],
    },
    actions: [],
    specs: [],
    description:
      'SignMessageApprover (features/browser/approver-sheet/sign-message/sign-message.tsx) in sign-message.layout.tsx: the t`Sign Message` header, the account card or t`Choose an account`, and the t`Message` cell. The account defaults to the connected one, or to the 1-based account param when it is in range. Approving signs with BIP-322 (bip322-signer.ts) and returns the signature, address and message. No spec covers it.',
  },
] as const satisfies readonly MobileFeatureEntry[];
