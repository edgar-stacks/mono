import { AppRoutes } from '@/shared/app-routes';
import { AccountSelectors } from '@/shared/selectors/account.selectors';
import { SettingsSelectors } from '@/shared/selectors/settings.selectors';
import { SharedSelectors } from '@/shared/selectors/shared.selectors';
import { WalletSettingsSelectors } from '@/shared/selectors/wallet-settings.selectors';

import type { MobileFeatureEntry } from './mobile-feature-entry';

const openWalletsSteps = [
  'Tap the settings gear in the Home header (HomeSelectors.SettingsButton)',
  'Tap t`Wallets and accounts` (SettingsSelectors.WalletAndAccountsButton)',
];

export const walletSettingsFeatures = [
  {
    id: 'wallet-settings-wallets',
    anchor: { kind: 'route' },
    routes: [AppRoutes.SettingsWallet],
    params: [],
    entry: [
      { kind: 'nav', steps: [...openWalletsSteps] },
      { kind: 'deepLink', steps: ['Open leather://settings/wallet'] },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: {
      ready: WalletSettingsSelectors.ListAddWalletButton,
      others: [
        WalletSettingsSelectors.ListSettingsButton,
        WalletSettingsSelectors.ListAccountCard,
        WalletSettingsSelectors.ListAddAccountButton,
        WalletSettingsSelectors.ListHiddenAccountsButton,
        WalletSettingsSelectors.ListEmptyAddWalletButton,
        SharedSelectors.DefaultAccountIcon,
        SettingsSelectors.WalletAndAccountsButton,
      ],
    },
    actions: [],
    specs: [],
    description:
      'The Wallets screen (apps/mobile/src/app/settings/wallet/index.tsx, title t`Wallets`): the portfolio header, then one collapsible WalletCard per wallet (features/settings/wallet-and-accounts/wallet-card.tsx) with a gear (walletListSettingsButton) to configure it, its active accounts (walletListAccountCard, avatar id defaultAccountIcon_<icon>) and t`Add account`, which derives the next account and toasts t`Account created`. Below are t`Hidden accounts` (only when some are hidden) and t`Add wallet`, which opens the global add-wallet sheet. With no wallet it shows t`View and manage all your wallets in one place` and an t`Add wallet` button (walletListEmptyAddWalletButton) instead. No spec covers it.',
  },
  {
    id: 'wallet-settings-hidden-accounts',
    anchor: { kind: 'route' },
    routes: [AppRoutes.SettingsHiddenAccounts],
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: [
          ...openWalletsSteps,
          'Tap t`Hidden accounts` (WalletSettingsSelectors.ListHiddenAccountsButton), shown only when an account is hidden',
        ],
      },
      { kind: 'deepLink', steps: ['Open leather://settings/wallet/hidden-accounts'] },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: {
      ready: WalletSettingsSelectors.ListAccountCard,
      others: [WalletSettingsSelectors.ListEmptyHiddenAccounts],
    },
    actions: [],
    specs: [],
    description:
      'The t`Hidden accounts` screen (apps/mobile/src/app/settings/wallet/hidden-accounts.tsx): WalletsList with the hidden variant, so each wallet lists only its hidden accounts, without the gear or t`Add account`. Tapping an account opens its configure screen, where t`Reveal account` unhides it. With nothing hidden it shows t`View and manage your hidden accounts` (walletListEmptyHiddenAccounts). No spec covers it.',
  },
  {
    id: 'wallet-settings-configure-wallet',
    anchor: { kind: 'route' },
    routes: [AppRoutes.SettingsConfigureWallet],
    deepLinkable: false,
    params: [{ name: 'wallet', example: '0ad3fa3e' }],
    entry: [
      {
        kind: 'nav',
        steps: [
          ...openWalletsSteps,
          'Tap the gear of a wallet (WalletSettingsSelectors.ListSettingsButton)',
        ],
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
      'The t`Configure wallet` screen (apps/mobile/src/app/settings/wallet/configure/[wallet]/index.tsx): the wallet name, t`View Secret Key`, t`Rename wallet` (opens the wallet name sheet), t`Remove wallet` and the t`Creation date`; with release_waitlist_features an t`Advanced options` accordion lists waitlist-only items. t`Remove wallet` opens a critical WarningSheetLayout (features/settings/wallet-and-accounts/remove-wallet-sheet.tsx, no test id of its own); confirming asks for device authentication when securityLevelPreference is secure, goes back, switches the current account to another wallet if needed and removes the wallet. It parses a fingerprint search param that the wallet card passes besides [wallet], so a bare leather:// link throws.',
  },
  {
    id: 'wallet-settings-wallet-name-sheet',
    anchor: { kind: 'selectors', objects: ['WalletSettingsSelectors.ChangeNameSheetInput'] },
    routes: [],
    startRoute: AppRoutes.SettingsConfigureWallet,
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: [
          'Open a wallet configure screen (wallet-settings-configure-wallet)',
          'Tap t`Rename wallet` (WalletSettingsSelectors.RenameWalletButton)',
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
      'The t`Change name` input sheet for a wallet (features/settings/wallet-and-accounts/wallet-name-sheet.tsx on InputSheetLayout). t`Save` dispatches userRenamesWallet and closes the sheet; an empty name toasts t`Wallet name cannot be empty` and keeps it open. No spec covers it.',
  },
  {
    id: 'wallet-settings-view-secret-key',
    anchor: { kind: 'route' },
    routes: [AppRoutes.SettingsViewSecretKey],
    deepLinkable: false,
    params: [{ name: 'wallet', example: '0ad3fa3e' }],
    entry: [
      {
        kind: 'nav',
        steps: [
          'Open a wallet configure screen (wallet-settings-configure-wallet)',
          'Tap t`View Secret Key` (WalletSettingsSelectors.ViewSecretKeyButton)',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: { ready: WalletSettingsSelectors.ViewSecretKeyDoneButton, others: [] },
    actions: [],
    specs: [],
    description:
      'The t`Your Secret Key` screen (apps/mobile/src/app/settings/wallet/configure/[wallet]/view-secret-key.tsx): a warning text and the MnemonicDisplay of the wallet mnemonic and passphrase, with a t`Done` button that goes back; while the mnemonic loads it renders an empty box. It throws without the fingerprint search param the configure screen passes, so a bare leather:// link fails. No spec covers it.',
  },
  {
    id: 'wallet-settings-configure-account',
    anchor: { kind: 'route' },
    routes: [AppRoutes.SettingsConfigureAccount],
    deepLinkable: false,
    params: [
      { name: 'wallet', example: '0ad3fa3e' },
      { name: 'account', example: '0' },
    ],
    entry: [
      {
        kind: 'nav',
        steps: [
          ...openWalletsSteps,
          'Tap an account card (WalletSettingsSelectors.ListAccountCard)',
        ],
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
        SharedSelectors.DefaultAccountIcon,
      ],
    },
    actions: [],
    specs: [],
    description:
      'The t`Configure account` screen (apps/mobile/src/app/settings/wallet/configure/[wallet]/[account]/index.tsx): the account card with the wallet name as caption, then t`Name` (opens the account label sheet), t`Avatar` (opens choose-avatar) and t`Hide account` or t`Reveal account`, which toggles the account status in place (walletSettingsAccountHideCell for both). It parses a fingerprint search param that the wallet card passes besides [wallet], so a bare leather:// link throws.',
  },
  {
    id: 'wallet-settings-account-name-sheet',
    anchor: { kind: 'selectors', objects: ['AccountSelectors.ChangeNameSheetInput'] },
    routes: [],
    startRoute: AppRoutes.SettingsConfigureAccount,
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: [
          'Open an account configure screen (wallet-settings-configure-account)',
          'Tap t`Name` (WalletSettingsSelectors.AccountNameCell)',
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
      'The t`Account label` input sheet (features/settings/wallet-and-accounts/account-name-sheet.tsx on InputSheetLayout). t`Save` dispatches userRenamesAccount and closes the sheet; an empty name toasts t`Account name cannot be empty` and keeps it open. No spec covers it.',
  },
  {
    id: 'wallet-settings-choose-avatar',
    anchor: { kind: 'route' },
    routes: [AppRoutes.SettingsChooseAvatar],
    params: [
      { name: 'wallet', example: '0ad3fa3e' },
      { name: 'account', example: '0' },
    ],
    entry: [
      {
        kind: 'nav',
        steps: [
          'Open an account configure screen (wallet-settings-configure-account)',
          'Tap t`Avatar` (WalletSettingsSelectors.AccountAvatarCell)',
        ],
      },
      {
        kind: 'deepLink',
        steps: ['Open leather://settings/wallet/configure/<wallet>/<account>/choose-avatar'],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: {
      ready: WalletSettingsSelectors.ChooseAvatarSaveButton,
      others: [SharedSelectors.DefaultAccountIcon],
    },
    actions: [],
    specs: [],
    description:
      'The choose-avatar screen (apps/mobile/src/app/settings/wallet/configure/[wallet]/[account]/choose-avatar.tsx): a large preview and a t`Icons` grid of avatar buttons with the dynamic id defaultAccountIcon_<icon>. t`Save` is disabled until a new icon is picked, then dispatches userUpdatesAccountIcon and goes back. It reads [wallet] and [account] from the path and throws when the account does not exist. No spec covers it.',
  },
] as const satisfies readonly MobileFeatureEntry[];
