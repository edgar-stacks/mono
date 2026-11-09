import { AppRoutes } from '@/shared/app-routes';
import { AccountSelectors } from '@/shared/selectors/account.selectors';
import { SharedSelectors } from '@/shared/selectors/shared.selectors';
import { WalletSettingsSelectors } from '@/shared/selectors/wallet-settings.selectors';

import type { MobileFeatureEntry } from './mobile-feature-entry';

const accountUtilsSpec = 'apps/mobile/src/store/accounts/utils.spec.ts';

export const walletSettingsFeatures = [
  {
    id: 'wallet-settings-wallets',
    anchor: { kind: 'route' },
    routes: [AppRoutes.SettingsWallets],
    params: [],
    entry: [
      { kind: 'deepLink', steps: ['Open leather://settings/wallet with at least one wallet'] },
      { kind: 'nav', steps: ['Open Settings', 'Tap "Wallets and accounts"'] },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: {
      ready: WalletSettingsSelectors.ListSettingsButton,
      others: [
        WalletSettingsSelectors.ListAccountCard,
        WalletSettingsSelectors.AddWalletButton,
        SharedSelectors.DefaultAccountIcon,
      ],
    },
    actions: [],
    specs: [],
    description:
      'Wallets screen (apps/mobile/src/app/settings/wallet/index.tsx) titled t`Wallets`: the portfolio header, then one collapsible WalletCard per wallet (wallet-and-accounts/wallet-card.tsx) with a gear t`Open wallet settings` and its active accounts as account cards; account card icons carry the dynamic testID defaultAccountIcon_<icon> (SharedSelectors.DefaultAccountIcon plus an underscore and the icon name). Below: "Hidden accounts" (WalletSettingsSelectors.HiddenAccountsButton, only when an account is hidden, captioned "# hidden accounts") and t`Add wallet`, which opens the global add-wallet sheet. With no wallets it shows EmptyWalletsScreen ("View and manage all your wallets in one place") instead.',
  },
  {
    id: 'wallet-settings-hidden-accounts',
    anchor: { kind: 'route' },
    routes: [AppRoutes.SettingsHiddenAccounts],
    params: [],
    entry: [
      { kind: 'deepLink', steps: ['Open leather://settings/wallet/hidden-accounts'] },
      {
        kind: 'nav',
        steps: [
          'Hide an account from its account settings',
          'Open Settings → Wallets and accounts',
          'Tap "Hidden accounts"',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: { ready: WalletSettingsSelectors.ListAccountCard, others: [] },
    actions: [],
    specs: [],
    description:
      'Hidden accounts screen (apps/mobile/src/app/settings/wallet/hidden-accounts.tsx) titled t`Hidden accounts`: wallet cards listing only hidden accounts, without the wallet gear or "Add account". With no hidden account (deep link only, the Wallets row is not shown then) it renders EmptyHiddenAccounts with t`View and manage your hidden accounts` (WalletSettingsSelectors.HiddenAccountsEmpty).',
  },
  {
    id: 'wallet-settings-wallet',
    anchor: { kind: 'route' },
    routes: [AppRoutes.SettingsWallet],
    deepLinkable: false,
    params: [{ name: 'wallet', example: '<fingerprint>' }],
    entry: [
      {
        kind: 'nav',
        steps: ['Open Settings → Wallets and accounts', 'Tap the gear on a wallet card'],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: {
      ready: WalletSettingsSelectors.ViewSecretKeyButton,
      others: [
        WalletSettingsSelectors.RenameWalletButton,
        WalletSettingsSelectors.RemoveWalletButton,
      ],
    },
    actions: [],
    specs: [],
    description:
      'Configure wallet screen (apps/mobile/src/app/settings/wallet/configure/[wallet]/index.tsx) titled t`Configure\\nwallet`: the wallet name, then "View Secret Key", "Rename wallet" and "Remove wallet", the t`Advanced options` waitlist accordion (address reuse, scan range, address types, export xPub and key; release_waitlist_features only) and the t`Creation date`. It parses a fingerprint search param the wallet card passes alongside wallet, so a bare URL fails.',
  },
  {
    id: 'wallet-settings-rename-wallet-sheet',
    anchor: { kind: 'selectors', objects: ['WalletSettingsSelectors.ChangeNameSheetInput'] },
    routes: [],
    startRoute: AppRoutes.SettingsWallet,
    open: [],
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: ['Open the configure wallet screen', 'Tap "Rename wallet"'],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: {
      ready: WalletSettingsSelectors.ChangeNameSheetInput,
      others: [WalletSettingsSelectors.ChangeNameSheetSaveButton],
    },
    actions: [],
    specs: [],
    description:
      'Wallet name sheet (apps/mobile/src/features/settings/wallet-and-accounts/wallet-name-sheet.tsx) titled t`Change name` with a t`Name` input and a t`Save` button; an empty name shows the toast "Wallet name cannot be empty", otherwise it renames the wallet and closes.',
  },
  {
    id: 'wallet-settings-remove-wallet-sheet',
    anchor: {
      kind: 'selectors',
      objects: ['WalletSettingsSelectors.RemoveWalletSheetContinueButton'],
    },
    routes: [],
    startRoute: AppRoutes.SettingsWallet,
    open: [],
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: ['Open the configure wallet screen', 'Tap "Remove wallet"'],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: { ready: WalletSettingsSelectors.RemoveWalletSheetContinueButton, others: [] },
    actions: [],
    specs: [],
    description:
      'Remove wallet warning sheet (apps/mobile/src/features/settings/wallet-and-accounts/remove-wallet-sheet.tsx) titled t`Remove wallet`, warning that assets are not recoverable without the Secret Key, with a danger t`Continue` and t`Cancel`. Continue asks for device authentication when app authentication is on ("Authentication failed" on failure), then goes back, removes the wallet and switches the current account to another wallet if needed.',
  },
  {
    id: 'wallet-settings-view-secret-key',
    anchor: { kind: 'route' },
    routes: [AppRoutes.SettingsViewSecretKey],
    deepLinkable: false,
    params: [{ name: 'wallet', example: '<fingerprint>' }],
    entry: [
      {
        kind: 'nav',
        steps: ['Open the configure wallet screen', 'Tap "View Secret Key"'],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: {
      ready: WalletSettingsSelectors.ViewSecretKeyContent,
      others: [WalletSettingsSelectors.ViewSecretKeyDoneButton],
    },
    actions: [],
    specs: [],
    description:
      'View Secret Key screen (apps/mobile/src/app/settings/wallet/configure/[wallet]/view-secret-key.tsx) titled t`Your Secret Key`: the warning "Your Secret Key grants you access to your wallet and its assets…" and the mnemonic (and passphrase) in MnemonicDisplay, with t`Done` going back. It throws without the fingerprint search param, so it is not deep-linkable; an empty screen means the mnemonic is not in secure storage.',
  },
  {
    id: 'wallet-settings-account',
    anchor: { kind: 'route' },
    routes: [AppRoutes.SettingsAccount],
    deepLinkable: false,
    params: [
      { name: 'wallet', example: '<fingerprint>' },
      { name: 'account', example: '0' },
    ],
    entry: [
      {
        kind: 'nav',
        steps: ['Open Settings → Wallets and accounts', 'Tap an account card'],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: {
      ready: WalletSettingsSelectors.AccountNameCell,
      others: [
        WalletSettingsSelectors.AccountAvatarCell,
        WalletSettingsSelectors.AccountHideButton,
        SharedSelectors.DefaultAccountIcon,
      ],
    },
    actions: [],
    specs: [],
    description:
      'Configure account screen (apps/mobile/src/app/settings/wallet/configure/[wallet]/[account]/index.tsx) titled t`Configure\\naccount`: an account card (address, balance, wallet name; icon testID defaultAccountIcon_<icon>, a prefix plus the icon name), then "Name" (opens the account label sheet), "Avatar" and "Hide account", or "Reveal account" (WalletSettingsSelectors.AccountRevealButton) for a hidden account. It parses fingerprint and account search params the wallet card passes.',
  },
  {
    id: 'wallet-settings-account-name-sheet',
    anchor: { kind: 'selectors', objects: ['AccountSelectors'] },
    routes: [],
    startRoute: AppRoutes.SettingsAccount,
    open: [],
    params: [],
    entry: [{ kind: 'nav', steps: ['Open the configure account screen', 'Tap "Name"'] }],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: {
      ready: AccountSelectors.ChangeNameSheetInput,
      others: [AccountSelectors.ChangeNameSheetSaveButton],
    },
    actions: [],
    specs: [],
    description:
      'Account name sheet (apps/mobile/src/features/settings/wallet-and-accounts/account-name-sheet.tsx) titled t`Account label` with a t`Name` input and t`Save`; an empty name shows the toast "Account name cannot be empty", otherwise it renames the account.',
  },
  {
    id: 'wallet-settings-choose-avatar',
    anchor: { kind: 'route' },
    routes: [AppRoutes.SettingsAccountChooseAvatar],
    deepLinkable: false,
    params: [
      { name: 'wallet', example: '<fingerprint>' },
      { name: 'account', example: '0' },
    ],
    entry: [
      {
        kind: 'nav',
        steps: ['Open the configure account screen', 'Tap "Avatar"'],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: {
      ready: WalletSettingsSelectors.ChooseAvatarPreview,
      others: [WalletSettingsSelectors.ChooseAvatarSaveButton],
    },
    actions: [],
    specs: [accountUtilsSpec],
    description:
      'Choose avatar screen (apps/mobile/src/app/settings/wallet/configure/[wallet]/[account]/choose-avatar.tsx): a large preview of the selected icon, the t`Icons` grid (features/settings/choose-avatar/avatars.tsx) and a t`Save` button disabled until a new icon is picked; saving updates the account icon and goes back. It throws when the wallet or account params are missing or the account does not exist. The spec covers the default icon derived from the account id.',
  },
] as const satisfies readonly MobileFeatureEntry[];
