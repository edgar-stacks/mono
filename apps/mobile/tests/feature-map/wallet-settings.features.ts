import { AppRoutes } from '@/shared/app-routes';
import { AccountSelectors } from '@/shared/selectors/account.selectors';
import { SharedSelectors } from '@/shared/selectors/shared.selectors';
import { WalletSettingsSelectors } from '@/shared/selectors/wallet-settings.selectors';

import type { MobileFeatureEntry } from './mobile-feature-entry';

export const walletSettingsFeatures = [
  {
    id: 'settings-wallets',
    anchor: { kind: 'route' },
    routes: [AppRoutes.SettingsWallet],
    params: [],
    entry: [
      { kind: 'nav', steps: ['Home → settings button', 'Tap "Wallets and accounts"'] },
      { kind: 'deepLink', steps: ['Open leather://settings/wallet'] },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: {
      ready: WalletSettingsSelectors.ListSettingsButton,
      others: [
        WalletSettingsSelectors.ListAccountCard,
        WalletSettingsSelectors.ListAddAccountButton,
        WalletSettingsSelectors.ListHiddenAccountsButton,
        WalletSettingsSelectors.ListAddWalletButton,
        WalletSettingsSelectors.ListEmptyAddWalletButton,
        SharedSelectors.DefaultAccountIcon,
      ],
    },
    actions: [],
    specs: [],
    description:
      '"Wallets": the "Portfolio" header and total balance, then one collapsible card per wallet with its accounts (each account card opens its configuration), "Add account" (shows "Adding account..." then toasts "Account created" or "Account creation failed") and a gear that opens the wallet configuration. Below: "Hidden accounts" ("# hidden account(s)") only when some account is hidden, and "Add wallet", which opens the Add wallet sheet. With no wallet the screen shows "View and manage all your wallets in one place" and an "Add wallet" button (ListEmptyAddWalletButton) instead. Account icons use SharedSelectors.DefaultAccountIcon plus "_" and the icon name.',
  },
  {
    id: 'settings-hidden-accounts',
    anchor: { kind: 'route' },
    routes: [AppRoutes.SettingsHiddenAccounts],
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: [
          'Hide an account',
          'Home → settings button → "Wallets and accounts"',
          'Tap "Hidden accounts"',
        ],
      },
      { kind: 'deepLink', steps: ['Open leather://settings/wallet/hidden-accounts'] },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: {
      ready: WalletSettingsSelectors.ListAccountCard,
      others: [WalletSettingsSelectors.ListEmptyHiddenAccounts, SharedSelectors.BackButton],
    },
    actions: [],
    specs: [],
    description:
      '"Hidden accounts": the wallet cards listing only hidden accounts, without the gear or "Add account". With no hidden account it shows "View and manage your hidden accounts" (ListEmptyHiddenAccounts) and no account card.',
  },
  {
    id: 'settings-configure-wallet',
    anchor: { kind: 'route' },
    routes: [AppRoutes.SettingsWalletConfigure],
    deepLinkable: false,
    params: [{ name: 'wallet', example: '8a3c9f21' }],
    entry: [
      {
        kind: 'nav',
        steps: ['Home → settings button → "Wallets and accounts"', 'Tap the gear on a wallet card'],
      },
    ],
    gate: 'splashScreen',
    flags: ['release_waitlist_features'],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: {
      ready: WalletSettingsSelectors.ViewSecretKeyButton,
      others: [
        WalletSettingsSelectors.RenameWalletButton,
        WalletSettingsSelectors.RemoveWalletButton,
        SharedSelectors.BackButton,
      ],
    },
    actions: [],
    specs: [],
    description:
      '"Configure wallet" with the wallet name, "View Secret Key", "Rename wallet", "Remove wallet" and the "Creation date". The "Advanced options" accordion ("Address reuse", "Address scan range", "Address types", "Export xPub", "Export key", each opening the waitlist sheet) only renders when release_waitlist_features is on. The screen parses a fingerprint search param the wallet card passes next to the [wallet] segment, so a bare deep link throws.',
  },
  {
    id: 'settings-wallet-name-sheet',
    anchor: { kind: 'selectors', objects: ['WalletSettingsSelectors.ChangeNameSheetInput'] },
    routes: [],
    startRoute: AppRoutes.SettingsWalletConfigure,
    params: [],
    entry: [{ kind: 'nav', steps: ['On "Configure wallet" tap "Rename wallet"'] }],
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
      '"Change name" input sheet prefilled with the wallet name (placeholder "Name"). "Save" renames the wallet and closes the sheet; an empty name toasts "Wallet name cannot be empty" and keeps it open.',
  },
  {
    id: 'settings-remove-wallet-sheet',
    anchor: { kind: 'selectors', objects: ['WalletSettingsSelectors.RemoveWalletSheet'] },
    routes: [],
    startRoute: AppRoutes.SettingsWalletConfigure,
    params: [],
    entry: [{ kind: 'nav', steps: ['On "Configure wallet" tap "Remove wallet"'] }],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: {
      ready: WalletSettingsSelectors.RemoveWalletSheet,
      others: [WalletSettingsSelectors.RemoveWalletSheetContinueButton],
    },
    actions: [],
    specs: [],
    description:
      'Critical warning sheet "Remove wallet": "Proceed with caution since the wallet will be removed entirely from this device and its assets will not be recoverable unless you’ve stored its Secret Key elsewhere securely." "Continue" asks for device authentication when the security level is secure ("Authentication failed" toast on failure), then goes back, switches the current account to another wallet when needed and removes the wallet. The help icon opens the remove wallet guide.',
  },
  {
    id: 'settings-view-secret-key',
    anchor: { kind: 'route' },
    routes: [AppRoutes.SettingsWalletViewSecretKey],
    deepLinkable: false,
    params: [{ name: 'wallet', example: '8a3c9f21' }],
    entry: [{ kind: 'nav', steps: ['On "Configure wallet" tap "View Secret Key"'] }],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: { ready: WalletSettingsSelectors.SecretKeyDoneButton, others: [] },
    actions: [],
    specs: ['apps/mobile/src/store/secure-store/mnemonic-store.spec.ts'],
    description:
      '"Your Secret Key": the warning copy and the mnemonic words (and passphrase when set) read from secure storage; "Done" goes back. It renders an empty screen until the mnemonic loads, and throws "No fingerprint is passed to ViewSecretKeyScreen" without the fingerprint search param the configure screen passes, so a bare deep link fails.',
  },
  {
    id: 'settings-configure-account',
    anchor: { kind: 'route' },
    routes: [AppRoutes.SettingsAccountConfigure],
    deepLinkable: false,
    params: [
      { name: 'wallet', example: '8a3c9f21' },
      { name: 'account', example: '0' },
    ],
    entry: [
      {
        kind: 'nav',
        steps: ['Home → settings button → "Wallets and accounts"', 'Tap an account card'],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: {
      ready: WalletSettingsSelectors.AccountNameCell,
      others: [
        WalletSettingsSelectors.AccountAvatarCell,
        WalletSettingsSelectors.AccountHideCell,
        WalletSettingsSelectors.AccountRevealCell,
        SharedSelectors.DefaultAccountIcon,
      ],
    },
    actions: [],
    specs: [],
    description:
      '"Configure account": the account card (icon, name, wallet name, balance, address), then "Name" (opens the account name sheet), "Avatar" (opens choose avatar) and "Hide account" for an active account or "Reveal account" for a hidden one. The account icon id is SharedSelectors.DefaultAccountIcon plus "_" and the icon name. It parses a fingerprint search param the account card passes next to the segments, so a bare deep link throws.',
  },
  {
    id: 'settings-account-name-sheet',
    anchor: { kind: 'selectors', objects: ['AccountSelectors'] },
    routes: [],
    startRoute: AppRoutes.SettingsAccountConfigure,
    params: [],
    entry: [{ kind: 'nav', steps: ['On "Configure account" tap "Name"'] }],
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
      'Input sheet prefilled with the account name. Saving renames the account and closes the sheet; an empty name toasts "Account name cannot be empty".',
  },
  {
    id: 'settings-choose-avatar',
    anchor: { kind: 'route' },
    routes: [AppRoutes.SettingsAccountChooseAvatar],
    params: [
      { name: 'wallet', example: '8a3c9f21' },
      { name: 'account', example: '0' },
    ],
    entry: [
      { kind: 'nav', steps: ['On "Configure account" tap "Avatar"'] },
      {
        kind: 'deepLink',
        steps: [
          'Open leather://settings/wallet/configure/<fingerprint>/<accountIndex>/choose-avatar',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: {
      ready: WalletSettingsSelectors.AvatarSaveButton,
      others: [SharedSelectors.DefaultAccountIcon, SharedSelectors.BackButton],
    },
    actions: [],
    specs: [],
    description:
      'Choose avatar: a preview of the selected icon, "Icons" and one button per account icon (SharedSelectors.DefaultAccountIcon plus "_" and the icon name). "Save" stays disabled until a new icon is picked, then updates the account icon and goes back. It throws when the wallet or account segment is missing or no account matches.',
  },
] as const satisfies readonly MobileFeatureEntry[];
