import { AppRoutes } from '@/shared/app-routes';
import { AccountSelectors } from '@/shared/selectors/account.selectors';
import { ActivitySelectors } from '@/shared/selectors/activity.selectors';
import { GlobalSheetSelectors } from '@/shared/selectors/global-sheet.selectors';
import { HomeSelectors } from '@/shared/selectors/home.selectors';
import { SharedSelectors } from '@/shared/selectors/shared.selectors';
import { TokenSelectors } from '@/shared/selectors/token.selectors';

import type { MobileFeatureEntry } from './mobile-feature-entry';

const smokeFlow = 'apps/mobile/maestro/flows/smoke-tests.yaml';
const smokeCiFlow = 'apps/mobile/maestro/flows/smoke-tests-ci.yaml';
const unlockFlow = 'apps/mobile/maestro/shared/unlock.yaml';

export const homeFeatures = [
  {
    id: 'home',
    anchor: { kind: 'route' },
    routes: [AppRoutes.Home],
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: [
          'Launch the app; a secured wallet asks for biometrics or the passcode first (maestro/shared/unlock.yaml)',
          'The Home tab of the bottom tab bar is the first screen',
        ],
      },
      { kind: 'deepLink', steps: ['Open leather:///'] },
    ],
    gate: 'splashScreen',
    flags: ['swap', 'release_onramper_buy', 'release_onramper_sell'],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: {
      ready: HomeSelectors.SettingsButton,
      others: [
        HomeSelectors.CreateWalletCard,
        HomeSelectors.PrivacyButton,
        HomeSelectors.AccountHeader,
        SharedSelectors.NetworkBadge,
        SharedSelectors.SendButton,
        SharedSelectors.ReceiveButton,
        SharedSelectors.BuyButton,
        SharedSelectors.SellButton,
        SharedSelectors.SwapButton,
        TokenSelectors.BalanceItem,
      ],
    },
    actions: [unlockFlow],
    specs: [smokeFlow, smokeCiFlow],
    description:
      'Home screen, (tabs)/(index)/index.tsx. CurrentAccountLoader picks one of two layouts. Without a wallet (home-without-account-screen.tsx) it shows the "Add account" card (HomeSelectors.CreateWalletCard, create-wallet-card.tsx), which opens the add-wallet sheet; smoke-tests-ci.yaml waits for that text. With an account (home-with-account-screen.tsx) it shows the account header (HomeSelectors.AccountHeader, opens the account selector; disabled with a single account), the balance, the action buttons "Send", "Receive", "Buy", "Sell" and "Swap" (action-buttons.tsx; Buy needs release_onramper_buy, Sell release_onramper_sell and Swap the swap flag), the "Tokens" and "Collectibles" tabs, "Trending tokens" and, for an account with no activity, "Get your first token". Token rows have the dynamic id tokenBalanceItem-<ticker> (TokenSelectors.BalanceItem plus "-" and the ticker) and open the token screen. Both layouts carry the settings gear (HomeSelectors.SettingsButton, header-actions.tsx) and the network badge; the eye icon (HomeSelectors.PrivacyButton) only shows once a wallet exists. smoke-tests.yaml still asserts "All accounts", which no source string contains any more.',
  },
  {
    id: 'token-details',
    anchor: { kind: 'route' },
    routes: [AppRoutes.AssetDetails],
    deepLinkable: false,
    params: [{ name: 'assetId', example: 'bitcoin' }],
    entry: [
      {
        kind: 'nav',
        steps: [
          'On Home tap a token row (tokenBalanceItem-<ticker>) or the Bitcoin or Stacks deposit cell',
          'Collectibles open the same route from the "Collectibles" tab when the collectible_details flag is on',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: ['collectible_details', 'swap_sbtc_bridging'],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: {
      ready: TokenSelectors.DetailsScreen,
      others: [
        SharedSelectors.BackButton,
        SharedSelectors.NetworkBadge,
        SharedSelectors.SendButton,
        SharedSelectors.ReceiveButton,
      ],
    },
    actions: [],
    specs: [],
    description:
      'Token screen, (tabs)/(index)/[assetId]/index.tsx. The assetId param is a serialized asset id; the screen switches over BitcoinTokenDetails, StacksTokenDetails, Sip10TokenDetails (all on the token.tsx layout, TokenSelectors.DetailsScreen) and Sip9Details for collectibles (sip9-token-details.tsx with "Collectible Info", "Rarity rank" and "Attributes", or bns-details.tsx for a .btc name), which has no test id. The fungible layout shows the balance, the action buttons, "Token Details" with "Price" and "24 Hour Change", "Description" with "Read more", "Balances" per address and "Activity". The BTC screen offers "Swap" only with the swap_sbtc_bridging flag. It asserts a current account and needs a serialized asset id, so reach it from Home rather than a bare leather:// link.',
  },
  {
    id: 'activity',
    anchor: { kind: 'route' },
    routes: [AppRoutes.Activity],
    params: [],
    entry: [
      { kind: 'nav', steps: ['Tap "Activity" in the bottom tab bar'] },
      { kind: 'deepLink', steps: ['Open leather:///activity'] },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: { ready: ActivitySelectors.Screen, others: [] },
    actions: [],
    specs: ['apps/mobile/src/queries/stacks/use-transactions-with-transfers.query.spec.ts'],
    description:
      'Activity tab, (tabs)/activity.tsx, titled "Activity". With an account it lists Bitcoin and Stacks transactions with statuses such as "Sent", "Received" and "Swapped" (translate-activity-status.ts); an empty account shows "Make your first transaction to get started". Without a wallet only the title renders. Tapping an item opens the explorer link in the in-app browser. Both layouts carry ActivitySelectors.Screen.',
  },
  {
    id: 'account-selector-sheet',
    anchor: { kind: 'selectors', objects: ['AccountSelectors.SelectorSheet'] },
    routes: [],
    startRoute: AppRoutes.Home,
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: [
          'On Home with more than one account tap the account header (HomeSelectors.AccountHeader)',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: {
      ready: AccountSelectors.SelectorSheet,
      others: [HomeSelectors.AccountHeader, SharedSelectors.DefaultAccountIcon],
    },
    actions: [],
    specs: [],
    description:
      'Full-height account picker (account-selector-sheet.layout.tsx) under a "Portfolio" header. Each account card shows the avatar with the dynamic id defaultAccountIcon_<icon> (SharedSelectors.DefaultAccountIcon plus "_" and the icon name); tapping a card switches the current account and closes the sheet. The header is disabled with a single account, so the sheet cannot open then. The dApp approvers reuse this sheet to pick the account they answer with.',
  },
  {
    id: 'manage-tokens-sheet',
    anchor: { kind: 'selectors', objects: ['HomeSelectors.ManageTokensSheet'] },
    routes: [],
    startRoute: AppRoutes.Home,
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: [
          'On Home scroll to the footer below the token list and tap "# hidden token(s)" (manage-tokens-footer.tsx)',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: { ready: HomeSelectors.ManageTokensSheet, others: [TokenSelectors.SwitchItem] },
    actions: [],
    specs: [
      'apps/mobile/src/features/balances/assets/utils/search-sip10-balances.spec.ts',
      'apps/mobile/src/features/balances/assets/utils/sort-sip10-balances.spec.ts',
    ],
    description:
      'Full-height "Manage tokens" sheet (manage-tokens.sheet.tsx). A "Search tokens" field filters the list ("No tokens found" when nothing matches), and each token has a switch with the dynamic id tokenSwitchItem-<ticker> (TokenSelectors.SwitchItem plus "-" and the ticker) that shows or hides it on Home. The "Default set" row opens the token preset sheet.',
  },
  {
    id: 'token-preset-sheet',
    anchor: { kind: 'selectors', objects: ['HomeSelectors.TokenPresetSheet'] },
    routes: [],
    startRoute: AppRoutes.Home,
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: ['Open the manage tokens sheet from Home', 'Tap "Default set"'],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: { ready: HomeSelectors.TokenPresetSheet, others: [] },
    actions: [],
    specs: ['apps/mobile/src/store/settings/token-preset.spec.ts'],
    description:
      '"Default set" sheet (token-preset-sheet.tsx) choosing which tokens Home shows by default: "Gas only" ("BTC, STX"), "Main tokens" ("BTC, STX, sBTC, USDCx") or "All priced tokens" ("Same as the extension").',
  },
  {
    id: 'description-sheet',
    anchor: { kind: 'selectors', objects: ['GlobalSheetSelectors.DescriptionSheet'] },
    routes: [],
    startRoute: AppRoutes.Home,
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: [
          'On Home tap the info icon next to "Total balance", "Available balance", "Locked", "Portfolio" or "Trending tokens"',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: { ready: GlobalSheetSelectors.DescriptionSheet, others: [] },
    actions: [],
    specs: [],
    description:
      'Global explanation sheet (features/settings/description-sheet.tsx) mounted once in the root layout. The caller passes the title and the body, for example "Available balance" with "Amount of tokens you can actually send or spend right now. …" or "Trending tokens" with "Tokens trending across the Stacks ecosystem, ranked by recent trading activity.". It renders nothing until a caller sets its data.',
  },
] as const satisfies readonly MobileFeatureEntry[];
