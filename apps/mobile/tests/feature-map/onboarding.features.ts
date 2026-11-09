import { AppRoutes } from '@/shared/app-routes';
import { HomeSelectors } from '@/shared/selectors/home.selectors';
import { OnboardingSelectors } from '@/shared/selectors/onboarding.selectors';
import { SharedSelectors } from '@/shared/selectors/shared.selectors';

import type { MobileFeatureEntry } from './mobile-feature-entry';

const smokeTestsCiFlow = 'apps/mobile/maestro/flows/smoke-tests-ci.yaml';
const tempMnemonicSpec = 'apps/mobile/src/store/secure-store/temp-mnemonic-store.spec.ts';
const mnemonicSpec = 'apps/mobile/src/store/secure-store/mnemonic-store.spec.ts';

export const onboardingFeatures = [
  {
    id: 'home-without-wallet',
    anchor: { kind: 'selectors', objects: ['HomeSelectors.ScreenWithoutAccount'] },
    routes: [],
    startRoute: AppRoutes.Home,
    open: ['clean-up'],
    params: [],
    entry: [{ kind: 'nav', steps: ['Launch the app with no wallet, or remove every wallet'] }],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-out', mocks: [] },
    selectors: {
      ready: HomeSelectors.ScreenWithoutAccount,
      others: [
        HomeSelectors.CreateWalletCard,
        HomeSelectors.SettingsButton,
        SharedSelectors.NetworkBadge,
      ],
    },
    actions: [],
    specs: [smokeTestsCiFlow],
    description:
      'Signed-out home (components/home/home-without-account-screen.tsx): the Leather logo, the network badge, the settings gear and a single t`Add account` card that opens the add wallet sheet.',
  },
  {
    id: 'add-wallet-sheet',
    anchor: { kind: 'selectors', objects: ['OnboardingSelectors.CreateNewWalletSheetButton'] },
    routes: [],
    startRoute: AppRoutes.Home,
    open: [],
    params: [],
    entry: [
      { kind: 'nav', steps: ['On the signed-out home tap the "Add account" card'] },
      { kind: 'nav', steps: ['In Settings › Wallets and accounts tap the add wallet button'] },
    ],
    gate: 'splashScreen',
    flags: ['release_waitlist_features'],
    preconditions: { session: 'signed-out', mocks: [] },
    selectors: {
      ready: OnboardingSelectors.CreateNewWalletSheetButton,
      others: [
        OnboardingSelectors.RestoreWalletSheetButton,
        OnboardingSelectors.AddWalletMoreOptionsButton,
      ],
    },
    actions: [],
    specs: [],
    description:
      'Add wallet sheet (features/wallet-manager/add-wallet/add-wallet-sheet.layout.tsx): t`Add wallet` with t`Create new wallet` (t`Generate new Secret Key for self-custody`) leading to the create-new-wallet route and t`Restore wallet` (t`Import existing accounts from self-custody`) leading to recover-wallet; t`More options` shows only with release_waitlist_features on.',
  },
  {
    id: 'create-new-wallet',
    anchor: { kind: 'route' },
    routes: [AppRoutes.CreateNewWallet],
    params: [],
    entry: [
      { kind: 'nav', steps: ['Open the add wallet sheet', 'Tap "Create new wallet"'] },
      { kind: 'deepLink', steps: ['Open leather://create-new-wallet'] },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-out', mocks: [] },
    selectors: {
      ready: OnboardingSelectors.WalletCreationTapToReveal,
      others: [OnboardingSelectors.WalletCreationBackedUpButton],
    },
    actions: [],
    specs: [tempMnemonicSpec],
    description:
      "Back up screen (apps/mobile/src/app/create-new-wallet.tsx): generates a mnemonic on mount and keeps it in the temporary mnemonic store, shows t`Back up your Secret Key` and t`Your Secret Key grants you access to your wallet and its assets. Store it securely since it can never be recovered if lost or stolen.` over a blurred t`Tap to view Secret Key` / t`For your eyes only` banner; t`I've backed it up` stays disabled until the key is revealed, then continues to secure-your-wallet.",
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
        steps: ['On create-new-wallet reveal the key and tap "I\'ve backed it up"'],
      },
      { kind: 'nav', steps: ['On recover-wallet enter a valid Secret Key and tap "Continue"'] },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-out', mocks: [] },
    selectors: {
      ready: OnboardingSelectors.SecureWalletEnableButton,
      others: [OnboardingSelectors.SecureWalletSkipButton],
    },
    actions: [],
    specs: [tempMnemonicSpec],
    description:
      'Secure your wallet (apps/mobile/src/app/secure-your-wallet.tsx): t`Secure your wallet`, t`Use your device PIN, Face ID or other biometrics to secure your wallets`, t`Enable device security` (creates the wallet with biometrics when enrolled) and t`Skip for now`, which opens the skip-secure-wallet warning sheet t`Continue without security` before creating the wallet without biometrics. Reads the temporary mnemonic the previous screen stored, so it cannot be opened as a bare link.',
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
        steps: ['On secure-your-wallet tap "Enable device security" or skip and confirm'],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-out', mocks: [] },
    selectors: { ready: OnboardingSelectors.GeneratingWalletScreen, others: [] },
    actions: [],
    specs: [mnemonicSpec],
    description:
      'Wallet generation animation (apps/mobile/src/app/generating-wallet.tsx) with t`Adding wallet...` while the wallet created on secure-your-wallet is stored; it then returns home with the new account.',
  },
  {
    id: 'recover-wallet',
    anchor: { kind: 'route' },
    routes: [AppRoutes.RecoverWallet],
    params: [],
    entry: [
      { kind: 'nav', steps: ['Open the add wallet sheet', 'Tap "Restore wallet"'] },
      { kind: 'deepLink', steps: ['Open leather://recover-wallet'] },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-out', mocks: [] },
    selectors: {
      ready: OnboardingSelectors.RestoreWalletTextInput,
      others: [
        OnboardingSelectors.RestoreWalletContinue,
        OnboardingSelectors.RestoreWalletPassphraseCell,
      ],
    },
    actions: [],
    specs: [mnemonicSpec],
    description:
      'Restore wallet (features/recover-wallet/recover-wallet.tsx and recover-wallet.layout.tsx): t`Enter your Secret Key`, t`Paste or type Secret Key to add wallet`, a t`Paste` button over the t`Enter your Secret Key` input, an t`Advanced options` accordion with the t`BIP39 passphrase` row (t`Enabled` / t`Disabled`) and t`Continue`, enabled once the key is valid, which continues to secure-your-wallet.',
  },
  {
    id: 'recover-wallet-passphrase-sheet',
    anchor: { kind: 'selectors', objects: ['OnboardingSelectors.RestoreWalletPassphraseInput'] },
    routes: [],
    startRoute: AppRoutes.RecoverWallet,
    open: [],
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: ['On recover-wallet expand "Advanced options"', 'Tap "BIP39 passphrase"'],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-out', mocks: [] },
    selectors: {
      ready: OnboardingSelectors.RestoreWalletPassphraseInput,
      others: [OnboardingSelectors.RestoreWalletPassphraseConfirm],
    },
    actions: [],
    specs: [],
    description:
      'BIP39 passphrase sheet (features/wallet-manager/recover-wallet/recover-wallet-sheet.tsx): t`BIP39 passphrase` input sheet with the t`Passphrase` placeholder and t`Confirm`, which stores the passphrase for the restore and closes the sheet.',
  },
] as const satisfies readonly MobileFeatureEntry[];
