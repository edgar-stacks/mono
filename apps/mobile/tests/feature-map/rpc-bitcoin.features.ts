import { AppRoutes } from '@/shared/app-routes';
import { ApproverSelectors } from '@/shared/selectors/approver.selectors';
import { RpcBitcoinSelectors } from '@/shared/selectors/rpc-bitcoin.selectors';

import type { MobileFeatureEntry } from './mobile-feature-entry';

const unlockFlow = 'apps/mobile/maestro/shared/unlock.yaml';
const openBrowserTab = 'From Home tap the "Browser" tab';
const connectFirst =
  'Connect the page first by approving getAddresses or stx_getAddresses from the same origin';

export const rpcBitcoinFeatures = [
  {
    id: 'rpc-get-addresses',
    anchor: { kind: 'selectors', objects: ['ApproverSelectors.ConnectAccountSection'] },
    routes: [],
    startRoute: AppRoutes.Browser,
    params: [],
    entry: [
      {
        kind: 'rpc',
        method: 'getAddresses',
        steps: [
          openBrowserTab,
          "Load a dApp page that calls window.LeatherProvider.request('getAddresses')",
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
      'Approver titled "Connect" with the large favicon of the requesting origin. When the origin is already connected the card shows its account, otherwise the "Choose an account" cell renders; either opens the account selector sheet. "This app would like to" lists "Request approval for transactions" and "View your wallet balance & activity". "Approve" is disabled until an account is chosen; it answers with the account\'s taproot, native segwit and Stacks addresses and stores the origin as a connected app.',
  },
  {
    id: 'rpc-sign-psbt',
    anchor: { kind: 'selectors', objects: ['ApproverSelectors.OutcomeSection'] },
    routes: [],
    startRoute: AppRoutes.Browser,
    params: [],
    entry: [
      {
        kind: 'rpc',
        method: 'signPsbt',
        steps: [
          openBrowserTab,
          connectFirst,
          "Call window.LeatherProvider.request('signPsbt', { hex, broadcast })",
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
    specs: ['apps/mobile/src/features/psbt-signer/signer.spec.ts'],
    description:
      'Renders nothing unless the origin is connected. Approver titled "Send token" with "You’ll send", "To address", the account card, the fee card (fee editing is disabled for dApp PSBTs), "Total spend" and the inputs and outputs under "Show advanced options"; "Be careful with this transaction" shows for a mutable PSBT and "Unverified recipient" when an output has no address. "Approve" signs (only the inputs at signAtIndex when set); with broadcast it also broadcasts and then offers "Copy ID", "View details" and "Close window", without it the signed hex is returned to the dApp.',
  },
  {
    id: 'rpc-send-transfer',
    anchor: { kind: 'selectors', objects: ['ApproverSelectors.RecipientSection'] },
    routes: [],
    startRoute: AppRoutes.Browser,
    params: [],
    entry: [
      {
        kind: 'rpc',
        method: 'sendTransfer',
        steps: [
          openBrowserTab,
          connectFirst,
          "Call window.LeatherProvider.request('sendTransfer', { recipients: [{ address, amount }] })",
        ],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: {
      ready: ApproverSelectors.RecipientSection,
      others: [
        ApproverSelectors.OutcomeSection,
        ApproverSelectors.FeeSection,
        ApproverSelectors.CancelButton,
        ApproverSelectors.ApproveButton,
      ],
    },
    actions: [unlockFlow],
    specs: ['apps/mobile/src/features/browser/approver-sheet/send-transfer.utils.spec.ts'],
    description:
      'Builds a native segwit transaction to the requested recipients (amounts in sats; fractional amounts throw) at the half-hour fee rate and shows it in the PSBT approver with fee editing on. `broadcast` defaults to true: "Approve" signs, broadcasts and then offers "Copy ID" and "View details"; with `broadcast: false` the header and button read "Sign transaction" and "Leather won\'t broadcast this transaction" shows. When fee rates fail to load it shows only "Send token" with "To address" and a disabled "Approve". Throws when the origin is not connected.',
  },
  {
    id: 'rpc-sign-message',
    anchor: { kind: 'selectors', objects: ['RpcBitcoinSelectors.SignMessageSection'] },
    routes: [],
    startRoute: AppRoutes.Browser,
    params: [],
    entry: [
      {
        kind: 'rpc',
        method: 'signMessage',
        steps: [
          openBrowserTab,
          "Load a dApp page that calls window.LeatherProvider.request('signMessage', { message })",
        ],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: {
      ready: RpcBitcoinSelectors.SignMessageSection,
      others: [
        ApproverSelectors.AccountSection,
        ApproverSelectors.ChooseAccountCell,
        ApproverSelectors.CancelButton,
        ApproverSelectors.ApproveButton,
      ],
    },
    actions: [unlockFlow],
    specs: [],
    description:
      'Approver titled "Sign Message" with the account and the "Message" text. A connected origin preselects its account, or the 1-based `account` param of the request on the same wallet; otherwise the "Choose an account" cell renders and opens the account selector sheet. "Approve" signs the message with BIP-322 and answers the dApp.',
  },
] as const satisfies readonly MobileFeatureEntry[];
