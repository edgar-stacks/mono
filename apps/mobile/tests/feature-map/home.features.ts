import { AppRoutes } from '@/shared/app-routes';
import { ActivitySelectors } from '@/shared/selectors/activity.selectors';
import { AppUpdateSelectors } from '@/shared/selectors/app-update.selectors';
import { GlobalSheetSelectors } from '@/shared/selectors/global-sheet.selectors';
import { HomeSelectors } from '@/shared/selectors/home.selectors';
import { SharedSelectors } from '@/shared/selectors/shared.selectors';
import { TokenSelectors } from '@/shared/selectors/token.selectors';

import type { MobileFeatureEntry } from './mobile-feature-entry';

const smokeTestsFlow = 'apps/mobile/maestro/flows/smoke-tests.yaml';
const tokenPresetSpec = 'apps/mobile/src/store/settings/token-preset.spec.ts';
const searchSip10Spec =
  'apps/mobile/src/features/balances/assets/utils/search-sip10-balances.spec.ts';
const sortSip10Spec = 'apps/mobile/src/features/balances/assets/utils/sort-sip10-balances.spec.ts';
const transactionsSpec =
  'apps/mobile/src/queries/stacks/use-transactions-with-transfers.query.spec.ts';

export const homeFeatures = [
  {
    id: 'home',
    anchor: { kind: 'route' },
    routes: [AppRoutes.Home],
    params: [],
    entry: [
      { kind: 'deepLink', steps: ['Open leather:// with a wallet set up and the app unlocked'] },
      { kind: 'nav', steps: ['Tap the home tab from Activity or Browser'] },
    ],
    gate: 'splashScreen',
    flags: ['swap', 'release_onramper_buy', 'release_onramper_sell'],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: {
      ready: HomeSelectors.ScreenWithAccount,
      others: [
        HomeSelectors.AccountHeader,
        HomeSelectors.PrivacyButton,
        HomeSelectors.SettingsButton,
        HomeSelectors.TokensTab,
        HomeSelectors.CollectiblesTab,
        SharedSelectors.SendButton,
        SharedSelectors.ReceiveButton,
        SharedSelectors.BuyButton,
        SharedSelectors.SellButton,
        SharedSelectors.SwapButton,
        TokenSelectors.BalanceItem,
      ],
    },
    actions: [],
    specs: [smokeTestsFlow],
    description:
      'Home tab (apps/mobile/src/app/(tabs)/(index)/index.tsx): with a current account it renders HomeScreenWithAccount (components/home/home-with-account-screen.tsx), otherwise the signed-out layout covered by home-without-wallet. The header shows the account avatar and name (tap opens the account selector when there is more than one account), the t`Hide balances` / t`Show balances` privacy toggle and the t`Settings` gear. Below the balance are the t`Send`, t`Receive`, t`Buy`, t`Sell` and t`Swap` buttons (Buy, Sell and Swap only with their flags on), the t`Tokens` / t`Collectibles` tabs and the token list. Token rows have dynamic ids: the tokenBalanceItem prefix plus `-<ticker>`, e.g. tokenBalanceItem-BTC.',
  },
  {
    id: 'home-collectibles',
    anchor: { kind: 'selectors', objects: ['HomeSelectors.CollectiblesTab'] },
    routes: [],
    startRoute: AppRoutes.Home,
    open: [],
    params: [],
    entry: [{ kind: 'nav', steps: ['On home tap the "Collectibles" tab'] }],
    gate: 'splashScreen',
    flags: ['collectible_details'],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: {
      ready: HomeSelectors.CollectiblesTab,
      others: [HomeSelectors.TokensTab, HomeSelectors.AccountHeader],
    },
    actions: [],
    specs: [],
    description:
      'Collectibles tab of home (components/home/home-with-account-screen.tsx, features/token/collectibles-list.tsx): the account balance and action buttons stay on top and the token list is replaced by the account collectibles grid. Tapping a collectible opens the token details route only when the collectible_details flag is on.',
  },
  {
    id: 'token-details',
    anchor: { kind: 'route' },
    routes: [AppRoutes.TokenDetails],
    deepLinkable: false,
    params: [{ name: 'assetId', example: 'nativeBtc|BTC' }],
    entry: [
      { kind: 'nav', steps: ['On home tap a token row (tokenBalanceItem-<ticker>)'] },
      {
        kind: 'nav',
        steps: ['On the Collectibles tab tap a collectible (needs the collectible_details flag)'],
      },
    ],
    gate: 'splashScreen',
    flags: ['collectible_details', 'swap', 'release_onramper_buy', 'release_onramper_sell'],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: {
      ready: TokenSelectors.DetailsScreen,
      others: [
        SharedSelectors.SendButton,
        SharedSelectors.ReceiveButton,
        SharedSelectors.NetworkBadge,
      ],
    },
    actions: [],
    specs: [transactionsSpec],
    description:
      'Token details (apps/mobile/src/app/(tabs)/(index)/[assetId]/index.tsx) for the serialized asset id `<protocol>|<id>` in the assetId param; it asserts a current account exists, so open it from home rather than as a bare leather:// link. Fungible tokens (nativeBtc, nativeStx, sip10) render features/token/token.tsx: the title, the network badge, available balance and price change, the action buttons, the token overview, details table, description and the token activity list. sip9 collectibles render features/token/collectible.tsx (TokenSelectors.CollectibleScreen) instead, and BNS names render their own details.',
  },
  {
    id: 'activity',
    anchor: { kind: 'route' },
    routes: [AppRoutes.Activity],
    params: [],
    entry: [
      { kind: 'deepLink', steps: ['Open leather://activity with the app unlocked'] },
      { kind: 'nav', steps: ['Tap the Activity tab'] },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: {
      ready: ActivitySelectors.Screen,
      others: [ActivitySelectors.List, ActivitySelectors.Item],
    },
    actions: [],
    specs: [transactionsSpec],
    description:
      'Activity tab (apps/mobile/src/app/(tabs)/activity.tsx): the t`Activity` title over the current account activity list (features/activity/activity-list.tsx), pull to refresh, each row opening its explorer link. With no account or no activity it shows t`Make your first transaction to get started` (ActivitySelectors.Empty).',
  },
  {
    id: 'account-selector-sheet',
    anchor: { kind: 'selectors', objects: ['HomeSelectors.AccountSelectorCard'] },
    routes: [],
    startRoute: AppRoutes.Home,
    open: [],
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: [
          'On home tap the account avatar and name in the header (needs two or more accounts)',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: {
      ready: HomeSelectors.AccountSelectorCard,
      others: [SharedSelectors.DefaultAccountIcon],
    },
    actions: [],
    specs: [],
    description:
      'Account selector (features/account/account-selector/account-selector-sheet.layout.tsx): a full-height sheet with the t`Portfolio` total and one card per visible account showing wallet name, account name, balance, address and connected app icons; the current account card is highlighted and tapping a card switches the current account. Avatar ids are dynamic: defaultAccountIcon plus `_<icon>`.',
  },
  {
    id: 'manage-tokens-sheet',
    anchor: { kind: 'selectors', objects: ['HomeSelectors.ManageTokensPresetItem'] },
    routes: [],
    startRoute: AppRoutes.Home,
    open: [],
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: [
          'On home tap the manage tokens control next to the available balance, or the "# hidden tokens" button under the token list',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: {
      ready: HomeSelectors.ManageTokensPresetItem,
      others: [TokenSelectors.SwitchItem],
    },
    actions: [],
    specs: [searchSip10Spec, sortSip10Spec],
    description:
      'Manage tokens (features/balances/manage-tokens.sheet.tsx): t`Manage tokens` heading, the t`Default set` row opening the token preset sheet, a t`Search tokens` input and one switch per SIP-10 token (dynamic ids: tokenSwitchItem plus `-<ticker>`). Shows t`Failed to load tokens` or t`No tokens found` when appropriate.',
  },
  {
    id: 'token-preset-sheet',
    anchor: { kind: 'selectors', objects: ['HomeSelectors.TokenPresetOption'] },
    routes: [],
    startRoute: AppRoutes.Home,
    open: [],
    params: [],
    entry: [{ kind: 'nav', steps: ['Open the manage tokens sheet', 'Tap "Default set"'] }],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: { ready: HomeSelectors.TokenPresetOption, others: [] },
    actions: [],
    specs: [tokenPresetSpec],
    description:
      'Token preset (features/balances/token-preset/token-preset-sheet.tsx): t`Default set` sheet with radio rows t`Gas only` (t`BTC, STX`), t`Main tokens` (t`BTC, STX, sBTC, USDCx`) and t`All priced tokens` (t`Same as the extension`); choosing one stores it and closes the sheet. Row ids are dynamic: homeTokenPresetOption plus `-<preset>` (gasOnly, mainTokens, allPricedTokens).',
  },
  {
    id: 'description-sheet',
    anchor: { kind: 'selectors', objects: ['GlobalSheetSelectors'] },
    routes: [],
    startRoute: AppRoutes.Home,
    open: [],
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: [
          'On home tap the question mark next to the account balance, the stacking row, the available balance or the trending tokens heading',
        ],
      },
      { kind: 'nav', steps: ['In the account selector tap "Portfolio"'] },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: { ready: GlobalSheetSelectors.DescriptionSheetContent, others: [] },
    actions: [],
    specs: [],
    description:
      'Global description sheet (features/settings/description-sheet.tsx) presented through descriptionSheetRef with a title and paragraphs or bullets, for example t`Portfolio` with t`Your total tokens across all your accounts.`.',
  },
  {
    id: 'app-update-required-sheet',
    anchor: { kind: 'selectors', objects: ['AppUpdateSelectors'] },
    routes: [],
    startRoute: AppRoutes.Home,
    open: [],
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: [
          'Set the minimum_app_version flag above the installed version and launch the app; VersionGuard presents the sheet',
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
      'Update required sheet (components/app-update-required/app-update-required-sheet.tsx): t`Get the latest version of the Leather app`, t`Update the app to get access to the latest features.`, the store button and t`Maybe later`. Shown on any screen, with or without a wallet, when components/version-guard/version-guard.tsx finds the installed version below minimum_app_version.',
  },
] as const satisfies readonly MobileFeatureEntry[];
