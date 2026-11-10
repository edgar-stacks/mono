import { AppRoutes } from '@/shared/app-routes';
import { HomeSelectors } from '@/shared/selectors/home.selectors';
import { SettingsSelectors } from '@/shared/selectors/settings.selectors';
import { SharedSelectors } from '@/shared/selectors/shared.selectors';

import type { MobileFeatureEntry } from './mobile-feature-entry';

const smokeTestsFlow = 'apps/mobile/maestro/flows/smoke-tests.yaml';
const smokeTestsCiFlow = 'apps/mobile/maestro/flows/smoke-tests-ci.yaml';
const openSettingsStep =
  'Tap the settings gear in the Home header (HomeSelectors.SettingsButton) to open /settings';

export const settingsFeatures = [
  {
    id: 'settings',
    anchor: { kind: 'route' },
    routes: [AppRoutes.Settings],
    params: [],
    entry: [
      { kind: 'nav', steps: [openSettingsStep] },
      { kind: 'deepLink', steps: ['Open leather://settings'] },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: {
      ready: SettingsSelectors.WalletAndAccountsButton,
      others: [
        SettingsSelectors.DisplayButton,
        SettingsSelectors.SecurityButton,
        SettingsSelectors.NetworkButton,
        SettingsSelectors.AppIconButton,
        SettingsSelectors.HelpButton,
        SettingsSelectors.LockAppButton,
        HomeSelectors.SettingsButton,
        SharedSelectors.BackButton,
      ],
    },
    actions: [],
    specs: [smokeTestsFlow, smokeTestsCiFlow],
    description:
      'The Settings screen (apps/mobile/src/app/settings/index.tsx, title t`Settings`): t`Wallets and accounts`, t`Display`, t`Security`, t`Networks`, t`App Icon` (opens the app icon sheet) and t`Help`, then the app version, a t`Device ID` row that copies the id and toasts t`ID copied to clipboard`, and a t`Lock app` button that calls lockApp from the splash-screen auth context. The smoke flows tap homeSettingsButton on Home and assert the SETTINGS title. It also renders without a wallet, since the Home header shows the gear either way.',
  },
  {
    id: 'settings-more-options',
    anchor: { kind: 'selectors', objects: ['SettingsSelectors.MoreOptionsButton'] },
    routes: [],
    startRoute: AppRoutes.Settings,
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: [
          openSettingsStep,
          'Tap the t`More options` accordion (SettingsSelectors.MoreOptionsButton) below the list',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: ['release_waitlist_features'],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: {
      ready: SettingsSelectors.MoreOptionsButton,
      others: [SettingsSelectors.ContactsButton, SettingsSelectors.FeesButton],
    },
    actions: [],
    specs: [],
    description:
      'The t`More options` accordion on /settings, rendered only when useWaitlistFlag (release_waitlist_features) is on. It holds t`Contacts` and t`Fees`, each of which opens a NotifyUserSheetLayout waitlist sheet (t`Contacts`, t`Custom fees`) rather than a real feature. No spec covers it.',
  },
  {
    id: 'settings-app-icon-sheet',
    anchor: { kind: 'selectors', objects: ['SettingsSelectors.AppIconGrid'] },
    routes: [],
    startRoute: AppRoutes.Settings,
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: [openSettingsStep, 'Tap t`App Icon` (SettingsSelectors.AppIconButton)'],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: {
      ready: SettingsSelectors.AppIconGrid,
      others: [SettingsSelectors.AppIconItem],
    },
    actions: [],
    specs: [],
    description:
      'The t`App Icon` sheet (features/settings/choose-app-icon/app-icon-picker-sheet.tsx): a grid of icons, each with the dynamic id app-icon-<icon> (SettingsSelectors.AppIconItem plus the icon name). Selecting one stores appIconPreference and calls setAlternateAppIcon; on failure it rolls back and toasts t`Failed to change app icon`. Opening, selecting and failing are tracked as analytics events. No spec covers it.',
  },
  {
    id: 'settings-display',
    anchor: { kind: 'route' },
    routes: [AppRoutes.SettingsDisplay],
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: [openSettingsStep, 'Tap t`Display` (SettingsSelectors.DisplayButton)'],
      },
      { kind: 'deepLink', steps: ['Open leather://settings/display'] },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: {
      ready: SettingsSelectors.ThemeButton,
      others: [
        SettingsSelectors.BitcoinUnitButton,
        SettingsSelectors.LanguageButton,
        SettingsSelectors.ConversionUnitButton,
        SettingsSelectors.AccountIdentifierButton,
        SettingsSelectors.HapticsSwitch,
      ],
    },
    actions: [],
    specs: [],
    description:
      'The Display screen (apps/mobile/src/app/settings/display/index.tsx): t`Theme`, t`Bitcoin unit` (only with release_btc_conversion_unit_feature), t`Language` (only with the internationalization flag and more than one supported language), t`Conversion unit`, t`Account identifier` and a t`Haptics` switch that toggles hapticsPreference in place. Each other row opens its own sheet, described in the settings-*-sheet entries. No spec covers it.',
  },
  {
    id: 'settings-theme-sheet',
    anchor: { kind: 'selectors', objects: ['SettingsSelectors.ThemeSheetList'] },
    routes: [],
    startRoute: AppRoutes.SettingsDisplay,
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: ['Open /settings/display', 'Tap t`Theme` (SettingsSelectors.ThemeButton)'],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: { ready: SettingsSelectors.ThemeSheetList, others: [] },
    actions: [],
    specs: [],
    description:
      'The t`Theme` sheet (features/settings/theme-sheet.tsx): radio rows Light, Dark and System. Picking one calls changeThemePreference and toasts t`Theme updated`. No spec covers it.',
  },
  {
    id: 'settings-bitcoin-unit-sheet',
    anchor: { kind: 'selectors', objects: ['SettingsSelectors.BitcoinUnitSheetList'] },
    routes: [],
    startRoute: AppRoutes.SettingsDisplay,
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: [
          'Open /settings/display',
          'Tap t`Bitcoin unit` (SettingsSelectors.BitcoinUnitButton)',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: ['release_btc_conversion_unit_feature'],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: { ready: SettingsSelectors.BitcoinUnitSheetList, others: [] },
    actions: [],
    specs: [],
    description:
      'The t`Bitcoin unit` sheet (features/settings/bitcoin-unit-sheet.tsx): one radio row per bitcoin unit showing its symbol and name. Picking one calls changeBitcoinUnitPreference and toasts t`Bitcoin unit updated`; the header help icon opens the bitcoin unit guide. The row that opens it only shows with useBtcConversionUnitFlag. No spec covers it.',
  },
  {
    id: 'settings-conversion-unit-sheet',
    anchor: { kind: 'selectors', objects: ['SettingsSelectors.ConversionUnitSheetList'] },
    routes: [],
    startRoute: AppRoutes.SettingsDisplay,
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: [
          'Open /settings/display',
          'Tap t`Conversion unit` (SettingsSelectors.ConversionUnitButton)',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: { ready: SettingsSelectors.ConversionUnitSheetList, others: [] },
    actions: [],
    specs: [],
    description:
      'The t`Conversion unit` sheet (features/settings/conversion-unit-sheet.tsx): one radio row per quote currency (United States Dollar, Euro, British Pound and so on) with the symbol as caption. Picking one calls changeQuoteCurrencyPreference and toasts t`Conversion unit updated`. No spec covers it.',
  },
  {
    id: 'settings-account-identifier-sheet',
    anchor: { kind: 'selectors', objects: ['SettingsSelectors.AccountIdentifierSheetList'] },
    routes: [],
    startRoute: AppRoutes.SettingsDisplay,
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: [
          'Open /settings/display',
          'Tap t`Account identifier` (SettingsSelectors.AccountIdentifierButton)',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: { ready: SettingsSelectors.AccountIdentifierSheetList, others: [] },
    actions: [],
    specs: [],
    description:
      'The t`Account identifier` sheet (features/settings/account-identifier-sheet.tsx): radio rows for the native segwit address, taproot address, BNS name and Stacks address, which decide what account cards show under the account name. Picking one calls changeAccountDisplayPreference and toasts t`Account identifier updated`. No spec covers it.',
  },
  {
    id: 'settings-language-sheet',
    anchor: { kind: 'selectors', objects: ['SettingsSelectors.LanguageSheetList'] },
    routes: [],
    startRoute: AppRoutes.SettingsDisplay,
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: ['Open /settings/display', 'Tap t`Language` (SettingsSelectors.LanguageButton)'],
      },
    ],
    gate: 'splashScreen',
    flags: ['internationalization'],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: { ready: SettingsSelectors.LanguageSheetList, others: [] },
    actions: [],
    specs: [],
    description:
      'The t`Language` sheet (features/settings/language-sheet.tsx): one radio row per supported language. Picking a different one stores languagePreference with source user-selection, shows a full-screen globe splash and reloads the app after one second (reloadAppAsync). The row only shows with useInternationalizationFlag and more than one supported language. No spec covers it.',
  },
  {
    id: 'settings-help',
    anchor: { kind: 'route' },
    routes: [AppRoutes.SettingsHelp],
    params: [],
    entry: [
      { kind: 'nav', steps: [openSettingsStep, 'Tap t`Help` (SettingsSelectors.HelpButton)'] },
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
      'The Help screen (apps/mobile/src/app/settings/help/index.tsx): t`Contact us`, t`Guides` and t`Learn`, each opening LEATHER_SUPPORT_URL, LEATHER_GUIDES_URL or LEATHER_LEARN_URL through useOpenUrl. No spec covers it.',
  },
  {
    id: 'settings-networks',
    anchor: { kind: 'route' },
    routes: [AppRoutes.SettingsNetworks],
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: [openSettingsStep, 'Tap t`Networks` (SettingsSelectors.NetworkButton)'],
      },
      { kind: 'deepLink', steps: ['Open leather://settings/networks'] },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: {
      ready: SettingsSelectors.NetworkList,
      others: [SettingsSelectors.NetworkItem, SharedSelectors.NetworkBadge],
    },
    actions: [],
    specs: [],
    description:
      'The Networks screen (apps/mobile/src/app/settings/networks/index.tsx): one radio row per default network (mainnet, testnet4, signet), each with the dynamic id settingsNetworkItem-<network> and the caption t`Enabled` or t`Disabled`. Picking one calls changeNetworkPreference and toasts t`Changed network`; outside mainnet the screen headers show the network badge (networkBadge). No spec covers it.',
  },
  {
    id: 'settings-security',
    anchor: { kind: 'route' },
    routes: [AppRoutes.SettingsSecurity],
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: [openSettingsStep, 'Tap t`Security` (SettingsSelectors.SecurityButton)'],
      },
      { kind: 'deepLink', steps: ['Open leather://settings/security'] },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: {
      ready: SettingsSelectors.AnalyticsButton,
      others: [SettingsSelectors.AppAuthenticationButton],
    },
    actions: [],
    specs: [],
    description:
      'The Security screen (apps/mobile/src/app/settings/security/index.tsx): t`Analytics` with t`Enabled` or t`Disabled` from analyticsPreference, and t`App authentication`, enabled only when securityLevelPreference is secure (not-selected also reads t`Disabled`). Each row opens its own sheet. No spec covers it.',
  },
  {
    id: 'settings-analytics-sheet',
    anchor: { kind: 'selectors', objects: ['SettingsSelectors.AnalyticsSwitch'] },
    routes: [],
    startRoute: AppRoutes.SettingsSecurity,
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: ['Open /settings/security', 'Tap t`Analytics` (SettingsSelectors.AnalyticsButton)'],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: { ready: SettingsSelectors.AnalyticsSwitch, others: [] },
    actions: [],
    specs: [],
    description:
      'The t`Analytics` sheet (features/settings/analytics-sheet.tsx): a single t`Allow collection of data` switch that toggles analyticsPreference between consent-given and rejects-tracking and toasts t`Analytics updated`. The header help icon opens the analytics guide. No spec covers it.',
  },
  {
    id: 'settings-app-authentication-sheet',
    anchor: { kind: 'selectors', objects: ['SettingsSelectors.AppAuthenticationSwitch'] },
    routes: [],
    startRoute: AppRoutes.SettingsSecurity,
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: [
          'Open /settings/security',
          'Tap t`App authentication` (SettingsSelectors.AppAuthenticationButton)',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: { ready: SettingsSelectors.AppAuthenticationSwitch, others: [] },
    actions: [],
    specs: [],
    description:
      'The t`App authentication` sheet (features/settings/app-authentication-sheet.tsx): a t`Require biometrics or PIN` switch. Toggling asks for device authentication first; on success it flips securityLevelPreference between secure and insecure and toasts t`App authorization updated`, otherwise t`Failed to authenticate`. A simulator without enrolled biometrics or passcode cannot pass it. No spec covers it.',
  },
] as const satisfies readonly MobileFeatureEntry[];
