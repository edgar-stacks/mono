import { AppRoutes } from '@/shared/app-routes';
import { AccountSelectors } from '@/shared/selectors/account.selectors';
import { ActivitySelectors } from '@/shared/selectors/activity.selectors';
import { HomeSelectors } from '@/shared/selectors/home.selectors';
import { SharedSelectors } from '@/shared/selectors/shared.selectors';
import { TokenSelectors } from '@/shared/selectors/token.selectors';

import type { MobileFeatureEntry } from './mobile-feature-entry';

const unlockFlow = 'apps/mobile/maestro/shared/unlock.yaml';
const smokeTestsFlow = 'apps/mobile/maestro/flows/smoke-tests.yaml';
const smokeTestsCiFlow = 'apps/mobile/maestro/flows/smoke-tests-ci.yaml';
const sortSip10Spec = 'apps/mobile/src/features/balances/assets/utils/sort-sip10-balances.spec.ts';
const searchSip10Spec =
  'apps/mobile/src/features/balances/assets/utils/search-sip10-balances.spec.ts';

export const homeFeatures = [
  {
    id: 'home',
    anchor: { kind: 'route' },
    routes: [AppRoutes.Home],
    params: [],
    entry: [
      { kind: 'deepLink', steps: ['Open leather:// with a wallet and an unlocked app'] },
      { kind: 'nav', steps: ['Tap the "Home" tab in the bottom tab bar'] },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: {
      ready: HomeSelectors.SettingsButton,
      others: [
        HomeSelectors.AccountHeader,
        HomeSelectors.PrivacyButton,
        HomeSelectors.TotalBalance,
        SharedSelectors.NetworkBadge,
        HomeSelectors.TokensTab,
        HomeSelectors.CollectiblesTab,
        HomeSelectors.AvailableBalance,
        HomeSelectors.ManageTokensButton,
        TokenSelectors.BalanceItem,
      ],
    },
    actions: [unlockFlow],
    specs: [smokeTestsFlow, smokeTestsCiFlow, sortSip10Spec],
    description:
      'The home screen of the current account (HomeScreenWithAccount). The header shows the account avatar and name (and the wallet name when there is more than one wallet); tapping it opens the account selector sheet unless the wallet has a single account. The header actions are the privacy toggle ("Hide balances" / "Show balances") and the "Settings" gear, which navigates to /settings. Below sit "Total balance" with the network badge, a "Locked STX" row only while the account is stacking (AccountSelectors.LockedBalance), the action buttons "Send", "Receive", "Buy", "Sell" and "Swap" (Buy and Sell render only with the release_onramper_buy and release_onramper_sell flags on, Swap only with the swap flag on), and the "Tokens" / "Collectibles" tabs. The Tokens tab lists "Available" with the manage tokens slider button, the Bitcoin and Stacks cells (a "Buy" button replaces the balance while the asset has no activity) and the visible SIP-10 balances sorted by sortSip10Balances; each token cell has the testID tokenBalanceItem-<ticker>, a prefix plus the ticker, and opens the asset details screen. When the account has hidden SIP-10 tokens with a balance the footer shows "# hidden token(s)" (HomeSelectors.HiddenTokensButton), which opens the manage tokens sheet. The smoke flows tap homeSettingsButton and assert "SETTINGS".',
  },
  {
    id: 'home-without-wallet',
    anchor: { kind: 'selectors', objects: ['HomeSelectors.CreateWalletCard'] },
    routes: [],
    startRoute: AppRoutes.Home,
    params: [],
    entry: [{ kind: 'deepLink', steps: ['Open leather:// on a fresh install with no wallet'] }],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-out', mocks: [] },
    selectors: {
      ready: HomeSelectors.CreateWalletCard,
      others: [HomeSelectors.SettingsButton, SharedSelectors.NetworkBadge],
    },
    actions: [],
    specs: [],
    description:
      'The home screen when there is no current account (HomeScreenWithoutAccount): the Leather logomark with the network badge, the "Settings" gear (no privacy toggle, it needs a wallet) and an "Add account" card that presents the global add wallet sheet with its create and restore options.',
  },
  {
    id: 'account-selector-sheet',
    anchor: { kind: 'selectors', objects: ['AccountSelectors.SelectorSheetHeader'] },
    routes: [],
    startRoute: AppRoutes.Home,
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: [
          'On home with more than one account, tap the account avatar and name in the header',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: {
      ready: AccountSelectors.SelectorSheetHeader,
      others: [AccountSelectors.SelectorCard],
    },
    actions: [unlockFlow],
    specs: [],
    description:
      'A full-height sheet headed by "Portfolio" (a help icon opens a description sheet: "Your total tokens across all your accounts.") and the total balance across accounts, followed by one card per account that is not hidden. Each card shows the account icon, its address, the wallet name, the account name, its balance and the icons of connected apps; the current account has a highlighted border. Tapping a card closes the sheet and switches the current account. The header is disabled when the wallet has a single account, so the sheet cannot be opened then.',
  },
  {
    id: 'home-collectibles',
    anchor: { kind: 'selectors', objects: ['HomeSelectors.CollectiblesTab'] },
    routes: [],
    startRoute: AppRoutes.Home,
    params: [],
    entry: [{ kind: 'nav', steps: ['On home tap the "Collectibles" tab'] }],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: {
      ready: HomeSelectors.CollectiblesTab,
      others: [HomeSelectors.TokensTab],
    },
    actions: [unlockFlow],
    specs: [],
    description:
      'The Collectibles tab of home: a two-column list of the account SIP-9 collectibles (BNS names render as a name card, items without content show an image-unavailable tile) under the same account header and tabs, with pull-to-refresh. Tapping an item opens the asset details screen only when the collectible_details flag is on. With no collectibles it shows "Get your first NFT" (TokenSelectors.CollectiblesEmpty) with "Register .btc domain", "Receive Stacks NFT" (presents the receive sheet) and "Discover Stacks NFTs".',
  },
  {
    id: 'manage-tokens-sheet',
    anchor: { kind: 'selectors', objects: ['TokenSelectors.ManageTokensTitle'] },
    routes: [],
    startRoute: AppRoutes.Home,
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: [
          'On home tap the slider button next to "Available", or the "# hidden tokens" footer button',
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
    actions: [unlockFlow],
    specs: [searchSip10Spec, sortSip10Spec],
    description:
      'A full-height sheet titled "Manage tokens": a "Default set" row showing the current token preset (opens the default set sheet), a "Search tokens" input and one switch per SIP-10 token including hidden ones and USDCx, sorted by sortSip10Balances and filtered by matchesSip10SearchTerm. Each switch has the testID tokenSwitchItem-<ticker>, a prefix plus the ticker, and toggles the asset visibility on home. It shows "Failed to load tokens" on error and "No tokens found" when the search matches nothing.',
  },
  {
    id: 'token-preset-sheet',
    anchor: { kind: 'selectors', objects: ['TokenSelectors.PresetItem'] },
    routes: [],
    startRoute: AppRoutes.Home,
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: ['Open the manage tokens sheet from home', 'Tap the "Default set" row'],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: {
      ready: TokenSelectors.PresetItem,
      others: [],
    },
    actions: [unlockFlow],
    specs: ['apps/mobile/src/store/settings/token-preset.spec.ts'],
    description:
      'A sheet titled "Default set" with three radio rows: "Gas only" ("BTC, STX"), "Main tokens" ("BTC, STX, sBTC, USDCx") and "All priced tokens" ("Same as the extension"). Each row has the testID tokenPresetItem-<preset>, a prefix plus gasOnly, mainTokens or allPricedTokens. Picking one changes the token preset and dismisses the sheet; the preset decides which tokens home shows by default.',
  },
  {
    id: 'trending-tokens',
    anchor: { kind: 'selectors', objects: ['HomeSelectors.TrendingTokens'] },
    routes: [],
    startRoute: AppRoutes.Home,
    params: [],
    entry: [{ kind: 'nav', steps: ['On the home Tokens tab scroll to the bottom of the list'] }],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: {
      ready: HomeSelectors.TrendingTokens,
      others: [],
    },
    actions: [unlockFlow],
    specs: [],
    description:
      'The "Trending tokens" section in the home Tokens tab footer: a horizontally scrolling grid of token chips with the symbol and the 1-day price change percent, green when up and red when down. The title opens a description sheet: "Tokens trending across the Stacks ecosystem, ranked by recent trading activity." The section renders nothing when the trending tokens query returns no items.',
  },
  {
    id: 'home-get-first-token',
    anchor: {
      kind: 'selectors',
      objects: ['HomeSelectors.FirstTokenBanner', 'HomeSelectors.LearnSection'],
    },
    routes: [],
    startRoute: AppRoutes.Home,
    params: [],
    entry: [{ kind: 'deepLink', steps: ['Open leather:// with an account that has no activity'] }],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: {
      ready: HomeSelectors.FirstTokenBanner,
      others: [HomeSelectors.LearnSection],
    },
    actions: [unlockFlow],
    specs: [],
    description:
      'Shown on the home Tokens tab once the activity query succeeds with no activity: the "Get your first token" banner ("Fund your wallet by buying tokens or transferring from another account.") replaces the "Available" row, and a "Learn" section in the footer lists items from the CMS, falling back to "Getting Started with Leather", "What is sBTC?" and "Learn more about stacking", each opening its URL.',
  },
  {
    id: 'asset-details',
    anchor: { kind: 'route' },
    routes: [AppRoutes.AssetDetails],
    params: [{ name: 'assetId', example: 'nativeBtc|BTC' }],
    entry: [
      { kind: 'nav', steps: ['On home tap a token cell (tokenBalanceItem-<ticker>)'] },
      {
        kind: 'deepLink',
        steps: ['Open leather://nativeBtc%7CBTC, the serialized asset id <protocol>|<id>'],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: {
      ready: TokenSelectors.DetailsScreen,
      others: [
        TokenSelectors.CollectibleDetailsScreen,
        SharedSelectors.NetworkBadge,
        ActivitySelectors.Item,
      ],
    },
    actions: [unlockFlow],
    specs: [],
    description:
      'Details of one asset of the current account, chosen by the protocol of the assetId param. For BTC, STX and SIP-10 tokens (TokenSelectors.DetailsScreen) it shows the icon, available and quote balance, the action buttons "Send", "Receive", "Buy", "Sell" and "Swap" (Buy, Sell and Swap behind the release_onramper_buy, release_onramper_sell and swap flags; BTC shows Swap only with swap_sbtc_bridging on), the description, a "Token Details" table ("Name", "Price", "24 Hour Change", "Layer") and the asset activity list; BTC adds its "Native Segwit" and "Taproot" addresses. For a SIP-9 collectible (TokenSelectors.CollectibleDetailsScreen) it shows the image, stats, description and a "Collectible Info" table; BNS names get their own layout. The screen asserts a current account exists and renders nothing for other protocols.',
  },
  {
    id: 'activity',
    anchor: { kind: 'route' },
    routes: [AppRoutes.Activity],
    params: [],
    entry: [
      { kind: 'nav', steps: ['Tap the "Activity" tab in the bottom tab bar'] },
      { kind: 'deepLink', steps: ['Open leather://activity'] },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: {
      ready: ActivitySelectors.Screen,
      others: [ActivitySelectors.Item, ActivitySelectors.Empty],
    },
    actions: [unlockFlow],
    specs: ['apps/mobile/src/queries/stacks/use-transactions-with-transfers.query.spec.ts'],
    description:
      'The "Activity" tab: the current account activity list with pull-to-refresh. Each row shows the activity avatar, its status label or title, the timestamp (prefixed "Swapping", "Swap failed" or "Swapped" for swaps) and the quote and crypto amounts; rows with a link open it in the in-app browser. With no activity, an error, or no wallet at all it shows "Make your first transaction to get started" (ActivitySelectors.Empty); ActivitySelectors.Item renders only when there is activity.',
  },
  {
    id: 'tab-bar',
    anchor: {
      kind: 'selectors',
      objects: [
        'HomeSelectors.TabBarHome',
        'HomeSelectors.TabBarActivity',
        'HomeSelectors.TabBarBrowser',
      ],
    },
    routes: [],
    startRoute: AppRoutes.Home,
    params: [],
    entry: [{ kind: 'deepLink', steps: ['Open leather://'] }],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: {
      ready: HomeSelectors.TabBarHome,
      others: [HomeSelectors.TabBarActivity, HomeSelectors.TabBarBrowser],
    },
    actions: [unlockFlow],
    specs: [],
    description:
      'The bottom tab bar of the (tabs) layout with "Home", "Activity" and "Browser". Tapping an unfocused tab switches to it; tapping the focused Home tab while on a nested screen such as asset details dismisses back to home, otherwise it scrolls the tab to the top.',
  },
] as const satisfies readonly MobileFeatureEntry[];
