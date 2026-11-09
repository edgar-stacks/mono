import { AppRoutes } from '@/shared/app-routes';
import { AppUpdateSelectors } from '@/shared/selectors/app-update.selectors';
import { GlobalSheetSelectors } from '@/shared/selectors/global-sheet.selectors';
import { SettingsSelectors } from '@/shared/selectors/settings.selectors';
import { SharedSelectors } from '@/shared/selectors/shared.selectors';

import type { MobileFeatureEntry } from './mobile-feature-entry';

const smokeTestsFlow = 'apps/mobile/maestro/flows/smoke-tests.yaml';
const smokeTestsCiFlow = 'apps/mobile/maestro/flows/smoke-tests-ci.yaml';

export const settingsFeatures = [
  {
    id: 'settings',
    anchor: { kind: 'route' },
    routes: [AppRoutes.Settings],
    params: [],
    entry: [
      { kind: 'nav', steps: ['Tap the settings button in the Home header'] },
      { kind: 'deepLink', steps: ['Open leather://settings'] },
    ],
    gate: 'splashScreen',
    flags: ['release_waitlist_features'],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: {
      ready: SettingsSelectors.WalletAndAccountsButton,
      others: [
        SettingsSelectors.DisplayButton,
        SettingsSelectors.SecurityButton,
        SettingsSelectors.NetworkButton,
        SettingsSelectors.AppIconButton,
        SettingsSelectors.HelpButton,
        SettingsSelectors.MoreOptionsButton,
        SettingsSelectors.ContactsButton,
        SettingsSelectors.FeesButton,
        SettingsSelectors.DeviceIdButton,
        SettingsSelectors.LockAppButton,
      ],
    },
    actions: [],
    specs: [smokeTestsFlow, smokeTestsCiFlow],
    description:
      '"Settings" list: "Wallets and accounts", "Display", "Security", "Networks", "App Icon" (opens the app icon sheet) and "Help", then "Version" and "Device ID" (tapping copies it and toasts "ID copied to clipboard") and "Lock app". The "More options" accordion with "Contacts" and "Fees" only renders when release_waitlist_features is on, and those rows only after expanding it. The smoke flows tap the Home settings button (homeSettingsButton) and assert "SETTINGS".',
  },
  {
    id: 'settings-waitlist-sheet',
    anchor: { kind: 'selectors', objects: ['GlobalSheetSelectors.NotifyUserButton'] },
    routes: [],
    startRoute: AppRoutes.Settings,
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: ['On Settings expand "More options"', 'Tap "Contacts" or "Fees"'],
      },
      {
        kind: 'nav',
        steps: [
          'On a wallet configuration screen expand "Advanced options"',
          'Tap any of its rows',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: ['release_waitlist_features'],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: { ready: GlobalSheetSelectors.NotifyUserButton, others: [] },
    actions: [],
    specs: [],
    description:
      'Waitlist sheet for features that are not built yet ("Contacts", "Custom fees", "Address reuse", "Export xPub", …): the feature title, "This feature is not available yet, but we can notify you when ready." and "I\'m interested", which tracks submit_feature_waitlist and dismisses. Its openers only render when release_waitlist_features is on.',
  },
  {
    id: 'settings-app-icon-sheet',
    anchor: { kind: 'selectors', objects: ['SettingsSelectors.AppIconSheet'] },
    routes: [],
    startRoute: AppRoutes.Settings,
    params: [],
    entry: [{ kind: 'nav', steps: ['Home → settings button', 'Tap "App Icon"'] }],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: { ready: SettingsSelectors.AppIconSheet, others: [SettingsSelectors.AppIconOption] },
    actions: [],
    specs: [],
    description:
      '"App Icon" sheet with one button per alternate icon; each id is SettingsSelectors.AppIconOption plus "-" and the icon name (app-icon-default, app-icon-icon-1, …). Selecting an icon sets the alternate app icon; a failure reverts the preference and toasts "Failed to change app icon".',
  },
  {
    id: 'settings-display',
    anchor: { kind: 'route' },
    routes: [AppRoutes.SettingsDisplay],
    params: [],
    entry: [
      { kind: 'nav', steps: ['Home → settings button', 'Tap "Display"'] },
      { kind: 'deepLink', steps: ['Open leather://settings/display'] },
    ],
    gate: 'splashScreen',
    flags: ['release_btc_conversion_unit_feature', 'internationalization'],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: {
      ready: SettingsSelectors.ThemeButton,
      others: [
        SettingsSelectors.BitcoinUnitButton,
        SettingsSelectors.LanguageButton,
        SettingsSelectors.ConversionUnitButton,
        SettingsSelectors.AccountIdentifierButton,
        SettingsSelectors.HapticsItem,
        SharedSelectors.BackButton,
      ],
    },
    actions: [],
    specs: [],
    description:
      '"Display": "Theme", "Conversion unit", "Account identifier" and a "Haptics" switch ("Toggle tactile feedback for interactions"). "Bitcoin unit" only renders when release_btc_conversion_unit_feature is on, and "Language" only when internationalization is on and more than one language is supported. Each row except Haptics opens its sheet.',
  },
  {
    id: 'settings-theme-sheet',
    anchor: { kind: 'selectors', objects: ['SettingsSelectors.ThemeSheet'] },
    routes: [],
    startRoute: AppRoutes.SettingsDisplay,
    params: [],
    entry: [{ kind: 'nav', steps: ['Home → settings button → "Display"', 'Tap "Theme"'] }],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: { ready: SettingsSelectors.ThemeSheet, others: [] },
    actions: [],
    specs: [],
    description:
      '"Theme" sheet with "Light", "Dark" and "System" radio rows; choosing one toasts "Theme updated".',
  },
  {
    id: 'settings-bitcoin-unit-sheet',
    anchor: { kind: 'selectors', objects: ['SettingsSelectors.BitcoinUnitSheet'] },
    routes: [],
    startRoute: AppRoutes.SettingsDisplay,
    params: [],
    entry: [{ kind: 'nav', steps: ['Home → settings button → "Display"', 'Tap "Bitcoin unit"'] }],
    gate: 'splashScreen',
    flags: ['release_btc_conversion_unit_feature'],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: { ready: SettingsSelectors.BitcoinUnitSheet, others: [] },
    actions: [],
    specs: [],
    description:
      '"Bitcoin unit" sheet with one radio row per unit (symbol, capitalized name); choosing one toasts "Bitcoin unit updated". The help icon opens the bitcoin unit guide.',
  },
  {
    id: 'settings-language-sheet',
    anchor: { kind: 'selectors', objects: ['SettingsSelectors.LanguageSheet'] },
    routes: [],
    startRoute: AppRoutes.SettingsDisplay,
    params: [],
    entry: [{ kind: 'nav', steps: ['Home → settings button → "Display"', 'Tap "Language"'] }],
    gate: 'splashScreen',
    flags: ['internationalization'],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: { ready: SettingsSelectors.LanguageSheet, others: [] },
    actions: [],
    specs: [],
    description:
      '"Language" sheet with one radio row per supported language. Choosing a different one stores it, covers the app with a globe splash and reloads the app after one second.',
  },
  {
    id: 'settings-conversion-unit-sheet',
    anchor: { kind: 'selectors', objects: ['SettingsSelectors.ConversionUnitSheet'] },
    routes: [],
    startRoute: AppRoutes.SettingsDisplay,
    params: [],
    entry: [
      { kind: 'nav', steps: ['Home → settings button → "Display"', 'Tap "Conversion unit"'] },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: { ready: SettingsSelectors.ConversionUnitSheet, others: [] },
    actions: [],
    specs: [],
    description:
      '"Conversion unit" sheet with one radio row per quote currency ("United States Dollar", "Euro", …, captioned with the symbol); choosing one toasts "Conversion unit updated".',
  },
  {
    id: 'settings-account-identifier-sheet',
    anchor: { kind: 'selectors', objects: ['SettingsSelectors.AccountIdentifierSheet'] },
    routes: [],
    startRoute: AppRoutes.SettingsDisplay,
    params: [],
    entry: [
      { kind: 'nav', steps: ['Home → settings button → "Display"', 'Tap "Account identifier"'] },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: { ready: SettingsSelectors.AccountIdentifierSheet, others: [] },
    actions: [],
    specs: [],
    description:
      '"Account identifier" sheet with one radio row per display preference, captioned with its chain; choosing one toasts "Account identifier updated". The help icon opens the account identifier guide.',
  },
  {
    id: 'settings-security',
    anchor: { kind: 'route' },
    routes: [AppRoutes.SettingsSecurity],
    params: [],
    entry: [
      { kind: 'nav', steps: ['Home → settings button', 'Tap "Security"'] },
      { kind: 'deepLink', steps: ['Open leather://settings/security'] },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: {
      ready: SettingsSelectors.AnalyticsButton,
      others: [SettingsSelectors.AppAuthenticationButton, SharedSelectors.BackButton],
    },
    actions: [],
    specs: [],
    description:
      '"Security": "Analytics" (caption "Enabled" when consent was given, else "Disabled") and "App authentication" ("Enabled" when the security level is secure; "Disabled" otherwise, including when none was chosen). Each row opens its sheet.',
  },
  {
    id: 'settings-analytics-sheet',
    anchor: { kind: 'selectors', objects: ['SettingsSelectors.AnalyticsSheet'] },
    routes: [],
    startRoute: AppRoutes.SettingsSecurity,
    params: [],
    entry: [{ kind: 'nav', steps: ['Home → settings button → "Security"', 'Tap "Analytics"'] }],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: { ready: SettingsSelectors.AnalyticsSheet, others: [] },
    actions: [],
    specs: [],
    description:
      '"Analytics" sheet with the "Allow collection of data" switch ("Share anonymous usage details"); toggling it flips consent and toasts "Analytics updated".',
  },
  {
    id: 'settings-app-authentication-sheet',
    anchor: { kind: 'selectors', objects: ['SettingsSelectors.AppAuthenticationSheet'] },
    routes: [],
    startRoute: AppRoutes.SettingsSecurity,
    params: [],
    entry: [
      { kind: 'nav', steps: ['Home → settings button → "Security"', 'Tap "App authentication"'] },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: { ready: SettingsSelectors.AppAuthenticationSheet, others: [] },
    actions: [],
    specs: [],
    description:
      '"App authentication" sheet with a switch "Require biometrics or PIN". Toggling asks for device authentication first; on success it flips the security level and toasts "App authorization updated", otherwise "Failed to authenticate".',
  },
  {
    id: 'settings-networks',
    anchor: { kind: 'route' },
    routes: [AppRoutes.SettingsNetworks],
    params: [],
    entry: [
      { kind: 'nav', steps: ['Home → settings button', 'Tap "Networks"'] },
      { kind: 'nav', steps: ['On Home tap the network badge shown when not on mainnet'] },
      { kind: 'deepLink', steps: ['Open leather://settings/networks'] },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: {
      ready: SharedSelectors.BackButton,
      others: [SettingsSelectors.NetworkItem],
    },
    actions: [],
    specs: [],
    description:
      '"Networks": one radio row per default network, ids are SettingsSelectors.NetworkItem plus "-" and the network id (settingsNetworkItem-mainnet, -testnet4, -signet). The selected one is captioned "Enabled", the rest "Disabled"; choosing one switches the network and toasts "Changed network". On a non-mainnet network Home shows the network badge (networkBadge), which navigates here.',
  },
  {
    id: 'settings-help',
    anchor: { kind: 'route' },
    routes: [AppRoutes.SettingsHelp],
    params: [],
    entry: [
      { kind: 'nav', steps: ['Home → settings button', 'Tap "Help"'] },
      { kind: 'deepLink', steps: ['Open leather://settings/help'] },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: {
      ready: SettingsSelectors.ContactUsButton,
      others: [SettingsSelectors.GuidesButton, SettingsSelectors.LearnButton],
    },
    actions: [],
    specs: [],
    description:
      '"Help": "Contact us" ("Get support or provide feedback"), "Guides" ("Dive into feature details") and "Learn" ("Expand your Bitcoin knowledge"); each opens the matching Leather URL through useOpenUrl.',
  },
  {
    id: 'app-update-required-sheet',
    anchor: { kind: 'selectors', objects: ['AppUpdateSelectors'] },
    routes: [],
    startRoute: AppRoutes.Home,
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: [
          'Set the minimum_app_version flag above the installed version',
          'Launch the app; VersionGuard presents the sheet',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: ['minimum_app_version'],
    preconditions: { session: 'signed-out', mocks: [] },
    selectors: {
      ready: AppUpdateSelectors.UpdateButton,
      others: [AppUpdateSelectors.MaybeLaterButton],
    },
    actions: [],
    specs: [],
    description:
      'Global sheet "Get the latest version of the Leather app" / "Update the app to get access to the latest features.", presented by VersionGuard when the minimum_app_version string flag is a valid version above the installed one; an empty flag skips the check. The update button opens the store (an error shows the "Unable to Open Store" alert) and "Maybe later" dismisses the sheet. Shown with or without a wallet.',
  },
  {
    id: 'description-sheet',
    anchor: { kind: 'selectors', objects: ['GlobalSheetSelectors.DescriptionSheet'] },
    routes: [],
    startRoute: AppRoutes.SettingsWallet,
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: ['Home → settings button → "Wallets and accounts"', 'Tap "Portfolio"'],
      },
      { kind: 'nav', steps: ['On Home tap the "Trending tokens" label'] },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: { ready: GlobalSheetSelectors.DescriptionSheet, others: [] },
    actions: [],
    specs: [],
    description:
      'Global explanation sheet rendered by the root layout: a title plus paragraphs and bullets passed by the caller. From "Wallets" the "Portfolio" label shows "Portfolio" / "Your total tokens across all your accounts."; from Home, "Trending tokens" shows "Tokens trending across the Stacks ecosystem, ranked by recent trading activity."; account balance and stacking labels present their own copy.',
  },
] as const satisfies readonly MobileFeatureEntry[];
