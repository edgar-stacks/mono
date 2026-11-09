import { AppRoutes } from '@/shared/app-routes';
import { AccountSelectors } from '@/shared/selectors/account.selectors';
import { SettingsSelectors } from '@/shared/selectors/settings.selectors';
import { SharedSelectors } from '@/shared/selectors/shared.selectors';
import { WalletSettingsSelectors } from '@/shared/selectors/wallet-settings.selectors';

import type { MobileFeatureEntry } from './mobile-feature-entry';

export const walletSettingsFeatures = [
  {
    id: 'wallets-list',
    anchor: { kind: 'route' },
    routes: [AppRoutes.SettingsWallet],
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: [
          'On Home tap the settings gear (HomeSelectors.SettingsButton)',
          'Tap "Wallets and accounts" (SettingsSelectors.WalletAndAccountsButton)',
        ],
      },
      { kind: 'deepLink', steps: ['Open leather:///settings/wallet'] },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: {
      ready: WalletSettingsSelectors.WalletsScreen,
      others: [
        WalletSettingsSelectors.ListSettingsButton,
        WalletSettingsSelectors.ListAccountCard,
        SettingsSelectors.WalletAndAccountsButton,
        SharedSelectors.DefaultAccountIcon,
      ],
    },
    actions: [],
    specs: [],
    description:
      '"Wallets" screen, settings/wallet/index.tsx, under the portfolio header. Each wallet card has the gear "Open wallet settings" (WalletSettingsSelectors.ListSettingsButton), its account cards (WalletSettingsSelectors.ListAccountCard, avatar id defaultAccountIcon_<icon>) and "Add account" ("Adding account...", then "Account created" or "Account creation failed"). Below are "Hidden accounts" ("# hidden account(s)") and "Add wallet". Without wallets it shows the empty screen "View and manage all your wallets in one place" instead, which has no WalletsScreen id.',
  },
  {
    id: 'hidden-accounts',
    anchor: { kind: 'route' },
    routes: [AppRoutes.SettingsWalletHiddenAccounts],
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: [
          'On Home tap the settings gear (HomeSelectors.SettingsButton)',
          'Tap "Wallets and accounts" (SettingsSelectors.WalletAndAccountsButton)',
          'Tap "Hidden accounts"',
        ],
      },
      { kind: 'deepLink', steps: ['Open leather:///settings/wallet/hidden-accounts'] },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: { ready: WalletSettingsSelectors.HiddenAccountsScreen, others: [] },
    actions: [],
    specs: [],
    description:
      '"Hidden accounts" screen, settings/wallet/hidden-accounts.tsx: the wallets list filtered to hidden accounts ("View and manage your hidden accounts"); an account opens its configure screen to reveal it.',
  },
  {
    id: 'configure-wallet',
    anchor: { kind: 'route' },
    routes: [AppRoutes.SettingsWalletConfigure],
    deepLinkable: false,
    params: [{ name: 'wallet', example: '12345678' }],
    entry: [
      {
        kind: 'nav',
        steps: [
          'On Home tap the settings gear (HomeSelectors.SettingsButton)',
          'Tap "Wallets and accounts" (SettingsSelectors.WalletAndAccountsButton)',
          'Tap the gear on a wallet card (WalletSettingsSelectors.ListSettingsButton)',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: ['release_waitlist_features'],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: {
      ready: WalletSettingsSelectors.ConfigureWalletScreen,
      others: [
        WalletSettingsSelectors.ViewSecretKeyButton,
        WalletSettingsSelectors.RenameWalletButton,
        WalletSettingsSelectors.RemoveWalletButton,
      ],
    },
    actions: [],
    specs: [],
    description:
      '"Configure wallet" screen, settings/wallet/configure/[wallet]/index.tsx: "View Secret Key", "Rename wallet", "Remove wallet" and the "Creation date"; "Advanced options" ("Address reuse", "Address scan range", "Address types", "Export xPub", "Export key") needs release_waitlist_features and only opens the not-yet-available sheet. The screen zod-parses a fingerprint search param that wallet-card.tsx passes next to the wallet path segment, so a bare link fails.',
  },
  {
    id: 'rename-wallet-sheet',
    anchor: { kind: 'selectors', objects: ['WalletSettingsSelectors.ChangeNameSheetInput'] },
    routes: [],
    startRoute: AppRoutes.SettingsWalletConfigure,
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: [
          'On Home tap the settings gear (HomeSelectors.SettingsButton)',
          'Tap "Wallets and accounts" (SettingsSelectors.WalletAndAccountsButton)',
          "Open a wallet's settings",
          'Tap "Rename wallet"',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: {
      ready: WalletSettingsSelectors.ChangeNameSheetInput,
      others: [WalletSettingsSelectors.ChangeNameSheetSaveButton],
    },
    actions: [],
    specs: [],
    description:
      '"Change name" sheet for a wallet (wallet-name-sheet.tsx on input-sheet.layout.tsx): the "Name" input and "Save"; an empty name shows "Wallet name cannot be empty".',
  },
  {
    id: 'remove-wallet-sheet',
    anchor: { kind: 'selectors', objects: ['WalletSettingsSelectors.RemoveWalletSheet'] },
    routes: [],
    startRoute: AppRoutes.SettingsWalletConfigure,
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: [
          'On Home tap the settings gear (HomeSelectors.SettingsButton)',
          'Tap "Wallets and accounts" (SettingsSelectors.WalletAndAccountsButton)',
          "Open a wallet's settings",
          'Tap "Remove wallet"',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: { ready: WalletSettingsSelectors.RemoveWalletSheet, others: [] },
    actions: [],
    specs: ['apps/mobile/src/store/secure-store/mnemonic-store.spec.ts'],
    description:
      '"Remove wallet" warning sheet (remove-wallet-sheet.tsx, critical variant): "Proceed with caution since the wallet will be removed entirely from this device and its assets will not be recoverable unless you\u2019ve stored its Secret Key elsewhere securely." "Continue" asks for device authentication first when security is enabled ("Authentication failed" on failure), then removes the wallet, switches the current account to another wallet and goes back.',
  },
  {
    id: 'view-secret-key',
    anchor: { kind: 'route' },
    routes: [AppRoutes.SettingsWalletViewSecretKey],
    deepLinkable: false,
    params: [{ name: 'wallet', example: '12345678' }],
    entry: [
      {
        kind: 'nav',
        steps: [
          'On Home tap the settings gear (HomeSelectors.SettingsButton)',
          'Tap "Wallets and accounts" (SettingsSelectors.WalletAndAccountsButton)',
          "Open a wallet's settings",
          'Tap "View Secret Key"',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: { ready: WalletSettingsSelectors.ViewSecretKeyScreen, others: [] },
    actions: [],
    specs: ['apps/mobile/src/store/secure-store/mnemonic-store.spec.ts'],
    description:
      '"Your Secret Key" screen, view-secret-key.tsx: the wallet mnemonic and "Done". It reads the fingerprint search param and renders an empty box until the mnemonic loads from the secure store.',
  },
  {
    id: 'configure-account',
    anchor: { kind: 'route' },
    routes: [AppRoutes.SettingsAccountConfigure],
    deepLinkable: false,
    params: [
      { name: 'wallet', example: '12345678' },
      { name: 'account', example: '0' },
    ],
    entry: [
      {
        kind: 'nav',
        steps: [
          'On Home tap the settings gear (HomeSelectors.SettingsButton)',
          'Tap "Wallets and accounts" (SettingsSelectors.WalletAndAccountsButton)',
          'Tap an account card (WalletSettingsSelectors.ListAccountCard)',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: {
      ready: WalletSettingsSelectors.ConfigureAccountScreen,
      others: [WalletSettingsSelectors.AccountNameCell, SharedSelectors.DefaultAccountIcon],
    },
    actions: [],
    specs: [],
    description:
      '"Configure account" screen, [wallet]/[account]/index.tsx: "Name" (WalletSettingsSelectors.AccountNameCell, opens the account label sheet), "Avatar" (opens choose avatar) and "Hide account" or "Reveal account". It parses fingerprint and account search params from wallet-card.tsx, so a bare link fails.',
  },
  {
    id: 'rename-account-sheet',
    anchor: { kind: 'selectors', objects: ['AccountSelectors.ChangeNameSheetInput'] },
    routes: [],
    startRoute: AppRoutes.SettingsAccountConfigure,
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: [
          'On Home tap the settings gear (HomeSelectors.SettingsButton)',
          'Tap "Wallets and accounts" (SettingsSelectors.WalletAndAccountsButton)',
          'Tap an account card',
          'Tap "Name"',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: {
      ready: AccountSelectors.ChangeNameSheetInput,
      others: [AccountSelectors.ChangeNameSheetSaveButton],
    },
    actions: [],
    specs: [],
    description:
      '"Account label" sheet (account-name-sheet.tsx on input-sheet.layout.tsx): the "Name" input and "Save"; an empty name shows "Account name cannot be empty".',
  },
  {
    id: 'choose-avatar',
    anchor: { kind: 'route' },
    routes: [AppRoutes.SettingsAccountChooseAvatar],
    params: [
      { name: 'wallet', example: '12345678' },
      { name: 'account', example: '0' },
    ],
    entry: [
      {
        kind: 'nav',
        steps: [
          'On Home tap the settings gear (HomeSelectors.SettingsButton)',
          'Tap "Wallets and accounts" (SettingsSelectors.WalletAndAccountsButton)',
          'Tap an account card',
          'Tap "Avatar"',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: {
      ready: WalletSettingsSelectors.ChooseAvatarScreen,
      others: [SharedSelectors.DefaultAccountIcon],
    },
    actions: [],
    specs: ['apps/mobile/src/store/accounts/utils.spec.ts'],
    description:
      '"Icons" screen, [wallet]/[account]/choose-avatar.tsx: a grid of avatars, each with the dynamic id defaultAccountIcon_<icon> (avatar-button.tsx), and "Save". It takes the wallet fingerprint and account index from the path, so leather:///settings/wallet/configure/<fingerprint>/<index>/choose-avatar opens it.',
  },
] as const satisfies readonly MobileFeatureEntry[];
