import { AppRoutes } from '@/shared/app-routes';
import { GlobalSheetSelectors } from '@/shared/selectors/global-sheet.selectors';
import { HomeSelectors } from '@/shared/selectors/home.selectors';
import { OnboardingSelectors } from '@/shared/selectors/onboarding.selectors';
import { SharedSelectors } from '@/shared/selectors/shared.selectors';

import type { MobileFeatureEntry } from './mobile-feature-entry';

const secureStoreSpecs = [
  'apps/mobile/src/store/secure-store/mnemonic-store.spec.ts',
  'apps/mobile/src/store/secure-store/temp-mnemonic-store.spec.ts',
] as const;

export const onboardingFeatures = [
  {
    id: 'add-wallet-sheet',
    anchor: { kind: 'selectors', objects: ['GlobalSheetSelectors.AddWalletSheet'] },
    routes: [],
    startRoute: AppRoutes.Home,
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: [
          'Without a wallet tap the "Add account" card on Home (HomeSelectors.CreateWalletCard)',
          'With a wallet open Settings, "Wallets and accounts", then "Add wallet"',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: ['release_waitlist_features'],
    preconditions: { session: 'signed-out', mocks: [] },
    selectors: {
      ready: GlobalSheetSelectors.AddWalletSheet,
      others: [
        HomeSelectors.CreateWalletCard,
        OnboardingSelectors.CreateNewWalletSheetButton,
        OnboardingSelectors.RestoreWalletSheetButton,
      ],
    },
    actions: [],
    specs: ['apps/mobile/maestro/flows/smoke-tests-ci.yaml'],
    description:
      'Global "Add wallet" sheet (add-wallet-sheet.layout.tsx) with "Create new wallet" ("Generate new Secret Key for self-custody", OnboardingSelectors.CreateNewWalletSheetButton) and "Restore wallet" ("Import existing accounts from self-custody", OnboardingSelectors.RestoreWalletSheetButton). "More options" only shows with release_waitlist_features and opens the not-yet-available sheet.',
  },
  {
    id: 'add-account-sheet',
    anchor: { kind: 'selectors', objects: ['GlobalSheetSelectors.AddAccountSheet'] },
    routes: [],
    startRoute: AppRoutes.Home,
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: [
          'No screen presents it: add-account-sheet.tsx is mounted in the root layout but nothing calls its present()',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: { ready: GlobalSheetSelectors.AddAccountSheet, others: [] },
    actions: [],
    specs: [],
    description:
      'Global "Add account" sheet (features/account/sheets/add-account-sheet.tsx) with "Add to existing wallet" ("Choose existing wallet", navigates to /settings/wallet) and "Add to new wallet". It is mounted but unreachable; accounts are added from the wallet cards on the Wallets screen.',
  },
  {
    id: 'create-new-wallet',
    anchor: { kind: 'route' },
    routes: [AppRoutes.CreateNewWallet],
    params: [],
    entry: [
      { kind: 'nav', steps: ['Open the add wallet sheet', 'Tap "Create new wallet"'] },
      { kind: 'deepLink', steps: ['Open leather:///create-new-wallet'] },
    ],
    gate: 'splashScreen',
    flags: ['release_waitlist_features'],
    preconditions: { session: 'signed-out', mocks: [] },
    selectors: {
      ready: OnboardingSelectors.WalletCreationTapToReveal,
      others: [OnboardingSelectors.WalletCreationBackedUpButton, SharedSelectors.BackButton],
    },
    actions: [],
    specs: [...secureStoreSpecs],
    description:
      '"Back up your Secret Key" screen, create-new-wallet.tsx. It generates a mnemonic and hides it behind "Tap to view Secret Key" / "For your eyes only" (OnboardingSelectors.WalletCreationTapToReveal); "Copy" copies it ("Copied to clipboard") and "Save to..." needs release_waitlist_features. "I\'ve backed it up" (OnboardingSelectors.WalletCreationBackedUpButton) stays disabled until the key is revealed, then continues to /secure-your-wallet when no security level was chosen yet, otherwise straight to /generating-wallet (use-create-wallet.ts).',
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
          'Create or restore the first wallet while the security preference is still "not-selected"',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-out', mocks: [] },
    selectors: { ready: OnboardingSelectors.SecureYourWalletScreen, others: [] },
    actions: [],
    specs: [],
    description:
      '"Secure your wallet" screen, secure-your-wallet.tsx: "Use your device PIN, Face ID or other biometrics to secure your wallets", with "Enable device security" and "Skip for now" (opens the skip security sheet). Both continue to /generating-wallet with the mnemonic kept in the temporary secure store, so the screen does nothing useful when opened by link.',
  },
  {
    id: 'skip-security-sheet',
    anchor: { kind: 'selectors', objects: ['OnboardingSelectors.SkipSecuritySheet'] },
    routes: [],
    startRoute: AppRoutes.SecureYourWallet,
    params: [],
    entry: [{ kind: 'nav', steps: ['On "Secure your wallet" tap "Skip for now"'] }],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-out', mocks: [] },
    selectors: { ready: OnboardingSelectors.SkipSecuritySheet, others: [] },
    actions: [],
    specs: [],
    description:
      '"Continue without security" warning sheet (skip-secure-wallet-sheet.tsx on warning-sheet.layout.tsx): "Proceed with caution since your wallet will not be protected by your device’s native security mechanism." "Continue" stores the insecure preference and generates the wallet; "Cancel" closes it.',
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
        steps: ['Finish create or restore; the app shows this screen while it derives the keys'],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-out', mocks: [] },
    selectors: { ready: OnboardingSelectors.GeneratingWalletScreen, others: [] },
    actions: [],
    specs: [...secureStoreSpecs],
    description:
      'Transient "Adding wallet..." screen with an animation, generating-wallet.tsx. use-create-wallet.ts stores the keychains, shows "Wallet added", "Wallet added already" or "An error occurred" and replaces the route with /. It reads the temporary mnemonic, so opening it directly only shows the animation.',
  },
  {
    id: 'recover-wallet',
    anchor: { kind: 'route' },
    routes: [AppRoutes.RecoverWallet],
    params: [],
    entry: [
      { kind: 'nav', steps: ['Open the add wallet sheet', 'Tap "Restore wallet"'] },
      { kind: 'deepLink', steps: ['Open leather:///recover-wallet'] },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-out', mocks: [] },
    selectors: {
      ready: OnboardingSelectors.RestoreWalletTextInput,
      others: [OnboardingSelectors.RestoreWalletContinue, SharedSelectors.BackButton],
    },
    actions: [],
    specs: [...secureStoreSpecs],
    description:
      '"Enter your Secret Key" screen, features/recover-wallet. The input (OnboardingSelectors.RestoreWalletTextInput) takes the mnemonic ("Paste or type Secret Key to add wallet", "Paste"); unknown words show "Invalid words: …". "Advanced options" opens the "BIP39 passphrase" sheet. "Continue" (OnboardingSelectors.RestoreWalletContinue) goes on to /secure-your-wallet or /generating-wallet like the create flow.',
  },
  {
    id: 'bip39-passphrase-sheet',
    anchor: { kind: 'selectors', objects: ['OnboardingSelectors.PassphraseSheetInput'] },
    routes: [],
    startRoute: AppRoutes.RecoverWallet,
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: ['On "Enter your Secret Key" tap "Advanced options", then "BIP39 passphrase"'],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-out', mocks: [] },
    selectors: { ready: OnboardingSelectors.PassphraseSheetInput, others: [] },
    actions: [],
    specs: [],
    description:
      '"BIP39 passphrase" input sheet (recover-wallet-sheet.tsx on input-sheet.layout.tsx) with the "Passphrase" field (OnboardingSelectors.PassphraseSheetInput) and "Confirm"; the passphrase is used when the restored wallet is derived.',
  },
] as const satisfies readonly MobileFeatureEntry[];
