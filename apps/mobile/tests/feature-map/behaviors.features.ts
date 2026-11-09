import { AppRoutes } from '@/shared/app-routes';
import { AppUpdateSelectors } from '@/shared/selectors/app-update.selectors';
import { HomeSelectors } from '@/shared/selectors/home.selectors';
import { SettingsSelectors } from '@/shared/selectors/settings.selectors';
import { SharedSelectors } from '@/shared/selectors/shared.selectors';

import type { MobileFeatureEntry } from './mobile-feature-entry';

const unlockFlow = 'apps/mobile/maestro/shared/unlock.yaml';

export const behaviorsFeatures = [
  {
    id: 'app-unlock',
    anchor: { kind: 'behavior' },
    routes: [],
    startRoute: AppRoutes.Home,
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: [
          'Set the security level to secure in settings',
          'Kill and relaunch the app, then pass the device passcode or biometric prompt',
        ],
      },
    ],
    gate: 'none',
    flags: [],
    preconditions: { session: 'locked', mocks: [] },
    selectors: {
      ready: SharedSelectors.LockOverlay,
      others: [SharedSelectors.UnlockButton],
    },
    actions: [unlockFlow],
    specs: [],
    description:
      'SplashScreenGuard covers every screen with a full-screen splash overlay (SharedSelectors.LockOverlay) until the app is unlocked. With the security level preference "secure" the app asks for device authentication (expo-local-authentication) on open; on success the splash animation plays and the overlay goes away, on failure an "Unlock" button (SharedSelectors.UnlockButton) stays on the locked splash to retry. Without a device PIN or biometrics the toast "App is not protected with device-level PIN or biometrics." shows. Any other security level bypasses authentication and only plays the splash.',
  },
  {
    id: 'app-lock',
    anchor: { kind: 'behavior' },
    routes: [],
    startRoute: AppRoutes.Settings,
    params: [],
    entry: [
      { kind: 'nav', steps: ['On /settings tap the lock app button'] },
      {
        kind: 'nav',
        steps: ['With the secure security level, send the app to the background and reopen it'],
      },
    ],
    gate: 'none',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: {
      ready: SettingsSelectors.LockAppButton,
      others: [SharedSelectors.LockOverlay, SharedSelectors.UnlockButton],
    },
    actions: [unlockFlow],
    specs: [],
    description:
      'Locking the app: the lock app button in settings locks it manually, clears the last active time, tracks app_locked and shows the locked splash with "Unlock". With the secure security level, backgrounding the app locks it and stores the last active time when it was unlocked; coming back within 60 seconds unlocks without a prompt, later it asks for device authentication again.',
  },
  {
    id: 'privacy-mode',
    anchor: { kind: 'behavior' },
    routes: [],
    startRoute: AppRoutes.Home,
    params: [],
    entry: [{ kind: 'nav', steps: ['On home tap the eye button in the header'] }],
    gate: 'none',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: {
      ready: HomeSelectors.PrivacyButton,
      others: [HomeSelectors.TotalBalance],
    },
    actions: [unlockFlow],
    specs: [],
    description:
      'The header eye button ("Hide balances" / "Show balances") toggles the privacy mode preference between visible and hidden; it renders only when a wallet exists. While hidden, every Balance rendered through PrivateText shows "***" instead of the amount across the app, unless a caller forces it visible.',
  },
  {
    id: 'toast',
    anchor: { kind: 'behavior' },
    routes: [],
    startRoute: AppRoutes.Home,
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: ['Trigger any action that calls displayToast, such as copying an address'],
      },
    ],
    gate: 'none',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: {
      ready: SharedSelectors.ToastContainer,
      others: [],
    },
    actions: [],
    specs: [],
    description:
      'ToastWrapper renders one toast above the whole app: displayToast slides it in from the top with an icon for its type and the title, hides it after 3 seconds, and an upward swipe dismisses it early. A new toast replaces the current one.',
  },
  {
    id: 'minimum-app-version',
    anchor: { kind: 'behavior' },
    routes: [],
    startRoute: AppRoutes.Home,
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: [
          'Set the minimum_app_version LaunchDarkly flag above the installed version, then open the app',
        ],
      },
    ],
    gate: 'none',
    flags: ['minimum_app_version'],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: {
      ready: AppUpdateSelectors.UpdateButton,
      others: [],
    },
    actions: [],
    specs: [],
    description:
      'VersionGuard compares the installed version with the minimum_app_version string flag and presents the app update required sheet ("Get the latest version of the Leather app", "Update the app to get access to the latest features.", the store update button and "Maybe later") when the installed version is lower. An empty flag, an unknown or invalid installed version skips the check; errors are reported to Sentry and the app continues.',
  },
  {
    id: 'pull-to-refresh',
    anchor: { kind: 'behavior' },
    routes: [],
    startRoute: AppRoutes.Home,
    params: [],
    entry: [
      { kind: 'nav', steps: ['Pull down on the home token list, collectibles or activity list'] },
    ],
    gate: 'none',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: {
      others: [],
    },
    actions: [unlockFlow],
    specs: [],
    description:
      'The shared RefreshControl invalidates every React Query query except the HTTP cache keys and shows the spinner for 2 seconds. Home tokens, home collectibles and the activity list use it; the home token list carries a TODO that the spinner does not show.',
  },
  {
    id: 'store-migrations',
    anchor: { kind: 'behavior' },
    routes: [],
    startRoute: AppRoutes.Home,
    params: [],
    entry: [{ kind: 'nav', steps: ['Launch an app build whose persisted store is older'] }],
    gate: 'none',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: {
      others: [],
    },
    actions: [],
    specs: [
      'apps/mobile/src/store/migrations/migrate-0-1-flatten-keychains.spec.ts',
      'apps/mobile/src/store/migrations/migrate-1-2-pad-fingerprints.spec.ts',
    ],
    description:
      'redux-persist migrations run on rehydration: version 1 flattens the per-chain keychains state into a single keychains entity, version 2 pads wallet fingerprints with leading zeros to 8-character hex strings.',
  },
  {
    id: 'secure-mnemonic-storage',
    anchor: { kind: 'behavior' },
    routes: [],
    startRoute: AppRoutes.Home,
    params: [],
    entry: [{ kind: 'nav', steps: ['Create or restore a wallet'] }],
    gate: 'none',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: {
      others: [],
    },
    actions: [],
    specs: [
      'apps/mobile/src/store/secure-store/mnemonic-store.spec.ts',
      'apps/mobile/src/store/secure-store/secure-store-access.spec.ts',
      'apps/mobile/src/store/secure-store/secure-store-keys.spec.ts',
      'apps/mobile/src/store/secure-store/temp-mnemonic-store.spec.ts',
    ],
    description:
      'Mnemonics and passphrases live in the device secure store, keyed per wallet fingerprint; searchForMnemonic finds both the v1 and v2 key formats, with or without a passphrase. A temporary mnemonic store holds the secret key between generating and securing a new wallet.',
  },
  {
    id: 'account-default-icon',
    anchor: { kind: 'behavior' },
    routes: [],
    startRoute: AppRoutes.SettingsAccountChooseAvatar,
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: [
          'Open /settings/wallet, tap an account, then tap its avatar to open the avatar picker',
        ],
      },
    ],
    gate: 'none',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: {
      others: [SharedSelectors.DefaultAccountIcon],
    },
    actions: [unlockFlow],
    specs: ['apps/mobile/src/store/accounts/utils.spec.ts'],
    description:
      'A new account gets an icon derived deterministically from its account id (deriveIconFromAccountId), so the same account always shows the same icon. Each icon in the avatar picker has the testID defaultAccountIcon_<icon>, a prefix plus the icon name; AccountCard accepts an iconTestID but does not render it.',
  },
  {
    id: 'stacks-network-resolution',
    anchor: { kind: 'behavior' },
    routes: [],
    startRoute: AppRoutes.SettingsNetworks,
    params: [],
    entry: [{ kind: 'nav', steps: ['On /settings/networks pick a network'] }],
    gate: 'none',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: {
      others: [SharedSelectors.NetworkBadge],
    },
    actions: [unlockFlow],
    specs: ['apps/mobile/src/store/settings/settings.read.spec.ts'],
    description:
      'getStacksNetworkFromNetworkConfig turns the network preference into a Stacks network: mainnet for the mainnet configuration, testnet for testnet, and an unknown custom chain id is kept with testnet behavior instead of throwing. The network badge on home and the token screens shows the preference name.',
  },
] as const satisfies readonly MobileFeatureEntry[];
