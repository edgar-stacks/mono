import { AppRoutes } from '@/shared/app-routes';
import { ApproverSelectors } from '@/shared/selectors/approver.selectors';
import { RpcBitcoinSelectors } from '@/shared/selectors/rpc-bitcoin.selectors';
import { RpcStacksSelectors } from '@/shared/selectors/rpc-stacks.selectors';
import { SendSelectors } from '@/shared/selectors/send.selectors';
import { SharedSelectors } from '@/shared/selectors/shared.selectors';

import type { MobileFeatureEntry } from './mobile-feature-entry';

const openSendSteps = [
  'On Home tap "Send" (SharedSelectors.SendButton), or "Send" on a token screen to skip the asset step',
] as const;

export const sendFeatures = [
  {
    id: 'send-select-asset',
    anchor: { kind: 'selectors', objects: ['SendSelectors.SelectAssetScreen'] },
    routes: [],
    startRoute: AppRoutes.Home,
    params: [],
    entry: [{ kind: 'nav', steps: [...openSendSteps] }],
    gate: 'splashScreen',
    flags: ['release_sip10_send_feature'],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: { ready: SendSelectors.SelectAssetScreen, others: [SharedSelectors.SendButton] },
    actions: [],
    specs: ['apps/mobile/src/features/balances/assets/utils/sort-sip10-balances.spec.ts'],
    description:
      'First step of the global send sheet (send-sheet.tsx, mounted only with a current account): "Select asset" with the subtitle "Send" (send/screens/select-asset.tsx). It lists Bitcoin and Stacks, plus SIP-10 tokens when release_sip10_send_feature is on (asset-picker.tsx). Picking one opens the form.',
  },
  {
    id: 'send-form',
    anchor: { kind: 'selectors', objects: ['SendSelectors.FormScreen'] },
    routes: [],
    startRoute: AppRoutes.Home,
    params: [],
    entry: [{ kind: 'nav', steps: [...openSendSteps, 'Pick an asset'] }],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: { ready: SendSelectors.FormScreen, others: [SharedSelectors.BackButton] },
    actions: [],
    specs: [],
    description:
      '"Send" form (send/screens/form.tsx with btc-form, stx-form and sip10-form): recipient, amount with "Max", "Add memo" / "Edit memo" for Stacks and "Review". Errors such as "Insufficient funds" and "Address is not valid" come from send/error-messages.ts. It reads the asset chosen in the previous step from the sheet navigator.',
  },
  {
    id: 'send-recipient-sheet',
    anchor: { kind: 'selectors', objects: ['SendSelectors.RecipientSheet'] },
    routes: [],
    startRoute: AppRoutes.Home,
    params: [],
    entry: [{ kind: 'nav', steps: [...openSendSteps, 'Pick an asset', 'Tap the recipient field'] }],
    gate: 'splashScreen',
    flags: ['send_paste_button'],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: { ready: SendSelectors.RecipientSheet, others: [] },
    actions: [],
    specs: [
      'apps/mobile/src/features/send/components/recipient/build-recipient-suggestions.spec.ts',
    ],
    description:
      '"Enter recipient" sheet (recipient-sheet.tsx and recipient-selector.tsx): "Search for BNS name or address", sections "Recents", "Your accounts" and "Matching", "No results found", and "Scan a QR code". The iOS paste button needs send_paste_button.',
  },
  {
    id: 'send-recipient-qr-scanner',
    anchor: { kind: 'selectors', objects: ['SharedSelectors.QrScanner'] },
    routes: [],
    startRoute: AppRoutes.Home,
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: [
          ...openSendSteps,
          'Pick an asset',
          'Open the recipient sheet',
          'Tap "Scan a QR code"',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: { ready: SharedSelectors.QrScanner, others: [] },
    actions: [],
    specs: [],
    description:
      'Full-screen QR scanner (recipient-qr-sheet.tsx with recipient-qr-scanner.tsx on features/qr-scanner) titled "Scan a Bitcoin or Stacks address"; it asks for "Allow Camera Access" first. A scanned Bitcoin, BIP-21 or Stacks address fills the recipient; "Close the scanner" goes back.',
  },
  {
    id: 'send-recipient-guard-sheet',
    anchor: { kind: 'selectors', objects: ['SendSelectors.RecipientGuardSheet'] },
    routes: [],
    startRoute: AppRoutes.Home,
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: [
          ...openSendSteps,
          'Pick an asset',
          'Enter the own address, an address of another network or a blocked address',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: { ready: SendSelectors.RecipientGuardSheet, others: [] },
    actions: [],
    specs: [],
    description:
      'Recipient warning sheet (recipient-guard-sheet.tsx, driven by use-recipient-evaluator.ts) with titles such as "Verify full address", "Sending to the same address", "Can’t send to the same address", "Address from another network" and "Address blocked", and "Confirm", "Cancel" or "Dismiss".',
  },
  {
    id: 'send-review-btc',
    anchor: { kind: 'selectors', objects: ['RpcBitcoinSelectors.PsbtSigner'] },
    routes: [],
    startRoute: AppRoutes.Home,
    params: [],
    entry: [
      { kind: 'nav', steps: [...openSendSteps, 'Pick Bitcoin', 'Fill the form and tap "Review"'] },
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
      'Bitcoin review step (send/screens/approver.tsx rendering PsbtSigner with broadcast and the fee editor): "Send token", "You’ll send", "To address", "Show advanced options" and "Total spend". "Approve" signs and broadcasts ("Submitting...", "Submitted"); a failed broadcast shows "Failed to broadcast transaction". Tapping the fee row opens the bitcoin fee sheet.',
  },
  {
    id: 'send-review-stx',
    anchor: { kind: 'selectors', objects: ['RpcStacksSelectors.TransactionApprover'] },
    routes: [],
    startRoute: AppRoutes.Home,
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: [
          ...openSendSteps,
          'Pick Stacks or a SIP-10 token',
          'Fill the form and tap "Review"',
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
    specs: ['apps/mobile/src/features/approver/components/status-row/utils.spec.ts'],
    description:
      'Stacks and SIP-10 review step (StxApprover and Sip10Approver on base-stx-tx-approver.layout.tsx): "Sign Transaction" with "You’ll send", the fee, memo and nonce rows that open their sheets, and "Approve"; success shows the "Transaction is sent!" toast and the status row.',
  },
  {
    id: 'bitcoin-fee-sheet',
    anchor: { kind: 'selectors', objects: ['ApproverSelectors.BitcoinFeeSheet'] },
    routes: [],
    startRoute: AppRoutes.Home,
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: ['Open the Bitcoin review step or a Bitcoin approver', 'Tap the fee row'],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: { ready: ApproverSelectors.BitcoinFeeSheet, others: [] },
    actions: [],
    specs: [],
    description:
      'Bitcoin fee sheet (bitcoin-fee-sheet.tsx on fee-sheet.layout.tsx) with "Slow", "Standard", "Fast" and "Custom" and time estimates such as "~1 hour+"; choosing one rebuilds the PSBT and shows "Fee updated".',
  },
  {
    id: 'stacks-fee-sheet',
    anchor: { kind: 'selectors', objects: ['ApproverSelectors.StacksFeeSheet'] },
    routes: [],
    startRoute: AppRoutes.Home,
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: ['Open the Stacks review step or a Stacks approver', 'Tap the fee row'],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: { ready: ApproverSelectors.StacksFeeSheet, others: [] },
    actions: [],
    specs: [],
    description:
      'Stacks fee sheet (stacks-fee-sheet.tsx on fee-sheet.layout.tsx) with "Slow", "Standard", "Fast" and "Custom"; choosing one shows "Fee updated" (approver/stx/hooks.ts).',
  },
  {
    id: 'stacks-memo-nonce-sheets',
    anchor: {
      kind: 'selectors',
      objects: ['ApproverSelectors.MemoSheetInput', 'ApproverSelectors.NonceSheetInput'],
    },
    routes: [],
    startRoute: AppRoutes.Home,
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: [
          'Open the Stacks review step or a Stacks approver',
          'Tap the memo or the nonce row',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: {
      ready: ApproverSelectors.MemoSheetInput,
      others: [ApproverSelectors.NonceSheetInput],
    },
    actions: [],
    specs: [],
    description:
      'Memo and nonce input sheets (memo-sheet.tsx and nonce-sheet.tsx on input-sheet.layout.tsx). Both are titled "Add memo" with the "Memo" placeholder and "Confirm": nonce-sheet.tsx reuses the memo strings. Saving shows "Memo updated" or "Nonce updated".',
  },
] as const satisfies readonly MobileFeatureEntry[];
