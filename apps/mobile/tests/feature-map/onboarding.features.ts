import { AppRoutes } from '@/shared/app-routes';
import { HomeSelectors } from '@/shared/selectors/home.selectors';
import { OnboardingSelectors } from '@/shared/selectors/onboarding.selectors';
import { SharedSelectors } from '@/shared/selectors/shared.selectors';

import type { MobileFeatureEntry } from './mobile-feature-entry';

const tempMnemonicStoreSpec = 'apps/mobile/src/store/secure-store/temp-mnemonic-store.spec.ts';
const mnemonicStoreSpec = 'apps/mobile/src/store/secure-store/mnemonic-store.spec.ts';

export const onboardingFeatures = [
  {
    id: 'onboarding-add-wallet-sheet',
    anchor: { kind: 'selectors', objects: ['OnboardingSelectors.CreateNewWalletSheetButton'] },
    routes: [],
    startRoute: AppRoutes.Home,
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: [
          'Without a wallet, tap the create-wallet card on Home (HomeSelectors.CreateWalletCard)',
          'With wallets, tap the add-wallet button on /settings/wallet',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: ['release_waitlist_features'],
    preconditions: { session: 'signed-out', mocks: [] },
    selectors: {
      ready: OnboardingSelectors.CreateNewWalletSheetButton,
      others: [OnboardingSelectors.RestoreWalletSheetButton, HomeSelectors.CreateWalletCard],
    },
    actions: [],
    specs: [],
    description:
      'The global t`Add wallet` sheet (features/wallet-manager/add-wallet/add-wallet-sheet.tsx and .layout.tsx, mounted in src/app/_layout.tsx): t`Create new wallet` navigates to /create-new-wallet and t`Restore wallet` to /recover-wallet. A t`More options` row shows only with release_waitlist_features and only toggles its icon. No spec covers it.',
  },
  {
    id: 'onboarding-create-new-wallet',
    anchor: { kind: 'route' },
    routes: [AppRoutes.CreateNewWallet],
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: [
          'Open the add-wallet sheet and tap t`Create new wallet` (OnboardingSelectors.CreateNewWalletSheetButton)',
          "Tap t`Tap to view Secret Key`, then t`I've backed it up`",
        ],
      },
      { kind: 'deepLink', steps: ['Open leather://create-new-wallet'] },
    ],
    gate: 'splashScreen',
    flags: ['release_waitlist_features'],
    preconditions: { session: 'signed-out', mocks: [] },
    selectors: {
      ready: OnboardingSelectors.WalletCreationTapToReveal,
      others: [OnboardingSelectors.WalletCreationBackedUpButton, SharedSelectors.BackButton],
    },
    actions: [],
    specs: [tempMnemonicStoreSpec],
    description:
      "Back up a new Secret Key (src/app/create-new-wallet.tsx): t`Back up your Secret Key` generates a mnemonic on mount, stores it in tempMnemonicStore and blurs the words (MnemonicDisplay) until t`Tap to view Secret Key`; t`I've backed it up` stays disabled until revealed. Continuing goes to /secure-your-wallet when no security level was chosen yet, otherwise straight to wallet generation (hooks/use-create-wallet.ts). MnemonicDisplay reads release_waitlist_features. The unit spec covers only the temporary mnemonic store.",
  },
  {
    id: 'onboarding-secure-your-wallet',
    anchor: { kind: 'route' },
    routes: [AppRoutes.SecureYourWallet],
    params: [],
    deepLinkable: false,
    entry: [
      {
        kind: 'nav',
        steps: [
          'Create or restore a wallet while the security level is still "not-selected" (a fresh install)',
          'Tap t`Enable device security` or t`Skip for now`, then t`Continue without security` in the warning sheet',
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
      't`Secure your wallet` (src/app/secure-your-wallet.tsx): t`Enable device security` runs callIfEnrolled and creates the wallet with biometrics (security level "secure"); t`Skip for now` opens SkipSecureWalletSheet and t`Continue without security` creates it without ("insecure"). It needs the temporary mnemonic the create or restore screen stored, so a bare link does nothing on continue. No spec covers it.',
  },
  {
    id: 'onboarding-generating-wallet',
    anchor: { kind: 'route' },
    routes: [AppRoutes.GeneratingWallet],
    params: [],
    deepLinkable: false,
    entry: [
      {
        kind: 'nav',
        steps: [
          'Finish create, restore or secure-your-wallet; createWallet navigates here while the keychain is written',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-out', mocks: [] },
    selectors: {
      ready: OnboardingSelectors.GeneratingWalletScreen,
      others: [SharedSelectors.ToastContainer],
    },
    actions: [],
    specs: [mnemonicStoreSpec],
    description:
      'Transient t`Adding wallet...` screen with the wallet generation animation (src/app/generating-wallet.tsx). useCreateWallet restores the wallet from the temporary mnemonic, then toasts t`Wallet added` and replaces the stack with Home, or toasts t`Wallet added already` / t`An error occurred` and goes back. Reaching it without the flow leaves it on screen. The unit spec covers the mnemonic store only.',
  },
  {
    id: 'onboarding-recover-wallet',
    anchor: { kind: 'route' },
    routes: [AppRoutes.RecoverWallet],
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: [
          'Open the add-wallet sheet and tap t`Restore wallet` (OnboardingSelectors.RestoreWalletSheetButton)',
          'Paste or type the Secret Key into OnboardingSelectors.RestoreWalletTextInput and tap t`Continue`',
        ],
      },
      { kind: 'deepLink', steps: ['Open leather://recover-wallet'] },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-out', mocks: [] },
    selectors: {
      ready: OnboardingSelectors.RestoreWalletTextInput,
      others: [OnboardingSelectors.RestoreWalletContinue, SharedSelectors.BackButton],
    },
    actions: [],
    specs: [tempMnemonicStoreSpec],
    description:
      't`Enter your Secret Key` (features/recover-wallet/recover-wallet.tsx and recover-wallet.layout.tsx): a mnemonic field with a t`Paste` button, inline invalid-word errors and an t`Advanced options` accordion whose t`BIP39 passphrase` row opens RecoverWalletSheet. t`Continue` is enabled only for a valid mnemonic; it stores the mnemonic and passphrase in tempMnemonicStore and follows the create-wallet path. The unit spec covers only the temporary mnemonic store.',
  },
] as const satisfies readonly MobileFeatureEntry[];
