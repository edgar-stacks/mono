import { AppRoutes } from '@/shared/app-routes';
import { GlobalSheetSelectors } from '@/shared/selectors/global-sheet.selectors';
import { OnboardingSelectors } from '@/shared/selectors/onboarding.selectors';
import { SharedSelectors } from '@/shared/selectors/shared.selectors';

import type { MobileFeatureEntry } from './mobile-feature-entry';

const tempMnemonicStoreSpec = 'apps/mobile/src/store/secure-store/temp-mnemonic-store.spec.ts';

export const onboardingFeatures = [
  {
    id: 'add-wallet-sheet',
    anchor: { kind: 'selectors', objects: ['GlobalSheetSelectors'] },
    routes: [],
    startRoute: AppRoutes.Home,
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: ['With no wallet, open the app and tap the create wallet card on Home'],
      },
      {
        kind: 'nav',
        steps: [
          'Home → settings button → "Wallets and accounts"',
          'Tap "Add wallet" below the wallet list, or the "Add wallet" button when there are no wallets',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: ['release_waitlist_features'],
    preconditions: { session: 'signed-out', mocks: [] },
    selectors: {
      ready: GlobalSheetSelectors.CreateNewWalletButton,
      others: [GlobalSheetSelectors.RestoreWalletButton],
    },
    actions: [],
    specs: [],
    description:
      'Global "Add wallet" sheet rendered by the root layout. "Create new wallet" ("Generate new Secret Key for self-custody") navigates to /create-new-wallet and "Restore wallet" ("Import existing accounts from self-custody") to /recover-wallet; both close the sheet. A third "More options" cell only renders when release_waitlist_features is on. On Home without a wallet the opener is the create wallet card (homeCreateWalletCard).',
  },
  {
    id: 'create-new-wallet',
    anchor: { kind: 'route' },
    routes: [AppRoutes.CreateNewWallet],
    params: [],
    entry: [
      { kind: 'nav', steps: ['Open the Add wallet sheet', 'Tap "Create new wallet"'] },
      { kind: 'deepLink', steps: ['Open leather://create-new-wallet'] },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-out', mocks: [] },
    selectors: {
      ready: OnboardingSelectors.WalletCreationTapToReveal,
      others: [OnboardingSelectors.WalletCreationBackedUpButton, SharedSelectors.BackButton],
    },
    actions: [],
    specs: [tempMnemonicStoreSpec],
    description:
      '"Back up your Secret Key". On mount the screen generates a mnemonic and stores it in the temporary mnemonic store. The words sit behind a blurred "Tap to view Secret Key" / "For your eyes only" banner; tapping it reveals them and enables "I\'ve backed it up", which goes to /secure-your-wallet while no security level is chosen, otherwise creates the wallet directly through /generating-wallet. Also reachable signed in from the Add wallet sheet.',
  },
  {
    id: 'secure-your-wallet',
    anchor: { kind: 'route' },
    routes: [AppRoutes.SecureYourWallet],
    deepLinkable: false,
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: [
          'Create or restore a wallet while no security level has been chosen',
          'Tap "I\'ve backed it up" or "Continue"',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-out', mocks: [] },
    selectors: {
      ready: OnboardingSelectors.SecureWalletEnableButton,
      others: [OnboardingSelectors.SecureWalletSkipButton],
    },
    actions: [],
    specs: [],
    description:
      '"Secure your wallet": "Use your device PIN, Face ID or other biometrics to secure your wallets". "Enable device security" creates the wallet with biometrics if the device is enrolled; "Skip for now" opens the skip warning sheet. The wallet is created from the temporary mnemonic the previous screen stored, so a bare deep link has nothing to create.',
  },
  {
    id: 'skip-secure-wallet-sheet',
    anchor: { kind: 'selectors', objects: ['OnboardingSelectors.SecureWalletSkipSheet'] },
    routes: [],
    startRoute: AppRoutes.SecureYourWallet,
    params: [],
    entry: [{ kind: 'nav', steps: ['On "Secure your wallet" tap "Skip for now"'] }],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-out', mocks: [] },
    selectors: {
      ready: OnboardingSelectors.SecureWalletSkipSheet,
      others: [OnboardingSelectors.SecureWalletSkipSheetContinueButton],
    },
    actions: [],
    specs: [],
    description:
      'Critical warning sheet "Continue without security": "Proceed with caution since your wallet will not be protected by your device’s native security mechanism." "Continue" closes the sheet and creates the wallet without biometrics; "Cancel" dismisses it.',
  },
  {
    id: 'generating-wallet',
    anchor: { kind: 'route' },
    routes: [AppRoutes.GeneratingWallet],
    deepLinkable: false,
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: [
          'Finish creating or restoring a wallet; the app navigates here while it adds the wallet',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-out', mocks: [] },
    selectors: { ready: OnboardingSelectors.GeneratingWalletScreen, others: [] },
    actions: [],
    specs: [],
    description:
      'Transitional screen with "Adding wallet..." over the wallet generation animation, shown by useCreateWallet while it restores the wallet from the temporary mnemonic. On success it shows the "Wallet added" toast and replaces the stack with Home; on a duplicate it shows "Wallet added already" and goes back; on any other error "An error occurred" and goes back.',
  },
  {
    id: 'recover-wallet',
    anchor: { kind: 'route' },
    routes: [AppRoutes.RecoverWallet],
    params: [],
    entry: [
      { kind: 'nav', steps: ['Open the Add wallet sheet', 'Tap "Restore wallet"'] },
      { kind: 'deepLink', steps: ['Open leather://recover-wallet'] },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-out', mocks: [] },
    selectors: {
      ready: OnboardingSelectors.RestoreWalletTextInput,
      others: [
        OnboardingSelectors.RestoreWalletPasteButton,
        OnboardingSelectors.RestoreWalletContinue,
        OnboardingSelectors.RestoreWalletPassphraseCell,
      ],
    },
    actions: [],
    specs: [tempMnemonicStoreSpec],
    description:
      '"Enter your Secret Key": "Paste or type Secret Key to add wallet". The multiline input (placeholder "Enter your Secret Key") validates words on blur and enables "Continue" only for a valid mnemonic; "Paste" fills it from the clipboard and hides once the input has text. The passphrase cell "BIP39 passphrase" ("Enabled" / "Disabled") only renders after expanding the "Advanced options" accordion. "Continue" stores the mnemonic and passphrase temporarily, then follows the same path as create.',
  },
  {
    id: 'recover-wallet-passphrase-sheet',
    anchor: { kind: 'selectors', objects: ['OnboardingSelectors.RestoreWalletPassphraseInput'] },
    routes: [],
    startRoute: AppRoutes.RecoverWallet,
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: ['On "Enter your Secret Key" expand "Advanced options"', 'Tap "BIP39 passphrase"'],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-out', mocks: [] },
    selectors: {
      ready: OnboardingSelectors.RestoreWalletPassphraseInput,
      others: [OnboardingSelectors.RestoreWalletPassphraseConfirmButton],
    },
    actions: [],
    specs: [],
    description:
      'Input sheet "BIP39 passphrase" with placeholder "Passphrase"; "Confirm" closes the sheet and sets the passphrase, which turns the cell caption to "Enabled".',
  },
] as const satisfies readonly MobileFeatureEntry[];
