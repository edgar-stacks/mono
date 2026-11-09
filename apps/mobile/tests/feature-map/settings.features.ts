import { AppRoutes } from '@/shared/app-routes';
import { HomeSelectors } from '@/shared/selectors/home.selectors';
import { SettingsSelectors } from '@/shared/selectors/settings.selectors';
import { SharedSelectors } from '@/shared/selectors/shared.selectors';

import type { MobileFeatureEntry } from './mobile-feature-entry';

const smokeFlow = 'apps/mobile/maestro/flows/smoke-tests.yaml';
const smokeCiFlow = 'apps/mobile/maestro/flows/smoke-tests-ci.yaml';

export const settingsFeatures = [
  {
    id: 'settings',
    anchor: { kind: 'route' },
    routes: [AppRoutes.Settings],
    params: [],
    entry: [
      { kind: 'nav', steps: ['On Home tap the settings gear (HomeSelectors.SettingsButton)'] },
      { kind: 'deepLink', steps: ['Open leather:///settings'] },
    ],
    gate: 'splashScreen',
    flags: ['release_waitlist_features'],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: {
      ready: SettingsSelectors.Screen,
      others: [
        SettingsSelectors.WalletAndAccountsButton,
        SettingsSelectors.DisplayButton,
        SettingsSelectors.SecurityButton,
        SettingsSelectors.NetworkButton,
        SettingsSelectors.HelpButton,
        SettingsSelectors.MoreOptionsButton,
        SettingsSelectors.LockAppButton,
        HomeSelectors.SettingsButton,
      ],
    },
    actions: [],
    specs: [smokeFlow, smokeCiFlow],
    description:
      '"Settings" screen, settings/index.tsx. Rows "Wallets and accounts" ("Add, configure and remove"), "Display" ("Theme and account identifier"), "Security" ("Analytics and app authentication"), "Networks" ("Mainnet, testnet or signet"), "App Icon" ("Customize your app icon") and "Help" ("Get support or provide feedback"), each with a SettingsSelectors button id except App Icon. "More options" (release_waitlist_features) reveals "Contacts" and "Fees", which open the not-yet-available sheet. The footer shows "Version" and "Device ID" (tap copies it, "ID copied to clipboard") and "Lock app" (SettingsSelectors.LockAppButton). Both smoke flows tap the gear and assert "SETTINGS".',
  },
  {
    id: 'settings-waitlist-sheet',
    anchor: { kind: 'selectors', objects: ['SharedSelectors.NotifyUserSheet'] },
    routes: [],
    startRoute: AppRoutes.Settings,
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: [
          'On Home tap the settings gear (HomeSelectors.SettingsButton)',
          'With release_waitlist_features on tap "More options", then "Contacts" or "Fees"',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: ['release_waitlist_features'],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: {
      ready: SharedSelectors.NotifyUserSheet,
      others: [
        SettingsSelectors.MoreOptionsButton,
        SettingsSelectors.ContactsButton,
        SettingsSelectors.FeesButton,
      ],
    },
    actions: [],
    specs: [],
    description:
      'Not-yet-available sheet (notify-user-sheet.layout.tsx) with the feature title, "This feature is not available yet, but we can notify you when ready." and "I\'m interested", which only records the interest in analytics. Settings opens it for "Contacts" and "Fees" ("Custom fees"); the configure wallet "Advanced options", the add wallet "More options" and "Save to..." on the secret key screen reuse it.',
  },
  {
    id: 'app-icon-sheet',
    anchor: { kind: 'selectors', objects: ['SettingsSelectors.AppIconSheet'] },
    routes: [],
    startRoute: AppRoutes.Settings,
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: ['On Home tap the settings gear (HomeSelectors.SettingsButton)', 'Tap "App Icon"'],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: { ready: SettingsSelectors.AppIconSheet, others: [] },
    actions: [],
    specs: [],
    description:
      '"App Icon" sheet (choose-app-icon/app-icon-picker-sheet.tsx); each icon has the dynamic id app-icon-<icon> (app-icon-button.tsx). A failed change shows "Failed to change app icon".',
  },
  {
    id: 'settings-display',
    anchor: { kind: 'route' },
    routes: [AppRoutes.SettingsDisplay],
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: ['On Home tap the settings gear (HomeSelectors.SettingsButton)', 'Tap "Display"'],
      },
      { kind: 'deepLink', steps: ['Open leather:///settings/display'] },
    ],
    gate: 'splashScreen',
    flags: ['release_btc_conversion_unit_feature', 'internationalization'],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: {
      ready: SettingsSelectors.DisplayScreen,
      others: [SettingsSelectors.DisplayButton],
    },
    actions: [],
    specs: [],
    description:
      '"Display" screen, settings/display/index.tsx: "Theme", "Bitcoin unit" (release_btc_conversion_unit_feature), "Language" (internationalization and more than one language), "Conversion unit", "Account identifier" and the "Haptics" switch ("Toggle tactile feedback for interactions"). Each row except Haptics opens its sheet.',
  },
  {
    id: 'theme-sheet',
    anchor: { kind: 'selectors', objects: ['SettingsSelectors.ThemeSheet'] },
    routes: [],
    startRoute: AppRoutes.SettingsDisplay,
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: [
          'On Home tap the settings gear (HomeSelectors.SettingsButton)',
          'Tap "Display"',
          'Tap "Theme"',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: { ready: SettingsSelectors.ThemeSheet, others: [] },
    actions: [],
    specs: [],
    description:
      '"Theme" select sheet (theme-sheet.tsx on settings-sheet.layout.tsx). Picking an option saves the preference and shows "Theme updated".',
  },
  {
    id: 'bitcoin-unit-sheet',
    anchor: { kind: 'selectors', objects: ['SettingsSelectors.BitcoinUnitSheet'] },
    routes: [],
    startRoute: AppRoutes.SettingsDisplay,
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: [
          'On Home tap the settings gear (HomeSelectors.SettingsButton)',
          'Tap "Display"',
          'Tap "Bitcoin unit"',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: ['release_btc_conversion_unit_feature'],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: { ready: SettingsSelectors.BitcoinUnitSheet, others: [] },
    actions: [],
    specs: [],
    description:
      '"Bitcoin unit" select sheet (bitcoin-unit-sheet.tsx on settings-sheet.layout.tsx). Picking an option saves the preference and shows "Bitcoin unit updated".',
  },
  {
    id: 'conversion-unit-sheet',
    anchor: { kind: 'selectors', objects: ['SettingsSelectors.ConversionUnitSheet'] },
    routes: [],
    startRoute: AppRoutes.SettingsDisplay,
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: [
          'On Home tap the settings gear (HomeSelectors.SettingsButton)',
          'Tap "Display"',
          'Tap "Conversion unit"',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: { ready: SettingsSelectors.ConversionUnitSheet, others: [] },
    actions: [],
    specs: [],
    description:
      '"Conversion unit" select sheet (conversion-unit-sheet.tsx on settings-sheet.layout.tsx). Picking an option saves the preference and shows "Conversion unit updated".',
  },
  {
    id: 'account-identifier-sheet',
    anchor: { kind: 'selectors', objects: ['SettingsSelectors.AccountIdentifierSheet'] },
    routes: [],
    startRoute: AppRoutes.SettingsDisplay,
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: [
          'On Home tap the settings gear (HomeSelectors.SettingsButton)',
          'Tap "Display"',
          'Tap "Account identifier"',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: { ready: SettingsSelectors.AccountIdentifierSheet, others: [] },
    actions: [],
    specs: [],
    description:
      '"Account identifier" select sheet (account-identifier-sheet.tsx on settings-sheet.layout.tsx). Picking an option saves the preference and shows "Account identifier updated".',
  },
  {
    id: 'language-sheet',
    anchor: { kind: 'selectors', objects: ['SettingsSelectors.LanguageSheet'] },
    routes: [],
    startRoute: AppRoutes.SettingsDisplay,
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: [
          'On Home tap the settings gear (HomeSelectors.SettingsButton)',
          'Tap "Display"',
          'Tap "Language"',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: ['internationalization'],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: { ready: SettingsSelectors.LanguageSheet, others: [] },
    actions: [],
    specs: [],
    description:
      '"Language" select sheet (language-sheet.tsx on settings-sheet.layout.tsx). Picking a language switches the app locale.',
  },
  {
    id: 'settings-security',
    anchor: { kind: 'route' },
    routes: [AppRoutes.SettingsSecurity],
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: ['On Home tap the settings gear (HomeSelectors.SettingsButton)', 'Tap "Security"'],
      },
      { kind: 'deepLink', steps: ['Open leather:///settings/security'] },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: {
      ready: SettingsSelectors.SecurityScreen,
      others: [SettingsSelectors.SecurityButton],
    },
    actions: [],
    specs: [],
    description:
      '"Security" screen, settings/security/index.tsx, with the "Analytics" and "App authentication" rows, each showing "Enabled" or "Disabled" and opening its sheet.',
  },
  {
    id: 'analytics-sheet',
    anchor: { kind: 'selectors', objects: ['SettingsSelectors.AnalyticsSheet'] },
    routes: [],
    startRoute: AppRoutes.SettingsSecurity,
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: [
          'On Home tap the settings gear (HomeSelectors.SettingsButton)',
          'Tap "Security"',
          'Tap "Analytics"',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: { ready: SettingsSelectors.AnalyticsSheet, others: [] },
    actions: [],
    specs: [],
    description:
      '"Analytics" sheet (analytics-sheet.tsx): "Allow collection of data" with "Share anonymous usage details"; toggling shows "Analytics updated".',
  },
  {
    id: 'app-authentication-sheet',
    anchor: { kind: 'selectors', objects: ['SettingsSelectors.AppAuthenticationSheet'] },
    routes: [],
    startRoute: AppRoutes.SettingsSecurity,
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: [
          'On Home tap the settings gear (HomeSelectors.SettingsButton)',
          'Tap "Security"',
          'Tap "App authentication"',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: { ready: SettingsSelectors.AppAuthenticationSheet, others: [] },
    actions: [],
    specs: [],
    description:
      '"App authentication" sheet (app-authentication-sheet.tsx): "Require biometrics or PIN". Toggling asks for device authentication and shows "App authorization updated" or "Failed to authenticate"; a device without a PIN or biometrics reports "App is not protected with device-level PIN or biometrics.".',
  },
  {
    id: 'settings-networks',
    anchor: { kind: 'route' },
    routes: [AppRoutes.SettingsNetworks],
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: [
          'On Home tap the settings gear (HomeSelectors.SettingsButton)',
          'Tap "Networks", or tap the network badge in a header',
        ],
      },
      { kind: 'deepLink', steps: ['Open leather:///settings/networks'] },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: {
      ready: SettingsSelectors.NetworksScreen,
      others: [SettingsSelectors.NetworkButton, SharedSelectors.NetworkBadge],
    },
    actions: [],
    specs: ['apps/mobile/src/store/settings/settings.read.spec.ts'],
    description:
      '"Networks" screen, settings/networks/index.tsx, listing Mainnet, Testnet4 and Signet with "Enabled" or "Disabled"; picking one switches the network and shows "Changed network". The network badge in screen headers (SharedSelectors.NetworkBadge, network-badge.tsx) links here.',
  },
  {
    id: 'settings-help',
    anchor: { kind: 'route' },
    routes: [AppRoutes.SettingsHelp],
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: ['On Home tap the settings gear (HomeSelectors.SettingsButton)', 'Tap "Help"'],
      },
      { kind: 'deepLink', steps: ['Open leather:///settings/help'] },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: { ready: SettingsSelectors.HelpScreen, others: [SettingsSelectors.HelpButton] },
    actions: [],
    specs: [],
    description:
      '"Help" screen, settings/help/index.tsx: "Contact us", "Guides" ("Dive into feature details") and "Learn" ("Expand your Bitcoin knowledge"), each opening its page in the in-app browser.',
  },
] as const satisfies readonly MobileFeatureEntry[];
