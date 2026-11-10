import { AppRoutes } from '@/shared/app-routes';
import { AccountSelectors } from '@/shared/selectors/account.selectors';
import { ActivitySelectors } from '@/shared/selectors/activity.selectors';
import { GlobalSheetSelectors } from '@/shared/selectors/global-sheet.selectors';
import { HomeSelectors } from '@/shared/selectors/home.selectors';
import { SharedSelectors } from '@/shared/selectors/shared.selectors';
import { TokenSelectors } from '@/shared/selectors/token.selectors';

import type { MobileFeatureEntry } from './mobile-feature-entry';

const smokeTests = 'apps/mobile/maestro/flows/smoke-tests.yaml';
const smokeTestsCi = 'apps/mobile/maestro/flows/smoke-tests-ci.yaml';
const sortSip10BalancesSpec =
  'apps/mobile/src/features/balances/assets/utils/sort-sip10-balances.spec.ts';
const searchSip10BalancesSpec =
  'apps/mobile/src/features/balances/assets/utils/search-sip10-balances.spec.ts';
const tokenPresetSpec = 'apps/mobile/src/store/settings/token-preset.spec.ts';

export const homeFeatures = [
  {
    id: 'home',
    anchor: { kind: 'route' },
    routes: [AppRoutes.Home],
    params: [],
    entry: [
      { kind: 'nav', steps: ['Launch the app with a wallet, or tap the Home tab (t`Home`)'] },
      { kind: 'deepLink', steps: ['Open leather:// with a wallet'] },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: {
      ready: HomeSelectors.Screen,
      others: [
        HomeSelectors.AccountHeader,
        HomeSelectors.PrivacyButton,
        HomeSelectors.SettingsButton,
        HomeSelectors.TokensTab,
        HomeSelectors.CollectiblesTab,
        HomeSelectors.SendButton,
        HomeSelectors.ReceiveButton,
        HomeSelectors.BuyButton,
        HomeSelectors.SellButton,
        HomeSelectors.SwapButton,
        TokenSelectors.BalanceItem,
        SharedSelectors.NetworkBadge,
      ],
    },
    actions: [],
    specs: [smokeTests, smokeTestsCi, sortSip10BalancesSpec],
    description:
      'The signed-in home tab (src/app/(tabs)/(index)/index.tsx renders HomeScreenWithAccount from components/home/home-with-account-screen.tsx when CurrentAccountLoader finds a current account). The header shows the account (AccountHeader, opens the account selector) with privacy and settings buttons (header-actions.tsx); below are the total balance, the action buttons of components/action-buttons.tsx (t`Send`, t`Receive`, t`Buy`, t`Sell`, t`Swap`; Buy, Sell and Swap only behind release_onramper_buy, release_onramper_sell and swap) and the t`Tokens` / t`Collectibles` tabs. Token rows carry the dynamic id tokenBalanceItem-<ticker> (for example tokenBalanceItem-BTC) and open the token-details screen. With no activity yet it shows FirstTokenBanner and the learn section instead of the available balance. Both Maestro smoke flows tap homeSettingsButton here; smoke-tests.yaml first asserts the text "All accounts", which no current screen shows.',
  },
  {
    id: 'home-signed-out',
    anchor: { kind: 'selectors', objects: ['HomeSelectors.SignedOutScreen'] },
    routes: [],
    startRoute: AppRoutes.Home,
    params: [],
    entry: [{ kind: 'nav', steps: ['Launch the app with no wallet'] }],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-out', mocks: [] },
    selectors: {
      ready: HomeSelectors.SignedOutScreen,
      others: [
        HomeSelectors.CreateWalletCard,
        HomeSelectors.SettingsButton,
        SharedSelectors.NetworkBadge,
      ],
    },
    actions: [],
    specs: [],
    description:
      'The home tab without a wallet (components/home/home-without-account-screen.tsx, the CurrentAccountLoader fallback): the Leather logo and network badge, the settings button (the privacy button hides without wallets) and the create-wallet card, which presents the add-wallet sheet (onboarding-add-wallet-sheet). It shares AppRoutes.Home with the home entry; no flow starts from a fresh install.',
  },
  {
    id: 'home-account-selector',
    anchor: { kind: 'selectors', objects: ['AccountSelectors.SelectorCard'] },
    routes: [],
    startRoute: AppRoutes.Home,
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: [
          'On Home tap the account header (HomeSelectors.AccountHeader); it is disabled while the wallet has a single account',
          'Tap an account card to switch the current account and close the sheet',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: {
      ready: AccountSelectors.SelectorCard,
      others: [SharedSelectors.DefaultAccountIcon],
    },
    actions: [],
    specs: [],
    description:
      'Full-height account selector sheet (features/account/account-selector/account-selector-sheet.tsx and .layout.tsx) with the portfolio header and one AccountCard per non-hidden account, captioned with the wallet name and its connected app origins. Avatars carry the dynamic id defaultAccountIcon_<icon>. No spec covers it.',
  },
  {
    id: 'home-manage-tokens',
    anchor: { kind: 'selectors', objects: ['TokenSelectors.ManageTokensTitle'] },
    routes: [],
    startRoute: AppRoutes.Home,
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: [
          'On Home tap the manage-tokens button of the available balance row or the footer under the token list',
          'Toggle a token or change t`Default set` to pick a token preset',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: {
      ready: TokenSelectors.ManageTokensTitle,
      others: [TokenSelectors.SwitchItem],
    },
    actions: [],
    specs: [searchSip10BalancesSpec, tokenPresetSpec],
    description:
      'The t`Manage tokens` sheet (features/balances/manage-tokens.sheet.tsx): a t`Default set` row that opens the token preset picker, a t`Search tokens` field and one switch per token with the dynamic id tokenSwitchItem-<ticker>; it shows t`No tokens found` for an empty search and t`Failed to load tokens` on error. The unit specs cover the search and the presets, not the sheet.',
  },
  {
    id: 'home-token-details',
    anchor: { kind: 'route' },
    routes: [AppRoutes.TokenDetails],
    params: [{ name: 'assetId', example: 'nativeBtc|BTC' }],
    entry: [
      {
        kind: 'nav',
        steps: ['On Home tap a token row (tokenBalanceItem-<ticker>)'],
      },
      { kind: 'deepLink', steps: ['Open leather://nativeStx%7CSTX with a wallet'] },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: {
      ready: TokenSelectors.DetailsScreen,
      others: [
        HomeSelectors.SendButton,
        HomeSelectors.ReceiveButton,
        HomeSelectors.SwapButton,
        SharedSelectors.NetworkBadge,
        SharedSelectors.BackButton,
      ],
    },
    actions: [],
    specs: [],
    description:
      'Token details (src/app/(tabs)/(index)/[assetId]/index.tsx), keyed by a serialized asset id <protocol>|<id>. nativeBtc, nativeStx and sip10 render features/token/token.tsx: balance, the shared action buttons, description, details table, address list and the asset activity; the Bitcoin page offers Swap only behind swap_sbtc_bridging. sip9 renders the collectible page instead (home-collectible-details). An unknown protocol throws in deserializeAssetId. No spec covers it.',
  },
  {
    id: 'home-collectible-details',
    anchor: { kind: 'selectors', objects: ['TokenSelectors.CollectibleScreen'] },
    routes: [],
    startRoute: AppRoutes.TokenDetails,
    params: [{ name: 'assetId', example: 'sip9|<contract>::<asset>::<tokenId>' }],
    deepLinkable: false,
    entry: [
      {
        kind: 'nav',
        steps: [
          'On Home tap t`Collectibles` (HomeSelectors.CollectiblesTab)',
          'Tap a collectible; only with collectible_details on, otherwise the tiles are not pressable',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: ['collectible_details'],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: { ready: TokenSelectors.CollectibleScreen, others: [] },
    actions: [],
    specs: [],
    description:
      'The sip9 branch of AppRoutes.TokenDetails (features/token/stacks/sip9-details.tsx): BNS names render BnsDetails, other NFTs Sip9TokenDetails, both on the collectible layout of features/token/collectible.tsx. The sip9 id is built by formatSip9IdField from the account collectibles, so build the link from a real collectible rather than by hand. No spec covers it.',
  },
  {
    id: 'home-activity',
    anchor: { kind: 'route' },
    routes: [AppRoutes.Activity],
    params: [],
    entry: [
      { kind: 'nav', steps: ['Tap the t`Activity` tab'] },
      { kind: 'deepLink', steps: ['Open leather://activity'] },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: {
      ready: ActivitySelectors.Screen,
      others: [ActivitySelectors.Item, ActivitySelectors.Empty],
    },
    actions: [],
    specs: ['apps/mobile/src/queries/stacks/use-transactions-with-transfers.query.spec.ts'],
    description:
      'The activity tab (src/app/(tabs)/activity.tsx): t`Activity` title over the current account activity (features/activity/activity-list.tsx), pull to refresh, and rows that open the explorer link in the in-app browser when they have one. Without a wallet, or with no activity, it shows t`Make your first transaction to get started` (activity-empty.tsx). The unit spec covers the Stacks transfer query only.',
  },
  {
    id: 'home-add-account-sheet',
    anchor: { kind: 'selectors', objects: ['GlobalSheetSelectors'] },
    routes: [],
    startRoute: AppRoutes.Home,
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: [
          'No screen presents it: addAccountSheetRef is only closed, never presented, so the sheet is unreachable from the UI',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: {
      ready: GlobalSheetSelectors.AddAccountToExistingWallet,
      others: [GlobalSheetSelectors.AddAccountToNewWallet],
    },
    actions: [],
    specs: [],
    description:
      'The global t`Add account` sheet (features/account/sheets/add-account-sheet.tsx, mounted in src/app/_layout.tsx): t`Add to existing wallet` navigates to /settings/wallet and t`Add to new wallet` presents the add-wallet sheet. It is mounted but nothing presents it.',
  },
] as const satisfies readonly MobileFeatureEntry[];
