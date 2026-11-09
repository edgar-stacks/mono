import { AppRoutes } from '@/shared/app-routes';
import { SendSelectors } from '@/shared/selectors/send.selectors';
import { TokenSelectors } from '@/shared/selectors/token.selectors';

import type { MobileFeatureEntry } from './mobile-feature-entry';

const recipientSuggestionsSpec =
  'apps/mobile/src/features/send/components/recipient/build-recipient-suggestions.spec.ts';
const openSendSheetStep =
  'On the home screen tap "Send" in the account actions row (it renders only when a wallet exists)';
const sendFormSteps = [openSendSheetStep, 'Under "Select asset" tap the asset row'] as const;
const tokenScreenSteps = [
  'Open an asset from the home screen',
  'Tap "Send" on the token screen',
] as const;
const unlock = 'apps/mobile/maestro/shared/unlock.yaml';

export const sendFeatures = [
  {
    id: 'send-select-asset',
    anchor: { kind: 'selectors', objects: ['SendSelectors.SelectAssetList'] },
    routes: [],
    startRoute: AppRoutes.Home,
    open: [unlock],
    params: [],
    entry: [{ kind: 'nav', steps: [openSendSheetStep] }],
    gate: 'splashScreen',
    flags: ['release_sip10_send_feature'],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: {
      ready: SendSelectors.SelectAssetList,
      others: [TokenSelectors.BalanceItem],
    },
    actions: [],
    specs: [],
    description:
      'Full-height send sheet opened without an asset, headed "Select asset" with the subtitle "Send". It lists the Bitcoin and Stacks balances of the current account, then its SIP-10 tokens only while release_sip10_send_feature is on. Each row is a token cell whose testID is `tokenBalanceItem-<ticker>` (prefix plus the ticker). Tapping a row opens the send form for that asset.',
  },
  {
    id: 'send-btc-form',
    anchor: { kind: 'selectors', objects: ['SendSelectors.AmountField'] },
    routes: [],
    startRoute: AppRoutes.Home,
    open: [unlock],
    params: [],
    entry: [
      { kind: 'nav', steps: [...sendFormSteps] },
      { kind: 'nav', steps: [...tokenScreenSteps] },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: {
      ready: SendSelectors.AmountField,
      others: [
        TokenSelectors.BalanceItem,
        SendSelectors.RecipientToggle,
        SendSelectors.RecipientQrButton,
        SendSelectors.ReviewButton,
      ],
    },
    actions: [],
    specs: [],
    description:
      'Send form for "Bitcoin", headed "Send" with the account name as subtitle. The asset row (`tokenBalanceItem-BTC`) reopens the inline asset picker; below it sit the amount field with send max, the "Enter recipient" toggle with a "Scan a QR code" button, a numpad and "Review", which stays disabled until the form is valid. Amount errors include "Insufficient funds" and "Minimum is …". "Review" moves to the Bitcoin transaction signer with a fee editor that broadcasts on approval; that approver lives in features/psbt-signer.',
  },
  {
    id: 'send-stx-form',
    anchor: { kind: 'selectors', objects: ['SendSelectors.MemoToggle'] },
    routes: [],
    startRoute: AppRoutes.Home,
    open: [unlock],
    params: [],
    entry: [
      { kind: 'nav', steps: [...sendFormSteps] },
      { kind: 'nav', steps: [...tokenScreenSteps] },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: {
      ready: SendSelectors.AmountField,
      others: [
        TokenSelectors.BalanceItem,
        SendSelectors.RecipientToggle,
        SendSelectors.MemoToggle,
        SendSelectors.ReviewButton,
      ],
    },
    actions: [],
    specs: [],
    description:
      'Send form for "Stacks": the same layout as the Bitcoin form plus an "Add memo" toggle ("Edit memo" once set) that opens the memo sheet. "Review" moves to the Stacks transaction approver; approving signs and broadcasts the transaction and shows the toast "Transaction is sent!", and "Edit" goes back to the form.',
  },
  {
    id: 'send-sip10-form',
    anchor: { kind: 'selectors', objects: ['SendSelectors.ReviewButton'] },
    routes: [],
    startRoute: AppRoutes.Home,
    open: [unlock],
    params: [],
    entry: [
      { kind: 'nav', steps: [...sendFormSteps] },
      { kind: 'nav', steps: [...tokenScreenSteps] },
    ],
    gate: 'splashScreen',
    flags: ['release_sip10_send_feature'],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: {
      ready: SendSelectors.AmountField,
      others: [
        TokenSelectors.BalanceItem,
        SendSelectors.RecipientToggle,
        SendSelectors.MemoToggle,
        SendSelectors.ReviewButton,
      ],
    },
    actions: [],
    specs: [],
    description:
      'Send form for a SIP-10 token: the Stacks form layout (amount, recipient, memo, numpad, "Review") for the selected token. The select-asset list only offers SIP-10 tokens while release_sip10_send_feature is on; the token screen offers "Send" when the token can be sent. "Review" moves to the SIP-10 approver, which signs, broadcasts and shows "Transaction is sent!".',
  },
  {
    id: 'send-recipient-selector',
    anchor: { kind: 'selectors', objects: ['SendSelectors.RecipientSearch'] },
    routes: [],
    startRoute: AppRoutes.Home,
    open: [unlock],
    params: [],
    entry: [{ kind: 'nav', steps: [...sendFormSteps, 'Tap "Enter recipient"'] }],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: {
      ready: SendSelectors.RecipientSearch,
      others: [SendSelectors.RecipientSelectorQrButton],
    },
    actions: [],
    specs: [recipientSuggestionsSpec],
    description:
      'Recipient sheet over the send form with the search field "Search for BNS name or address" and, while the field is empty, a "Scan a QR code" button (plus an iOS paste button when send_paste_button is on). Suggestions are grouped under "Recents", "Your accounts" and "Matching"; a search with no match shows "No results found". Picking an address runs the recipient guard.',
  },
  {
    id: 'send-recipient-guard',
    anchor: { kind: 'selectors', objects: ['SendSelectors.RecipientGuardConfirmButton'] },
    routes: [],
    startRoute: AppRoutes.Home,
    open: [unlock],
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: [
          ...sendFormSteps,
          'Tap "Enter recipient"',
          'Pick or type an address you have not sent to before',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: {
      ready: SendSelectors.RecipientGuardConfirmButton,
      others: [SendSelectors.RecipientGuardCancelButton],
    },
    actions: [],
    specs: [],
    description:
      'Guard sheet shown after choosing a recipient that needs attention. Warnings ("Verify full address", "Sending to the same address") show the address with "Confirm" and "Cancel". Blocks ("Can’t send to the same address", "Address from another network", "Address blocked") show a single "Dismiss" button whose testID is `sendRecipientGuardDismissButton` instead.',
  },
  {
    id: 'send-recipient-qr-scanner',
    anchor: { kind: 'selectors', objects: ['SendSelectors.QrScannerCloseButton'] },
    routes: [],
    startRoute: AppRoutes.Home,
    open: [unlock],
    params: [],
    entry: [{ kind: 'nav', steps: [...sendFormSteps, 'Tap "Scan a QR code"'] }],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: { ready: SendSelectors.QrScannerCloseButton, others: [] },
    actions: [],
    specs: [],
    description:
      'Full-screen camera sheet titled "Scan QR Code" with a "Close the scanner" button. A code that is not an address of the asset shows "Scan a Bitcoin or Stacks address"; a valid scan fills the recipient. Needs camera permission, so it cannot run on a simulator without a camera.',
  },
  {
    id: 'send-memo',
    anchor: { kind: 'selectors', objects: ['SendSelectors.MemoInput'] },
    routes: [],
    startRoute: AppRoutes.Home,
    open: [unlock],
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: [openSendSheetStep, 'Tap the Stacks row', 'Tap "Add memo"'],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: { ready: SendSelectors.MemoInput, others: [] },
    actions: [],
    specs: [],
    description:
      'Memo sheet titled "Add memo" with a "Memo" input, shown from the Stacks and SIP-10 send forms. Submitting an invalid memo shows "Memo must be less than 34-bytes" and marks the toggle red.',
  },
] as const satisfies readonly MobileFeatureEntry[];
